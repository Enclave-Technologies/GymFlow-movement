"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react";
import { Exercise } from "@/types/workout-tracker-types";

interface EnhancedExerciseCardProps {
    exercise: Exercise;
    onToggleExpansion: (exerciseId: string) => void;
    onUpdateSetValue: (
        exerciseId: string,
        setId: string,
        field: "reps" | "weight" | "notes",
        value: string
    ) => void;
    onAddSet: (exerciseId: string) => void;
    onDeleteSet: (exerciseId: string, setId: string) => void;
}

export function EnhancedExerciseCard({
    exercise,
    onToggleExpansion,
    onUpdateSetValue,
    onAddSet,
    onDeleteSet,
}: EnhancedExerciseCardProps) {
    // Calculate max reps for initial table rows
    const maxReps =
        parseInt(exercise.repRange.split("-")[1] || exercise.repRange) || 12;
    const targetSets =
        parseInt(exercise.setRange.split("-")[1] || exercise.setRange) || 3;

    // Ensure we have at least the target number of sets
    const setsToShow = Math.max(exercise.sets.length, targetSets);

    return (
        <div className="mb-6 bg-card rounded-lg overflow-hidden shadow-md border border-border">
            {/* Exercise Header */}
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onToggleExpansion(exercise.id)}
            >
                <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-primary">
                        {exercise.setOrderMarker}.
                    </span>
                    <div>
                        <h3 className="text-lg font-semibold">
                            {exercise.name}
                        </h3>
                        <div className="text-sm text-muted-foreground">
                            {exercise.setRange} Sets × {exercise.repRange} Reps
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                        {exercise.sets.filter((s) => s.reps && s.weight).length}
                        /{exercise.sets.length} completed
                    </span>
                    {exercise.isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                    ) : (
                        <ChevronDown className="h-5 w-5" />
                    )}
                </div>
            </div>

            {exercise.isExpanded && (
                <div className="border-t border-border">
                    {/* Exercise Details */}
                    <div className="p-4 bg-muted/20">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">
                                    Tempo:
                                </span>
                                <span className="ml-2 font-medium">
                                    {exercise.tempo}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">
                                    Rest:
                                </span>
                                <span className="ml-2 font-medium">
                                    {exercise.restTime}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">
                                    Target Sets:
                                </span>
                                <span className="ml-2 font-medium">
                                    {exercise.setRange}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">
                                    Target Reps:
                                </span>
                                <span className="ml-2 font-medium">
                                    {exercise.repRange}
                                </span>
                            </div>
                        </div>

                        {/* Customizations - Full width if present */}
                        {exercise.customizations &&
                            exercise.customizations.trim() && (
                                <div className="mt-3 pt-3 border-t border-border">
                                    <div className="text-sm">
                                        <span className="text-muted-foreground">
                                            Customizations:
                                        </span>
                                        <div className="mt-1 text-foreground font-medium">
                                            {exercise.customizations}
                                        </div>
                                    </div>
                                </div>
                            )}
                    </div>

                    {/* Sets Recording Table */}
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold">
                                Record Your Sets
                            </h4>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => onAddSet(exercise.id)}
                                className="cursor-pointer h-10 px-4"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Add Set
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">
                                            SET
                                        </th>
                                        <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">
                                            REPS
                                        </th>
                                        <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">
                                            WEIGHT (KG)
                                        </th>
                                        <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">
                                            NOTES
                                        </th>
                                        <th className="text-right py-3 px-2 text-sm font-semibold text-muted-foreground">
                                            ACTION
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from(
                                        { length: setsToShow },
                                        (_, index) => {
                                            const set = exercise.sets[index];
                                            const setNumber = index + 1;

                                            return (
                                                <tr
                                                    key={
                                                        set?.id ||
                                                        `empty-${index}`
                                                    }
                                                    className="border-b border-border hover:bg-muted/30 transition-colors"
                                                >
                                                    <td className="py-3 px-2">
                                                        <span className="font-medium text-primary">
                                                            {setNumber}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-2">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max={maxReps * 2}
                                                            className="w-20 h-10"
                                                            value={
                                                                set?.reps || ""
                                                            }
                                                            onChange={(e) => {
                                                                if (set) {
                                                                    onUpdateSetValue(
                                                                        exercise.id,
                                                                        set.id,
                                                                        "reps",
                                                                        e.target
                                                                            .value
                                                                    );
                                                                } else {
                                                                    // Create new set if it doesn't exist
                                                                    onAddSet(
                                                                        exercise.id
                                                                    );
                                                                }
                                                            }}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="py-3 px-2">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.5"
                                                            className="w-24 h-10"
                                                            value={
                                                                set?.weight ||
                                                                ""
                                                            }
                                                            onChange={(e) => {
                                                                if (set) {
                                                                    onUpdateSetValue(
                                                                        exercise.id,
                                                                        set.id,
                                                                        "weight",
                                                                        e.target
                                                                            .value
                                                                    );
                                                                } else {
                                                                    // Create new set if it doesn't exist
                                                                    onAddSet(
                                                                        exercise.id
                                                                    );
                                                                }
                                                            }}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="py-3 px-2">
                                                        <Input
                                                            type="text"
                                                            className="w-32 h-10"
                                                            value={
                                                                set?.notes || ""
                                                            }
                                                            onChange={(e) => {
                                                                if (set) {
                                                                    onUpdateSetValue(
                                                                        exercise.id,
                                                                        set.id,
                                                                        "notes",
                                                                        e.target
                                                                            .value
                                                                    );
                                                                }
                                                            }}
                                                            placeholder="Notes..."
                                                        />
                                                    </td>
                                                    <td className="py-3 px-2 text-right">
                                                        {set && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer h-10 w-10 p-0"
                                                                onClick={() =>
                                                                    onDeleteSet(
                                                                        exercise.id,
                                                                        set.id
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
