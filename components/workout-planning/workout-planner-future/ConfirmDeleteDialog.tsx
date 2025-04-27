import { Phase } from "./types";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDeleteDialogProps {
    showConfirm: {
        type: "phase" | "session" | "exercise" | null;
        phaseId?: string;
        sessionId?: string;
        exerciseId?: string;
    };
    closeDialog: () => void;
    setPhases: (phases: Phase[]) => void;
    pushHistory: (phases: Phase[]) => void;
    setIsDirty: (dirty: boolean) => void;
    phases: Phase[];
}

export default function ConfirmDeleteDialog({
    showConfirm,
    closeDialog,
    setPhases,
    pushHistory,
    setIsDirty,
    phases,
}: ConfirmDeleteDialogProps) {
    if (!showConfirm.type) return null;

    const handleDelete = () => {
        let updatedPhases = phases;
        if (showConfirm.type === "phase" && showConfirm.phaseId) {
            updatedPhases = phases.filter((p) => p.id !== showConfirm.phaseId);
        } else if (
            showConfirm.type === "session" &&
            showConfirm.phaseId &&
            showConfirm.sessionId
        ) {
            updatedPhases = phases.map((phase) =>
                phase.id !== showConfirm.phaseId
                    ? phase
                    : {
                          ...phase,
                          sessions: phase.sessions.filter(
                              (s) => s.id !== showConfirm.sessionId
                          ),
                      }
            );
        } else if (
            showConfirm.type === "exercise" &&
            showConfirm.phaseId &&
            showConfirm.sessionId &&
            showConfirm.exerciseId
        ) {
            updatedPhases = phases.map((phase) =>
                phase.id !== showConfirm.phaseId
                    ? phase
                    : {
                          ...phase,
                          sessions: phase.sessions.map((session) =>
                              session.id !== showConfirm.sessionId
                                  ? session
                                  : {
                                        ...session,
                                        exercises: session.exercises.filter(
                                            (e) =>
                                                e.id !== showConfirm.exerciseId
                                        ),
                                    }
                          ),
                      }
            );
        }
        pushHistory(updatedPhases);
        setIsDirty(true);
        closeDialog();
    };

    return (
        <Dialog open={!!showConfirm.type} onOpenChange={closeDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {showConfirm.type === "phase" && "Delete Phase"}
                        {showConfirm.type === "session" && "Delete Session"}
                        {showConfirm.type === "exercise" && "Delete Exercise"}
                    </DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    Are you sure you want to delete this {showConfirm.type}?
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={closeDialog}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
