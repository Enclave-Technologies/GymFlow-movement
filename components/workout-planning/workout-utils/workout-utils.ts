import { Exercise, Phase, WorkoutPlanResponse } from "../types";
import { v4 as uuidv4 } from "uuid";
import { getWorkoutPlanByClientId } from "@/actions/workout_client_actions";
import { WorkoutPlanChangeTracker } from "./change-tracker";

export function mapWorkoutPlanResponseToPhase(
    response: WorkoutPlanResponse
): Phase[] {
    return response.phases.map((phase) => {
        const phaseId = phase.id;

        return {
            id: phaseId,
            name: phase.name,
            isActive: phase.isActive,
            isExpanded: phase.isExpanded,
            // Add planId from response
            planId: response.planId,
            // Add orderNumber if available or calculate based on index
            orderNumber:
                phase.orderNumber !== undefined ? phase.orderNumber : 0,
            sessions: phase.sessions.map((session) => {
                const sessionId = session.id || uuidv4();

                const exercises: Exercise[] =
                    session.exercises?.map((e) => {
                        if (
                            !e.id ||
                            !e.order ||
                            e.motion === null ||
                            e.targetArea === null ||
                            e.description === null
                        ) {
                            console.warn(
                                "Missing required exercise properties",
                                e
                            );
                        }
                        return {
                            id: e.id || uuidv4(),
                            // Add sessionId to ensure parent-child relationship
                            sessionId: sessionId,
                            order: e.order || "",
                            motion: e.motion || "",
                            targetArea: e.targetArea || "",
                            exerciseId: e.exerciseId || "",
                            description: e.description || "",
                            duration:
                                typeof e.duration === "number" ? e.duration : 8,
                            // Include both legacy and new fields
                            sets: e.sets ?? "",
                            reps: e.reps ?? "",
                            rest: e.rest ?? "",
                            tut: e.tut ?? "",
                            tempo: e.tempo ?? "",
                            additionalInfo: e.additionalInfo ?? "",
                            setsMin: e.setsMin ?? "",
                            setsMax: e.setsMax ?? "",
                            repsMin: e.repsMin ?? "",
                            repsMax: e.repsMax ?? "",
                            restMin: e.restMin ?? "",
                            restMax: e.restMax ?? "",
                            customizations:
                                e.customizations ?? e.additionalInfo ?? "",
                            notes: e.notes ?? "",
                        };
                    }) || [];

                const calculatedDuration =
                    exercises.reduce(
                        (total, ex) => total + (ex.duration || 8),
                        0
                    ) || 0;

                return {
                    id: sessionId,
                    name: session.name || "Unnamed Session",
                    duration: calculatedDuration,
                    isExpanded: Boolean(session.isExpanded),
                    exercises,
                    // Add phaseId to ensure parent-child relationship
                    phaseId: phaseId,
                    // Add orderNumber if available
                    orderNumber:
                        session.orderNumber !== undefined
                            ? session.orderNumber
                            : 0,
                };
            }),
        };
    });
}

export async function fetchWorkoutPlan(
    client_id: string,
    setIsLoading: (value: boolean) => void,
    setPlanId: (value: string | null) => void,
    setLastKnownUpdatedAt: (value: Date | null) => void,
    setPhases: (newPhases: Phase[]) => void
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
            setPhases([]);
            return;
        }

        // Store the plan ID and last updated timestamp for concurrency control
        if ("planId" in response && "updatedAt" in response) {
            setPlanId(response.planId);
            setLastKnownUpdatedAt(new Date(response.updatedAt));
            // Map the phases from the response
            const mapped = mapWorkoutPlanResponseToPhase(
                response as WorkoutPlanResponse
            );

            setPhases(mapped);
        }
    } catch (error) {
        console.error("Error fetching workout plan:", error);
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
    setPhases: (newPhases: Phase[]) => void
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

            setPhases(mapped);
        }
    } catch (error) {
        console.error("Error refetching workout plan:", error);
    }
}

export const createUpdatePhasesFunction = (
    setPhases: React.Dispatch<React.SetStateAction<Phase[]>>,
    changeTracker: WorkoutPlanChangeTracker | null
) => {
    return (newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])) => {
        console.log(
            "Updating phases:",
            typeof newPhases === "function"
                ? "function"
                : JSON.stringify(newPhases, null, 2)
        );
        setPhases((prevPhases) => {
            // Handle both direct value and function updates
            const updatedPhases =
                typeof newPhases === "function"
                    ? newPhases(prevPhases)
                    : newPhases;

            // Update the change tracker if it exists
            if (changeTracker) {
                changeTracker.updateCurrentState(updatedPhases);
                console.log(
                    "[CREATE UPDATE PHASE] Change Tracker:\n",
                    JSON.stringify(changeTracker, null, 2)
                );
            }

            return updatedPhases;
        });
    };
};
