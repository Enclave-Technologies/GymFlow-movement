"use server";

import { db } from "@/db/xata";
import { ExercisePlans, Phases } from "@/db/schemas";
import { eq } from "drizzle-orm";
import "server-only";
import { v4 as uuidv4 } from "uuid";
import { WorkoutPlanActionResponse } from "@/components/workout-planning/types";
import { requireTrainerOrAdmin } from "@/lib/auth-utils";

export async function updatePhaseName(
    planId: string | null,
    phaseId: string,
    newName: string,
    client_id: string,
    trainer_id: string,
    lastKnownUpdatedAt?: Date // Optional parameter for concurrency control
): Promise<WorkoutPlanActionResponse> {
    await requireTrainerOrAdmin();
    try {
        // Use a transaction for atomicity but optimize queries
        return await db.transaction(async (tx) => {
            const now = new Date();
            let actualPlanId = planId;
            let needsNewPlan = false;

            // Only check plan existence if we have a planId
            if (actualPlanId) {
                // Optimize: Use a single query to check plan existence
                const existingPlan = await tx
                    .select({ updatedAt: ExercisePlans.updatedAt })
                    .from(ExercisePlans)
                    .where(eq(ExercisePlans.planId, actualPlanId))
                    .limit(1);

                if (existingPlan.length === 0) {
                    needsNewPlan = true;
                } else if (lastKnownUpdatedAt) {
                    // Check for concurrency issues
                    const dbUpdatedAt = existingPlan[0].updatedAt;

                    if (
                        dbUpdatedAt &&
                        dbUpdatedAt.getTime() > lastKnownUpdatedAt.getTime()
                    ) {
                        return {
                            success: false,
                            error: "Plan has been modified by another user",
                            conflict: true,
                            planId: actualPlanId,
                            updatedAt: lastKnownUpdatedAt,
                            serverUpdatedAt: dbUpdatedAt,
                        };
                    }
                }
            } else {
                needsNewPlan = true;
                actualPlanId = uuidv4(); // Generate ID only once
            }

            // Create plan if needed (only one branch)
            if (needsNewPlan) {
                const [newPlan] = await tx
                    .insert(ExercisePlans)
                    .values({
                        planId: actualPlanId,
                        planName: "Workout Plan",
                        assignedToUserId: client_id,
                        createdByUserId: trainer_id,
                        createdDate: now,
                        updatedAt: now,
                        isActive: true,
                    })
                    .returning({ planId: ExercisePlans.planId }); // Only return what we need

                if (!newPlan) {
                    throw new Error("Failed to create plan");
                }
            }

            // Optimize: Use upsert pattern instead of separate select + insert/update
            // This reduces round trips to the database
            await tx
                .insert(Phases)
                .values({
                    phaseId: phaseId,
                    planId: actualPlanId,
                    phaseName: newName,
                    orderNumber: 0,
                    isActive: false,
                })
                .onConflictDoUpdate({
                    target: Phases.phaseId,
                    set: { phaseName: newName },
                });

            // Optimize: Update plan timestamp in the same query
            // This is the most efficient approach
            await tx
                .update(ExercisePlans)
                .set({ updatedAt: now })
                .where(eq(ExercisePlans.planId, actualPlanId));

            // Return success response
            return {
                success: true,
                // error: null,
                conflict: false,
                planId: actualPlanId,
                updatedAt: now,
                serverUpdatedAt: now,
            };
        });
    } catch (error) {
        console.error("Error updating phase name:", error);
        return {
            success: false,
            error: "Failed to update phase name",
            conflict: false,
            planId: planId || "",
            updatedAt: new Date(),
            serverUpdatedAt: new Date(),
        };
    }
}
