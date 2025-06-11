import { Exercise, Phase, WorkoutPlanResponse } from "../types";
import { v4 as uuidv4 } from "uuid";
import { getWorkoutPlanByClientId } from "@/actions/workout_client_actions";
import { sortPhasesByActiveStatus } from "./phase-utils";

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

                // Sort exercises by their order field before mapping
                const sortedExercises = [...(session.exercises || [])].sort(
                    (a, b) => (a.order || "").localeCompare(b.order || "")
                );

                const exercises: Exercise[] =
                    sortedExercises?.map((e) => {
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
    updatePhases: (newPhases: Phase[]) => void
) {
    setIsLoading(true);
    try {
        const response = await getWorkoutPlanByClientId(client_id);

        // If no plan exists yet or empty array is returned
        if (!response || (Array.isArray(response) && response.length === 0)) {
            updatePhases([]);
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

        // Sort phases by active status first, then by orderNumber descending (newest first)
        const sortedPhases = sortPhasesByActiveStatus(mapped);

        // For each phase, ensure sessions are sorted by orderNumber
        const phasesWithSortedSessions = sortedPhases.map((phase) => ({
            ...phase,
            sessions: [...phase.sessions].sort(
                (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
            ),
        }));

        updatePhases(phasesWithSortedSessions);
    } catch (error) {
        console.error("Error fetching workout plan:", error);
        // Fallback to empty data
        updatePhases([]);
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
    currentPhases: Phase[]
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

            // Sort phases by active status first, then by orderNumber descending (newest first) and preserve expansion states
            const sortedPhases = sortPhasesByActiveStatus(mapped).map(
                (phase) => {
                    // Find matching phase in current phases to preserve expansion state
                    const currentPhase = currentPhases?.find(
                        (p) => p.id === phase.id
                    );

                    // Map sessions and preserve their expansion states
                    const sessionsWithPreservedState = phase.sessions
                        .map((session) => {
                            // Find matching session in current phase to preserve expansion state
                            const currentSession = currentPhase?.sessions.find(
                                (s) => s.id === session.id
                            );
                            return {
                                ...session,
                                // Keep current session expansion state if it exists, otherwise use default (true)
                                isExpanded: currentSession
                                    ? currentSession.isExpanded
                                    : true,
                            };
                        })
                        .sort(
                            (a, b) =>
                                (a.orderNumber || 0) - (b.orderNumber || 0)
                        );

                    return {
                        ...phase,
                        // Keep current phase expansion state if it exists, otherwise use default (true)
                        isExpanded: currentPhase
                            ? currentPhase.isExpanded
                            : true,
                        sessions: sessionsWithPreservedState,
                    };
                }
            );

            // Update phases with the fetched data
            if (typeof updatePhases === "function") {
                updatePhases(sortedPhases);
            }
        }
    } catch (error) {
        console.error("Error refetching workout plan:", error);
    }
}

export const createUpdatePhasesFunction = (
    setPhases: React.Dispatch<React.SetStateAction<Phase[]>>,
    latestPhasesRef: React.RefObject<Phase[]>
) => {
    return (newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])) => {
        setPhases((prevPhases) => {
            // Handle both direct value and function updates
            const updatedPhases =
                typeof newPhases === "function"
                    ? newPhases(prevPhases)
                    : newPhases;

            // Immediately update the ref with the new phases
            latestPhasesRef.current = updatedPhases;

            return updatedPhases;
        });
    };
};
