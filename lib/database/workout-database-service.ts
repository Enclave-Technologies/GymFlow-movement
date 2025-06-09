/**
 * Database service for workout operations
 * This module provides database operations without Next.js dependencies
 * for use in queue workers and other non-Next.js contexts
 */

import { db } from "@/db/xata";
import {
    ExercisePlans,
    Phases,
    Sessions,
    ExercisePlanExercises,
    Exercises,
} from "@/db/schemas";
import { eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
    WorkoutPlanActionResponse,
    WorkoutPlanChanges,
    Phase,
} from "@/components/workout-planning/types";

/**
 * Apply changes to a workout plan with optimistic concurrency control
 * Worker-compatible version without Next.js dependencies
 */
export async function applyWorkoutPlanChangesWorker(
    planId: string,
    lastKnownUpdatedAt: Date,
    changes: WorkoutPlanChanges
): Promise<WorkoutPlanActionResponse> {
    try {
        // Skip processing if there are no actual changes
        const hasNoChanges =
            changes.created.phases.length === 0 &&
            changes.created.sessions.length === 0 &&
            changes.created.exercises.length === 0 &&
            changes.updated.phases.length === 0 &&
            changes.updated.sessions.length === 0 &&
            changes.updated.exercises.length === 0 &&
            changes.deleted.phases.length === 0 &&
            changes.deleted.sessions.length === 0 &&
            changes.deleted.exercises.length === 0;

        if (hasNoChanges) {
            console.log("No changes to apply, skipping database operations");
            return {
                success: true,
                planId: planId,
                updatedAt: new Date(),
                conflict: false,
                error: undefined,
                serverUpdatedAt: new Date(),
            };
        }

        // Check if the plan exists and get current timestamp
        const currentPlan = await db
            .select({ updatedAt: ExercisePlans.updatedAt })
            .from(ExercisePlans)
            .where(eq(ExercisePlans.planId, planId))
            .limit(1);

        if (currentPlan.length === 0) {
            return {
                success: false,
                error: "Plan not found",
                conflict: false,
                planId: planId,
                updatedAt: new Date(),
                serverUpdatedAt: new Date(),
            };
        }

        const currentUpdatedAt = currentPlan[0].updatedAt;

        // Check for conflicts
        if (
            currentUpdatedAt.toISOString() !== lastKnownUpdatedAt.toISOString()
        ) {
            return {
                success: false,
                error: "Plan has been modified since last fetch",
                conflict: true,
                serverUpdatedAt: currentUpdatedAt,
                planId: planId,
                updatedAt: currentUpdatedAt,
            };
        }

        const now = new Date();

        // Use a transaction for atomicity
        return await db.transaction(async (tx) => {
            // Process deletions first
            if (changes.deleted.exercises.length > 0) {
                await tx
                    .delete(ExercisePlanExercises)
                    .where(
                        inArray(
                            ExercisePlanExercises.planExerciseId,
                            changes.deleted.exercises
                        )
                    );
            }

            if (changes.deleted.sessions.length > 0) {
                await tx
                    .delete(Sessions)
                    .where(
                        inArray(Sessions.sessionId, changes.deleted.sessions)
                    );
            }

            if (changes.deleted.phases.length > 0) {
                await tx
                    .delete(Phases)
                    .where(inArray(Phases.phaseId, changes.deleted.phases));
            }

            // Process updates
            for (const phaseUpdate of changes.updated.phases) {
                const updateData: any = {};
                if (phaseUpdate.changes.name !== undefined) {
                    updateData.phaseName = phaseUpdate.changes.name;
                }
                if (phaseUpdate.changes.isActive !== undefined) {
                    updateData.isActive = phaseUpdate.changes.isActive;
                }
                if (phaseUpdate.changes.orderNumber !== undefined) {
                    updateData.orderNumber = phaseUpdate.changes.orderNumber;
                }

                if (Object.keys(updateData).length > 0) {
                    await tx
                        .update(Phases)
                        .set(updateData)
                        .where(eq(Phases.phaseId, phaseUpdate.id));
                }
            }

            for (const sessionUpdate of changes.updated.sessions) {
                const updateData: any = {};
                if (sessionUpdate.changes.name !== undefined) {
                    updateData.sessionName = sessionUpdate.changes.name;
                }
                if (sessionUpdate.changes.orderNumber !== undefined) {
                    updateData.orderNumber = sessionUpdate.changes.orderNumber;
                }
                if (sessionUpdate.changes.sessionTime !== undefined) {
                    updateData.sessionTime = sessionUpdate.changes.sessionTime;
                }

                if (Object.keys(updateData).length > 0) {
                    await tx
                        .update(Sessions)
                        .set(updateData)
                        .where(eq(Sessions.sessionId, sessionUpdate.id));
                }
            }

            for (const exerciseUpdate of changes.updated.exercises) {
                const updateData: any = {};
                if (exerciseUpdate.changes.exerciseId !== undefined) {
                    updateData.exerciseId = exerciseUpdate.changes.exerciseId;
                }
                if (exerciseUpdate.changes.description !== undefined) {
                    updateData.description = exerciseUpdate.changes.description;
                }
                if (exerciseUpdate.changes.motion !== undefined) {
                    updateData.motion = exerciseUpdate.changes.motion;
                }
                if (exerciseUpdate.changes.targetArea !== undefined) {
                    updateData.targetArea = exerciseUpdate.changes.targetArea;
                }
                if (exerciseUpdate.changes.setsMin !== undefined) {
                    updateData.setsMin = exerciseUpdate.changes.setsMin;
                }
                if (exerciseUpdate.changes.setsMax !== undefined) {
                    updateData.setsMax = exerciseUpdate.changes.setsMax;
                }
                if (exerciseUpdate.changes.repsMin !== undefined) {
                    updateData.repsMin = exerciseUpdate.changes.repsMin;
                }
                if (exerciseUpdate.changes.repsMax !== undefined) {
                    updateData.repsMax = exerciseUpdate.changes.repsMax;
                }
                if (exerciseUpdate.changes.tempo !== undefined) {
                    updateData.tempo = exerciseUpdate.changes.tempo;
                }
                if (exerciseUpdate.changes.restMin !== undefined) {
                    updateData.restMin = exerciseUpdate.changes.restMin;
                }
                if (exerciseUpdate.changes.restMax !== undefined) {
                    updateData.restMax = exerciseUpdate.changes.restMax;
                }
                if (exerciseUpdate.changes.customizations !== undefined) {
                    updateData.customizations =
                        exerciseUpdate.changes.customizations;
                }
                if (exerciseUpdate.changes.notes !== undefined) {
                    updateData.notes = exerciseUpdate.changes.notes;
                }
                if (exerciseUpdate.changes.exerciseOrder !== undefined) {
                    updateData.exerciseOrder =
                        exerciseUpdate.changes.exerciseOrder;
                }

                if (Object.keys(updateData).length > 0) {
                    await tx
                        .update(ExercisePlanExercises)
                        .set(updateData)
                        .where(
                            eq(
                                ExercisePlanExercises.planExerciseId,
                                exerciseUpdate.id
                            )
                        );
                }
            }

            // Process creations
            if (changes.created.phases.length > 0) {
                const phasesToInsert = changes.created.phases.map((phase) => ({
                    phaseId: phase.id,
                    planId: planId,
                    phaseName: phase.name,
                    orderNumber: phase.orderNumber,
                    isActive: phase.isActive,
                }));

                await tx.insert(Phases).values(phasesToInsert);
            }

            if (changes.created.sessions.length > 0) {
                const sessionsToInsert = changes.created.sessions.map(
                    (session) => ({
                        sessionId: session.id,
                        phaseId: session.phaseId,
                        sessionName: session.name,
                        orderNumber: session.orderNumber,
                        sessionTime: session.sessionTime || 0,
                    })
                );

                await tx.insert(Sessions).values(sessionsToInsert);
            }

            if (changes.created.exercises.length > 0) {
                const exercisesToInsert = changes.created.exercises.map(
                    (exercise) => ({
                        planExerciseId: exercise.id,
                        sessionId: exercise.sessionId,
                        exerciseId: exercise.exerciseId,
                        description: exercise.description,
                        motion: exercise.motion,
                        targetArea: exercise.targetArea,
                        setsMin: exercise.setsMin,
                        setsMax: exercise.setsMax,
                        repsMin: exercise.repsMin,
                        repsMax: exercise.repsMax,
                        tempo: exercise.tempo,
                        restMin: exercise.restMin,
                        restMax: exercise.restMax,
                        customizations: exercise.customizations,
                        notes: exercise.notes,
                        exerciseOrder: exercise.exerciseOrder,
                    })
                );

                // Insert in chunks to avoid query size limits
                const chunkSize = 100;
                for (let i = 0; i < exercisesToInsert.length; i += chunkSize) {
                    const chunk = exercisesToInsert.slice(i, i + chunkSize);
                    await tx.insert(ExercisePlanExercises).values(chunk);
                }
            }

            // Update the plan's updatedAt timestamp
            await tx
                .update(ExercisePlans)
                .set({ updatedAt: now })
                .where(eq(ExercisePlans.planId, planId));

            return {
                success: true,
                planId: planId,
                updatedAt: now,
                conflict: false,
                error: undefined,
                serverUpdatedAt: now,
            };
        });
    } catch (error) {
        console.error("Error applying workout plan changes:", error);
        return {
            success: false,
            error: "Failed to apply workout plan changes",
            conflict: false,
            planId: "",
            updatedAt: new Date(),
            serverUpdatedAt: new Date(),
        };
    }
}

/**
 * Creates a new workout plan for a client
 * Worker-compatible version without Next.js dependencies
 */
export async function createWorkoutPlanWorker(
    clientId: string,
    trainerId: string,
    planData: {
        phases: Phase[];
    }
): Promise<WorkoutPlanActionResponse> {
    try {
        const planId = uuidv4();
        const now = new Date();

        // Prepare all data structures before transaction
        const phasesToInsert: {
            phaseId: string;
            planId: string;
            phaseName: string;
            orderNumber: number;
            isActive: boolean;
        }[] = [];

        const sessionsToInsert: {
            sessionId: string;
            phaseId: string;
            sessionName: string;
            orderNumber: number;
            sessionTime: number | null;
        }[] = [];

        const exercisesToInsert: {
            planExerciseId: string;
            sessionId: string;
            exerciseId: string;
            description: string;
            motion: string;
            targetArea: string;
            setsMin?: string;
            setsMax?: string;
            repsMin?: string;
            repsMax?: string;
            tempo?: string;
            restMin?: string;
            restMax?: string;
            customizations?: string;
            notes?: string;
            exerciseOrder?: number;
        }[] = [];

        // Process phases, sessions, and exercises
        for (const phase of planData.phases) {
            phasesToInsert.push({
                phaseId: phase.id,
                planId: planId,
                phaseName: phase.name,
                orderNumber: phase.orderNumber,
                isActive: phase.isActive,
            });

            for (const session of phase.sessions) {
                sessionsToInsert.push({
                    sessionId: session.id,
                    phaseId: phase.id,
                    sessionName: session.name,
                    orderNumber: session.orderNumber || 0,
                    sessionTime: session.duration || 0,
                });

                for (const exercise of session.exercises) {
                    exercisesToInsert.push({
                        planExerciseId: exercise.id,
                        sessionId: session.id,
                        exerciseId: exercise.exerciseId,
                        description: exercise.description,
                        motion: exercise.motion,
                        targetArea: exercise.targetArea,
                        setsMin: exercise.setsMin,
                        setsMax: exercise.setsMax,
                        repsMin: exercise.repsMin,
                        repsMax: exercise.repsMax,
                        tempo: exercise.tempo,
                        restMin: exercise.restMin,
                        restMax: exercise.restMax,
                        customizations: exercise.customizations,
                        notes: exercise.notes,
                        exerciseOrder: 0, // Default order
                    });
                }
            }
        }

        return await db.transaction(async (tx) => {
            // Insert the plan
            await tx.insert(ExercisePlans).values({
                planId: planId,
                planName: "Workout Plan",
                createdByUserId: trainerId,
                assignedToUserId: clientId,
                createdDate: now,
                updatedAt: now,
                isActive: true,
            });

            // Insert phases
            if (phasesToInsert.length > 0) {
                await tx.insert(Phases).values(phasesToInsert);
            }

            // Insert sessions
            if (sessionsToInsert.length > 0) {
                await tx.insert(Sessions).values(sessionsToInsert);
            }

            // Insert exercises in chunks
            if (exercisesToInsert.length > 0) {
                const chunkSize = 100;
                for (let i = 0; i < exercisesToInsert.length; i += chunkSize) {
                    const chunk = exercisesToInsert.slice(i, i + chunkSize);
                    await tx.insert(ExercisePlanExercises).values(chunk);
                }
            }

            return {
                success: true,
                planId: planId,
                updatedAt: now,
                conflict: false,
                error: undefined,
                serverUpdatedAt: now,
            };
        });
    } catch (error) {
        console.error("Error creating workout plan:", error);
        return {
            success: false,
            error: "Failed to create workout plan",
            conflict: false,
            planId: "",
            updatedAt: new Date(),
            serverUpdatedAt: new Date(),
        };
    }
}

/**
 * Updates a workout plan with optimistic concurrency control
 * Worker-compatible version without Next.js dependencies
 */
export async function updateWorkoutPlanWorker(
    planId: string | undefined,
    lastKnownUpdatedAt: Date | undefined,
    planData: {
        phases: Phase[];
        clientId?: string;
        trainerId?: string;
    }
): Promise<WorkoutPlanActionResponse> {
    try {
        // Case 1: This is a new plan being created
        if (!planId || !lastKnownUpdatedAt) {
            if (!planData.clientId || !planData.trainerId) {
                return {
                    success: false,
                    error: "Client ID and Trainer ID are required for creating a new plan",
                    conflict: false,
                    planId: "",
                    updatedAt: new Date(),
                    serverUpdatedAt: new Date(),
                };
            }

            return await createWorkoutPlanWorker(
                planData.clientId,
                planData.trainerId,
                planData
            );
        }

        // Case 2: This is an update to an existing plan
        // Check if the plan has been modified since the client last fetched it
        const currentPlan = await db
            .select({ updatedAt: ExercisePlans.updatedAt })
            .from(ExercisePlans)
            .where(eq(ExercisePlans.planId, planId))
            .limit(1);

        if (currentPlan.length === 0) {
            return {
                success: false,
                error: "Plan not found",
                conflict: false,
                planId: planId,
                updatedAt: new Date(),
                serverUpdatedAt: new Date(),
            };
        }

        const serverUpdatedAt = currentPlan[0].updatedAt;

        // Check for conflicts
        if (
            serverUpdatedAt.toISOString() !== lastKnownUpdatedAt.toISOString()
        ) {
            return {
                success: false,
                error: "Plan has been modified by another user",
                conflict: true,
                serverUpdatedAt: serverUpdatedAt,
                planId: planId,
                updatedAt: serverUpdatedAt,
            };
        }

        // For full plan updates, we'll use the existing applyWorkoutPlanChangesWorker
        // but first we need to convert the full plan data to changes
        // This is a simplified approach - in practice, you'd want to diff against current state
        const changes: WorkoutPlanChanges = {
            created: {
                phases: planData.phases.map((phase) => ({
                    id: phase.id,
                    name: phase.name,
                    orderNumber: phase.orderNumber,
                    isActive: phase.isActive,
                    isExpanded: phase.isExpanded,
                })),
                sessions: planData.phases.flatMap((phase) =>
                    phase.sessions.map((session) => ({
                        id: session.id,
                        name: session.name,
                        phaseId: phase.id,
                        orderNumber: session.orderNumber || 0,
                        sessionTime: session.duration || 0,
                        isExpanded: session.isExpanded,
                    }))
                ),
                exercises: planData.phases.flatMap((phase) =>
                    phase.sessions.flatMap((session) =>
                        session.exercises.map((exercise) => ({
                            id: exercise.id,
                            sessionId: session.id,
                            exerciseId: exercise.exerciseId,
                            description: exercise.description,
                            motion: exercise.motion,
                            targetArea: exercise.targetArea,
                            setsMin: exercise.setsMin,
                            setsMax: exercise.setsMax,
                            repsMin: exercise.repsMin,
                            repsMax: exercise.repsMax,
                            tempo: exercise.tempo,
                            restMin: exercise.restMin,
                            restMax: exercise.restMax,
                            customizations: exercise.customizations,
                            notes: exercise.notes,
                            exerciseOrder: 0,
                        }))
                    )
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

        return await applyWorkoutPlanChangesWorker(
            planId,
            lastKnownUpdatedAt,
            changes
        );
    } catch (error) {
        console.error("Error updating workout plan:", error);
        return {
            success: false,
            error: "Failed to update workout plan",
            conflict: false,
            planId: "",
            updatedAt: new Date(),
            serverUpdatedAt: new Date(),
        };
    }
}
