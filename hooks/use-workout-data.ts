"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
    logWorkoutSet,
    updateWorkoutSet,
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
    const [isSyncing, setIsSyncing] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Debounce timer ref
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const triggerDebouncedSaveRef = useRef<() => void>(() => {});
    const DEBOUNCE_DELAY = 5000; // 5 seconds

    // Initialize reliable save system
    const { isSaving, saveStatus, pendingOperations, saveNow } =
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
                                    : "0s";

                            // Generate initial sets based on the maximum sets (to match UI expectations)
                            const initialSets: ExerciseSet[] = [];
                            const maxSets =
                                ex.setsMax ||
                                parseInt(setRange.split("-")[1] || setRange) ||
                                3;
                            const minSets = ex.setsMin || 3;
                            // Use the maximum sets to determine number of initial rows
                            const numSets = Math.max(maxSets, minSets);

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
                                        notes: detail.coachNote || "",
                                        isNew: false, // These are existing sets
                                    })
                                );

                                console.log(
                                    `📥 Loaded ${existingDetails.length} existing sets for ${exercise.name}:`,
                                    existingDetails
                                        .map(
                                            (d) =>
                                                `${d.reps} reps @ ${d.weight} weight`
                                        )
                                        .join(", ")
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

    // triggerDebouncedSave will be defined after save functions

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

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
            // Handle exercise-level notes with special setId
            if (setId === "exercise-notes" && field === "notes") {
                setExercises((prev) =>
                    prev.map((ex) =>
                        ex.id === exerciseId ? { ...ex, notes: value } : ex
                    )
                );
                return; // Don't save exercise-level notes to database immediately
            }

            // Don't save if workoutSessionLogId is not available
            if (!workoutSessionLogId) {
                console.warn("No workout session log ID available for saving");
                return;
            }

            // Update local state and get the updated exercise/set data within the callback
            // This ensures we use the fresh state, not stale closure data
            setExercises((prev) => {
                // Find the exercise and set from the current (fresh) state
                const exercise = prev.find((ex) => ex.id === exerciseId);
                const set = exercise?.sets.find((s) => s.id === setId);

                if (!exercise || !set) {
                    console.error("Exercise or set not found for update");
                    return prev; // Return unchanged state
                }

                // Update the state with the new value
                const updatedExercises = prev.map((ex) =>
                    ex.id === exerciseId
                        ? {
                              ...ex,
                              sets: ex.sets.map((s) =>
                                  s.id === setId ? { ...s, [field]: value } : s
                              ),
                          }
                        : ex
                );

                // Trigger debounced auto-save after state update
                // Use setTimeout to ensure this runs after the state update is complete
                setTimeout(() => {
                    triggerDebouncedSaveRef.current();
                }, 0);

                return updatedExercises;
            });
        },
        [workoutSessionLogId]
    );

    // autoSaveOnDefocus removed - using debounced save instead

    const addSet = async (exerciseId: string) => {
        if (!workoutSessionLogId) {
            toast.error("Workout session not started");
            return;
        }

        const exercise = exercises.find((ex) => ex.id === exerciseId);
        if (!exercise) return;

        // Generate a temporary ID for the new set
        const tempId = `temp-${exerciseId}-${Date.now()}`;

        // Calculate set number before state update to avoid stale closure issues
        const setNumber = exercise.sets.length + 1;

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
        setExercises((prev) =>
            prev.map((ex) =>
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

    const saveUnsavedSets = useCallback(async () => {
        if (!workoutSessionLogId) {
            throw new Error("No active workout session");
        }

        const unsavedSets: { exercise: Exercise; set: ExerciseSet }[] = [];

        // Collect all unsaved sets that have meaningful data (reps > 0 OR weight > 0 OR notes)
        exercises.forEach((exercise) => {
            exercise.sets.forEach((set) => {
                if (set.isNew) {
                    const hasReps = parseInt(set.reps) > 0;
                    const hasWeight = parseFloat(set.weight) > 0;
                    const hasNotes = (set.notes || "").trim().length > 0;
                    const hasMeaningfulData = hasReps || hasWeight || hasNotes;

                    if (hasMeaningfulData) {
                        unsavedSets.push({ exercise, set });
                    }
                }
            });
        });

        // Log the new sets data that will be created in DB
        const newSetsData = unsavedSets.map(({ exercise, set }) => {
            const setNumber = exercise.sets.indexOf(set) + 1;
            return {
                setId: set.id,
                exerciseName: exercise.name,
                setNumber,
                currentData: {
                    reps: set.reps,
                    weight: set.weight,
                    notes: set.notes || null,
                    exerciseNotes: exercise.notes || null,
                },
                dataToSend: {
                    workoutSessionLogId,
                    exerciseName: exercise.name,
                    setNumber,
                    reps: parseInt(set.reps) || 0,
                    weight: parseFloat(set.weight) || 0,
                    coachNote: exercise.notes,
                    setOrderMarker: exercise.setOrderMarker,
                },
                isNew: set.isNew,
            };
        });

        if (newSetsData.length > 0) {
            console.log("🆕 NEW SETS - Sets to be created in database:");
            console.log(JSON.stringify(newSetsData, null, 2));
        }

        // Save each unsaved set
        for (const { exercise, set } of unsavedSets) {
            const setNumber = exercise.sets.indexOf(set) + 1;
            const result = await logWorkoutSet(
                workoutSessionLogId,
                exercise.name,
                setNumber,
                parseInt(set.reps) || 0,
                parseFloat(set.weight) || 0,
                set.notes || undefined, // Use individual set notes, not exercise notes
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
    }, [workoutSessionLogId, exercises]);

    const saveAllSetDetails = useCallback(async () => {
        if (!workoutSessionLogId) {
            throw new Error("No active workout session");
        }

        const setsToUpdate: {
            exercise: Exercise;
            set: ExerciseSet;
            setNumber: number;
        }[] = [];

        // Collect all existing sets that have non-zero reps (indicating they have been worked out)
        exercises.forEach((exercise) => {
            exercise.sets.forEach((set, index) => {
                // Only update existing sets (not new ones) that have non-zero reps
                if (
                    !set.isNew &&
                    !set.id.startsWith("temp-") &&
                    parseInt(set.reps) > 0
                ) {
                    setsToUpdate.push({
                        exercise,
                        set,
                        setNumber: index + 1,
                    });
                }
            });
        });

        console.log(`Found ${setsToUpdate.length} sets to update with details`);

        // Log the queue data that will be sent to DB
        const queueData = setsToUpdate.map(({ exercise, set, setNumber }) => ({
            setId: set.id,
            exerciseName: exercise.name,
            setNumber,
            currentData: {
                reps: set.reps,
                weight: set.weight,
                notes: set.notes || null, // Individual set notes
            },
            dataToSend: {
                reps: parseInt(set.reps) || 0,
                weight: parseFloat(set.weight) || 0,
                coachNote: set.notes || null, // Prioritize individual set notes
            },
            isNew: set.isNew,
            isTemp: set.id.startsWith("temp-"),
        }));

        console.log("🔄 SAVE QUEUE - Sets to be updated in database:");
        console.log(JSON.stringify(queueData, null, 2));

        // Update each set with current details
        for (const { exercise, set, setNumber } of setsToUpdate) {
            try {
                await updateWorkoutSet(set.id, {
                    reps: parseInt(set.reps) || 0,
                    weight: parseFloat(set.weight) || 0,
                    coachNote: set.notes || null, // Use individual set notes only
                });
                console.log(
                    `✅ Updated set ${setNumber} for ${exercise.name}: ${
                        set.reps
                    } reps @ ${set.weight} weight, notes: "${
                        set.notes || "none"
                    }"`
                );
            } catch (error) {
                console.error(
                    `❌ Failed to update set ${setNumber} for ${exercise.name}:`,
                    error
                );
                throw error; // Re-throw to handle in the calling function
            }
        }

        return setsToUpdate.length;
    }, [workoutSessionLogId, exercises]);

    // Debounced auto-save function (defined after save functions)
    const triggerDebouncedSave = useCallback(() => {
        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Mark as having unsaved changes
        setHasUnsavedChanges(true);

        // Set new timer
        debounceTimerRef.current = setTimeout(async () => {
            console.log("🔄 Debounced auto-save triggered");
            setIsSyncing(true);

            try {
                // Save all unsaved sets (new sets)
                const newSetsSaved = await saveUnsavedSets();

                // Save all existing set details
                const detailsSaved = await saveAllSetDetails();

                // Trigger any pending queue operations
                saveNow();

                const totalSaved = newSetsSaved + detailsSaved;
                if (totalSaved > 0) {
                    console.log(`✅ Auto-saved ${totalSaved} changes`);
                }

                setHasUnsavedChanges(false);
            } catch (error) {
                console.error("❌ Auto-save failed:", error);
            } finally {
                setIsSyncing(false);
            }
        }, DEBOUNCE_DELAY);

        console.log(
            `⏱️ Auto-save scheduled in ${DEBOUNCE_DELAY / 1000} seconds`
        );
    }, [saveUnsavedSets, saveAllSetDetails, saveNow, DEBOUNCE_DELAY]);

    // Update the ref whenever the function changes
    useEffect(() => {
        triggerDebouncedSaveRef.current = triggerDebouncedSave;
    }, [triggerDebouncedSave]);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return {
        exercises,
        isLoading,
        toggleExerciseExpansion,
        updateSetValue,
        addSet,
        deleteSet,
        saveUnsavedSets,
        saveAllSetDetails,
        // Reliable save status
        isSaving,
        saveStatus,
        pendingOperations,
        saveNow,
        // Debounced auto-save
        isSyncing,
        hasUnsavedChanges,
        triggerDebouncedSave,
    };
}
