import { SelectExercise } from "@/db/schemas";
import { Phase } from "../types";
import {
    TooltipContent,
    Tooltip,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import WorkoutPlanCsvImportExport from "./workout-plan-csv-import-export";
import { Plus } from "lucide-react";
import { WorkoutQueueIntegration } from "@/lib/workout-queue-integration";

type WorkoutToolbarProps = {
    onAddPhase: () => void;
    client_id: string;
    trainer_id: string;
    planId?: string | null;
    lastKnownUpdatedAt?: Date | null;
    phases: Phase[];
    exercises: SelectExercise[];
    updatePhases: (phases: Phase[]) => void;
    setHasUnsavedChanges: (value: boolean) => void;
    isAnyOperationInProgress?: boolean;
};

export function WorkoutToolbar({
    onAddPhase,
    client_id,
    trainer_id,
    planId,
    lastKnownUpdatedAt,
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

            <WorkoutPlanCsvImportExport
                phases={phases}
                onImport={async (importedPhases) => {
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

                    // Queue the CSV import event using full plan save
                    try {
                        if (planId) {
                            await WorkoutQueueIntegration.queueFullPlanSave(
                                planId,
                                client_id,
                                trainer_id,
                                [...phases, ...phasesWithCorrectOrder],
                                lastKnownUpdatedAt || undefined
                            );
                        }
                    } catch (error) {
                        console.error("Failed to queue CSV import:", error);
                        // Don't show error to user as the operation succeeded locally
                    }
                }}
                clientId={client_id}
                exercises={exercises}
                disabled={isAnyOperationInProgress}
            />
        </div>
    );
}
