import React, { useRef, useEffect, useState } from "react";
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
import { Edit, Trash2 } from "lucide-react";
import { Exercise, Phase, Session } from "./types";
import { toast } from "sonner";

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
    calculateSessionDuration: (exercises: Exercise[]) => number;
    editingExerciseId: string | null;
    onEditEnd: () => void;
    onEditExercise: (exerciseId: string) => void;
}

const exerciseMotionOptions = [
    "Upper Body Pull",
    "Upper Body Push",
    "Lower Body Pull",
    "Lower Body Push",
    "Core",
];
const exerciseTargetAreaOptions = [
    "Chest",
    "Back",
    "Shoulders",
    "Biceps",
    "Triceps",
    "Legs",
    "Calves",
    "Abs",
];
const exerciseDescriptionOptions = ["Chin Up", "Cable Dumbell", "Inverted Row"];

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
}) => {
    const [editingExerciseRow, setEditingExerciseRow] =
        useState<Exercise | null>(null);

    const focusRef = useRef<HTMLInputElement | null>(null);

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

    // Effect to focus on the input when editing starts
    useEffect(() => {
        if (editingExerciseRow && focusRef.current) {
            focusRef.current.focus();
        }
    }, [editingExerciseRow]);

    const handleInlineExerciseChange = (
        field: keyof Exercise,
        value: string
    ) => {
        if (!editingExerciseRow) return;
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
                                  duration:
                                      calculateSessionDuration(
                                          updatedExercises
                                      ),
                              };
                          }),
                      }
            )
        );
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
                                                      updatedExercises
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

    // startInlineEditExercise removed - not used

    return (
        <>
            <div className="mt-2">
                <Table>
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead className="w-[80px]">Order</TableHead>
                            <TableHead>Motion</TableHead>
                            <TableHead>Target Area</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Sets</TableHead>
                            <TableHead>Reps</TableHead>
                            <TableHead>TUT</TableHead>
                            <TableHead>Tempo</TableHead>
                            <TableHead>Rest</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {session.exercises.map((exercise: Exercise) =>
                            editingExerciseId === exercise.id &&
                            editingExerciseRow ? (
                                <TableRow key={exercise.id}>
                                    <TableCell>
                                        <Input
                                            ref={focusRef}
                                            value={editingExerciseRow.order}
                                            onChange={(e) =>
                                                handleInlineExerciseChange(
                                                    "order",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="A1, B1, etc."
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={editingExerciseRow.motion}
                                            onValueChange={(value) =>
                                                handleInlineExerciseChange(
                                                    "motion",
                                                    value
                                                )
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Motion" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {exerciseMotionOptions.map(
                                                    (opt) => (
                                                        <SelectItem
                                                            key={opt}
                                                            value={opt}
                                                        >
                                                            {opt}
                                                        </SelectItem>
                                                    )
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
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
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Target Area" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {exerciseTargetAreaOptions.map(
                                                    (opt) => (
                                                        <SelectItem
                                                            key={opt}
                                                            value={opt}
                                                        >
                                                            {opt}
                                                        </SelectItem>
                                                    )
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={
                                                editingExerciseRow.description
                                            }
                                            onValueChange={(value) =>
                                                handleInlineExerciseChange(
                                                    "description",
                                                    value
                                                )
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Exercise" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {exerciseDescriptionOptions.map(
                                                    (opt) => (
                                                        <SelectItem
                                                            key={opt}
                                                            value={opt}
                                                        >
                                                            {opt}
                                                        </SelectItem>
                                                    )
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={
                                                editingExerciseRow.sets || ""
                                            }
                                            onChange={(e) =>
                                                handleInlineExerciseChange(
                                                    "sets",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Sets"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={
                                                editingExerciseRow.reps || ""
                                            }
                                            onChange={(e) =>
                                                handleInlineExerciseChange(
                                                    "reps",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Reps"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={editingExerciseRow.tut || ""}
                                            onChange={(e) =>
                                                handleInlineExerciseChange(
                                                    "tut",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="TUT"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={
                                                editingExerciseRow.tempo || ""
                                            }
                                            onChange={(e) =>
                                                handleInlineExerciseChange(
                                                    "tempo",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Tempo"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={
                                                editingExerciseRow.rest || ""
                                            }
                                            onChange={(e) =>
                                                handleInlineExerciseChange(
                                                    "rest",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Rest"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={saveInlineExercise}
                                                className="h-8 w-8 cursor-pointer"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={cancelInlineExercise}
                                                className="h-8 w-8"
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <TableRow key={exercise.id}>
                                    <TableCell>{exercise.order}</TableCell>
                                    <TableCell>{exercise.motion}</TableCell>
                                    <TableCell>{exercise.targetArea}</TableCell>
                                    <TableCell>
                                        {exercise.description}
                                    </TableCell>
                                    <TableCell>
                                        {exercise.sets || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {exercise.reps || "-"}
                                    </TableCell>
                                    <TableCell>{exercise.tut || "-"}</TableCell>
                                    <TableCell>
                                        {exercise.tempo || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {exercise.rest || "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    onEditExercise(exercise.id)
                                                }
                                                className="h-8 w-8 cursor-pointer"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    // Instead of opening local dialog, call parent delete handler directly
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
