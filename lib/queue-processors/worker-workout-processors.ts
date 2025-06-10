/**
 * Worker-Compatible Workout Queue Message Processors
 *
 * This file contains workout processors that work in the worker environment
 * without Next.js dependencies like 'server-only' or revalidatePath.
 */

import {
    QueueJobResult,
    WorkoutUpdateMessage,
    WorkoutPlanCreateMessage,
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

export class WorkerWorkoutProcessors {
    static async processWorkoutPlanCreate(
        message: WorkoutPlanCreateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing plan creation:", message.data);

        try {
            const result = await createWorkoutPlanWorker(
                message.data.clientId,
                message.data.trainerId,
                {
                    phases: [], // Empty phases array for new plan
                }
            );

            if (result.success) {
                return {
                    success: true,
                    message: "Plan created successfully",
                    data: {
                        planId: result.planId || "unknown",
                        planName: message.data.planName,
                    },
                    processedAt: new Date().toISOString(),
                };
            } else {
                throw new Error(result.error || "Failed to create plan");
            }
        } catch (error) {
            console.error("Failed to process plan creation:", error);
            return {
                success: false,
                message: "Failed to process plan creation",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

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
            // Check if this is a dependency scenario (plan might not exist yet)
            const isDependencyScenario =
                message.metadata?.updateType ===
                "phase_creation_with_dependency";

            if (isDependencyScenario) {
                // Add a small delay to allow plan creation to complete
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            // Create the phase using the worker-compatible database service
            const changes: WorkoutPlanChanges = {
                created: {
                    phases: [
                        {
                            id: message.data.phase.id,
                            name: message.data.phase.name,
                            orderNumber: message.data.phase.orderNumber,
                            isActive: message.data.phase.isActive,
                            isExpanded: true, // Default to expanded for new phases
                            sessions: [], // Required by Phase type
                        },
                    ],
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
                    exercises: [],
                },
            };

            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
                new Date(), // Use current time as lastKnownUpdatedAt for new phases
                changes
            );

            if (result.success) {
                return {
                    success: true,
                    message: "Phase created successfully",
                    data: {
                        planId: message.data.planId,
                        phaseId: message.data.phase.id,
                        phaseName: message.data.phase.name,
                    },
                    processedAt: new Date().toISOString(),
                };
            } else {
                // If plan not found and this is a dependency scenario, throw retryable error
                if (
                    result.error?.includes("Plan not found") &&
                    isDependencyScenario
                ) {
                    throw new Error("Plan not found - retrying phase creation");
                }
                throw new Error(result.error || "Failed to create phase");
            }
        } catch (error) {
            console.error("Failed to process phase creation:", error);

            // For dependency scenarios with plan not found, make it retryable
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            const isDependencyScenario =
                message.metadata?.updateType ===
                "phase_creation_with_dependency";

            if (
                isDependencyScenario &&
                errorMessage.includes("Plan not found")
            ) {
                // This will trigger BullMQ's retry mechanism
                throw error;
            }

            return {
                success: false,
                message: "Failed to process phase creation",
                error: errorMessage,
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutPhaseUpdate(
        message: WorkoutPhaseUpdateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing phase update:", message.data);

        try {
            // Update the phase using the worker-compatible database service
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
                return {
                    success: true,
                    message: "Phase update processed successfully",
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
            // Delete the phase using the worker-compatible database service
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

    // Simplified versions of other processors for now
    static async processWorkoutSessionCreate(
        message: WorkoutSessionCreateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing session creation:", message.data);

        try {
            // TODO: Implement with applyWorkoutPlanChangesWorker
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Session creation queued successfully",
                data: {
                    sessionId: message.data.session.id,
                    phaseId: message.data.phaseId,
                },
                processedAt: new Date().toISOString(),
            };
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
            // TODO: Implement with applyWorkoutPlanChangesWorker
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Session update queued successfully",
                data: {
                    sessionId: message.data.sessionId,
                    phaseId: message.data.phaseId,
                },
                processedAt: new Date().toISOString(),
            };
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
            // TODO: Implement with applyWorkoutPlanChangesWorker
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Session deletion queued successfully",
                data: {
                    sessionId: message.data.sessionId,
                    phaseId: message.data.phaseId,
                },
                processedAt: new Date().toISOString(),
            };
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
            // TODO: Implement with applyWorkoutPlanChangesWorker
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Exercise creation queued successfully",
                data: {
                    exerciseId: message.data.exercise.id,
                    sessionId: message.data.sessionId,
                },
                processedAt: new Date().toISOString(),
            };
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
            // TODO: Implement with applyWorkoutPlanChangesWorker
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Exercise update queued successfully",
                data: {
                    exerciseId: message.data.exerciseId,
                    sessionId: message.data.sessionId,
                },
                processedAt: new Date().toISOString(),
            };
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
            // TODO: Implement with applyWorkoutPlanChangesWorker
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Exercise deletion queued successfully",
                data: {
                    exerciseId: message.data.exerciseId,
                    sessionId: message.data.sessionId,
                },
                processedAt: new Date().toISOString(),
            };
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
        console.log("Processing workout plan full save:", message.data);

        try {
            // Use the existing full save logic from the database service
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
