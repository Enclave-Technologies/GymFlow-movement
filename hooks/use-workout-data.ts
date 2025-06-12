"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
    logWorkoutSet,
    // updateWorkoutSet,
    deleteWorkoutSet,
} from "@/actions/workout_tracker_actions";
import {
    Exercise,
    ExerciseSet,
    WorkoutData,
    PastSessionDetail,
} from "@/types/workout-tracker-types";
import { useReliableSave } from "./use-reliable-save";

interface UseWorkoutDataProps {
    initialWorkoutData: WorkoutData;
    workoutSessionDetails: PastSessionDetail[];
    workoutSessionLogId: string | null;
}

export function useWorkoutData({
    initialWorkoutData,
    workoutSessionDetails,
    workoutSessionLogId,
}: UseWorkoutDataProps) {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize reliable save system
    const { isSaving, saveStatus, pendingOperations, queueOperation, saveNow } =
        useReliableSave({
            workoutSessionLogId,
            onSaveSuccess: (operation) => {
                console.log("Save successful:", operation);
                // Update UI to reflect successful save
                setExercises((prev) =>
                    prev.map((ex) =>
                        ex.id === operation.exerciseId
                            ? {
                                  ...ex,
                                  sets: ex.sets.map((set) =>
                                      set.id === operation.setId
                                          ? { ...set, isNew: false }
                                          : set
                                  ),
                              }
                            : ex
                    )
                );
            },
            onSaveError: (operation, error) => {
                console.error("Save failed:", operation, error);
                toast.error(
                    `Failed to save set ${operation.data.setNumber}. Retrying...`
                );
            },
        });

    // Load workout data on component mount
    useEffect(() => {
        const loadWorkoutData = async () => {
            setIsLoading(true);

            try {
                if (initialWorkoutData) {
                    // Transform workout exercises into Exercise format
                    const transformedExercises: Exercise[] =
                        initialWorkoutData.exercises.map((ex, index) => {
                            // Format set and rep ranges
                            const setRange =
                                ex.setsMin && ex.setsMax
                                    ? ex.setsMin === ex.setsMax
                                        ? `${ex.setsMin}`
                                        : `${ex.setsMin}-${ex.setsMax}`
                                    : "3-5";

                            const repRange =
                                ex.repsMin && ex.repsMax
                                    ? ex.repsMin === ex.repsMax
                                        ? `${ex.repsMin}`
                                        : `${ex.repsMin}-${ex.repsMax}`
                                    : "8-12";

                            const restRange =
                                ex.restMin && ex.restMax
                                    ? ex.restMin === ex.restMax
                                        ? `${ex.restMin}s`
                                        : `${ex.restMin}-${ex.restMax}s`
                                    : "45-60s";

                            // Generate initial sets based on the minimum sets
                            const initialSets: ExerciseSet[] = [];
                            const numSets = ex.setsMin || 3;

                            for (let i = 0; i < numSets; i++) {
                                initialSets.push({
                                    id: `temp-${ex.planExerciseId}-${i}`,
                                    reps: "",
                                    weight: "",
                                    isNew: true,
                                });
                            }

                            return {
                                id: ex.planExerciseId,
                                name:
                                    ex.exerciseDetails?.exerciseName ||
                                    `Exercise ${index + 1}`,
                                order: ex.setOrderMarker || `${index + 1}`,
                                sets: initialSets,
                                setRange,
                                repRange,
                                tempo: ex.tempo || "3 0 1 0",
                                restTime: restRange,
                                notes: ex.notes || "",
                                isExpanded: true, // Start expanded
                                setOrderMarker: ex.setOrderMarker,
                                customizations: ex.customizations || "",
                            };
                        });

                    // Load existing workout session details if available
                    if (workoutSessionDetails.length > 0) {
                        // Group details by exercise name and merge with transformed exercises
                        const detailsByExercise = workoutSessionDetails.reduce(
                            (acc, detail) => {
                                if (!acc[detail.exerciseName]) {
                                    acc[detail.exerciseName] = [];
                                }
                                acc[detail.exerciseName].push(detail);
                                return acc;
                            },
                            {} as Record<string, typeof workoutSessionDetails>
                        );

                        // Update exercises with existing data
                        transformedExercises.forEach((exercise) => {
                            const existingDetails =
                                detailsByExercise[exercise.name];
                            if (existingDetails) {
                                // Replace the temp sets with actual data
                                exercise.sets = existingDetails.map(
                                    (detail) => ({
                                        id: detail.workoutDetailId,
                                        reps: detail.reps?.toString() || "",
                                        weight: detail.weight?.toString() || "",
                                        isNew: false, // These are existing sets
                                    })
                                );
                            }
                        });
                    }

                    // Sort exercises by setOrderMarker in proper alphanumeric order
                    const sortedExercises = transformedExercises.sort(
                        (a, b) => {
                            const orderA = a.setOrderMarker || a.order || "999";
                            const orderB = b.setOrderMarker || b.order || "999";
                            return orderA.localeCompare(orderB, undefined, {
                                numeric: true,
                                sensitivity: "base",
                            });
                        }
                    );

                    setExercises(sortedExercises);
                }
            } catch (error) {
                console.error("Error loading workout data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadWorkoutData();
    }, [initialWorkoutData, workoutSessionDetails]);

    const toggleExerciseExpansion = (exerciseId: string) => {
        setExercises(
            exercises.map((ex) =>
                ex.id === exerciseId
                    ? { ...ex, isExpanded: !ex.isExpanded }
                    : ex
            )
        );
    };

    const updateSetValue = useCallback(
        (
            exerciseId: string,
            setId: string,
            field: "reps" | "weight" | "notes",
            value: string
        ) => {
            // Update local state first for immediate UI feedback (optimistic update)
            setExercises((prev) =>
                prev.map((ex) =>
                    ex.id === exerciseId
                        ? {
                              ...ex,
                              sets: ex.sets.map((set) =>
                                  set.id === setId
                                      ? { ...set, [field]: value }
                                      : set
                              ),
                          }
                        : ex
                )
            );

            // Don't save if workoutSessionLogId is not available
            if (!workoutSessionLogId) {
                console.warn("No workout session log ID available for saving");
                return;
            }

            // Find the exercise and set for database update
            const exercise = exercises.find((ex) => ex.id === exerciseId);
            const set = exercise?.sets.find((s) => s.id === setId);

            if (!exercise || !set) {
                console.error("Exercise or set not found for update");
                return;
            }

            // Get updated values
            const updatedSet = { ...set, [field]: value };
            const setNumber = exercise.sets.indexOf(set) + 1;

            // Queue the save operation for existing sets
            if (!set.isNew && !setId.startsWith("temp-")) {
                queueOperation({
                    id: `update-${setId}-${Date.now()}`,
                    type: "update",
                    exerciseId,
                    setId,
                    data: {
                        exerciseName: exercise.name,
                        setNumber,
                        reps: parseInt(updatedSet.reps) || 0,
                        weight: parseFloat(updatedSet.weight) || 0,
                        notes: exercise.notes,
                        setOrderMarker: exercise.setOrderMarker,
                    },
                });
            }
        },
        [exercises, workoutSessionLogId, queueOperation]
    );

    const addSet = async (exerciseId: string) => {
        if (!workoutSessionLogId) {
            toast.error("Workout session not started");
            return;
        }

        const exercise = exercises.find((ex) => ex.id === exerciseId);
        if (!exercise) return;

        // Generate a temporary ID for the new set
        const tempId = `temp-${exerciseId}-${Date.now()}`;

        // Update local state first
        setExercises(
            exercises.map((ex) =>
                ex.id === exerciseId
                    ? {
                          ...ex,
                          sets: [
                              ...ex.sets,
                              {
                                  id: tempId,
                                  reps: "0",
                                  weight: "0",
                                  isNew: true,
                              },
                          ],
                      }
                    : ex
            )
        );

        try {
            // Log the new set to the database
            const setNumber = exercise.sets.length + 1;
            const result = await logWorkoutSet(
                workoutSessionLogId,
                exercise.name,
                setNumber,
                0, // reps (default to 0)
                0, // weight (default to 0)
                exercise.notes,
                exercise.setOrderMarker
            );

            // Update the temporary ID with the real one from the database
            setExercises((prev) =>
                prev.map((ex) =>
                    ex.id === exerciseId
                        ? {
                              ...ex,
                              sets: ex.sets.map((s) =>
                                  s.id === tempId
                                      ? {
                                            ...s,
                                            id: result.workoutDetailId,
                                            isNew: false,
                                        }
                                      : s
                              ),
                          }
                        : ex
                )
            );
        } catch (error) {
            console.error("Error adding set:", error);
            toast.error("Failed to add set");

            // Remove the temporary set on error
            setExercises((prev) =>
                prev.map((ex) =>
                    ex.id === exerciseId
                        ? {
                              ...ex,
                              sets: ex.sets.filter((s) => s.id !== tempId),
                          }
                        : ex
                )
            );
        }
    };

    const deleteSet = async (exerciseId: string, setId: string) => {
        const exercise = exercises.find((ex) => ex.id === exerciseId);
        const set = exercise?.sets.find((s) => s.id === setId);

        if (!set) return;

        // Update local state first
        setExercises(
            exercises.map((ex) =>
                ex.id === exerciseId
                    ? {
                          ...ex,
                          sets: ex.sets.filter((s) => s.id !== setId),
                      }
                    : ex
            )
        );

        // If it's not a new set, delete from database
        if (!set.isNew && !setId.startsWith("temp-")) {
            try {
                await deleteWorkoutSet(setId);
            } catch (error) {
                console.error("Error deleting set:", error);
                toast.error("Failed to delete set");

                // Restore the set on error
                setExercises((prev) =>
                    prev.map((ex) =>
                        ex.id === exerciseId
                            ? {
                                  ...ex,
                                  sets: [...ex.sets, set].sort((a, b) =>
                                      a.id.localeCompare(b.id)
                                  ),
                              }
                            : ex
                    )
                );
            }
        }
    };

    const updateNotes = (exerciseId: string, notes: string) => {
        setExercises(
            exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, notes } : ex
            )
        );
    };

    const saveUnsavedSets = async () => {
        if (!workoutSessionLogId) {
            throw new Error("No active workout session");
        }

        const unsavedSets: { exercise: Exercise; set: ExerciseSet }[] = [];

        // Collect all unsaved sets
        exercises.forEach((exercise) => {
            exercise.sets.forEach((set) => {
                if (set.isNew) {
                    unsavedSets.push({ exercise, set });
                }
            });
        });

        // Save each unsaved set
        for (const { exercise, set } of unsavedSets) {
            const setNumber = exercise.sets.indexOf(set) + 1;
            const result = await logWorkoutSet(
                workoutSessionLogId,
                exercise.name,
                setNumber,
                parseInt(set.reps) || 0,
                parseInt(set.weight) || 0,
                exercise.notes,
                exercise.setOrderMarker
            );

            // Update the set to mark it as saved
            setExercises((prev) =>
                prev.map((ex) =>
                    ex.id === exercise.id
                        ? {
                              ...ex,
                              sets: ex.sets.map((s) =>
                                  s.id === set.id
                                      ? {
                                            ...s,
                                            id: result.workoutDetailId,
                                            isNew: false,
                                        }
                                      : s
                              ),
                          }
                        : ex
                )
            );
        }

        return unsavedSets.length;
    };

    return {
        exercises,
        isLoading,
        toggleExerciseExpansion,
        updateSetValue,
        addSet,
        deleteSet,
        updateNotes,
        saveUnsavedSets,
        // Reliable save status
        isSaving,
        saveStatus,
        pendingOperations,
        saveNow,
    };
}
