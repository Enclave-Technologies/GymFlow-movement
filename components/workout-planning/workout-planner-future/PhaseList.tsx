import { Phase, Exercise } from "./types";
import PhaseCard from "./PhaseCard";

interface PhaseListProps {
    phases: Phase[];
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

export default function PhaseList({
    phases,
    openExerciseDialog,
    openConfirmDialog,
}: PhaseListProps) {
    return (
        <div>
            {phases.map((phase) => (
                <PhaseCard
                    key={phase.id}
                    phase={phase}
                    openExerciseDialog={openExerciseDialog}
                    openConfirmDialog={openConfirmDialog}
                />
            ))}
        </div>
    );
}
