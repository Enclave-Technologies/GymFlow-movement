/**
 * Session-related Queue Processors
 *
 * Handles workout session CRUD operations
 */

import {
    QueueJobResult,
    WorkoutSessionCreateMessage,
    WorkoutSessionUpdateMessage,
    WorkoutSessionDeleteMessage,
    WorkoutSessionDuplicateMessage,
} from "../../types/queue-types";
import { WorkoutPlanChanges } from "../../types/workout-plan-types";
import { applyWorkoutPlanChangesWorker } from "../database/workout-database-service";
import { workerDb as db } from "../database/worker-db";
import { ExercisePlanExercises } from "../../db/schemas";
import { eq } from "drizzle-orm";

export class SessionProcessors {
    static async processWorkoutSessionCreate(
        message: WorkoutSessionCreateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing session creation:", message.data);

        try {
            // Create WorkoutPlanChanges object for session creation
            const changes: WorkoutPlanChanges = {
                created: {
                    phases: [],
                    sessions: [
                        {
                            phaseId: message.data.phaseId,
                            session: {
                                id: message.data.session.id,
                                name: message.data.session.name,
                                duration: message.data.session.sessionTime || 0,
                                orderNumber: message.data.session.orderNumber,
                                isExpanded: false,
                                exercises: [], // New session starts with no exercises
                            },
                        },
                    ],
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
                    message: "Session created successfully",
                    data: {
                        sessionId: message.data.session.id,
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
                    message: result.error || "Failed to create session",
                    error: result.error,
                    processedAt: new Date().toISOString(),
                };
            }
        } catch (error) {
            return {
                success: false,
                message: "Failed to process session creation",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutSessionUpdate(
        message: WorkoutSessionUpdateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing session update:", message.data);

        try {
            // Create WorkoutPlanChanges object for session update
            const changes: WorkoutPlanChanges = {
                created: {
                    phases: [],
                    sessions: [],
                    exercises: [],
                },
                updated: {
                    phases: [],
                    sessions: [
                        {
                            id: message.data.sessionId,
                            changes: message.data.changes,
                        },
                    ],
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
                    message: "Session updated successfully",
                    data: {
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
                    message: result.error || "Failed to update session",
                    error: result.error,
                    processedAt: new Date().toISOString(),
                };
            }
        } catch (error) {
            return {
                success: false,
                message: "Failed to process session update",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutSessionDelete(
        message: WorkoutSessionDeleteMessage
    ): Promise<QueueJobResult> {
        console.log("Processing session deletion:", message.data);

        try {
            // First, find all exercises that belong to this session
            // These need to be deleted before the session can be deleted due to foreign key constraints
            const exercisesToDelete = await db
                .select({
                    planExerciseId: ExercisePlanExercises.planExerciseId,
                })
                .from(ExercisePlanExercises)
                .where(
                    eq(ExercisePlanExercises.sessionId, message.data.sessionId)
                );

            const exerciseIds = exercisesToDelete.map(
                (ex) => ex.planExerciseId
            );

            console.log(
                `Found ${exerciseIds.length} exercises to delete for session ${message.data.sessionId}`
            );

            // Create WorkoutPlanChanges object for session deletion
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
                    sessions: [message.data.sessionId],
                    exercises: exerciseIds, // Include all exercises that belong to this session
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
                    message: "Session deleted successfully",
                    data: {
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
                    message: result.error || "Failed to delete session",
                    error: result.error,
                    processedAt: new Date().toISOString(),
                };
            }
        } catch (error) {
            return {
                success: false,
                message: "Failed to process session deletion",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutSessionDuplicate(
        message: WorkoutSessionDuplicateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing session duplication:", message.data);

        try {
            // Create WorkoutPlanChanges object for session duplication
            // This includes the full session with all exercises
            const duplicatedSession = message.data.duplicatedSession;

            const changes: WorkoutPlanChanges = {
                created: {
                    phases: [],
                    sessions: [
                        {
                            phaseId: message.data.phaseId,
                            session: {
                                id: duplicatedSession.id,
                                name: duplicatedSession.name,
                                duration: duplicatedSession.sessionTime || 0,
                                orderNumber: duplicatedSession.orderNumber,
                                isExpanded: false,
                                exercises: duplicatedSession.exercises.map(
                                    (exercise) => ({
                                        id: exercise.id,
                                        exerciseId: exercise.exerciseId,
                                        description: exercise.description || "",
                                        motion: exercise.motion || "",
                                        targetArea: exercise.targetArea || "",
                                        setsMin: exercise.setsMin || "",
                                        setsMax: exercise.setsMax || "",
                                        repsMin: exercise.repsMin || "",
                                        repsMax: exercise.repsMax || "",
                                        tempo: exercise.tempo || "",
                                        restMin: exercise.restMin || "",
                                        restMax: exercise.restMax || "",
                                        customizations:
                                            exercise.customizations || "",
                                        additionalInfo:
                                            exercise.additionalInfo || "",
                                        notes: exercise.notes || "",
                                        order: exercise.order || "",
                                    })
                                ),
                            },
                        },
                    ],
                    exercises: duplicatedSession.exercises.map((exercise) => ({
                        sessionId: duplicatedSession.id,
                        exercise: {
                            id: exercise.id,
                            exerciseId: exercise.exerciseId,
                            description: exercise.description || "",
                            motion: exercise.motion || "",
                            targetArea: exercise.targetArea || "",
                            setsMin: exercise.setsMin || "",
                            setsMax: exercise.setsMax || "",
                            repsMin: exercise.repsMin || "",
                            repsMax: exercise.repsMax || "",
                            tempo: exercise.tempo || "",
                            restMin: exercise.restMin || "",
                            restMax: exercise.restMax || "",
                            customizations: exercise.customizations || "",
                            additionalInfo: exercise.additionalInfo || "",
                            notes: exercise.notes || "",
                            order: exercise.order || "",
                        },
                    })),
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

            console.log(
                `Creating duplicated session with ${duplicatedSession.exercises.length} exercises`
            );

            // Apply the changes using the simplified service (no concurrency control)
            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
                changes
            );

            if (result.success) {
                return {
                    success: true,
                    message: "Session duplicated successfully",
                    data: {
                        planId: message.data.planId,
                        phaseId: message.data.phaseId,
                        originalSessionId: message.data.originalSessionId,
                        duplicatedSessionId: duplicatedSession.id,
                        exercisesCreated: duplicatedSession.exercises.length,
                        updatedAt:
                            result.updatedAt?.toISOString() ||
                            new Date().toISOString(),
                    },
                    processedAt: new Date().toISOString(),
                };
            } else {
                return {
                    success: false,
                    message: result.error || "Failed to duplicate session",
                    error: result.error,
                    processedAt: new Date().toISOString(),
                };
            }
        } catch (error) {
            return {
                success: false,
                message: "Failed to process session duplication",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }
}
