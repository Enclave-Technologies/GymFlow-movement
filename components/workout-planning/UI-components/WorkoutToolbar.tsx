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
    addingPhase: boolean;
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
    addingPhase,
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
                        disabled={addingPhase}
                    >
                        {addingPhase ? (
                            <>
                                <Loader2 className="animate-spin" /> Adding...
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4 mr-2" /> Add Phase
                            </>
                        )}
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
            />

            {hasUnsavedChanges && (
                <span className="ml-2 text-yellow-600 font-medium text-sm">
                    * You have unsaved changes
                </span>
            )}
            {/* {isSaving && (
                <span className="ml-2 text-blue-600 font-medium text-sm flex items-center">
                    <Loader2 className="animate-spin h-4 w-4 mr-1" />
                    Saving...
                </span>
            )} */}
            {conflictError && (
                <span className="ml-2 text-red-600 font-medium text-sm">
                    * {conflictError.message}
                </span>
            )}
        </div>
    );
}
