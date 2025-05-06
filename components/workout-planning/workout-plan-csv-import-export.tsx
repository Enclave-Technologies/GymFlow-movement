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
import { AlertCircle, Download, Upload } from "lucide-react";
import { Phase } from "./types";
import {
    downloadWorkoutPlanCsv,
    importWorkoutPlanFromCsv,
} from "./workout-plan-csv";
import { toast } from "sonner";
import type { SelectExercise } from "@/db/schemas";
import Link from "next/link";

interface WorkoutPlanCsvImportExportProps {
    phases: Phase[];
    onImport: (phases: Phase[]) => void;
    clientId: string;
    exercises?: SelectExercise[];
}

const WorkoutPlanCsvImportExport: React.FC<WorkoutPlanCsvImportExportProps> = ({
    phases,
    onImport,
    clientId,
    exercises = [],
}) => {
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [importedPhases, setImportedPhases] = useState<Phase[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        try {
            downloadWorkoutPlanCsv(phases, `workout-plan-${clientId}.csv`);
            toast.success("Workout plan exported successfully");
        } catch (err) {
            console.error("Error exporting workout plan:", err);
            toast.error("Failed to export workout plan");
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

                // Show confirmation dialog if there's an existing workout plan
                if (phases.length > 0) {
                    setShowConfirmDialog(true);
                } else {
                    // If no existing plan, import directly
                    onImport(parsedPhases);
                    toast.success("Workout plan imported successfully");
                }
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
            toast.success("Workout plan imported successfully");
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
                >
                    <Upload className="h-4 w-4" />
                    Export CSV
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 h-10"
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

                <Link
                    href="/templates/workout-plan-template.csv"
                    download
                    className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10"
                >
                    <Download className="h-3 w-3" />
                    Template
                </Link>
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
                        <DialogTitle>
                            Replace Existing Workout Plan?
                        </DialogTitle>
                        <DialogDescription>
                            This will replace the current workout plan with the
                            imported one. This action cannot be undone.
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
                            Replace
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default WorkoutPlanCsvImportExport;
