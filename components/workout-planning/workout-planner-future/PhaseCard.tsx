import { useState } from "react";
import { Phase, Exercise } from "../types";
import SessionList from "./SessionList";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Edit, Trash2, Copy, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface PhaseCardProps {
    phase: Phase;
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

export default function PhaseCard({
    phase,
    openExerciseDialog,
    openConfirmDialog,
}: PhaseCardProps) {
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(phase.name);

    // Placeholder handlers for actions
    const handleToggleExpand = () => {};
    const handleEdit = () => setEditing(true);
    const handleSaveEdit = () => setEditing(false);
    const handleDelete = () =>
        openConfirmDialog("phase", { phaseId: phase.id });
    const handleDuplicate = () => {};
    const handleAddSession = () => {};
    const handleActivate = () => {};

    return (
        <div className="mb-4 border rounded">
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleToggleExpand}
                        className="p-1 h-auto mr-2 cursor-pointer"
                    >
                        {phase.isExpanded ? (
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
                        <span className="font-semibold text-lg">
                            {phase.name}
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
                        onClick={handleAddSession}
                        className="h-8 w-8 cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center ml-4">
                        <Switch
                            checked={phase.isActive}
                            onCheckedChange={handleActivate}
                            id={`activate-${phase.id}`}
                        />
                        <label
                            htmlFor={`activate-${phase.id}`}
                            className="ml-2"
                        >
                            {phase.isActive
                                ? "Deactivate Phase"
                                : "Activate Phase"}
                        </label>
                    </div>
                </div>
            </div>
            {phase.isExpanded && (
                <div className="p-4">
                    <SessionList
                        phase={phase}
                        openExerciseDialog={openExerciseDialog}
                        openConfirmDialog={openConfirmDialog}
                    />
                </div>
            )}
        </div>
    );
}
