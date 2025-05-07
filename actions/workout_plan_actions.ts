"use server";

import { db } from "@/db/xata";
import {
    ExercisePlans,
    Phases,
    Sessions,
    ExercisePlanExercises,
    Exercises,
} from "@/db/schemas";
import { eq, inArray } from "drizzle-orm";
import "server-only";
import { v4 as uuidv4 } from "uuid";
import {
    Phase,
    WorkoutPlanActionResponse,
    WorkoutPlanChanges,
} from "@/components/workout-planning/types";
import { revalidatePath } from "next/cache";
import { requireTrainerOrAdmin } from "@/lib/auth-utils";
import {
    convertOrderToNumber,
    diffExercises,
    diffPhases,
    diffSessions,
} from "@/components/workout-planning/workout-utils/data-mapper";

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
    planId: string | undefined,
    lastKnownUpdatedAt: Date | undefined,
    planData: {
        phases: Phase[];
        clientId?: string;
    }
): Promise<WorkoutPlanActionResponse> {
    const currentTrainer = await requireTrainerOrAdmin();

    try {
        // Case 1: This is a new plan being created (planId and lastKnownUpdatedAt are empty)
        if (!planId || !lastKnownUpdatedAt) {
            if (!planData.clientId) {
                return {
                    success: false,
                    error: "Client ID is required for creating a new plan",
                    conflict: false,
                    planId: "",
                    updatedAt: new Date(),
                    serverUpdatedAt: new Date(),
                };
            }

            // Create a new plan
            return await createWorkoutPlan(planData.clientId, planData);
        }

        // Case 2: This is an update to an existing plan
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
                    .select({
                        phaseId: Phases.phaseId,
                        phaseName: Phases.phaseName,
                        isActive: Phases.isActive,
                        orderNumber: Phases.orderNumber,
                    })
                    .from(Phases)
                    .where(eq(Phases.planId, planId)),

                // Get all sessions for this plan (via phases)
                db
                    .select({
                        sessionId: Sessions.sessionId,
                        phaseId: Sessions.phaseId,
                        sessionName: Sessions.sessionName,
                        sessionTime: Sessions.sessionTime,
                        sessionOrder: Sessions.orderNumber,
                    })
                    .from(Sessions)
                    .innerJoin(Phases, eq(Sessions.phaseId, Phases.phaseId))
                    .where(eq(Phases.planId, planId)),

                // Get all exercises for this plan (via sessions and phases)
                db
                    .select({
                        planExerciseId: ExercisePlanExercises.planExerciseId,
                        sessionId: ExercisePlanExercises.sessionId,
                        exerciseId: ExercisePlanExercises.exerciseId,
                        exerciseOrder: ExercisePlanExercises.exerciseOrder,
                        orderMarker: ExercisePlanExercises.setOrderMarker,
                        setsMin: ExercisePlanExercises.setsMin,
                        setsMax: ExercisePlanExercises.setsMax,
                        repsMin: ExercisePlanExercises.repsMin,
                        repsMax: ExercisePlanExercises.repsMax,
                        tempo: ExercisePlanExercises.tempo,
                        tut: ExercisePlanExercises.tut,
                        restMin: ExercisePlanExercises.restMin,
                        restMax: ExercisePlanExercises.restMax,
                        customization: ExercisePlanExercises.customizations,
                        notes: ExercisePlanExercises.notes,
                        motion: ExercisePlanExercises.motion,
                        targetArea: ExercisePlanExercises.targetArea,
                    })
                    .from(ExercisePlanExercises)
                    .innerJoin(
                        Sessions,
                        eq(ExercisePlanExercises.sessionId, Sessions.sessionId)
                    )
                    .innerJoin(Phases, eq(Sessions.phaseId, Phases.phaseId))
                    .where(eq(Phases.planId, planId)),
            ]);

        // Map DB data to types for diffing
        const dbPhases = currentPhases.map((p) => ({
            id: p.phaseId,
            name: p.phaseName,
            isActive: p.isActive ?? true,
            orderNumber: typeof p.orderNumber === "number" ? p.orderNumber : 0,
            planId: planId ?? "",
            isExpanded: false,
            sessions: [],
        }));
        const dbSessions = currentSessions.map((s) => ({
            id: s.sessionId,
            phaseId: s.phaseId ?? "",
            name: s.sessionName,
            duration: typeof s.sessionTime === "number" ? s.sessionTime : 0,
            orderNumber:
                typeof s.sessionOrder === "number" ? s.sessionOrder : 0,
            isExpanded: false,
            exercises: [],
        }));
        const dbExercises = currentExercises.map((e) => ({
            id: e.planExerciseId,
            sessionId: e.sessionId ?? "",
            exerciseId: e.exerciseId ?? "",
            order: e.orderMarker ?? "",
            setsMin:
                e.setsMin !== undefined && e.setsMin !== null
                    ? e.setsMin.toString()
                    : "0",
            setsMax:
                e.setsMax !== undefined && e.setsMax !== null
                    ? e.setsMax.toString()
                    : "0",
            repsMin:
                e.repsMin !== undefined && e.repsMin !== null
                    ? e.repsMin.toString()
                    : "0",
            repsMax:
                e.repsMax !== undefined && e.repsMax !== null
                    ? e.repsMax.toString()
                    : "0",
            tempo: e.tempo ?? "",
            tut: e.tut !== undefined && e.tut !== null ? e.tut.toString() : "0",
            restMin:
                e.restMin !== undefined && e.restMin !== null
                    ? e.restMin.toString()
                    : "0",
            restMax:
                e.restMax !== undefined && e.restMax !== null
                    ? e.restMax.toString()
                    : "0",
            motion: e.motion ?? "",
            targetArea: e.targetArea ?? "",
            customizations: e.customization ?? "",
            notes: e.notes ?? "",
            description: "",
            additionalInfo: "",
            duration: 0,
            sets: "",
            reps: "",
        }));

        // Flatten FE data for sessions and exercises
        const feSessions = planData.phases.flatMap((p) => p.sessions);
        const feExercises = planData.phases.flatMap((p) =>
            p.sessions.flatMap((s) => s.exercises)
        );

        // Use diff utilities
        const {
            added: phasesToAdd,
            updated: phasesToUpdate,
            deleted: phasesToDelete,
        } = diffPhases(dbPhases, planData.phases);

        const {
            added: sessionsToAdd,
            updated: sessionsToUpdate,
            deleted: sessionsToDelete,
        } = diffSessions(dbSessions, feSessions);

        const {
            added: exercisesToAdd,
            updated: exercisesToUpdate,
            deleted: exercisesToDelete,
        } = diffExercises(dbExercises, feExercises);

        console.log("PHASE UPDATES: =================\n");
        console.log(JSON.stringify(phasesToUpdate));

        console.log("SESSIONS UPDATES: =================\n");
        console.log(JSON.stringify(sessionsToUpdate));

        console.log("EXERCISE UPDATES: =================\n");
        console.log(JSON.stringify(exercisesToUpdate));

        console.log("PHASE ADDED: =================\n");
        console.log(JSON.stringify(phasesToAdd));

        console.log("SESSIONS ADDED: =================\n");
        console.log(JSON.stringify(sessionsToAdd));

        console.log("EXERCISE ADDED: =================\n");
        console.log(JSON.stringify(exercisesToAdd));

        console.log("PHASE DELETED: =================\n");
        console.log(JSON.stringify(phasesToDelete));

        console.log("SESSIONS DELETED: =================\n");
        console.log(JSON.stringify(sessionsToDelete));

        console.log("EXERCISE DELETED: =================\n");
        console.log(JSON.stringify(exercisesToDelete));

        // No conflict, proceed with update using a transaction
        return await db.transaction(async (tx) => {
            const now = new Date();

            // --- Bulk delete operations ---
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
            if (sessionsToDelete.length > 0) {
                await tx
                    .delete(Sessions)
                    .where(inArray(Sessions.sessionId, sessionsToDelete));
            }
            if (phasesToDelete.length > 0) {
                await tx
                    .delete(Phases)
                    .where(inArray(Phases.phaseId, phasesToDelete));
            }

            // --- Bulk insert operations ---
            // Insert new phases
            if (phasesToAdd.length > 0) {
                const phasesToInsert = phasesToAdd.map((phase) => ({
                    phaseId: phase.id,
                    planId: planId,
                    phaseName: phase.name,
                    orderNumber: phase.orderNumber ?? 0,
                    isActive: phase.isActive ?? true,
                }));
                console.log("Phases:\n", phasesToInsert);
                await tx.insert(Phases).values(phasesToInsert);
            }
            // Insert new sessions
            if (sessionsToAdd.length > 0) {
                const sessionsToInsert = sessionsToAdd.map((session) => ({
                    sessionId: session.id,
                    phaseId: session.phaseId ?? "",
                    sessionName: session.name,
                    orderNumber: session.orderNumber ?? 0,
                    sessionTime: session.duration ?? 0,
                }));
                console.log("Sessions:\n", sessionsToInsert);
                await tx.insert(Sessions).values(sessionsToInsert);
            }
            // Insert new exercises
            if (exercisesToAdd.length > 0) {
                // Prepare exerciseNameToIdMap for new exercises with description
                const uniqueExerciseDescriptions = [
                    ...new Set(
                        exercisesToAdd.map((e) => e.description).filter(Boolean)
                    ),
                ] as string[];
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
                    exerciseMatches.forEach((match) => {
                        exerciseNameToIdMap.set(
                            match.exerciseName,
                            match.exerciseId
                        );
                    });
                    // Insert missing exercises
                    const missingDescriptions =
                        uniqueExerciseDescriptions.filter(
                            (desc) => !exerciseNameToIdMap.has(desc)
                        );
                    for (const desc of missingDescriptions) {
                        const newExerciseId = uuidv4();
                        await tx.insert(Exercises).values({
                            exerciseId: newExerciseId,
                            exerciseName: desc,
                            uploadedByUserId: currentTrainer?.id ?? "system",
                        });
                        exerciseNameToIdMap.set(desc, newExerciseId);
                    }
                }
                // Insert new plan exercises
                const exercisesToInsert: {
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
                }[] = exercisesToAdd
                    .map((exercise) => {
                        // Always resolve exerciseId to a string, or skip if not possible
                        let resolvedExerciseId = exercise.exerciseId;
                        if (
                            (!resolvedExerciseId ||
                                resolvedExerciseId === "") &&
                            exercise.description &&
                            exerciseNameToIdMap.has(exercise.description)
                        ) {
                            resolvedExerciseId = exerciseNameToIdMap.get(
                                exercise.description
                            ) as string;
                        }
                        if (!resolvedExerciseId || resolvedExerciseId === "") {
                            // skip this exercise
                            return null;
                        }
                        return {
                            planExerciseId: uuidv4(),
                            sessionId: exercise.sessionId ?? "",
                            exerciseId: resolvedExerciseId,
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
                            exerciseOrder: convertOrderToNumber(
                                exercise.order ?? ""
                            ),
                            setOrderMarker: exercise.order ?? "",
                            customizations:
                                exercise.additionalInfo ??
                                exercise.customizations ??
                                null,
                            notes: exercise.notes ?? "",
                        };
                    })
                    .filter((e) => e !== null);
                console.log("Exercises:\n", exercisesToInsert);
                if (exercisesToInsert.length > 0) {
                    const chunkSize = 100;
                    for (
                        let i = 0;
                        i < exercisesToInsert.length;
                        i += chunkSize
                    ) {
                        const chunk = exercisesToInsert.slice(i, i + chunkSize);
                        await tx.insert(ExercisePlanExercises).values(chunk);
                    }
                }
            }

            // --- Bulk update operations ---
            // Update phases
            if (phasesToUpdate.length > 0) {
                for (const phase of phasesToUpdate) {
                    await tx
                        .update(Phases)
                        .set({
                            ...(phase.changes.name !== undefined && {
                                phaseName: phase.changes.name,
                            }),
                            ...(phase.changes.isActive !== undefined && {
                                isActive: phase.changes.isActive,
                            }),
                            ...(phase.changes.orderNumber !== undefined && {
                                orderNumber: phase.changes.orderNumber,
                            }),
                        })
                        .where(eq(Phases.phaseId, phase.id));
                }
            }
            // Update sessions
            if (sessionsToUpdate.length > 0) {
                for (const session of sessionsToUpdate) {
                    await tx
                        .update(Sessions)
                        .set({
                            ...(session.changes.name !== undefined && {
                                sessionName: session.changes.name,
                            }),
                            ...(session.changes.duration !== undefined && {
                                sessionTime: session.changes.duration,
                            }),
                            ...(session.changes.orderNumber !== undefined && {
                                orderNumber: session.changes.orderNumber,
                            }),
                        })
                        .where(eq(Sessions.sessionId, session.id));
                }
            }
            // Update exercises
            if (exercisesToUpdate.length > 0) {
                for (const exercise of exercisesToUpdate) {
                    // Build the update object
                    const updateObj: Record<string, unknown> = {
                        ...(exercise.changes.motion !== undefined && {
                            motion: exercise.changes.motion,
                        }),
                        ...(exercise.changes.targetArea !== undefined && {
                            targetArea: exercise.changes.targetArea,
                        }),
                        ...(exercise.changes.exerciseId !== undefined && {
                            exerciseId: exercise.changes.exerciseId,
                        }),
                        ...(exercise.changes.order !== undefined && {
                            setOrderMarker: exercise.changes.order,
                            exerciseOrder: convertOrderToNumber(
                                exercise.changes.order ?? ""
                            ),
                        }),
                        ...(exercise.changes.setsMin !== undefined && {
                            setsMin:
                                exercise.changes.setsMin !== null &&
                                exercise.changes.setsMin !== ""
                                    ? Number(exercise.changes.setsMin)
                                    : null,
                        }),
                        ...(exercise.changes.setsMax !== undefined && {
                            setsMax:
                                exercise.changes.setsMax !== null &&
                                exercise.changes.setsMax !== ""
                                    ? Number(exercise.changes.setsMax)
                                    : null,
                        }),
                        ...(exercise.changes.repsMin !== undefined && {
                            repsMin:
                                exercise.changes.repsMin !== null &&
                                exercise.changes.repsMin !== ""
                                    ? Number(exercise.changes.repsMin)
                                    : null,
                        }),
                        ...(exercise.changes.repsMax !== undefined && {
                            repsMax:
                                exercise.changes.repsMax !== null &&
                                exercise.changes.repsMax !== ""
                                    ? Number(exercise.changes.repsMax)
                                    : null,
                        }),
                        ...(exercise.changes.tempo !== undefined && {
                            tempo: exercise.changes.tempo,
                        }),
                        ...(exercise.changes.tut !== undefined && {
                            tut:
                                exercise.changes.tut !== null &&
                                exercise.changes.tut !== ""
                                    ? Number(exercise.changes.tut)
                                    : null,
                        }),
                        ...(exercise.changes.restMin !== undefined && {
                            restMin:
                                exercise.changes.restMin !== null &&
                                exercise.changes.restMin !== ""
                                    ? Number(exercise.changes.restMin)
                                    : null,
                        }),
                        ...(exercise.changes.restMax !== undefined && {
                            restMax:
                                exercise.changes.restMax !== null &&
                                exercise.changes.restMax !== ""
                                    ? Number(exercise.changes.restMax)
                                    : null,
                        }),
                        ...(exercise.changes.customizations !== undefined && {
                            customizations: exercise.changes.customizations,
                        }),
                        ...(exercise.changes.notes !== undefined && {
                            notes: exercise.changes.notes,
                        }),
                    };
                    // Only update if there is at least one field to set
                    if (Object.keys(updateObj).length > 0) {
                        await tx
                            .update(ExercisePlanExercises)
                            .set(updateObj)
                            .where(
                                eq(
                                    ExercisePlanExercises.planExerciseId,
                                    exercise.id
                                )
                            );
                    }
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
        phases: Phase[];
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
        const exercisesToInsert: {
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
        }[] = [];

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
                            customizations:
                                exercise.additionalInfo ??
                                exercise.customizations ??
                                null,
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
    console.log("Starting applyWorkoutPlanChanges with planId:", planId);

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
        console.log("No changes detected, returning early");
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
        // Instead of directly accessing e.exercise.description which causes issues with Server Components,
        // we'll use a safer approach by destructuring the exercise first
        const uniqueExerciseDescriptions = [
            ...new Set(
                changes.created.exercises
                    .map((e) => {
                        const exercise = e.exercise;
                        return exercise ? exercise.description : null;
                    })
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

                console.log(
                    "Processing exercise creations:",
                    changes.created.exercises.length
                );

                // Prepare exercises for insertion - filter out exercises with null or empty exerciseId
                // Using destructuring to avoid directly accessing properties of client component references
                const exercisesToInsert = changes.created.exercises
                    .filter((exerciseData) => {
                        const exercise = exerciseData.exercise;
                        // Check for null, undefined, or empty string
                        const isValidExerciseId =
                            exercise &&
                            exercise.exerciseId !== null &&
                            exercise.exerciseId !== undefined &&
                            exercise.exerciseId !== "";

                        if (!isValidExerciseId) {
                            console.log(
                                "Skipping exercise with invalid exerciseId:",
                                exercise ? exercise.id : "unknown",
                                "exerciseId:",
                                exercise ? exercise.exerciseId : "null"
                            );
                        }

                        return isValidExerciseId;
                    })
                    .map((exerciseData, index) => {
                        const exercise = exerciseData.exercise;
                        console.log(
                            "Preparing to insert exercise:",
                            exercise.id,
                            "with exerciseId:",
                            exercise.exerciseId
                        );

                        // Make sure we're using exerciseId (reference to Exercises table) and not id (which is planExerciseId)
                        // This is critical to avoid foreign key violations
                        return {
                            planExerciseId: uuidv4(), // Generate new unique ID for this exercise instance
                            sessionId: exerciseData.sessionId,
                            exerciseId: exercise.exerciseId, // Use exerciseId (foreign key) not id (primary key)
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
                        `Skipped ${skippedCount} exercises with null or empty exerciseId`
                    );
                }

                console.log("Exercises to insert:", exercisesToInsert.length);

                // Split into chunks to avoid potential query size limits
                const chunkSize = 100;
                for (let i = 0; i < exercisesToInsert.length; i += chunkSize) {
                    const chunk = exercisesToInsert.slice(i, i + chunkSize);
                    console.log(
                        `Inserting chunk ${i / chunkSize + 1} of exercises (${
                            chunk.length
                        } items)`
                    );
                    await tx.insert(ExercisePlanExercises).values(chunk);
                    console.log(
                        `Successfully inserted chunk ${i / chunkSize + 1}`
                    );
                }
            }

            console.log("Updating plan timestamp");
            // Update the plan's updatedAt timestamp
            await tx
                .update(ExercisePlans)
                .set({ updatedAt: now })
                .where(eq(ExercisePlans.planId, planId));
            console.log("Plan timestamp updated successfully");

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
        // Log more details about the error
        if (error instanceof Error) {
            console.error("Error details:", error.message);
            console.error("Error stack:", error.stack);
        }
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
