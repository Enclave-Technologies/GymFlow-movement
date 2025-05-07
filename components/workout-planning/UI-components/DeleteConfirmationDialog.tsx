import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type DeleteConfirmationDialogProps = {
    showConfirm: {
        type: "phase" | "session" | "exercise" | null;
        phaseId?: string;
        sessionId?: string;
        exerciseId?: string;
    };
    onCancel: () => void;
    onDeletePhase: (phaseId: string) => void;
    onDeleteSession: (phaseId: string, sessionId: string) => void;
    onDeleteExercise: (
        phaseId: string,
        sessionId: string,
        exerciseId: string
    ) => void;
};

/**
 * Renders a modal dialog to confirm deletion of a phase, session, or exercise.
 *
 * Displays a confirmation message and provides options to cancel or proceed with deletion. Invokes the appropriate deletion callback based on the item type specified in {@link showConfirm}.
 *
 * @remark
 * Assumes that the required IDs are present in {@link showConfirm} for the selected deletion type.
 */
export function DeleteConfirmationDialog({
    showConfirm,
    onCancel,
    onDeletePhase,
    onDeleteSession,
    onDeleteExercise,
}: DeleteConfirmationDialogProps) {
    if (!showConfirm.type) return null;

    return (
        <Dialog open onOpenChange={onCancel}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {showConfirm.type === "phase" && "Delete Phase"}
                        {showConfirm.type === "session" && "Delete Session"}
                        {showConfirm.type === "exercise" && "Delete Exercise"}
                    </DialogTitle>
                </DialogHeader>
                <p className="py-4">
                    Are you sure you want to delete this{" "}
                    {showConfirm.type === "phase"
                        ? "phase"
                        : showConfirm.type === "session"
                        ? "session"
                        : showConfirm.type === "exercise"
                        ? "exercise"
                        : "item"}
                    ?
                </p>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                    {showConfirm.type === "phase" && (
                        <Button
                            variant="destructive"
                            onClick={() =>
                                onDeletePhase(showConfirm.phaseId!)
                            }
                        >
                            Delete
                        </Button>
                    )}
                    {showConfirm.type === "session" && (
                        <Button
                            variant="destructive"
                            onClick={() =>
                                onDeleteSession(
                                    showConfirm.phaseId!,
                                    showConfirm.sessionId!
                                )
                            }
                        >
                            Delete
                        </Button>
                    )}
                    {showConfirm.type === "exercise" && (
                        <Button
                            variant="destructive"
                            onClick={() =>
                                onDeleteExercise(
                                    showConfirm.phaseId!,
                                    showConfirm.sessionId!,
                                    showConfirm.exerciseId!
                                )
                            }
                        >
                            Delete
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
