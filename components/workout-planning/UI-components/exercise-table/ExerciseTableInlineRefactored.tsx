import React, {
    useEffect,
    useState,
    useMemo,
    useCallback,
    useRef,
} from "react";
import { Table, TableBody } from "@/components/ui/table";
import { Phase, Session, Exercise } from "../../types";
import { toast } from "sonner";
import type { SelectExercise } from "@/db/schemas";
import ExerciseTableHeader from "./ExerciseTableHeader";
import ExerciseTableRow, { ExerciseRow } from "./ExerciseTableRow";
import ExerciseEditRow from "./ExerciseEditRow";
import { getUniqueMotions, getUniqueTargetAreas } from "./exercise-table-utils";

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
    isSaving: boolean;
    isAnyOperationInProgress?: boolean;
    onEditingStart?: (exerciseId: string) => void;
    onEditingEnd?: (exerciseId: string) => void;
    onEditingChange?: () => void;
}

/**
 * Refactored Exercise Table Inline Component
 * Displays exercises in a table format with inline editing capabilities
 */
const ExerciseTableInlineRefactored: React.FC<ExerciseTableInlineProps> = ({
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

    // Focus management for first cell
    const firstInputRef = useRef<HTMLInputElement>(null);
    const [shouldFocusFirstCell, setShouldFocusFirstCell] = useState(false);

    // When editingExerciseId changes, set editingExerciseRow to the matching exercise
    useEffect(() => {
        if (editingExerciseId) {
            const exercise = session.exercises.find(
                (e) => e.id === editingExerciseId
            );
            if (exercise) {
                setEditingExerciseRow({ ...exercise });
                setShouldFocusFirstCell(true);
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

    // Handle field changes in editing row
    const handleInlineExerciseChange = useCallback(
        (field: keyof ExerciseRow, value: string) => {
            if (!editingExerciseRow) return;

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

        // Normalize description for matching
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

        // Trigger a save of the workout plan FIRST (while edit state is still available)
        if (onSaveExercise) {
            onSaveExercise(
                phase.id,
                session.id,
                editingExerciseRow.id,
                editingExerciseRow
            );
        }

        // THEN notify parent that editing has ended (this clears exercise edit state)
        if (onEditingEnd) {
            onEditingEnd(editingExerciseRow.id);
        }

        // End editing mode immediately for better UX
        setEditingExerciseRow(null);
        onEditEnd();
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

    return (
        <div className="w-full overflow-x-auto mt-2 border rounded-md">
            <Table className="w-full min-w-[1200px]">
                <ExerciseTableHeader />
                <TableBody>
                    {(session.exercises as ExerciseRow[]).map(
                        (exercise: ExerciseRow) =>
                            editingExerciseId === exercise.id &&
                            editingExerciseRow ? (
                                <ExerciseEditRow
                                    key={exercise.id}
                                    editingExerciseRow={editingExerciseRow}
                                    exercises={exercises}
                                    exerciseMotionOptions={
                                        exerciseMotionOptions
                                    }
                                    exerciseTargetAreaOptions={
                                        exerciseTargetAreaOptions
                                    }
                                    isSaving={isSaving}
                                    onFieldChange={handleInlineExerciseChange}
                                    onSave={saveInlineExercise}
                                    onCancel={cancelInlineExercise}
                                    firstInputRef={firstInputRef}
                                />
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
    );
};

export default ExerciseTableInlineRefactored;
