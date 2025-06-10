"use client";

import { useState, useEffect } from "react";
import { Phase } from "./types";
import type { SelectExercise } from "@/db/schemas";
import { WorkoutToolbar } from "./UI-components/WorkoutToolbar";
import { PhaseList } from "./UI-components/PhaseList";
import { DeleteConfirmationDialog } from "./UI-components/DeleteConfirmationDialog";
import { LoadingOverlay } from "./UI-components/LoadingOverlay";
import { fetchWorkoutPlan } from "./workout-utils/workout-utils";
import { toast } from "sonner";

type WorkoutPlannerProps = {
    client_id: string;
    exercises: SelectExercise[];
    trainer_id: string;
};

export default function WorkoutPlanner({
    client_id,
    exercises,
}: // trainer_id,
WorkoutPlannerProps) {
    // ===== Simplified State =====
    const [phases, setPhases] = useState<Phase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingPhase, setEditingPhase] = useState<string | null>(null);
    const [editPhaseValue, setEditPhaseValue] = useState("");
    const [editingSession] = useState<string | null>(null);
    const [editSessionValue, setEditSessionValue] = useState("");
    const [showConfirm, setShowConfirm] = useState<{
        type: "phase" | "session" | "exercise" | null;
        phaseId?: string;
        sessionId?: string;
        exerciseId?: string;
    }>({ type: null });

    // ===== Load Data =====
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                await fetchWorkoutPlan(
                    client_id,
                    setIsLoading,
                    () => {}, // setPlanId - not needed for now
                    () => {}, // setLastKnownUpdatedAt - not needed for now
                    setPhases
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

    // ===== Simple Handlers =====
    const handleAddPhase = () => {
        console.log("Add phase clicked - functionality temporarily disabled");
        toast.info("Add phase functionality temporarily disabled");
    };

    const handleSaveAll = () => {
        console.log("Save all clicked - functionality temporarily disabled");
        toast.info("Save functionality temporarily disabled");
    };

    const handleStartEditPhase = (id: string, name: string) => {
        setEditingPhase(id);
        setEditPhaseValue(name);
    };

    // Dummy handlers for now
    const dummyHandlers = {
        handleTogglePhaseExpansion: (phaseId: string) => {
            console.log("Toggle phase expansion:", phaseId);
        },
        handleTogglePhaseActivation: (phaseId: string) => {
            console.log("Toggle phase activation:", phaseId);
        },
        handleDeletePhase: (phaseId: string) => {
            console.log("Delete phase:", phaseId);
        },
        handleDuplicatePhase: (phaseId: string) => {
            console.log("Duplicate phase:", phaseId);
        },
        addSessionHandler: (phaseId: string) => {
            console.log("Add session:", phaseId);
        },
        toggleSessionExpansionHandler: (phaseId: string, sessionId: string) => {
            console.log("Toggle session expansion:", phaseId, sessionId);
        },
        duplicateSessionHandler: (phaseId: string, sessionId: string) => {
            console.log("Duplicate session:", phaseId, sessionId);
        },
        deleteSessionHandler: (phaseId: string, sessionId: string) => {
            console.log("Delete session:", phaseId, sessionId);
        },
        confirmDeleteSessionHandler: (phaseId: string, sessionId: string) => {
            console.log("Confirm delete session:", phaseId, sessionId);
        },
        handleSaveExercise: (
            phaseId: string,
            sessionId: string,
            exerciseId: string
            // exercise?: Partial<Exercise>
        ) => {
            console.log("Save exercise:", phaseId, sessionId, exerciseId);
        },
        addExerciseHandler: (phaseId: string, sessionId: string) => {
            console.log("Add exercise:", phaseId, sessionId);
        },
        deleteExerciseHandler: (
            phaseId: string,
            sessionId: string,
            exerciseId: string
        ) => {
            console.log("Delete exercise:", phaseId, sessionId, exerciseId);
        },
        confirmDeleteExerciseHandler: (
            phaseId: string,
            sessionId: string,
            exerciseId: string
        ) => {
            console.log(
                "Confirm delete exercise:",
                phaseId,
                sessionId,
                exerciseId
            );
        },
        handleExerciseEditEnd: () => {
            console.log("Exercise edit end");
        },
    };

    return (
        <div className="h-full flex flex-col">
            {/* Loading Overlay */}
            <LoadingOverlay isVisible={isLoading} />

            {/* Simplified - no conflict error display for now */}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0">
                {/* Toolbar */}
                <WorkoutToolbar
                    onAddPhase={handleAddPhase}
                    onSaveAll={handleSaveAll}
                    hasUnsavedChanges={false}
                    isSaving={false}
                    saveStatus="saved"
                    conflictError={null}
                    client_id={client_id}
                    phases={phases}
                    exercises={exercises}
                    updatePhases={() => {}}
                    setHasUnsavedChanges={() => {}}
                    isAnyOperationInProgress={false}
                />

                {/* Phase List */}
                <div className="flex-1 overflow-auto">
                    <PhaseList
                        phases={phases}
                        isLoading={isLoading}
                        isSaving={false}
                        isAnyOperationInProgress={false}
                        // Phase handlers
                        onToggleExpand={
                            dummyHandlers.handleTogglePhaseExpansion
                        }
                        onAddSession={dummyHandlers.addSessionHandler}
                        onEditPhase={handleStartEditPhase}
                        onDeletePhase={dummyHandlers.handleDeletePhase}
                        onDuplicatePhase={dummyHandlers.handleDuplicatePhase}
                        onToggleActivation={
                            dummyHandlers.handleTogglePhaseActivation
                        }
                        editingPhase={editingPhase}
                        editPhaseValue={editPhaseValue}
                        onSavePhaseEdit={() => {}} // TODO: Implement phase edit save
                        onEditPhaseValueChange={(value: string) =>
                            setEditPhaseValue(value)
                        }
                        // Session handlers
                        onToggleSession={
                            dummyHandlers.toggleSessionExpansionHandler
                        }
                        onDeleteSession={dummyHandlers.deleteSessionHandler}
                        onDuplicateSession={
                            dummyHandlers.duplicateSessionHandler
                        }
                        onAddExercise={dummyHandlers.addExerciseHandler}
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
                onDeletePhase={() => {}}
                onDeleteSession={() => {}}
                onDeleteExercise={() => {}}
                onCancel={() => setShowConfirm({ type: null })}
            />
        </div>
    );
}
