import { v4 as uuidv4 } from "uuid";
import type { Phase, Session } from "../types";

export function addSession(phases: Phase[], phaseId: string): Phase[] {
    return phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        const count = phase.sessions.length + 1;
        // Calculate the order number based on existing sessions
        // Calculate the highest order number in existing sessions
        const maxOrderNumber =
            phase.sessions.length > 0
                ? Math.max(...phase.sessions.map((s) => s.orderNumber || 0))
                : -1;

        const newSession: Session = {
            id: uuidv4(),
            name: `Untitled Session ${count}`,
            duration: 0,
            isExpanded: true,
            exercises: [],
            // Add phaseId to ensure parent-child relationship
            phaseId: phaseId,
            // Set orderNumber for proper ordering
            orderNumber: maxOrderNumber + 1, // Use max + 1 to ensure unique ordering,
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

        // Calculate the highest order number in existing sessions
        const maxOrderNumber =
            phase.sessions.length > 0
                ? Math.max(...phase.sessions.map((s) => s.orderNumber || 0))
                : -1;

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
            orderNumber: maxOrderNumber + 1, // Use max + 1 to ensure unique ordering
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
