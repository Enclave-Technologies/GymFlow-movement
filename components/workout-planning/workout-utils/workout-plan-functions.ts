import { toast } from "sonner";
import { Phase, Session, Exercise, WorkoutPlanResponse } from "../types";
import { WorkoutPlanChangeTracker } from "../change-tracker";
import {
    createWorkoutPlan,
    updateWorkoutPlan,
    applyWorkoutPlanChanges,
    getWorkoutPlanByClientId,
} from "@/actions/workout_plan_actions";
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
    console.log("Saving workout plan (current state):", phases);

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
            const changes = changeTracker ? changeTracker.getChanges() : null;

            if (
                changes &&
                (changes.created.phases.length > 0 ||
                    changes.created.sessions.length > 0 ||
                    changes.created.exercises.length > 0 ||
                    changes.updated.phases.length > 0 ||
                    changes.updated.sessions.length > 0 ||
                    changes.updated.exercises.length > 0 ||
                    changes.deleted.phases.length > 0 ||
                    changes.deleted.sessions.length > 0 ||
                    changes.deleted.exercises.length > 0)
            ) {
                console.log(
                    `Detected changes: ${JSON.stringify(changes, null, 2)}`
                );
                // Use the optimized action that only sends changes
                // First, create a serialized copy of the changes to avoid sending client component references
                const serializedChanges = {
                    created: {
                        phases: changes.created.phases.map((phase: Phase) => ({
                            ...phase,
                        })),
                        sessions: changes.created.sessions.map(
                            (item: { phaseId: string; session: Session }) => ({
                                phaseId: item.phaseId,
                                session: { ...item.session },
                            })
                        ),
                        exercises: changes.created.exercises.map(
                            (item: {
                                sessionId: string;
                                exercise: Exercise;
                            }) => ({
                                sessionId: item.sessionId,
                                exercise: {
                                    ...item.exercise,
                                    // Ensure all properties are properly serialized
                                    id: item.exercise.id,
                                    order: item.exercise.order,
                                    motion: item.exercise.motion,
                                    targetArea: item.exercise.targetArea,
                                    exerciseId: item.exercise.exerciseId,
                                    description: item.exercise.description,
                                    sets: item.exercise.sets,
                                    reps: item.exercise.reps,
                                    tut: item.exercise.tut,
                                    tempo: item.exercise.tempo,
                                    rest: item.exercise.rest,
                                    additionalInfo:
                                        item.exercise.additionalInfo,
                                    customizations:
                                        item.exercise.customizations,
                                    duration: item.exercise.duration,
                                    setsMin: item.exercise.setsMin,
                                    setsMax: item.exercise.setsMax,
                                    repsMin: item.exercise.repsMin,
                                    repsMax: item.exercise.repsMax,
                                    restMin: item.exercise.restMin,
                                    restMax: item.exercise.restMax,
                                    notes: item.exercise.notes,
                                },
                            })
                        ),
                    },
                    updated: {
                        phases: changes.updated.phases.map((item: { id: string; changes: Partial<Phase> }) => ({
                            id: item.id,
                            changes: { ...item.changes },
                        })),
                        sessions: changes.updated.sessions.map((item: { id: string; changes: Partial<Session> }) => ({
                            id: item.id,
                            changes: { ...item.changes },
                        })),
                        exercises: changes.updated.exercises.map((item: { id: string; changes: Partial<Exercise> }) => ({
                            id: item.id,
                            changes: { ...item.changes },
                        })),
                    },
                    deleted: {
                        phases: [...changes.deleted.phases],
                        sessions: [...changes.deleted.sessions],
                        exercises: [...changes.deleted.exercises],
                    },
                };

                console.log("Applying serialized changes:", serializedChanges);

                // Validate UUIDs before applying changes
                const invalidPhaseId = serializedChanges.created.sessions.some(
                    (item) => !item.phaseId || item.phaseId.trim() === ""
                );
                const invalidSessionId =
                    serializedChanges.created.exercises.some(
                        (item) =>
                            !item.sessionId || item.sessionId.trim() === ""
                    );

                if (invalidPhaseId) {
                    throw new Error(
                        "Invalid phaseId detected in created sessions"
                    );
                }
                if (invalidSessionId) {
                    throw new Error(
                        "Invalid sessionId detected in created exercises"
                    );
                }

                try {
                    result = await applyWorkoutPlanChanges(
                        planId,
                        lastKnownUpdatedAt,
                        serializedChanges
                    );
                    console.log("Result from applyWorkoutPlanChanges:", result);
                } catch (error) {
                    console.error("Error in applyWorkoutPlanChanges:", error);
                    throw error;
                }
            } else {
                // Fallback to full update if no changes detected or change tracker not available
                console.log(
                    "No changes detected or change tracker not available, using full update"
                );
                result = await updateWorkoutPlan(planId, lastKnownUpdatedAt, {
                    phases,
                });
            }
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
