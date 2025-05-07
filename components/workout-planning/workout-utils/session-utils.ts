import { v4 as uuidv4 } from "uuid";
import type { Phase, Session } from "../types";

/**
 * Adds a new session to the specified phase and returns an updated array of phases.
 *
 * The new session is assigned a unique ID, a default name based on the session count, zero duration, expanded state, an empty exercises array, the parent phase ID, and an order number reflecting its position.
 *
 * @param phaseId - The ID of the phase to which the new session will be added.
 * @returns A new array of phases with the added session in the specified phase.
 */
export function addSession(phases: Phase[], phaseId: string): Phase[] {
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

/**
 * Toggles the expanded state of a session within a specified phase.
 *
 * @param phaseId - The ID of the phase containing the session.
 * @param sessionId - The ID of the session to toggle.
 * @returns A new array of phases with the targeted session's `isExpanded` property toggled.
 */
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

/**
 * Creates a deep copy of a session and its exercises within a specified phase.
 *
 * The duplicated session receives a new unique ID, its name is appended with " (Copy)", and all exercises are also duplicated with new IDs and updated to reference the new session. The copied session is appended to the sessions array of the target phase.
 *
 * @param phases - The array of phases containing sessions.
 * @param phaseId - The ID of the phase containing the session to duplicate.
 * @param sessionId - The ID of the session to duplicate.
 * @returns A new array of phases with the duplicated session added to the specified phase.
 */
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

/**
 * Removes a session from the specified phase.
 *
 * @param phaseId - The ID of the phase containing the session to remove.
 * @param sessionId - The ID of the session to be deleted.
 * @returns A new array of phases with the specified session removed from the target phase.
 */
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
