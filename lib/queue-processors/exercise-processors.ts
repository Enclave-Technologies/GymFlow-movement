/**
 * Exercise-related Queue Processors
 *
 * Handles workout exercise CRUD operations
 */

import {
    QueueJobResult,
    WorkoutExerciseSaveMessage,
    WorkoutExerciseDeleteMessage,
} from "@/types/queue-types";
import {
    WorkoutPlanChanges,
    Exercise,
} from "@/components/workout-planning/types";
import { applyWorkoutPlanChangesWorker } from "@/lib/database/workout-database-service";

export class ExerciseProcessors {
    static async processWorkoutExerciseSave(
        message: WorkoutExerciseSaveMessage
    ): Promise<QueueJobResult> {
        console.log(
            `=================================================\n
            Processing exercise ${message.data.isNew ? "creation" : "update"}:`,
            message.data
        );

        try {
            let changes: WorkoutPlanChanges;

            if (message.data.isNew) {
                // This is a new exercise creation
                changes = {
                    created: {
                        phases: [],
                        sessions: [],
                        exercises: [
                            {
                                sessionId: message.data.sessionId,
                                exercise: {
                                    id: message.data.exercise.id,
                                    exerciseId:
                                        message.data.exercise.exerciseId,
                                    description:
                                        message.data.exercise.description,
                                    motion: message.data.exercise.motion,
                                    targetArea:
                                        message.data.exercise.targetArea,
                                    setsMin:
                                        message.data.exercise.setsMin || "",
                                    setsMax:
                                        message.data.exercise.setsMax || "",
                                    repsMin:
                                        message.data.exercise.repsMin || "",
                                    repsMax:
                                        message.data.exercise.repsMax || "",
                                    tempo: message.data.exercise.tempo || "",
                                    restMin:
                                        message.data.exercise.restMin || "",
                                    restMax:
                                        message.data.exercise.restMax || "",
                                    customizations:
                                        message.data.exercise.customizations ||
                                        "",
                                    notes: message.data.exercise.notes || "",
                                    order: message.data.exercise.order || "",
                                    additionalInfo:
                                        message.data.exercise.additionalInfo ||
                                        "",
                                },
                            },
                        ],
                    },
                    updated: {
                        phases: [],
                        sessions: [],
                        exercises: [],
                    },
                    deleted: {
                        phases: [],
                        sessions: [],
                        exercises: [],
                    },
                };
            } else {
                // This is an exercise update
                const exerciseChanges: Partial<Exercise> = {
                    exerciseId: message.data.exercise.exerciseId,
                    description: message.data.exercise.description,
                    motion: message.data.exercise.motion,
                    targetArea: message.data.exercise.targetArea,
                    setsMin: message.data.exercise.setsMin || "",
                    setsMax: message.data.exercise.setsMax || "",
                    repsMin: message.data.exercise.repsMin || "",
                    repsMax: message.data.exercise.repsMax || "",
                    tempo: message.data.exercise.tempo || "",
                    restMin: message.data.exercise.restMin || "",
                    restMax: message.data.exercise.restMax || "",
                    customizations: message.data.exercise.customizations || "",
                    notes: message.data.exercise.notes || "",
                    order: message.data.exercise.order || "",
                    additionalInfo: message.data.exercise.additionalInfo || "",
                };

                changes = {
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
                                id: message.data.planExerciseId,
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
            }

            // Apply the changes using the simplified service (no concurrency control)
            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
                changes
            );

            if (result.success) {
                return {
                    success: true,
                    message: `Exercise ${
                        message.data.isNew ? "created" : "updated"
                    } successfully`,
                    data: {
                        exerciseId: message.data.exerciseId,
                        planExerciseId: message.data.planExerciseId,
                        sessionId: message.data.sessionId,
                        phaseId: message.data.phaseId,
                        updatedAt:
                            result.updatedAt?.toISOString() ||
                            new Date().toISOString(),
                    },
                    processedAt: new Date().toISOString(),
                };
            } else {
                return {
                    success: false,
                    message:
                        result.error ||
                        `Failed to ${
                            message.data.isNew ? "create" : "update"
                        } exercise`,
                    error: result.error,
                    processedAt: new Date().toISOString(),
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Failed to process exercise ${
                    message.data.isNew ? "creation" : "update"
                }`,
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutExerciseDelete(
        message: WorkoutExerciseDeleteMessage
    ): Promise<QueueJobResult> {
        console.log("Processing exercise deletion:", message.data);

        try {
            // Create WorkoutPlanChanges object for exercise deletion
            const changes: WorkoutPlanChanges = {
                created: {
                    phases: [],
                    sessions: [],
                    exercises: [],
                },
                updated: {
                    phases: [],
                    sessions: [],
                    exercises: [],
                },
                deleted: {
                    phases: [],
                    sessions: [],
                    exercises: [message.data.planExerciseId],
                },
            };

            // Apply the changes using the simplified service (no concurrency control)
            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
                changes
            );

            if (result.success) {
                return {
                    success: true,
                    message: "Exercise deleted successfully",
                    data: {
                        exerciseId: message.data.exerciseId,
                        planExerciseId: message.data.planExerciseId,
                        sessionId: message.data.sessionId,
                        phaseId: message.data.phaseId,
                        updatedAt:
                            result.updatedAt?.toISOString() ||
                            new Date().toISOString(),
                    },
                    processedAt: new Date().toISOString(),
                };
            } else {
                return {
                    success: false,
                    message: result.error || "Failed to delete exercise",
                    error: result.error,
                    processedAt: new Date().toISOString(),
                };
            }
        } catch (error) {
            return {
                success: false,
                message: "Failed to process exercise deletion",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }
}
