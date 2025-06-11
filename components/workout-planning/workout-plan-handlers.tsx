/**
 * Workout Plan Handlers
 * Contains all CRUD handlers and event handlers for the workout planner
 */

import { toast } from "sonner";
import { Exercise, Phase } from "./types";
import {
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
import { v4 as uuidv4 } from "uuid";
import { UseExerciseEditStateReturn } from "./hooks/use-exercise-edit-state";

export interface WorkoutPlanHandlersProps {
    // State setters
    setHasUnsavedChanges: (value: boolean) => void;
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
    setManualSaveInProgress: (value: boolean) => void;
    setSaving: (value: boolean) => void;
    setPlanId: (value: string | null) => void;
    setLastKnownUpdatedAt: (value: Date | null) => void;
    setSavePerformed: (value: number) => void;
    setIsReorderingSessions: (value: boolean) => void;

    // Exercise edit state
    exerciseEditState: UseExerciseEditStateReturn;

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
    invalidateWorkoutPlanCache: (clientId: string) => void;
    localStorageKey: string;
}

export function createWorkoutPlanHandlers(props: WorkoutPlanHandlersProps) {
    // ===== Phase CRUD =====
    const handleAddPhase = async () => {
        const currentPhases = props.latestPhasesRef.current;

        // Use timestamp divided by 10K for order number (same logic as addPhase function)
        const orderNumber = Math.floor(Date.now() / 10000);

        const newPhase: Phase = {
            id: uuidv4(),
            name: `Untitled Phase`,
            isActive: false,
            isExpanded: true,
            sessions: [],
            planId: props.planId || undefined,
            orderNumber: orderNumber,
        };

        // Update phases with the new phase
        const updatedPhases = [...currentPhases, newPhase];
        props.updatePhases(updatedPhases);
        props.setHasUnsavedChanges(true);

        // Queue the appropriate event based on whether a plan exists
        try {
            if (props.planId) {
                // Plan exists - just create the phase
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
                toast.success("Phase added and queued for processing.", {
                    duration: 2000,
                });
            } else {
                // No plan exists - issue two separate events with delay:
                // 1. Create plan (immediate)
                // 2. Create phase (with 3-second delay to ensure plan is created first)

                const newPlanId = uuidv4(); // Generate plan ID in frontend

                // First: Create the plan immediately
                await WorkoutQueueIntegration.queuePlanCreate(
                    newPlanId,
                    "Workout Plan", // Default plan name
                    props.client_id,
                    props.trainer_id,
                    true // isActive
                );

                // Second: Create the phase with a delay to ensure plan is created first
                setTimeout(async () => {
                    try {
                        await WorkoutQueueIntegration.queuePhaseCreate(
                            newPlanId,
                            props.client_id,
                            props.trainer_id,
                            {
                                id: newPhase.id,
                                name: newPhase.name,
                                orderNumber: newPhase.orderNumber || 0,
                                isActive: newPhase.isActive,
                            }
                        );
                        console.log("Phase creation queued after delay");
                    } catch (error) {
                        console.error(
                            "Failed to queue delayed phase creation:",
                            error
                        );
                    }
                }, 3000); // 3-second delay to ensure plan is created first

                // Update local state with the new plan ID immediately
                props.setPlanId(newPlanId);

                toast.success(
                    "Workout plan and phase created and queued for processing.",
                    {
                        duration: 3000,
                    }
                );
            }
        } catch (error) {
            console.error("Failed to queue phase/plan creation:", error);
            // Don't show error to user as the operation succeeded locally
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
            () => {} // Dummy function for setConflictError
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

        toast.success("Phase deleted and queued for processing.", {
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

        // Find the duplicated phase from the updated phases
        const updatedPhases = props.latestPhasesRef.current;
        const duplicatedPhase = updatedPhases.find(
            (p) => p.name === `${targetPhase.name} (Copy)` && p.id !== phaseId
        );

        // Queue the phase duplication event with full deep copy data
        try {
            if (props.planId && duplicatedPhase) {
                await WorkoutQueueIntegration.queuePhaseDuplicate(
                    props.planId,
                    props.client_id,
                    props.trainer_id,
                    phaseId, // Original phase ID
                    duplicatedPhase, // Full duplicated phase with sessions and exercises
                    props.lastKnownUpdatedAt || new Date()
                );
            }
        } catch (error) {
            console.error("Failed to queue phase duplication:", error);
            // Don't show error to user as the operation succeeded locally
        }

        toast.success("Phase duplicated and queued for processing.", {
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

        toast.success("Session added and queued for processing.", {
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

        // Find the duplicated session from the updated phases
        const updatedPhase = updatedPhases.find((p) => p.id === phaseId);
        const duplicatedSession = updatedPhase?.sessions.find(
            (s) =>
                s.name === `${originalSession?.name} (Copy)` &&
                s.id !== sessionId
        );

        // Queue the session duplication event with full deep copy data
        try {
            if (props.planId && duplicatedSession) {
                await WorkoutQueueIntegration.queueSessionDuplicate(
                    props.planId,
                    phaseId,
                    props.client_id,
                    sessionId, // Original session ID
                    duplicatedSession, // Full duplicated session with exercises
                    props.lastKnownUpdatedAt || new Date()
                );
            }
        } catch (error) {
            console.error("Failed to queue session duplication:", error);
            // Don't show error to user as the operation succeeded locally
        }

        toast.success("Session duplicated and queued for processing.", {
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

        toast.success("Session deleted and queued for processing.", {
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

        // Validate that exerciseId is set (coach must select an exercise from dropdown)
        if (
            exerciseData &&
            (!exerciseData.exerciseId || exerciseData.exerciseId === "")
        ) {
            console.error("Cannot save exercise without valid exerciseId");
            toast.error("Please select a valid exercise from the dropdown");
            return;
        }

        // Determine if this is a new exercise or existing exercise
        // Strategy: Check if the exercise exists in the current database state
        // If it exists in our local phases data and has been saved before, it's an update
        const currentEditState = props.exerciseEditState.getCurrentEditState();

        // More robust logic: Check if exercise was just created locally vs exists in DB
        console.log("🔍 Current exercise edit state:", currentEditState);

        const isNewExercise = (() => {
            // If we have explicit state, use it
            if (currentEditState?.isNew !== undefined) {
                console.log(
                    `✅ Using explicit state: isNew=${currentEditState.isNew}`
                );
                return currentEditState.isNew;
            }

            // Fallback: Check if exercise has minimal data (likely just created)
            const hasMinimalData =
                !exercise.exerciseId || exercise.exerciseId === "";
            console.log(
                `🔍 Exercise ${exercise.id}: exerciseId="${exercise.exerciseId}", hasMinimalData=${hasMinimalData}`
            );
            console.log(
                "⚠️ Using fallback logic because no explicit state found"
            );

            return hasMinimalData;
        })();

        console.log(
            `💾 Saving exercise as ${
                isNewExercise ? "NEW" : "EXISTING"
            } exercise (ID: ${exercise.id})`
        );

        try {
            if (props.planId && exerciseData) {
                await WorkoutQueueIntegration.queueExerciseSave(
                    props.planId,
                    phaseId,
                    sessionId,
                    exercise.id, // planExerciseId
                    props.client_id,
                    {
                        id: exercise.id,
                        exerciseId: exerciseData.exerciseId || "",
                        description:
                            exerciseData.description ||
                            exercise.description ||
                            "New Exercise",
                        motion:
                            exerciseData.motion ||
                            exercise.motion ||
                            "Unspecified",
                        targetArea:
                            exerciseData.targetArea ||
                            exercise.targetArea ||
                            "Unspecified",
                        setsMin: exerciseData.setsMin || exercise.setsMin,
                        setsMax: exerciseData.setsMax || exercise.setsMax,
                        repsMin: exerciseData.repsMin || exercise.repsMin,
                        repsMax: exerciseData.repsMax || exercise.repsMax,
                        tempo: exerciseData.tempo || exercise.tempo,
                        restMin: exerciseData.restMin || exercise.restMin,
                        restMax: exerciseData.restMax || exercise.restMax,
                        customizations:
                            exerciseData.customizations ||
                            exercise.customizations,
                        notes: exerciseData.notes || exercise.notes,
                        additionalInfo:
                            exerciseData.additionalInfo ||
                            exercise.additionalInfo,
                        order: (() => {
                            const orderValue =
                                exerciseData.order || exercise.order || "";
                            console.log(
                                `🔢 Order mapping: "${orderValue}" (keeping as string)`
                            );
                            return orderValue;
                        })(),
                    },
                    isNewExercise, // Use the state to determine create vs update
                    props.lastKnownUpdatedAt || new Date()
                );

                const actionText = isNewExercise ? "created" : "updated";
                toast.success(
                    `Exercise ${actionText} and queued for processing.`,
                    {
                        duration: 2000,
                    }
                );

                // Mark exercise as saved if it was new (convert to existing for future edits)
                if (isNewExercise) {
                    props.exerciseEditState.markExerciseAsSaved(
                        sessionId,
                        exerciseId
                    );
                }
            }
        } catch (error) {
            console.error("Failed to queue exercise save:", error);
            // Don't show error to user as the operation succeeded locally
        }

        props.setHasUnsavedChanges(true);
    };

    const addExerciseHandler = async (phaseId: string, sessionId: string) => {
        const currentPhases = props.latestPhasesRef.current;
        const { updatedPhases, newExerciseId } = addExercise(
            currentPhases,
            phaseId,
            sessionId
        );

        props.updatePhases(updatedPhases);

        // Set the exercise edit state to indicate this is a NEW exercise
        props.exerciseEditState.startCreatingExercise(sessionId, newExerciseId);

        props.setHasUnsavedChanges(true);

        // Note: Queue event will be triggered when user clicks the checkmark button
        // after filling in required fields and selecting a valid exercise
        toast.success(
            "Exercise added. Complete the details and click the checkmark to save.",
            {
                duration: 3000,
            }
        );
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

        // Clear exercise edit state if this exercise was being edited
        if (
            props.exerciseEditState.isEditingExercise(sessionId, exerciseId) ||
            props.exerciseEditState.isCreatingExercise(sessionId, exerciseId)
        ) {
            props.exerciseEditState.clearExerciseEditState();
        }

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

        toast.success("Exercise deleted and queued for processing.", {
            duration: 2000,
        });
    };

    const handleExerciseEditEnd = () => {
        props.exerciseEditState.clearExerciseEditState();
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

        toast.success("Phase renamed and queued for processing.", {
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

        toast.success("Session renamed and queued for processing.", {
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
