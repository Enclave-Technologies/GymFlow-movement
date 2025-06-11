import React, { useMemo } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Exercise } from "../../types";
import { calculateTUT } from "./exercise-table-utils";

type ExerciseRow = Exercise & {
    setsMin?: string;
    setsMax?: string;
    repsMin?: string;
    repsMax?: string;
    restMin?: string;
    restMax?: string;
    additionalInfo?: string;
    [key: string]: unknown;
};

interface ExerciseTableRowProps {
    exercise: ExerciseRow;
    onEditExercise: (exerciseId: string) => void;
    deleteExercise: (
        phaseId: string,
        sessionId: string,
        exerciseId: string
    ) => void;
    phaseId: string;
    sessionId: string;
    isSaving: boolean;
    isAnyOperationInProgress?: boolean;
}

/**
 * Read-only exercise table row component
 * Displays exercise data with edit and delete actions
 */
const ExerciseTableRow: React.FC<ExerciseTableRowProps> = React.memo(
    ({
        exercise,
        onEditExercise,
        deleteExercise,
        phaseId,
        sessionId,
        // isSaving,
        isAnyOperationInProgress = false,
    }) => {
        // Memoize TUT calculation
        const calculatedTut = useMemo(() => {
            return calculateTUT(
                exercise.tempo ?? "3 0 1 0",
                exercise.setsMax ?? 5,
                exercise.repsMax ?? 12
            );
        }, [exercise.tempo, exercise.setsMax, exercise.repsMax]);

        return (
            <TableRow>
                {/* Order */}
                <TableCell className="w-[180px]">{exercise.order}</TableCell>
                {/* Description */}
                <TableCell className="min-w-[350px]">
                    {exercise.description}
                </TableCell>
                {/* Motion */}
                <TableCell className="min-w-[250px]">
                    {exercise.motion}
                </TableCell>
                {/* Target Area */}
                <TableCell className="min-w-[250px]">
                    {exercise.targetArea}
                </TableCell>
                {/* Sets (min-max) */}
                <TableCell className="min-w-[200px]">
                    <div className="flex items-center justify-center">
                        {exercise.setsMin ?? "3"}{" "}
                        <span className="mx-2">-</span>{" "}
                        {exercise.setsMax ?? "5"}
                    </div>
                </TableCell>
                {/* Reps (min-max) */}
                <TableCell className="min-w-[200px]">
                    <div className="flex items-center justify-center">
                        {exercise.repsMin ?? "8"}{" "}
                        <span className="mx-2">-</span>{" "}
                        {exercise.repsMax ?? "12"}
                    </div>
                </TableCell>
                {/* Tempo */}
                <TableCell className="min-w-[180px]">
                    {exercise.tempo ?? "3 0 1 0"}
                </TableCell>
                {/* Rest (min-max) */}
                <TableCell className="min-w-[200px]">
                    <div className="flex items-center justify-center">
                        {exercise.restMin ?? "45"}{" "}
                        <span className="mx-2">-</span>{" "}
                        {exercise.restMax ?? "60"}
                    </div>
                </TableCell>
                {/* TUT (calculated) */}
                <TableCell className="min-w-[100px]">{calculatedTut}</TableCell>
                {/* Additional Instructions */}
                <TableCell className="min-w-[350px]">
                    {exercise.additionalInfo ?? ""}
                </TableCell>
                {/* Actions */}
                <TableCell className="text-right sticky right-0 bg-background min-w-[150px] z-10">
                    <div className="flex justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditExercise(exercise.id)}
                            className="h-8 w-8 cursor-pointer"
                            disabled={isAnyOperationInProgress}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                deleteExercise(phaseId, sessionId, exercise.id);
                            }}
                            className="h-8 w-8"
                            disabled={isAnyOperationInProgress}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
        );
    }
);

ExerciseTableRow.displayName = "ExerciseTableRow";

export default ExerciseTableRow;
export type { ExerciseRow };
