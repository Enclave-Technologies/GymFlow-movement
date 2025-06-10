/**
 * Exercise-related Queue Processors
 *
 * Handles workout exercise CRUD operations
 */

import {
    QueueJobResult,
    WorkoutExerciseCreateMessage,
    WorkoutExerciseUpdateMessage,
    WorkoutExerciseDeleteMessage,
} from "@/types/queue-types";
import {
    WorkoutPlanChanges,
    Exercise,
} from "@/components/workout-planning/types";
import { applyWorkoutPlanChangesWorker } from "@/lib/database/workout-database-service";

export class ExerciseProcessors {
    static async processWorkoutExerciseCreate(
        message: WorkoutExerciseCreateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing exercise creation:", message.data);

        try {
            // Create WorkoutPlanChanges object for exercise creation
            const changes: WorkoutPlanChanges = {
                created: {
                    phases: [],
                    sessions: [],
                    exercises: [
                        {
                            sessionId: message.data.sessionId,
                            exercise: {
                                id: message.data.exercise.id,
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
                                customizations:
                                    message.data.exercise.customizations || "",
                                notes: message.data.exercise.notes || "",
                                order: String(
                                    message.data.exercise.exerciseOrder || 0
                                ),
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

            // Apply the changes using the simplified service (no concurrency control)
            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
                changes
            );

            if (result.success) {
                return {
                    success: true,
                    message: "Exercise created successfully",
                    data: {
                        exerciseId: message.data.exercise.id,
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
                    message: result.error || "Failed to create exercise",
                    error: result.error,
                    processedAt: new Date().toISOString(),
                };
            }
        } catch (error) {
            return {
                success: false,
                message: "Failed to process exercise creation",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutExerciseUpdate(
        message: WorkoutExerciseUpdateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing exercise update:", message.data);

        try {
            // Create WorkoutPlanChanges object for exercise update
            const exerciseChanges: Partial<Exercise> = {};

            // Map the changes from the message to the Exercise interface
            if (message.data.changes.exerciseId !== undefined) {
                exerciseChanges.exerciseId = message.data.changes.exerciseId;
            }
            if (message.data.changes.description !== undefined) {
                exerciseChanges.description = message.data.changes.description;
            }
            if (message.data.changes.motion !== undefined) {
                exerciseChanges.motion = message.data.changes.motion;
            }
            if (message.data.changes.targetArea !== undefined) {
                exerciseChanges.targetArea = message.data.changes.targetArea;
            }
            if (message.data.changes.setsMin !== undefined) {
                exerciseChanges.setsMin = message.data.changes.setsMin;
            }
            if (message.data.changes.setsMax !== undefined) {
                exerciseChanges.setsMax = message.data.changes.setsMax;
            }
            if (message.data.changes.repsMin !== undefined) {
                exerciseChanges.repsMin = message.data.changes.repsMin;
            }
            if (message.data.changes.repsMax !== undefined) {
                exerciseChanges.repsMax = message.data.changes.repsMax;
            }
            if (message.data.changes.tempo !== undefined) {
                exerciseChanges.tempo = message.data.changes.tempo;
            }
            if (message.data.changes.restMin !== undefined) {
                exerciseChanges.restMin = message.data.changes.restMin;
            }
            if (message.data.changes.restMax !== undefined) {
                exerciseChanges.restMax = message.data.changes.restMax;
            }
            if (message.data.changes.customizations !== undefined) {
                exerciseChanges.customizations =
                    message.data.changes.customizations;
            }
            if (message.data.changes.notes !== undefined) {
                exerciseChanges.notes = message.data.changes.notes;
            }
            if (message.data.changes.exerciseOrder !== undefined) {
                exerciseChanges.order = String(
                    message.data.changes.exerciseOrder
                );
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

            // Apply the changes using the simplified service (no concurrency control)
            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
                changes
            );

            if (result.success) {
                return {
                    success: true,
                    message: "Exercise updated successfully",
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
                    message: result.error || "Failed to update exercise",
                    error: result.error,
                    processedAt: new Date().toISOString(),
                };
            }
        } catch (error) {
            return {
                success: false,
                message: "Failed to process exercise update",
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
