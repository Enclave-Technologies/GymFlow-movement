import { useQuery, useQueryClient, QueryClient } from "@tanstack/react-query";
import { getWorkoutPlanByClientId } from "@/actions/workout_client_actions";
import { mapWorkoutPlanResponseToPhase } from "../workout-utils/workout-utils";
import { sortPhasesByActiveStatus } from "../workout-utils/phase-utils";
import type { Phase, WorkoutPlanResponse } from "../types";

export interface UseWorkoutPlanCacheResult {
    phases: Phase[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
    invalidateCache: () => void;
    isStale: boolean;
}

/**
 * Custom hook for caching workout plan data using React Query.
 *
 * This hook:
 * - Caches workout plan data for 5 minutes (longer than default since plans don't change frequently)
 * - Only fetches from DB on first load or after cache invalidation
 * - Provides methods to manually refetch or invalidate cache
 * - Processes raw API response into sorted Phase[] structure
 *
 * Cache is automatically invalidated when workout plan actions complete
 * via revalidatePath() calls in the server actions.
 */
export function useWorkoutPlanCache(
    clientId: string
): UseWorkoutPlanCacheResult {
    const queryClient = useQueryClient();

    const {
        data: response,
        isLoading,
        error,
        refetch,
        isStale,
    } = useQuery({
        queryKey: ["workoutPlan", clientId],
        queryFn: () => getWorkoutPlanByClientId(clientId),
        staleTime: 5 * 60 * 1000, // 5 minutes - longer than default since workout plans don't change frequently
        gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer for better UX
        refetchOnWindowFocus: false, // Don't refetch when user returns to tab
        retry: 2, // Retry failed requests twice
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    });

    // Process the response into phases with proper sorting
    const phases: Phase[] = (() => {
        if (!response || (Array.isArray(response) && response.length === 0)) {
            return [];
        }

        try {
            // Map the phases from the response
            const mapped = mapWorkoutPlanResponseToPhase(
                response as WorkoutPlanResponse
            );

            // Sort phases by active status first, then by orderNumber
            const sortedPhases = sortPhasesByActiveStatus(mapped);

            // For each phase, ensure sessions are sorted by orderNumber
            return sortedPhases.map((phase) => ({
                ...phase,
                sessions: [...phase.sessions].sort(
                    (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
                ),
            }));
        } catch (error) {
            console.error("Error processing workout plan response:", error);
            return [];
        }
    })();

    /**
     * Invalidate the cached workout plan data for this client.
     * This will cause the next access to refetch from the database.
     */
    const invalidateCache = () => {
        queryClient.invalidateQueries({
            queryKey: ["workoutPlan", clientId],
        });
    };

    /**
     * Manually refetch the workout plan data, bypassing cache.
     */
    const manualRefetch = () => {
        return refetch();
    };

    return {
        phases,
        isLoading,
        error: error as Error | null,
        refetch: manualRefetch,
        invalidateCache,
        isStale,
    };
}

/**
 * Utility function to invalidate workout plan cache for a specific client
 * from outside of a React component (e.g., in server actions or other utilities).
 */
export function invalidateWorkoutPlanCache(
    queryClient: QueryClient,
    clientId: string
) {
    queryClient.invalidateQueries({
        queryKey: ["workoutPlan", clientId],
    });
}

/**
 * Hook to get cache invalidation function for use in other components
 * (like the workout planner) to invalidate cache after successful edits.
 */
export function useWorkoutPlanCacheInvalidation() {
    const queryClient = useQueryClient();

    return (clientId: string) => {
        queryClient.invalidateQueries({
            queryKey: ["workoutPlan", clientId],
        });
    };
}
