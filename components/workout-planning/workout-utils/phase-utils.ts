import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { updatePhaseActivation } from "@/actions/workout_client_actions";
import { Phase, Exercise, Session } from "../types";
import {
    createEmptyWorkoutPlan,
    persistDuplicatedPhase,
    persistNewPhase,
} from "@/actions/phase_actions";

/**
 * Adds a new phase to the workout plan
 */
export const addPhase = async (
    phases: Phase[],
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void,
    setHasUnsavedChanges: (value: boolean) => void,
    setLastKnownUpdatedAt: (value: Date | null) => void,
    setPlanId: (value: string | null) => void,
    setAddingPhase: (value: boolean) => void,
    planId?: string | null,
    clientId?: string,
    trainerId?: string
) => {
    setAddingPhase(true);
    try {
        // If no plan exists, create one first
        if (!planId && clientId && trainerId) {
            const result = await createEmptyWorkoutPlan(clientId, trainerId);
            if (result.success && result.planId) {
                setPlanId(result.planId);
                planId = result.planId;
            } else {
                console.error("Failed to create new plan:", result.error);
                setAddingPhase(false);
                toast.error("Failed to create workout plan");
                return;
            }
        } else if (!planId && (!clientId || !trainerId)) {
            setAddingPhase(false);
            toast.error(
                "Cannot create phase: Missing client or trainer information"
            );
            return;
        }

        // Calculate the order number based on existing phases
        const orderNumber = phases.length;

        // Generate a new UUID for the phase
        const newPhaseId = uuidv4();

        const newPhase: Phase = {
            id: newPhaseId,
            name: `Untitled Phase`,
            isActive: false,
            isExpanded: true,
            sessions: [],
            // Add planId to ensure parent-child relationship
            planId: planId ?? undefined,
            // Set orderNumber for proper ordering
            orderNumber: orderNumber,
        };
        updatePhases([...phases, newPhase]);
        // Persist to the database
        const result = await persistNewPhase({
            id: newPhaseId,
            name: newPhase.name,
            planId: planId ?? undefined,
            // clientId: clientId, // Pass clientId to create a plan if needed
            orderNumber: orderNumber,
            isActive: false,
        });

        if (result.success) {
            if (result.serverUpdatedAt) {
                setLastKnownUpdatedAt(new Date(result.serverUpdatedAt));
            }
            setHasUnsavedChanges(false);
        } else {
            console.error("Failed to persist phase:", result.error);
            toast.error(result.error || "Failed to create phase");
            setHasUnsavedChanges(true);
        }
    } catch (error) {
        console.error("Error creating phase:", error);
        toast.error("An error occurred while creating the phase");
        setHasUnsavedChanges(true);
    } finally {
        setAddingPhase(false);
    }
};

/**
 * Toggles the expansion state of a phase
 */
export const togglePhaseExpansion = (
    phaseId: string,
    phases: Phase[],
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void
    // setHasUnsavedChanges: (value: boolean) => void
): void => {
    updatePhases(
        phases.map((phase) =>
            phase.id === phaseId
                ? { ...phase, isExpanded: !phase.isExpanded }
                : phase
        )
    );
    // setHasUnsavedChanges(true);
};

/**
 * Toggles the activation state of a phase
 */
export const togglePhaseActivation = async (
    phaseId: string,
    phases: Phase[],
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void,
    lastKnownUpdatedAt: Date | null,
    setLastKnownUpdatedAt: (value: Date | null) => void,
    setSaving: (value: boolean) => void,
    setHasUnsavedChanges: (value: boolean) => void,
    setConflictError: (
        value: { message: string; serverTime: Date } | null
    ) => void,
    setSavePerformed: (value: number | ((prev: number) => number)) => void
) => {
    // Get the new active state (opposite of current)
    const isActive = !phases.find((p) => p.id === phaseId)?.isActive;

    // Optimistically update the UI
    updatePhases(
        phases.map((phase) =>
            phase.id === phaseId
                ? { ...phase, isActive }
                : { ...phase, isActive: false }
        )
    );

    // Set saving state
    setSaving(true);

    try {
        // Call the backend to update the phase activation
        const result = await updatePhaseActivation(
            phaseId,
            isActive,
            lastKnownUpdatedAt || undefined
        );

        if (result.success) {
            toast.success(
                `Phase ${isActive ? "activated" : "deactivated"} successfully`
            );
            setHasUnsavedChanges(false);
            // Clear any previous conflict errors
            setConflictError(null);

            // If we have a planId, update the lastKnownUpdatedAt
            if (result.serverUpdatedAt) {
                setLastKnownUpdatedAt(new Date(result.serverUpdatedAt));
            }

            // Trigger a refetch by incrementing the savePerformed counter
            setSavePerformed((prev) => prev + 1);
        } else {
            // Handle errors
            if (result.conflict) {
                // Handle conflict - another user has modified the plan
                setConflictError({
                    message:
                        result.error ||
                        "Plan has been modified by another user",
                    serverTime: new Date(result.serverUpdatedAt!),
                });
                toast.error(
                    "Conflict detected: Plan has been modified by another user"
                );

                // Revert the optimistic update
                updatePhases(
                    phases.map((phase) =>
                        phase.id === phaseId
                            ? { ...phase, isActive: !isActive }
                            : phase
                    )
                );
            } else {
                // Handle other errors
                toast.error(
                    result.error
                        ? String(result.error)
                        : "Failed to update phase"
                );

                // Revert the optimistic update
                updatePhases(
                    phases.map((phase) =>
                        phase.id === phaseId
                            ? { ...phase, isActive: !isActive }
                            : phase
                    )
                );
            }
        }
    } catch (error) {
        console.error("Error updating phase activation:", error);
        toast.error("An error occurred while updating phase");

        // Revert the optimistic update
        updatePhases(
            phases.map((phase) =>
                phase.id === phaseId ? { ...phase, isActive: !isActive } : phase
            )
        );
    } finally {
        setSaving(false);
    }
};

/**
 * Deletes a phase
 */
export const deletePhase = (
    phaseId: string,
    setShowConfirm: (value: {
        type: "phase" | "session" | "exercise" | null;
        phaseId?: string;
        sessionId?: string;
        exerciseId?: string;
    }) => void
): void => {
    setShowConfirm({ type: "phase", phaseId });
};

/**
 * Confirms deletion of a phase
 */
export const confirmDeletePhase = (
    phaseId: string,
    phases: Phase[],
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void,
    setShowConfirm: (value: {
        type: "phase" | "session" | "exercise" | null;
        phaseId?: string;
        sessionId?: string;
        exerciseId?: string;
    }) => void,
    setHasUnsavedChanges: (value: boolean) => void
) => {
    updatePhases(phases.filter((phase) => phase.id !== phaseId));
    setShowConfirm({ type: null });
    setHasUnsavedChanges(true);
};

/**
 * Duplicates a phase
 */
export const duplicatePhase = async (
    phaseId: string,
    phases: Phase[],
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void,
    setIsDuplicating: (value: boolean) => void,
    setHasUnsavedChanges: (value: boolean) => void,
    setLastKnownUpdatedAt: (value: Date | null) => void,
    planId?: string | null
) => {
    setIsDuplicating(true);

    try {
        const target = phases.find((p) => p.id === phaseId);
        if (!target) {
            setIsDuplicating(false);
            return;
        }

        // Generate new IDs
        const newPhaseId = uuidv4();

        // Create deep copies of sessions and exercises with new IDs
        const copiedSessions = target.sessions.map((session: Session) => {
            const newSessionId = uuidv4();

            // Create deep copies of exercises with new IDs
            const copiedExercises = session.exercises.map(
                (exercise: Exercise) => ({
                    ...exercise,
                    id: uuidv4(), // Generate new ID for each exercise
                    sessionId: newSessionId, // Update sessionId to point to the new session
                })
            );

            // Create a new session with a new ID and the copied exercises
            return {
                ...session,
                id: newSessionId, // Generate new ID for the session
                phaseId: newPhaseId, // Update phaseId to point to the new phase
                exercises: copiedExercises,
            };
        });

        // Calculate the order number for the new phase
        const orderNumber = phases.length;

        // Create the copied phase with new sessions
        const copy: Phase = {
            ...target,
            id: newPhaseId, // Generate new ID for the phase
            name: `${target.name} (Copy)`,
            isActive: false,
            sessions: copiedSessions,
            orderNumber: orderNumber, // Set orderNumber for proper ordering
        };

        updatePhases([...phases, copy]);

        // Persist to the database
        const result = await persistDuplicatedPhase({
            phase: copy,
            sessions: copiedSessions,
            planId: target.planId || planId,
        });

        if (result.success) {
            if (result.serverUpdatedAt) {
                setLastKnownUpdatedAt(new Date(result.serverUpdatedAt));
            }
            setHasUnsavedChanges(false);
            toast.success("Phase duplicated successfully");
        } else {
            console.error("Failed to persist duplicated phase:", result.error);
            toast.error(result.error || "Failed to duplicate phase");
            setHasUnsavedChanges(true);
        }
    } catch (error) {
        console.error("Error duplicating phase:", error);
        toast.error("An error occurred while duplicating phase");
        setHasUnsavedChanges(true);
    } finally {
        setIsDuplicating(false);
    }
};

/**
 * Starts editing a phase name
 */
export const startEditPhase = (
    id: string,
    name: string,
    setEditingPhase: (value: string | null) => void,
    setEditPhaseValue: (value: string) => void
): void => {
    setEditingPhase(id);
    setEditPhaseValue(name);
};

/**
 * Saves the edited phase name
 */
export const savePhaseEdit = (
    editingPhase: string | null,
    editPhaseValue: string,
    phases: Phase[],
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void,
    setEditingPhase: (value: string | null) => void,
    setHasUnsavedChanges: (value: boolean) => void
): void => {
    if (!editingPhase) return;
    updatePhases(
        phases.map((p) =>
            p.id === editingPhase ? { ...p, name: editPhaseValue } : p
        )
    );
    setEditingPhase(null);
    setHasUnsavedChanges(true);
};
