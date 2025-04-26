"use client";

import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Edit,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { DraggableSessionProps, DragItem } from "./types";

export const ItemTypes = {
  SESSION: "session",
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
  saveSession,
  startingSessionId,
  savingSessionId,
  startEditSession,
  moveSession,
  renderExercisesTable,
  editingSession,
  editSessionValue,
  saveSessionEdit,
  setEditSessionValue,
}: DraggableSessionProps) => {
  const ref = useRef<HTMLDivElement>(null);

  // Set up drag
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SESSION,
    item: { id: session.id, index, phaseId: phase.id, type: ItemTypes.SESSION },
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

      // Move the session
      moveSession(item.phaseId, dragIndex, hoverIndex);

      // Update the item's index for next hover
      item.index = hoverIndex;
    },
  });

  // Apply refs
  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`border rounded-md mb-4 ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between p-3 bg-muted">
        <div className="flex items-center">
          <span className="mr-2 cursor-move">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSessionExpansion(phase.id, session.id)}
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
                value={editSessionValue}
                onChange={(e) => setEditSessionValue(e.target.value)}
                className="h-8 w-48"
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => startEditSession(session.id, session.name)}
            className="h-8 w-8 cursor-pointer"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteSession(phase.id, session.id)}
            className="h-8 w-8 cursor-pointer"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => duplicateSession(phase.id, session.id)}
            className="h-8 w-8 cursor-pointer"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => addExercise(phase.id, session.id)}
            className="h-8 w-8 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => saveSession(phase.id, session.id)}
            className="h-8 w-8 cursor-pointer"
            disabled={savingSessionId === session.id}
          >
            {savingSessionId === session.id ? (
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
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
                <div className="h-4 w-4 mr-2 rounded-full border-2 border-background border-t-transparent animate-spin"></div>
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
        <div className="text-center py-8 text-muted-foreground">
          No exercises. Click + to add one.
        </div>
      )}
    </div>
  );
};

export default DraggableSession;
