/**
 * Workout Plan Handlers
 * Contains all CRUD handlers and event handlers for the workout planner
 */

import { toast } from "sonner";
import { Exercise, Phase } from "./types";
import {
    addPhase,
    confirmDeletePhase,
    deletePhase,
    duplicatePhase,
    togglePhaseActivation,
    togglePhaseExpansion,
} from "./workout-utils/phase-utils";
import {
    addSession,
    deleteSession,
    duplicateSession,
    toggleSessionExpansion,
} from "./workout-utils/session-utils";
import { addExercise, deleteExercise } from "./workout-utils/exercise-utils";
import { WorkoutQueueIntegration } from "@/lib/workout-queue-integration";

export interface WorkoutPlanHandlersProps {
    // State setters
    setHasUnsavedChanges: (value: boolean) => void;
    setSaveStatus: (status: "editing" | "queued" | "saving" | "saved") => void;
    setShowConfirm: (value: {
        type: "phase" | "session" | "exercise" | null;
        phaseId?: string;
        sessionId?: string;
        exerciseId?: string;
    }) => void;
    setEditingPhase: (value: string | null) => void;
    setEditPhaseValue: (value: string) => void;
    setEditingSession: (value: string | null) => void;
    setEditSessionValue: (value: string) => void;
    setEditingExercise: (
        value: { sessionId: string; exerciseId: string } | null
    ) => void;
    setManualSaveInProgress: (value: boolean) => void;
    setSaving: (value: boolean) => void;
    setPlanId: (value: string | null) => void;
    setLastKnownUpdatedAt: (value: Date | null) => void;
    setConflictError: (
        value: { message: string; serverTime: Date } | null
    ) => void;
    setSavePerformed: (value: number) => void;
    setIsReorderingSessions: (value: boolean) => void;

    // State values
    planId: string | null;
    lastKnownUpdatedAt: Date | null;
    client_id: string;
    trainer_id: string;
    latestPhasesRef: React.MutableRefObject<Phase[]>;
    editingPhase: string | null;
    editPhaseValue: string;
    editingSession: string | null;
    editSessionValue: string;
    manualSaveInProgress: boolean;

    // Functions
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void;
    validateWorkoutPlan: (phases: Phase[]) => {
        isValid: boolean;
        errors: string[];
    };
    handleSaveAll: () => Promise<void>;
    invalidateWorkoutPlanCache: (clientId: string) => void;
    localStorageKey: string;
}

export function createWorkoutPlanHandlers(props: WorkoutPlanHandlersProps) {
    // ===== Phase CRUD =====
    const handleAddPhase = async () => {
        const currentPhases = props.latestPhasesRef.current;

        // Phase will be created by addPhase function
        addPhase(
            currentPhases,
            props.updatePhases,
            props.setHasUnsavedChanges,
            props.planId
        );

        // Queue the phase creation event
        try {
            if (props.planId) {
                // Get the newly created phase (last one in the array)
                const newPhase = [...currentPhases].pop();
                if (newPhase) {
                    await WorkoutQueueIntegration.queuePhaseCreate(
                        props.planId,
                        props.client_id,
                        props.trainer_id,
                        {
                            id: newPhase.id,
                            name: newPhase.name,
                            orderNumber: newPhase.orderNumber || 0,
                            isActive: newPhase.isActive,
                        }
                    );
                }
            }
        } catch (error) {
            console.error("Failed to queue phase creation:", error);
            // Don't show error to user as the operation succeeded locally
        }

        toast.success("Phase added. Click Save to persist changes.", {
            duration: 2000,
        });
    };

    const handleTogglePhaseExpansion = (phaseId: string) => {
        const currentPhases = props.latestPhasesRef.current;
        togglePhaseExpansion(phaseId, currentPhases, props.updatePhases);
    };

    const handleTogglePhaseActivation = async (phaseId: string) => {
        const currentPhases = props.latestPhasesRef.current;
        await togglePhaseActivation(
            phaseId,
            currentPhases,
            props.updatePhases,
            props.lastKnownUpdatedAt,
            props.setLastKnownUpdatedAt,
            props.setSaving,
            props.setHasUnsavedChanges,
            props.setConflictError
        );
    };

    const handleDeletePhase = (phaseId: string) => {
        deletePhase(phaseId, props.setShowConfirm);
    };

    const handleConfirmDeletePhase = async (phaseId: string) => {
        const currentPhases = props.latestPhasesRef.current;

        // Get the phase before deletion for queue event
        const phaseToDelete = currentPhases.find((p) => p.id === phaseId);

        confirmDeletePhase(
            phaseId,
            currentPhases,
            props.updatePhases,
            props.setShowConfirm,
            props.setHasUnsavedChanges
        );

        // Queue the phase deletion event
        try {
            if (props.planId && phaseToDelete) {
                await WorkoutQueueIntegration.queuePhaseDelete(
                    props.planId,
                    phaseId,
                    props.client_id,
                    props.lastKnownUpdatedAt || new Date()
                );
            }
        } catch (error) {
            console.error("Failed to queue phase deletion:", error);
            // Don't show error to user as the operation succeeded locally
        }

        toast.success("Phase deleted. Click Save to persist changes.", {
            duration: 2000,
        });
    };

    const handleDuplicatePhase = async (phaseId: string) => {
        const currentPhases = props.latestPhasesRef.current;

        const targetPhase = currentPhases.find((p) => p.id === phaseId);
        if (!targetPhase) {
            console.error(`Phase with ID ${phaseId} not found`);
            return;
        }

        // Phase will be duplicated by duplicatePhase function
        duplicatePhase(
            phaseId,
            currentPhases,
            props.updatePhases,
            props.setHasUnsavedChanges
        );

        // Queue the phase creation event for the duplicated phase
        try {
            if (props.planId && targetPhase) {
                // The duplicated phase will have "(Copy)" appended to the name
                // We need to create a new phase object for the queue event
                const duplicatedPhaseData = {
                    id: `${phaseId}-copy-${Date.now()}`, // Temporary ID, will be replaced
                    name: `${targetPhase.name} (Copy)`,
                    orderNumber: Math.floor(Date.now() / 10000), // Same logic as addPhase
                    isActive: false, // Duplicated phases are inactive by default
                };

                await WorkoutQueueIntegration.queuePhaseCreate(
                    props.planId,
                    props.client_id,
                    props.trainer_id,
                    duplicatedPhaseData
                );
            }
        } catch (error) {
            console.error("Failed to queue phase duplication:", error);
            // Don't show error to user as the operation succeeded locally
        }

        toast.success("Phase duplicated. Click Save to persist changes.", {
            duration: 2000,
        });
    };

    // ===== Session CRUD =====
    const addSessionHandler = async (phaseId: string) => {
        const currentPhases = props.latestPhasesRef.current;

        const targetPhase = currentPhases.find((p) => p.id === phaseId);
        if (!targetPhase) {
            console.error(`Phase with ID ${phaseId} not found`);
            return;
        }

        // Session will be created by addSession function
        const updatedPhases = addSession(currentPhases, phaseId);
        props.updatePhases(updatedPhases);
        props.setHasUnsavedChanges(true);

        // Queue the session creation event
        try {
            if (props.planId) {
                // Find the newly created session (last one in the target phase)
                const updatedPhase = updatedPhases.find(
                    (p) => p.id === phaseId
                );
                if (updatedPhase && updatedPhase.sessions.length > 0) {
                    const newSession =
                        updatedPhase.sessions[updatedPhase.sessions.length - 1];
                    await WorkoutQueueIntegration.queueSessionCreate(
                        props.planId,
                        phaseId,
                        props.client_id,
                        {
                            id: newSession.id,
                            name: newSession.name,
                            orderNumber: newSession.orderNumber || 0,
                            sessionTime: newSession.duration,
                        },
                        props.lastKnownUpdatedAt || new Date()
                    );
                }
            }
        } catch (error) {
            console.error("Failed to queue session creation:", error);
            // Don't show error to user as the operation succeeded locally
        }

        toast.success("Session added. Click Save to persist changes.", {
            duration: 2000,
        });
    };

    const toggleSessionExpansionHandler = (
        phaseId: string,
        sessionId: string
    ) => {
        const currentPhases = props.latestPhasesRef.current;
        const updatedPhases = toggleSessionExpansion(
            currentPhases,
            phaseId,
            sessionId
        );
        props.updatePhases(updatedPhases);
    };

    const duplicateSessionHandler = async (
        phaseId: string,
        sessionId: string
    ) => {
        const currentPhases = props.latestPhasesRef.current;

        // Get the original session for reference
        const originalPhase = currentPhases.find((p) => p.id === phaseId);
        const originalSession = originalPhase?.sessions.find(
            (s) => s.id === sessionId
        );

        const updatedPhases = duplicateSession(
            currentPhases,
            phaseId,
            sessionId
        );
        props.updatePhases(updatedPhases);
        props.setHasUnsavedChanges(true);

        // Queue the session creation event for the duplicated session
        try {
            if (props.planId && originalSession) {
                // Find the duplicated session (should have "(Copy)" in the name)
                const updatedPhase = updatedPhases.find(
                    (p) => p.id === phaseId
                );
                const duplicatedSession = updatedPhase?.sessions.find(
                    (s) =>
                        s.name === `${originalSession.name} (Copy)` &&
                        s.id !== sessionId
                );

                if (duplicatedSession) {
                    await WorkoutQueueIntegration.queueSessionCreate(
                        props.planId,
                        phaseId,
                        props.client_id,
                        {
                            id: duplicatedSession.id,
                            name: duplicatedSession.name,
                            orderNumber: duplicatedSession.orderNumber || 0,
                            sessionTime: duplicatedSession.duration,
                        },
                        props.lastKnownUpdatedAt || new Date()
                    );
                }
            }
        } catch (error) {
            console.error("Failed to queue session duplication:", error);
            // Don't show error to user as the operation succeeded locally
        }

        toast.success("Session duplicated. Click Save to persist changes.", {
            duration: 2000,
        });
    };

    const deleteSessionHandler = (phaseId: string, sessionId: string) => {
        props.setShowConfirm({
            type: "session",
            phaseId,
            sessionId,
        });
    };

    const confirmDeleteSessionHandler = async (
        phaseId: string,
        sessionId: string
    ) => {
        const currentPhases = props.latestPhasesRef.current;

        // Get the session before deletion for queue event
        const sessionToDelete = currentPhases
            .find((p) => p.id === phaseId)
            ?.sessions.find((s) => s.id === sessionId);

        props.updatePhases(deleteSession(currentPhases, phaseId, sessionId));
        props.setShowConfirm({ type: null });
        props.setHasUnsavedChanges(true);

        // Queue the session deletion event
        try {
            if (props.planId && sessionToDelete) {
                await WorkoutQueueIntegration.queueSessionDelete(
                    props.planId,
                    phaseId,
                    sessionId,
                    props.client_id,
                    props.lastKnownUpdatedAt || new Date()
                );
            }
        } catch (error) {
            console.error("Failed to queue session deletion:", error);
            // Don't show error to user as the operation succeeded locally
        }

        toast.success("Session deleted. Click Save to persist changes.", {
            duration: 2000,
        });
    };

    // ===== Exercise CRUD =====
    const handleSaveExercise = async (
        phaseId: string,
        sessionId: string,
        exerciseId: string,
        exerciseData?: Partial<Exercise>
    ) => {
        if (exerciseData) {
            console.log("Exercise data being saved:", exerciseData);
        }

        const currentPhases = props.latestPhasesRef.current;

        const phase = currentPhases.find((p) => p.id === phaseId);
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

        // Queue the exercise update event
        try {
            if (props.planId && exerciseData) {
                await WorkoutQueueIntegration.queueExerciseUpdate(
                    props.planId,
                    phaseId,
                    sessionId,
                    exerciseId,
                    exercise.id, // Use exercise.id as planExerciseId
                    props.client_id,
                    exerciseData,
                    props.lastKnownUpdatedAt || new Date()
                );
            }
        } catch (error) {
            console.error("Failed to queue exercise update:", error);
            // Don't show error to user as the operation succeeded locally
        }

        toast.success("Exercise updated. Click Save to persist changes.", {
            duration: 2000,
        });
        props.setHasUnsavedChanges(true);
        props.setSaveStatus("editing");
    };

    const addExerciseHandler = async (phaseId: string, sessionId: string) => {
        const currentPhases = props.latestPhasesRef.current;
        const { updatedPhases, newExerciseId } = addExercise(
            currentPhases,
            phaseId,
            sessionId
        );

        props.updatePhases(updatedPhases);
        props.setEditingExercise({ sessionId, exerciseId: newExerciseId });
        props.setHasUnsavedChanges(true);

        // Queue the exercise creation event
        try {
            if (props.planId) {
                // Find the newly created exercise
                const updatedPhase = updatedPhases.find(
                    (p) => p.id === phaseId
                );
                const updatedSession = updatedPhase?.sessions.find(
                    (s) => s.id === sessionId
                );
                const newExercise = updatedSession?.exercises.find(
                    (e) => e.id === newExerciseId
                );

                if (newExercise) {
                    await WorkoutQueueIntegration.queueExerciseCreate(
                        props.planId,
                        phaseId,
                        sessionId,
                        props.client_id,
                        {
                            id: newExercise.id,
                            exerciseId: newExercise.exerciseId || "",
                            description:
                                newExercise.description || "New Exercise",
                            motion: newExercise.motion || "Unspecified",
                            targetArea: newExercise.targetArea || "Unspecified",
                            setsMin: newExercise.setsMin,
                            setsMax: newExercise.setsMax,
                            repsMin: newExercise.repsMin,
                            repsMax: newExercise.repsMax,
                            tempo: newExercise.tempo,
                            restMin: newExercise.restMin,
                            restMax: newExercise.restMax,
                            customizations: newExercise.customizations,
                            notes: newExercise.notes,
                        },
                        props.lastKnownUpdatedAt || new Date()
                    );
                }
            }
        } catch (error) {
            console.error("Failed to queue exercise creation:", error);
            // Don't show error to user as the operation succeeded locally
        }

        toast.success("Exercise added. Click Save to persist changes.", {
            duration: 2000,
        });
    };

    const deleteExerciseHandler = (
        phaseId: string,
        sessionId: string,
        exerciseId: string
    ) => {
        props.setShowConfirm({
            type: "exercise",
            phaseId,
            sessionId,
            exerciseId,
        });
    };

    const confirmDeleteExerciseHandler = async (
        phaseId: string,
        sessionId: string,
        exerciseId: string
    ) => {
        const currentPhases = props.latestPhasesRef.current;

        // Get the exercise before deletion for queue event
        const exerciseToDelete = currentPhases
            .find((p) => p.id === phaseId)
            ?.sessions.find((s) => s.id === sessionId)
            ?.exercises.find((e) => e.id === exerciseId);

        props.updatePhases(
            deleteExercise(currentPhases, phaseId, sessionId, exerciseId)
        );
        props.setShowConfirm({ type: null });
        props.setHasUnsavedChanges(true);

        // Queue the exercise deletion event
        try {
            if (props.planId && exerciseToDelete) {
                await WorkoutQueueIntegration.queueExerciseDelete(
                    props.planId,
                    phaseId,
                    sessionId,
                    exerciseId,
                    exerciseToDelete.id, // Use exercise.id as planExerciseId
                    props.client_id,
                    props.lastKnownUpdatedAt || new Date()
                );
            }
        } catch (error) {
            console.error("Failed to queue exercise deletion:", error);
            // Don't show error to user as the operation succeeded locally
        }

        toast.success("Exercise deleted. Click Save to persist changes.", {
            duration: 2000,
        });
    };

    const handleExerciseEditEnd = () => {
        props.setEditingExercise(null);
    };

    // ===== Phase and Session Rename Handlers =====
    const handleSavePhaseEdit = async () => {
        if (!props.editingPhase || !props.editPhaseValue.trim()) {
            props.setEditingPhase(null);
            return;
        }

        const currentPhases = props.latestPhasesRef.current;
        const phaseToUpdate = currentPhases.find(
            (p) => p.id === props.editingPhase
        );

        if (!phaseToUpdate) {
            console.error(`Phase with ID ${props.editingPhase} not found`);
            props.setEditingPhase(null);
            return;
        }

        // Update the phase name locally
        const updatedPhases = currentPhases.map((phase) =>
            phase.id === props.editingPhase
                ? { ...phase, name: props.editPhaseValue.trim() }
                : phase
        );

        props.updatePhases(updatedPhases);
        props.setHasUnsavedChanges(true);
        props.setEditingPhase(null);

        // Queue the phase update event
        try {
            if (props.planId) {
                await WorkoutQueueIntegration.queuePhaseUpdate(
                    props.planId,
                    props.editingPhase,
                    props.client_id,
                    { name: props.editPhaseValue.trim() },
                    props.lastKnownUpdatedAt || new Date()
                );
            }
        } catch (error) {
            console.error("Failed to queue phase rename:", error);
            // Don't show error to user as the operation succeeded locally
        }

        toast.success("Phase renamed. Click Save to persist changes.", {
            duration: 2000,
        });
    };

    const handleSaveSessionEdit = async () => {
        if (!props.editingSession || !props.editSessionValue.trim()) {
            props.setEditingSession(null);
            return;
        }

        const currentPhases = props.latestPhasesRef.current;
        let sessionToUpdate = null;
        let phaseId = null;

        // Find the session across all phases
        for (const phase of currentPhases) {
            const session = phase.sessions.find(
                (s) => s.id === props.editingSession
            );
            if (session) {
                sessionToUpdate = session;
                phaseId = phase.id;
                break;
            }
        }

        if (!sessionToUpdate || !phaseId) {
            console.error(`Session with ID ${props.editingSession} not found`);
            props.setEditingSession(null);
            return;
        }

        // Update the session name locally
        const updatedPhases = currentPhases.map((phase) =>
            phase.id === phaseId
                ? {
                      ...phase,
                      sessions: phase.sessions.map((session) =>
                          session.id === props.editingSession
                              ? {
                                    ...session,
                                    name: props.editSessionValue.trim(),
                                }
                              : session
                      ),
                  }
                : phase
        );

        props.updatePhases(updatedPhases);
        props.setHasUnsavedChanges(true);
        props.setEditingSession(null);

        // Queue the session update event
        try {
            if (props.planId) {
                await WorkoutQueueIntegration.queueSessionUpdate(
                    props.planId,
                    phaseId,
                    props.editingSession,
                    props.client_id,
                    { name: props.editSessionValue.trim() },
                    props.lastKnownUpdatedAt || new Date()
                );
            }
        } catch (error) {
            console.error("Failed to queue session rename:", error);
            // Don't show error to user as the operation succeeded locally
        }

        toast.success("Session renamed. Click Save to persist changes.", {
            duration: 2000,
        });
    };

    return {
        // Phase handlers
        handleAddPhase,
        handleTogglePhaseExpansion,
        handleTogglePhaseActivation,
        handleDeletePhase,
        handleConfirmDeletePhase,
        handleDuplicatePhase,
        handleSavePhaseEdit,

        // Session handlers
        addSessionHandler,
        toggleSessionExpansionHandler,
        duplicateSessionHandler,
        deleteSessionHandler,
        confirmDeleteSessionHandler,
        handleSaveSessionEdit,

        // Exercise handlers
        handleSaveExercise,
        addExerciseHandler,
        deleteExerciseHandler,
        confirmDeleteExerciseHandler,
        handleExerciseEditEnd,
    };
}
