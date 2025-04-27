"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    fetchWorkoutTrackerData,
    startWorkoutSession,
    logWorkoutSet,
    updateWorkoutSet,
    deleteWorkoutSet,
    endWorkoutSession,
} from "@/actions/workout_tracker_actions";

interface ExerciseSet {
    id: string; // Changed from number to string to match DB IDs
    reps: string;
    weight: string;
    completed?: boolean;
    isNew?: boolean; // Flag to track if this is a newly added set not yet saved to DB
}

interface Exercise {
    id: string;
    name: string;
    order: string;
    sets: ExerciseSet[];
    setRange: string;
    repRange: string;
    tempo: string;
    restTime: string;
    notes: string;
    isExpanded: boolean;
    setOrderMarker?: string; // Added setOrderMarker property
}

const RecordWorkoutPage = () => {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const phaseId = searchParams.get("phaseId");
    const clientId = searchParams.get("clientId");

    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [phaseName, setPhaseName] = useState("Untitled Phase");
    const [sessionName, setSessionName] = useState("Untitled Session");
    const [timer, setTimer] = useState("00:00");
    const [isQuitDialogOpen, setIsQuitDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [workoutSessionLogId, setWorkoutSessionLogId] = useState<
        string | null
    >(null);
    const [isLoading, setIsLoading] = useState(true);

    // Function to save workout state to localStorage
    const saveWorkoutStateToLocalStorage = useCallback(() => {
        if (!sessionId || !workoutSessionLogId) return;

        const workoutState = {
            sessionId,
            phaseId,
            clientId,
            workoutSessionLogId,
            phaseName,
            sessionName,
            exercises,
            startTime: Date.now() - parseTimer(timer) * 1000, // Calculate the original start time
        };

        localStorage.setItem(
            `workout-state-${sessionId}`,
            JSON.stringify(workoutState)
        );
    }, [
        sessionId,
        phaseId,
        clientId,
        workoutSessionLogId,
        phaseName,
        sessionName,
        exercises,
        timer,
    ]);

    // Function to parse timer string to seconds
    const parseTimer = (timerStr: string): number => {
        const [minutes, seconds] = timerStr.split(":").map(Number);
        return minutes * 60 + seconds;
    };

    // Save workout state to localStorage whenever relevant state changes
    useEffect(() => {
        if (workoutSessionLogId && exercises.length > 0) {
            saveWorkoutStateToLocalStorage();
        }
    }, [exercises, workoutSessionLogId, saveWorkoutStateToLocalStorage]);

    // Load workout data from API or localStorage
    useEffect(() => {
        const loadWorkoutData = async () => {
            if (!sessionId) {
                toast.error("Session ID is required");
                return;
            }

            try {
                setIsLoading(true);

                // Check if we have saved state in localStorage
                const savedStateJson = localStorage.getItem(
                    `workout-state-${sessionId}`
                );

                if (savedStateJson) {
                    try {
                        const savedState = JSON.parse(savedStateJson);

                        // Verify this is the same workout session
                        if (
                            savedState.sessionId === sessionId &&
                            savedState.workoutSessionLogId &&
                            savedState.exercises
                        ) {
                            // Restore the saved state
                            setWorkoutSessionLogId(
                                savedState.workoutSessionLogId
                            );
                            setPhaseName(
                                savedState.phaseName || "Untitled Phase"
                            );
                            setSessionName(
                                savedState.sessionName || "Untitled Session"
                            );
                            setExercises(savedState.exercises);

                            // Calculate elapsed time for the timer
                            if (savedState.startTime) {
                                const elapsedMs =
                                    Date.now() - savedState.startTime;
                                const minutes = Math.floor(elapsedMs / 60000);
                                const seconds = Math.floor(
                                    (elapsedMs % 60000) / 1000
                                );
                                setTimer(
                                    `${minutes
                                        .toString()
                                        .padStart(2, "0")}:${seconds
                                        .toString()
                                        .padStart(2, "0")}`
                                );
                            }

                            toast.success(
                                "Restored your previous workout session"
                            );
                            setIsLoading(false);
                            return; // Exit early as we've restored the state
                        }
                    } catch (error) {
                        console.error(
                            "Error parsing saved workout state:",
                            error
                        );
                        // Continue with normal loading if there's an error with the saved state
                    }
                }

                // If no valid saved state, proceed with normal loading
                // Fetch workout data
                const workoutData = await fetchWorkoutTrackerData({
                    sessionId,
                    phaseId: phaseId || undefined,
                    clientId: clientId || undefined,
                });

                // Start a new workout session
                const userId = clientId || "current-user"; // Use clientId if available, otherwise use a placeholder
                const sessionName =
                    workoutData.session?.sessionName || "Workout Session";
                const session = await startWorkoutSession(userId, sessionName);

                setWorkoutSessionLogId(session.workoutSessionLogId);

                // Set phase and session names
                setPhaseName(workoutData.phase?.phaseName || "Untitled Phase");
                setSessionName(sessionName);

                // Transform exercises data to match our interface
                const formattedExercises: Exercise[] =
                    workoutData.exercises.map((ex) => {
                        // Extract exercise details
                        const exerciseId =
                            ex.planExerciseId ||
                            `ex-${Date.now()}-${Math.random()
                                .toString(36)
                                .substring(2, 7)}`;
                        const exerciseName =
                            ex.exerciseDetails?.exerciseName ||
                            "Unknown Exercise";
                        const exerciseOrder =
                            ex.exerciseOrder?.toString() || "0";

                        // Default values for sets
                        const defaultSets = 3;
                        const minSets = ex.setsMin || 3;
                        const maxSets = ex.setsMax || 5;
                        const minReps = ex.repsMin || 8;
                        const maxReps = ex.repsMax || 12;
                        // Handle properties that might not exist in the API response
                        const tempo =
                            "tempo" in ex && ex.tempo
                                ? String(ex.tempo)
                                : "3 0 1 0";
                        const restTime =
                            "restTime" in ex && ex.restTime
                                ? String(ex.restTime)
                                : "45 - 60 seconds";

                        return {
                            id: exerciseId,
                            name: exerciseName,
                            order: exerciseOrder,
                            sets: Array.from(
                                { length: defaultSets },
                                (_, i) => ({
                                    id: `temp-${exerciseId}-${i + 1}`, // Temporary ID until saved
                                    reps: "0",
                                    weight: "0",
                                    isNew: true,
                                })
                            ),
                            setRange: `${minSets}-${maxSets}`,
                            repRange: `${minReps}-${maxReps}`,
                            tempo: tempo,
                            restTime: restTime,
                            notes: ex.notes || "",
                            setOrderMarker:
                                ex.setOrderMarker || `${minSets}-${maxSets}`, // Use setOrderMarker if available, otherwise fallback to setRange
                            isExpanded: parseInt(exerciseOrder) === 1, // Expand first exercise by default
                        };
                    });

                setExercises(formattedExercises);
            } catch (error) {
                console.error("Error loading workout data:", error);
                toast.error("Failed to load workout data");
            } finally {
                setIsLoading(false);
            }
        };

        loadWorkoutData();

        // Timer setup
        const startTime = Date.now();
        const timerInterval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            const minutes = Math.floor(elapsedTime / 60000);
            const seconds = Math.floor((elapsedTime % 60000) / 1000);
            setTimer(
                `${minutes.toString().padStart(2, "0")}:${seconds
                    .toString()
                    .padStart(2, "0")}`
            );
        }, 1000);

        return () => clearInterval(timerInterval);
    }, [sessionId, phaseId, clientId]);

    // Add event listener for beforeunload to warn user before leaving the page
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (workoutSessionLogId) {
                // Save state one last time before unloading
                saveWorkoutStateToLocalStorage();

                // Show a confirmation dialog
                e.preventDefault();
                e.returnValue =
                    "You have an active workout session. Are you sure you want to leave?";
                return e.returnValue;
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [workoutSessionLogId, saveWorkoutStateToLocalStorage]);

    const toggleExerciseExpansion = (exerciseId: string) => {
        setExercises(
            exercises.map((ex) =>
                ex.id === exerciseId
                    ? { ...ex, isExpanded: !ex.isExpanded }
                    : ex
            )
        );
    };

    const updateSetValue = async (
        exerciseId: string,
        setId: string,
        field: "reps" | "weight",
        value: string
    ) => {
        // Update local state first for immediate UI feedback
        setExercises(
            exercises.map((ex) =>
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

        // If this is an existing set (not newly added), update it in the database
        const exercise = exercises.find((ex) => ex.id === exerciseId);
        const set = exercise?.sets.find((s) => s.id === setId);

        if (set && !set.isNew && workoutSessionLogId) {
            try {
                // Only update the database if the set has a real ID (not a temp ID)
                if (!setId.startsWith("temp-")) {
                    await updateWorkoutSet(setId, {
                        [field]: value ? parseInt(value) : null,
                    });
                }
            } catch (error) {
                console.error(`Error updating ${field} for set:`, error);
                toast.error(`Failed to update ${field}`);
            }
        }
    };

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
            const setNumber = exercise.sets.length + 1; // Use the correct set number
            const result = await logWorkoutSet(
                workoutSessionLogId,
                exercise.name,
                setNumber, // Use the correct set number
                0, // reps (default to 0)
                0, // weight (default to 0)
                exercise.notes // Use the current exercise notes
            );

            // Update the temporary ID with the real one from the database
            setExercises(
                exercises.map((ex) =>
                    ex.id === exerciseId
                        ? {
                              ...ex,
                              sets: [
                                  ...ex.sets.filter((s) => s.id !== tempId),
                                  {
                                      id: result.workoutDetailId,
                                      reps: "0",
                                      weight: "0",
                                      isNew: false,
                                  },
                              ],
                          }
                        : ex
                )
            );
        } catch (error) {
            console.error("Error adding set:", error);
            toast.error("Failed to add set");

            // Remove the temporary set if the API call failed
            setExercises(
                exercises.map((ex) =>
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

    const updateNotes = async (exerciseId: string, notes: string) => {
        // Update local state
        setExercises(
            exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, notes } : ex
            )
        );

        // Update coach notes for all sets of this exercise
        if (workoutSessionLogId) {
            const exercise = exercises.find((ex) => ex.id === exerciseId);
            if (exercise) {
                // Update all non-temporary sets with the new coach note
                for (const set of exercise.sets) {
                    if (!set.id.startsWith("temp-")) {
                        try {
                            await updateWorkoutSet(set.id, {
                                coachNote: notes,
                            });
                        } catch (error) {
                            console.error("Error updating coach notes:", error);
                        }
                    }
                }
            }
        }
    };

    const deleteSet = async (exerciseId: string, setId: string) => {
        // Update local state first for immediate UI feedback
        setExercises(
            exercises.map((ex) =>
                ex.id === exerciseId
                    ? {
                          ...ex,
                          sets: ex.sets.filter((set) => set.id !== setId),
                      }
                    : ex
            )
        );

        // If this is not a newly added set (has a real DB ID), delete it from the database
        if (!setId.startsWith("temp-")) {
            try {
                await deleteWorkoutSet(setId);
            } catch (error) {
                console.error("Error deleting set:", error);
                toast.error("Failed to delete set");

                // If deletion fails, just log the error
                // In a real app, you might want to restore just the deleted set
                console.error("Error deleting set:", error);
            }
        }
    };

    const openQuitDialog = () => {
        setIsQuitDialogOpen(true);
    };

    const handleQuitWithoutSaving = () => {
        window.history.back();
    };

    const handleSaveAndQuit = async () => {
        setIsSaving(true);
        try {
            if (workoutSessionLogId) {
                // End the workout session
                await endWorkoutSession(workoutSessionLogId);
                toast.success("Workout saved successfully");

                // Clear the saved state from localStorage since we're done with this session
                localStorage.removeItem(`workout-state-${sessionId}`);
            } else {
                toast.error("No active workout session to save");
            }
            window.history.back();
        } catch (error) {
            console.error("Error saving workout:", error);
            toast.error("Error saving workout");
        } finally {
            setIsSaving(false);
            setIsQuitDialogOpen(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Save any unsaved sets
            if (workoutSessionLogId) {
                // Find any sets that are marked as new and save them
                for (const exercise of exercises) {
                    const newSets = exercise.sets.filter((set) => set.isNew);

                    for (const set of newSets) {
                        try {
                            // Calculate the set number based on its position in the array
                            const setNumber = exercise.sets.indexOf(set) + 1;

                            const result = await logWorkoutSet(
                                workoutSessionLogId,
                                exercise.name,
                                setNumber, // Use the correct set number
                                parseInt(set.reps) || 0,
                                parseInt(set.weight) || 0,
                                exercise.notes // Use the exercise notes as coach notes
                            );

                            // Update the set ID in our local state
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
                        } catch (error) {
                            console.error("Error saving new set:", error);
                        }
                    }
                }

                toast.success("Workout progress saved");
            } else {
                toast.error("No active workout session to save");
            }
        } catch (error) {
            console.error("Error saving workout:", error);
            toast.error("Error saving workout");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-green-900 text-white">
            <header className="flex justify-between items-center p-4 bg-green-950 border-b border-green-800">
                <Button
                    variant="destructive"
                    className="bg-red-500 hover:bg-red-600 cursor-pointer"
                    onClick={openQuitDialog}
                >
                    <span className="mr-2">⬅</span> Quit
                </Button>
                <div className="text-center">
                    <h1 className="text-xl font-bold">{phaseName}</h1>
                    <h2 className="text-lg">{sessionName}</h2>
                    <div className="text-xl">{timer}</div>
                </div>
                <Button
                    variant="outline"
                    className="text-white border-white hover:bg-green-800 cursor-pointer"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <>
                            <div className="h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                            Please wait...
                        </>
                    ) : (
                        "Save"
                    )}
                </Button>
            </header>

            <div className="container mx-auto p-4 max-w-4xl">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="h-8 w-8 rounded-full border-4 border-white border-t-transparent animate-spin"></div>
                        <span className="ml-3">
                            Loading your workout data. Get ready!
                        </span>
                    </div>
                ) : exercises.length === 0 ? (
                    <div className="text-center p-8">
                        <p>No exercises found for this session.</p>
                    </div>
                ) : (
                    exercises.map((exercise) => (
                        <div
                            key={exercise.id}
                            className="mb-6 bg-black bg-opacity-20 rounded-lg overflow-hidden shadow-md"
                        >
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer"
                                onClick={() =>
                                    toggleExerciseExpansion(exercise.id)
                                }
                            >
                                <div className="flex items-center">
                                    <span className="mr-2">
                                        {exercise.setOrderMarker ||
                                            exercise.setRange}
                                        .
                                    </span>
                                    <h3 className="text-lg font-medium">
                                        {exercise.name}
                                    </h3>
                                </div>
                                <div>
                                    {exercise.isExpanded ? (
                                        <ChevronUp className="h-5 w-5" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5" />
                                    )}
                                </div>
                            </div>

                            {exercise.isExpanded && (
                                <div className="px-4 pb-4">
                                    <div className="text-sm mb-2">
                                        {exercise.setRange} Sets Of{" "}
                                        {exercise.repRange} Reps
                                    </div>

                                    <div className="mb-4">
                                        <div className="text-xs text-gray-300">
                                            Tempo: {exercise.tempo}
                                        </div>
                                        <div className="text-xs text-gray-300">
                                            Rest between sets:{" "}
                                            {exercise.restTime}
                                        </div>
                                    </div>

                                    {/* Sets table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-800 bg-opacity-50">
                                                    <th className="py-2 px-4 text-left">
                                                        SET
                                                    </th>
                                                    <th className="py-2 px-4 text-left">
                                                        REPS
                                                    </th>
                                                    <th className="py-2 px-4 text-left">
                                                        WEIGHT (KG)
                                                    </th>
                                                    <th className="py-2 px-4 text-right"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {exercise.sets.map((set) => (
                                                    <tr
                                                        key={set.id}
                                                        className="border-b border-gray-700"
                                                    >
                                                        <td className="py-2 px-4">
                                                            {exercise.sets.indexOf(
                                                                set
                                                            ) + 1}
                                                        </td>
                                                        <td className="py-2 px-4">
                                                            <input
                                                                type="number"
                                                                className="w-16 bg-gray-800 text-white p-1 rounded"
                                                                value={set.reps}
                                                                onChange={(e) =>
                                                                    updateSetValue(
                                                                        exercise.id,
                                                                        set.id,
                                                                        "reps",
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td className="py-2 px-4">
                                                            <input
                                                                type="number"
                                                                className="w-16 bg-gray-800 text-white p-1 rounded"
                                                                value={
                                                                    set.weight
                                                                }
                                                                onChange={(e) =>
                                                                    updateSetValue(
                                                                        exercise.id,
                                                                        set.id,
                                                                        "weight",
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td className="py-2 px-4 text-right">
                                                            <button
                                                                className="bg-red-600 text-white p-1 rounded w-7 h-7 flex items-center justify-center cursor-pointer"
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    deleteSet(
                                                                        exercise.id,
                                                                        set.id
                                                                    );
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mt-4 text-center">
                                        <Button
                                            variant="outline"
                                            className="w-full bg-green-800 hover:bg-green-700 text-white border-0 cursor-pointer"
                                            onClick={() => addSet(exercise.id)}
                                        >
                                            Add Set
                                        </Button>
                                    </div>

                                    <div className="mt-4">
                                        <Textarea
                                            placeholder="Notes"
                                            className="w-full min-h-[120px] bg-gray-800 text-white border-gray-700 resize-none"
                                            value={exercise.notes}
                                            onChange={(e) =>
                                                updateNotes(
                                                    exercise.id,
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Quit Confirmation Modal */}
            <Dialog open={isQuitDialogOpen} onOpenChange={setIsQuitDialogOpen}>
                <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl">
                            End Workout Session?
                        </DialogTitle>
                        <DialogDescription className="text-gray-300">
                            Choose an option for this workout session.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-row items-end justify-end gap-4 py-4">
                        <Button
                            variant="destructive"
                            className="text-base cursor-pointer"
                            onClick={handleQuitWithoutSaving}
                        >
                            Exit Without Saving
                        </Button>

                        <Button
                            variant="default"
                            className="bg-green-700 hover:bg-green-600 text-base cursor-pointer"
                            onClick={handleSaveAndQuit}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <div className="h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                                    Please wait...
                                </>
                            ) : (
                                "Save & Exit"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RecordWorkoutPage;
