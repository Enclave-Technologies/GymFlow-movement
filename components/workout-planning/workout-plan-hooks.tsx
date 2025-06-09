/**
 * Workout Plan Hooks
 * Contains custom hooks and effects for the workout planner
 */

import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Exercise, Phase } from "./types";
import { saveAll } from "./workout-utils/workout-plan-functions";
import {
    fetchWorkoutPlan,
    refetchWorkoutPlan,
} from "./workout-utils/workout-utils";

export interface UseWorkoutPlanDataProps {
    client_id: string;
    setIsLoading: (value: boolean) => void;
    setPlanId: (value: string | null) => void;
    setLastKnownUpdatedAt: (value: Date | null) => void;
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void;
    latestPhasesRef: React.MutableRefObject<Phase[]>;
    savePerformed: number;
}

export function useWorkoutPlanData({
    client_id,
    setIsLoading,
    setPlanId,
    setLastKnownUpdatedAt,
    updatePhases,
    latestPhasesRef,
    savePerformed,
}: UseWorkoutPlanDataProps) {
    // Initial data fetching
    useEffect(() => {
        fetchWorkoutPlan(
            client_id,
            setIsLoading,
            setPlanId,
            setLastKnownUpdatedAt,
            updatePhases
        );
    }, [
        client_id,
        setIsLoading,
        setPlanId,
        setLastKnownUpdatedAt,
        updatePhases,
    ]);

    // Refetch data when savePerformed changes (after successful save)
    useEffect(() => {
        if (savePerformed > 0) {
            refetchWorkoutPlan(
                client_id,
                setPlanId,
                setLastKnownUpdatedAt,
                updatePhases,
                latestPhasesRef.current
            );
        }
    }, [
        savePerformed,
        client_id,
        setPlanId,
        setLastKnownUpdatedAt,
        updatePhases,
        latestPhasesRef,
    ]);
}

export interface UseLocalStorageBackupProps {
    phases: Phase[];
    client_id: string;
    isLoading: boolean;
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void;
    setHasUnsavedChanges: (value: boolean) => void;
    setSaveStatus: (status: "editing" | "queued" | "saving" | "saved") => void;
}

export function useLocalStorageBackup({
    phases,
    client_id,
    isLoading,
    updatePhases,
    setHasUnsavedChanges,
    setSaveStatus,
}: UseLocalStorageBackupProps) {
    const localStorageKey = `workout-plan-${client_id}`;

    // Save to localStorage immediately for instant persistence feel
    const saveToLocalStorage = useCallback(
        (phases: Phase[]) => {
            try {
                localStorage.setItem(
                    localStorageKey,
                    JSON.stringify({
                        phases,
                        timestamp: Date.now(),
                        version: "1.0",
                    })
                );
                console.log("Saved to localStorage");
                setSaveStatus("queued");
            } catch (error) {
                console.error("Failed to save to localStorage:", error);
            }
        },
        [localStorageKey, setSaveStatus]
    );

    // Auto-save to localStorage whenever phases change
    useEffect(() => {
        if (phases.length > 0) {
            saveToLocalStorage(phases);
        }
    }, [phases, saveToLocalStorage]);

    // Restore from localStorage on initial load
    useEffect(() => {
        try {
            const saved = localStorage.getItem(localStorageKey);
            if (saved && phases.length === 0 && !isLoading) {
                const data = JSON.parse(saved);
                if (data.phases && Array.isArray(data.phases)) {
                    console.log("Restored from localStorage");
                    updatePhases(data.phases);
                    setHasUnsavedChanges(true);
                    setSaveStatus("queued");
                }
            }
        } catch (error) {
            console.error("Failed to restore from localStorage:", error);
        }
    }, [
        localStorageKey,
        phases.length,
        isLoading,
        updatePhases,
        setHasUnsavedChanges,
        setSaveStatus,
    ]);

    return { localStorageKey, saveToLocalStorage };
}

// export interface UseWorkoutPlanValidationProps {}

export function useWorkoutPlanValidation() {
    const validateWorkoutPlan = useCallback((phases: Phase[]) => {
        const errors: string[] = [];

        phases.forEach((phase, phaseIndex) => {
            if (!phase.name?.trim()) {
                errors.push(`Phase ${phaseIndex + 1} is missing a name`);
            }

            phase.sessions.forEach((session, sessionIndex) => {
                if (!session.name?.trim()) {
                    errors.push(
                        `Session ${sessionIndex + 1} in Phase "${
                            phase.name
                        }" is missing a name`
                    );
                }

                session.exercises.forEach((exercise, exerciseIndex) => {
                    if (!exercise.description?.trim()) {
                        errors.push(
                            `Exercise ${exerciseIndex + 1} in Session "${
                                session.name
                            }" is missing a description`
                        );
                    }
                    // Note: Exercise order is not a required field in the current schema
                    // Removed validation for exercise.order as it's not part of the Exercise type
                });
            });
        });

        return {
            isValid: errors.length === 0,
            errors,
        };
    }, []);

    return { validateWorkoutPlan };
}

export interface UseGlobalSaveProps {
    latestPhasesRef: React.MutableRefObject<Phase[]>;
    planId: string | null;
    lastKnownUpdatedAt: Date | null;
    client_id: string;
    trainer_id: string;
    setSaveStatus: (status: "editing" | "queued" | "saving" | "saved") => void;
    setManualSaveInProgress: (value: boolean) => void;
    setSaving: (value: boolean) => void;
    setPlanId: (value: string | null) => void;
    setLastKnownUpdatedAt: (value: Date | null) => void;
    setHasUnsavedChanges: (value: boolean) => void;
    setConflictError: (
        value: { message: string; serverTime: Date } | null
    ) => void;
    setSavePerformed: (value: number | ((prev: number) => number)) => void;
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void;
    validateWorkoutPlan: (phases: Phase[]) => {
        isValid: boolean;
        errors: string[];
    };
    localStorageKey: string;
    invalidateWorkoutPlanCache: (clientId: string) => void;
    setExerciseUpdateQueue: React.Dispatch<
        React.SetStateAction<Map<string, Exercise>>
    >;
}

export function useGlobalSave(props: UseGlobalSaveProps) {
    const handleSaveAll = useCallback(async () => {
        const currentPhases = props.latestPhasesRef.current;
        console.log("Saving phases:", currentPhases.length);

        // Preemptive validation
        const validation = props.validateWorkoutPlan(currentPhases);
        if (!validation.isValid) {
            toast.error(`Cannot save: ${validation.errors[0]}`);
            return;
        }

        props.setSaveStatus("saving");
        props.setManualSaveInProgress(true);

        try {
            await saveAll(
                currentPhases,
                props.planId,
                props.lastKnownUpdatedAt,
                props.client_id,
                props.setSaving,
                props.setPlanId,
                props.setLastKnownUpdatedAt,
                props.setHasUnsavedChanges,
                props.setConflictError,
                props.setSavePerformed,
                props.updatePhases,
                props.trainer_id
            );
            props.setSaveStatus("saved");

            // Invalidate the workout plan cache
            props.invalidateWorkoutPlanCache(props.client_id);
            console.log("Invalidated workout plan cache after successful save");

            // Clear localStorage after successful save
            try {
                localStorage.removeItem(props.localStorageKey);
                console.log("Cleared localStorage after successful save");
            } catch (error) {
                console.error("Failed to clear localStorage:", error);
            }

            // Clear the exercise update queue
            props.setExerciseUpdateQueue(new Map());
            console.log("Cleared exercise update queue after manual save");
        } catch (error) {
            console.error("Save failed:", error);
            props.setSaveStatus("queued");
        } finally {
            props.setManualSaveInProgress(false);
        }
    }, [props]);

    return { handleSaveAll };
}

export interface UseBackgroundSyncProps {
    exerciseUpdateQueue: Map<string, Exercise>;
    backgroundSyncActive: boolean;
    manualSaveInProgress: boolean;
    setBackgroundSyncActive: (value: boolean) => void;
    setExerciseUpdateQueue: React.Dispatch<
        React.SetStateAction<Map<string, Exercise>>
    >;
    handleSaveAll: () => Promise<void>;
}

export function useBackgroundSync({
    exerciseUpdateQueue,
    backgroundSyncActive,
    manualSaveInProgress,
    setBackgroundSyncActive,
    setExerciseUpdateQueue,
    handleSaveAll,
}: UseBackgroundSyncProps) {
    const processExerciseUpdateQueue = useCallback(async () => {
        if (
            exerciseUpdateQueue.size === 0 ||
            backgroundSyncActive ||
            manualSaveInProgress
        ) {
            return;
        }

        setBackgroundSyncActive(true);
        console.log(
            `Processing ${exerciseUpdateQueue.size} queued exercise updates (legacy mode)`
        );

        try {
            // Fallback to full save for any remaining legacy queue items
            await handleSaveAll();

            // Clear the queue after successful save
            setExerciseUpdateQueue(new Map());
            console.log("Exercise update queue processed successfully");
        } catch (error) {
            console.error("Failed to process exercise update queue:", error);
        } finally {
            setBackgroundSyncActive(false);
        }
    }, [
        exerciseUpdateQueue,
        backgroundSyncActive,
        manualSaveInProgress,
        handleSaveAll,
        setBackgroundSyncActive,
        setExerciseUpdateQueue,
    ]);

    return { processExerciseUpdateQueue };
}

export interface UseAutoSaveProps {
    activeEditingSessions: Set<string>;
    exerciseUpdateQueue: Map<string, Exercise>;
    manualSaveInProgress: boolean;
    backgroundSyncActive: boolean;
    processExerciseUpdateQueue: () => Promise<void>;
}

export function useAutoSave({
    activeEditingSessions,
    exerciseUpdateQueue,
    manualSaveInProgress,
    backgroundSyncActive,
    processExerciseUpdateQueue,
}: UseAutoSaveProps) {
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Smart auto-save with editing-aware debouncing
    const scheduleAutoSave = useCallback(() => {
        // Clear any existing timer
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        // Determine delay based on whether editing is active
        const baseDelay = 5000; // 5 seconds
        const isActivelyEditing = activeEditingSessions.size > 0;
        const delay = isActivelyEditing ? baseDelay * 2 : baseDelay; // 10 seconds if editing, 5 if not

        console.log(
            `Scheduling auto-save in ${delay}ms (editing: ${isActivelyEditing})`
        );

        autoSaveTimerRef.current = setTimeout(() => {
            if (
                exerciseUpdateQueue.size > 0 &&
                !manualSaveInProgress &&
                !backgroundSyncActive
            ) {
                // Double-check if still editing before processing
                const stillEditing = activeEditingSessions.size > 0;
                if (stillEditing) {
                    console.log("Still editing, rescheduling auto-save...");
                    scheduleAutoSave(); // Reschedule if still editing
                } else {
                    console.log("Processing auto-save queue");
                    processExerciseUpdateQueue();
                }
            }
        }, delay);
    }, [
        activeEditingSessions.size,
        exerciseUpdateQueue.size,
        manualSaveInProgress,
        backgroundSyncActive,
        processExerciseUpdateQueue,
    ]);

    // Schedule auto-save when queue changes
    useEffect(() => {
        if (exerciseUpdateQueue.size > 0) {
            scheduleAutoSave();
        }

        // Cleanup timer on unmount
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [exerciseUpdateQueue.size, scheduleAutoSave]);

    return { scheduleAutoSave };
}

export interface UseEditingSessionTrackingProps {
    setActiveEditingSessions: React.Dispatch<React.SetStateAction<Set<string>>>;
    exerciseUpdateQueue: Map<string, Exercise>;
    scheduleAutoSave: () => void;
    processExerciseUpdateQueue: () => Promise<void>;
}

export function useEditingSessionTracking({
    setActiveEditingSessions,
    exerciseUpdateQueue,
    scheduleAutoSave,
    processExerciseUpdateQueue,
}: UseEditingSessionTrackingProps) {
    const handleEditingStart = useCallback(
        (exerciseId: string) => {
            setActiveEditingSessions((prev) => {
                const newSet = new Set(prev);
                newSet.add(exerciseId);
                return newSet;
            });
            console.log(`Started editing exercise: ${exerciseId}`);
        },
        [setActiveEditingSessions]
    );

    const handleEditingEnd = useCallback(
        (exerciseId: string) => {
            setActiveEditingSessions((prev) => {
                const newSet = new Set(prev);
                newSet.delete(exerciseId);
                return newSet;
            });
            console.log(`Ended editing exercise: ${exerciseId}`);

            // If no more active editing sessions and there are queued updates, process them
            setTimeout(() => {
                setActiveEditingSessions((currentSessions) => {
                    if (
                        exerciseUpdateQueue.size > 0 &&
                        currentSessions.size === 0 // Check if no more editing sessions
                    ) {
                        console.log(
                            "No more editing sessions, processing queue"
                        );
                        processExerciseUpdateQueue();
                    }
                    return currentSessions;
                });
            }, 1000); // Small delay to allow for rapid successive edits
        },
        [
            setActiveEditingSessions,
            exerciseUpdateQueue.size,
            processExerciseUpdateQueue,
        ]
    );

    const handleEditingChange = useCallback(() => {
        // Reschedule auto-save when user makes changes
        if (exerciseUpdateQueue.size > 0) {
            scheduleAutoSave();
        }
    }, [exerciseUpdateQueue.size, scheduleAutoSave]);

    return {
        handleEditingStart,
        handleEditingEnd,
        handleEditingChange,
    };
}
