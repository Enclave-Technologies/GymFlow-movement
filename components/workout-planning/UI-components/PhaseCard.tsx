"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, ChevronUp, Copy, Edit, Plus, Trash2 } from "lucide-react";
import type { Phase, Session } from "../types";
import { Input } from "@/components/ui/input";
import DraggableSession from "./draggable-session";
// import SessionList from "../session/SessionList";

type PhaseCardProps = {
    phase: Phase;
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
    handleSessionReorder: (
        phaseId: string,
        dragIndex: number,
        hoverIndex: number,
        isDrop?: boolean
    ) => void;
    onRenderExercises: (phase: Phase, session: Session) => React.ReactNode;
    editingSession: string | null;
    editSessionValue: string;
    onSaveSessionEdit: () => void;
    onEditSessionValueChange: (value: string) => void;
};

export function PhaseCard({
    phase,
    // Phase props
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

    // Session props
    onToggleSession,
    onDeleteSession,
    onDuplicateSession,
    onAddExercise,
    onStartSession,
    startingSessionId,
    onStartEditSession,
    handleSessionReorder,
    onRenderExercises,
    editingSession,
    editSessionValue,
    onSaveSessionEdit,
    onEditSessionValueChange,
}: PhaseCardProps) {
    return (
        <Card key={phase.id} className="mb-4 shadow-none bg-background py-2">
            <CardContent className="p-0">
                {/* Phase Header */}
                <div className="flex items-center justify-between pl-4 pr-5 bg-muted rounded-md">
                    <div className="flex items-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onToggleExpand(phase.id)}
                            className="p-1 h-auto mr-2 cursor-pointer"
                        >
                            {phase.isExpanded ? (
                                <ChevronDown className="h-5 w-5" />
                            ) : (
                                <ChevronUp className="h-5 w-5" />
                            )}
                        </Button>

                        {editingPhase === phase.id ? (
                            <div className="flex items-center">
                                <Input
                                    value={editPhaseValue}
                                    onChange={(e) =>
                                        onEditPhaseValueChange(e.target.value)
                                    }
                                    className="h-8 w-48"
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onSavePhaseEdit}
                                    className="ml-2 cursor-pointer"
                                >
                                    Save
                                </Button>
                            </div>
                        ) : (
                            <span className="font-semibold text-lg">
                                {phase.name}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Edit Phase */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        onEditPhase(phase.id, phase.name)
                                    }
                                    className="h-8 w-8 cursor-pointer"
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Phase Name</TooltipContent>
                        </Tooltip>
                        {/* Delete Phase */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onDeletePhase(phase.id)}
                                    className="h-8 w-8 cursor-pointer"
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Phase</TooltipContent>
                        </Tooltip>
                        {/* Duplicate Phase */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onDuplicatePhase(phase.id)}
                                    className="h-8 w-8 cursor-pointer"
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicate Phase</TooltipContent>
                        </Tooltip>
                        {/* Add Session */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onAddSession(phase.id)}
                                    className="h-8 w-8 cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add Session</TooltipContent>
                        </Tooltip>
                        {/* Activate/Deactivate Phase */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center ml-4">
                                    <div className="flex flex-col">
                                        <div className="flex items-center">
                                            <Switch
                                                checked={phase.isActive}
                                                onCheckedChange={() =>
                                                    onToggleActivation(phase.id)
                                                }
                                                id={`activate-${phase.id}`}
                                            />
                                            <Label
                                                htmlFor={`activate-${phase.id}`}
                                                className="ml-2"
                                            >
                                                {phase.isActive
                                                    ? "Deactivate Phase"
                                                    : "Activate Phase"}
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                {phase.isActive
                                    ? "Deactivate this phase"
                                    : "Activate this phase"}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {phase.isExpanded && (
                    <div className="p-4">
                        {phase.sessions.map((session, index) => (
                            <DraggableSession
                                key={session.id}
                                phase={phase}
                                session={session}
                                index={index}
                                toggleSessionExpansion={onToggleSession}
                                deleteSession={onDeleteSession}
                                duplicateSession={onDuplicateSession}
                                addExercise={onAddExercise}
                                startSession={onStartSession}
                                startingSessionId={startingSessionId}
                                startEditSession={onStartEditSession}
                                handleSessionReorder={handleSessionReorder}
                                renderExercisesTable={onRenderExercises}
                                editingSession={editingSession}
                                editSessionValue={editSessionValue}
                                saveSessionEdit={onSaveSessionEdit}
                                setEditSessionValue={onEditSessionValueChange}
                            />
                        ))}
                        {phase.sessions.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No sessions added. Click + to add.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
