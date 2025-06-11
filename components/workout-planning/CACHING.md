# Workout Plan Caching Implementation

## Overview

The workout plan caching system has been implemented to improve UX by only fetching data from the database after edits, rather than on every component mount. This uses React Query for client-side caching combined with Next.js cache invalidation.

## Implementation Details

### 1. Cache Hook (`use-workout-plan-cache.ts`)

- **`useWorkoutPlanCache(clientId)`**: Main hook for cached workout plan data
  - Caches data for 5 minutes (longer than default since plans don't change frequently)
  - Keeps data in memory for 10 minutes for better UX
  - Automatically processes and sorts phases/sessions/exercises
  - Returns: `{ phases, isLoading, error, refetch, invalidateCache, isStale }`

- **`useWorkoutPlanCacheInvalidation()`**: Hook for cache invalidation
  - Returns a function to invalidate cache for a specific client
  - Used in the workout planner to invalidate cache after successful saves

### 2. Updated Components

#### WorkoutPlanTable (`workout-plan-table.tsx`)
- **Before**: Fetched data from DB on every mount using `useEffect` + `getWorkoutPlanByClientId`
- **After**: Uses `useWorkoutPlanCache(client_id)` for cached data
- **Benefits**: 
  - First load: Fetches from DB and caches
  - Subsequent loads: Uses cached data (no DB calls)
  - After edits: Cache is invalidated, next load fetches fresh data

#### WorkoutPlanner (`workout-plan.tsx`)
- Added cache invalidation after successful saves in `handleSaveAll`
- Calls `invalidateWorkoutPlanCache(client_id)` after successful save operations
- Ensures the read-only table gets fresh data after edits

### 3. Cache Invalidation Strategy

The caching works with the existing Next.js cache invalidation:

1. **Server Actions**: Already call `revalidatePath(\`/clients/\${clientId}\`, "layout")` after edits
2. **Client Cache**: Additionally invalidates React Query cache via `invalidateWorkoutPlanCache(client_id)`
3. **Result**: Both server and client caches are properly synchronized

## Usage Patterns

### For Read-Only Display (WorkoutPlanTable)
```typescript
const { phases, isLoading, error } = useWorkoutPlanCache(client_id);
```

### For Cache Invalidation (WorkoutPlanner)
```typescript
const invalidateWorkoutPlanCache = useWorkoutPlanCacheInvalidation();

// After successful save:
invalidateWorkoutPlanCache(client_id);
```

## Benefits

1. **Performance**: No unnecessary DB calls for read-only displays
2. **UX**: Faster loading of workout plan tables
3. **Consistency**: Cache invalidation ensures data stays fresh after edits
4. **Reliability**: Fallback to DB fetch if cache is stale or invalid

## Cache Behavior

- **First Load**: Fetches from DB, caches for 5 minutes
- **Subsequent Loads**: Uses cached data (instant loading)
- **After Edits**: Cache invalidated, next load fetches fresh data
- **Stale Data**: Automatically refetches if data is older than 5 minutes
- **Error Handling**: Falls back to empty array on errors, logs for debugging

## Debugging

The implementation includes console logs for cache status:
```
Workout plan cache status - Loading: false, Stale: false, Phases: 3
```

These can be removed in production if desired.
