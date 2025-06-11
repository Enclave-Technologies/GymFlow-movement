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
} from "@/db/schemas";
import { eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
    WorkoutPlanActionResponse,
    WorkoutPlanChanges,
    Phase,
} from "@/components/workout-planning/types";

/**
 * Apply changes to a workout plan without concurrency control
 * Worker-compatible version without Next.js dependencies
 */
export async function applyWorkoutPlanChangesWorker(
    planId: string,
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

        console.log(
            `Applying changes to plan ${planId} without concurrency control`
        );

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
                const updateData: Record<string, unknown> = {};
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
                const updateData: Record<string, unknown> = {};
                if (sessionUpdate.changes.name !== undefined) {
                    updateData.sessionName = sessionUpdate.changes.name;
                }
                if (sessionUpdate.changes.orderNumber !== undefined) {
                    updateData.orderNumber = sessionUpdate.changes.orderNumber;
                }
                if (sessionUpdate.changes.duration !== undefined) {
                    updateData.sessionTime = sessionUpdate.changes.duration;
                }

                if (Object.keys(updateData).length > 0) {
                    await tx
                        .update(Sessions)
                        .set(updateData)
                        .where(eq(Sessions.sessionId, sessionUpdate.id));
                }
            }

            for (const exerciseUpdate of changes.updated.exercises) {
                const updateData: Record<string, unknown> = {};
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
                    updateData.setsMin =
                        parseInt(exerciseUpdate.changes.setsMin) || 0;
                }
                if (exerciseUpdate.changes.setsMax !== undefined) {
                    updateData.setsMax =
                        parseInt(exerciseUpdate.changes.setsMax) || 0;
                }
                if (exerciseUpdate.changes.repsMin !== undefined) {
                    updateData.repsMin =
                        parseInt(exerciseUpdate.changes.repsMin) || 0;
                }
                if (exerciseUpdate.changes.repsMax !== undefined) {
                    updateData.repsMax =
                        parseInt(exerciseUpdate.changes.repsMax) || 0;
                }
                if (exerciseUpdate.changes.tempo !== undefined) {
                    updateData.tempo = exerciseUpdate.changes.tempo;
                }
                if (exerciseUpdate.changes.restMin !== undefined) {
                    updateData.restMin =
                        parseInt(exerciseUpdate.changes.restMin) || 0;
                }
                if (exerciseUpdate.changes.restMax !== undefined) {
                    updateData.restMax =
                        parseInt(exerciseUpdate.changes.restMax) || 0;
                }
                if (exerciseUpdate.changes.additionalInfo !== undefined) {
                    updateData.customizations =
                        exerciseUpdate.changes.additionalInfo;
                }
                if (exerciseUpdate.changes.notes !== undefined) {
                    updateData.notes = exerciseUpdate.changes.notes;
                }
                if (exerciseUpdate.changes.order !== undefined) {
                    updateData.setOrderMarker = exerciseUpdate.changes.order;
                    updateData.exerciseOrder = 0; // Keep as 0 as requested
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
                    orderNumber: phase.orderNumber || 0,
                    isActive: phase.isActive,
                }));

                await tx.insert(Phases).values(phasesToInsert);
            }

            if (changes.created.sessions.length > 0) {
                const sessionsToInsert = changes.created.sessions.map(
                    (sessionData) => ({
                        sessionId: sessionData.session.id,
                        phaseId: sessionData.phaseId,
                        sessionName: sessionData.session.name,
                        orderNumber: sessionData.session.orderNumber || 0,
                        sessionTime: sessionData.session.duration || 0,
                    })
                );

                await tx.insert(Sessions).values(sessionsToInsert);
            }

            if (changes.created.exercises.length > 0) {
                const exercisesToInsert = changes.created.exercises.map(
                    (exerciseData) => ({
                        planExerciseId: exerciseData.exercise.id,
                        sessionId: exerciseData.sessionId,
                        exerciseId: exerciseData.exercise.exerciseId,
                        motion: exerciseData.exercise.motion || "",
                        targetArea: exerciseData.exercise.targetArea || "",
                        setsMin:
                            parseInt(exerciseData.exercise.setsMin || "0") || 0,
                        setsMax:
                            parseInt(exerciseData.exercise.setsMax || "0") || 0,
                        repsMin:
                            parseInt(exerciseData.exercise.repsMin || "0") || 0,
                        repsMax:
                            parseInt(exerciseData.exercise.repsMax || "0") || 0,
                        tempo: exerciseData.exercise.tempo || "",
                        restMin:
                            parseInt(exerciseData.exercise.restMin || "0") || 0,
                        restMax:
                            parseInt(exerciseData.exercise.restMax || "0") || 0,
                        customizations:
                            exerciseData.exercise.customizations ||
                            exerciseData.exercise.additionalInfo ||
                            "",
                        notes: exerciseData.exercise.notes || "",
                        exerciseOrder: 0, // Redundant field for future use
                        setOrderMarker: exerciseData.exercise.order || "",
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
        planId?: string; // Optional plan ID - if not provided, generates one
        planName?: string; // Optional plan name - defaults to "Workout Plan"
        isActive?: boolean; // Optional active status - defaults to true
    }
): Promise<WorkoutPlanActionResponse> {
    try {
        const planId = planData.planId || uuidv4(); // Use provided ID or generate new one
        const planName = planData.planName || "Workout Plan";
        const isActive =
            planData.isActive !== undefined ? planData.isActive : true;
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
            motion: string;
            targetArea: string;
            setsMin?: number;
            setsMax?: number;
            repsMin?: number;
            repsMax?: number;
            tempo?: string;
            restMin?: number;
            restMax?: number;
            customizations?: string;
            notes?: string;
            exerciseOrder?: number;
            setOrderMarker?: string;
        }[] = [];

        // Process phases, sessions, and exercises
        for (const phase of planData.phases) {
            phasesToInsert.push({
                phaseId: phase.id,
                planId: planId,
                phaseName: phase.name,
                orderNumber: phase.orderNumber || 0,
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
                        motion: exercise.motion || "",
                        targetArea: exercise.targetArea || "",
                        setsMin: parseInt(exercise.setsMin || "0", 10) || 0,
                        setsMax: parseInt(exercise.setsMax || "0", 10) || 0,
                        repsMin: parseInt(exercise.repsMin || "0", 10) || 0,
                        repsMax: parseInt(exercise.repsMax || "0", 10) || 0,
                        tempo: exercise.tempo || "",
                        restMin: parseInt(exercise.restMin || "0", 10) || 0,
                        restMax: parseInt(exercise.restMax || "0", 10) || 0,
                        customizations:
                            exercise.customizations ||
                            exercise.additionalInfo ||
                            "",
                        notes: exercise.notes || "",
                        exerciseOrder: 0, // Redundant field for future use
                        setOrderMarker: exercise.order || "",
                    });
                }
            }
        }

        return await db.transaction(async (tx) => {
            // Insert the plan
            await tx.insert(ExercisePlans).values({
                planId: planId,
                planName: planName,
                createdByUserId: trainerId,
                assignedToUserId: clientId,
                createdDate: now,
                updatedAt: now,
                isActive: isActive,
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
