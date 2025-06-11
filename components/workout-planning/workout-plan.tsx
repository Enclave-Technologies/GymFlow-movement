"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Phase, Session, Exercise } from "./types";
import type { SelectExercise } from "@/db/schemas";
import { WorkoutToolbar } from "./UI-components/WorkoutToolbar";
import { PhaseList } from "./UI-components/PhaseList";
import { DeleteConfirmationDialog } from "./UI-components/DeleteConfirmationDialog";
import ExerciseTableInline from "./UI-components/ExerciseTableInline";
import { fetchWorkoutPlan } from "./workout-utils/workout-utils";
import { createWorkoutPlan } from "@/actions/workout_plan_actions";
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
    const [isReloading, setIsReloading] = useState(false);
    const [isCreatingPlan, setIsCreatingPlan] = useState(false);
    const [startingSessionId, setStartingSessionId] = useState<string | null>(
        null
    );

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
    const planCreationInProgressRef = useRef<boolean>(false);

    // Update ref whenever phases change
    useEffect(() => {
        latestPhasesRef.current = phases;
    }, [phases]);

    // ===== Hooks =====
    const router = useRouter();
    const { validateWorkoutPlan } = useWorkoutPlanValidation();
    const invalidateWorkoutPlanCache = useWorkoutPlanCacheInvalidation();

    // Local storage key
    const localStorageKey = `workout-plan-${client_id}`;

    // ===== Update Phases Function =====
    const updatePhases = useCallback(
        (newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])) => {
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
        },
        []
    );

    // ===== Data Loading =====
    // Note: loadData function removed as it was unused.
    // Data loading is now handled by ensurePlanExists function.

    // ===== Ensure Plan Exists =====
    const ensurePlanExists = useCallback(async () => {
        setIsLoading(true);
        try {
            // First try to load existing plan
            await fetchWorkoutPlan(
                client_id,
                () => {}, // Don't set loading state here since we're managing it
                (id) => {
                    if (id) {
                        setPlanId(id);
                    }
                },
                setLastKnownUpdatedAt,
                updatePhases
            );

            // Check if we have a plan after loading
            const response = await import(
                "@/actions/workout_client_actions"
            ).then((module) => module.getWorkoutPlanByClientId(client_id));

            let currentPlanId = null;
            if (response && "planId" in response) {
                currentPlanId = response.planId;
            }

            // If no plan was found, create one (with protection against duplicate creation)
            if (
                !currentPlanId &&
                !isCreatingPlan &&
                !planCreationInProgressRef.current
            ) {
                console.log("No workout plan found for user, creating one...");
                setIsCreatingPlan(true);
                planCreationInProgressRef.current = true;

                try {
                    const result = await createWorkoutPlan(
                        client_id,
                        trainer_id,
                        {
                            phases: [], // Start with empty phases for new plan
                        }
                    );

                    if (result.success && result.planId) {
                        setPlanId(result.planId);
                        setLastKnownUpdatedAt(
                            result.updatedAt
                                ? new Date(result.updatedAt)
                                : new Date()
                        );
                        console.log(
                            "Workout plan created successfully:",
                            result.planId
                        );
                        // Set empty phases since it's a new plan
                        updatePhases([]);
                    } else {
                        console.error(
                            "Failed to create workout plan:",
                            result.error
                        );
                        throw new Error(
                            result.error || "Failed to create workout plan"
                        );
                    }
                } finally {
                    setIsCreatingPlan(false);
                    planCreationInProgressRef.current = false;
                }
            }
        } catch (error) {
            console.error("Error ensuring plan exists:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [client_id, trainer_id, isCreatingPlan, updatePhases]);

    useEffect(() => {
        ensurePlanExists();
    }, [ensurePlanExists]);

    // ===== Reload Function =====
    const handleReload = async () => {
        setIsReloading(true);
        try {
            await ensurePlanExists();
            // Clear any unsaved changes since we're reloading from DB
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error("Error reloading workout plan:", error);
        } finally {
            setIsReloading(false);
        }
    };

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

    // ===== Session Start Handler =====
    const handleStartSession = useCallback(
        async (sessionId: string) => {
            try {
                setStartingSessionId(sessionId);

                // Find the session and phase information
                const phase = phases.find((p) =>
                    p.sessions.some((s) => s.id === sessionId)
                );
                const session = phase?.sessions.find((s) => s.id === sessionId);

                if (!phase || !session) {
                    console.error("Session or phase not found");
                    return;
                }

                // Navigate to record-workout page with session parameters
                const searchParams = new URLSearchParams({
                    clientId: client_id,
                    phaseId: phase.id,
                    sessionId: session.id,
                });

                router.push(`/record-workout?${searchParams.toString()}`);
            } catch (error) {
                console.error("Error starting session:", error);
            } finally {
                setStartingSessionId(null);
            }
        },
        [phases, client_id, router]
    );

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
                    onReload={handleReload}
                    client_id={client_id}
                    trainer_id={trainer_id}
                    planId={planId}
                    setPlanId={setPlanId}
                    lastKnownUpdatedAt={lastKnownUpdatedAt}
                    phases={phases}
                    exercises={exercises}
                    updatePhases={updatePhases}
                    setHasUnsavedChanges={setHasUnsavedChanges}
                    isAnyOperationInProgress={
                        manualSaveInProgress ||
                        isSaving ||
                        isCreatingPlan ||
                        isLoading
                    }
                    isReloading={isReloading}
                />

                {/* Phase List */}
                <div className="flex-1 overflow-auto">
                    <PhaseList
                        phases={phases}
                        isLoading={isLoading}
                        isSaving={isSaving}
                        isAnyOperationInProgress={
                            manualSaveInProgress ||
                            isSaving ||
                            isCreatingPlan ||
                            isLoading
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
                        onStartSession={handleStartSession}
                        startingSessionId={startingSessionId}
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
