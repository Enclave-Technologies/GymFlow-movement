import React, { useEffect, useState } from "react";
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Save, X } from "lucide-react";
import { Phase, Session, Exercise } from "./types";
import { toast } from "sonner";
import type { SelectExercise } from "@/db/schemas";
import {
    Command,
    CommandInput,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

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

interface ExerciseTableInlineProps {
    phase: Phase;
    session: Session;
    setPhases: (newPhases: Phase[]) => void;
    phases: Phase[];
    deleteExercise: (
        phaseId: string,
        sessionId: string,
        exerciseId: string
    ) => void;
    calculateSessionDuration: (exercises: ExerciseRow[]) => number;
    editingExerciseId: string | null;
    onEditEnd: () => void;
    onEditExercise: (exerciseId: string) => void;
    exercises: SelectExercise[];
    setHasUnsavedChanges?: (hasChanges: boolean) => void;
}

// Derive motion and target area options from the exercises list
const getUniqueMotions = (exercisesList: SelectExercise[] = []): string[] => {
    if (!exercisesList || !Array.isArray(exercisesList)) return [];

    const motions = exercisesList
        .map((ex) => ex.motion)
        .filter(
            (motion): motion is string =>
                motion !== null && motion !== undefined
        );
    return [...new Set(motions)].sort();
};

const getUniqueTargetAreas = (
    exercisesList: SelectExercise[] = []
): string[] => {
    if (!exercisesList || !Array.isArray(exercisesList)) return [];

    const targetAreas = exercisesList
        .map((ex) => ex.targetArea)
        .filter((area): area is string => area !== null && area !== undefined);
    return [...new Set(targetAreas)].sort();
};

const ExerciseTableInline: React.FC<ExerciseTableInlineProps> = ({
    phase,
    session,
    setPhases,
    phases,
    deleteExercise,
    calculateSessionDuration,
    editingExerciseId,
    onEditEnd,
    onEditExercise,
    exercises,
    setHasUnsavedChanges,
}) => {
    // Generate motion and target area options from the exercises list
    const exerciseMotionOptions = getUniqueMotions(exercises || []);
    const exerciseTargetAreaOptions = getUniqueTargetAreas(exercises || []);
    const [editingExerciseRow, setEditingExerciseRow] =
        useState<ExerciseRow | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [open, setOpen] = useState(false);

    // When editingExerciseId changes, set editingExerciseRow to the matching exercise
    useEffect(() => {
        if (editingExerciseId) {
            const exercise = session.exercises.find(
                (e) => e.id === editingExerciseId
            );
            if (exercise) {
                setEditingExerciseRow({ ...exercise });
            }
        } else {
            setEditingExerciseRow(null);
        }
    }, [editingExerciseId, session.exercises]);

    const handleInlineExerciseChange = (
        field: keyof ExerciseRow,
        value: string
    ) => {
        if (!editingExerciseRow) return;
        console.log(`Setting ${field} to:`, value);
        setEditingExerciseRow({
            ...editingExerciseRow,
            [field]: value,
        });
    };

    const saveInlineExercise = () => {
        if (!editingExerciseRow) return;
        if (!editingExerciseRow.order || !editingExerciseRow.description) {
            toast.error("Order and Description are required");
            return;
        }
        setPhases(
            phases.map((phaseItem) =>
                phaseItem.id !== phase.id
                    ? phaseItem
                    : {
                          ...phaseItem,
                          sessions: phaseItem.sessions.map((sessionItem) => {
                              if (sessionItem.id !== session.id)
                                  return sessionItem;
                              // Update the exercise in the array
                              const updatedExercises =
                                  sessionItem.exercises.map((e) =>
                                      e.id === editingExerciseRow.id
                                          ? editingExerciseRow
                                          : e
                                  );
                              return {
                                  ...sessionItem,
                                  exercises: updatedExercises,
                                  duration: calculateSessionDuration(
                                      updatedExercises as ExerciseRow[]
                                  ),
                              };
                          }),
                      }
            )
        );
        // Mark that there are unsaved changes
        if (setHasUnsavedChanges) {
            setHasUnsavedChanges(true);
        }
        setEditingExerciseRow(null);
        onEditEnd();
    };

    const cancelInlineExercise = () => {
        // If the exercise is blank (new), remove it from the array
        if (editingExerciseRow) {
            const isBlank =
                !editingExerciseRow.order &&
                !editingExerciseRow.motion &&
                !editingExerciseRow.targetArea &&
                !editingExerciseRow.description;
            if (isBlank) {
                setPhases(
                    phases.map((phaseItem) =>
                        phaseItem.id !== phase.id
                            ? phaseItem
                            : {
                                  ...phaseItem,
                                  sessions: phaseItem.sessions.map(
                                      (sessionItem) => {
                                          if (sessionItem.id !== session.id)
                                              return sessionItem;
                                          const updatedExercises =
                                              sessionItem.exercises.filter(
                                                  (e) =>
                                                      e.id !==
                                                      editingExerciseRow.id
                                              );
                                          return {
                                              ...sessionItem,
                                              exercises: updatedExercises,
                                              duration:
                                                  calculateSessionDuration(
                                                      updatedExercises as ExerciseRow[]
                                                  ),
                                          };
                                      }
                                  ),
                              }
                    )
                );
            }
        }
        setEditingExerciseRow(null);
        onEditEnd();
    };

    // Filter exercises based on search term
    const filteredExercises =
        exercises?.filter((ex) =>
            ex.exerciseName.toLowerCase().includes(searchTerm.toLowerCase())
        ) || [];

    return (
        <>
            <div className="overflow-x-auto mt-2">
                <Table className="w-full">
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead className="w-[180px]">Order</TableHead>
                            <TableHead className="min-w-[350px]">
                                <div>Description</div>
                            </TableHead>
                            <TableHead className="min-w-[250px]">
                                <div>Motion</div>
                            </TableHead>
                            <TableHead className="min-w-[250px]">
                                <div>Target Area</div>
                            </TableHead>
                            <TableHead className="min-w-[200px]">
                                <div>Sets</div>
                                <div className="text-xs text-muted-foreground">
                                    (min-max)
                                </div>
                            </TableHead>
                            <TableHead className="min-w-[200px]">
                                <div>Reps</div>
                                <div className="text-xs text-muted-foreground">
                                    (min-max)
                                </div>
                            </TableHead>
                            <TableHead className="min-w-[180px]">
                                <div>Tempo</div>
                            </TableHead>
                            <TableHead className="min-w-[200px]">
                                <div>Rest</div>
                                <div className="text-xs text-muted-foreground">
                                    (min-max)
                                </div>
                            </TableHead>
                            <TableHead className="min-w-[150px]">TUT</TableHead>
                            <TableHead className="min-w-[350px]">
                                <div>Additional Instructions</div>
                            </TableHead>
                            <TableHead className="text-right sticky right-0 bg-muted z-20 w-[150px]">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(session.exercises as ExerciseRow[]).map(
                            (exercise: ExerciseRow) =>
                                editingExerciseId === exercise.id &&
                                editingExerciseRow ? (
                                    <TableRow key={exercise.id}>
                                        {/* Order */}
                                        <TableCell className="w-[180px]">
                                            <Input
                                                value={editingExerciseRow.order}
                                                onChange={(e) =>
                                                    handleInlineExerciseChange(
                                                        "order",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="A1, B1, etc."
                                                className="w-full"
                                            />
                                        </TableCell>
                                        {/* Description (Exercise Name) */}
                                        <TableCell className="min-w-[350px]">
                                            <Popover
                                                open={open}
                                                onOpenChange={setOpen}
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={open}
                                                        className="w-full justify-between"
                                                    >
                                                        {editingExerciseRow.description ||
                                                            "Select exercise..."}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[350px] p-0">
                                                    <Command>
                                                        <CommandInput
                                                            placeholder="Search exercises..."
                                                            value={searchTerm}
                                                            onValueChange={
                                                                setSearchTerm
                                                            }
                                                        />
                                                        <CommandEmpty>
                                                            No exercise found.
                                                        </CommandEmpty>
                                                        <CommandGroup className="max-h-[350px] overflow-auto">
                                                            {filteredExercises.map(
                                                                (ex) => (
                                                                    <CommandItem
                                                                        key={
                                                                            ex.exerciseId
                                                                        }
                                                                        value={
                                                                            ex.exerciseName
                                                                        }
                                                                        onSelect={(
                                                                            value
                                                                        ) => {
                                                                            // Find the selected exercise to get its motion and target area
                                                                            const selectedExercise =
                                                                                exercises?.find(
                                                                                    (
                                                                                        e
                                                                                    ) =>
                                                                                        e.exerciseName.toLowerCase() ===
                                                                                        value.toLowerCase()
                                                                                );

                                                                            // Update description
                                                                            handleInlineExerciseChange(
                                                                                "description",
                                                                                selectedExercise?.exerciseName ||
                                                                                    value
                                                                            );

                                                                            // Auto-set motion and target area if available
                                                                            if (
                                                                                selectedExercise
                                                                            ) {
                                                                                if (
                                                                                    selectedExercise.motion
                                                                                ) {
                                                                                    setEditingExerciseRow(
                                                                                        (
                                                                                            prev
                                                                                        ) => {
                                                                                            if (
                                                                                                !prev
                                                                                            )
                                                                                                return prev;
                                                                                            return {
                                                                                                ...prev,
                                                                                                motion:
                                                                                                    selectedExercise.motion ||
                                                                                                    "",
                                                                                            };
                                                                                        }
                                                                                    );
                                                                                }

                                                                                if (
                                                                                    selectedExercise.targetArea
                                                                                ) {
                                                                                    setEditingExerciseRow(
                                                                                        (
                                                                                            prev
                                                                                        ) => {
                                                                                            if (
                                                                                                !prev
                                                                                            )
                                                                                                return prev;
                                                                                            return {
                                                                                                ...prev,
                                                                                                targetArea:
                                                                                                    selectedExercise.targetArea ||
                                                                                                    "",
                                                                                            };
                                                                                        }
                                                                                    );
                                                                                }
                                                                            }

                                                                            setOpen(
                                                                                false
                                                                            );
                                                                        }}
                                                                    >
                                                                        {
                                                                            ex.exerciseName
                                                                        }
                                                                    </CommandItem>
                                                                )
                                                            )}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </TableCell>
                                        {/* Motion */}
                                        <TableCell className="min-w-[250px]">
                                            <Select
                                                value={
                                                    editingExerciseRow.motion
                                                }
                                                onValueChange={(value) =>
                                                    handleInlineExerciseChange(
                                                        "motion",
                                                        value
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select Motion" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {exerciseMotionOptions.length >
                                                    0 ? (
                                                        exerciseMotionOptions.map(
                                                            (opt: string) => (
                                                                <SelectItem
                                                                    key={opt}
                                                                    value={opt}
                                                                >
                                                                    {opt}
                                                                </SelectItem>
                                                            )
                                                        )
                                                    ) : (
                                                        <SelectItem
                                                            value="no-motions"
                                                            disabled
                                                        >
                                                            No motions available
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        {/* Target Area */}
                                        <TableCell className="min-w-[250px]">
                                            <Select
                                                value={
                                                    editingExerciseRow.targetArea
                                                }
                                                onValueChange={(value) =>
                                                    handleInlineExerciseChange(
                                                        "targetArea",
                                                        value
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select Target Area" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {exerciseTargetAreaOptions.length >
                                                    0 ? (
                                                        exerciseTargetAreaOptions.map(
                                                            (opt: string) => (
                                                                <SelectItem
                                                                    key={opt}
                                                                    value={opt}
                                                                >
                                                                    {opt}
                                                                </SelectItem>
                                                            )
                                                        )
                                                    ) : (
                                                        <SelectItem
                                                            value="no-target-areas"
                                                            disabled
                                                        >
                                                            No target areas
                                                            available
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        {/* Sets (min-max) */}
                                        <TableCell className="min-w-[200px]">
                                            <div className="flex gap-2 items-center">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={
                                                        editingExerciseRow.setsMin ??
                                                        "3"
                                                    }
                                                    onChange={(e) =>
                                                        handleInlineExerciseChange(
                                                            "setsMin",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Min"
                                                    className="w-16"
                                                />
                                                <span className="flex items-center">
                                                    -
                                                </span>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={
                                                        editingExerciseRow.setsMax ??
                                                        "5"
                                                    }
                                                    onChange={(e) =>
                                                        handleInlineExerciseChange(
                                                            "setsMax",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Max"
                                                    className="w-16"
                                                />
                                            </div>
                                        </TableCell>
                                        {/* Reps (min-max) */}
                                        <TableCell className="min-w-[200px]">
                                            <div className="flex gap-2 items-center">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={
                                                        editingExerciseRow.repsMin ??
                                                        "8"
                                                    }
                                                    onChange={(e) =>
                                                        handleInlineExerciseChange(
                                                            "repsMin",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Min"
                                                    className="w-16"
                                                />
                                                <span className="flex items-center">
                                                    -
                                                </span>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={
                                                        editingExerciseRow.repsMax ??
                                                        "12"
                                                    }
                                                    onChange={(e) =>
                                                        handleInlineExerciseChange(
                                                            "repsMax",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Max"
                                                    className="w-16"
                                                />
                                            </div>
                                        </TableCell>
                                        {/* Tempo */}
                                        <TableCell className="min-w-[180px]">
                                            <Input
                                                value={
                                                    editingExerciseRow.tempo ??
                                                    "4-1-2-1"
                                                }
                                                onChange={(e) =>
                                                    handleInlineExerciseChange(
                                                        "tempo",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Tempo"
                                                className="w-full"
                                            />
                                        </TableCell>
                                        {/* Rest (min-max) */}
                                        <TableCell className="min-w-[200px]">
                                            <div className="flex gap-2 items-center">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={
                                                        editingExerciseRow.restMin ??
                                                        "45"
                                                    }
                                                    onChange={(e) =>
                                                        handleInlineExerciseChange(
                                                            "restMin",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Min"
                                                    className="w-16"
                                                />
                                                <span className="flex items-center">
                                                    -
                                                </span>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={
                                                        editingExerciseRow.restMax ??
                                                        "60"
                                                    }
                                                    onChange={(e) =>
                                                        handleInlineExerciseChange(
                                                            "restMax",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Max"
                                                    className="w-16"
                                                />
                                            </div>
                                        </TableCell>
                                        {/* TUT (calculated) */}
                                        <TableCell className="min-w-[100px]">
                                            {(() => {
                                                // Calculate TUT - sum all numbers in tempo
                                                const tempo =
                                                    editingExerciseRow.tempo ??
                                                    "4-1-2-1";
                                                // Extract all numbers from the tempo string
                                                const numbers =
                                                    tempo.match(/\d+/g) || [];
                                                const tempoSum = numbers.reduce(
                                                    (sum, num) =>
                                                        sum + parseInt(num, 10),
                                                    0
                                                );

                                                const setsMax = Number(
                                                    editingExerciseRow.setsMax ??
                                                        5
                                                );
                                                const repsMax = Number(
                                                    editingExerciseRow.repsMax ??
                                                        12
                                                );
                                                return (
                                                    tempoSum * setsMax * repsMax
                                                );
                                            })()}
                                        </TableCell>
                                        {/* Additional Instructions */}
                                        <TableCell className="min-w-[350px]">
                                            <Input
                                                value={
                                                    editingExerciseRow.additionalInfo ??
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    handleInlineExerciseChange(
                                                        "additionalInfo",
                                                        e.target.value
                                                    )
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
                                                    onClick={saveInlineExercise}
                                                    className="h-8 w-8 cursor-pointer"
                                                >
                                                    <Save className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={
                                                        cancelInlineExercise
                                                    }
                                                    className="h-8 w-8"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <TableRow key={exercise.id}>
                                        {/* Order */}
                                        <TableCell className="w-[180px]">
                                            {exercise.order}
                                        </TableCell>
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
                                            {exercise.tempo ?? "4-1-2-1"}
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
                                        <TableCell className="min-w-[100px]">
                                            {(() => {
                                                // Calculate TUT - sum all numbers in tempo
                                                const tempo =
                                                    exercise.tempo ?? "4-1-2-1";
                                                // Extract all numbers from the tempo string
                                                const numbers =
                                                    tempo.match(/\d+/g) || [];
                                                const tempoSum = numbers.reduce(
                                                    (sum, num) =>
                                                        sum + parseInt(num, 10),
                                                    0
                                                );

                                                const setsMax = Number(
                                                    exercise.setsMax ?? 5
                                                );
                                                const repsMax = Number(
                                                    exercise.repsMax ?? 12
                                                );
                                                return (
                                                    tempoSum * setsMax * repsMax
                                                );
                                            })()}
                                        </TableCell>
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
                                                    onClick={() =>
                                                        onEditExercise(
                                                            exercise.id
                                                        )
                                                    }
                                                    className="h-8 w-8 cursor-pointer"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        deleteExercise(
                                                            phase.id,
                                                            session.id,
                                                            exercise.id
                                                        );
                                                    }}
                                                    className="h-8 w-8"
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
};

export default ExerciseTableInline;
