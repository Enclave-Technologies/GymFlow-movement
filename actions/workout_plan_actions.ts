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

export async function getWorkoutPlanByClientId(clientId: string) {
    // TODO: Add support for saving phase activation state
    // load all data in one query
    const rows = await db
        .select({
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

    // define types for grouping
    interface ExerciseItem {
        id: string;
        order: string;
        motion: string | null;
        targetArea: string | null;
        description: string | null;
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

    return Array.from(phasesMap.values());
}

export async function updatePhaseActivation(
    phaseId: string,
    isActive: boolean
) {
    try {
        // Update the phase's active status in the database
        await db
            .update(Phases)
            .set({ isActive })
            .where(eq(Phases.phaseId, phaseId));

        // If activating this phase, deactivate all other phases in the same plan
        if (isActive) {
            // First get the planId for this phase
            const phase = await db
                .select({ planId: Phases.planId })
                .from(Phases)
                .where(eq(Phases.phaseId, phaseId))
                .limit(1);

            if (phase.length > 0) {
                const planId = phase[0].planId;

                // Deactivate all other phases in this plan
                await db
                    .update(Phases)
                    .set({ isActive: false })
                    .where(
                        and(
                            eq(Phases.planId, planId),
                            not(eq(Phases.phaseId, phaseId))
                        )
                    );
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating phase activation:", error);
        return { success: false, error };
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

export async function saveSession(sessionId: string, sessionData: SessionData) {
    try {
        // Update session data
        await db
            .update(Sessions)
            .set({
                sessionName: sessionData.name,
                // Add other fields as needed
            })
            .where(eq(Sessions.sessionId, sessionId));

        // If there are exercises to update, handle them here
        if (sessionData.exercises && sessionData.exercises.length > 0) {
            for (const exercise of sessionData.exercises) {
                await db
                    .update(ExercisePlanExercises)
                    .set({
                        exerciseOrder: parseInt(exercise.order, 10) || 0,
                        motion: exercise.motion,
                        targetArea: exercise.targetArea,
                        // Add other fields as needed
                    })
                    .where(
                        eq(ExercisePlanExercises.planExerciseId, exercise.id)
                    );
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Error saving session:", error);
        return { success: false, error };
    }
}
