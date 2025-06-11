"use client";

import { useState, useEffect, useRef } from "react";
import { Phase, Session, Exercise } from "./types";
import type { SelectExercise } from "@/db/schemas";
import { WorkoutToolbar } from "./UI-components/WorkoutToolbar";
import { PhaseList } from "./UI-components/PhaseList";
import { DeleteConfirmationDialog } from "./UI-components/DeleteConfirmationDialog";
import ExerciseTableInline from "./UI-components/ExerciseTableInline";
import { fetchWorkoutPlan } from "./workout-utils/workout-utils";
import { createWorkoutPlanHandlers } from "./workout-plan-handlers";
import { useWorkoutPlanValidation } from "./workout-plan-hooks";
import { useWorkoutPlanCacheInvalidation } from "./hooks/use-workout-plan-cache";
import { useExerciseEditState } from "./hooks/use-exercise-edit-state";

type WorkoutPlannerProps = {
    client_id: string;
    exercises: SelectExercise[];
    trainer_id: string;
};

export default function WorkoutPlanner({
    client_id,
    exercises,
    trainer_id,
}: WorkoutPlannerProps) {
    // ===== Core State =====
    const [phases, setPhases] = useState<Phase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [planId, setPlanId] = useState<string | null>(null);
    const [lastKnownUpdatedAt, setLastKnownUpdatedAt] = useState<Date | null>(
        null
    );
    const [, setHasUnsavedChanges] = useState(false);
    const [isSaving, setSaving] = useState(false);
    const [manualSaveInProgress, setManualSaveInProgress] = useState(false);

    // ===== Edit State =====
    const [editingPhase, setEditingPhase] = useState<string | null>(null);
    const [editPhaseValue, setEditPhaseValue] = useState("");
    const [editingSession, setEditingSession] = useState<string | null>(null);
    const [editSessionValue, setEditSessionValue] = useState("");

    // ===== Exercise Edit State (New) =====
    const exerciseEditState = useExerciseEditState();

    // ===== Confirmation Dialog State =====
    const [showConfirm, setShowConfirm] = useState<{
        type: "phase" | "session" | "exercise" | null;
        phaseId?: string;
        sessionId?: string;
        exerciseId?: string;
    }>({ type: null });

    // ===== Refs =====
    const latestPhasesRef = useRef<Phase[]>([]);

    // Update ref whenever phases change
    useEffect(() => {
        latestPhasesRef.current = phases;
    }, [phases]);

    // ===== Hooks =====
    const { validateWorkoutPlan } = useWorkoutPlanValidation();
    const invalidateWorkoutPlanCache = useWorkoutPlanCacheInvalidation();

    // Local storage key
    const localStorageKey = `workout-plan-${client_id}`;

    // ===== Update Phases Function =====
    const updatePhases = (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => {
        if (typeof newPhases === "function") {
            setPhases((prevPhases) => {
                const updated = newPhases(prevPhases);
                latestPhasesRef.current = updated;
                return updated;
            });
        } else {
            setPhases(newPhases);
            latestPhasesRef.current = newPhases;
        }
    };

    // ===== Data Loading =====
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                await fetchWorkoutPlan(
                    client_id,
                    setIsLoading,
                    setPlanId,
                    setLastKnownUpdatedAt,
                    updatePhases
                );
            } catch (error) {
                console.error("Error loading workout plan:", error);
                setPhases([]);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [client_id]);

    // ===== Create Handlers =====
    const handlers = createWorkoutPlanHandlers({
        // State setters
        setEditingPhase,
        setEditPhaseValue,
        setEditingSession,
        setEditSessionValue,
        setShowConfirm,
        setHasUnsavedChanges,
        setSaving,
        setPlanId,
        setLastKnownUpdatedAt,
        setSavePerformed: () => {}, // Dummy function since we don't use savePerformed
        setManualSaveInProgress,
        setIsReorderingSessions: () => {}, // Dummy function since we don't use isReorderingSessions

        // Exercise edit state
        exerciseEditState,

        // State values
        planId,
        lastKnownUpdatedAt,
        client_id,
        trainer_id,
        latestPhasesRef,
        editingPhase,
        editPhaseValue,
        editingSession,
        editSessionValue,
        manualSaveInProgress,

        // Functions
        updatePhases,
        validateWorkoutPlan,
        invalidateWorkoutPlanCache,
        localStorageKey,
    });

    // ===== Edit Handlers =====
    const handleStartEditPhase = (id: string, name: string) => {
        setEditingPhase(id);
        setEditPhaseValue(name);
    };

    const handleStartEditSession = (id: string, name: string) => {
        setEditingSession(id);
        setEditSessionValue(name);
    };

    // ===== Exercise Handlers =====
    const handleEditExercise = (exerciseId: string, sessionId: string) => {
        // Find the exercise data for editing
        const exercise = phases
            .find((p) => p.sessions.some((s) => s.id === sessionId))
            ?.sessions.find((s) => s.id === sessionId)
            ?.exercises.find((e) => e.id === exerciseId);

        if (exercise) {
            exerciseEditState.startEditingExercise(
                sessionId,
                exerciseId,
                exercise
            );
        }
    };

    const handleExerciseEditEnd = () => {
        exerciseEditState.clearExerciseEditState();
    };

    // Calculate session duration helper
    const calculateSessionDuration = (exercises: Exercise[]) => {
        // Simple calculation - you can enhance this based on your needs
        return exercises.length * 8; // 8 minutes per exercise as default
    };

    // Render exercises table function
    const renderExercises = (phase: Phase, session: Session) => {
        const editingExerciseId =
            exerciseEditState.exerciseEditState?.sessionId === session.id
                ? exerciseEditState.exerciseEditState.exerciseId
                : null;

        return (
            <ExerciseTableInline
                key={`${phase.id}-${session.id}`}
                phase={phase}
                session={session}
                updatePhases={updatePhases}
                phases={phases}
                deleteExercise={handlers.deleteExerciseHandler}
                calculateSessionDuration={calculateSessionDuration}
                editingExerciseId={editingExerciseId}
                onEditEnd={handleExerciseEditEnd}
                onEditExercise={(exerciseId: string) =>
                    handleEditExercise(exerciseId, session.id)
                }
                exercises={exercises}
                setHasUnsavedChanges={setHasUnsavedChanges}
                onSaveExercise={handlers.handleSaveExercise}
                isSaving={isSaving}
                isAnyOperationInProgress={manualSaveInProgress || isSaving}
            />
        );
    };

    return (
        <div className="h-full flex flex-col">
            {/* Simplified - no conflict error display for now */}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0 gap-2">
                {/* Toolbar */}
                <WorkoutToolbar
                    onAddPhase={handlers.handleAddPhase}
                    client_id={client_id}
                    trainer_id={trainer_id}
                    planId={planId}
                    lastKnownUpdatedAt={lastKnownUpdatedAt}
                    phases={phases}
                    exercises={exercises}
                    updatePhases={updatePhases}
                    setHasUnsavedChanges={setHasUnsavedChanges}
                    isAnyOperationInProgress={manualSaveInProgress || isSaving}
                />

                {/* Phase List */}
                <div className="flex-1 overflow-auto">
                    <PhaseList
                        phases={phases}
                        isLoading={isLoading}
                        isSaving={isSaving}
                        isAnyOperationInProgress={
                            manualSaveInProgress || isSaving
                        }
                        // Phase handlers
                        onToggleExpand={handlers.handleTogglePhaseExpansion}
                        onAddSession={handlers.addSessionHandler}
                        onEditPhase={handleStartEditPhase}
                        onDeletePhase={handlers.handleDeletePhase}
                        onDuplicatePhase={handlers.handleDuplicatePhase}
                        onToggleActivation={
                            handlers.handleTogglePhaseActivation
                        }
                        editingPhase={editingPhase}
                        editPhaseValue={editPhaseValue}
                        onSavePhaseEdit={handlers.handleSavePhaseEdit}
                        onEditPhaseValueChange={(value: string) =>
                            setEditPhaseValue(value)
                        }
                        // Session handlers
                        onToggleSession={handlers.toggleSessionExpansionHandler}
                        onDeleteSession={handlers.deleteSessionHandler}
                        onDuplicateSession={handlers.duplicateSessionHandler}
                        onAddExercise={handlers.addExerciseHandler}
                        onStartSession={() => {}} // TODO: Implement session start
                        startingSessionId={null} // TODO: Implement starting session tracking
                        onStartEditSession={handleStartEditSession}
                        onMoveSession={() => {}} // TODO: Implement session move
                        onDragVisual={() => {}} // TODO: Implement drag visual
                        onRenderExercises={renderExercises}
                        editingSession={editingSession}
                        editSessionValue={editSessionValue}
                        onSaveSessionEdit={handlers.handleSaveSessionEdit}
                        onEditSessionValueChange={(value: string) =>
                            setEditSessionValue(value)
                        }
                    />
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmationDialog
                showConfirm={showConfirm}
                onDeletePhase={handlers.handleConfirmDeletePhase}
                onDeleteSession={handlers.confirmDeleteSessionHandler}
                onDeleteExercise={handlers.confirmDeleteExerciseHandler}
                onCancel={() => setShowConfirm({ type: null })}
            />
        </div>
    );
}
