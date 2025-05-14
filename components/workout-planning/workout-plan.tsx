"use client";

import { useEffect, useState } from "react";
// Table components and Dialog components are now used in other components
// Select components are now used in ExerciseTableInline component
import { updateSessionOrder } from "@/actions/workout_client_actions";
// import { WorkoutPlanChangeTracker } from "./workout-utils/change-tracker";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Exercise, Session, Phase } from "./types";

// Define the response type from getWorkoutPlanByClientId

import ExerciseTableInline from "./UI-components/ExerciseTableInline";
import type { SelectExercise } from "@/db/schemas";
import {
    // createUpdatePhasesFunction,
    fetchWorkoutPlan,
    refetchWorkoutPlan,
} from "./workout-utils/workout-utils";
import {
    addPhase,
    confirmDeletePhase,
    deletePhase,
    duplicatePhase,
    savePhaseEdit,
    startEditPhase,
    togglePhaseActivation,
    togglePhaseExpansion,
} from "./workout-utils/phase-utils";
import { saveAll } from "./workout-utils/workout-plan-functions";
import {
    addSession,
    deleteSession,
    duplicateSession,
    toggleSessionExpansion,
} from "./workout-utils/session-utils";
import { addExercise, deleteExercise } from "./workout-utils/exercise-utils";
import { WorkoutToolbar } from "./UI-components/WorkoutToolbar";
import { PhaseList } from "./UI-components/PhaseList";
import { DeleteConfirmationDialog } from "./UI-components/DeleteConfirmationDialog";
import { Loader2 } from "lucide-react";

type WorkoutPlannerProps = {
    client_id: string;
    exercises: SelectExercise[];
    loggedInUser: {
        id: string;
        appwrite_id: string | null;
        name: string;
        email: string;
        avatar: string;
        roles: string[];
        approvedByAdmin: boolean | (boolean | null)[] | null;
    } | null;
};

export default function WorkoutPlanner({
    client_id,
    exercises,
    loggedInUser,
}: WorkoutPlannerProps) {
    // ===== Data State =====
    const [phases, setPhases] = useState<Phase[]>([]);
    const [planId, setPlanId] = useState<string | null>(null);
    const [lastKnownUpdatedAt, setLastKnownUpdatedAt] = useState<Date | null>(
        null
    );

    // ===== UI State =====
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [savePerformed, setSavePerformed] = useState<number>(0);
    const [conflictError, setConflictError] = useState<{
        message: string;
        serverTime: Date;
    } | null>(null);
    const [addingPhase, setAddingPhase] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);

    // ===== Editing State =====
    const [editingPhase, setEditingPhase] = useState<string | null>(null);
    const [editPhaseValue, setEditPhaseValue] = useState("");
    const [editingSession, setEditingSession] = useState<string | null>(null);
    const [editSessionValue, setEditSessionValue] = useState("");
    const [editingExercise, setEditingExercise] = useState<{
        sessionId: string;
        exerciseId: string;
    } | null>(null);

    // ===== Confirmation Dialogs =====
    const [showConfirm, setShowConfirm] = useState<{
        type: "phase" | "session" | "exercise" | null;
        phaseId?: string;
        sessionId?: string;
        exerciseId?: string;
    }>({ type: null });

    // ===== Session State =====
    const [startingSessionId, setStartingSessionId] = useState<string | null>(
        null
    );

    // // ===== Change Tracking =====
    // const [changeTracker, setChangeTracker] =
    //     useState<WorkoutPlanChangeTracker | null>(null);

    // ===== Router =====
    const router = useRouter();

    // ===== Data Fetching =====
    useEffect(() => {
        fetchWorkoutPlan(
            client_id,
            setIsLoading,
            setPlanId,
            setLastKnownUpdatedAt,
            setPhases
        );
    }, [client_id]);

    // Refetch data when savePerformed changes (after successful save)
    useEffect(() => {
        if (savePerformed > 0) {
            refetchWorkoutPlan(
                client_id,
                setPlanId,
                setLastKnownUpdatedAt,
                setPhases
            );
        }
    }, [savePerformed, client_id]);

    // Custom setPhases function that also updates the change tracker
    // const updatePhases = createUpdatePhasesFunction(setPhases, changeTracker);

    // ===== Global Save =====
    const handleSaveAll = async () => {
        await saveAll(
            phases,
            planId,
            lastKnownUpdatedAt,
            client_id,
            setSaving,
            setPlanId,
            setLastKnownUpdatedAt,
            setHasUnsavedChanges,
            setConflictError,
            setSavePerformed
            // updatePhases
        );
        setSavePerformed((prevSave) => prevSave + 1);
    };

    // ===== Phase CRUD =====
    const handleAddPhase = () => {
        addPhase(
            phases,
            setPhases,
            setHasUnsavedChanges,
            setLastKnownUpdatedAt,
            setPlanId,
            setAddingPhase,
            planId,
            client_id,
            loggedInUser?.id
        );
    };

    const handleTogglePhaseExpansion = (phaseId: string) => {
        togglePhaseExpansion(
            phaseId,
            phases,
            setPhases
            // setHasUnsavedChanges
        );
    };

    const handleTogglePhaseActivation = async (phaseId: string) => {
        await togglePhaseActivation(
            phaseId,
            phases,
            setPhases,
            lastKnownUpdatedAt,
            setLastKnownUpdatedAt,
            setSaving,
            setHasUnsavedChanges,
            setConflictError,
            setSavePerformed
        );
    };

    const handleDeletePhase = (phaseId: string) => {
        deletePhase(phaseId, setShowConfirm);
    };

    const handleConfirmDeletePhase = (phaseId: string) => {
        confirmDeletePhase(
            phaseId,
            phases,
            setPhases,
            setShowConfirm,
            setHasUnsavedChanges
        );
    };

    const handleDuplicatePhase = (phaseId: string) => {
        duplicatePhase(
            phaseId,
            phases,
            setPhases,
            setIsDuplicating,
            setHasUnsavedChanges,
            setLastKnownUpdatedAt,
            planId
        );
    };

    // ===== Session CRUD =====
    const addSessionHandler = (phaseId: string) => {
        setPhases(addSession(phases, phaseId));
        setHasUnsavedChanges(true);
    };

    const toggleSessionExpansionHandler = (
        phaseId: string,
        sessionId: string
    ) => {
        setPhases(toggleSessionExpansion(phases, phaseId, sessionId));
        // setHasUnsavedChanges(true);
    };

    const duplicateSessionHandler = (phaseId: string, sessionId: string) => {
        setPhases(duplicateSession(phases, phaseId, sessionId));
        setHasUnsavedChanges(true);
    };

    const deleteSessionHandler = (phaseId: string, sessionId: string) =>
        setShowConfirm({ type: "session", phaseId, sessionId });

    const confirmDeleteSessionHandler = (
        phaseId: string,
        sessionId: string
    ) => {
        setPhases(deleteSession(phases, phaseId, sessionId));
        setShowConfirm({ type: null });
        setHasUnsavedChanges(true);
    };

    // ===== Exercise CRUD =====

    const addExerciseHandler = (phaseId: string, sessionId: string) => {
        const { updatedPhases, newExerciseId } = addExercise(
            phases,
            phaseId,
            sessionId
        );
        setPhases(updatedPhases);
        setEditingExercise({ sessionId, exerciseId: newExerciseId });
        setHasUnsavedChanges(true);
    };

    const deleteExerciseHandler = (
        phaseId: string,
        sessionId: string,
        exerciseId: string
    ) => setShowConfirm({ type: "exercise", phaseId, sessionId, exerciseId });

    const confirmDeleteExerciseHandler = (
        phaseId: string,
        sessionId: string,
        exerciseId: string
    ) => {
        setPhases(deleteExercise(phases, phaseId, sessionId, exerciseId));
        setShowConfirm({ type: null });
        setHasUnsavedChanges(true);
    };

    // Reset the editingExercise state after the exercise has been saved or cancelled
    const handleExerciseEditEnd = () => {
        setEditingExercise(null);
    };

    // ===== Phase/Session/Exercise Editing State =====
    const handleStartEditPhase = (id: string, name: string) => {
        startEditPhase(id, name, setEditingPhase, setEditPhaseValue);
    };

    const handleSavePhaseEdit = () => {
        savePhaseEdit(
            editingPhase,
            editPhaseValue,
            phases,
            setPhases,
            setEditingPhase,
            setHasUnsavedChanges
        );
    };

    const startEditSession = (id: string, name: string) => {
        setEditingSession(id);
        setEditSessionValue(name);
    };
    const saveSessionEdit = () => {
        if (!editingSession) return;
        setPhases(
            phases.map((phase) => ({
                ...phase,
                sessions: phase.sessions.map((s) =>
                    s.id === editingSession
                        ? { ...s, name: editSessionValue }
                        : s
                ),
            }))
        );
        setEditingSession(null);
        setHasUnsavedChanges(true);
    };

    // Exercise editing is now handled by the ExerciseTableInline component

    // ===== Utility Functions =====
    // Calculate session duration based on exercises
    const calculateSessionDuration = (exercises: Exercise[]): number => {
        if (!exercises.length) return 0;

        return exercises.reduce(
            (total, exercise) => total + (exercise.duration || 8),
            0
        );
    };

    // Exercise form handling is now in ExerciseTableInline component

    // ===== Session Actions =====
    // Handle starting a session
    const startSession = async (sessionId: string, phaseId: string) => {
        setStartingSessionId(sessionId);
        try {
            // API call
            // await new Promise((resolve) => setTimeout(resolve, 1000));

            router.push(
                `/record-workout?sessionId=${sessionId}&phaseId=${phaseId}&clientId=${client_id}`
            );
        } catch (error) {
            console.error("Error starting session:", error);
        } finally {
            setStartingSessionId(null);
        }
    };

    // Replace both handleDragVisual and moveSession with a simpler implementation
    const handleSessionReorder = async (
        phaseId: string,
        dragIndex: number,
        hoverIndex: number,
        isDrop: boolean = false
    ) => {
        // Update the UI for both visual feedback during drag and final position
        const updatedPhases = phases.map((phase) => {
            if (phase.id !== phaseId) return phase;

            const newSessions = [...phase.sessions];
            const draggedSession = newSessions[dragIndex];
            newSessions.splice(dragIndex, 1);
            newSessions.splice(hoverIndex, 0, draggedSession);

            return {
                ...phase,
                sessions: newSessions,
            };
        });

        // Always update the UI
        setPhases(updatedPhases);

        // Only mark as unsaved and log when the drop is completed
        if (isDrop) {
            console.log(
                `Moved session from index ${dragIndex} to ${hoverIndex} in phase ${phaseId}`
            );
            setHasUnsavedChanges(true);

            // Find the updated phase to get the ordered session IDs
            const updatedPhase = updatedPhases.find((p) => p.id === phaseId);
            if (updatedPhase) {
                const orderedSessionIds = updatedPhase.sessions.map(
                    (s) => s.id
                );

                // Save the new order to the server
                setSaving(true);
                setHasUnsavedChanges(true);

                try {
                    const result = await updateSessionOrder(
                        phaseId,
                        orderedSessionIds,
                        lastKnownUpdatedAt || undefined
                    );

                    if (result.success) {
                        // Update the last known timestamp
                        if (result.updatedAt) {
                            setLastKnownUpdatedAt(new Date(result.updatedAt));
                        }

                        // Clear unsaved changes flag since we've saved this specific change
                        setHasUnsavedChanges(false);

                        // Clear any previous conflict errors
                        setConflictError(null);

                        // Optionally show success message
                        toast.success("Session order updated successfully");

                        // Trigger a refetch to ensure data consistency
                        // setSavePerformed((prev) => prev + 1);
                    } else {
                        // Handle errors
                        if (result.conflict) {
                            setConflictError({
                                message:
                                    result.error ||
                                    "Plan modified by another user during reorder",
                                serverTime: result.serverUpdatedAt
                                    ? new Date(result.serverUpdatedAt)
                                    : new Date(),
                            });
                            toast.error(
                                "Conflict: Plan modified elsewhere. Please save all changes to resolve."
                            );
                        } else {
                            toast.error(
                                result.error || "Failed to update session order"
                            );
                        }
                    }
                } catch (error) {
                    console.error("Error saving session order:", error);
                    toast.error(
                        "An error occurred while updating session order"
                    );
                } finally {
                    setSaving(false);
                }
            }
            // Optional: Auto-save after reordering
            // handleSaveAll();
        }
    };

    // Inline editing state and functions are now handled by the ExerciseTableInline component

    // ===== Render Helpers =====
    // Function to render the exercises table
    const renderExercisesTable = (phase: Phase, session: Session) => {
        // Determine if this session has an exercise being edited
        const editingExerciseId =
            editingExercise && editingExercise.sessionId === session.id
                ? editingExercise.exerciseId
                : null;

        // Handler to set the editing exercise for this session
        const handleEditExercise = (exerciseId: string) => {
            setEditingExercise({ sessionId: session.id, exerciseId });
        };

        return (
            <ExerciseTableInline
                phase={phase}
                session={session}
                updatePhases={setPhases}
                phases={phases}
                deleteExercise={deleteExerciseHandler}
                calculateSessionDuration={calculateSessionDuration}
                editingExerciseId={editingExerciseId}
                onEditEnd={handleExerciseEditEnd}
                onEditExercise={handleEditExercise}
                exercises={exercises}
                setHasUnsavedChanges={setHasUnsavedChanges}
            />
        );
    };

    return (
        <div className="w-full max-w-6xl mx-auto rounded-lg text-accent-foreground bg-card">
            {/* Loading overlay */}
            {isDuplicating && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md z-10">
                    <div className="flex items-center space-x-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm font-medium">
                            Please Wait...
                        </span>
                    </div>
                </div>
            )}
            <div className="w-full p-2">
                <WorkoutToolbar
                    onAddPhase={handleAddPhase}
                    addingPhase={addingPhase}
                    onSaveAll={handleSaveAll}
                    hasUnsavedChanges={hasUnsavedChanges}
                    isSaving={isSaving}
                    conflictError={conflictError}
                    client_id={client_id}
                    phases={phases}
                    exercises={exercises}
                    updatePhases={setPhases}
                    setHasUnsavedChanges={setHasUnsavedChanges}
                />

                <PhaseList
                    phases={phases}
                    isLoading={isLoading}
                    // Phase handlers
                    onToggleExpand={handleTogglePhaseExpansion}
                    onAddSession={addSessionHandler}
                    onEditPhase={handleStartEditPhase}
                    onDeletePhase={handleDeletePhase}
                    onDuplicatePhase={handleDuplicatePhase}
                    onToggleActivation={handleTogglePhaseActivation}
                    editingPhase={editingPhase}
                    editPhaseValue={editPhaseValue}
                    onSavePhaseEdit={handleSavePhaseEdit}
                    onEditPhaseValueChange={setEditPhaseValue}
                    // Session handlers
                    onToggleSession={toggleSessionExpansionHandler}
                    onDeleteSession={deleteSessionHandler}
                    onDuplicateSession={duplicateSessionHandler}
                    onAddExercise={addExerciseHandler}
                    onStartSession={startSession}
                    startingSessionId={startingSessionId}
                    onStartEditSession={startEditSession}
                    handleSessionReorder={handleSessionReorder}
                    onRenderExercises={renderExercisesTable}
                    editingSession={editingSession}
                    editSessionValue={editSessionValue}
                    onSaveSessionEdit={saveSessionEdit}
                    onEditSessionValueChange={setEditSessionValue}
                />
            </div>

            {/* Confirm Delete Dialog */}
            {showConfirm.type && (
                <DeleteConfirmationDialog
                    showConfirm={showConfirm}
                    onCancel={() => setShowConfirm({ type: null })}
                    onDeletePhase={handleConfirmDeletePhase}
                    onDeleteSession={confirmDeleteSessionHandler}
                    onDeleteExercise={confirmDeleteExerciseHandler}
                />
            )}

            {/* Exercise editing is now handled inline by the ExerciseTableInline component */}
        </div>
    );
}
