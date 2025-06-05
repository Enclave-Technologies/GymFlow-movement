import { SelectExercise } from "@/db/schemas";
import { Phase } from "../types";
import {
    TooltipContent,
    Tooltip,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import WorkoutPlanCsvImportExport from "./workout-plan-csv-import-export";
import { Check, Loader2, Plus, SaveAllIcon } from "lucide-react";

type WorkoutToolbarProps = {
    onAddPhase: () => void;
    onSaveAll: () => void;
    hasUnsavedChanges: boolean;
    isSaving: boolean;
    saveStatus?: "editing" | "queued" | "saving" | "saved";
    conflictError: { message: string } | null;
    client_id: string;
    phases: Phase[];
    exercises: SelectExercise[];
    updatePhases: (phases: Phase[]) => void;
    setHasUnsavedChanges: (value: boolean) => void;
    isAnyOperationInProgress?: boolean;
};

export function WorkoutToolbar({
    onAddPhase,
    onSaveAll,
    hasUnsavedChanges,
    isSaving,
    saveStatus = "saved",
    conflictError,
    client_id,
    phases,
    exercises,
    updatePhases,
    setHasUnsavedChanges,
    isAnyOperationInProgress = false,
}: WorkoutToolbarProps) {
    return (
        <div className="flex items-center gap-2">
            {/* Toolbar buttons and indicators */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        onClick={onAddPhase}
                        className="cursor-pointer h-10"
                        disabled={isAnyOperationInProgress}
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
                        disabled={
                            !hasUnsavedChanges || isAnyOperationInProgress
                        }
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
                    // Use timestamp-based order numbers to avoid conflicts (future-proof for 100+ years)
                    const baseTimestamp = Math.floor(Date.now() / 10000);

                    // Update imported phases with timestamp-based order numbers and deactivate them
                    const phasesWithCorrectOrder = importedPhases.map(
                        (phase, index) => ({
                            ...phase,
                            orderNumber: baseTimestamp + index, // Use timestamp + index for unique ordering
                            isActive: false, // Ensure all imported phases are deactivated
                        })
                    );

                    // Append to existing phases instead of replacing
                    updatePhases([...phases, ...phasesWithCorrectOrder]);
                    setHasUnsavedChanges(true);
                }}
                clientId={client_id}
                exercises={exercises}
                disabled={isAnyOperationInProgress}
            />

            {/* Simple Status Indicators */}
            {hasUnsavedChanges && !isSaving && (
                <span className="ml-2 text-yellow-600 font-medium text-sm">
                    * You have unsaved changes
                </span>
            )}
            {isSaving && (
                <span className="ml-2 text-blue-600 font-medium text-sm flex items-center">
                    <Loader2 className="animate-spin h-4 w-4 mr-1" />
                    Saving...
                </span>
            )}
            {saveStatus === "saved" && !hasUnsavedChanges && !isSaving && (
                <span className="ml-2 text-green-600 font-medium text-sm flex items-center">
                    <Check className="h-4 w-4 mr-1" />
                    Saved successfully
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
