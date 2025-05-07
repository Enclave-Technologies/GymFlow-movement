import { toast } from "sonner";
import { Phase, WorkoutPlanResponse } from "../types";
import { WorkoutPlanChangeTracker } from "./change-tracker";
import {
    createWorkoutPlan,
    updateWorkoutPlan,
} from "@/actions/workout_plan_actions";
import { getWorkoutPlanByClientId } from "@/actions/workout_client_actions";
import { mapWorkoutPlanResponseToPhase } from "./workout-utils";

/**
 * Saves all changes to the workout plan
 */
export async function saveAll(
    phases: Phase[],
    planId: string | null,
    lastKnownUpdatedAt: Date | null,
    client_id: string,
    changeTracker: WorkoutPlanChangeTracker | null,
    setSaving: (value: boolean) => void,
    setPlanId: (value: string | null) => void,
    setLastKnownUpdatedAt: (value: Date | null) => void,
    setHasUnsavedChanges: (value: boolean) => void,
    setConflictError: (
        value: { message: string; serverTime: Date } | null
    ) => void,
    setSavePerformed: (value: number | ((prev: number) => number)) => void,
    updatePhases: (phases: Phase[]) => void
) {
    // Log the current state to the console
    // Do not block the save flow because of a logging issue
    console.log("Saving workout plan (current changes):", changeTracker);

    // Set saving state
    setSaving(true);

    try {
        let result;

        if (!planId || !lastKnownUpdatedAt) {
            // Create a new plan if no planId exists
            result = await createWorkoutPlan(client_id, {
                phases,
            });

            // Update local state with the new plan ID and timestamp
            if (result.success && result.planId && result.updatedAt) {
                setPlanId(result.planId);
                setLastKnownUpdatedAt(new Date(result.updatedAt));

                // Reset the change tracker with the current phases
                if (changeTracker) {
                    changeTracker.reset(phases);
                }
            }
        } else {
            // Get changes from the change tracker
            // const changes = changeTracker ? changeTracker.getChanges() : null;

            // Fallback to full update if no changes detected or change tracker not available
            console.log(
                "No changes detected or change tracker not available, using full update"
            );
            result = await updateWorkoutPlan(planId, lastKnownUpdatedAt, {
                phases,
            });
        }

        if (result.success) {
            toast.success("All changes saved successfully");
            setHasUnsavedChanges(false);
            // Clear any previous conflict errors
            setConflictError(null);

            // Update the last known timestamp
            if (result.updatedAt) {
                setLastKnownUpdatedAt(new Date(result.updatedAt));
            }

            // Reset the change tracker with the current phases
            if (changeTracker) {
                changeTracker.reset(phases);
            }

            // Trigger a refetch by incrementing the savePerformed counter
            setSavePerformed((prev) => prev + 1);
        } else {
            // Handle errors
            if (result.conflict) {
                // Handle conflict - another user has modified the plan
                setConflictError({
                    message:
                        result.error ||
                        "Plan has been modified by another user",
                    serverTime: new Date(result.serverUpdatedAt!),
                });
                toast.error(
                    "Conflict detected: Plan has been modified by another user"
                );

                // Force a refetch to get the latest data
                const refetchWorkout = async () => {
                    try {
                        const response = await getWorkoutPlanByClientId(
                            client_id
                        );
                        if (
                            response &&
                            "planId" in response &&
                            "updatedAt" in response
                        ) {
                            setPlanId(response.planId);
                            setLastKnownUpdatedAt(new Date(response.updatedAt));

                            // Map the phases from the response
                            const mapped = mapWorkoutPlanResponseToPhase(
                                response as WorkoutPlanResponse
                            );

                            // Update phases with the fetched data
                            if (typeof updatePhases === "function") {
                                updatePhases(mapped);
                            }

                            // Reset the change tracker with the fetched phases
                            if (changeTracker) {
                                changeTracker.reset(mapped);
                            }
                        }
                    } catch (error) {
                        console.error("Error refetching workout plan:", error);
                    }
                };

                refetchWorkout();
            } else {
                // Handle other errors
                toast.error(result.error || "Failed to save changes");
            }
        }
    } catch (error) {
        console.error("Error saving workout plan:", error);
        toast.error("An error occurred while saving");
    } finally {
        setSaving(false);
    }
}
