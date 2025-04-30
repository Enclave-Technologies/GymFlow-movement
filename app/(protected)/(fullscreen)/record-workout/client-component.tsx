"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    ChevronDown,
    ChevronUp,
    Trash2,
    History,
    Save,
    Clock,
    XCircle,
    LogOut,
    X,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    startWorkoutSession,
    logWorkoutSet,
    updateWorkoutSet,
    deleteWorkoutSet,
    endWorkoutSession,
} from "@/actions/workout_tracker_actions";

interface ExerciseSet {
    id: string;
    reps: string;
    weight: string;
    completed?: boolean;
    isNew?: boolean;
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
    setOrderMarker?: string;
}

// Define more specific types for the workout data
interface WorkoutPlan {
    planId: string;
    planName: string;
    createdByUserId: string;
    createdDate: string | Date;
    updatedAt: string | Date;
    assignedToUserId?: string;
    isActive: boolean;
    [key: string]: unknown;
}

interface WorkoutPhase {
    phaseId: string;
    planId: string;
    phaseName: string;
    orderNumber: number;
    isActive: boolean;
    [key: string]: unknown;
}

interface WorkoutSession {
    sessionId: string;
    phaseId: string;
    sessionName: string;
    orderNumber: number;
    sessionTime?: number;
    [key: string]: unknown;
}

interface ExerciseDetail {
    exerciseId: string;
    exerciseName: string;
    description?: string;
    uploadedByUserId: string;
    uploadDate: string | Date;
    approvedByAdmin?: boolean;
    videoUrl?: string;
    motion?: string;
    targetArea?: string;
    movementType?: string;
    timeMultiplier?: number;
    [key: string]: unknown;
}

interface WorkoutExercise {
    planExerciseId: string;
    sessionId: string;
    exerciseId: string;
    targetArea?: string;
    motion?: string;
    repsMin?: number;
    repsMax?: number;
    setsMin?: number;
    setsMax?: number;
    tempo?: string;
    tut?: number; // Changed from TUT to tut to match database field name
    restMin?: number;
    restMax?: number;
    exerciseOrder: number;
    setOrderMarker?: string;
    customizations?: string;
    notes?: string;
    exerciseDetails?: ExerciseDetail;
    [key: string]: unknown;
}

interface ClientUser {
    userId: string;
    fullName: string;
    email?: string;
    registrationDate: string | Date;
    notes?: string;
    phone?: string;
    imageUrl?: string;
    gender?: string;
    idealWeight?: number;
    dob?: string | Date;
    height?: number;
    [key: string]: unknown;
}

interface WorkoutData {
    plan: WorkoutPlan | null;
    phase: WorkoutPhase | null;
    session: WorkoutSession | null;
    exercises: WorkoutExercise[];
    client: ClientUser | null;
}

interface RecordWorkoutClientProps {
    initialWorkoutData: WorkoutData;
    sessionId: string;
    phaseId?: string;
    clientId?: string;
    workoutSessionLogId?: string;
    pastSessions?: {
        session: {
            workoutSessionLogId: string;
            userId: string;
            sessionName: string;
            startTime: string | Date;
            endTime: string | Date | null;
            [key: string]: unknown;
        };
        details: {
            workoutDetailId: string;
            workoutSessionLogId: string;
            exerciseName: string;
            sets: number | null;
            reps: number | null;
            weight: number | null;
            workoutVolume: number | null;
            coachNote: string | null;
            setOrderMarker: string | null;
            entryTime: string | Date | null;
            [key: string]: unknown;
        }[];
    }[];
    workoutSessionDetails?: {
        workoutDetailId: string;
        workoutSessionLogId: string;
        exerciseName: string;
        sets: number | null;
        reps: number | null;
        weight: number | null;
        workoutVolume: number | null;
        coachNote: string | null;
        setOrderMarker: string | null;
        entryTime: string | Date | null;
        [key: string]: unknown;
    }[];
}

export default function RecordWorkoutClient({
    initialWorkoutData,
    sessionId,
    phaseId,
    clientId,
    workoutSessionLogId: initialWorkoutSessionLogId,
    pastSessions: initialPastSessions = [],
    workoutSessionDetails: initialWorkoutSessionDetails = [],
}: RecordWorkoutClientProps) {
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
    const [pastSessions, setPastSessions] = useState<
        {
            session: {
                workoutSessionLogId: string;
                userId: string;
                sessionName: string;
                startTime: string | Date;
                endTime: string | Date | null;
                [key: string]: unknown;
            };
            details: {
                workoutDetailId: string;
                workoutSessionLogId: string;
                exerciseName: string;
                sets: number | null;
                reps: number | null;
                weight: number | null;
                workoutVolume: number | null;
                coachNote: string | null;
                setOrderMarker: string | null;
                entryTime: string | Date | null;
                [key: string]: unknown;
            }[];
        }[]
    >(initialPastSessions || []);
    const [showPastWorkouts, setShowPastWorkouts] = useState(true);

    // No longer needed since we removed localStorage

    // Load workout data from API or localStorage
    useEffect(() => {
        const loadWorkoutData = async () => {
            if (!sessionId) {
                toast.error("Session ID is required");
                return;
            }

            try {
                setIsLoading(true);

                // If a workoutSessionLogId was provided in the URL, use that directly
                if (initialWorkoutSessionLogId) {
                    console.log(
                        "Using workout session log ID from URL:",
                        initialWorkoutSessionLogId
                    );
                    setWorkoutSessionLogId(initialWorkoutSessionLogId);

                    // No need to clear localStorage as we're not using it anymore

                    // We'll still need to fetch past sessions
                    // const userId = clientId || "current-user";
                    const sessionNameFromData =
                        initialWorkoutData.session?.sessionName ||
                        "Workout Session";

                    // Set phase and session names
                    setPhaseName(
                        initialWorkoutData.phase?.phaseName || "Untitled Phase"
                    );
                    setSessionName(sessionNameFromData);

                    // We already have past sessions from the server component, no need to fetch again
                    console.log("Using past sessions from server component");
                } else {
                    // Proceed with normal loading
                    // Use the initialWorkoutData passed from the server component
                    const workoutData = initialWorkoutData;

                    // Set phase and session names
                    setPhaseName(
                        initialWorkoutData.phase?.phaseName || "Untitled Phase"
                    );
                    setSessionName(
                        initialWorkoutData.session?.sessionName ||
                            "Workout Session"
                    );

                    // If we have a workoutSessionLogId from the server component, use it
                    if (initialWorkoutSessionLogId) {
                        console.log(
                            "Using workout session log ID from server component:",
                            initialWorkoutSessionLogId
                        );
                        setWorkoutSessionLogId(initialWorkoutSessionLogId);
                    } else {
                        // Otherwise, create a new workout session
                        const userId = clientId || "current-user"; // Use clientId if available, otherwise use a placeholder
                        const sessionName =
                            workoutData.session?.sessionName ||
                            "Workout Session";

                        try {
                            const sessionResult = await startWorkoutSession(
                                userId,
                                sessionName
                            );

                            // Verify we got a valid session ID back
                            if (
                                !sessionResult.newSession?.workoutSessionLogId
                            ) {
                                throw new Error(
                                    "Failed to get a valid workout session ID"
                                );
                            }

                            const newWorkoutSessionLogId =
                                sessionResult.newSession.workoutSessionLogId;
                            console.log(
                                "Created new workout session with ID:",
                                newWorkoutSessionLogId
                            );

                            setWorkoutSessionLogId(newWorkoutSessionLogId);

                            // Store past sessions data if not already provided
                            if (
                                sessionResult.pastSessions &&
                                sessionResult.pastSessions.length > 0 &&
                                pastSessions.length === 0
                            ) {
                                setPastSessions(sessionResult.pastSessions);
                            }
                        } catch (error) {
                            console.error(
                                "Error starting workout session:",
                                error
                            );
                            toast.error(
                                "Failed to start workout session. Please try again."
                            );
                        }
                    }
                }

                // Set phase and session names if not already set
                if (!initialWorkoutSessionLogId) {
                    setPhaseName(
                        initialWorkoutData.phase?.phaseName || "Untitled Phase"
                    );
                    setSessionName(
                        initialWorkoutData.session?.sessionName ||
                            "Workout Session"
                    );
                }

                // Transform exercises data to match our interface
                const formattedExercises: Exercise[] =
                    initialWorkoutData.exercises.map((ex: WorkoutExercise) => {
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

                        // Check if we have existing workout details for this exercise
                        const existingDetails = initialWorkoutSessionDetails
                            ? initialWorkoutSessionDetails.filter(
                                  (detail) =>
                                      detail.exerciseName === exerciseName
                              )
                            : [];

                        // If we have existing details, use them to populate the sets
                        let sets: ExerciseSet[] = [];
                        if (existingDetails.length > 0) {
                            sets = existingDetails.map((detail) => ({
                                id: detail.workoutDetailId,
                                reps: detail.reps
                                    ? detail.reps.toString()
                                    : "0",
                                weight: detail.weight
                                    ? detail.weight.toString()
                                    : "0",
                                isNew: false,
                            }));
                        } else {
                            // Otherwise, create default sets
                            sets = Array.from(
                                { length: defaultSets },
                                (_, i) => ({
                                    id: `temp-${exerciseId}-${i + 1}`, // Temporary ID until saved
                                    reps: "0",
                                    weight: "0",
                                    isNew: true,
                                })
                            );
                        }

                        return {
                            id: exerciseId,
                            name: exerciseName,
                            order: exerciseOrder,
                            sets: sets,
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
    }, [
        sessionId,
        phaseId,
        clientId,
        initialWorkoutData,
        initialWorkoutSessionDetails,
    ]);

    // Add event listener for beforeunload to warn user before leaving the page
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (workoutSessionLogId) {
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
    }, [workoutSessionLogId]);

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
            // Verify we have a valid workout session log ID
            if (!workoutSessionLogId) {
                throw new Error("No active workout session");
            }

            console.log(
                "Logging workout set for session:",
                workoutSessionLogId
            );

            // Log the new set to the database
            const setNumber = exercise.sets.length + 1; // Use the correct set number
            const result = await logWorkoutSet(
                workoutSessionLogId,
                exercise.name,
                setNumber, // Use the correct set number
                0, // reps (default to 0)
                0, // weight (default to 0)
                exercise.notes, // Use the current exercise notes
                exercise.setOrderMarker // Include the setOrderMarker
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
                console.log(
                    "Ending workout session with ID:",
                    workoutSessionLogId
                );

                // First save any unsaved sets
                const unsavedSets = exercises.flatMap((exercise) =>
                    exercise.sets
                        .filter((set) => set.isNew)
                        .map((set) => ({ exercise, set }))
                );

                if (unsavedSets.length > 0) {
                    console.log(
                        `Saving ${unsavedSets.length} unsaved sets before ending session`
                    );

                    // Save each unsaved set
                    for (const { exercise, set } of unsavedSets) {
                        try {
                            const setNumber = exercise.sets.indexOf(set) + 1;
                            await logWorkoutSet(
                                workoutSessionLogId,
                                exercise.name,
                                setNumber,
                                parseInt(set.reps) || 0,
                                parseInt(set.weight) || 0,
                                exercise.notes,
                                exercise.setOrderMarker
                            );
                        } catch (error) {
                            console.error(
                                "Error saving set before quitting:",
                                error
                            );
                        }
                    }
                }

                // End the workout session
                await endWorkoutSession(workoutSessionLogId);
                toast.success("Workout saved successfully");

                // No need to clear localStorage since we're not using it anymore
            } else {
                console.error(
                    "No active workout session ID found when trying to save and quit"
                );
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
                console.log(
                    "Saving workout sets for session:",
                    workoutSessionLogId
                );

                // Find any sets that are marked as new and save them
                for (const exercise of exercises) {
                    const newSets = exercise.sets.filter((set) => set.isNew);

                    if (newSets.length > 0) {
                        console.log(
                            `Saving ${newSets.length} new sets for exercise: ${exercise.name}`
                        );
                    }

                    for (const set of newSets) {
                        try {
                            // Calculate the set number based on its position in the array
                            const setNumber = exercise.sets.indexOf(set) + 1;

                            console.log(
                                `Saving set ${setNumber} for exercise ${exercise.name} with workoutSessionLogId: ${workoutSessionLogId}`
                            );

                            const result = await logWorkoutSet(
                                workoutSessionLogId,
                                exercise.name,
                                setNumber, // Use the correct set number
                                parseInt(set.reps) || 0,
                                parseInt(set.weight) || 0,
                                exercise.notes, // Use the exercise notes as coach notes
                                exercise.setOrderMarker // Include the setOrderMarker
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

                // Update the URL with the workoutSessionLogId to maintain state on refresh
                // and prevent duplicate saving
                if (window.history && window.history.replaceState) {
                    const url = new URL(window.location.href);
                    url.searchParams.set(
                        "workoutSessionLogId",
                        workoutSessionLogId
                    );
                    window.history.replaceState({}, "", url.toString());
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
        <div className="min-h-screen bg-background text-foreground">
            <header className="flex flex-col sm:flex-row justify-between items-center p-4 bg-card border-b border-border gap-3">
                <div className="flex items-center w-full sm:w-auto justify-between sm:justify-start">
                    <Button
                        variant="outline"
                        className="cursor-pointer border-border hover:bg-muted"
                        onClick={openQuitDialog}
                    >
                        <X className="h-4 w-4 mr-2" /> Exit
                    </Button>

                    <div className="flex sm:hidden">
                        <div className="text-xl font-bold flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            {timer}
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <h1 className="text-xl font-bold">{phaseName}</h1>
                    <h2 className="text-lg">{sessionName}</h2>
                    <div className="text-xl hidden sm:block">{timer}</div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    {pastSessions.length > 0 && (
                        <Button
                            variant="outline"
                            className="text-foreground border-border hover:bg-muted cursor-pointer"
                            onClick={() =>
                                setShowPastWorkouts(!showPastWorkouts)
                            }
                        >
                            <History className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">
                                {showPastWorkouts
                                    ? "Hide History"
                                    : "Show History"}
                            </span>
                            <span className="sm:hidden">
                                {showPastWorkouts ? "Hide" : "History"}
                            </span>
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        className="text-foreground border-border hover:bg-muted cursor-pointer"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <div className="h-4 w-4 mr-2 rounded-full border-2 border-foreground border-t-transparent animate-spin"></div>
                                <span className="hidden sm:inline">
                                    Please wait...
                                </span>
                                <span className="sm:hidden">Wait...</span>
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Save</span>
                                <span className="sm:hidden">Save</span>
                            </>
                        )}
                    </Button>
                </div>
            </header>

            <div className="container mx-auto p-4 max-w-6xl">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Main workout content */}
                    <div className="flex-1">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
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
                                    className="mb-6 bg-card bg-opacity-20 rounded-lg overflow-hidden shadow-md"
                                >
                                    <div
                                        className="flex items-center justify-between p-4 cursor-pointer"
                                        onClick={() =>
                                            toggleExerciseExpansion(exercise.id)
                                        }
                                    >
                                        <div className="flex items-center">
                                            <span className="mr-2 font-semibold">
                                                {exercise.setOrderMarker}.
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
                                                <div className="text-xs text-muted-foreground">
                                                    Tempo: {exercise.tempo}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Rest between sets:{" "}
                                                    {exercise.restTime}
                                                </div>
                                            </div>

                                            {/* Sets table */}
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-muted bg-opacity-50">
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
                                                        {exercise.sets.map(
                                                            (set) => (
                                                                <tr
                                                                    key={set.id}
                                                                    className="border-b border-border"
                                                                >
                                                                    <td className="py-2 px-4">
                                                                        {exercise.sets.indexOf(
                                                                            set
                                                                        ) + 1}
                                                                    </td>
                                                                    <td className="py-2 px-4">
                                                                        <input
                                                                            type="number"
                                                                            className="w-16 bg-muted text-foreground p-1 rounded"
                                                                            value={
                                                                                set.reps
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) =>
                                                                                updateSetValue(
                                                                                    exercise.id,
                                                                                    set.id,
                                                                                    "reps",
                                                                                    e
                                                                                        .target
                                                                                        .value
                                                                                )
                                                                            }
                                                                        />
                                                                    </td>
                                                                    <td className="py-2 px-4">
                                                                        <input
                                                                            type="number"
                                                                            className="w-16 bg-muted text-foreground p-1 rounded"
                                                                            value={
                                                                                set.weight
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) =>
                                                                                updateSetValue(
                                                                                    exercise.id,
                                                                                    set.id,
                                                                                    "weight",
                                                                                    e
                                                                                        .target
                                                                                        .value
                                                                                )
                                                                            }
                                                                        />
                                                                    </td>
                                                                    <td className="py-2 px-4 text-right">
                                                                        <button
                                                                            className="bg-destructive text-destructive-foreground p-1 rounded w-7 h-7 flex items-center justify-center cursor-pointer"
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
                                                            )
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="mt-4 text-center">
                                                <Button
                                                    variant="outline"
                                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 cursor-pointer"
                                                    onClick={() =>
                                                        addSet(exercise.id)
                                                    }
                                                >
                                                    Add Set
                                                </Button>
                                            </div>

                                            <div className="mt-4">
                                                <Textarea
                                                    placeholder="Notes"
                                                    className="w-full min-h-[120px] bg-muted text-foreground border-border resize-none"
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

                    {/* Workout History Sidebar */}
                    {pastSessions.length > 0 && showPastWorkouts && (
                        <div className="md:w-1/3 lg:w-1/4">
                            <div className="bg-card rounded-lg shadow-md p-4 sticky top-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                                    <h3 className="text-lg font-semibold flex items-center">
                                        <History className="h-4 w-4 mr-2" />
                                        Last Workout
                                    </h3>

                                    {/* Get the last session for date and duration */}
                                    {(() => {
                                        const lastSession = [
                                            ...pastSessions,
                                        ].sort(
                                            (a, b) =>
                                                new Date(
                                                    b.session.startTime
                                                ).getTime() -
                                                new Date(
                                                    a.session.startTime
                                                ).getTime()
                                        )[0];

                                        return (
                                            <div className="text-xs flex flex-wrap items-center gap-2">
                                                <span className="font-medium">
                                                    {new Date(
                                                        lastSession.session.startTime
                                                    ).toLocaleDateString()}
                                                </span>
                                                {lastSession.session
                                                    .endTime && (
                                                    <span className="bg-primary text-primary-foreground px-2 py-1 rounded flex items-center">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        {Math.round(
                                                            (new Date(
                                                                lastSession.session.endTime
                                                            ).getTime() -
                                                                new Date(
                                                                    lastSession.session.startTime
                                                                ).getTime()) /
                                                                60000
                                                        )}{" "}
                                                        min
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                                    {(() => {
                                        const lastSession = [
                                            ...pastSessions,
                                        ].sort(
                                            (a, b) =>
                                                new Date(
                                                    b.session.startTime
                                                ).getTime() -
                                                new Date(
                                                    a.session.startTime
                                                ).getTime()
                                        )[0];

                                        // Group details by exercise name
                                        const groupedDetails =
                                            lastSession.details.reduce(
                                                (acc, detail) => {
                                                    if (
                                                        !acc[
                                                            detail.exerciseName
                                                        ]
                                                    ) {
                                                        acc[
                                                            detail.exerciseName
                                                        ] = [];
                                                    }
                                                    acc[
                                                        detail.exerciseName
                                                    ].push(detail);
                                                    return acc;
                                                },
                                                {} as Record<
                                                    string,
                                                    typeof lastSession.details
                                                >
                                            );

                                        // Find exercise order from current workout data
                                        const exerciseOrderMap = new Map<
                                            string,
                                            number
                                        >();
                                        initialWorkoutData.exercises.forEach(
                                            (ex) => {
                                                const exerciseName =
                                                    ex.exerciseDetails
                                                        ?.exerciseName || "";
                                                if (exerciseName) {
                                                    exerciseOrderMap.set(
                                                        exerciseName,
                                                        ex.exerciseOrder
                                                    );
                                                }
                                            }
                                        );

                                        // Convert to array and sort by exercise order
                                        const sortedDetails = Object.entries(
                                            groupedDetails
                                        )
                                            .map(([name, sets]) => ({
                                                name,
                                                order:
                                                    exerciseOrderMap.get(
                                                        name
                                                    ) ?? 999, // Default high order if not found
                                                sets,
                                            }))
                                            .sort((a, b) => {
                                                // Sort by order, supporting alphanumeric
                                                const orderA = a.order.toString();
                                                const orderB = b.order.toString();
                                                return orderA.localeCompare(orderB, undefined, { numeric: true, sensitivity: 'base' });
                                            });

                                        return sortedDetails.map(
                                            (exerciseGroup) => (
                                                <div
                                                    key={exerciseGroup.name}
                                                    className="bg-muted bg-opacity-20 rounded-lg p-3 mb-4"
                                                >
                                                    <h4 className="text-md font-semibold mb-2">
                                                        {exerciseGroup.name}
                                                    </h4>
                                                    <div className="overflow-x-auto text-xs">
                                                        <table className="w-full min-w-[150px]">
                                                            <thead>
                                                                <tr className="bg-card bg-opacity-50">
                                                                    <th className="py-1 px-2 text-left whitespace-nowrap">
                                                                        Set
                                                                    </th>
                                                                    <th className="py-1 px-2 text-center whitespace-nowrap">
                                                                        Reps
                                                                    </th>
                                                                    <th className="py-1 px-2 text-center whitespace-nowrap">
                                                                        Kg
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {exerciseGroup.sets.map(
                                                                    (set) => (
                                                                        <tr
                                                                            key={
                                                                                set.workoutDetailId
                                                                            }
                                                                            className="border-b border-border"
                                                                        >
                                                                            <td className="py-1 px-2 whitespace-nowrap">
                                                                                {
                                                                                    set.sets
                                                                                }
                                                                            </td>
                                                                            <td className="py-1 px-2 text-center whitespace-nowrap">
                                                                                {
                                                                                    set.reps
                                                                                }
                                                                            </td>
                                                                            <td className="py-1 px-2 text-center whitespace-nowrap">
                                                                                {
                                                                                    set.weight
                                                                                }
                                                                            </td>
                                                                        </tr>
                                                                    )
                                                                )}
                                                                {exerciseGroup
                                                                    .sets
                                                                    .length ===
                                                                    0 && (
                                                                    <tr>
                                                                        <td
                                                                            colSpan={
                                                                                3
                                                                            }
                                                                            className="py-1 px-2 text-center text-muted-foreground"
                                                                        >
                                                                            No
                                                                            details
                                                                            recorded
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Quit Confirmation Modal */}
            <Dialog open={isQuitDialogOpen} onOpenChange={setIsQuitDialogOpen}>
                <DialogContent className="sm:max-w-[425px] bg-background text-foreground border-border">
                    <DialogHeader>
                        <DialogTitle className="text-xl">
                            End Workout Session?
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Choose an option for this workout session.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-row items-end justify-end gap-4 py-4">
                        <Button
                            variant="destructive"
                            className="text-base cursor-pointer"
                            onClick={handleQuitWithoutSaving}
                        >
                            <XCircle className="h-4 w-4 mr-2" />
                            Exit Without Saving
                        </Button>

                        <Button
                            variant="default"
                            className="bg-primary hover:bg-primary/90 text-base cursor-pointer"
                            onClick={handleSaveAndQuit}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <div className="h-4 w-4 mr-2 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin"></div>
                                    Please wait...
                                </>
                            ) : (
                                <>
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Save & Exit
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
