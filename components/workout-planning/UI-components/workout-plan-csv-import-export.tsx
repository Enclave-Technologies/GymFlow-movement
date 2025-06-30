import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertCircle,
    // BicepsFlexed,
    Download,
    Dumbbell,
    SquareDashedKanban,
    Upload,
} from "lucide-react";
import { Phase } from "../types";
import {
    downloadWorkoutPlanCsv,
    importWorkoutPlanFromCsv,
    downloadExercisesCsv,
} from "../workout-utils/workout-plan-csv";
import { toast } from "sonner";
import type { SelectExercise } from "@/db/schemas";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface WorkoutPlanCsvImportExportProps {
    phases: Phase[];
    onImport: (phases: Phase[]) => void;
    clientId: string;
    disabled: boolean;
    exercises?: SelectExercise[];
}

const WorkoutPlanCsvImportExport: React.FC<WorkoutPlanCsvImportExportProps> = ({
    phases,
    onImport,
    clientId,
    disabled,
    exercises = [],
}) => {
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [importedPhases, setImportedPhases] = useState<Phase[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check if export should be disabled due to incomplete data
    const isExportDisabled = () => {
        if (disabled) return true;
        if (!phases || phases.length === 0) return true;

        // Check if there are any exercises to export
        const totalExercises = phases.reduce(
            (acc, phase) =>
                acc +
                phase.sessions.reduce(
                    (sessionAcc, session) =>
                        sessionAcc + session.exercises.length,
                    0
                ),
            0
        );

        return totalExercises === 0;
    };

    const handleExport = () => {
        // Check if we have valid data to export
        if (!phases || phases.length === 0) {
            toast.error("No workout plan data available to export");
            return;
        }

        // Count total exercises to give user feedback
        const totalExercises = phases.reduce(
            (acc, phase) =>
                acc +
                phase.sessions.reduce(
                    (sessionAcc, session) =>
                        sessionAcc + session.exercises.length,
                    0
                ),
            0
        );

        if (totalExercises === 0) {
            toast.error("No exercises found in the workout plan to export");
            return;
        }

        // Check for phases without sessions or sessions without exercises
        const phasesWithSessions = phases.filter(
            (phase) => phase.sessions && phase.sessions.length > 0
        );
        if (phasesWithSessions.length === 0) {
            toast.error("No phases with sessions found to export");
            return;
        }

        const sessionsWithExercises = phasesWithSessions.reduce(
            (acc, phase) =>
                acc +
                phase.sessions.filter(
                    (session) =>
                        session.exercises && session.exercises.length > 0
                ).length,
            0
        );

        if (sessionsWithExercises === 0) {
            toast.error("No sessions with exercises found to export");
            return;
        }

        try {
            downloadWorkoutPlanCsv(phases, `workout-plan-${clientId}.csv`);
            toast.success(
                `Workout plan exported successfully (${totalExercises} exercises from ${phasesWithSessions.length} phases)`
            );
        } catch (err) {
            console.error("Error exporting workout plan:", err);
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "Failed to export workout plan";
            toast.error(errorMessage);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const parsedPhases = importWorkoutPlanFromCsv(
                    content,
                    exercises
                );

                setImportedPhases(parsedPhases);
                setError(null);

                // Always show confirmation dialog to inform user about appending
                setShowConfirmDialog(true);
            } catch (err) {
                console.error("Error importing workout plan:", err);
                setError(
                    (err as Error).message || "Failed to import workout plan"
                );
            }
        };

        reader.readAsText(file);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const confirmImport = () => {
        if (importedPhases) {
            onImport(importedPhases);
            setShowConfirmDialog(false);
            toast.success("Workout plan phases appended successfully");
        }
    };

    const cancelImport = () => {
        setImportedPhases(null);
        setShowConfirmDialog(false);
    };

    return (
        <div className="">
            <div className="flex flex-wrap gap-2 items-center">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="flex items-center gap-2 h-10"
                    disabled={isExportDisabled()}
                >
                    <Upload className="h-4 w-4" />
                    Export CSV
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 h-10"
                    disabled={disabled}
                >
                    <Download className="h-4 w-4" />
                    Import CSV
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".csv,.txt"
                        className="hidden"
                    />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 h-10"
                            disabled={disabled}
                        >
                            <SquareDashedKanban className="h-4 w-4" />
                            Resources
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link
                                href="/templates/workout-plan-template.csv"
                                download
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <SquareDashedKanban className="h-4 w-4" />
                                Download Template
                            </Link>
                        </DropdownMenuItem>
                        {exercises.length > 0 && (
                            <DropdownMenuItem
                                onClick={() =>
                                    downloadExercisesCsv(
                                        exercises,
                                        `exercises-${clientId}.csv`
                                    )
                                }
                            >
                                <Dumbbell className="h-4 w-4 mr-2" />
                                Export Exercises CSV
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Confirmation Dialog */}
            <Dialog
                open={showConfirmDialog}
                onOpenChange={setShowConfirmDialog}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Phases from CSV Import</DialogTitle>
                        <DialogDescription>
                            {phases.length > 0
                                ? "The imported phases will be added as new phases to your existing workout plan. Your current phases will not be replaced or deleted. All imported phases will be deactivated by default."
                                : "The imported phases will be added to create your workout plan. All phases will be deactivated by default."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            The imported plan contains:
                        </p>
                        <ul className="list-disc list-inside mt-2 text-sm">
                            <li>{importedPhases?.length || 0} phases</li>
                            <li>
                                {importedPhases?.reduce(
                                    (sum, phase) => sum + phase.sessions.length,
                                    0
                                ) || 0}{" "}
                                sessions
                            </li>
                            <li>
                                {importedPhases?.reduce(
                                    (sum, phase) =>
                                        sum +
                                        phase.sessions.reduce(
                                            (s, session) =>
                                                s + session.exercises.length,
                                            0
                                        ),
                                    0
                                ) || 0}{" "}
                                exercises
                            </li>
                        </ul>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={cancelImport}>
                            Cancel
                        </Button>
                        <Button variant="default" onClick={confirmImport}>
                            Add Phases
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default WorkoutPlanCsvImportExport;
