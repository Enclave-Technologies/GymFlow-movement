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
} from "@/types/queue-types";
import { WorkoutPlanChanges } from "@/components/workout-planning/types";
import { applyWorkoutPlanChangesWorker } from "@/lib/database/workout-database-service";

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
}
