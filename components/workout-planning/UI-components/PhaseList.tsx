"use client";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Loader2 } from "lucide-react";
import { Phase, Session } from "../types";
import { PhaseCard } from "./PhaseCard";

interface PhaseListProps {
    phases: Phase[];
    isLoading: boolean;

    // Phase handlers
    onToggleExpand: (phaseId: string) => void;
    onAddSession: (phaseId: string) => void;
    onEditPhase: (id: string, name: string) => void;
    onDeletePhase: (phaseId: string) => void;
    onDuplicatePhase: (phaseId: string) => void;
    onToggleActivation: (phaseId: string) => void;
    editingPhase: string | null;
    editPhaseValue: string;
    onSavePhaseEdit: () => void;
    onEditPhaseValueChange: (value: string) => void;

    // Session handlers
    onToggleSession: (phaseId: string, sessionId: string) => void;
    onDeleteSession: (phaseId: string, sessionId: string) => void;
    onDuplicateSession: (phaseId: string, sessionId: string) => void;
    onAddExercise: (phaseId: string, sessionId: string) => void;
    onStartSession: (sessionId: string, phaseId: string) => void;
    startingSessionId: string | null;
    onStartEditSession: (id: string, name: string) => void;
    onMoveSession: (
        phaseId: string,
        dragIndex: number,
        hoverIndex: number
    ) => void;
    onDragVisual: (
        phaseId: string,
        dragIndex: number,
        hoverIndex: number
    ) => void;
    onRenderExercises: (phase: Phase, session: Session) => React.ReactNode;
    editingSession: string | null;
    editSessionValue: string;
    onSaveSessionEdit: () => void;
    onEditSessionValueChange: (value: string) => void;
}

/**
 * Displays a centered loading spinner and message indicating that the workout plan is loading.
 */
function LoadingState() {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
                <p className="mt-4 text-sm text-muted-foreground">
                    Loading workout plan...
                </p>
            </div>
        </div>
    );
}

/**
 * Displays a message indicating that no workout phases have been added.
 *
 * Shows a prompt encouraging the user to add a new phase.
 */
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center p-10">
            <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                    No phases added yet
                </h3>
                <p className="text-muted-foreground">
                    Click &quot;Add Phase&quot; to get started
                </p>
            </div>
        </div>
    );
}

/**
 * Renders a list of workout phases with drag-and-drop support, displaying loading or empty states as appropriate.
 *
 * Displays a loading spinner if data is loading, an empty state if no phases exist, or a draggable list of phase cards with full control over phase and session management via provided handlers.
 *
 * @param phases - Array of workout phases to display.
 * @param isLoading - Whether the phase data is currently loading.
 */
export function PhaseList({
    phases,
    isLoading,

    // Phase handlers
    onToggleExpand,
    onAddSession,
    onEditPhase,
    onDeletePhase,
    onDuplicatePhase,
    onToggleActivation,
    editingPhase,
    editPhaseValue,
    onSavePhaseEdit,
    onEditPhaseValueChange,

    // Session handlers
    onToggleSession,
    onDeleteSession,
    onDuplicateSession,
    onAddExercise,
    onStartSession,
    startingSessionId,
    onStartEditSession,
    onMoveSession,
    onDragVisual,
    onRenderExercises,
    editingSession,
    editSessionValue,
    onSaveSessionEdit,
    onEditSessionValueChange,
}: PhaseListProps) {
    if (isLoading) {
        return <LoadingState />;
    }

    if (phases.length === 0) {
        return <EmptyState />;
    }

    return (
        <DndProvider backend={HTML5Backend}>
            {phases.map((phase) => (
                <PhaseCard
                    key={phase.id}
                    phase={phase}
                    // Phase handlers
                    onToggleExpand={onToggleExpand}
                    onAddSession={onAddSession}
                    onEditPhase={onEditPhase}
                    onDeletePhase={onDeletePhase}
                    onDuplicatePhase={onDuplicatePhase}
                    onToggleActivation={onToggleActivation}
                    editingPhase={editingPhase}
                    editPhaseValue={editPhaseValue}
                    onSavePhaseEdit={onSavePhaseEdit}
                    onEditPhaseValueChange={onEditPhaseValueChange}
                    // Session handlers
                    onToggleSession={onToggleSession}
                    onDeleteSession={onDeleteSession}
                    onDuplicateSession={onDuplicateSession}
                    onAddExercise={onAddExercise}
                    onStartSession={onStartSession}
                    startingSessionId={startingSessionId}
                    onStartEditSession={onStartEditSession}
                    onMoveSession={onMoveSession}
                    onDragVisual={onDragVisual}
                    onRenderExercises={onRenderExercises}
                    editingSession={editingSession}
                    editSessionValue={editSessionValue}
                    onSaveSessionEdit={onSaveSessionEdit}
                    onEditSessionValueChange={onEditSessionValueChange}
                />
            ))}
        </DndProvider>
    );
}
