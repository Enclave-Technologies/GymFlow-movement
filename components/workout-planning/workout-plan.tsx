"use client";

import { useState, useRef, useCallback } from "react";
import { Exercise, Phase } from "./types";
import type { SelectExercise } from "@/db/schemas";
import { createUpdatePhasesFunction } from "./workout-utils/workout-utils";
import { startEditPhase } from "./workout-utils/phase-utils";
import { WorkoutToolbar } from "./UI-components/WorkoutToolbar";
import { PhaseList } from "./UI-components/PhaseList";
import { DeleteConfirmationDialog } from "./UI-components/DeleteConfirmationDialog";
import { LoadingOverlay } from "./UI-components/LoadingOverlay";
import { useWorkoutPlanCacheInvalidation } from "./hooks/use-workout-plan-cache";

// Import our refactored hooks and handlers
import {
    useWorkoutPlanData,
    useLocalStorageBackup,
    useWorkoutPlanValidation,
    useGlobalSave,
    useBackgroundSync,
    useAutoSave,
    // useEditingSessionTracking,
} from "./workout-plan-hooks";
import {
    createWorkoutPlanHandlers,
    WorkoutPlanHandlersProps,
} from "./workout-plan-handlers";

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
    // ===== Data State =====
    const [phases, setPhases] = useState<Phase[]>([]);
    const latestPhasesRef = useRef<Phase[]>([]);
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
    const [saveStatus, setSaveStatus] = useState<
        "editing" | "queued" | "saving" | "saved"
    >("saved");

    // ===== Background Sync State =====
    const [exerciseUpdateQueue, setExerciseUpdateQueue] = useState<
        Map<string, Exercise>
    >(new Map());
    const [backgroundSyncActive, setBackgroundSyncActive] = useState(false);
    const [manualSaveInProgress, setManualSaveInProgress] = useState(false);

    // ===== Active Editing State =====
    const [activeEditingSessions, setActiveEditingSessions] = useState<
        Set<string>
    >(new Set());

    // ===== Editing State =====
    const [editingPhase, setEditingPhase] = useState<string | null>(null);
    const [editPhaseValue, setEditPhaseValue] = useState("");
    const [editingSession, setEditingSession] = useState<string | null>(null);
    const [editSessionValue, setEditSessionValue] = useState("");
    // const [editingExercise, setEditingExercise] = useState<{
    //     sessionId: string;
    //     exerciseId: string;
    // } | null>(null); // TODO: Implement exercise editing

    // ===== Confirmation Dialogs =====
    const [showConfirm, setShowConfirm] = useState<{
        type: "phase" | "session" | "exercise" | null;
        phaseId?: string;
        sessionId?: string;
        exerciseId?: string;
    }>({ type: null });

    // ===== Session State =====
    // const [startingSessionId, setStartingSessionId] = useState<string | null>(
    //     null
    // ); // TODO: Implement session starting

    // ===== Router & Cache =====
    const invalidateWorkoutPlanCache = useWorkoutPlanCacheInvalidation();

    // ===== Update phases ref =====
    const updatePhasesOriginal = createUpdatePhasesFunction(
        setPhases,
        latestPhasesRef
    );

    // Helper function to format and log phases
    const formatPhasesForLogging = (phases: Phase[]) => {
        if (!phases || phases.length === 0) {
            console.log("No phases available");
            return;
        }
        phases.forEach((phase) => {
            const phaseOrder = phase.orderNumber ?? "?";
            console.log(`${phase.name} (${phaseOrder})`);
            phase.sessions.forEach((session) => {
                const sessionOrder = session.orderNumber ?? "?";
                const sessionDuration = session.duration ?? 0;
                console.log(
                    `\t${session.name} (${sessionOrder}) - ${sessionDuration} min`
                );
                session.exercises.forEach((exercise) => {
                    const description =
                        exercise.description ?? "(No description)";
                    console.log(`\t\t${description}`);
                });
            });
        });
    };

    // Wrapped updatePhases to add logging
    const updatePhases = useCallback(
        (newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])) => {
            updatePhasesOriginal(newPhases);
            if (Array.isArray(newPhases)) {
                formatPhasesForLogging(newPhases);
            }
        },
        [updatePhasesOriginal]
    );

    // ===== Custom Hooks =====
    useWorkoutPlanData({
        client_id,
        setIsLoading,
        setPlanId,
        setLastKnownUpdatedAt,
        updatePhases,
        latestPhasesRef,
        savePerformed,
    });

    const { localStorageKey } = useLocalStorageBackup({
        phases,
        client_id,
        isLoading,
        updatePhases,
        setHasUnsavedChanges,
        setSaveStatus,
    });

    const { validateWorkoutPlan } = useWorkoutPlanValidation();

    const { handleSaveAll } = useGlobalSave({
        latestPhasesRef,
        planId,
        lastKnownUpdatedAt,
        client_id,
        trainer_id,
        setSaveStatus,
        setManualSaveInProgress,
        setSaving,
        setPlanId,
        setLastKnownUpdatedAt,
        setHasUnsavedChanges,
        setConflictError,
        setSavePerformed,
        updatePhases,
        validateWorkoutPlan,
        localStorageKey,
        invalidateWorkoutPlanCache,
        setExerciseUpdateQueue,
    });

    const { processExerciseUpdateQueue } = useBackgroundSync({
        exerciseUpdateQueue,
        backgroundSyncActive,
        manualSaveInProgress,
        setBackgroundSyncActive,
        setExerciseUpdateQueue,
        handleSaveAll,
    });

    const { scheduleAutoSave } = useAutoSave({
        activeEditingSessions,
        exerciseUpdateQueue,
        manualSaveInProgress,
        backgroundSyncActive,
        processExerciseUpdateQueue,
    });

    // const { handleEditingStart, handleEditingEnd, handleEditingChange } =
    //     useEditingSessionTracking({
    //         setActiveEditingSessions,
    //         exerciseUpdateQueue,
    //         scheduleAutoSave,
    //         processExerciseUpdateQueue,
    //     }); // TODO: Implement editing session tracking

    // ===== Computed States =====
    const isAnyOperationInProgress =
        isSaving ||
        manualSaveInProgress ||
        backgroundSyncActive ||
        isReorderingSessions;
    // || startingSessionId !== null; // TODO: Implement session starting

    // ===== Create Handlers =====
    const handlerProps: WorkoutPlanHandlersProps = {
        // State setters
        setHasUnsavedChanges,
        setSaveStatus,
        setShowConfirm,
        setEditingPhase,
        setEditPhaseValue,
        setEditingSession,
        setEditSessionValue,
        setEditingExercise: () => {}, // TODO: Implement exercise editing
        setActiveEditingSessions,
        setExerciseUpdateQueue,
        setManualSaveInProgress,
        setSaving,
        setPlanId,
        setLastKnownUpdatedAt,
        setConflictError,
        setSavePerformed,
        setIsReorderingSessions,

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
        exerciseUpdateQueue,
        backgroundSyncActive,

        // Functions
        updatePhases,
        validateWorkoutPlan,
        handleSaveAll,
        invalidateWorkoutPlanCache,
        localStorageKey,
        scheduleAutoSave,
        processExerciseUpdateQueue,
    };

    const handlers = createWorkoutPlanHandlers(handlerProps);

    // ===== Additional Handlers =====
    const handleStartEditPhase = (id: string, name: string) => {
        startEditPhase(id, name, setEditingPhase, setEditPhaseValue);
    };

    return (
        <div className="h-full flex flex-col">
            {/* Loading Overlay */}
            <LoadingOverlay isVisible={isLoading} />

            {/* Conflict Error Display */}
            {conflictError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <strong>Conflict:</strong> {conflictError.message}
                    <br />
                    <small>
                        Server time: {conflictError.serverTime.toLocaleString()}
                    </small>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0">
                {/* Toolbar */}
                <WorkoutToolbar
                    onAddPhase={handlers.handleAddPhase}
                    onSaveAll={handleSaveAll}
                    hasUnsavedChanges={hasUnsavedChanges}
                    isSaving={isSaving}
                    saveStatus={saveStatus}
                    conflictError={conflictError}
                    client_id={client_id}
                    phases={phases}
                    exercises={exercises}
                    updatePhases={updatePhases}
                    setHasUnsavedChanges={setHasUnsavedChanges}
                    isAnyOperationInProgress={isAnyOperationInProgress}
                />

                {/* Phase List */}
                <div className="flex-1 overflow-auto">
                    <PhaseList
                        phases={phases}
                        isLoading={isLoading}
                        isSaving={isSaving}
                        isAnyOperationInProgress={isAnyOperationInProgress}
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
                        onSavePhaseEdit={() => {}} // TODO: Implement phase edit save
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
                        onStartEditSession={() => {}} // TODO: Implement session edit start
                        onMoveSession={() => {}} // TODO: Implement session move
                        onDragVisual={() => {}} // TODO: Implement drag visual
                        onRenderExercises={() => null} // TODO: Implement exercise rendering
                        editingSession={editingSession}
                        editSessionValue={editSessionValue}
                        onSaveSessionEdit={() => {}} // TODO: Implement session edit save
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
