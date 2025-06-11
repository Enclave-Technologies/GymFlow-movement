/**
 * Exercise Handlers
 *
 * Handles all exercise-related CRUD operations for the workout planner.
 * Extracted from workout-plan-handlers.tsx for better maintainability.
 */

import { toast } from "sonner";
import { Exercise, Phase } from "../types";
import { addExercise, deleteExercise } from "../workout-utils/exercise-utils";
import { WorkoutQueueIntegration } from "@/lib/workout-queue-integration";
import { UseExerciseEditStateReturn } from "../hooks/use-exercise-edit-state";

export interface ExerciseHandlersProps {
    // State values
    planId: string | null;
    lastKnownUpdatedAt: Date | null;
    client_id: string;
    trainer_id: string;
    latestPhasesRef: React.MutableRefObject<Phase[]>;

    // State setters
    setHasUnsavedChanges: (value: boolean) => void;
    setShowConfirm: (value: {
        type: "phase" | "session" | "exercise" | null;
        phaseId?: string;
        sessionId?: string;
        exerciseId?: string;
    }) => void;

    // Functions
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void;
}

export interface ExerciseHandlersReturn {
    handleSaveExercise: (
        phaseId: string,
        sessionId: string,
        exerciseId: string,
        exerciseData?: Partial<Exercise>
    ) => Promise<void>;
    addExerciseHandler: (phaseId: string, sessionId: string) => Promise<void>;
    deleteExerciseHandler: (
        phaseId: string,
        sessionId: string,
        exerciseId: string
    ) => void;
    confirmDeleteExerciseHandler: (
        phaseId: string,
        sessionId: string,
        exerciseId: string
    ) => Promise<void>;
}

/**
 * Creates exercise-related handlers with proper state management
 */
export function createExerciseHandlers(
    props: ExerciseHandlersProps,
    exerciseEditState: UseExerciseEditStateReturn
): ExerciseHandlersReturn {
    /**
     * Handle saving an exercise (create or update based on state)
     */
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

        // Find the exercise in the current phases
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

        // Determine if this is a new exercise or existing exercise based on edit state
        const currentEditState = exerciseEditState.getCurrentEditState();
        const isNewExercise = currentEditState?.isNew ?? true; // Default to true for safety

        console.log(
            `💾 Saving exercise as ${
                isNewExercise ? "NEW" : "EXISTING"
            } exercise`
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
                        order: exerciseData.order || exercise.order || "",
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
            }
        } catch (error) {
            console.error("Failed to queue exercise save:", error);
            // Don't show error to user as the operation succeeded locally
        }

        props.setHasUnsavedChanges(true);
    };

    /**
     * Handle adding a new exercise
     */
    const addExerciseHandler = async (phaseId: string, sessionId: string) => {
        const currentPhases = props.latestPhasesRef.current;
        const { updatedPhases, newExerciseId } = addExercise(
            currentPhases,
            phaseId,
            sessionId
        );

        props.updatePhases(updatedPhases);

        // Set the exercise edit state to indicate this is a NEW exercise
        exerciseEditState.startCreatingExercise(sessionId, newExerciseId);

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

    /**
     * Handle exercise deletion request
     */
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

    /**
     * Handle confirmed exercise deletion
     */
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
            exerciseEditState.isEditingExercise(sessionId, exerciseId) ||
            exerciseEditState.isCreatingExercise(sessionId, exerciseId)
        ) {
            exerciseEditState.clearExerciseEditState();
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

    return {
        handleSaveExercise,
        addExerciseHandler,
        deleteExerciseHandler,
        confirmDeleteExerciseHandler,
    };
}
