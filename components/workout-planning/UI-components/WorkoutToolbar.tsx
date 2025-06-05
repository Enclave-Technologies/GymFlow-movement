import { SelectExercise } from "@/db/schemas";
import { Phase } from "../types";
import {
    TooltipContent,
    Tooltip,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import WorkoutPlanCsvImportExport from "./workout-plan-csv-import-export";
import { Loader2, Plus, SaveAllIcon } from "lucide-react";

type WorkoutToolbarProps = {
    onAddPhase: () => void;
    onSaveAll: () => void;
    hasUnsavedChanges: boolean;
    isSaving: boolean;
    conflictError: { message: string } | null;
    client_id: string;
    phases: Phase[];
    exercises: SelectExercise[];
    updatePhases: (phases: Phase[]) => void;
    setHasUnsavedChanges: (value: boolean) => void;
};

export function WorkoutToolbar({
    onAddPhase,
    onSaveAll,
    hasUnsavedChanges,
    isSaving,
    conflictError,
    client_id,
    phases,
    exercises,
    updatePhases,
    setHasUnsavedChanges,
}: WorkoutToolbarProps) {
    return (
        <div className="mb-2 flex items-center gap-2">
            {/* Toolbar buttons and indicators */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        onClick={onAddPhase}
                        className="cursor-pointer h-10"
                        disabled={isSaving}
                    >
                        <Plus className="h-4 w-4 mr-2" /> Add Phase
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Add a new phase</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        onClick={onSaveAll}
                        className="cursor-pointer h-10"
                        disabled={!hasUnsavedChanges || isSaving}
                        variant={hasUnsavedChanges ? "default" : "outline"}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="animate-spin" /> Saving...
                            </>
                        ) : (
                            <>
                                <SaveAllIcon /> Save All
                            </>
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Save all changes</TooltipContent>
            </Tooltip>

            <WorkoutPlanCsvImportExport
                phases={phases}
                onImport={(importedPhases) => {
                    updatePhases(importedPhases);
                    setHasUnsavedChanges(true);
                }}
                clientId={client_id}
                exercises={exercises}
                disabled={isSaving}
            />

            {hasUnsavedChanges && (
                <span className="ml-2 text-yellow-600 font-medium text-sm">
                    * You have unsaved changes
                </span>
            )}
            {conflictError && (
                <span className="ml-2 text-red-600 font-medium text-sm">
                    * {conflictError.message}
                </span>
            )}
        </div>
    );
}
