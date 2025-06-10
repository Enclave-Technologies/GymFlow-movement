/**
 * Phase-related Queue Processors
 *
 * Handles workout phase CRUD operations
 */

import {
    QueueJobResult,
    WorkoutPhaseCreateMessage,
    WorkoutPhaseUpdateMessage,
    WorkoutPhaseDeleteMessage,
} from "@/types/queue-types";
import { WorkoutPlanChanges } from "@/components/workout-planning/types";
import { applyWorkoutPlanChangesWorker } from "@/lib/database/workout-database-service";
import { db } from "@/db/xata";
import { ExercisePlans } from "@/db/schemas";
import { eq } from "drizzle-orm";

export class PhaseProcessors {
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

            // For new plan scenarios, get the current plan timestamp to avoid concurrency issues
            let lastKnownUpdatedAt = new Date();

            // Check if plan exists and get its current timestamp
            const currentPlan = await db
                .select({ updatedAt: ExercisePlans.updatedAt })
                .from(ExercisePlans)
                .where(eq(ExercisePlans.planId, message.data.planId))
                .limit(1);

            if (currentPlan.length > 0) {
                lastKnownUpdatedAt = currentPlan[0].updatedAt;
                console.log(
                    `Using plan's actual updatedAt: ${lastKnownUpdatedAt.toISOString()}`
                );
            } else {
                console.log("Plan not found, will retry...");
                throw new Error("Plan not found - retrying phase creation");
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

            // Apply the changes using the simplified service (no concurrency control)
            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
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
                // Check for retryable errors
                if (result.error?.includes("Plan not found")) {
                    throw new Error("Plan not found - retrying phase creation");
                }
                if (
                    result.error?.includes(
                        "Plan has been modified since last fetch"
                    )
                ) {
                    throw new Error("Plan modified - retrying phase creation");
                }
                throw new Error(result.error || "Failed to create phase");
            }
        } catch (error) {
            console.error("Failed to process phase creation:", error);

            // Make all phase creation errors retryable for new plan scenarios
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

            // List of retryable errors
            const retryableErrors = [
                "Plan not found",
                "Plan has been modified since last fetch",
                "Plan modified",
            ];

            const isRetryableError = retryableErrors.some((retryableError) =>
                errorMessage.includes(retryableError)
            );

            if (isRetryableError) {
                console.log(
                    `Retryable error detected: ${errorMessage}. Job will be retried.`
                );
                // This will trigger BullMQ's retry mechanism
                throw error;
            }

            // Non-retryable errors return failure result
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

            // Apply the changes using the simplified service (no concurrency control)
            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
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

            // Apply the changes using the simplified service (no concurrency control)
            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
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
}
