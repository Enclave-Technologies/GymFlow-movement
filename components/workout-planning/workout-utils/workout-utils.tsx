import { Exercise, Phase, WorkoutPlanResponse } from "../types";
import { v4 as uuidv4 } from "uuid";
import { getWorkoutPlanByClientId } from "@/actions/workout_plan_actions";
import { WorkoutPlanChangeTracker } from "../change-tracker";

export function mapWorkoutPlanResponseToPhase(
    response: WorkoutPlanResponse
): Phase[] {
    return response.phases.map((phase) => ({
        id: phase.id,
        name: phase.name,
        isActive: phase.isActive,
        isExpanded: phase.isExpanded,
        sessions: phase.sessions.map((session) => {
            const exercises: Exercise[] =
                session.exercises?.map((e) => {
                    if (
                        !e.id ||
                        !e.order ||
                        e.motion === null ||
                        e.targetArea === null ||
                        e.description === null
                    ) {
                        console.warn("Missing required exercise properties", e);
                    }
                    return {
                        id: e.id || uuidv4(),
                        order: e.order || "",
                        motion: e.motion || "",
                        targetArea: e.targetArea || "",
                        exerciseId: e.exerciseId || "",
                        description: e.description || "",
                        duration:
                            typeof e.duration === "number" ? e.duration : 8,
                        sets: e.sets ?? "",
                        reps: e.reps ?? "",
                        tut: e.tut ?? "",
                        tempo: e.tempo ?? "",
                        rest: e.rest ?? "",
                        additionalInfo: e.additionalInfo ?? "",
                        setsMin: e.setsMin ?? "",
                        setsMax: e.setsMax ?? "",
                        repsMin: e.repsMin ?? "",
                        repsMax: e.repsMax ?? "",
                        restMin: e.restMin ?? "",
                        restMax: e.restMax ?? "",
                        customizations: e.additionalInfo ?? "",
                    };
                }) || [];

            const calculatedDuration =
                exercises.reduce(
                    (total, ex) => total + (ex.duration || 8),
                    0
                ) || 0;

            return {
                id: session.id || uuidv4(),
                name: session.name || "Unnamed Session",
                duration: calculatedDuration,
                isExpanded: Boolean(session.isExpanded),
                exercises,
            };
        }),
    }));
}

export async function fetchWorkoutPlan(
    client_id: string,
    setIsLoading: (value: boolean) => void,
    setPlanId: (value: string | null) => void,
    setLastKnownUpdatedAt: (value: Date | null) => void,
    updatePhases: (newPhases: Phase[]) => void,
    setChangeTracker: (tracker: WorkoutPlanChangeTracker) => void
) {
    setIsLoading(true);
    try {
        const response = await getWorkoutPlanByClientId(client_id);
        console.log(
            "Fetched workout plan (raw):",
            JSON.stringify(response, null, 2)
        );

        // If no plan exists yet or empty array is returned
        if (!response || (Array.isArray(response) && response.length === 0)) {
            updatePhases([]);
            // Initialize change tracker with empty phases
            setChangeTracker(new WorkoutPlanChangeTracker([]));
            return;
        }

        // Store the plan ID and last updated timestamp for concurrency control
        if ("planId" in response && "updatedAt" in response) {
            setPlanId(response.planId);
            setLastKnownUpdatedAt(new Date(response.updatedAt));
        }

        // Map the phases from the response
        const mapped = mapWorkoutPlanResponseToPhase(
            response as WorkoutPlanResponse
        );

        console.log(
            "Mapped workout plan (frontend structure):",
            JSON.stringify(mapped, null, 2)
        );
        updatePhases(mapped);

        // Initialize change tracker with the fetched phases
        setChangeTracker(new WorkoutPlanChangeTracker(mapped));
    } catch (error) {
        console.error("Error fetching workout plan:", error);
        // Fallback to empty data
        updatePhases([]);
        // Initialize change tracker with empty phases
        setChangeTracker(new WorkoutPlanChangeTracker([]));
    } finally {
        setIsLoading(false);
    }
}

/**
 * Refetches workout plan data after a save operation
 */
export async function refetchWorkoutPlan(
    client_id: string,
    setPlanId: (value: string | null) => void,
    setLastKnownUpdatedAt: (value: Date | null) => void,
    updatePhases: (newPhases: Phase[]) => void,
    changeTracker: WorkoutPlanChangeTracker | null,
    setChangeTracker: (tracker: WorkoutPlanChangeTracker) => void
) {
    try {
        const response = await getWorkoutPlanByClientId(client_id);
        if (response && "planId" in response && "updatedAt" in response) {
            setPlanId(response.planId);
            setLastKnownUpdatedAt(new Date(response.updatedAt));

            // Map the phases from the response
            const mapped = mapWorkoutPlanResponseToPhase(
                response as WorkoutPlanResponse
            );

            updatePhases(mapped);

            // Reset the change tracker with the fetched phases
            if (changeTracker) {
                changeTracker.reset(mapped);
            } else {
                setChangeTracker(new WorkoutPlanChangeTracker(mapped));
            }
        }
    } catch (error) {
        console.error("Error refetching workout plan:", error);
    }
}
