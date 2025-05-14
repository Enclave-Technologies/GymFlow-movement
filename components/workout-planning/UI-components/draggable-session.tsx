"use client";

import { useEffect, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ChevronDown,
    ChevronUp,
    Copy,
    Edit,
    GripVertical,
    Loader,
    Plus,
    Trash2,
} from "lucide-react";

export const ItemTypes = {
    SESSION: "session",
};

type DragItem = {
    id: string;
    index: number;
    phaseId: string;
    type: string;
};

import { Phase, Session } from "../types";
import { TooltipContent, Tooltip, TooltipTrigger } from "../../ui/tooltip";

type DraggableSessionProps = {
    phase: Phase;
    session: Session;
    index: number;
    toggleSessionExpansion: (phaseId: string, sessionId: string) => void;
    deleteSession: (phaseId: string, sessionId: string) => void;
    duplicateSession: (phaseId: string, sessionId: string) => void;
    addExercise: (phaseId: string, sessionId: string) => void;
    startSession: (sessionId: string, phaseId: string) => void;
    startingSessionId: string | null;
    startEditSession: (sessionId: string, sessionName: string) => void;
    moveSession: (
        phaseId: string,
        dragIndex: number,
        hoverIndex: number
    ) => void;
    handleDragVisual?: (
        phaseId: string,
        dragIndex: number,
        hoverIndex: number
    ) => void;
    renderExercisesTable: (phase: Phase, session: Session) => React.ReactNode;
    editingSession: string | null;
    editSessionValue: string;
    saveSessionEdit: () => void;
    setEditSessionValue: (value: string) => void;
};

const DraggableSession = ({
    phase,
    session,
    index,
    toggleSessionExpansion,
    deleteSession,
    duplicateSession,
    addExercise,
    startSession,
    startingSessionId,
    startEditSession,
    moveSession,
    renderExercisesTable,
    editingSession,
    editSessionValue,
    saveSessionEdit,
    setEditSessionValue,
    handleDragVisual,
}: DraggableSessionProps) => {
    const ref = useRef<HTMLDivElement>(null);

    // Add a ref for the session name input
    const sessionInputRef = useRef<HTMLInputElement>(null);

    // Add useEffect to focus and select text when editing starts
    useEffect(() => {
        if (editingSession === session.id && sessionInputRef.current) {
            sessionInputRef.current.focus();
            sessionInputRef.current.select();
        }
    }, [editingSession, session.id]);

    // Set up drag
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.SESSION,
        item: {
            id: session.id,
            index,
            phaseId: phase.id,
            type: ItemTypes.SESSION,
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    // Set up drop
    const [, drop] = useDrop({
        accept: ItemTypes.SESSION,
        hover(item: DragItem) {
            if (!ref.current) {
                return;
            }

            const dragIndex = item.index;
            const hoverIndex = index;

            // Don't replace items with themselves
            if (dragIndex === hoverIndex) {
                return;
            }

            // Call handleDragVisual for visual feedback during hover if it exists
            if (handleDragVisual) {
                handleDragVisual(item.phaseId, dragIndex, hoverIndex);
            }

            // Update the item's index for the next hover
            item.index = hoverIndex;
        },
        drop(item: DragItem) {
            // Always call moveSession when the drop is completed
            // This ensures the unsaved changes UI is triggered and the order is saved
            moveSession(item.phaseId, item.index, index);
        },
    });

    // Apply refs
    drag(drop(ref));

    // Add mt-6 for separation except for the first session (index > 0)
    return (
        <div
            ref={ref}
            className={`mb-4 ${index > 0 ? "mt-6" : ""} ${
                isDragging ? "opacity-50" : ""
            }`}
        >
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div className="flex items-center">
                    <span className="mr-2 cursor-move">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                            toggleSessionExpansion(phase.id, session.id)
                        }
                        className="p-1 h-auto mr-2 cursor-pointer"
                    >
                        {session.isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                        ) : (
                            <ChevronUp className="h-5 w-5" />
                        )}
                    </Button>
                    {editingSession === session.id ? (
                        <div className="flex items-center">
                            <Input
                                ref={sessionInputRef}
                                value={editSessionValue}
                                onChange={(e) =>
                                    setEditSessionValue(e.target.value)
                                }
                                className="h-8 w-48"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        saveSessionEdit();
                                    }
                                }}
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={saveSessionEdit}
                                className="ml-2 cursor-pointer"
                            >
                                Save
                            </Button>
                        </div>
                    ) : (
                        <span className="font-medium">{session.name}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Edit Session */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    startEditSession(session.id, session.name)
                                }
                                className="h-8 w-8 cursor-pointer"
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit Session Name</TooltipContent>
                    </Tooltip>
                    {/* Delete Session */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    deleteSession(phase.id, session.id)
                                }
                                className="h-8 w-8 cursor-pointer"
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete Session</TooltipContent>
                    </Tooltip>
                    {/* Duplicate Session */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    duplicateSession(phase.id, session.id)
                                }
                                className="h-8 w-8 cursor-pointer"
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Duplicate Session</TooltipContent>
                    </Tooltip>
                    {/* Add Exercise */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    addExercise(phase.id, session.id)
                                }
                                className="h-8 w-8 cursor-pointer"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add Exercise</TooltipContent>
                    </Tooltip>
                    {/* Save button removed */}
                    <Button
                        variant="default"
                        className="ml-4 cursor-pointer"
                        disabled={
                            !phase.isActive ||
                            session.exercises.length === 0 ||
                            startingSessionId === session.id
                        }
                        onClick={() => startSession(session.id, phase.id)}
                    >
                        {startingSessionId === session.id ? (
                            <>
                                <Loader className="animate-spin h-4 w-4 mr-2" />
                                Please wait...
                            </>
                        ) : (
                            <>Start Session ({session.duration} mins)</>
                        )}
                    </Button>
                </div>
            </div>

            {session.isExpanded &&
                session.exercises.length > 0 &&
                renderExercisesTable(phase, session)}
            {session.isExpanded && session.exercises.length === 0 && (
                <div className="text-center py-8 text-muted-foreground bg-background/50 mt-2">
                    No exercises. Click + to add one.
                </div>
            )}
        </div>
    );
};

export default DraggableSession;
