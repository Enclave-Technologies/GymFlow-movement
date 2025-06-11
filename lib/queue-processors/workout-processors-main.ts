/**
 * Main Workout Queue Processors
 *
 * Coordinates all workout-related queue processing by delegating to specialized processors
 */

import {
    QueueJobResult,
    WorkoutUpdateMessage,
    // WorkoutPlanCreateMessage,
    // WorkoutPhaseCreateMessage,
    // WorkoutPhaseUpdateMessage,
    // WorkoutPhaseDeleteMessage,
    // WorkoutSessionCreateMessage,
    // WorkoutSessionUpdateMessage,
    // WorkoutSessionDeleteMessage,
    // WorkoutExerciseCreateMessage,
    // WorkoutExerciseUpdateMessage,
    // WorkoutExerciseDeleteMessage,
    // WorkoutPlanFullSaveMessage,
} from "../../types/queue-types";
import {
    WorkoutPlanChanges,
    Exercise,
} from "../../components/workout-planning/types";
import { applyWorkoutPlanChangesWorker } from "../database/workout-database-service";

// Import specialized processors
import { PlanProcessors } from "./plan-processors";
import { PhaseProcessors } from "./phase-processors";
import { SessionProcessors } from "./session-processors";
import { ExerciseProcessors } from "./exercise-processors";

export class WorkoutProcessorsMain {
    // General workout update processor (for legacy compatibility)
    static async processWorkoutUpdate(
        message: WorkoutUpdateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing workout update:", message.data);

        try {
            // Create WorkoutPlanChanges object for exercise field updates
            const exerciseChanges: Partial<Exercise> = {};

            // Map the ExerciseChanges to Exercise interface
            if (message.data.changes.sets !== undefined) {
                exerciseChanges.sets = String(message.data.changes.sets);
            }
            if (message.data.changes.reps !== undefined) {
                exerciseChanges.reps = String(message.data.changes.reps);
            }
            if (message.data.changes.weight !== undefined) {
                // Weight is not directly stored in Exercise interface, might be in notes
                exerciseChanges.notes = `Weight: ${message.data.changes.weight}`;
            }
            if (message.data.changes.duration !== undefined) {
                exerciseChanges.duration = Number(
                    message.data.changes.duration
                );
            }
            if (message.data.changes.rest !== undefined) {
                exerciseChanges.rest = String(message.data.changes.rest);
            }
            if (message.data.changes.notes !== undefined) {
                exerciseChanges.notes = String(message.data.changes.notes);
            }

            const changes: WorkoutPlanChanges = {
                created: {
                    phases: [],
                    sessions: [],
                    exercises: [],
                },
                updated: {
                    phases: [],
                    sessions: [],
                    exercises: [
                        {
                            id: message.data.exercisePlanId,
                            changes: exerciseChanges,
                        },
                    ],
                },
                deleted: {
                    phases: [],
                    sessions: [],
                    exercises: [],
                },
            };

            // Apply the changes using the simplified service (no concurrency control)
            // Note: We don't have planId in WorkoutUpdateMessage, so we'll need to look it up
            // For now, we'll use a placeholder approach
            const result = await applyWorkoutPlanChangesWorker(
                "unknown", // This is a limitation of the current message structure
                changes
            );

            if (result.success) {
                return {
                    success: true,
                    message: "Workout update processed successfully",
                    data: {
                        exercisePlanId: message.data.exercisePlanId,
                        updatedFieldsCount: Object.keys(message.data.changes)
                            .length,
                        updatedAt:
                            result.updatedAt?.toISOString() ||
                            new Date().toISOString(),
                    },
                    processedAt: new Date().toISOString(),
                };
            } else {
                return {
                    success: false,
                    message: result.error || "Failed to update workout",
                    error: result.error,
                    processedAt: new Date().toISOString(),
                };
            }
        } catch (error) {
            return {
                success: false,
                message: "Failed to process workout update",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    // Delegate to specialized processors
    static processWorkoutPlanCreate = PlanProcessors.processWorkoutPlanCreate;
    static processWorkoutPlanFullSave =
        PlanProcessors.processWorkoutPlanFullSave;

    static processWorkoutPhaseCreate =
        PhaseProcessors.processWorkoutPhaseCreate;
    static processWorkoutPhaseUpdate =
        PhaseProcessors.processWorkoutPhaseUpdate;
    static processWorkoutPhaseDelete =
        PhaseProcessors.processWorkoutPhaseDelete;
    static processWorkoutPhaseDuplicate =
        PhaseProcessors.processWorkoutPhaseDuplicate;
    static processWorkoutPhaseActivate =
        PhaseProcessors.processWorkoutPhaseActivate;

    static processWorkoutSessionCreate =
        SessionProcessors.processWorkoutSessionCreate;
    static processWorkoutSessionUpdate =
        SessionProcessors.processWorkoutSessionUpdate;
    static processWorkoutSessionDelete =
        SessionProcessors.processWorkoutSessionDelete;
    static processWorkoutSessionDuplicate =
        SessionProcessors.processWorkoutSessionDuplicate;

    static processWorkoutExerciseSave =
        ExerciseProcessors.processWorkoutExerciseSave;
    static processWorkoutExerciseDelete =
        ExerciseProcessors.processWorkoutExerciseDelete;
}
