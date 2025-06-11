/**
 * Plan-related Queue Processors
 *
 * Handles workout plan creation and full save operations
 */

import {
    QueueJobResult,
    WorkoutPlanCreateMessage,
    WorkoutPlanFullSaveMessage,
} from "@/types/queue-types";
import { createWorkoutPlanWorker } from "@/lib/database/workout-database-service";

export class PlanProcessors {
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
                    planId: message.data.planId, // Use the plan ID from the message
                    planName: message.data.planName,
                    isActive: message.data.isActive,
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
                // Full plan updates are deprecated - use individual phase operations instead
                throw new Error(
                    "Full plan updates are deprecated. Use individual phase operations for better efficiency."
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
