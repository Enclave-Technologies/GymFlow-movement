import { v4 as uuidv4 } from "uuid";
import type { Phase, Exercise } from "../types";

export function addExercise(
    phases: Phase[],
    phaseId: string,
    sessionId: string
): { updatedPhases: Phase[]; newExerciseId: string } {
    const newExercise: Exercise = {
        id: uuidv4(),
        order: "",
        motion: "Unspecified",
        targetArea: "Unspecified",
        exerciseId: uuidv4(),
        description: "New Exercise",
        duration: 8,
        setsMin: "3",
        setsMax: "5",
        repsMin: "8",
        repsMax: "12",
        tempo: "3 0 1 0",
        restMin: "45",
        restMax: "60",
        additionalInfo: "",
    };

    const updatedPhases = phases.map((phase) =>
        phase.id !== phaseId
            ? phase
            : {
                  ...phase,
                  sessions: phase.sessions.map((session) =>
                      session.id !== sessionId
                          ? session
                          : {
                                ...session,
                                exercises: [...session.exercises, newExercise],
                            }
                  ),
              }
    );

    return { updatedPhases, newExerciseId: newExercise.id };
}

export function deleteExercise(
    phases: Phase[],
    phaseId: string,
    sessionId: string,
    exerciseId: string
): Phase[] {
    return phases.map((phase) =>
        phase.id !== phaseId
            ? phase
            : {
                  ...phase,
                  sessions: phase.sessions.map((session) => {
                      if (session.id !== sessionId) return session;

                      const updatedExercises = session.exercises.filter(
                          (e) => e.id !== exerciseId
                      );

                      return {
                          ...session,
                          exercises: updatedExercises,
                      };
                  }),
              }
    );
}

export function calculateSessionDuration(exercises: Exercise[]): number {
    if (!exercises.length) return 0;
    return exercises.reduce(
        (total, exercise) => total + (exercise.duration || 8),
        0
    );
}
