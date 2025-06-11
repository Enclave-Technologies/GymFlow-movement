/**
 * Exercise Edit State Management Hook
 *
 * Industry standard custom hook for managing exercise creation vs editing state.
 * Provides centralized state logic with performance optimizations.
 */

import { useState, useCallback, useRef } from "react";
import { Exercise } from "../types";

export interface ExerciseEditState {
    sessionId: string;
    exerciseId: string;
    isNew: boolean;
    originalData?: Exercise;
}

export interface UseExerciseEditStateReturn {
    // State
    exerciseEditState: ExerciseEditState | null;

    // Actions
    startCreatingExercise: (
        sessionId: string,
        exerciseId: string,
        originalData?: Exercise
    ) => void;
    startEditingExercise: (
        sessionId: string,
        exerciseId: string,
        originalData: Exercise
    ) => void;
    clearExerciseEditState: () => void;
    markExerciseAsSaved: (sessionId: string, exerciseId: string) => void;

    // Utilities
    isCreatingExercise: (sessionId: string, exerciseId: string) => boolean;
    isEditingExercise: (sessionId: string, exerciseId: string) => boolean;
    getCurrentEditState: () => ExerciseEditState | null;
}

/**
 * Custom hook for managing exercise edit state
 *
 * This hook provides a centralized way to manage whether an exercise is being
 * created (new) or edited (existing), following React best practices for
 * performance and reliability.
 */
export function useExerciseEditState(): UseExerciseEditStateReturn {
    const [exerciseEditState, setExerciseEditState] =
        useState<ExerciseEditState | null>(null);

    // Use ref to avoid stale closures in callbacks
    const stateRef = useRef<ExerciseEditState | null>(null);
    stateRef.current = exerciseEditState;

    /**
     * Start creating a new exercise
     * Called when "Add Exercise" button is clicked
     */
    const startCreatingExercise = useCallback(
        (sessionId: string, exerciseId: string, originalData?: Exercise) => {
            const newState: ExerciseEditState = {
                sessionId,
                exerciseId,
                isNew: true,
                originalData,
            };

            setExerciseEditState(newState);
            stateRef.current = newState;

            console.log("🆕 Started creating new exercise:", {
                sessionId,
                exerciseId,
            });
        },
        []
    );

    /**
     * Start editing an existing exercise
     * Called when "Edit" button is clicked on existing exercise
     */
    const startEditingExercise = useCallback(
        (sessionId: string, exerciseId: string, originalData: Exercise) => {
            const newState: ExerciseEditState = {
                sessionId,
                exerciseId,
                isNew: false,
                originalData,
            };

            setExerciseEditState(newState);
            stateRef.current = newState;

            console.log("✏️ Started editing existing exercise:", {
                sessionId,
                exerciseId,
            });
        },
        []
    );

    /**
     * Clear the exercise edit state
     * Called when editing is cancelled or completed
     */
    const clearExerciseEditState = useCallback(() => {
        setExerciseEditState(null);
        stateRef.current = null;

        console.log("🧹 Cleared exercise edit state");
    }, []);

    /**
     * Check if currently creating a specific exercise
     */
    const isCreatingExercise = useCallback(
        (sessionId: string, exerciseId: string): boolean => {
            const current = stateRef.current;
            return (
                current !== null &&
                current.sessionId === sessionId &&
                current.exerciseId === exerciseId &&
                current.isNew === true
            );
        },
        []
    );

    /**
     * Check if currently editing a specific exercise
     */
    const isEditingExercise = useCallback(
        (sessionId: string, exerciseId: string): boolean => {
            const current = stateRef.current;
            return (
                current !== null &&
                current.sessionId === sessionId &&
                current.exerciseId === exerciseId &&
                current.isNew === false
            );
        },
        []
    );

    /**
     * Mark an exercise as saved (convert from new to existing)
     * Called after successful save to database
     */
    const markExerciseAsSaved = useCallback(
        (sessionId: string, exerciseId: string) => {
            const current = stateRef.current;
            if (
                current &&
                current.sessionId === sessionId &&
                current.exerciseId === exerciseId &&
                current.isNew === true
            ) {
                const updatedState: ExerciseEditState = {
                    ...current,
                    isNew: false, // Mark as no longer new
                };

                setExerciseEditState(updatedState);
                stateRef.current = updatedState;

                console.log("✅ Exercise marked as saved (no longer new):", {
                    sessionId,
                    exerciseId,
                });
            }
        },
        []
    );

    /**
     * Get current edit state (for debugging/logging)
     */
    const getCurrentEditState = useCallback((): ExerciseEditState | null => {
        return stateRef.current;
    }, []);

    return {
        // State
        exerciseEditState,

        // Actions
        startCreatingExercise,
        startEditingExercise,
        clearExerciseEditState,
        markExerciseAsSaved,

        // Utilities
        isCreatingExercise,
        isEditingExercise,
        getCurrentEditState,
    };
}

/**
 * Type guard to check if exercise edit state is for creation
 */
export function isCreationState(
    state: ExerciseEditState | null
): state is ExerciseEditState & { isNew: true } {
    return state !== null && state.isNew === true;
}

/**
 * Type guard to check if exercise edit state is for editing
 */
export function isEditingState(
    state: ExerciseEditState | null
): state is ExerciseEditState & { isNew: false } {
    return state !== null && state.isNew === false;
}
