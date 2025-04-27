import { Phase, Exercise } from "../types";
import SessionCard from "./SessionCard";

interface SessionListProps {
    phase: Phase;
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

export default function SessionList({
    phase,
    openExerciseDialog,
    openConfirmDialog,
}: SessionListProps) {
    return (
        <div>
            {phase.sessions.map((session) => (
                <SessionCard
                    key={session.id}
                    phaseId={phase.id}
                    session={session}
                    openExerciseDialog={openExerciseDialog}
                    openConfirmDialog={openConfirmDialog}
                />
            ))}
        </div>
    );
}
