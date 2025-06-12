"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
    endWorkoutSession,
    deleteEmptyWorkoutSession,
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

export default function RecordWorkoutClient({
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
    const [isSaving] = useState(false);

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
        isSaving: isDataSaving,
        saveStatus,
        pendingOperations,
        saveNow,
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

    // Add event listener for beforeunload to warn user before leaving the page
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (workoutSessionLogId) {
                e.preventDefault();
                // Modern browsers will show their own message, but we still need to prevent default
                return "You have an active workout session. Are you sure you want to leave?";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [workoutSessionLogId]);

    // Event handlers
    const openQuitDialog = () => setShowQuitDialog(true);
    const closeQuitDialog = () => setShowQuitDialog(false);

    const handleSave = async () => {
        if (!workoutSessionLogId) {
            toast.error("No active workout session to save");
            return;
        }

        try {
            // Trigger immediate save of all pending operations
            saveNow();

            // Update the URL with the workoutSessionLogId to maintain state on refresh
            if (window.history && window.history.replaceState) {
                const url = new URL(window.location.href);
                url.searchParams.set(
                    "workoutSessionLogId",
                    workoutSessionLogId
                );
                window.history.replaceState({}, "", url.toString());
            }

            if (pendingOperations === 0) {
                toast.success("All changes saved successfully");
            } else {
                toast.info("Save in progress...");
            }
        } catch (error) {
            console.error("Error saving workout:", error);
            toast.error("Error saving workout");
        }
    };

    const handleQuitWithoutSaving = async () => {
        try {
            // Delete the empty workout session if it exists
            if (workoutSessionLogId) {
                console.log(
                    "Deleting empty workout session:",
                    workoutSessionLogId
                );
                const deleted = await deleteEmptyWorkoutSession(
                    workoutSessionLogId
                );
                if (deleted) {
                    console.log("Empty workout session deleted successfully");
                } else {
                    console.log(
                        "Workout session was not empty or could not be deleted"
                    );
                }
            }
        } catch (error) {
            console.error("Error deleting empty workout session:", error);
            // Don't block navigation if deletion fails
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

        try {
            // First save any unsaved workout data
            console.log("Saving workout data before ending session...");
            const savedCount = await saveUnsavedSets();

            if (savedCount > 0) {
                console.log(
                    `Successfully saved ${savedCount} sets before ending workout`
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
                isSaving={isSaving || isDataSaving}
                saveStatus={saveStatus}
                pendingOperations={pendingOperations}
                onExit={openQuitDialog}
                onTogglePastWorkouts={() =>
                    setShowPastWorkouts(!showPastWorkouts)
                }
                onSave={handleSave}
            />

            <div className="container mx-auto px-4 pt-2 pb-4 max-w-6xl">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Main workout content */}
                    <div className="flex-1">
                        {exercises.length === 0 ? (
                            <div className="text-center p-8">
                                <p>No exercises found for this session.</p>
                            </div>
                        ) : (
                            exercises.map((exercise) => (
                                <EnhancedExerciseCard
                                    key={exercise.id}
                                    exercise={exercise}
                                    onToggleExpansion={toggleExerciseExpansion}
                                    onUpdateSetValue={updateSetValue}
                                    onAddSet={addSet}
                                    onDeleteSet={deleteSet}
                                />
                            ))
                        )}
                    </div>

                    {/* Workout History Sidebar */}
                    {initialPastSessions.length > 0 && showPastWorkouts && (
                        <WorkoutHistorySidebar
                            pastSessions={initialPastSessions}
                            initialWorkoutData={initialWorkoutData}
                        />
                    )}
                </div>
            </div>

            <QuitWorkoutDialog
                isOpen={showQuitDialog}
                onClose={closeQuitDialog}
                onQuitWithoutSaving={handleQuitWithoutSaving}
                onEndWorkout={handleEndWorkout}
            />
        </div>
    );
}
