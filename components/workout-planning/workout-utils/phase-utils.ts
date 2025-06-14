import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { updatePhaseActivation } from "@/actions/workout_client_actions";
import { Phase, Exercise, Session } from "../types";

/**
 * Adds a new phase to the workout plan
 */
export const addPhase = (
    phases: Phase[],
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void,
    setHasUnsavedChanges: (value: boolean) => void,
    planId?: string | null
) => {
    // Use timestamp divided by 10K for order number (future-proof for 100+ years, fits in integer range)
    const orderNumber = Math.floor(Date.now() / 10000);

    const newPhase: Phase = {
        id: uuidv4(),
        name: `Untitled Phase`,
        isActive: false,
        isExpanded: true,
        sessions: [],
        // Add planId to ensure parent-child relationship
        planId: planId || undefined,
        // Set orderNumber for proper ordering
        orderNumber: orderNumber,
    };
    updatePhases([...phases, newPhase]);
    setHasUnsavedChanges(true);
};

/**
 * Toggles the expansion state of a phase
 */
export const togglePhaseExpansion = (
    phaseId: string,
    phases: Phase[],
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void
    // setHasUnsavedChanges: (value: boolean) => void
) => {
    updatePhases(
        phases.map((phase) =>
            phase.id === phaseId
                ? { ...phase, isExpanded: !phase.isExpanded }
                : phase
        )
    );
    // setHasUnsavedChanges(true);
};

/**
 * Toggles the activation state of a phase
 */
export const togglePhaseActivation = async (
    phaseId: string,
    phases: Phase[],
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void,
    lastKnownUpdatedAt: Date | null,
    setLastKnownUpdatedAt: (value: Date | null) => void,
    setSaving: (value: boolean) => void,
    setHasUnsavedChanges: (value: boolean) => void,
    setConflictError: (
        value: { message: string; serverTime: Date } | null
    ) => void
    // setSavePerformed: (value: number | ((prev: number) => number)) => void
) => {
    // Get the new active state (opposite of current)
    const isActive = !phases.find((p) => p.id === phaseId)?.isActive;

    // Optimistically update the UI
    updatePhases(
        phases.map((phase) =>
            phase.id === phaseId
                ? { ...phase, isActive }
                : { ...phase, isActive: false }
        )
    );

    // Set saving state
    setSaving(true);

    try {
        // Call the backend to update the phase activation
        const result = await updatePhaseActivation(
            phaseId,
            isActive,
            lastKnownUpdatedAt || undefined
        );

        if (result.success) {
            toast.success(
                `Phase ${isActive ? "activated" : "deactivated"} successfully`
            );
            setHasUnsavedChanges(false);
            // Clear any previous conflict errors
            setConflictError(null);

            // If we have a planId, update the lastKnownUpdatedAt
            if (result.serverUpdatedAt) {
                setLastKnownUpdatedAt(new Date(result.serverUpdatedAt));
            }

            // Trigger a refetch by incrementing the savePerformed counter
            // setSavePerformed((prev) => prev + 1);
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

                // Revert the optimistic update
                updatePhases(
                    phases.map((phase) =>
                        phase.id === phaseId
                            ? { ...phase, isActive: !isActive }
                            : phase
                    )
                );
            } else {
                // Handle other errors
                toast.error(
                    result.error
                        ? String(result.error)
                        : "Failed to update phase"
                );

                // Revert the optimistic update
                updatePhases(
                    phases.map((phase) =>
                        phase.id === phaseId
                            ? { ...phase, isActive: !isActive }
                            : phase
                    )
                );
            }
        }
    } catch (error) {
        console.error("Error updating phase activation:", error);
        toast.error("An error occurred while updating phase");

        // Revert the optimistic update
        updatePhases(
            phases.map((phase) =>
                phase.id === phaseId ? { ...phase, isActive: !isActive } : phase
            )
        );
    } finally {
        setSaving(false);
    }
};

/**
 * Deletes a phase
 */
export const deletePhase = (
    phaseId: string,
    setShowConfirm: (value: {
        type: "phase" | "session" | "exercise" | null;
        phaseId?: string;
        sessionId?: string;
        exerciseId?: string;
    }) => void
) => {
    setShowConfirm({ type: "phase", phaseId });
};

/**
 * Confirms deletion of a phase
 */
export const confirmDeletePhase = (
    phaseId: string,
    phases: Phase[],
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void,
    setShowConfirm: (value: {
        type: "phase" | "session" | "exercise" | null;
        phaseId?: string;
        sessionId?: string;
        exerciseId?: string;
    }) => void,
    setHasUnsavedChanges: (value: boolean) => void
) => {
    updatePhases(phases.filter((phase) => phase.id !== phaseId));
    setShowConfirm({ type: null });
    setHasUnsavedChanges(true);
};

/**
 * Duplicates a phase
 */
export const duplicatePhase = (
    phaseId: string,
    phases: Phase[],
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void,
    setHasUnsavedChanges: (value: boolean) => void
) => {
    const target = phases.find((p) => p.id === phaseId);
    if (!target) return;

    // Generate new IDs
    const newPhaseId = uuidv4();

    // Create deep copies of sessions and exercises with new IDs
    const copiedSessions = target.sessions.map((session: Session) => {
        const newSessionId = uuidv4();

        // Create deep copies of exercises with new IDs
        const copiedExercises = session.exercises.map((exercise: Exercise) => ({
            ...exercise,
            id: uuidv4(), // Generate new ID for each exercise
            sessionId: newSessionId, // Update sessionId to point to the new session
        }));

        // Create a new session with a new ID and the copied exercises
        return {
            ...session,
            id: newSessionId, // Generate new ID for the session
            phaseId: newPhaseId, // Update phaseId to point to the new phase
            exercises: copiedExercises,
        };
    });

    // Use timestamp divided by 10K for order number (future-proof for 100+ years, fits in integer range)
    const orderNumber = Math.floor(Date.now() / 10000);

    // Create the copied phase with new sessions
    const copy: Phase = {
        ...target,
        id: newPhaseId, // Generate new ID for the phase
        name: `${target.name} (Copy)`,
        isActive: false,
        sessions: copiedSessions,
        orderNumber: orderNumber, // Set orderNumber for proper ordering
    };

    updatePhases([...phases, copy]);
    setHasUnsavedChanges(true);
};

/**
 * Starts editing a phase name
 */
export const startEditPhase = (
    id: string,
    name: string,
    setEditingPhase: (value: string | null) => void,
    setEditPhaseValue: (value: string) => void
) => {
    setEditingPhase(id);
    setEditPhaseValue(name);
};

// /**
//  * Saves the edited phase name
//  */
// export const savePhaseEdit = (
//     editingPhase: string | null,
//     editPhaseValue: string,
//     phases: Phase[],
//     updatePhases: (
//         newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
//     ) => void,
//     setEditingPhase: (value: string | null) => void,
//     setHasUnsavedChanges: (value: boolean) => void
// ) => {
//     if (!editingPhase) return;
//     updatePhases(
//         phases.map((p) =>
//             p.id === editingPhase ? { ...p, name: editPhaseValue } : p
//         )
//     );
//     setEditingPhase(null);
//     setHasUnsavedChanges(true);
// };

/**
 * Sorts phases to show the active phase first, then inactive phases in descending order (newest first)
 * @param phases Array of phases to sort
 * @returns Sorted array with active phase first, then newest phases first
 */
export const sortPhasesByActiveStatus = (phases: Phase[]): Phase[] => {
    return [...phases].sort((a, b) => {
        // Active phases come first (true > false in boolean comparison)
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;

        // If both have same active status, sort by orderNumber in descending order (newest first)
        const orderA = a.orderNumber ?? 0;
        const orderB = b.orderNumber ?? 0;
        return orderB - orderA; // Descending order (newest first)
    });
};
