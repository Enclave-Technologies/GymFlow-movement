import { SelectExercise } from "@/db/schemas";
import { Phase } from "../types";
import {
    TooltipContent,
    Tooltip,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import WorkoutPlanCsvImportExport from "./workout-plan-csv-import-export";
import { Plus, RefreshCw } from "lucide-react";
import { WorkoutQueueIntegration } from "@/lib/workout-queue-integration";
import { toast } from "sonner";

type WorkoutToolbarProps = {
    onAddPhase: () => void;
    onReload: () => void;
    client_id: string;
    trainer_id: string;
    planId?: string | null;
    setPlanId: (planId: string | null) => void;
    lastKnownUpdatedAt?: Date | null;
    phases: Phase[];
    exercises: SelectExercise[];
    updatePhases: (phases: Phase[]) => void;
    setHasUnsavedChanges: (value: boolean) => void;
    isAnyOperationInProgress?: boolean;
    isReloading?: boolean;
};

export function WorkoutToolbar({
    onAddPhase,
    onReload,
    client_id,
    trainer_id,
    planId,
    setPlanId: _setPlanId, // eslint-disable-line @typescript-eslint/no-unused-vars
    lastKnownUpdatedAt,
    phases,
    exercises,
    updatePhases,
    setHasUnsavedChanges,
    isAnyOperationInProgress = false,
    isReloading = false,
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
                        variant="outline"
                        onClick={onReload}
                        className="cursor-pointer h-10"
                        disabled={isAnyOperationInProgress || isReloading}
                    >
                        <RefreshCw
                            className={`h-4 w-4 mr-2 ${
                                isReloading ? "animate-spin" : ""
                            }`}
                        />
                        Reload
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    Refresh workout plan from database
                </TooltipContent>
            </Tooltip>

            <WorkoutPlanCsvImportExport
                phases={phases}
                onImport={async (importedPhases) => {
                    // The CSV import already generates correct timestamp-based order numbers
                    // Just ensure all imported phases are deactivated
                    const phasesWithCorrectOrder = importedPhases.map(
                        (phase) => ({
                            ...phase,
                            isActive: false, // Ensure all imported phases are deactivated
                        })
                    );

                    // Append to existing phases instead of replacing
                    updatePhases([...phases, ...phasesWithCorrectOrder]);
                    setHasUnsavedChanges(true);

                    // Queue individual phase creation events for each imported phase
                    try {
                        if (planId) {
                            // Plan exists - queue each phase creation individually
                            for (const phase of phasesWithCorrectOrder) {
                                await WorkoutQueueIntegration.queuePhaseDuplicate(
                                    planId,
                                    client_id,
                                    trainer_id,
                                    "", // No original phase ID for CSV imports
                                    phase,
                                    lastKnownUpdatedAt || new Date()
                                );
                            }
                            toast.success(
                                "CSV phases imported and queued for processing.",
                                {
                                    duration: 3000,
                                }
                            );
                        } else {
                            // This should never happen since ensurePlanExists() guarantees a plan exists
                            toast.error(
                                "No workout plan found. Please reload the page."
                            );
                            return;
                        }
                    } catch (error) {
                        console.error("Failed to queue CSV import:", error);
                        toast.error(
                            "Failed to import CSV phases. Please try again."
                        );
                    }
                }}
                clientId={client_id}
                exercises={exercises}
                disabled={isAnyOperationInProgress}
            />
        </div>
    );
}
