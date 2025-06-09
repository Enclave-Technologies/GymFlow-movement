/**
 * Workout Plan Handlers
 * Contains all CRUD handlers and event handlers for the workout planner
 */

import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Exercise, Phase } from "./types";
import { WorkoutQueueIntegration } from "@/lib/workout-queue-integration";
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
    setActiveEditingSessions: React.Dispatch<React.SetStateAction<Set<string>>>;
    setExerciseUpdateQueue: React.Dispatch<
        React.SetStateAction<Map<string, Exercise>>
    >;
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
    exerciseUpdateQueue: Map<string, Exercise>;
    backgroundSyncActive: boolean;

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
    scheduleAutoSave: () => void;
    processExerciseUpdateQueue: () => Promise<void>;
}

export function createWorkoutPlanHandlers(props: WorkoutPlanHandlersProps) {
    // ===== Phase CRUD =====
    const handleAddPhase = async () => {
        const currentPhases = props.latestPhasesRef.current;

        const orderNumber = Math.floor(Date.now() / 10000);
        const newPhase = {
            id: uuidv4(),
            name: `Untitled Phase`,
            isActive: false,
            isExpanded: true,
            sessions: [],
            planId: props.planId || undefined,
            orderNumber: orderNumber,
        };

        addPhase(
            currentPhases,
            props.updatePhases,
            props.setHasUnsavedChanges,
            props.planId
        );

        if (props.planId) {
            try {
                await WorkoutQueueIntegration.queuePhaseCreate(
                    props.planId,
                    props.client_id,
                    props.trainer_id,
                    {
                        id: newPhase.id,
                        name: newPhase.name,
                        orderNumber: newPhase.orderNumber,
                        isActive: newPhase.isActive,
                    },
                    props.trainer_id
                );

                console.log("Phase creation queued successfully");
                toast.success("Phase queued for creation", { duration: 1000 });
            } catch (error) {
                console.error("Failed to queue phase creation:", error);
                toast.error("Failed to queue phase creation");
            }
        }
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

        if (props.planId) {
            try {
                await WorkoutQueueIntegration.queuePhaseDelete(
                    props.planId,
                    phaseId,
                    props.client_id,
                    props.lastKnownUpdatedAt || new Date(),
                    props.trainer_id
                );

                console.log("Phase deletion queued successfully");
                toast.success("Phase queued for deletion", { duration: 1000 });
            } catch (error) {
                console.error("Failed to queue phase deletion:", error);
                toast.error("Failed to queue phase deletion");
            }
        }
    };

    const handleDuplicatePhase = async (phaseId: string) => {
        const currentPhases = props.latestPhasesRef.current;

        const targetPhase = currentPhases.find((p) => p.id === phaseId);
        if (!targetPhase) {
            console.error(`Phase with ID ${phaseId} not found`);
            return;
        }

        const newPhaseId = uuidv4();
        const orderNumber = Math.floor(Date.now() / 10000);
        const duplicatedPhase = {
            ...targetPhase,
            id: newPhaseId,
            name: `${targetPhase.name} (Copy)`,
            isActive: false,
            orderNumber: orderNumber,
        };

        duplicatePhase(
            phaseId,
            currentPhases,
            props.updatePhases,
            props.setHasUnsavedChanges
        );

        if (props.planId) {
            try {
                await WorkoutQueueIntegration.queueFullPlanSave(
                    props.planId,
                    props.client_id,
                    props.trainer_id,
                    [...currentPhases, duplicatedPhase],
                    props.lastKnownUpdatedAt || undefined,
                    props.trainer_id
                );

                console.log("Phase duplication queued successfully");
                toast.success("Phase duplication queued for save", {
                    duration: 1000,
                });
            } catch (error) {
                console.error("Failed to queue phase duplication:", error);
                toast.error("Failed to queue phase duplication");
            }
        }
    };

    // ===== Session CRUD =====
    const addSessionHandler = async (phaseId: string) => {
        const currentPhases = props.latestPhasesRef.current;

        const targetPhase = currentPhases.find((p) => p.id === phaseId);
        if (!targetPhase) {
            console.error(`Phase with ID ${phaseId} not found`);
            return;
        }

        const count = targetPhase.sessions.length + 1;
        const maxOrderNumber =
            targetPhase.sessions.length > 0
                ? Math.max(
                      ...targetPhase.sessions.map((s) => s.orderNumber || 0)
                  )
                : -1;

        const newSession = {
            id: uuidv4(),
            name: `Untitled Session ${count}`,
            orderNumber: maxOrderNumber + 1,
            sessionTime: 0,
        };

        props.updatePhases(addSession(currentPhases, phaseId));
        props.setHasUnsavedChanges(true);

        if (props.planId) {
            try {
                await WorkoutQueueIntegration.queueSessionCreate(
                    props.planId,
                    phaseId,
                    props.client_id,
                    newSession,
                    props.lastKnownUpdatedAt || new Date(),
                    props.trainer_id
                );

                console.log("Session creation queued successfully");
                toast.success("Session queued for creation", {
                    duration: 1000,
                });
            } catch (error) {
                console.error("Failed to queue session creation:", error);
                toast.error("Failed to queue session creation");
            }
        }
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

        if (props.planId) {
            try {
                await WorkoutQueueIntegration.queueFullPlanSave(
                    props.planId,
                    props.client_id,
                    props.trainer_id,
                    duplicateSession(currentPhases, phaseId, sessionId),
                    props.lastKnownUpdatedAt || undefined,
                    props.trainer_id
                );

                console.log("Session duplication queued successfully");
                toast.success("Session duplication queued for save", {
                    duration: 1000,
                });
            } catch (error) {
                console.error("Failed to queue session duplication:", error);
                toast.error("Failed to queue session duplication");
            }
        }
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

        if (props.planId) {
            try {
                await WorkoutQueueIntegration.queueSessionDelete(
                    props.planId,
                    phaseId,
                    sessionId,
                    props.client_id,
                    props.lastKnownUpdatedAt || new Date(),
                    props.trainer_id
                );

                console.log("Session deletion queued successfully");
                toast.success("Session queued for deletion", {
                    duration: 1000,
                });
            } catch (error) {
                console.error("Failed to queue session deletion:", error);
                toast.error("Failed to queue session deletion");
            }
        }
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

        try {
            await WorkoutQueueIntegration.queueExerciseUpdate(
                props.planId || "",
                phaseId,
                sessionId,
                exerciseId,
                exercise.id,
                props.client_id,
                {
                    exerciseId: exercise.exerciseId,
                    description: exercise.description,
                    motion: exercise.motion,
                    targetArea: exercise.targetArea,
                    setsMin: exercise.setsMin,
                    setsMax: exercise.setsMax,
                    repsMin: exercise.repsMin,
                    repsMax: exercise.repsMax,
                    tempo: exercise.tempo,
                    restMin: exercise.restMin,
                    restMax: exercise.restMax,
                    customizations: exercise.customizations,
                    notes: exercise.notes,
                },
                props.lastKnownUpdatedAt || new Date(),
                props.trainer_id
            );

            toast.success("Exercise queued for save", { duration: 1000 });
            props.setHasUnsavedChanges(true);
            props.setSaveStatus("queued");
        } catch (error) {
            console.error("Failed to queue exercise update:", error);
            toast.error("Failed to queue exercise update");
        }
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

        const newExercise = updatedPhases
            .find((p) => p.id === phaseId)
            ?.sessions.find((s) => s.id === sessionId)
            ?.exercises.find((e) => e.id === newExerciseId);

        if (newExercise && props.planId) {
            try {
                await WorkoutQueueIntegration.queueExerciseCreate(
                    props.planId,
                    phaseId,
                    sessionId,
                    props.client_id,
                    {
                        id: newExercise.id,
                        exerciseId: newExercise.exerciseId || "",
                        description: newExercise.description || "",
                        motion: newExercise.motion || "",
                        targetArea: newExercise.targetArea || "",
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
                    props.lastKnownUpdatedAt || new Date(),
                    props.trainer_id
                );

                console.log("Exercise creation queued successfully");
                toast.success("Exercise queued for creation", {
                    duration: 1000,
                });
            } catch (error) {
                console.error("Failed to queue exercise creation:", error);
                toast.error("Failed to queue exercise creation");
            }
        }
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

        const exercise = currentPhases
            .find((p) => p.id === phaseId)
            ?.sessions.find((s) => s.id === sessionId)
            ?.exercises.find((e) => e.id === exerciseId);

        props.updatePhases(
            deleteExercise(currentPhases, phaseId, sessionId, exerciseId)
        );
        props.setShowConfirm({ type: null });
        props.setHasUnsavedChanges(true);

        if (exercise && props.planId) {
            try {
                await WorkoutQueueIntegration.queueExerciseDelete(
                    props.planId,
                    phaseId,
                    sessionId,
                    exerciseId,
                    exercise.id,
                    props.client_id,
                    props.lastKnownUpdatedAt || new Date(),
                    props.trainer_id
                );

                console.log("Exercise deletion queued successfully");
                toast.success("Exercise queued for deletion", {
                    duration: 1000,
                });
            } catch (error) {
                console.error("Failed to queue exercise deletion:", error);
                toast.error("Failed to queue exercise deletion");
            }
        }
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
