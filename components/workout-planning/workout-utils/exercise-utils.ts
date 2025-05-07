import { v4 as uuidv4 } from "uuid";
import type { Phase, Exercise } from "../types";

/**
 * Adds a new exercise with default properties to a specified session within a given phase.
 *
 * @param phases - The array of phases to update.
 * @param phaseId - The ID of the phase containing the session.
 * @param sessionId - The ID of the session to which the exercise will be added.
 * @returns An object containing the updated phases array and the ID of the newly created exercise.
 *
 * @remark The new exercise is initialized with default and legacy fields for compatibility and is appended to the end of the session's exercises array.
 */
export function addExercise(
    phases: Phase[],
    phaseId: string,
    sessionId: string
): { updatedPhases: Phase[]; newExerciseId: string } {
    const newExerciseId = uuidv4();
    const newExercise: Exercise = {
        id: newExerciseId,
        order: "",
        motion: "Unspecified",
        targetArea: "Unspecified",
        exerciseId: uuidv4(), // This will be replaced with actual exercise ID when saved
        description: "New Exercise",
        duration: 8,
        // Legacy fields for backward compatibility
        sets: "3-5",
        reps: "8-12",
        rest: "45-60",
        // New fields
        setsMin: "3",
        setsMax: "5",
        repsMin: "8",
        repsMax: "12",
        tempo: "3 0 1 0",
        restMin: "45",
        restMax: "60",
        additionalInfo: "",
        customizations: "",
        notes: "",
        // Add sessionId to ensure parent-child relationship
        sessionId: sessionId,
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

/**
 * Removes an exercise from a specified session within a given phase.
 *
 * @param phases - The array of phases containing sessions and exercises.
 * @param phaseId - The ID of the phase containing the session.
 * @param sessionId - The ID of the session from which to remove the exercise.
 * @param exerciseId - The ID of the exercise to be removed.
 * @returns A new array of phases with the specified exercise removed.
 */
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

/**
 * Calculates the total duration of a session by summing the durations of all exercises.
 *
 * If an exercise does not specify a duration, a default value of 8 is used.
 *
 * @param exercises - The list of exercises in the session.
 * @returns The total duration of the session.
 */
export function calculateSessionDuration(exercises: Exercise[]): number {
    if (!exercises.length) return 0;
    return exercises.reduce(
        (total, exercise) => total + (exercise.duration || 8),
        0
    );
}
