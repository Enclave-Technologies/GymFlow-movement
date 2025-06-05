import React, { useEffect, useState, useMemo, useCallback } from "react";
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
import { Edit, Trash2, X, Check } from "lucide-react";
import { Phase, Session, Exercise } from "../types";
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
    updatePhases: (
        newPhases: Phase[] | ((prevPhases: Phase[]) => Phase[])
    ) => void;
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
    onSaveExercise?: (
        phaseId: string,
        sessionId: string,
        exerciseId: string,
        exerciseData?: Partial<Exercise>
    ) => void;
    // updateExerciseData: (
    //     phaseId: string,
    //     sessionId: string,
    //     exerciseId: string,
    //     exerciseData: Partial<Exercise>
    // ) => void;
    isSaving: boolean;
    isAnyOperationInProgress?: boolean;
    onEditingStart?: (exerciseId: string) => void;
    onEditingEnd?: (exerciseId: string) => void;
    onEditingChange?: () => void;
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
    updatePhases,
    phases,
    deleteExercise,
    calculateSessionDuration,
    editingExerciseId,
    onEditEnd,
    onEditExercise,
    exercises,
    setHasUnsavedChanges,
    onSaveExercise,
    isSaving,
    isAnyOperationInProgress = false,
    onEditingStart,
    onEditingEnd,
    onEditingChange,
}) => {
    // Memoize motion and target area options to prevent recalculation on every render
    const exerciseMotionOptions = useMemo(
        () => getUniqueMotions(exercises || []),
        [exercises]
    );

    const exerciseTargetAreaOptions = useMemo(
        () => getUniqueTargetAreas(exercises || []),
        [exercises]
    );

    const [editingExerciseRow, setEditingExerciseRow] =
        useState<ExerciseRow | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [open, setOpen] = useState(false);

    // Focus management for first cell
    const firstInputRef = React.useRef<HTMLInputElement>(null);
    const [shouldFocusFirstCell, setShouldFocusFirstCell] = useState(false);

    // When editingExerciseId changes, set editingExerciseRow to the matching exercise
    useEffect(() => {
        if (editingExerciseId) {
            const exercise = session.exercises.find(
                (e) => e.id === editingExerciseId
            );
            if (exercise) {
                setEditingExerciseRow({ ...exercise });
                setShouldFocusFirstCell(true); // Set flag to focus on entering edit mode
                // Notify parent that editing has started
                if (onEditingStart) {
                    onEditingStart(editingExerciseId);
                }
            }
        } else {
            setEditingExerciseRow(null);
        }
    }, [editingExerciseId, session.exercises, onEditingStart]);

    // Focus the first input when shouldFocusFirstCell is true
    useEffect(() => {
        if (shouldFocusFirstCell && firstInputRef.current) {
            firstInputRef.current.focus();
            setShouldFocusFirstCell(false);
        }
    }, [shouldFocusFirstCell]);

    // Memoize event handlers to prevent unnecessary re-renders
    const handleInlineExerciseChange = useCallback(
        (field: keyof ExerciseRow, value: string) => {
            if (!editingExerciseRow) return;
            console.log(`Setting ${field} to:`, value);
            setEditingExerciseRow({
                ...editingExerciseRow,
                [field]: value,
            });
            // Notify parent that a change was made
            if (onEditingChange) {
                onEditingChange();
            }
        },
        [editingExerciseRow, onEditingChange]
    );

    const saveInlineExercise = useCallback(() => {
        if (!editingExerciseRow) return;
        if (!editingExerciseRow.order || !editingExerciseRow.description) {
            toast.error("Order and Description are required");
            return;
        }

        // // Normalize description for matching
        const normalizedDescription = editingExerciseRow.description
            .trim()
            .toLowerCase();

        // Make sure exerciseId is set - this is critical for backend updates
        if (!editingExerciseRow.exerciseId) {
            // Find the exercise in the exercises list by normalized description
            const matchingExercise = exercises.find(
                (ex) =>
                    ex.exerciseName.trim().toLowerCase() ===
                    normalizedDescription
            );

            if (matchingExercise) {
                // If found, use its exerciseId
                editingExerciseRow.exerciseId = matchingExercise.exerciseId;
            } else {
                // If not found, show error and remove the row
                toast.error(
                    "Please select a valid exercise from the dropdown list"
                );

                // Remove the invalid exercise
                updatePhases(
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

                onEditEnd();
                return;
            }
        }

        updatePhases(
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
                                          ? {
                                                ...editingExerciseRow,
                                                // Ensure exerciseId is preserved
                                                exerciseId:
                                                    editingExerciseRow.exerciseId ||
                                                    e.exerciseId,
                                            }
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

        // Notify parent that editing has ended
        if (onEditingEnd) {
            onEditingEnd(editingExerciseRow.id);
        }

        // End editing mode immediately for better UX
        setEditingExerciseRow(null);
        onEditEnd();

        // Trigger a save of the workout plan (this will now be debounced)
        if (onSaveExercise) {
            onSaveExercise(
                phase.id,
                session.id,
                editingExerciseRow.id,
                editingExerciseRow
            );
        }
    }, [
        editingExerciseRow,
        phase.id,
        phases,
        session.id,
        calculateSessionDuration,
        updatePhases,
        setHasUnsavedChanges,
        onEditEnd,
        exercises,
        onSaveExercise,
        onEditingEnd,
    ]);

    const cancelInlineExercise = useCallback(() => {
        // If the exercise is blank (new), remove it from the array
        if (editingExerciseRow) {
            const isBlank =
                !editingExerciseRow.exerciseId ||
                editingExerciseRow.description === "New Exercise";
            if (isBlank) {
                updatePhases(
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
            // Notify parent that editing has ended
            if (onEditingEnd) {
                onEditingEnd(editingExerciseRow.id);
            }
        }
        setEditingExerciseRow(null);
        onEditEnd();
    }, [
        editingExerciseRow,
        phase.id,
        phases,
        session.id,
        calculateSessionDuration,
        updatePhases,
        onEditEnd,
        onEditingEnd,
    ]);

    // Memoize filtered exercises based on search term
    const filteredExercises = useMemo(
        () =>
            exercises?.filter((ex) =>
                ex.exerciseName.toLowerCase().includes(searchTerm.toLowerCase())
            ) || [],
        [exercises, searchTerm]
    );

    return (
        <>
            <div className="w-full overflow-x-auto mt-2 border rounded-md">
                <Table className="w-full min-w-[1200px]">
                    <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="w-[80px] min-w-[80px]">
                                Order
                            </TableHead>
                            <TableHead className="min-w-[200px] max-w-[300px]">
                                <div>Description</div>
                            </TableHead>
                            <TableHead className="min-w-[120px] max-w-[150px] hidden sm:table-cell">
                                <div>Motion</div>
                            </TableHead>
                            <TableHead className="min-w-[120px] max-w-[150px] hidden md:table-cell">
                                <div>Target Area</div>
                            </TableHead>
                            <TableHead className="min-w-[100px] max-w-[120px]">
                                <div>Sets</div>
                                <div className="text-xs text-muted-foreground">
                                    (min-max)
                                </div>
                            </TableHead>
                            <TableHead className="min-w-[100px] max-w-[120px]">
                                <div>Reps</div>
                                <div className="text-xs text-muted-foreground">
                                    (min-max)
                                </div>
                            </TableHead>
                            <TableHead className="min-w-[100px] max-w-[120px] hidden lg:table-cell">
                                <div>Tempo</div>
                            </TableHead>
                            <TableHead className="min-w-[100px] max-w-[120px]">
                                <div>Rest</div>
                                <div className="text-xs text-muted-foreground">
                                    (min-max)
                                </div>
                            </TableHead>
                            <TableHead className="min-w-[80px] max-w-[100px] hidden xl:table-cell">
                                TUT
                            </TableHead>
                            <TableHead className="min-w-[150px] max-w-[200px] hidden lg:table-cell">
                                <div>Additional Instructions</div>
                            </TableHead>
                            <TableHead className="text-right sticky right-0 bg-muted z-20 w-[120px] min-w-[120px]">
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
                                                ref={firstInputRef}
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

                                                                            // Update description and exerciseId
                                                                            if (
                                                                                selectedExercise
                                                                            ) {
                                                                                // Set all relevant fields in one update to avoid multiple renders
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
                                                                                            description:
                                                                                                selectedExercise.exerciseName,
                                                                                            // Set exerciseId to reference the selected exercise
                                                                                            exerciseId:
                                                                                                selectedExercise.exerciseId,
                                                                                            // Set motion and targetArea if available
                                                                                            motion:
                                                                                                selectedExercise.motion ||
                                                                                                prev.motion,
                                                                                            targetArea:
                                                                                                selectedExercise.targetArea ||
                                                                                                prev.targetArea,
                                                                                        };
                                                                                    }
                                                                                );
                                                                                // Notify parent that a change was made
                                                                                if (
                                                                                    onEditingChange
                                                                                ) {
                                                                                    onEditingChange();
                                                                                }
                                                                                console.log(
                                                                                    "Selected exercise:",
                                                                                    selectedExercise.exerciseName,
                                                                                    "with ID:",
                                                                                    selectedExercise.exerciseId
                                                                                );
                                                                                console.log(
                                                                                    "Selected exercise:",
                                                                                    selectedExercise.exerciseName,
                                                                                    "with ID:",
                                                                                    selectedExercise.exerciseId
                                                                                );
                                                                            } else {
                                                                                // If no exercise found, just update the description
                                                                                handleInlineExerciseChange(
                                                                                    "description",
                                                                                    value
                                                                                );
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
                                                    "3 0 1 0"
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
                                                    "3 0 1 0";
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

                                                // Calculate TUT and store it in the exercise
                                                const calculatedTut =
                                                    tempoSum *
                                                    setsMax *
                                                    repsMax;

                                                // Update the tut field in the editing exercise
                                                if (
                                                    editingExerciseRow.tut !==
                                                    String(calculatedTut)
                                                ) {
                                                    setTimeout(() => {
                                                        handleInlineExerciseChange(
                                                            "tut",
                                                            String(
                                                                calculatedTut
                                                            )
                                                        );
                                                    }, 0);
                                                }

                                                return calculatedTut;
                                            })()}
                                        </TableCell>
                                        {/* Additional Instructions */}
                                        <TableCell className="min-w-[350px]">
                                            <Input
                                                value={
                                                    editingExerciseRow.additionalInfo ??
                                                    ""
                                                }
                                                onChange={(e) => {
                                                    handleInlineExerciseChange(
                                                        "additionalInfo",
                                                        e.target.value
                                                    );
                                                    // handleInlineExerciseChange(
                                                    //     "customizations",
                                                    //     e.target.value
                                                    // );
                                                }}
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
                                                    disabled={isSaving}
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={
                                                        cancelInlineExercise
                                                    }
                                                    className="h-8 w-8"
                                                    disabled={isSaving}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <ExerciseTableRow
                                        key={exercise.id}
                                        exercise={exercise}
                                        onEditExercise={onEditExercise}
                                        deleteExercise={deleteExercise}
                                        phaseId={phase.id}
                                        sessionId={session.id}
                                        isSaving={isSaving}
                                        isAnyOperationInProgress={
                                            isAnyOperationInProgress
                                        }
                                    />
                                )
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
};

// Memoized row component to prevent unnecessary re-renders
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
            // Calculate TUT - sum all numbers in tempo
            const tempo = exercise.tempo ?? "3 0 1 0";
            // Extract all numbers from the tempo string
            const numbers = tempo.match(/\d+/g) || [];
            const tempoSum = numbers.reduce(
                (sum, num) => sum + parseInt(num, 10),
                0
            );

            const setsMax = Number(exercise.setsMax ?? 5);
            const repsMax = Number(exercise.repsMax ?? 12);
            return tempoSum * setsMax * repsMax;
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

export default ExerciseTableInline;
