"use server";

import { db } from "@/db/xata";
import {
    ExercisePlans,
    Phases,
    Sessions,
    ExercisePlanExercises,
    Exercises,
} from "@/db/schemas";
import { eq, or, and, not } from "drizzle-orm";
import "server-only";
import { v4 as uuidv4 } from "uuid";
import { WorkoutPlanActionResponse } from "@/components/workout-planning/types";
import { revalidatePath } from "next/cache";

// Define types for workout plan data
interface ExerciseItem {
    id: string;
    order: string;
    motion: string | null;
    targetArea: string | null;
    description: string | null;
    tut?: string | null;
    tempo?: string | null;
    customizations?: string | null;
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
    // load all data in one query
    const rows = await db
        .select({
            planId: ExercisePlans.planId,
            planUpdatedAt: ExercisePlans.updatedAt, // Include updatedAt for concurrency control
            phaseId: Phases.phaseId,
            phaseName: Phases.phaseName,
            phaseIsActive: Phases.isActive,
            phaseOrder: Phases.orderNumber,
            sessionId: Sessions.sessionId,
            sessionName: Sessions.sessionName,
            sessionTime: Sessions.sessionTime,
            sessionOrder: Sessions.orderNumber,
            exerciseId: ExercisePlanExercises.planExerciseId,
            exerciseOrder: ExercisePlanExercises.exerciseOrder,
            motion: ExercisePlanExercises.motion,
            targetArea: ExercisePlanExercises.targetArea,
            description: Exercises.exerciseName,
            tut: ExercisePlanExercises.tut,
            tempo: ExercisePlanExercises.tempo,
            customizations: ExercisePlanExercises.customizations,
            setsMin: ExercisePlanExercises.setsMin,
            setsMax: ExercisePlanExercises.setsMax,
            repsMin: ExercisePlanExercises.repsMin,
            repsMax: ExercisePlanExercises.repsMax,
            restMin: ExercisePlanExercises.restMin,
            restMax: ExercisePlanExercises.restMax,
        })
        .from(ExercisePlanExercises)
        .innerJoin(
            Sessions,
            eq(ExercisePlanExercises.sessionId, Sessions.sessionId)
        )
        .innerJoin(Phases, eq(Sessions.phaseId, Phases.phaseId))
        .innerJoin(ExercisePlans, eq(Phases.planId, ExercisePlans.planId))
        .innerJoin(
            Exercises,
            eq(ExercisePlanExercises.exerciseId, Exercises.exerciseId)
        )
        .where(
            or(
                eq(ExercisePlans.assignedToUserId, clientId),
                eq(ExercisePlans.createdByUserId, clientId)
            )
        )
        .orderBy(
            Phases.orderNumber,
            Sessions.orderNumber,
            ExercisePlanExercises.exerciseOrder
        );

    if (!rows.length) {
        return [];
    }

    // No need to redefine types here as they're now defined at the module level

    // Extract plan metadata
    let planId: string | null = null;
    let updatedAt: Date | null = null;

    if (rows.length > 0) {
        planId = rows[0].planId;
        updatedAt = rows[0].planUpdatedAt;
    }

    // group into phases -> sessions -> exercises
    const phasesMap = new Map<string, PhaseItem>();

    for (const row of rows) {
        // initialize phase
        let phase = phasesMap.get(row.phaseId);
        if (!phase) {
            phasesMap.set(row.phaseId, {
                id: row.phaseId,
                name: row.phaseName,
                isActive: row.phaseIsActive ?? false,
                isExpanded: true,
                sessions: [],
            });
            phase = phasesMap.get(row.phaseId)!;
        }

        // initialize session
        let session = phase.sessions.find((s) => s.id === row.sessionId);
        if (!session) {
            session = {
                id: row.sessionId,
                name: row.sessionName,
                duration: row.sessionTime,
                isExpanded: true,
                exercises: [],
            };
            phase.sessions.push(session);
        }

        // add exercise
        session.exercises.push({
            id: row.exerciseId,
            order: row.exerciseOrder != null ? String(row.exerciseOrder) : "",
            motion: row.motion,
            targetArea: row.targetArea,
            description: row.description,
        });
    }

    // Return with plan metadata
    return {
        planId: planId || "",
        updatedAt: updatedAt || new Date(),
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
                // This is where we would invalidate the cache for /clients/{id}
                console.log(`Invalidating cache for client: ${clientId}`);
                revalidatePath(`/clients/${clientId}`);
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

interface SessionData {
    name: string;
    exercises?: Array<{
        id: string;
        order: string;
        motion: string;
        targetArea: string;
    }>;
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

        // No conflict, proceed with update using a transaction
        return await db.transaction(async (tx) => {
            const now = new Date();

            // Update the plan's updatedAt timestamp
            await tx
                .update(ExercisePlans)
                .set({ updatedAt: now })
                .where(eq(ExercisePlans.planId, planId));

            // Process each phase
            for (const phase of planData.phases) {
                // Check if phase exists
                const existingPhase = await tx
                    .select({ phaseId: Phases.phaseId })
                    .from(Phases)
                    .where(eq(Phases.phaseId, phase.id))
                    .limit(1);

                if (existingPhase.length) {
                    // Update existing phase
                    await tx
                        .update(Phases)
                        .set({
                            phaseName: phase.name,
                            isActive: phase.isActive,
                        })
                        .where(eq(Phases.phaseId, phase.id));
                } else {
                    // Create new phase
                    await tx.insert(Phases).values({
                        phaseId: phase.id,
                        planId: planId,
                        phaseName: phase.name,
                        orderNumber: planData.phases.indexOf(phase),
                        isActive: phase.isActive,
                    });
                }

                // Process each session in the phase
                for (const session of phase.sessions) {
                    // Check if session exists
                    const existingSession = await tx
                        .select({ sessionId: Sessions.sessionId })
                        .from(Sessions)
                        .where(eq(Sessions.sessionId, session.id))
                        .limit(1);

                    if (existingSession.length) {
                        // Update existing session
                        await tx
                            .update(Sessions)
                            .set({
                                sessionName: session.name,
                                sessionTime: session.duration,
                            })
                            .where(eq(Sessions.sessionId, session.id));
                    } else {
                        // Create new session
                        await tx.insert(Sessions).values({
                            sessionId: session.id,
                            phaseId: phase.id,
                            sessionName: session.name,
                            orderNumber: phase.sessions.indexOf(session),
                            sessionTime: session.duration,
                        });
                    }

                    // Process each exercise in the session
                    // First, sort exercises by their setOrderMarker (order field) in typographical order
                    const sortedExercises = [...session.exercises].sort(
                        (a, b) => {
                            return a.order.localeCompare(b.order, undefined, {
                                numeric: true,
                                sensitivity: "base",
                            });
                        }
                    );

                    // Then assign exerciseOrder values (0, 1, 2, ...) based on the sorted order
                    for (let i = 0; i < sortedExercises.length; i++) {
                        const exercise = sortedExercises[i];
                        const exerciseOrder = i; // 0-based index for the sorted exercises

                        // Check if exercise exists
                        const existingExercise = await tx
                            .select({
                                planExerciseId:
                                    ExercisePlanExercises.planExerciseId,
                            })
                            .from(ExercisePlanExercises)
                            .where(
                                eq(
                                    ExercisePlanExercises.planExerciseId,
                                    exercise.id
                                )
                            )
                            .limit(1);

                        if (existingExercise.length) {
                            // Update existing exercise
                            await tx
                                .update(ExercisePlanExercises)
                                .set({
                                    motion: exercise.motion,
                                    targetArea: exercise.targetArea,
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
                                        exercise.customizations ?? null,
                                    notes: exercise.notes ?? "",
                                })
                                .where(
                                    eq(
                                        ExercisePlanExercises.planExerciseId,
                                        exercise.id
                                    )
                                );
                        } else {
                            // For new exercises, we need the actual exerciseId from the Exercises table
                            // Find an existing exercise with the same description if possible
                            let exerciseId = "placeholder-exercise-id";
                            if (exercise.description) {
                                const existingExercise = await tx
                                    .select({
                                        exerciseId: Exercises.exerciseId,
                                    })
                                    .from(Exercises)
                                    .where(
                                        eq(
                                            Exercises.exerciseName,
                                            exercise.description
                                        )
                                    )
                                    .limit(1);

                                if (existingExercise.length > 0) {
                                    exerciseId = existingExercise[0].exerciseId;
                                }
                            }

                            await tx.insert(ExercisePlanExercises).values({
                                sessionId: session.id,
                                exerciseId: exerciseId,
                                targetArea: exercise.targetArea ?? null,
                                motion: exercise.motion ?? null,
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

            // Process each phase
            for (const phase of planData.phases) {
                // Create new phase
                await tx.insert(Phases).values({
                    phaseId: phase.id,
                    planId: planId,
                    phaseName: phase.name,
                    orderNumber: planData.phases.indexOf(phase),
                    isActive: phase.isActive,
                });

                // Process each session in the phase
                for (const session of phase.sessions) {
                    // Create new session
                    await tx.insert(Sessions).values({
                        sessionId: session.id,
                        phaseId: phase.id,
                        sessionName: session.name,
                        orderNumber: phase.sessions.indexOf(session),
                        sessionTime: session.duration,
                    });

                    // Process each exercise in the session
                    // First, sort exercises by their setOrderMarker (order field) in typographical order
                    const sortedExercises = [...session.exercises].sort(
                        (a, b) => {
                            return a.order.localeCompare(b.order, undefined, {
                                numeric: true,
                                sensitivity: "base",
                            });
                        }
                    );

                    // Then assign exerciseOrder values (0, 1, 2, ...) based on the sorted order
                    for (let i = 0; i < sortedExercises.length; i++) {
                        const exercise = sortedExercises[i];
                        const exerciseOrder = i; // 0-based index for the sorted exercises

                        // For new exercises, we need the actual exerciseId from the Exercises table
                        // Find an existing exercise with the same description if possible
                        let exerciseId = "placeholder-exercise-id";
                        if (exercise.description) {
                            const existingExercise = await tx
                                .select({ exerciseId: Exercises.exerciseId })
                                .from(Exercises)
                                .where(
                                    eq(
                                        Exercises.exerciseName,
                                        exercise.description
                                    )
                                )
                                .limit(1);

                            if (existingExercise.length > 0) {
                                exerciseId = existingExercise[0].exerciseId;
                            }
                        }

                        await tx.insert(ExercisePlanExercises).values({
                            sessionId: session.id,
                            exerciseId: exerciseId,
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

            // If there are exercises to update, handle them here
            if (sessionData.exercises && sessionData.exercises.length > 0) {
                // First, sort exercises by their setOrderMarker (order field) in typographical order
                const sortedExercises = [...sessionData.exercises].sort(
                    (a, b) => {
                        return a.order.localeCompare(b.order, undefined, {
                            numeric: true,
                            sensitivity: "base",
                        });
                    }
                );

                // Then assign exerciseOrder values (0, 1, 2, ...) based on the sorted order
                for (let i = 0; i < sortedExercises.length; i++) {
                    const exercise = sortedExercises[i];
                    const exerciseOrder = i; // 0-based index for the sorted exercises

                    await tx
                        .update(ExercisePlanExercises)
                        .set({
                            motion: exercise.motion,
                            targetArea: exercise.targetArea,
                            setOrderMarker: exercise.order, // Store the original order marker
                            exerciseOrder: exerciseOrder, // Store the numeric order
                            // Add other fields as needed
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
                // This is where we would invalidate the cache for /clients/{id}
                console.log(`Invalidating cache for client: ${clientId}`);
                revalidatePath(`/clients/${clientId}`);
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
