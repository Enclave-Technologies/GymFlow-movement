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

        confirmDeletePhase(
            phaseId,
            currentPhases,
            props.updatePhases,
            props.setShowConfirm,
            props.setHasUnsavedChanges
        );

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

        // Session will be created by addSession function

        props.updatePhases(addSession(currentPhases, phaseId));
        props.setHasUnsavedChanges(true);

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

        props.updatePhases(duplicateSession(currentPhases, phaseId, sessionId));
        props.setHasUnsavedChanges(true);

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

        props.updatePhases(deleteSession(currentPhases, phaseId, sessionId));
        props.setShowConfirm({ type: null });
        props.setHasUnsavedChanges(true);

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

        // Exercise added to local state

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

        // Exercise deleted from local state

        props.updatePhases(
            deleteExercise(currentPhases, phaseId, sessionId, exerciseId)
        );
        props.setShowConfirm({ type: null });
        props.setHasUnsavedChanges(true);

        toast.success("Exercise deleted. Click Save to persist changes.", {
            duration: 2000,
        });
    };

    const handleExerciseEditEnd = () => {
        props.setEditingExercise(null);
    };

    return {
        // Phase handlers
        handleAddPhase,
        handleTogglePhaseExpansion,
        handleTogglePhaseActivation,
        handleDeletePhase,
        handleConfirmDeletePhase,
        handleDuplicatePhase,

        // Session handlers
        addSessionHandler,
        toggleSessionExpansionHandler,
        duplicateSessionHandler,
        deleteSessionHandler,
        confirmDeleteSessionHandler,

        // Exercise handlers
        handleSaveExercise,
        addExerciseHandler,
        deleteExerciseHandler,
        confirmDeleteExerciseHandler,
        handleExerciseEditEnd,
    };
}
