"use client";

import { useState, useEffect, useRef } from "react";
import { Phase } from "./types";
import type { SelectExercise } from "@/db/schemas";
import { WorkoutToolbar } from "./UI-components/WorkoutToolbar";
import { PhaseList } from "./UI-components/PhaseList";
import { DeleteConfirmationDialog } from "./UI-components/DeleteConfirmationDialog";
import { fetchWorkoutPlan } from "./workout-utils/workout-utils";
import { createWorkoutPlanHandlers } from "./workout-plan-handlers";
import { useGlobalSave, useWorkoutPlanValidation } from "./workout-plan-hooks";
import { useWorkoutPlanCacheInvalidation } from "./hooks/use-workout-plan-cache";

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
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<
        "editing" | "queued" | "saving" | "saved"
    >("saved");
    const [conflictError, setConflictError] = useState<{
        message: string;
        serverTime: Date;
    } | null>(null);
    const [manualSaveInProgress, setManualSaveInProgress] = useState(false);

    // ===== Edit State =====
    const [editingPhase, setEditingPhase] = useState<string | null>(null);
    const [editPhaseValue, setEditPhaseValue] = useState("");
    const [editingSession, setEditingSession] = useState<string | null>(null);
    const [editSessionValue, setEditSessionValue] = useState("");

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

    // ===== Global Save Hook =====
    const { handleSaveAll } = useGlobalSave({
        latestPhasesRef,
        planId,
        lastKnownUpdatedAt,
        client_id,
        trainer_id,
        setSaving,
        setPlanId,
        setLastKnownUpdatedAt,
        setHasUnsavedChanges,
        setConflictError,
        setSavePerformed: () => {}, // Dummy function since we don't use savePerformed
        setManualSaveInProgress,
        setSaveStatus,
        updatePhases,
        validateWorkoutPlan,
        localStorageKey,
        invalidateWorkoutPlanCache,
    });

    // ===== Create Handlers =====
    const handlers = createWorkoutPlanHandlers({
        // State setters
        setEditingPhase,
        setEditPhaseValue,
        setEditingSession,
        setEditSessionValue,
        setEditingExercise: () => {}, // Dummy function since we don't use editingExercise
        setShowConfirm,
        setHasUnsavedChanges,
        setSaveStatus,
        setSaving,
        setPlanId,
        setLastKnownUpdatedAt,
        setConflictError,
        setSavePerformed: () => {}, // Dummy function since we don't use savePerformed
        setManualSaveInProgress,
        setIsReorderingSessions: () => {}, // Dummy function since we don't use isReorderingSessions

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
        handleSaveAll,
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

    return (
        <div className="h-full flex flex-col">
            {/* Simplified - no conflict error display for now */}

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
                        onRenderExercises={() => null} // TODO: Implement exercise rendering
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
