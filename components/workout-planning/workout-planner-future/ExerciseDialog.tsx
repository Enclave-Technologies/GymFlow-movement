import { Exercise, Phase, Session } from "../types";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

interface ExerciseDialogProps {
    editingExercise: {
        phaseId: string;
        sessionId: string;
        exerciseId: string;
        exercise: Exercise;
        isNew: boolean;
    } | null;
    closeDialog: () => void;
    pushHistory: (phases: Phase[]) => void;
    setIsDirty: (dirty: boolean) => void;
    phases: Phase[];
}

export default function ExerciseDialog({
    editingExercise,
    closeDialog,
    pushHistory,
    setIsDirty,
    phases,
}: ExerciseDialogProps) {
    const [exercise, setExercise] = useState<Exercise | null>(null);

    useEffect(() => {
        if (editingExercise) {
            setExercise(editingExercise.exercise);
        }
    }, [editingExercise]);

    if (!editingExercise || !exercise) return null;

    const handleChange = (field: keyof Exercise, value: string) => {
        setExercise({ ...exercise, [field]: value });
    };

    const handleSave = () => {
        // Find phase/session and update exercise
        const updatedPhases = phases.map((phase) =>
            phase.id !== editingExercise.phaseId
                ? phase
                : {
                      ...phase,
                      sessions: phase.sessions.map((session: Session) =>
                          session.id !== editingExercise.sessionId
                              ? session
                              : {
                                    ...session,
                                    exercises: editingExercise.isNew
                                        ? [...session.exercises, exercise]
                                        : session.exercises.map((e: Exercise) =>
                                              e.id ===
                                              editingExercise.exerciseId
                                                  ? exercise
                                                  : e
                                          ),
                                }
                      ),
                  }
        );
        pushHistory(updatedPhases);
        setIsDirty(true);
        closeDialog();
    };

    return (
        <Dialog open={!!editingExercise} onOpenChange={closeDialog}>
            <DialogContent className="sm:max-w-[650px]">
                <DialogHeader>
                    <DialogTitle className="text-center">
                        {editingExercise.isNew
                            ? "Add Exercise"
                            : "Edit Exercise"}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="order">Order</Label>
                            <Input
                                id="order"
                                placeholder="A1, B1, etc."
                                value={exercise.order}
                                onChange={(e) =>
                                    handleChange("order", e.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="motion">Motion</Label>
                            <Input
                                id="motion"
                                placeholder="Motion"
                                value={exercise.motion}
                                onChange={(e) =>
                                    handleChange("motion", e.target.value)
                                }
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="targetArea">Target Area</Label>
                            <Input
                                id="targetArea"
                                placeholder="Target Area"
                                value={exercise.targetArea}
                                onChange={(e) =>
                                    handleChange("targetArea", e.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                placeholder="Description"
                                value={exercise.description}
                                onChange={(e) =>
                                    handleChange("description", e.target.value)
                                }
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="sets">Sets</Label>
                            <Input
                                id="sets"
                                placeholder="Sets"
                                value={exercise.sets || ""}
                                onChange={(e) =>
                                    handleChange("sets", e.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reps">Reps</Label>
                            <Input
                                id="reps"
                                placeholder="Reps"
                                value={exercise.reps || ""}
                                onChange={(e) =>
                                    handleChange("reps", e.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tut">TUT</Label>
                            <Input
                                id="tut"
                                placeholder="TUT"
                                value={exercise.tut || ""}
                                onChange={(e) =>
                                    handleChange("tut", e.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tempo">Tempo</Label>
                            <Input
                                id="tempo"
                                placeholder="Tempo"
                                value={exercise.tempo || ""}
                                onChange={(e) =>
                                    handleChange("tempo", e.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rest">Rest</Label>
                            <Input
                                id="rest"
                                placeholder="Rest"
                                value={exercise.rest || ""}
                                onChange={(e) =>
                                    handleChange("rest", e.target.value)
                                }
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="additionalInfo">
                            Additional Information
                        </Label>
                        <Input
                            id="additionalInfo"
                            placeholder="Additional notes for this exercise"
                            value={exercise.additionalInfo || ""}
                            onChange={(e) =>
                                handleChange("additionalInfo", e.target.value)
                            }
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={closeDialog}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        {editingExercise.isNew
                            ? "Add Exercise"
                            : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
