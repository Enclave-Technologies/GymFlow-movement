"use server";
import { Phase, Session } from "@/components/workout-planning/types";
import {
    SelectPhase,
    Phases,
    ExercisePlans,
    Sessions,
    ExercisePlanExercises,
} from "@/db/schemas";
import { db } from "@/db/xata";
import { eq } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";

/**
 * Creates a new phase in the database
 * @param phaseData - The phase data to persist
 * @returns Object with success status and the created phase or error message
 */

export async function persistNewPhase(phaseData: {
    id: string;
    name: string;
    planId?: string;
    clientId?: string; // Added clientId for creating a plan if needed
    trainerId?: string;
    orderNumber: number;
    isActive: boolean;
}): Promise<{
    success: boolean;
    phase?: SelectPhase;
    planId?: string;
    error?: string;
    serverUpdatedAt?: string;
}> {
    noStore();

    try {
        let planId = phaseData.planId;

        // If no planId is provided but clientId is, create a new plan
        if (!planId && phaseData.clientId && phaseData.trainerId) {
            const planResult = await createEmptyWorkoutPlan(
                phaseData.clientId,
                phaseData.trainerId
            );

            if (!planResult.success || !planResult.planId) {
                return {
                    success: false,
                    error: planResult.error || "Failed to create workout plan",
                };
            }

            planId = planResult.planId;
        } else if (!planId) {
            return {
                success: false,
                error: "Either planId or clientId must be provided",
            };
        }

        const confirmedPlanId = planId!;

        // Insert the phase into the database
        const result = await db
            .insert(Phases)
            .values({
                phaseId: phaseData.id,
                planId: confirmedPlanId as string,
                phaseName: phaseData.name,
                orderNumber: phaseData.orderNumber,
                isActive: phaseData.isActive,
            })
            .returning();

        if (!result || result.length === 0) {
            return {
                success: false,
                error: "Failed to persist phase",
            };
        }

        // Update the plan's updatedAt timestamp
        const planUpdate = await db
            .update(ExercisePlans)
            .set({ updatedAt: new Date() })
            .where(eq(ExercisePlans.planId, confirmedPlanId as string))
            .returning({ updatedAt: ExercisePlans.updatedAt });

        let serverUpdatedAt;
        if (planUpdate && planUpdate.length > 0) {
            serverUpdatedAt = planUpdate[0].updatedAt?.toISOString();
        }

        return {
            success: true,
            phase: result[0],
            planId: confirmedPlanId,
            serverUpdatedAt,
        };
    } catch (error) {
        console.error("Error persisting new phase:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Unknown error occurred",
        };
    }
}
/**
 * Creates a new workout plan for a client
 * @param clientId The ID of the client to create the plan for
 * @returns Object with success status, plan ID, and updatedAt timestamp
 */

export async function createEmptyWorkoutPlan(
    clientId: string,
    trainerId: string
): Promise<{
    success: boolean;
    planId?: string;
    updatedAt?: Date;
    error?: string;
}> {
    noStore();

    try {
        const planId = crypto.randomUUID();
        const now = new Date();

        // Insert the plan into the database
        const result = await db
            .insert(ExercisePlans)
            .values({
                planId: planId,
                planName: "Workout Plan", // Default name
                createdByUserId: trainerId,
                assignedToUserId: clientId,
                createdDate: now,
                updatedAt: now,
                isActive: true,
            })
            .returning();

        if (!result || result.length === 0) {
            return {
                success: false,
                error: "Failed to create workout plan",
            };
        }

        return {
            success: true,
            planId: planId,
            updatedAt: now,
        };
    } catch (error) {
        console.error("Error creating workout plan:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Unknown error occurred",
        };
    }
}
/**
 * Persists a duplicated phase with all its sessions and exercises
 */

export async function persistDuplicatedPhase(data: {
    phase: Phase;
    sessions: Session[];
    planId?: string | null;
}): Promise<{
    success: boolean;
    error?: string;
    serverUpdatedAt?: string;
}> {
    noStore();

    try {
        // Validate required data
        if (!data.phase || !data.phase.id || !data.planId) {
            return {
                success: false,
                error: "Missing required phase data or plan ID",
            };
        }

        // Start a transaction to ensure all operations succeed or fail together
        return await db.transaction(async (tx) => {
            // 1. Insert the new phase
            await tx.insert(Phases).values({
                phaseId: data.phase.id,
                planId: data.planId as string, // Cast to string to fix TypeScript error
                phaseName: data.phase.name,
                orderNumber: data.phase.orderNumber || 0,
                isActive: data.phase.isActive || false,
            });

            // 2. Insert all sessions
            if (data.sessions.length > 0) {
                await tx.insert(Sessions).values(
                    data.sessions.map((session) => ({
                        sessionId: session.id,
                        phaseId: data.phase.id,
                        sessionName: session.name,
                        orderNumber: session.orderNumber || 0,
                        sessionTime: session.duration || 0,
                    }))
                );

                // 3. Insert all exercises
                const allExercises = data.sessions.flatMap((session) =>
                    session.exercises.map((exercise) => ({
                        planExerciseId: exercise.id, // CHANGE: Use planExerciseId instead of exerciseId
                        sessionId: session.id, // CHANGE: Use session.id instead of exercise.sessionId
                        exerciseId: exercise.exerciseId, // CHANGE: This should be the reference to Exercises table
                        targetArea: exercise.targetArea || "Unspecified",
                        motion: exercise.motion || "Unspecified",
                        repsMin: exercise.repsMin
                            ? parseInt(exercise.repsMin)
                            : null, // CHANGE: Match DB schema
                        repsMax: exercise.repsMax
                            ? parseInt(exercise.repsMax)
                            : null, // CHANGE: Match DB schema
                        setsMin: exercise.setsMin
                            ? parseInt(exercise.setsMin)
                            : null, // CHANGE: Match DB schema
                        setsMax: exercise.setsMax
                            ? parseInt(exercise.setsMax)
                            : null, // CHANGE: Match DB schema
                        tempo: exercise.tempo || null,
                        tut: exercise.tut ? parseInt(exercise.tut) : null, // CHANGE: Match DB schema
                        restMin: exercise.restMin
                            ? parseInt(exercise.restMin)
                            : null, // CHANGE: Match DB schema
                        restMax: exercise.restMax
                            ? parseInt(exercise.restMax)
                            : null, // CHANGE: Match DB schema
                        exerciseOrder: exercise.order
                            ? parseInt(exercise.order)
                            : null, // CHANGE: Match DB schema
                        setOrderMarker: null, // CHANGE: Match DB schema
                        customizations: exercise.customizations || null,
                        notes: exercise.notes || "",
                    }))
                );

                if (allExercises.length > 0) {
                    await tx.insert(ExercisePlanExercises).values(allExercises);
                }
            }

            // 4. Update the plan's updatedAt timestamp
            const planUpdate = await tx
                .update(ExercisePlans)
                .set({ updatedAt: new Date() })
                .where(eq(ExercisePlans.planId, data.planId as string)) // Cast to string to fix TypeScript error
                .returning({ updatedAt: ExercisePlans.updatedAt });

            let serverUpdatedAt;
            if (planUpdate && planUpdate.length > 0) {
                serverUpdatedAt = planUpdate[0].updatedAt?.toISOString();
            }

            return {
                success: true,
                serverUpdatedAt,
            };
        });
    } catch (error) {
        console.error("Error persisting duplicated phase:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
