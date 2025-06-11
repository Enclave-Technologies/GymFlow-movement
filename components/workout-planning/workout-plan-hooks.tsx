/**
 * Workout Plan Hooks
 * Contains custom hooks and effects for the workout planner
 */

import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Phase } from "./types";

import { fetchWorkoutPlan } from "./workout-utils/workout-utils";

export interface UseWorkoutPlanDataProps {
    client_id: string;
    setIsLoading: (value: boolean) => void;
    setPlanId: (value: string | null) => void;
    setLastKnownUpdatedAt: (value: Date | null) => void;
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void;
}

export function useWorkoutPlanData({
    client_id,
    setIsLoading,
    setPlanId,
    setLastKnownUpdatedAt,
    updatePhases,
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

    // Automatic refetch after save removed to prevent circular dependency loop
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

    // Automatic localStorage save removed to prevent circular dependency loop

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
}

export function useGlobalSave() {
    const handleSaveAll = useCallback(async () => {
        console.log(
            "🚫 Save function called - temporarily disabled to debug continuous save loop"
        );
        toast.info("Save functionality temporarily disabled for debugging");
        return;

        // Original save code commented out for debugging
        /*
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
        } catch (error) {
            console.error("Save failed:", error);
            props.setSaveStatus("queued");
        } finally {
            props.setManualSaveInProgress(false);
        }
        */
    }, []);

    return { handleSaveAll };
}

// Background sync functionality removed - saves will be triggered manually via button clicks

// Auto-save functionality removed - saves will be triggered manually via button clicks

// Editing session tracking removed - no longer needed without auto-save
