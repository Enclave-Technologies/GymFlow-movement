import { v4 as uuidv4 } from "uuid";
import type { Phase, Session } from "../types";

export function addSession(phases: Phase[], phaseId: string): Phase[] {
    return phases.map((phase) => {
        if (phase.id !== phaseId) return phase;
        const count = phase.sessions.length + 1;
        const newSession: Session = {
            id: uuidv4(),
            name: `Untitled Session ${count}`,
            duration: 0,
            isExpanded: true,
            exercises: [],
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

        const copiedExercises = target.exercises.map((exercise) => ({
            ...exercise,
            id: uuidv4(),
        }));

        const copy: Session = {
            ...target,
            id: uuidv4(),
            name: `${target.name} (Copy)`,
            exercises: copiedExercises,
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
