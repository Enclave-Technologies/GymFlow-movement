import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import type { SelectExercise } from "@/db/schemas";
import ExerciseDropdown from "./ExerciseDropdown";
import { ExerciseRow } from "./ExerciseTableRow";

interface ExerciseEditRowProps {
    editingExerciseRow: ExerciseRow;
    exercises: SelectExercise[];
    exerciseMotionOptions: string[];
    exerciseTargetAreaOptions: string[];
    isSaving: boolean;
    onFieldChange: (field: keyof ExerciseRow, value: string) => void;
    onSave: () => void;
    onCancel: () => void;
    firstInputRef?: React.RefObject<HTMLInputElement | null>;
}

/**
 * Editable exercise table row component
 * Provides inline editing for exercise properties
 */
const ExerciseEditRow: React.FC<ExerciseEditRowProps> = ({
    editingExerciseRow,
    exercises,
    exerciseMotionOptions,
    exerciseTargetAreaOptions,
    isSaving,
    onFieldChange,
    onSave,
    onCancel,
    firstInputRef,
}) => {
    const handleExerciseSelect = (exercise: SelectExercise) => {
        // Update multiple fields when exercise is selected
        console.log(
            "🔍 Exercise selected:",
            exercise.exerciseName,
            "ID:",
            exercise.exerciseId
        );
        onFieldChange("description", exercise.exerciseName);
        onFieldChange("exerciseId", exercise.exerciseId);
        onFieldChange("motion", exercise.motion || "");
        onFieldChange("targetArea", exercise.targetArea || "");
        console.log("✅ Fields updated for exercise:", exercise.exerciseName);
    };

    return (
        <TableRow>
            {/* Order */}
            <TableCell className="w-[180px]">
                <Input
                    ref={firstInputRef}
                    value={editingExerciseRow.order}
                    onChange={(e) => onFieldChange("order", e.target.value)}
                    placeholder="A1, B1, etc."
                    className="w-full"
                />
            </TableCell>

            {/* Description (Exercise Name) */}
            <TableCell className="min-w-[350px]">
                {console.log(
                    "🎨 ExerciseEditRow render - editingExerciseRow.description:",
                    editingExerciseRow.description
                )}
                <ExerciseDropdown
                    exercises={exercises}
                    selectedDescription={editingExerciseRow.description || ""}
                    onExerciseSelect={handleExerciseSelect}
                    placeholder="Select exercise..."
                />
            </TableCell>

            {/* Motion */}
            <TableCell className="min-w-[250px] hidden sm:table-cell">
                <Select
                    value={editingExerciseRow.motion || ""}
                    onValueChange={(value) => onFieldChange("motion", value)}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select motion" />
                    </SelectTrigger>
                    <SelectContent>
                        {exerciseMotionOptions.map((motion) => (
                            <SelectItem key={motion} value={motion}>
                                {motion}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </TableCell>

            {/* Target Area */}
            <TableCell className="min-w-[250px] hidden md:table-cell">
                <Select
                    value={editingExerciseRow.targetArea || ""}
                    onValueChange={(value) =>
                        onFieldChange("targetArea", value)
                    }
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select target area" />
                    </SelectTrigger>
                    <SelectContent>
                        {exerciseTargetAreaOptions.map((area) => (
                            <SelectItem key={area} value={area}>
                                {area}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </TableCell>

            {/* Sets (min-max) */}
            <TableCell className="min-w-[200px]">
                <div className="flex items-center gap-1">
                    <Input
                        value={editingExerciseRow.setsMin || ""}
                        onChange={(e) =>
                            onFieldChange("setsMin", e.target.value)
                        }
                        placeholder="3"
                        className="w-full"
                    />
                    <span>-</span>
                    <Input
                        value={editingExerciseRow.setsMax || ""}
                        onChange={(e) =>
                            onFieldChange("setsMax", e.target.value)
                        }
                        placeholder="5"
                        className="w-full"
                    />
                </div>
            </TableCell>

            {/* Reps (min-max) */}
            <TableCell className="min-w-[200px]">
                <div className="flex items-center gap-1">
                    <Input
                        value={editingExerciseRow.repsMin || ""}
                        onChange={(e) =>
                            onFieldChange("repsMin", e.target.value)
                        }
                        placeholder="8"
                        className="w-full"
                    />
                    <span>-</span>
                    <Input
                        value={editingExerciseRow.repsMax || ""}
                        onChange={(e) =>
                            onFieldChange("repsMax", e.target.value)
                        }
                        placeholder="12"
                        className="w-full"
                    />
                </div>
            </TableCell>

            {/* Tempo */}
            <TableCell className="min-w-[180px] hidden lg:table-cell">
                <Input
                    value={editingExerciseRow.tempo || ""}
                    onChange={(e) => onFieldChange("tempo", e.target.value)}
                    placeholder="3 0 1 0"
                    className="w-full"
                />
            </TableCell>

            {/* Rest (min-max) */}
            <TableCell className="min-w-[200px]">
                <div className="flex items-center gap-1">
                    <Input
                        value={editingExerciseRow.restMin || ""}
                        onChange={(e) =>
                            onFieldChange("restMin", e.target.value)
                        }
                        placeholder="45"
                        className="w-full"
                    />
                    <span>-</span>
                    <Input
                        value={editingExerciseRow.restMax || ""}
                        onChange={(e) =>
                            onFieldChange("restMax", e.target.value)
                        }
                        placeholder="60"
                        className="w-full"
                    />
                </div>
            </TableCell>

            {/* TUT (calculated, read-only) */}
            <TableCell className="min-w-[100px] hidden xl:table-cell">
                <span className="text-muted-foreground">Auto</span>
            </TableCell>

            {/* Additional Instructions */}
            <TableCell className="min-w-[350px] hidden lg:table-cell">
                <Input
                    value={editingExerciseRow.additionalInfo || ""}
                    onChange={(e) =>
                        onFieldChange("additionalInfo", e.target.value)
                    }
                    placeholder="Additional Instructions"
                    className="w-full"
                />
            </TableCell>

            {/* Actions */}
            <TableCell className="text-right sticky right-0 bg-background min-w-[150px] z-10">
                <div className="flex justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onSave}
                        className="h-8 w-8 cursor-pointer"
                        disabled={isSaving}
                    >
                        <Check className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onCancel}
                        className="h-8 w-8"
                        disabled={isSaving}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
};

export default ExerciseEditRow;
