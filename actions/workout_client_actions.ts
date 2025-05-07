"use server";
import {
    WorkoutPlanResponse,
    WorkoutPlanActionResponse,
} from "@/components/workout-planning/types";
import {
    ExercisePlans,
    Phases,
    Sessions,
    ExercisePlanExercises,
    Exercises,
} from "@/db/schemas";
import { db } from "@/db/xata";
import { requireTrainerOrAdmin } from "@/lib/auth-utils";
import { or, eq, and, not } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getWorkoutPlanByClientId(
    clientId: string
): Promise<WorkoutPlanResponse | []> {
    await requireTrainerOrAdmin();
    // Fetch the plan first to ensure we return something even if there are no phases/sessions/exercises
    const plan = await db
        .select({
            planId: ExercisePlans.planId,
            updatedAt: ExercisePlans.updatedAt,
        })
        .from(ExercisePlans)
        .where(or(eq(ExercisePlans.assignedToUserId, clientId)))
        .limit(1); // Assuming one active plan per client for simplicity, adjust if needed

    if (!plan.length) {
        return []; // No plan found for this client
    }

    const planId = plan[0].planId;
    const planUpdatedAt = plan[0].updatedAt;

    // Now fetch the full structure using LEFT JOINs starting from the plan
    const rows = await db
        .select({
            planId: ExercisePlans.planId,
            planUpdatedAt: ExercisePlans.updatedAt,
            phaseId: Phases.phaseId,
            phaseName: Phases.phaseName,
            phaseIsActive: Phases.isActive,
            phaseOrder: Phases.orderNumber,
            sessionId: Sessions.sessionId,
            sessionName: Sessions.sessionName,
            sessionTime: Sessions.sessionTime,
            sessionOrder: Sessions.orderNumber,
            planExerciseId: ExercisePlanExercises.planExerciseId, // Renamed from exerciseId for clarity
            exerciseOrder: ExercisePlanExercises.exerciseOrder,
            setOrderMarker: ExercisePlanExercises.setOrderMarker,
            motion: ExercisePlanExercises.motion,
            targetArea: ExercisePlanExercises.targetArea,
            exerciseId: ExercisePlanExercises.exerciseId,
            exerciseName: Exercises.exerciseName, // Renamed from description
            tut: ExercisePlanExercises.tut,
            tempo: ExercisePlanExercises.tempo,
            customizations: ExercisePlanExercises.customizations,
            setsMin: ExercisePlanExercises.setsMin,
            setsMax: ExercisePlanExercises.setsMax,
            repsMin: ExercisePlanExercises.repsMin,
            repsMax: ExercisePlanExercises.repsMax,
            restMin: ExercisePlanExercises.restMin,
            restMax: ExercisePlanExercises.restMax,
            notes: ExercisePlanExercises.notes, // Added notes
        })
        .from(ExercisePlans)
        .leftJoin(Phases, eq(Phases.planId, ExercisePlans.planId))
        .leftJoin(Sessions, eq(Sessions.phaseId, Phases.phaseId))
        .leftJoin(
            ExercisePlanExercises,
            eq(ExercisePlanExercises.sessionId, Sessions.sessionId)
        )
        .leftJoin(
            Exercises,
            eq(ExercisePlanExercises.exerciseId, Exercises.exerciseId)
        ) // Join Exercises based on the FK in ExercisePlanExercises
        .where(eq(ExercisePlans.planId, planId)) // Filter by the specific plan ID found earlier
        .orderBy(
            Phases.orderNumber,
            Sessions.orderNumber,
            ExercisePlanExercises.exerciseOrder
        );

    // If rows is empty after the join, it means the plan exists but has no phases.
    // We still need to return the basic plan structure.
    if (!rows.length || rows[0].phaseId === null) {
        // Check if the first row indicates no phases joined
        return {
            planId: planId,
            updatedAt: planUpdatedAt,
            phases: [], // Return empty phases array
        };
    }

    // Group into phases -> sessions -> exercises
    const phasesMap = new Map<
        string,
        {
            id: string;
            name: string;
            isActive: boolean;
            isExpanded: boolean;
            sessions: Array<{
                id: string;
                name: string;
                duration: number | null;
                isExpanded: boolean;
                exercises: Array<{
                    id: string;
                    order: string;
                    motion: string | null;
                    targetArea: string | null;
                    exerciseId: string | null;
                    description: string | null;
                    tut?: string;
                    tempo?: string;
                    customizations?: string;
                    additionalInfo?: string;
                    setsMin?: string;
                    setsMax?: string;
                    repsMin?: string;
                    repsMax?: string;
                    restMin?: string;
                    restMax?: string;
                    notes?: string;
                }>;
            }>;
        }
    >();

    for (const row of rows) {
        // If phaseId is null, skip (shouldn't happen with the check above, but safe)
        if (!row.phaseId || !row.phaseName) continue;

        // Initialize phase
        let phase = phasesMap.get(row.phaseId);
        if (!phase) {
            phase = {
                id: row.phaseId,
                name: row.phaseName,
                isActive: row.phaseIsActive ?? false,
                isExpanded: true, // Default to expanded
                sessions: [],
            };
            phasesMap.set(row.phaseId, phase);
        }

        // If sessionId is null, it means the phase has no sessions, so skip session/exercise processing for this row
        if (!row.sessionId || !row.sessionName) continue;

        // Initialize session
        let session = phase.sessions.find(
            (s: { id: string }) => s.id === row.sessionId
        );
        if (!session) {
            session = {
                id: row.sessionId,
                name: row.sessionName,
                duration: row.sessionTime, // Use sessionTime directly
                isExpanded: true, // Default to expanded
                exercises: [],
            };
            phase.sessions.push(session);
        }

        // If planExerciseId is null, it means the session has no exercises, so skip exercise processing for this row
        if (!row.planExerciseId || !row.exerciseName) continue;

        // Add exercise with all fields, handling potential nulls from LEFT JOIN
        session.exercises.push({
            id: row.planExerciseId,
            order:
                row.setOrderMarker ??
                (row.exerciseOrder != null ? String(row.exerciseOrder) : ""),
            motion: row.motion,
            targetArea: row.targetArea,
            exerciseId: row.exerciseId,
            description: row.exerciseName, // Use exerciseName from Exercises table
            tut: row.tut != null ? String(row.tut) : undefined,
            tempo: row.tempo ?? undefined,
            customizations: row.customizations ?? undefined,
            additionalInfo: row.customizations ?? undefined, // Map customizations to additionalInfo for frontend
            setsMin: row.setsMin != null ? String(row.setsMin) : undefined,
            setsMax: row.setsMax != null ? String(row.setsMax) : undefined,
            repsMin: row.repsMin != null ? String(row.repsMin) : undefined,
            repsMax: row.repsMax != null ? String(row.repsMax) : undefined,
            restMin: row.restMin != null ? String(row.restMin) : undefined,
            restMax: row.restMax != null ? String(row.restMax) : undefined,
            notes: row.notes ?? undefined, // Added notes
        });
    }

    // console.log(
    //     "[GETTING WORKOUT PLAN BY ID : ",
    //     clientId,
    //     "] - ",
    //     JSON.stringify(Array.from(phasesMap.values()), null, 2)
    // );
    // Return the structured plan data
    return {
        planId: planId,
        updatedAt: planUpdatedAt,
        phases: Array.from(phasesMap.values()),
    };
}
/**
 * Updates a phase's activation status with optimistic concurrency control
 * @param phaseId The ID of the phase to update
 * @param isActive Whether the phase should be active
 * @param lastKnownUpdatedAt Optional parameter for concurrency control
 * @returns Success status and error message if applicable
 */

export async function updatePhaseActivation(
    phaseId: string,
    isActive: boolean,
    lastKnownUpdatedAt?: Date // Optional parameter for concurrency control
): Promise<WorkoutPlanActionResponse> {
    try {
        // First get the planId for this phase
        const phase = await db
            .select({ planId: Phases.planId })
            .from(Phases)
            .where(eq(Phases.phaseId, phaseId))
            .limit(1);

        if (!phase.length) {
            return {
                success: false,
                error: "Phase not found",
                conflict: false,
                planId: "",
                updatedAt: new Date(),
                serverUpdatedAt: new Date(),
            };
        }

        const planId = phase[0].planId;

        // If lastKnownUpdatedAt is provided, check for conflicts
        if (lastKnownUpdatedAt) {
            const currentPlan = await db
                .select({ updatedAt: ExercisePlans.updatedAt })
                .from(ExercisePlans)
                .where(eq(ExercisePlans.planId, planId))
                .limit(1);

            if (
                currentPlan.length &&
                currentPlan[0].updatedAt.toISOString() !==
                    lastKnownUpdatedAt.toISOString()
            ) {
                return {
                    success: false,
                    error: "Plan has been modified since last fetch",
                    conflict: true,
                    serverUpdatedAt: currentPlan[0].updatedAt,
                    planId: planId,
                    updatedAt: currentPlan[0].updatedAt,
                };
            }
        }

        // Use a transaction for atomicity
        return await db.transaction(async (tx) => {
            const now = new Date();

            // Update the phase's active status in the database
            await tx
                .update(Phases)
                .set({ isActive })
                .where(eq(Phases.phaseId, phaseId));

            // If activating this phase, deactivate all other phases in the same plan
            if (isActive) {
                // Deactivate all other phases in this plan
                await tx
                    .update(Phases)
                    .set({ isActive: false })
                    .where(
                        and(
                            eq(Phases.planId, planId),
                            not(eq(Phases.phaseId, phaseId))
                        )
                    );
            }

            // Update the plan's updatedAt timestamp to reflect the change
            await tx
                .update(ExercisePlans)
                .set({ updatedAt: now })
                .where(eq(ExercisePlans.planId, planId));

            // Get the client ID associated with this plan
            const plan = await tx
                .select({ assignedToUserId: ExercisePlans.assignedToUserId })
                .from(ExercisePlans)
                .where(eq(ExercisePlans.planId, planId))
                .limit(1);

            if (plan.length && plan[0].assignedToUserId) {
                // Invalidate the client cache
                const clientId = plan[0].assignedToUserId;
                console.log(`Invalidating cache for client: ${clientId}`);
                // Force a complete revalidation of the client page to trigger refetches
                revalidatePath(`/clients/${clientId}`, "layout");
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
        console.error("Error updating phase activation:", error);
        return {
            success: false,
            error: "Failed to update phase activation",
            conflict: false,
            planId: "",
            updatedAt: new Date(),
            serverUpdatedAt: new Date(),
        };
    }
}
/**
 * Updates the order of sessions within a phase with optimistic concurrency control
 * @param phaseId The ID of the phase containing the sessions
 * @param sessionIds An array of session IDs in the desired order
 * @param lastKnownUpdatedAt Optional parameter for concurrency control
 * @returns Success status and error message if applicable
 */

export async function updateSessionOrder(
    phaseId: string,
    sessionIds: string[],
    lastKnownUpdatedAt?: Date // Optional parameter for concurrency control
): Promise<WorkoutPlanActionResponse> {
    try {
        // Get the plan ID from the phase
        const phase = await db
            .select({
                planId: Phases.planId,
            })
            .from(Phases)
            .where(eq(Phases.phaseId, phaseId))
            .limit(1);

        if (!phase.length) {
            return {
                success: false,
                error: "Phase not found",
                conflict: false,
                planId: "",
                updatedAt: new Date(),
                serverUpdatedAt: new Date(),
            };
        }

        const planId = phase[0].planId;

        // If lastKnownUpdatedAt is provided, check for conflicts
        if (lastKnownUpdatedAt) {
            const currentPlan = await db
                .select({ updatedAt: ExercisePlans.updatedAt })
                .from(ExercisePlans)
                .where(eq(ExercisePlans.planId, planId))
                .limit(1);

            if (
                !currentPlan.length || // Plan deleted?
                currentPlan[0].updatedAt.toISOString() !==
                    lastKnownUpdatedAt.toISOString()
            ) {
                const serverTime = currentPlan.length
                    ? currentPlan[0].updatedAt
                    : new Date();
                return {
                    success: false,
                    error: "Plan has been modified since last fetch",
                    conflict: true,
                    serverUpdatedAt: serverTime,
                    planId: planId,
                    updatedAt: serverTime,
                };
            }
        }

        // Use a transaction for atomicity
        return await db.transaction(async (tx) => {
            const now = new Date();

            // Update the orderNumber for each session based on its index in the array
            for (let i = 0; i < sessionIds.length; i++) {
                await tx
                    .update(Sessions)
                    .set({ orderNumber: i })
                    .where(eq(Sessions.sessionId, sessionIds[i]));
                // We assume the sessionIds provided belong to the correct phaseId
                // Add .where(eq(Sessions.phaseId, phaseId)) if extra safety needed
            }

            // Update the plan's updatedAt timestamp to reflect the change
            await tx
                .update(ExercisePlans)
                .set({ updatedAt: now })
                .where(eq(ExercisePlans.planId, planId));

            // Get the client ID associated with this plan for cache revalidation
            const planDetails = await tx
                .select({ assignedToUserId: ExercisePlans.assignedToUserId })
                .from(ExercisePlans)
                .where(eq(ExercisePlans.planId, planId))
                .limit(1);

            if (planDetails.length && planDetails[0].assignedToUserId) {
                const clientId = planDetails[0].assignedToUserId;
                console.log(
                    `Invalidating cache for client due to session reorder: ${clientId}`
                );
                // Force a complete revalidation of the client page to trigger refetches
                revalidatePath(`/clients/${clientId}`, "layout");
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
        console.error("Error updating session order:", error);
        // Attempt to find planId even in case of error for better response context
        let planId = "";
        try {
            const phase = await db
                .select({ planId: Phases.planId })
                .from(Phases)
                .where(eq(Phases.phaseId, phaseId))
                .limit(1);
            if (phase.length) planId = phase[0].planId;
        } catch {
            /* ignore */
        }

        return {
            success: false,
            error: "Failed to update session order",
            conflict: false,
            planId: planId, // Include planId if found
            updatedAt: new Date(),
            serverUpdatedAt: new Date(),
        };
    }
}
