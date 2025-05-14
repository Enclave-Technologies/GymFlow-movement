"use server";
import { Sessions, ExercisePlans, Phases } from "@/db/schemas";
import { db } from "@/db/xata";
import { requireTrainerOrAdmin } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";
import { WorkoutPlanActionResponse } from "@/components/workout-planning/types";

/**
 * Persists a new session to the database
 */
export async function persistNewSession(
    sessionData: {
        id: string;
        name: string;
        phaseId: string;
        orderNumber: number;
        duration?: number;
    },
    lastKnownUpdatedAt?: Date
): Promise<WorkoutPlanActionResponse> {
    noStore();
    await requireTrainerOrAdmin();

    try {
        // First get the planId for this phase
        const phase = await db
            .select({ planId: Phases.planId })
            .from(Phases)
            .where(eq(Phases.phaseId, sessionData.phaseId))
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

        // Check for concurrency conflicts if lastKnownUpdatedAt is provided
        if (lastKnownUpdatedAt) {
            const plan = await db
                .select({ updatedAt: ExercisePlans.updatedAt })
                .from(ExercisePlans)
                .where(eq(ExercisePlans.planId, planId))
                .limit(1);

            if (plan.length && plan[0].updatedAt) {
                const serverTime = plan[0].updatedAt;
                if (serverTime.getTime() !== lastKnownUpdatedAt.getTime()) {
                    return {
                        success: false,
                        error: "Plan has been modified since last fetch",
                        conflict: true,
                        planId: planId,
                        updatedAt: serverTime,
                        serverUpdatedAt: serverTime,
                    };
                }
            }
        }

        // Use a transaction for atomicity
        return await db.transaction(async (tx) => {
            const now = new Date();

            // Insert the new session
            await tx.insert(Sessions).values({
                sessionId: sessionData.id,
                phaseId: sessionData.phaseId,
                sessionName: sessionData.name,
                orderNumber: sessionData.orderNumber,
                sessionTime: sessionData.duration || 0,
            });

            // Update the plan's updatedAt timestamp
            await tx
                .update(ExercisePlans)
                .set({ updatedAt: now })
                .where(eq(ExercisePlans.planId, planId));

            return {
                success: true,
                planId: planId,
                updatedAt: now,
                serverUpdatedAt: now,
            };
        });
    } catch (error) {
        console.error("Error persisting new session:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            conflict: false,
            planId: "",
            updatedAt: new Date(),
            serverUpdatedAt: new Date(),
        };
    }
}
