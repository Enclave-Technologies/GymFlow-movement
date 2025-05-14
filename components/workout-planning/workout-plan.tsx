"use client";

import { useEffect, useState } from "react";
// Table components and Dialog components are now used in other components
// Select components are now used in ExerciseTableInline component
import { updateSessionOrder } from "@/actions/workout_client_actions";
import { WorkoutPlanChangeTracker } from "./workout-utils/change-tracker";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Exercise, Session, Phase } from "./types";

// Define the response type from getWorkoutPlanByClientId

import ExerciseTableInline from "./UI-components/ExerciseTableInline";
import type { SelectExercise } from "@/db/schemas";
import {
    createUpdatePhasesFunction,
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
// import { updateWorkoutPlan } from "@/actions/workout_plan_actions";
import { LoadingOverlay } from "./UI-components/LoadingOverlay";

type WorkoutPlannerProps = {
    client_id: string;
    exercises: SelectExercise[];
};

export default function WorkoutPlanner({
    client_id,
    exercises,
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
    const [isReorderingSessions, setIsReorderingSessions] = useState(false);

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

    // ===== Change Tracking =====
    const [changeTracker, setChangeTracker] =
        useState<WorkoutPlanChangeTracker | null>(null);

    // ===== Router =====
    const router = useRouter();

    // ===== Data Fetching =====
    useEffect(() => {
        fetchWorkoutPlan(
            client_id,
            setIsLoading,
            setPlanId,
            setLastKnownUpdatedAt,
            updatePhases,
            setChangeTracker
        );
    }, [client_id]);

    // Refetch data when savePerformed changes (after successful save)
    useEffect(() => {
        if (savePerformed > 0) {
            refetchWorkoutPlan(
                client_id,
                setPlanId,
                setLastKnownUpdatedAt,
                updatePhases,
                changeTracker,
                setChangeTracker
            );
        }
    }, [savePerformed, client_id]);

    // Custom setPhases function that also updates the change tracker
    const updatePhases = createUpdatePhasesFunction(setPhases, changeTracker);

    // ===== Global Save =====
    const handleSaveAll = async () => {
        await saveAll(
            phases,
            planId,
            lastKnownUpdatedAt,
            client_id,
            changeTracker,
            setSaving,
            setPlanId,
            setLastKnownUpdatedAt,
            setHasUnsavedChanges,
            setConflictError,
            setSavePerformed,
            updatePhases
        );
    };

    // ===== Phase CRUD =====
    const handleAddPhase = () => {
        addPhase(phases, updatePhases, setHasUnsavedChanges, planId);
    };

    const handleTogglePhaseExpansion = (phaseId: string) => {
        togglePhaseExpansion(
            phaseId,
            phases,
            updatePhases
            // setHasUnsavedChanges
        );
    };

    const handleTogglePhaseActivation = async (phaseId: string) => {
        await togglePhaseActivation(
            phaseId,
            phases,
            updatePhases,
            lastKnownUpdatedAt,
            setLastKnownUpdatedAt,
            setSaving,
            setHasUnsavedChanges,
            setConflictError
            // setSavePerformed
        );
    };

    const handleDeletePhase = (phaseId: string) => {
        deletePhase(phaseId, setShowConfirm);
    };

    const handleConfirmDeletePhase = (phaseId: string) => {
        confirmDeletePhase(
            phaseId,
            phases,
            updatePhases,
            setShowConfirm,
            setHasUnsavedChanges
        );
    };

    const handleDuplicatePhase = (phaseId: string) => {
        duplicatePhase(phaseId, phases, updatePhases, setHasUnsavedChanges);
    };

    // ===== Session CRUD =====
    const addSessionHandler = (phaseId: string) => {
        updatePhases(addSession(phases, phaseId));
        setHasUnsavedChanges(true);
    };

    const toggleSessionExpansionHandler = (
        phaseId: string,
        sessionId: string
    ) => {
        updatePhases(toggleSessionExpansion(phases, phaseId, sessionId));
        // setHasUnsavedChanges(true);
    };

    const duplicateSessionHandler = (phaseId: string, sessionId: string) => {
        updatePhases(duplicateSession(phases, phaseId, sessionId));
        setHasUnsavedChanges(true);
    };

    const deleteSessionHandler = (phaseId: string, sessionId: string) =>
        setShowConfirm({ type: "session", phaseId, sessionId });

    const confirmDeleteSessionHandler = (
        phaseId: string,
        sessionId: string
    ) => {
        updatePhases(deleteSession(phases, phaseId, sessionId));
        setShowConfirm({ type: null });
        setHasUnsavedChanges(true);
    };

    // ===== Exercise CRUD =====

    // Add a new function to handle saving after exercise is added/edited
    const handleSaveExercise = async (
        phaseId: string,
        sessionId: string,
        exerciseId: string,
        exerciseData?: Partial<Exercise> // Add optional parameter for final data
    ) => {
        // Set saving state
        // setSaving(true);

        if (exerciseData) {
            console.log(exerciseData);
            return;
        }

        // Find the specific phase, session, and exercise
        const phase = phases.find((p) => p.id === phaseId);
        if (!phase) {
            console.error(`Phase with ID ${phaseId} not found`);
            return;
        }

        const session = phase.sessions.find((s) => s.id === sessionId);
        if (!session) {
            console.error(
                `Session with ID ${sessionId} not found in phase ${phaseId}`
            );
            return;
        }

        const exercise = session.exercises.find((e) => e.id === exerciseId);
        if (!exercise) {
            console.error(
                `Exercise with ID ${exerciseId} not found in session ${sessionId}`
            );
            return;
        }

        console.log("Handling Save Exercise:");
        console.log("Phase:", phase.name, "(", phaseId, ")");
        console.log("Session:", session.name, "(", sessionId, ")");
        console.log("Exercise:", JSON.stringify(exercise, null, 2));

        // try {
        //     if (!planId || !lastKnownUpdatedAt) {
        //         // If no plan exists yet, save the entire workout plan
        //         await saveAll(
        //             phases,
        //             planId,
        //             lastKnownUpdatedAt,
        //             client_id,
        //             changeTracker,
        //             setSaving,
        //             setPlanId,
        //             setLastKnownUpdatedAt,
        //             setHasUnsavedChanges,
        //             setConflictError,
        //             setSavePerformed,
        //             updatePhases
        //         );
        //     } else {
        //         // If plan exists, update it with the current phases
        //         const result = await updateWorkoutPlan(
        //             planId,
        //             lastKnownUpdatedAt,
        //             {
        //                 phases,
        //             }
        //         );

        //         if (result.success) {
        //             toast.success("Exercise saved successfully");
        //             setHasUnsavedChanges(false);
        //             setConflictError(null);

        //             // Update the last known timestamp
        //             if (result.updatedAt) {
        //                 setLastKnownUpdatedAt(new Date(result.updatedAt));
        //             }

        //             // Reset the change tracker with the current phases
        //             if (changeTracker) {
        //                 changeTracker.reset(phases);
        //             }

        //             // No need to trigger a refetch here
        //         } else {
        //             // Handle errors
        //             if (result.conflict) {
        //                 setConflictError({
        //                     message:
        //                         result.error ||
        //                         "Plan has been modified by another user",
        //                     serverTime: new Date(result.serverUpdatedAt!),
        //                 });
        //                 toast.error(
        //                     "Conflict detected: Plan has been modified by another user"
        //                 );
        //             } else {
        //                 toast.error(result.error || "Failed to save exercise");
        //             }
        //         }
        //     }
        // } catch (error) {
        //     console.error("Error saving exercise:", error);
        //     toast.error("An error occurred while saving the exercise");
        // } finally {
        //     setSaving(false);
        // }
    };

    const addExerciseHandler = (phaseId: string, sessionId: string) => {
        const { updatedPhases, newExerciseId } = addExercise(
            phases,
            phaseId,
            sessionId
        );
        updatePhases(updatedPhases);
        setEditingExercise({ sessionId, exerciseId: newExerciseId });
        setHasUnsavedChanges(true);
    };

    // // Add a function to update exercise data from the editor
    // const updateExerciseData = (
    //     phaseId: string,
    //     sessionId: string,
    //     exerciseId: string,
    //     exerciseData: Partial<Exercise>
    // ) => {
    //     const updatedPhases = phases.map((phase) => {
    //         if (phase.id !== phaseId) return phase;

    //         return {
    //             ...phase,
    //             sessions: phase.sessions.map((session) => {
    //                 if (session.id !== sessionId) return session;

    //                 return {
    //                     ...session,
    //                     exercises: session.exercises.map((exercise) => {
    //                         if (exercise.id !== exerciseId) return exercise;

    //                         // Update the exercise with the new data
    //                         return {
    //                             ...exercise,
    //                             ...exerciseData,
    //                         };
    //                     }),
    //                 };
    //             }),
    //         };
    //     });

    //     updatePhases(updatedPhases);
    //     setHasUnsavedChanges(true);
    // };

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
        updatePhases(deleteExercise(phases, phaseId, sessionId, exerciseId));
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
            updatePhases,
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
        updatePhases(
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

    // Save a single session (removed)

    // Function to handle visual updates during drag operations
    const handleDragVisual = (
        phaseId: string,
        dragIndex: number,
        hoverIndex: number
    ) => {
        // This function only updates the UI for visual feedback during dragging
        updatePhases(
            phases.map((phase) => {
                if (phase.id !== phaseId) return phase;

                const newSessions = [...phase.sessions];
                const draggedSession = newSessions[dragIndex];
                newSessions.splice(dragIndex, 1);
                newSessions.splice(hoverIndex, 0, draggedSession);

                return {
                    ...phase,
                    sessions: newSessions,
                };
            })
        );
    };

    // Function to move a session within a phase and update the order in DB
    // This is called when the drag operation is completed (on drop)
    const moveSession = async (
        phaseId: string,
        dragIndex: number,
        hoverIndex: number
    ) => {
        // First update the UI (this might be redundant if handleDragVisual was called during drag)
        // but we include it for safety to ensure the final state is correct
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

        // Update the state with the new phases
        updatePhases(updatedPhases);

        // Mark as having unsaved changes
        setHasUnsavedChanges(true);

        // Show loading overlay
        setIsReorderingSessions(true);

        // Log the operation for debugging
        console.log(
            `Moving session from index ${dragIndex} to ${hoverIndex} in phase ${phaseId}`
        );

        // --- BEGIN: Call server action to update order ---
        // Find the updated phase from our new state to get the correct session order
        const updatedPhase = updatedPhases.find((p) => p.id === phaseId);
        if (!updatedPhase) {
            console.error("Could not find updated phase after move.");
            toast.error(
                "An internal error occurred while reordering sessions."
            );
            return; // Should not happen if setPhases worked
        }

        // Get the ordered session IDs from the updated phase
        const orderedSessionIds = updatedPhase.sessions.map((s) => s.id);

        // Set saving state visually (optional, maybe too quick for DnD)
        // setSaving(true); // Consider adding a specific 'isReordering' state if needed

        try {
            const result = await updateSessionOrder(
                phaseId,
                orderedSessionIds,
                lastKnownUpdatedAt || undefined
            );

            if (result.success) {
                // Update the last known timestamp to prevent conflicts on subsequent saves
                setLastKnownUpdatedAt(new Date(result.updatedAt ?? Date.now()));
                setConflictError(null); // Clear any previous conflict

                // If the server save was successful, we can clear the unsaved changes flag
                // but only for this specific change - if there were other unsaved changes,
                // we should keep the flag set
                if (!hasUnsavedChanges) {
                    setHasUnsavedChanges(false);
                }

                // Trigger a refetch by incrementing the savePerformed counter
                // setSavePerformed((prev) => prev + 1);

                // toast.success("Session order updated"); // Optional: Might be too noisy
            } else {
                // Handle errors (conflict or other)
                if (result.conflict) {
                    setConflictError({
                        message:
                            result.error ||
                            "Plan modified by another user during reorder",
                        // Ensure serverUpdatedAt exists before creating Date
                        serverTime: result.serverUpdatedAt
                            ? new Date(result.serverUpdatedAt)
                            : new Date(),
                    });
                    toast.error(
                        "Conflict: Plan modified elsewhere. Please save all changes to resolve."
                    );
                    // We already set hasUnsavedChanges to true above
                } else {
                    toast.error(
                        result.error || "Failed to update session order"
                    );
                    // We already set hasUnsavedChanges to true above
                }
            }
        } catch (error) {
            console.error("Error calling updateSessionOrder:", error);
            toast.error("An error occurred while updating session order.");
            setHasUnsavedChanges(true); // Re-set unsaved changes flag on error
        } finally {
            // setSaving(false); // Clear saving state if used
            setIsReorderingSessions(false);
        }
        // --- END: Call server action ---

        // We've already set hasUnsavedChanges at the beginning of this function
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
                updatePhases={updatePhases}
                phases={phases}
                deleteExercise={deleteExerciseHandler}
                calculateSessionDuration={calculateSessionDuration}
                editingExerciseId={editingExerciseId}
                onEditEnd={handleExerciseEditEnd}
                onEditExercise={handleEditExercise}
                exercises={exercises}
                setHasUnsavedChanges={setHasUnsavedChanges}
                onSaveExercise={handleSaveExercise}
            />
        );
    };

    return (
        <div className="w-full max-w-6xl mx-auto rounded-lg text-accent-foreground bg-card">
            <LoadingOverlay
                isVisible={isReorderingSessions}
                message="Updating session order..."
            />
            <div className="w-full p-2">
                <WorkoutToolbar
                    onAddPhase={handleAddPhase}
                    onSaveAll={handleSaveAll}
                    hasUnsavedChanges={hasUnsavedChanges}
                    isSaving={isSaving}
                    conflictError={conflictError}
                    client_id={client_id}
                    phases={phases}
                    exercises={exercises}
                    updatePhases={updatePhases}
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
                    onMoveSession={moveSession}
                    onDragVisual={handleDragVisual}
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
