"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
    endWorkoutSession,
    deleteActiveWorkoutSession,
} from "@/actions/workout_tracker_actions";

// Types
import { RecordWorkoutClientProps } from "@/types/workout-tracker-types";

// Hooks
import { useWorkoutTimer } from "@/hooks/use-workout-timer";
import { useWorkoutData } from "@/hooks/use-workout-data";

// Components
import { WorkoutHeader } from "@/components/workout-tracker/workout-header";
import { EnhancedExerciseCard } from "@/components/workout-tracker/enhanced-exercise-card";
import { WorkoutHistorySidebar } from "@/components/workout-tracker/workout-history-sidebar";
import { QuitWorkoutDialog } from "@/components/workout-tracker/quit-workout-dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import ExerciseDropdown from "@/components/workout-planning/UI-components/exercise-table/ExerciseDropdown";
import { Button } from "@/components/ui/button";
import { SelectExercise } from "@/db/schemas";


export default function RecordWorkoutClient({
    allExercises,
    initialWorkoutData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sessionId: _sessionId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    phaseId: _phaseId,
    clientId,
    workoutSessionLogId: initialWorkoutSessionLogId,
    pastSessions: initialPastSessions = [],
    workoutSessionDetails: initialWorkoutSessionDetails = [],
}: RecordWorkoutClientProps) {
    const router = useRouter();

    // State
    const [phaseName, setPhaseName] = useState("Untitled Phase");
    const [sessionName, setSessionName] = useState("Untitled Session");
    const [clientName, setClientName] = useState<string>("Client");
    const [workoutSessionLogId] = useState<string | null>(
        initialWorkoutSessionLogId || null
    );
    const [showQuitDialog, setShowQuitDialog] = useState(false);
    const [showPastWorkouts, setShowPastWorkouts] = useState(false);
    const [isQuittingWithoutSaving, setIsQuittingWithoutSaving] =
        useState(false);
    const [isEndingWorkout, setIsEndingWorkout] = useState(false);

    // Custom hooks
    const { timer } = useWorkoutTimer();
    const {
        exercises,
        isLoading,
        toggleExerciseExpansion,
        updateSetValue,
        addSet,
        deleteSet,
        saveUnsavedSets,
        saveAllSetDetails,
        saveStatus,
        pendingOperations,
        isSyncing,
        hasUnsavedChanges,
        addExerciseToActiveWorkout,
        removeExerciseFromActiveWorkout
    } = useWorkoutData({
        initialWorkoutData,
        workoutSessionDetails: initialWorkoutSessionDetails,
        workoutSessionLogId,
    });

    // Set initial data from props
    useEffect(() => {
        if (initialWorkoutData) {
            setPhaseName(
                initialWorkoutData.phase?.phaseName || "Untitled Phase"
            );
            setSessionName(
                initialWorkoutData.session?.sessionName || "Untitled Session"
            );
            setClientName(
                initialWorkoutData.client?.fullName || "Unknown Client"
            );
        }
    }, [initialWorkoutData]);

    // Set document title to include client name
    useEffect(() => {
        if (clientName && clientName !== "Unknown Client") {
            document.title = `${clientName} - Workout Session | GymFlow`;
        } else {
            document.title = "Workout Session | GymFlow";
        }

        return () => {
            document.title = "GymFlow";
        };
    }, [clientName]);

    // Create stable references to save functions to avoid dependency issues
    const saveWorkoutDataRef =
        useRef<() => Promise<{ newSets: number; details: number }> | null>(
            null
        );

    useEffect(() => {
        saveWorkoutDataRef.current = async () => {
            const newSetsSaved = await saveUnsavedSets();
            const detailsSaved = await saveAllSetDetails();
            return { newSets: newSetsSaved, details: detailsSaved };
        };
    }, [saveUnsavedSets, saveAllSetDetails]);

    // Add event listeners for browser navigation (back/forward) and page unload
    useEffect(() => {
        if (!workoutSessionLogId) return;

        // Handle browser back/forward navigation
        const handlePopState = async () => {
            console.log(
                "🔄 Browser back/forward detected - saving workout data..."
            );

            try {
                if (saveWorkoutDataRef.current) {
                    const result = await saveWorkoutDataRef.current();
                    if (result) {
                        const { newSets, details } = result;
                        const totalSaved = newSets + details;

                        if (totalSaved > 0) {
                            console.log(
                                `✅ Auto-saved ${totalSaved} workout entries before navigation`
                            );
                        }
                    }
                }

                // End the workout session to mark it as complete
                await endWorkoutSession(workoutSessionLogId);
                console.log("✅ Workout session saved and ended successfully");
            } catch (error) {
                console.error(
                    "❌ Failed to save workout data during navigation:",
                    error
                );
            }
        };

        // Handle page close/refresh (simpler, non-async approach)
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (workoutSessionLogId) {
                e.preventDefault();
                return "You have an active workout session. Your progress will be saved automatically.";
            }
        };

        // Add event listeners
        window.addEventListener("popstate", handlePopState);
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("popstate", handlePopState);
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [workoutSessionLogId]);

    // Event handlers
    const openQuitDialog = () => setShowQuitDialog(true);
    const closeQuitDialog = () => setShowQuitDialog(false);

    // handleSave function removed - using debounced auto-save instead

    const handleQuitWithoutSaving = async () => {
        setIsQuittingWithoutSaving(true);
        toast.info("Quitting without saving...");

        try {
            // Delete the entire workout session and all its details (regardless of content)
            if (workoutSessionLogId) {
                console.log(
                    "🗑️ Deleting entire workout session and all details:",
                    workoutSessionLogId
                );
                await deleteActiveWorkoutSession(workoutSessionLogId);
                console.log(
                    "✅ Workout session and all details deleted successfully"
                );
            }
        } catch (error) {
            console.error("❌ Error deleting workout session:", error);
            // Don't block navigation if deletion fails
        } finally {
            setIsQuittingWithoutSaving(false);
        }

        // Use replace instead of push to avoid navigation issues between layouts
        if (clientId) {
            router.replace(`/clients/${clientId}`);
        } else {
            router.replace("/all-clients");
        }
    };

    const handleEndWorkout = async () => {
        if (!workoutSessionLogId) {
            toast.error("No active workout session");
            return;
        }

        setIsEndingWorkout(true);
        toast.info("Saving and ending workout...");

        try {
            // First save any unsaved workout data (new sets)
            console.log("Saving new sets before ending session...");
            const newSetsSaved = await saveUnsavedSets();

            // Then save all existing set details
            console.log("Saving existing set details before ending session...");
            const detailsSaved = await saveAllSetDetails();

            const totalSaved = newSetsSaved + detailsSaved;
            if (totalSaved > 0) {
                console.log(
                    `Successfully saved ${totalSaved} workout entries before ending session`
                );
            }

            // Then end the workout session
            await endWorkoutSession(workoutSessionLogId);
            toast.success("Workout saved and session ended successfully");

            // Use replace instead of push to avoid navigation issues between layouts
            if (clientId) {
                router.replace(`/clients/${clientId}`);
            } else {
                router.replace("/all-clients");
            }
        } catch (error) {
            console.error("Error ending workout session:", error);
            toast.error("Failed to save and end workout session");
        } finally {
            setIsEndingWorkout(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background text-foreground flex justify-center items-center">
                <div className="flex items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span>Loading your workout data. Get ready!</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <WorkoutHeader
                clientName={clientName}
                clientImage={initialWorkoutData?.client?.imageUrl}
                phaseName={phaseName}
                sessionName={sessionName}
                exercises={exercises.map((ex) => ({
                    setOrderMarker: ex.setOrderMarker,
                    name: ex.name,
                }))}
                timer={timer}
                showPastWorkouts={showPastWorkouts}
                pastSessionsCount={initialPastSessions.length}
                saveStatus={saveStatus}
                pendingOperations={pendingOperations}
                onExit={openQuitDialog}
                onTogglePastWorkouts={() =>
                    setShowPastWorkouts(!showPastWorkouts)
                }
            />

            {/* Syncing Indicator */}
            {(isSyncing || hasUnsavedChanges) && (
                <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800">
                    <div className="container mx-auto px-4 py-2 max-w-6xl">
                        <div className="flex items-center justify-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                            {isSyncing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Syncing with database...</span>
                                </>
                            ) : hasUnsavedChanges ? (
                                <>
                                    <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse"></div>
                                    <span>You have unsaved changes</span>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            <div className="container mx-auto px-4 pt-2 pb-4 max-w-6xl">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Main workout content */}
                    <div className="flex-1">
                        {exercises.length === 0 ? (
                            <div className="text-center p-8">
                                <p>No exercises found for this session.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <AddExerciseSheet 
                                    allExercises={allExercises}
                                    onAddExercise={(exerciseId, exerciseName)=>{
                                        addExerciseToActiveWorkout(exerciseId, exerciseName)
                                    }}
                                />
                                <div className="flex flex-col gap-0">
                                    {exercises.map((exercise) => (
                                        <EnhancedExerciseCard
                                            key={exercise.id}
                                            exercise={exercise}
                                            onToggleExpansion={toggleExerciseExpansion}
                                            onUpdateSetValue={updateSetValue}
                                            onAddSet={addSet}
                                            onDeleteSet={deleteSet}
                                            onDeleteExercise={removeExerciseFromActiveWorkout}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Workout History Sidebar */}
            {/* 
                TODO: Convert the Workout History Sidebar into a full-screen popup that appears from the bottom and allow coaches to view full workout history of the user. 
                The coach should also be able to filter the history according the exercises present in the workout history in case they want to see it.
            */}
            {initialPastSessions.length > 0 && showPastWorkouts && (
                <WorkoutHistorySidebar
                    userId={clientId || ""}
                    pastSessions={initialPastSessions}
                    initialWorkoutData={initialWorkoutData}
                    setShowPastWorkouts={setShowPastWorkouts}
                />
            )}
            <QuitWorkoutDialog
                isOpen={showQuitDialog}
                onClose={closeQuitDialog}
                onQuitWithoutSaving={handleQuitWithoutSaving}
                onEndWorkout={handleEndWorkout}
                isQuittingWithoutSaving={isQuittingWithoutSaving}
                isEndingWorkout={isEndingWorkout}
            />
        </div>
    );
}

const AddExerciseSheet = ({onAddExercise, allExercises}: {
        onAddExercise: (exerciseId: string, exerciseName: string) => void;
        allExercises: SelectExercise[];
}) => {
    const [selectedExercise, setSelectedExercise] = useState<SelectExercise>();
    return (
        <Sheet>
            <SheetTrigger asChild>
                <div className="cursor-pointer" onClick={()=>{
                    // Open tab to add a new workout
                }}>
                    <div
                        className="bg-green-500 px-2 py-2 rounded-md text-white text-center"
                    >
                        + Exercise
                    </div>
                </div>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-[40vw]">
                <SheetHeader>
                <SheetTitle>Add Exercise</SheetTitle>
                <SheetDescription>
                    Add a new exercise to ongoing workout
                </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 p-4">
                    {/* Your form or content goes here */}
                    <div className="flex flex-col items-start gap-2">
                        {/* <label htmlFor="name" className="text-right">Target Muscle Group</label> */}
                            {/* Show a checklist of all muscle groups */}
                        {/* <label htmlFor="name" className="text-right">Motion</label> */}
                            {/* Show a checklist of all motions available in that muscle group */}
                        <label htmlFor="name" className="text-right">Exercise</label>
                        <ExerciseDropdown
                            exercises={allExercises}
                            selectedDescription={selectedExercise?.exerciseName || ""}
                            onExerciseSelect={(ex)=>{
                                // Add Exercise to this Workout Plan
                                setSelectedExercise(ex)
                            }}
                            placeholder="Select exercise..."
                        />                  
                    </div>
                </div>
                <SheetFooter>
                {/* The SheetClose component can be used to create a button that closes the sheet */}
                <Button type="submit" onClick={()=>{onAddExercise(selectedExercise?.exerciseId || "", selectedExercise?.exerciseName || "")}}>Save changes</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
};