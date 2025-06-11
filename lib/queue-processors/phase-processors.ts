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
    WorkoutPhaseDuplicateMessage,
} from "@/types/queue-types";
import { WorkoutPlanChanges } from "@/components/workout-planning/types";
import { applyWorkoutPlanChangesWorker } from "@/lib/database/workout-database-service";
import { db } from "@/db/xata";
import { ExercisePlans, Sessions, ExercisePlanExercises } from "@/db/schemas";
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
            // First, find all sessions that belong to this phase
            const sessionsToDelete = await db
                .select({ sessionId: Sessions.sessionId })
                .from(Sessions)
                .where(eq(Sessions.phaseId, message.data.phaseId));

            const sessionIds = sessionsToDelete.map((s) => s.sessionId);

            console.log(
                `Found ${sessionIds.length} sessions to delete for phase ${message.data.phaseId}`
            );

            // Then, find all exercises that belong to those sessions
            let exerciseIds: string[] = [];
            if (sessionIds.length > 0) {
                // For multiple sessions, we need to query each one
                for (const sessionId of sessionIds) {
                    const exercises = await db
                        .select({
                            planExerciseId:
                                ExercisePlanExercises.planExerciseId,
                        })
                        .from(ExercisePlanExercises)
                        .where(eq(ExercisePlanExercises.sessionId, sessionId));

                    exerciseIds.push(
                        ...exercises.map((ex) => ex.planExerciseId)
                    );
                }
            }

            console.log(
                `Found ${exerciseIds.length} exercises to delete for phase ${message.data.phaseId}`
            );

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
                    sessions: sessionIds, // Include all sessions that belong to this phase
                    exercises: exerciseIds, // Include all exercises that belong to those sessions
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

    static async processWorkoutPhaseDuplicate(
        message: WorkoutPhaseDuplicateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing phase duplication:", message.data);

        try {
            // Create WorkoutPlanChanges object for phase duplication
            // This includes the full phase with all sessions and exercises
            const duplicatedPhase = message.data.duplicatedPhase;

            const changes: WorkoutPlanChanges = {
                created: {
                    phases: [
                        {
                            id: duplicatedPhase.id,
                            name: duplicatedPhase.name,
                            orderNumber: duplicatedPhase.orderNumber,
                            isActive: duplicatedPhase.isActive,
                            isExpanded: true, // Default to expanded for new phases
                            sessions: duplicatedPhase.sessions.map(
                                (session) => ({
                                    id: session.id,
                                    name: session.name,
                                    orderNumber: session.orderNumber,
                                    duration: session.sessionTime || 0,
                                    isExpanded: false,
                                    exercises: session.exercises.map(
                                        (exercise) => ({
                                            id: exercise.id,
                                            exerciseId: exercise.exerciseId,
                                            description:
                                                exercise.description || "",
                                            motion: exercise.motion || "",
                                            targetArea:
                                                exercise.targetArea || "",
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
                                })
                            ),
                        },
                    ],
                    sessions: duplicatedPhase.sessions.map((session) => ({
                        phaseId: duplicatedPhase.id,
                        session: {
                            id: session.id,
                            name: session.name,
                            orderNumber: session.orderNumber,
                            duration: session.sessionTime || 0,
                            isExpanded: false,
                            exercises: session.exercises.map((exercise) => ({
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
                            })),
                        },
                    })),
                    exercises: duplicatedPhase.sessions.flatMap((session) =>
                        session.exercises.map((exercise) => ({
                            sessionId: session.id,
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
                        }))
                    ),
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
                `Creating duplicated phase with ${
                    duplicatedPhase.sessions.length
                } sessions and ${duplicatedPhase.sessions.reduce(
                    (total, session) => total + session.exercises.length,
                    0
                )} exercises`
            );

            // Apply the changes using the simplified service (no concurrency control)
            const result = await applyWorkoutPlanChangesWorker(
                message.data.planId,
                changes
            );

            if (result.success) {
                return {
                    success: true,
                    message: "Phase duplicated successfully",
                    data: {
                        planId: message.data.planId,
                        originalPhaseId: message.data.originalPhaseId,
                        duplicatedPhaseId: duplicatedPhase.id,
                        sessionsCreated: duplicatedPhase.sessions.length,
                        exercisesCreated: duplicatedPhase.sessions.reduce(
                            (total, session) =>
                                total + session.exercises.length,
                            0
                        ),
                        updatedAt:
                            result.updatedAt?.toISOString() ||
                            new Date().toISOString(),
                    },
                    processedAt: new Date().toISOString(),
                };
            } else {
                return {
                    success: false,
                    message: result.error || "Failed to duplicate phase",
                    error: result.error,
                    processedAt: new Date().toISOString(),
                };
            }
        } catch (error) {
            return {
                success: false,
                message: "Failed to process phase duplication",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }
}
