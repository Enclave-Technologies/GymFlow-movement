import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getWorkoutPlanByClientId } from "@/actions/workout_client_actions";
import { mapWorkoutPlanResponseToPhase } from "../workout-utils/workout-utils";
import type { Phase, WorkoutPlanResponse } from "../types";

export interface UseWorkoutPlanResult {
    phases: Phase[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
    invalidateCache: () => void;
}

export function useWorkoutPlan(clientId: string): UseWorkoutPlanResult {
    const queryClient = useQueryClient();

    const {
        data: response,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ["workoutPlan", clientId],
        queryFn: () => getWorkoutPlanByClientId(clientId),
        staleTime: 5 * 60 * 1000, // 5 minutes - longer than default since workout plans don't change frequently
        gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
        refetchOnWindowFocus: false,
        retry: 2,
    });

    // Process the response into phases
    const phases: Phase[] = (() => {
        if (!response || (Array.isArray(response) && response.length === 0)) {
            return [];
        }

        // Map the phases from the response
        const mapped = mapWorkoutPlanResponseToPhase(response as WorkoutPlanResponse);

        // Ensure phases are sorted by orderNumber
        const sortedPhases = [...mapped].sort(
            (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
        );

        // For each phase, ensure sessions are sorted by orderNumber
        return sortedPhases.map((phase) => ({
            ...phase,
            sessions: [...phase.sessions].sort(
                (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
            ),
        }));
    })();

    const invalidateCache = () => {
        queryClient.invalidateQueries({
            queryKey: ["workoutPlan", clientId],
        });
    };

    return {
        phases,
        isLoading,
        error: error as Error | null,
        refetch,
        invalidateCache,
    };
}
