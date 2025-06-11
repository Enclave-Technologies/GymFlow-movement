"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { endWorkoutSession } from "@/actions/workout_tracker_actions";

// Types
import { RecordWorkoutClientProps } from "@/types/workout-tracker-types";

// Hooks
import { useWorkoutTimer } from "@/hooks/use-workout-timer";
import { useWorkoutData } from "@/hooks/use-workout-data";

// Components
import { WorkoutHeader } from "@/components/workout-tracker/workout-header";
import { ExerciseCard } from "@/components/workout-tracker/exercise-card";
import { WorkoutHistorySidebar } from "@/components/workout-tracker/workout-history-sidebar";
import { QuitWorkoutDialog } from "@/components/workout-tracker/quit-workout-dialog";

export default function RecordWorkoutClient({
    initialWorkoutData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sessionId: _sessionId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    phaseId: _phaseId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    clientId: _clientId,
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
    const [isSaving, setIsSaving] = useState(false);

    // Custom hooks
    const { timer } = useWorkoutTimer();
    const {
        exercises,
        isLoading,
        toggleExerciseExpansion,
        updateSetValue,
        addSet,
        deleteSet,
        updateNotes,
        saveUnsavedSets,
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

        setIsSaving(true);
        try {
            // Save any unsaved sets using the hook
            console.log(
                "Saving workout sets for session:",
                workoutSessionLogId
            );

            const savedCount = await saveUnsavedSets();

            if (savedCount > 0) {
                console.log(`Successfully saved ${savedCount} sets`);
            }

            // Update the URL with the workoutSessionLogId to maintain state on refresh
            if (window.history && window.history.replaceState) {
                const url = new URL(window.location.href);
                url.searchParams.set(
                    "workoutSessionLogId",
                    workoutSessionLogId
                );
                window.history.replaceState({}, "", url.toString());
            }

            toast.success("Workout progress saved");
        } catch (error) {
            console.error("Error saving workout:", error);
            toast.error("Error saving workout");
        } finally {
            setIsSaving(false);
        }
    };

    const handleQuitWithoutSaving = () => {
        router.push("/dashboard");
    };

    const handleEndWorkout = async () => {
        if (!workoutSessionLogId) {
            toast.error("No active workout session");
            return;
        }

        try {
            await endWorkoutSession(workoutSessionLogId);
            toast.success("Workout session ended successfully");
            router.push("/dashboard");
        } catch (error) {
            console.error("Error ending workout session:", error);
            toast.error("Failed to end workout session");
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
                phaseName={phaseName}
                sessionName={sessionName}
                timer={timer}
                showPastWorkouts={showPastWorkouts}
                pastSessionsCount={initialPastSessions.length}
                isSaving={isSaving}
                onExit={openQuitDialog}
                onTogglePastWorkouts={() =>
                    setShowPastWorkouts(!showPastWorkouts)
                }
                onSave={handleSave}
            />

            <div className="container mx-auto p-4 max-w-6xl">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Main workout content */}
                    <div className="flex-1">
                        {exercises.length === 0 ? (
                            <div className="text-center p-8">
                                <p>No exercises found for this session.</p>
                            </div>
                        ) : (
                            exercises.map((exercise) => (
                                <ExerciseCard
                                    key={exercise.id}
                                    exercise={exercise}
                                    onToggleExpansion={toggleExerciseExpansion}
                                    onUpdateSetValue={updateSetValue}
                                    onAddSet={addSet}
                                    onDeleteSet={deleteSet}
                                    onUpdateNotes={updateNotes}
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
