import { v4 as uuidv4 } from "uuid";
import type { Phase, Exercise } from "../types";
// import { incrementOrder } from "@/lib/utils";

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
        exerciseId: "", // This will be replaced with actual exercise ID when saved
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
        // Flag to track if this is a newly created exercise
        isNewlyCreated: true,
    };

    // Find the session to get its current exercises
    // const phase = phases.find((p) => p.id === phaseId);
    // const session = phase?.sessions.find((s) => s.id === sessionId);

    // if (session && session.exercises.length > 0) {
    //     // Set the order based on the last exercise's order
    //     const lastExercise = session.exercises[session.exercises.length - 1];
    //     // Simple increment for order (you might want a more sophisticated approach)
    //     newExercise.order = incrementOrder(lastExercise.order);
    // } else {
    //     // First exercise in the session
    //     newExercise.order = "A";
    // }

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
