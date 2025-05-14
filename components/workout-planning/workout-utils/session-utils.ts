import { v4 as uuidv4 } from "uuid";
import type { Phase, Session } from "../types";
import { toast } from "sonner";
import { persistNewSession } from "@/actions/session_actions";

let isAddingSession = false;
const pendingSessionAdds: { phaseId: string; callback: () => Promise<void> }[] =
    [];

/**
 * Processes the queue of pending session additions
 */
async function processPendingSessionAdds() {
    if (pendingSessionAdds.length === 0 || isAddingSession) return;

    isAddingSession = true;
    const nextAdd = pendingSessionAdds.shift();

    if (nextAdd) {
        try {
            await nextAdd.callback();
        } catch (error) {
            console.error("Error processing queued session add:", error);
        } finally {
            isAddingSession = false;
            // Process next item in queue
            processPendingSessionAdds();
        }
    } else {
        isAddingSession = false;
    }
}

async function addSessionAndPersistImpl(
    phases: Phase[],
    phaseId: string,
    setPhases: (phases: Phase[]) => void,
    setHasUnsavedChanges: (value: boolean) => void,
    setLastKnownUpdatedAt: (value: Date | null) => void,
    setSaving: (value: boolean) => void,
    setConflictError: (
        value: { message: string; serverTime: Date } | null
    ) => void,
    lastKnownUpdatedAt: Date | null
): Promise<void> {
    // First update the UI optimistically
    const updatedPhases = addSession(phases, phaseId);
    setPhases(updatedPhases);
    setSaving(true);

    try {
        // Find the newly added session
        const phase = updatedPhases.find((p) => p.id === phaseId);
        if (!phase) {
            console.error("Phase not found after adding session");
            setHasUnsavedChanges(true);
            setSaving(false);
            return;
        }

        // Get the last session (the one we just added)
        const newSession = phase.sessions[phase.sessions.length - 1];

        // Persist to the database
        const result = await persistNewSession(
            {
                id: newSession.id,
                name: newSession.name,
                phaseId: phaseId,
                orderNumber: newSession.orderNumber || 0,
                duration: newSession.duration || 0,
            },
            lastKnownUpdatedAt || undefined
        );

        if (result.success) {
            toast.success("Session added successfully");
            setHasUnsavedChanges(false);
            // Clear any previous conflict errors
            setConflictError(null);

            // If we have a serverUpdatedAt, update the lastKnownUpdatedAt
            if (result.serverUpdatedAt) {
                setLastKnownUpdatedAt(new Date(result.serverUpdatedAt));
            }
        } else {
            // Handle errors
            if (result.conflict) {
                // Handle conflict - another user has modified the plan
                setConflictError({
                    message:
                        result.error ||
                        "Plan has been modified by another user",
                    serverTime: new Date(result.serverUpdatedAt!),
                });
                toast.error(
                    "Conflict detected: Plan has been modified by another user"
                );
            } else {
                // Handle other errors
                toast.error(
                    result.error
                        ? String(result.error)
                        : "Failed to add session"
                );
            }
            setHasUnsavedChanges(true);
        }
    } catch (error) {
        console.error("Error adding session:", error);
        toast.error("An error occurred while adding the session");
        setHasUnsavedChanges(true);
    } finally {
        setSaving(false);
    }
}

export async function addSessionAndPersist(
    phases: Phase[],
    phaseId: string,
    setPhases: (phases: Phase[]) => void,
    setHasUnsavedChanges: (value: boolean) => void,
    setLastKnownUpdatedAt: (value: Date | null) => void,
    setSaving: (value: boolean) => void,
    setConflictError: (
        value: { message: string; serverTime: Date } | null
    ) => void,
    lastKnownUpdatedAt: Date | null
): Promise<void> {
    // If already adding a session, queue this request
    if (isAddingSession) {
        const addCallback = () =>
            addSessionAndPersistImpl(
                phases,
                phaseId,
                setPhases,
                setHasUnsavedChanges,
                setLastKnownUpdatedAt,
                setSaving,
                setConflictError,
                lastKnownUpdatedAt
            );
        pendingSessionAdds.push({ phaseId, callback: addCallback });
        return;
    }

    // Otherwise, perform the add immediately
    isAddingSession = true;
    try {
        await addSessionAndPersistImpl(
            phases,
            phaseId,
            setPhases,
            setHasUnsavedChanges,
            setLastKnownUpdatedAt,
            setSaving,
            setConflictError,
            lastKnownUpdatedAt
        );
    } finally {
        isAddingSession = false;
        // Process any pending adds
        processPendingSessionAdds();
    }
}

function addSession(phases: Phase[], phaseId: string): Phase[] {
    return phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        const count = phase.sessions.length + 1;
        // Calculate the order number based on existing sessions
        const orderNumber = phase.sessions.length;

        const newSession: Session = {
            id: uuidv4(),
            name: `Untitled Session ${count}`,
            duration: 0,
            isExpanded: true,
            exercises: [],
            // Add phaseId to ensure parent-child relationship
            phaseId: phaseId,
            // Set orderNumber for proper ordering
            orderNumber: orderNumber,
        };
        return { ...phase, sessions: [...phase.sessions, newSession] };
    });
}

export function toggleSessionExpansion(
    phases: Phase[],
    phaseId: string,
    sessionId: string
): Phase[] {
    return phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        return {
            ...phase,
            sessions: phase.sessions.map((session) =>
                session.id === sessionId
                    ? { ...session, isExpanded: !session.isExpanded }
                    : session
            ),
        };
    });
}

export function duplicateSession(
    phases: Phase[],
    phaseId: string,
    sessionId: string
): Phase[] {
    return phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        const target = phase.sessions.find((s) => s.id === sessionId);
        if (!target) return phase;

        const newSessionId = uuidv4();

        // Copy exercises and update their sessionId to point to the new session
        const copiedExercises = target.exercises.map((exercise) => ({
            ...exercise,
            id: uuidv4(),
            sessionId: newSessionId, // Update sessionId to point to the new session
        }));

        const copy: Session = {
            ...target,
            id: newSessionId,
            name: `${target.name} (Copy)`,
            exercises: copiedExercises,
            phaseId: phaseId, // Ensure phaseId is set
        };

        return { ...phase, sessions: [...phase.sessions, copy] };
    });
}

export function deleteSession(
    phases: Phase[],
    phaseId: string,
    sessionId: string
): Phase[] {
    return phases.map((phase) =>
        phase.id !== phaseId
            ? phase
            : {
                  ...phase,
                  sessions: phase.sessions.filter((s) => s.id !== sessionId),
              }
    );
}
