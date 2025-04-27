import { useState } from "react";
import { Session, Exercise } from "./types";
import ExerciseTable from "./ExerciseTable";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Edit, Trash2, Copy, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SessionCardProps {
    phaseId: string;
    session: Session;
    openExerciseDialog: (
        phaseId: string,
        sessionId: string,
        exercise?: Exercise
    ) => void;
    openConfirmDialog: (
        type: "phase" | "session" | "exercise",
        ids: { phaseId?: string; sessionId?: string; exerciseId?: string }
    ) => void;
}

export default function SessionCard({
    phaseId,
    session,
    openExerciseDialog,
    openConfirmDialog,
}: SessionCardProps) {
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(session.name);

    // Placeholder handlers for actions
    const handleToggleExpand = () => {};
    const handleEdit = () => setEditing(true);
    const handleSaveEdit = () => setEditing(false);
    const handleDelete = () =>
        openConfirmDialog("session", { phaseId, sessionId: session.id });
    const handleDuplicate = () => {};
    const handleAddExercise = () => openExerciseDialog(phaseId, session.id);

    return (
        <div className="mb-4 border rounded">
            <div className="flex items-center justify-between p-2 border-b">
                <div className="flex items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleToggleExpand}
                        className="p-1 h-auto mr-2 cursor-pointer"
                    >
                        {session.isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                        ) : (
                            <ChevronUp className="h-5 w-5" />
                        )}
                    </Button>
                    {editing ? (
                        <div className="flex items-center">
                            <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-8 w-48"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSaveEdit}
                                className="ml-2 cursor-pointer"
                            >
                                Save
                            </Button>
                        </div>
                    ) : (
                        <span className="font-semibold text-base">
                            {session.name}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleEdit}
                        className="h-8 w-8 cursor-pointer"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDelete}
                        className="h-8 w-8 cursor-pointer"
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDuplicate}
                        className="h-8 w-8 cursor-pointer"
                    >
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleAddExercise}
                        className="h-8 w-8 cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            {session.isExpanded && (
                <div className="p-2">
                    <ExerciseTable
                        phaseId={phaseId}
                        session={session}
                        openExerciseDialog={openExerciseDialog}
                        openConfirmDialog={openConfirmDialog}
                    />
                </div>
            )}
        </div>
    );
}
