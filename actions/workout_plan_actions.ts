"use server";

import { db } from "@/db/xata";
import {
    ExercisePlans,
    Phases,
    Sessions,
    ExercisePlanExercises,
    Exercises,
} from "@/db/schemas";
import { eq, or, and, not, inArray } from "drizzle-orm";
import "server-only";
import { v4 as uuidv4 } from "uuid";
import {
    WorkoutPlanActionResponse,
    WorkoutPlanChanges,
} from "@/components/workout-planning/types";
import { revalidatePath } from "next/cache";
import { requireTrainerOrAdmin } from "@/lib/auth-utils";

// Define types for workout plan data
interface ExerciseItem {
    id: string;
    order: string;
    motion: string | null;
    targetArea: string | null;
    exerciseId: string | null;
    description: string | null;
    tut?: string | null;
    tempo?: string | null;
    customizations?: string | null;
    additionalInfo?: string | null; // Added for frontend compatibility
    setsMin?: string | null;
    setsMax?: string | null;
    repsMin?: string | null;
    repsMax?: string | null;
    restMin?: string | null;
    restMax?: string | null;
    notes?: string | null;
}

interface SessionItem {
    id: string;
    name: string;
    duration: number | null;
    isExpanded: boolean;
    exercises: ExerciseItem[];
}

interface PhaseItem {
    id: string;
    name: string;
    isActive: boolean;
    isExpanded: boolean;
    sessions: SessionItem[];
}

interface WorkoutPlanResponse {
    planId: string;
    updatedAt: Date;
    phases: PhaseItem[];
}

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
    const phasesMap = new Map<string, PhaseItem>();

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
        let session = phase.sessions.find((s) => s.id === row.sessionId);
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

interface SessionData {
    name: string;
    exercises?: Array<{
        id: string;
        order: string;
        motion: string;
        targetArea: string;
    }>;
}
interface ExerciseUpdateData {
    id: string;
    motion: string | null;
    targetArea: string | null;
    repsMin: number | null;
    repsMax: number | null;
    setsMin: number | null;
    setsMax: number | null;
    tempo: string | null;
    tut: number | null;
    restMin: number | null;
    restMax: number | null;
    exerciseOrder: number;
    setOrderMarker: string;
    customizations: string | null;
    notes: string;
}

interface ExerciseInsertData {
    planExerciseId: string;
    sessionId: string;
    exerciseId: string;
    motion: string | null;
    targetArea: string | null;
    repsMin: number | null;
    repsMax: number | null;
    setsMin: number | null;
    setsMax: number | null;
    tempo: string | null;
    tut: number | null;
    restMin: number | null;
    restMax: number | null;
    exerciseOrder: number;
    setOrderMarker: string;
    customizations: string | null;
    notes: string;
}

/**
 * Updates a workout plan with optimistic concurrency control
 * @param planId The ID of the plan to update
 * @param lastKnownUpdatedAt The last known updatedAt timestamp from the client
 * @param planData The updated plan data
 * @returns Success status and error message if applicable
 */
export async function updateWorkoutPlan(
    planId: string,
    lastKnownUpdatedAt: Date,
    planData: {
        phases: PhaseItem[];
    }
): Promise<WorkoutPlanActionResponse> {
    const currentTrainer = await requireTrainerOrAdmin();
    try {
        // First, check if the plan has been modified since the client last fetched it
        const currentPlan = await db
            .select({ updatedAt: ExercisePlans.updatedAt })
            .from(ExercisePlans)
            .where(eq(ExercisePlans.planId, planId))
            .limit(1);

        if (!currentPlan.length) {
            return {
                success: false,
                error: "Plan not found",
                conflict: false,
                planId: "",
                updatedAt: new Date(),
                serverUpdatedAt: new Date(),
            };
        }

        const currentUpdatedAt = currentPlan[0].updatedAt;

        // Check for conflicts - compare timestamps
        // Note: Convert to ISO strings for comparison to avoid timezone issues
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

        // --- OPTIMIZATION: Fetch all existing data in one go ---
        // Get all existing phases, sessions, and exercises in a single query per entity type
        const [currentPhases, currentSessions, currentExercises] =
            await Promise.all([
                // Get all phases for this plan
                db
                    .select({ phaseId: Phases.phaseId })
                    .from(Phases)
                    .where(eq(Phases.planId, planId)),

                // Get all sessions for this plan (via phases)
                db
                    .select({
                        sessionId: Sessions.sessionId,
                        phaseId: Sessions.phaseId,
                    })
                    .from(Sessions)
                    .innerJoin(Phases, eq(Sessions.phaseId, Phases.phaseId))
                    .where(eq(Phases.planId, planId)),

                // Get all exercises for this plan (via sessions and phases)
                db
                    .select({
                        planExerciseId: ExercisePlanExercises.planExerciseId,
                        sessionId: ExercisePlanExercises.sessionId,
                    })
                    .from(ExercisePlanExercises)
                    .innerJoin(
                        Sessions,
                        eq(ExercisePlanExercises.sessionId, Sessions.sessionId)
                    )
                    .innerJoin(Phases, eq(Sessions.phaseId, Phases.phaseId))
                    .where(eq(Phases.planId, planId)),
            ]);

        // Extract IDs for comparison
        const currentPhaseIds = currentPhases.map((p) => p.phaseId);
        const currentSessionIds = currentSessions.map((s) => s.sessionId);
        const currentExerciseIds = currentExercises.map(
            (e) => e.planExerciseId
        );

        // Get new structure from planData
        const newPhaseIds = planData.phases.map((p) => p.id);
        const newSessionIds = planData.phases.flatMap((p) =>
            p.sessions.map((s) => s.id)
        );
        const newExerciseIds = planData.phases.flatMap((p) =>
            p.sessions.flatMap((s) => s.exercises.map((e) => e.id))
        );

        // --- OPTIMIZATION: Prepare all data structures before transaction ---
        // Identify items to delete
        const phasesToDelete = currentPhaseIds.filter(
            (id) => !newPhaseIds.includes(id)
        );
        const sessionsToDelete = currentSessionIds.filter(
            (id) => !newSessionIds.includes(id)
        );
        const exercisesToDelete = currentExerciseIds.filter(
            (id) => !newExerciseIds.includes(id)
        );

        // Prepare phase data for batch operations
        const phasesToUpdate: {
            id: string;
            name: string;
            isActive: boolean;
        }[] = [];
        const phasesToInsert: {
            phaseId: string;
            planId: string;
            phaseName: string;
            orderNumber: number;
            isActive: boolean;
        }[] = [];

        // Prepare session data for batch operations
        const sessionsToUpdate: {
            id: string;
            name: string;
            duration: number | null;
        }[] = [];
        const sessionsToInsert: {
            sessionId: string;
            phaseId: string;
            sessionName: string;
            orderNumber: number;
            sessionTime: number | null;
        }[] = [];

        // Prepare exercise data for batch operations

        const exercisesToUpdate: ExerciseUpdateData[] = [];
        const exercisesToInsert: ExerciseInsertData[] = [];

        // Map to store exercise IDs for new exercises
        const exerciseNameToIdMap = new Map<string, string>();

        // No conflict, proceed with update using a transaction
        return await db.transaction(async (tx) => {
            const now = new Date();

            // --- OPTIMIZATION: Fetch exercise IDs for all descriptions at once ---
            // Get all unique exercise descriptions from new exercises
            const uniqueExerciseDescriptions = [
                ...new Set(
                    planData.phases.flatMap((p) =>
                        p.sessions.flatMap((s) =>
                            s.exercises
                                .filter(
                                    (e) =>
                                        e.description &&
                                        !currentExerciseIds.includes(e.id)
                                )
                                .map((e) => e.description)
                        )
                    )
                ),
            ].filter(Boolean) as string[];

            // Fetch all matching exercises in one query
            if (uniqueExerciseDescriptions.length > 0) {
                const exerciseMatches = await tx
                    .select({
                        exerciseId: Exercises.exerciseId,
                        exerciseName: Exercises.exerciseName,
                    })
                    .from(Exercises)
                    .where(
                        inArray(
                            Exercises.exerciseName,
                            uniqueExerciseDescriptions
                        )
                    );

                // Build a map of exercise name to ID for quick lookup
                exerciseMatches.forEach((match) => {
                    exerciseNameToIdMap.set(
                        match.exerciseName,
                        match.exerciseId
                    );
                });

                // Find descriptions not found in the existing exercises
                const missingDescriptions = uniqueExerciseDescriptions.filter(
                    (desc) => !exerciseNameToIdMap.has(desc)
                );

                // Insert missing exercises and update the map
                for (const desc of missingDescriptions) {
                    const newExerciseId = uuidv4();
                    await tx.insert(Exercises).values({
                        exerciseName: desc,
                        uploadedByUserId: currentTrainer?.id ?? "system",
                    });
                    exerciseNameToIdMap.set(desc, newExerciseId);
                }
            }

            // --- OPTIMIZATION: Bulk delete operations ---
            // Delete removed exercises in one operation
            if (exercisesToDelete.length > 0) {
                await tx
                    .delete(ExercisePlanExercises)
                    .where(
                        inArray(
                            ExercisePlanExercises.planExerciseId,
                            exercisesToDelete
                        )
                    );
            }

            // Delete removed sessions in one operation
            if (sessionsToDelete.length > 0) {
                await tx
                    .delete(Sessions)
                    .where(inArray(Sessions.sessionId, sessionsToDelete));
            }

            // Delete removed phases in one operation
            if (phasesToDelete.length > 0) {
                await tx
                    .delete(Phases)
                    .where(inArray(Phases.phaseId, phasesToDelete));
            }

            // Update the plan's updatedAt timestamp
            await tx
                .update(ExercisePlans)
                .set({ updatedAt: now })
                .where(eq(ExercisePlans.planId, planId));

            // --- OPTIMIZATION: Prepare all data for batch operations ---
            // Process phases
            for (
                let phaseIndex = 0;
                phaseIndex < planData.phases.length;
                phaseIndex++
            ) {
                const phase = planData.phases[phaseIndex];

                if (currentPhaseIds.includes(phase.id)) {
                    // Update existing phase
                    phasesToUpdate.push({
                        id: phase.id,
                        name: phase.name,
                        isActive: phase.isActive,
                    });
                } else {
                    // Insert new phase
                    phasesToInsert.push({
                        phaseId: phase.id,
                        planId: planId,
                        phaseName: phase.name,
                        orderNumber: phaseIndex,
                        isActive: phase.isActive,
                    });
                }

                // Process sessions
                for (
                    let sessionIndex = 0;
                    sessionIndex < phase.sessions.length;
                    sessionIndex++
                ) {
                    const session = phase.sessions[sessionIndex];

                    if (currentSessionIds.includes(session.id)) {
                        // Update existing session
                        sessionsToUpdate.push({
                            id: session.id,
                            name: session.name,
                            duration: session.duration,
                        });
                    } else {
                        // Insert new session
                        sessionsToInsert.push({
                            sessionId: session.id,
                            phaseId: phase.id,
                            sessionName: session.name,
                            orderNumber: sessionIndex,
                            sessionTime: session.duration,
                        });
                    }

                    // Process exercises
                    // Sort exercises by their setOrderMarker (order field) using lexicographical ordering
                    const sortedExercises = [...session.exercises].sort(
                        (a, b) => {
                            return a.order.localeCompare(b.order);
                        }
                    );

                    // Prepare exercise data
                    for (let i = 0; i < sortedExercises.length; i++) {
                        const exercise = sortedExercises[i];
                        const exerciseOrder = i; // 0-based index for the sorted exercises

                        // Common exercise data for both update and insert
                        const exerciseData = {
                            motion: exercise.motion ?? null,
                            targetArea: exercise.targetArea ?? null,
                            repsMin:
                                exercise.repsMin !== undefined &&
                                exercise.repsMin !== null &&
                                exercise.repsMin !== ""
                                    ? Number(exercise.repsMin)
                                    : null,
                            repsMax:
                                exercise.repsMax !== undefined &&
                                exercise.repsMax !== null &&
                                exercise.repsMax !== ""
                                    ? Number(exercise.repsMax)
                                    : null,
                            setsMin:
                                exercise.setsMin !== undefined &&
                                exercise.setsMin !== null &&
                                exercise.setsMin !== ""
                                    ? Number(exercise.setsMin)
                                    : null,
                            setsMax:
                                exercise.setsMax !== undefined &&
                                exercise.setsMax !== null &&
                                exercise.setsMax !== ""
                                    ? Number(exercise.setsMax)
                                    : null,
                            tempo: exercise.tempo ?? null,
                            tut:
                                exercise.tut !== undefined &&
                                exercise.tut !== null &&
                                exercise.tut !== ""
                                    ? Number(exercise.tut)
                                    : null,
                            restMin:
                                exercise.restMin !== undefined &&
                                exercise.restMin !== null &&
                                exercise.restMin !== ""
                                    ? Number(exercise.restMin)
                                    : null,
                            restMax:
                                exercise.restMax !== undefined &&
                                exercise.restMax !== null &&
                                exercise.restMax !== ""
                                    ? Number(exercise.restMax)
                                    : null,
                            exerciseOrder: exerciseOrder,
                            setOrderMarker: exercise.order,
                            customizations:
                                exercise.additionalInfo ??
                                exercise.customizations ??
                                null,
                            notes: exercise.notes ?? "",
                        };

                        if (currentExerciseIds.includes(exercise.id)) {
                            // Update existing exercise
                            exercisesToUpdate.push({
                                id: exercise.id,
                                ...exerciseData,
                            });
                        } else {
                            // For new exercises, we don't need to look up exerciseId since we're using the exercise.id directly
                            // The planExerciseId will be a new UUID

                            // Insert new exercise only if exerciseId is not null
                            if (exercise.exerciseId) {
                                exercisesToInsert.push({
                                    planExerciseId: uuidv4(),
                                    sessionId: session.id,
                                    exerciseId: exercise.exerciseId, // Use exerciseId (foreign key) not id (primary key)
                                    ...exerciseData,
                                });
                            } else {
                                console.warn(
                                    `Skipping exercise with null exerciseId: ${exercise.id}`
                                );
                            }
                        }
                    }
                }
            }

            // --- OPTIMIZATION: Execute batch operations ---
            // Batch update phases
            if (phasesToUpdate.length > 0) {
                for (const phase of phasesToUpdate) {
                    await tx
                        .update(Phases)
                        .set({
                            phaseName: phase.name,
                            isActive: phase.isActive,
                        })
                        .where(eq(Phases.phaseId, phase.id));
                }
            }

            // Batch insert phases
            if (phasesToInsert.length > 0) {
                await tx.insert(Phases).values(phasesToInsert);
            }

            // Batch update sessions
            if (sessionsToUpdate.length > 0) {
                for (const session of sessionsToUpdate) {
                    await tx
                        .update(Sessions)
                        .set({
                            sessionName: session.name,
                            sessionTime: session.duration,
                        })
                        .where(eq(Sessions.sessionId, session.id));
                }
            }

            // Batch insert sessions
            if (sessionsToInsert.length > 0) {
                await tx.insert(Sessions).values(sessionsToInsert);
            }

            // Batch update exercises
            if (exercisesToUpdate.length > 0) {
                for (const exercise of exercisesToUpdate) {
                    await tx
                        .update(ExercisePlanExercises)
                        .set({
                            motion: exercise.motion,
                            targetArea: exercise.targetArea,
                            repsMin: exercise.repsMin,
                            repsMax: exercise.repsMax,
                            setsMin: exercise.setsMin,
                            setsMax: exercise.setsMax,
                            tempo: exercise.tempo,
                            tut: exercise.tut,
                            restMin: exercise.restMin,
                            restMax: exercise.restMax,
                            exerciseOrder: exercise.exerciseOrder,
                            setOrderMarker: exercise.setOrderMarker,
                            customizations: exercise.customizations,
                            notes: exercise.notes,
                        })
                        .where(
                            eq(
                                ExercisePlanExercises.planExerciseId,
                                exercise.id
                            )
                        );
                }
            }

            // Batch insert exercises
            if (exercisesToInsert.length > 0) {
                // Split into chunks to avoid potential query size limits
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

/**
 * Creates a new workout plan for a client
 * @param clientId The ID of the client to create the plan for
 * @param planData The plan data containing phases, sessions, and exercises
 * @returns Success status, plan ID, and updatedAt timestamp
 */
export async function createWorkoutPlan(
    clientId: string,
    planData: {
        phases: PhaseItem[];
    }
): Promise<WorkoutPlanActionResponse> {
    try {
        // Create a new plan using a transaction
        const planId = uuidv4();
        const now = new Date();

        // --- OPTIMIZATION: Prepare all data structures before transaction ---
        // Prepare phase data for batch operations
        const phasesToInsert: {
            phaseId: string;
            planId: string;
            phaseName: string;
            orderNumber: number;
            isActive: boolean;
        }[] = [];

        // Prepare session data for batch operations
        const sessionsToInsert: {
            sessionId: string;
            phaseId: string;
            sessionName: string;
            orderNumber: number;
            sessionTime: number | null;
        }[] = [];

        // Prepare exercise data for batch operations
        const exercisesToInsert: ExerciseInsertData[] = [];

        // Collect all unique exercise descriptions for batch lookup
        const uniqueExerciseDescriptions = [
            ...new Set(
                planData.phases.flatMap((p) =>
                    p.sessions.flatMap((s) =>
                        s.exercises
                            .filter((e) => e.description)
                            .map((e) => e.description)
                    )
                )
            ),
        ].filter(Boolean) as string[];

        // --- OPTIMIZATION: Prepare all data for batch operations ---
        // Process phases
        for (
            let phaseIndex = 0;
            phaseIndex < planData.phases.length;
            phaseIndex++
        ) {
            const phase = planData.phases[phaseIndex];

            // Insert new phase
            phasesToInsert.push({
                phaseId: phase.id,
                planId: planId,
                phaseName: phase.name,
                orderNumber: phaseIndex,
                isActive: phase.isActive,
            });

            // Process sessions
            for (
                let sessionIndex = 0;
                sessionIndex < phase.sessions.length;
                sessionIndex++
            ) {
                const session = phase.sessions[sessionIndex];

                // Insert new session
                sessionsToInsert.push({
                    sessionId: session.id,
                    phaseId: phase.id,
                    sessionName: session.name,
                    orderNumber: sessionIndex,
                    sessionTime: session.duration,
                });

                // Process exercises
                // Sort exercises by their setOrderMarker (order field) using lexicographical ordering
                const sortedExercises = [...session.exercises].sort((a, b) => {
                    return a.order.localeCompare(b.order);
                });

                // Prepare exercise data
                for (let i = 0; i < sortedExercises.length; i++) {
                    const exercise = sortedExercises[i];
                    const exerciseOrder = i; // 0-based index for the sorted exercises

                    // Common exercise data - only insert if exerciseId is not null
                    if (exercise.exerciseId) {
                        exercisesToInsert.push({
                            exerciseId: exercise.exerciseId,
                            sessionId: session.id,
                            planExerciseId: uuidv4(), // Generate a valid UUID instead of placeholder
                            motion: exercise.motion ?? null,
                            targetArea: exercise.targetArea ?? null,
                            repsMin:
                                exercise.repsMin !== undefined &&
                                exercise.repsMin !== null &&
                                exercise.repsMin !== ""
                                    ? Number(exercise.repsMin)
                                    : null,
                            repsMax:
                                exercise.repsMax !== undefined &&
                                exercise.repsMax !== null &&
                                exercise.repsMax !== ""
                                    ? Number(exercise.repsMax)
                                    : null,
                            setsMin:
                                exercise.setsMin !== undefined &&
                                exercise.setsMin !== null &&
                                exercise.setsMin !== ""
                                    ? Number(exercise.setsMin)
                                    : null,
                            setsMax:
                                exercise.setsMax !== undefined &&
                                exercise.setsMax !== null &&
                                exercise.setsMax !== ""
                                    ? Number(exercise.setsMax)
                                    : null,
                            tempo: exercise.tempo ?? null,
                            tut:
                                exercise.tut !== undefined &&
                                exercise.tut !== null &&
                                exercise.tut !== ""
                                    ? Number(exercise.tut)
                                    : null,
                            restMin:
                                exercise.restMin !== undefined &&
                                exercise.restMin !== null &&
                                exercise.restMin !== ""
                                    ? Number(exercise.restMin)
                                    : null,
                            restMax:
                                exercise.restMax !== undefined &&
                                exercise.restMax !== null &&
                                exercise.restMax !== ""
                                    ? Number(exercise.restMax)
                                    : null,
                            exerciseOrder: exerciseOrder,
                            setOrderMarker: exercise.order,
                            customizations: exercise.customizations ?? null,
                            notes: exercise.notes ?? "",
                        });
                    }
                }
            }
        }

        return await db.transaction(async (tx) => {
            // Insert the plan into the database
            await tx.insert(ExercisePlans).values({
                planId: planId,
                planName: "Workout Plan", // Default name
                createdByUserId: clientId,
                assignedToUserId: clientId,
                createdDate: now,
                updatedAt: now,
                isActive: true,
            });

            // --- OPTIMIZATION: Fetch exercise IDs for all descriptions at once ---
            const exerciseNameToIdMap = new Map<string, string>();

            if (uniqueExerciseDescriptions.length > 0) {
                const exerciseMatches = await tx
                    .select({
                        exerciseId: Exercises.exerciseId,
                        exerciseName: Exercises.exerciseName,
                    })
                    .from(Exercises)
                    .where(
                        inArray(
                            Exercises.exerciseName,
                            uniqueExerciseDescriptions
                        )
                    );

                // Build a map of exercise name to ID for quick lookup
                exerciseMatches.forEach((match) => {
                    exerciseNameToIdMap.set(
                        match.exerciseName,
                        match.exerciseId
                    );
                });
            }

            // Update exercise IDs based on descriptions
            for (const exercise of exercisesToInsert) {
                // Find the corresponding exercise in the original data to get its description
                const originalExercise = planData.phases
                    .flatMap((p) => p.sessions)
                    .flatMap((s) => s.exercises)
                    .find((e) => e.id === exercise.planExerciseId);

                if (
                    originalExercise?.description &&
                    exerciseNameToIdMap.has(originalExercise.description)
                ) {
                    exercise.exerciseId = exerciseNameToIdMap.get(
                        originalExercise.description
                    )!;
                }
            }

            // --- OPTIMIZATION: Execute batch operations ---
            // Batch insert phases
            if (phasesToInsert.length > 0) {
                await tx.insert(Phases).values(phasesToInsert);
            }

            // Batch insert sessions
            if (sessionsToInsert.length > 0) {
                await tx.insert(Sessions).values(sessionsToInsert);
            }

            // Batch insert exercises
            if (exercisesToInsert.length > 0) {
                // Split into chunks to avoid potential query size limits
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
 * Apply changes to a workout plan with optimistic concurrency control
 * This is an optimized version that only processes the changes instead of the entire plan
 * @param planId The ID of the plan to update
 * @param lastKnownUpdatedAt The last known updatedAt timestamp from the client
 * @param changes The changes to apply to the plan
 * @returns Success status and error message if applicable
 */
export async function applyWorkoutPlanChanges(
    planId: string,
    lastKnownUpdatedAt: Date,
    changes: WorkoutPlanChanges
): Promise<WorkoutPlanActionResponse> {
    // Skip processing if there are no actual changes - fast path return
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
        return {
            success: true,
            planId: planId,
            updatedAt: lastKnownUpdatedAt,
            conflict: false,
            error: undefined,
            serverUpdatedAt: lastKnownUpdatedAt,
        };
    }

    try {
        // First, check if the plan has been modified since the client last fetched it
        // Use a cached promise to avoid redundant DB queries if multiple changes are applied in sequence
        const currentPlanPromise = db
            .select({ updatedAt: ExercisePlans.updatedAt })
            .from(ExercisePlans)
            .where(eq(ExercisePlans.planId, planId))
            .limit(1);

        const currentPlan = await currentPlanPromise;

        if (!currentPlan.length) {
            return {
                success: false,
                error: "Plan not found",
                conflict: false,
                planId: "",
                updatedAt: new Date(),
                serverUpdatedAt: new Date(),
            };
        }

        const currentUpdatedAt = currentPlan[0].updatedAt;

        // Check for conflicts - compare timestamps
        // Note: Convert to ISO strings for comparison to avoid timezone issues
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

        // Prepare all data structures before transaction to minimize transaction time
        const now = new Date();

        // --- OPTIMIZATION: Prepare phase updates ---
        const phaseUpdates = changes.updated.phases.map((phaseUpdate) => ({
            id: phaseUpdate.id,
            phaseName: phaseUpdate.changes.name,
            isActive: phaseUpdate.changes.isActive,
        }));

        // --- OPTIMIZATION: Prepare session updates ---
        const sessionUpdates = changes.updated.sessions.map(
            (sessionUpdate) => ({
                id: sessionUpdate.id,
                sessionName: sessionUpdate.changes.name,
                sessionTime: sessionUpdate.changes.duration,
            })
        );

        // --- OPTIMIZATION: Prepare exercise updates ---
        const exerciseUpdates = changes.updated.exercises
            .map((exerciseUpdate) => {
                // Convert string values to appropriate types
                const repsMin =
                    exerciseUpdate.changes.repsMin !== undefined
                        ? exerciseUpdate.changes.repsMin !== null &&
                          exerciseUpdate.changes.repsMin !== ""
                            ? Number(exerciseUpdate.changes.repsMin)
                            : null
                        : undefined;

                const repsMax =
                    exerciseUpdate.changes.repsMax !== undefined
                        ? exerciseUpdate.changes.repsMax !== null &&
                          exerciseUpdate.changes.repsMax !== ""
                            ? Number(exerciseUpdate.changes.repsMax)
                            : null
                        : undefined;

                const setsMin =
                    exerciseUpdate.changes.setsMin !== undefined
                        ? exerciseUpdate.changes.setsMin !== null &&
                          exerciseUpdate.changes.setsMin !== ""
                            ? Number(exerciseUpdate.changes.setsMin)
                            : null
                        : undefined;

                const setsMax =
                    exerciseUpdate.changes.setsMax !== undefined
                        ? exerciseUpdate.changes.setsMax !== null &&
                          exerciseUpdate.changes.setsMax !== ""
                            ? Number(exerciseUpdate.changes.setsMax)
                            : null
                        : undefined;

                const tut =
                    exerciseUpdate.changes.tut !== undefined
                        ? exerciseUpdate.changes.tut !== null &&
                          exerciseUpdate.changes.tut !== ""
                            ? Number(exerciseUpdate.changes.tut)
                            : null
                        : undefined;

                const restMin =
                    exerciseUpdate.changes.restMin !== undefined
                        ? exerciseUpdate.changes.restMin !== null &&
                          exerciseUpdate.changes.restMin !== ""
                            ? Number(exerciseUpdate.changes.restMin)
                            : null
                        : undefined;

                const restMax =
                    exerciseUpdate.changes.restMax !== undefined
                        ? exerciseUpdate.changes.restMax !== null &&
                          exerciseUpdate.changes.restMax !== ""
                            ? Number(exerciseUpdate.changes.restMax)
                            : null
                        : undefined;

                // Build update object with only the fields that have changed
                const updateFields: Partial<{
                    motion: string | null;
                    targetArea: string | null;
                    setOrderMarker: string;
                    repsMin: number | null;
                    repsMax: number | null;
                    setsMin: number | null;
                    setsMax: number | null;
                    tempo: string | null;
                    tut: number | null;
                    restMin: number | null;
                    restMax: number | null;
                    customizations: string | null;
                    notes: string;
                    id: string;
                }> = { id: exerciseUpdate.id };

                if (exerciseUpdate.changes.motion !== undefined)
                    updateFields.motion = exerciseUpdate.changes.motion;

                if (exerciseUpdate.changes.targetArea !== undefined)
                    updateFields.targetArea = exerciseUpdate.changes.targetArea;

                if (exerciseUpdate.changes.order !== undefined)
                    updateFields.setOrderMarker = exerciseUpdate.changes.order;

                if (repsMin !== undefined) updateFields.repsMin = repsMin;
                if (repsMax !== undefined) updateFields.repsMax = repsMax;
                if (setsMin !== undefined) updateFields.setsMin = setsMin;
                if (setsMax !== undefined) updateFields.setsMax = setsMax;
                if (tut !== undefined) updateFields.tut = tut;
                if (restMin !== undefined) updateFields.restMin = restMin;
                if (restMax !== undefined) updateFields.restMax = restMax;

                if (exerciseUpdate.changes.tempo !== undefined)
                    updateFields.tempo = exerciseUpdate.changes.tempo;

                if (
                    exerciseUpdate.changes.additionalInfo !== undefined ||
                    exerciseUpdate.changes.customizations !== undefined
                )
                    updateFields.customizations =
                        exerciseUpdate.changes.additionalInfo ??
                        exerciseUpdate.changes.customizations;

                if (exerciseUpdate.changes.notes !== undefined)
                    updateFields.notes = exerciseUpdate.changes.notes;

                return updateFields;
            })
            .filter((update) => Object.keys(update).length > 1); // Filter out updates with only ID

        // --- OPTIMIZATION: Prepare phase creations ---
        const phasesToInsert = changes.created.phases.map((phase, index) => ({
            phaseId: phase.id,
            planId: planId,
            phaseName: phase.name,
            orderNumber: index, // Use the index as order number
            isActive: phase.isActive,
        }));

        // --- OPTIMIZATION: Prepare session creations ---
        const sessionsToInsert = changes.created.sessions.map(
            (sessionData, index) => ({
                sessionId: sessionData.session.id,
                phaseId: sessionData.phaseId,
                sessionName: sessionData.session.name,
                orderNumber: index, // Use the index as order number
                sessionTime: sessionData.session.duration,
            })
        );

        // --- OPTIMIZATION: Prepare exercise creations ---
        // Get all unique exercise descriptions for batch lookup
        const uniqueExerciseDescriptions = [
            ...new Set(
                changes.created.exercises
                    .map((e) => e.exercise.description)
                    .filter(Boolean)
            ),
        ] as string[];

        // Use a transaction for atomicity
        return await db.transaction(async (tx) => {
            // --- OPTIMIZATION: Process deletions first ---
            // Delete exercises in bulk
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

            // Delete sessions in bulk
            if (changes.deleted.sessions.length > 0) {
                await tx
                    .delete(Sessions)
                    .where(
                        inArray(Sessions.sessionId, changes.deleted.sessions)
                    );
            }

            // Delete phases in bulk
            if (changes.deleted.phases.length > 0) {
                await tx
                    .delete(Phases)
                    .where(inArray(Phases.phaseId, changes.deleted.phases));
            }

            // --- OPTIMIZATION: Process updates in batches ---
            // Update phases in batches
            if (phaseUpdates.length > 0) {
                for (const phaseUpdate of phaseUpdates) {
                    await tx
                        .update(Phases)
                        .set({
                            phaseName: phaseUpdate.phaseName,
                            isActive: phaseUpdate.isActive,
                        })
                        .where(eq(Phases.phaseId, phaseUpdate.id));
                }
            }

            // Update sessions in batches
            if (sessionUpdates.length > 0) {
                for (const sessionUpdate of sessionUpdates) {
                    await tx
                        .update(Sessions)
                        .set({
                            sessionName: sessionUpdate.sessionName,
                            sessionTime: sessionUpdate.sessionTime,
                        })
                        .where(eq(Sessions.sessionId, sessionUpdate.id));
                }
            }

            // Update exercises in batches - group by common fields for better performance
            if (exerciseUpdates.length > 0) {
                // Group exercises by which fields need updating to use optimized batch updates
                const exerciseUpdatesByFields = new Map<
                    string,
                    Array<{ id: string; [key: string]: unknown }>
                >();

                for (const exerciseUpdate of exerciseUpdates) {
                    const { id, ...updateFields } = exerciseUpdate;
                    if (!id) continue; // Skip if no ID

                    // Create a key based on the fields being updated
                    const updateFieldsKey = Object.keys(updateFields)
                        .sort()
                        .join(",");

                    if (!exerciseUpdatesByFields.has(updateFieldsKey)) {
                        exerciseUpdatesByFields.set(updateFieldsKey, []);
                    }

                    exerciseUpdatesByFields.get(updateFieldsKey)!.push({
                        id,
                        ...updateFields,
                    });
                }

                // Process each group of updates with the same fields
                for (const [, updates] of exerciseUpdatesByFields.entries()) {
                    // For each batch of updates with the same fields
                    const batchSize = 50;
                    for (let i = 0; i < updates.length; i += batchSize) {
                        const batch = updates.slice(i, i + batchSize);

                        // Process each update in the batch
                        for (const update of batch) {
                            const { id, ...fields } = update;
                            await tx
                                .update(ExercisePlanExercises)
                                .set(fields)
                                .where(
                                    eq(ExercisePlanExercises.planExerciseId, id)
                                );
                        }
                    }
                }
            }

            // --- OPTIMIZATION: Process creations in batches ---
            // Insert phases in bulk
            if (phasesToInsert.length > 0) {
                await tx.insert(Phases).values(phasesToInsert);
            }

            // Insert sessions in bulk
            if (sessionsToInsert.length > 0) {
                await tx.insert(Sessions).values(sessionsToInsert);
            }

            // Insert exercises in bulk
            if (changes.created.exercises.length > 0) {
                // Fetch exercise IDs for descriptions in one query
                const exerciseNameToIdMap = new Map<string, string>();

                if (uniqueExerciseDescriptions.length > 0) {
                    const exerciseMatches = await tx
                        .select({
                            exerciseId: Exercises.exerciseId,
                            exerciseName: Exercises.exerciseName,
                        })
                        .from(Exercises)
                        .where(
                            inArray(
                                Exercises.exerciseName,
                                uniqueExerciseDescriptions
                            )
                        );

                    // Build a map of exercise name to ID for quick lookup
                    exerciseMatches.forEach((match) => {
                        exerciseNameToIdMap.set(
                            match.exerciseName,
                            match.exerciseId
                        );
                    });
                }

                // Prepare exercises for insertion - filter out exercises with null exerciseId
                const exercisesToInsert = changes.created.exercises
                    .filter(
                        (exerciseData) =>
                            exerciseData.exercise.exerciseId !== null
                    )
                    .map((exerciseData, index) => {
                        const exercise = exerciseData.exercise;

                        // Make sure we're using exerciseId (reference to Exercises table) and not id (which is planExerciseId)
                        // This is critical to avoid foreign key violations
                        return {
                            planExerciseId: uuidv4(), // Generate new unique ID for this exercise instance
                            sessionId: exerciseData.sessionId,
                            exerciseId: exercise.exerciseId!, // Use exerciseId (foreign key) not id (primary key)
                            motion: exercise.motion ?? null,
                            targetArea: exercise.targetArea ?? null,
                            repsMin:
                                exercise.repsMin !== undefined &&
                                exercise.repsMin !== null &&
                                exercise.repsMin !== ""
                                    ? Number(exercise.repsMin)
                                    : null,
                            repsMax:
                                exercise.repsMax !== undefined &&
                                exercise.repsMax !== null &&
                                exercise.repsMax !== ""
                                    ? Number(exercise.repsMax)
                                    : null,
                            setsMin:
                                exercise.setsMin !== undefined &&
                                exercise.setsMin !== null &&
                                exercise.setsMin !== ""
                                    ? Number(exercise.setsMin)
                                    : null,
                            setsMax:
                                exercise.setsMax !== undefined &&
                                exercise.setsMax !== null &&
                                exercise.setsMax !== ""
                                    ? Number(exercise.setsMax)
                                    : null,
                            tempo: exercise.tempo ?? null,
                            tut:
                                exercise.tut !== undefined &&
                                exercise.tut !== null &&
                                exercise.tut !== ""
                                    ? Number(exercise.tut)
                                    : null,
                            restMin:
                                exercise.restMin !== undefined &&
                                exercise.restMin !== null &&
                                exercise.restMin !== ""
                                    ? Number(exercise.restMin)
                                    : null,
                            restMax:
                                exercise.restMax !== undefined &&
                                exercise.restMax !== null &&
                                exercise.restMax !== ""
                                    ? Number(exercise.restMax)
                                    : null,
                            exerciseOrder: index, // Use the index as order number
                            setOrderMarker: exercise.order,
                            customizations:
                                exercise.additionalInfo ??
                                exercise.customizations ??
                                null,
                            notes: exercise.notes ?? "",
                        };
                    });

                // Log any skipped exercises
                const skippedCount =
                    changes.created.exercises.length - exercisesToInsert.length;
                if (skippedCount > 0) {
                    console.warn(
                        `Skipped ${skippedCount} exercises with null exerciseId`
                    );
                }

                // Split into chunks to avoid potential query size limits
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

            // Get the client ID associated with this plan for cache revalidation
            const planDetails = await tx
                .select({ assignedToUserId: ExercisePlans.assignedToUserId })
                .from(ExercisePlans)
                .where(eq(ExercisePlans.planId, planId))
                .limit(1);

            if (planDetails.length && planDetails[0].assignedToUserId) {
                const clientId = planDetails[0].assignedToUserId;
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
 * Updates a session with optimistic concurrency control
 * @param sessionId The ID of the session to update
 * @param sessionData The updated session data
 * @param lastKnownUpdatedAt Optional parameter for concurrency control
 * @returns Success status and error message if applicable
 */
export async function saveSession(
    sessionId: string,
    sessionData: SessionData,
    lastKnownUpdatedAt?: Date // Optional parameter for concurrency control
): Promise<WorkoutPlanActionResponse> {
    try {
        // First, get the session to find its associated phase and plan
        const session = await db
            .select({
                phaseId: Sessions.phaseId,
            })
            .from(Sessions)
            .where(eq(Sessions.sessionId, sessionId))
            .limit(1);

        if (!session.length) {
            return {
                success: false,
                error: "Session not found",
                conflict: false,
                planId: "",
                updatedAt: new Date(),
                serverUpdatedAt: new Date(),
            };
        }

        const phaseId = session[0].phaseId;

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

        // --- OPTIMIZATION: Prepare data for batch operations ---
        // Prepare exercise updates
        const exerciseUpdates: {
            id: string;
            motion: string;
            targetArea: string;
            setOrderMarker: string;
            exerciseOrder: number;
        }[] = [];

        // If there are exercises to update, prepare them
        if (sessionData.exercises && sessionData.exercises.length > 0) {
            // Sort exercises by their setOrderMarker (order field) using lexicographical ordering
            const sortedExercises = [...sessionData.exercises].sort((a, b) => {
                return a.order.localeCompare(b.order);
            });

            // Prepare exercise updates with exerciseOrder values (0, 1, 2, ...) based on the sorted order
            for (let i = 0; i < sortedExercises.length; i++) {
                const exercise = sortedExercises[i];
                exerciseUpdates.push({
                    id: exercise.id,
                    motion: exercise.motion,
                    targetArea: exercise.targetArea,
                    setOrderMarker: exercise.order,
                    exerciseOrder: i, // 0-based index for the sorted exercises
                });
            }
        }

        // Use a transaction for atomicity
        return await db.transaction(async (tx) => {
            const now = new Date();

            // Update session data
            await tx
                .update(Sessions)
                .set({
                    sessionName: sessionData.name,
                    // Add other fields as needed
                })
                .where(eq(Sessions.sessionId, sessionId));

            // Batch update exercises
            if (exerciseUpdates.length > 0) {
                for (const exercise of exerciseUpdates) {
                    await tx
                        .update(ExercisePlanExercises)
                        .set({
                            motion: exercise.motion,
                            targetArea: exercise.targetArea,
                            setOrderMarker: exercise.setOrderMarker,
                            exerciseOrder: exercise.exerciseOrder,
                        })
                        .where(
                            eq(
                                ExercisePlanExercises.planExerciseId,
                                exercise.id
                            )
                        );
                }
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
        console.error("Error saving session:", error);
        return {
            success: false,
            error: "Failed to save session",
            conflict: false,
            planId: "",
            updatedAt: new Date(),
            serverUpdatedAt: new Date(),
        };
    }
}
