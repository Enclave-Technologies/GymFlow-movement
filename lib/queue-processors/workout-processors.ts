/**
 * Workout Queue Message Processors
 *
 * This file contains all the message processors for workout-related queue operations.
 * Separated from the main queue worker to maintain file size under 600 lines.
 * Worker-compatible version without Next.js dependencies.
 */

import {
    QueueJobResult,
    WorkoutUpdateMessage,
    WorkoutPhaseCreateMessage,
    WorkoutPhaseUpdateMessage,
    WorkoutPhaseDeleteMessage,
    WorkoutSessionCreateMessage,
    WorkoutSessionUpdateMessage,
    WorkoutSessionDeleteMessage,
    WorkoutExerciseCreateMessage,
    WorkoutExerciseUpdateMessage,
    WorkoutExerciseDeleteMessage,
    WorkoutPlanFullSaveMessage,
} from "@/types/queue-types";
import { WorkoutPlanChanges } from "@/components/workout-planning/types";
import {
    applyWorkoutPlanChangesWorker,
    createWorkoutPlanWorker,
    updateWorkoutPlanWorker,
} from "@/lib/database/workout-database-service";

export class WorkoutProcessors {
    static async processWorkoutUpdate(
        message: WorkoutUpdateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing workout update:", message.data);

        try {
            // TODO: Implement actual workout update logic
            // This would typically involve database updates

            // Simulate processing time
            await new Promise((resolve) => setTimeout(resolve, 1000));

            return {
                success: true,
                message: "Workout update processed successfully",
                data: {
                    exercisePlanId: message.data.exercisePlanId,
                    updatedFieldsCount: Object.keys(message.data.changes)
                        .length,
                },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process workout update",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutPhaseCreate(
        message: WorkoutPhaseCreateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing phase creation:", message.data);

        try {
            // TODO: Implement actual database operations
            // For now, just simulate processing
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Phase creation queued successfully",
                data: {
                    planId: message.data.planId,
                    phaseId: message.data.phase.id,
                    phaseName: message.data.phase.name,
                },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            console.error("Failed to process phase creation:", error);
            return {
                success: false,
                message: "Failed to process phase creation",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutPhaseUpdate(
        message: WorkoutPhaseUpdateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing phase update:", message.data);

        try {
            // Update the phase using the existing workout plan actions
            const changes: WorkoutPlanChanges = {
                created: {
                    phases: [],
                    sessions: [],
                    exercises: [],
                },
                updated: {
                    phases: [
                        {
                            id: message.data.phaseId,
                            changes: message.data.changes,
                        },
                    ],
                    sessions: [],
                    exercises: [],
                },
                deleted: {
                    phases: [],
                    sessions: [],
                    exercises: [],
                },
            };

            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
                new Date(message.data.lastKnownUpdatedAt),
                changes
            );

            if (result.success) {
                // Note: Cache revalidation not available in worker context

                return {
                    success: true,
                    message: "Phase updated successfully",
                    data: {
                        planId: message.data.planId,
                        phaseId: message.data.phaseId,
                        updatedFields: Object.keys(message.data.changes).length,
                    },
                    processedAt: new Date().toISOString(),
                };
            } else {
                throw new Error(result.error || "Failed to update phase");
            }
        } catch (error) {
            console.error("Failed to process phase update:", error);
            return {
                success: false,
                message: "Failed to process phase update",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutPhaseDelete(
        message: WorkoutPhaseDeleteMessage
    ): Promise<QueueJobResult> {
        console.log("Processing phase deletion:", message.data);

        try {
            // Delete the phase using the existing workout plan actions
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
                    phases: [message.data.phaseId],
                    sessions: [],
                    exercises: [],
                },
            };

            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
                new Date(message.data.lastKnownUpdatedAt),
                changes
            );

            if (result.success) {
                // Note: Cache revalidation not available in worker context

                return {
                    success: true,
                    message: "Phase deleted successfully",
                    data: {
                        planId: message.data.planId,
                        phaseId: message.data.phaseId,
                    },
                    processedAt: new Date().toISOString(),
                };
            } else {
                throw new Error(result.error || "Failed to delete phase");
            }
        } catch (error) {
            console.error("Failed to process phase deletion:", error);
            return {
                success: false,
                message: "Failed to process phase deletion",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    // For now, implement simplified versions of the other processors
    // These can be expanded later with full functionality
    static async processWorkoutSessionCreate(
        message: WorkoutSessionCreateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing session creation:", message.data);

        try {
            // Create the session using the existing workout plan actions
            const changes: WorkoutPlanChanges = {
                created: {
                    phases: [],
                    sessions: [
                        {
                            phaseId: message.data.phaseId,
                            session: {
                                id: message.data.session.id,
                                name: message.data.session.name,
                                orderNumber: message.data.session.orderNumber,
                                duration: message.data.session.sessionTime || 0,
                                isExpanded: true,
                                exercises: [],
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

            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
                new Date(message.data.lastKnownUpdatedAt),
                changes
            );

            if (result.success) {
                // Note: Cache revalidation not available in worker context

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
            // Update the session using the existing workout plan actions
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

            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
                new Date(message.data.lastKnownUpdatedAt),
                changes
            );

            if (result.success) {
                // Invalidate cache
                // Note: Cache revalidation not available in worker context

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
            // Delete the session using the existing workout plan actions
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
                    exercises: [],
                },
            };

            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
                new Date(message.data.lastKnownUpdatedAt),
                changes
            );

            if (result.success) {
                // Invalidate cache
                // Note: Cache revalidation not available in worker context

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

    static async processWorkoutExerciseCreate(
        message: WorkoutExerciseCreateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing exercise creation:", message.data);

        try {
            // Create the exercise using the existing workout plan actions
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
                                setsMin: message.data.exercise.setsMin,
                                setsMax: message.data.exercise.setsMax,
                                repsMin: message.data.exercise.repsMin,
                                repsMax: message.data.exercise.repsMax,
                                tempo: message.data.exercise.tempo,
                                restMin: message.data.exercise.restMin,
                                restMax: message.data.exercise.restMax,
                                customizations:
                                    message.data.exercise.customizations,
                                notes: message.data.exercise.notes,
                                order: "1", // Default order for new exercises
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

            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
                new Date(message.data.lastKnownUpdatedAt),
                changes
            );

            if (result.success) {
                // Invalidate cache
                // Note: Cache revalidation not available in worker context

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
            // Update the exercise using the existing workout plan actions
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
                            changes: message.data.changes,
                        },
                    ],
                },
                deleted: {
                    phases: [],
                    sessions: [],
                    exercises: [],
                },
            };

            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
                new Date(message.data.lastKnownUpdatedAt),
                changes
            );

            if (result.success) {
                // Invalidate cache
                // Note: Cache revalidation not available in worker context

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
            // Delete the exercise using the existing workout plan actions
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

            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
                new Date(message.data.lastKnownUpdatedAt),
                changes
            );

            if (result.success) {
                // Invalidate cache
                // Note: Cache revalidation not available in worker context

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

    static async processWorkoutPlanFullSave(
        message: WorkoutPlanFullSaveMessage
    ): Promise<QueueJobResult> {
        console.log("Processing full plan save:", message.data);

        try {
            // Use the existing full save logic
            let result;

            if (!message.data.planId || !message.data.lastKnownUpdatedAt) {
                // Create new plan
                result = await createWorkoutPlanWorker(
                    message.data.clientId,
                    message.data.trainerId,
                    { phases: message.data.phases }
                );
            } else {
                // Update existing plan
                result = await updateWorkoutPlanWorker(
                    message.data.planId,
                    new Date(message.data.lastKnownUpdatedAt),
                    { phases: message.data.phases }
                );
            }

            if (result.success) {
                // Revalidate the client page cache
                // Note: Cache revalidation not available in worker context

                return {
                    success: true,
                    message: "Full plan save completed successfully",
                    data: {
                        planId: result.planId || "unknown",
                        phaseCount: message.data.phases.length,
                    },
                    processedAt: new Date().toISOString(),
                };
            } else {
                throw new Error(result.error || "Failed to save workout plan");
            }
        } catch (error) {
            console.error("Failed to process full plan save:", error);
            return {
                success: false,
                message: "Failed to process full plan save",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }
}
