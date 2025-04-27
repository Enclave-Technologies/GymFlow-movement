import { Session, Exercise } from "../types";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface ExerciseTableProps {
    phaseId: string;
    session: Session;
    openExerciseDialog: (
        phaseId: string,
        sessionId: string,
        exercise?: Exercise
    ) => void;
    openConfirmDialog: (
        type: "phase" | "session" | "exercise",
        ids: { phaseId?: string; sessionId?: string; exerciseId?: string }
    ) => void;
}

export default function ExerciseTable({
    phaseId,
    session,
    openExerciseDialog,
    openConfirmDialog,
}: ExerciseTableProps) {
    return (
        <div className="mt-2">
            <table className="min-w-full text-sm">
                <thead>
                    <tr>
                        <th>Order</th>
                        <th>Motion</th>
                        <th>Target Area</th>
                        <th>Description</th>
                        <th>Sets</th>
                        <th>Reps</th>
                        <th>TUT</th>
                        <th>Tempo</th>
                        <th>Rest</th>
                        <th className="text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {session.exercises.map((exercise) => (
                        <tr key={exercise.id}>
                            <td>{exercise.order}</td>
                            <td>{exercise.motion}</td>
                            <td>{exercise.targetArea}</td>
                            <td>{exercise.description}</td>
                            <td>{exercise.sets || "-"}</td>
                            <td>{exercise.reps || "-"}</td>
                            <td>{exercise.tut || "-"}</td>
                            <td>{exercise.tempo || "-"}</td>
                            <td>{exercise.rest || "-"}</td>
                            <td className="text-right">
                                <div className="flex justify-end gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            openExerciseDialog(
                                                phaseId,
                                                session.id,
                                                exercise
                                            )
                                        }
                                        className="h-8 w-8 cursor-pointer"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            openConfirmDialog("exercise", {
                                                phaseId,
                                                sessionId: session.id,
                                                exerciseId: exercise.id,
                                            })
                                        }
                                        className="h-8 w-8"
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
