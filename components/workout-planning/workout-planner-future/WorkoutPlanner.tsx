"use client";

import { v4 as uuidv4 } from "uuid";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Exercise, Session, Phase } from "../types";
import { getWorkoutPlanByClientId } from "@/actions/workout_plan_actions";

// Custom hook for undo/redo functionality
const useUndoRedo = (initialState: Phase[]) => {
    const [phases, setPhases] = useState<Phase[]>(initialState);
    const [history, setHistory] = useState<Phase[][]>([]);
    const [future, setFuture] = useState<Phase[][]>([]);
    const [isDirty, setIsDirty] = useState(false);

    const pushHistory = (newPhases: Phase[]) => {
        setHistory((prev) => [...prev, phases]);
        setFuture([]);
        setPhases(newPhases);
        setIsDirty(true);
    };

    const undo = () => {
        if (history.length === 0) return;
        setFuture((f) => [phases, ...f]);
        setPhases(history[history.length - 1]);
        setHistory((h) => h.slice(0, -1));
        setIsDirty(true);
    };

    const redo = () => {
        if (future.length === 0) return;
        setHistory((h) => [...h, phases]);
        setPhases(future[0]);
        setFuture((f) => f.slice(1));
        setIsDirty(true);
    };

    const resetHistory = (newPhases: Phase[]) => {
        setPhases(newPhases);
        setHistory([]);
        setFuture([]);
        setIsDirty(false);
    };

    return {
        phases,
        history,
        future,
        isDirty,
        setIsDirty,
        pushHistory,
        undo,
        redo,
        resetHistory,
    };
};

export default function WorkoutPlanner({ client_id }: { client_id: string }) {
    const [isLoading, setIsLoading] = useState(true);
    const [showConfirm, setShowConfirm] = useState<{
        type: "phase" | "session" | "exercise" | null;
        phaseId?: string;
        sessionId?: string;
        exerciseId?: string;
    }>({ type: null });

    const [editingExercise, setEditingExercise] = useState<{
        phaseId: string;
        sessionId: string;
        exerciseId: string;
        exercise: Exercise;
        isNew: boolean;
    } | null>(null);

    const {
        phases,
        history,
        future,
        isDirty,
        setIsDirty,
        pushHistory,
        undo,
        redo,
        resetHistory,
    } = useUndoRedo([]);

    useEffect(() => {
        async function getWorkout() {
            setIsLoading(true);
            try {
                const plan = await getWorkoutPlanByClientId(client_id);
                const mapped = (plan as Phase[]).map((phase) => ({
                    id: phase.id,
                    name: phase.name,
                    isActive: phase.isActive,
                    isExpanded: phase.isExpanded,
                    sessions: phase.sessions.map(
                        (session: Partial<Session>) => {
                            // Map exercises with safe defaults
                            const exercises = session.exercises?.map(
                                (e: Partial<Exercise>) => {
                                    if (
                                        !e.id ||
                                        !e.order ||
                                        !e.motion ||
                                        !e.targetArea ||
                                        !e.description
                                    ) {
                                        console.warn(
                                            "Missing required exercise properties",
                                            e
                                        );
                                    }
                                    const exercise: Exercise = {
                                        id: e.id || uuidv4(),
                                        order: e.order || "",
                                        motion: e.motion || "",
                                        targetArea: e.targetArea || "",
                                        description: e.description || "",
                                        // Include additional properties if they exist
                                        ...(e.sets && { sets: e.sets }),
                                        ...(e.reps && { reps: e.reps }),
                                        ...(e.tut && { tut: e.tut }),
                                        ...(e.tempo && { tempo: e.tempo }),
                                        ...(e.rest && { rest: e.rest }),
                                        ...(e.additionalInfo && {
                                            additionalInfo: e.additionalInfo,
                                        }),
                                        duration: 8, // Default duration
                                    };

                                    // Set the duration if available
                                    if (
                                        e.duration &&
                                        typeof e.duration === "number"
                                    ) {
                                        exercise.duration = e.duration;
                                    }

                                    return exercise;
                                }
                            );

                            // Calculate total session duration
                            const calculatedDuration =
                                exercises?.reduce(
                                    (total: number, ex: Exercise) =>
                                        total + (ex.duration || 8),
                                    0
                                ) || 0;

                            return {
                                id: session.id || uuidv4(),
                                name: session.name || "Unnamed Session",
                                duration: calculatedDuration,
                                isExpanded: Boolean(session.isExpanded),
                                exercises: exercises || [],
                            };
                        }
                    ),
                }));

                resetHistory(mapped);
            } catch (error) {
                console.error("Error fetching workout plan:", error);
                // Fallback to empty data
                resetHistory([]);
            } finally {
                setIsLoading(false);
            }
        }
        getWorkout();
    }, [client_id, resetHistory]);

    // --- Global Save All ---
    const saveAll = () => {
        setIsDirty(false);
        // Simulate save with dummy data
        toast.success("All changes saved (dummy)");
    };

    const addPhase = () => {
        const newPhase: Phase = {
            id: uuidv4(),
            name: `Untitled Phase`,
            isActive: false,
            isExpanded: true,
            sessions: [],
        };
        pushHistory([...phases, newPhase]);
    };

    const openConfirmDialog = (
        type: "phase" | "session" | "exercise",
        ids: { phaseId?: string; sessionId?: string; exerciseId?: string }
    ) => {
        setShowConfirm({
            type,
            ...ids,
        });
    };

    const closeDialog = () => {
        setShowConfirm({ type: null });
        setEditingExercise(null);
    };

    return (
        <div className="w-full max-w-6xl mx-auto rounded-lg shadow-sm border text-accent-foreground">
            <div className="w-full p-4">
                <div className="mb-6 flex items-center gap-4">
                    <Button onClick={addPhase} className="cursor-pointer">
                        <Plus className="h-4 w-4 mr-2" /> Add Phase
                    </Button>
                    <Button
                        onClick={saveAll}
                        className="cursor-pointer"
                        variant={isDirty ? "default" : "outline"}
                        disabled={!isDirty}
                    >
                        Save All
                    </Button>
                    <Button
                        onClick={undo}
                        className="cursor-pointer"
                        variant="outline"
                        disabled={history.length === 0}
                    >
                        Undo
                    </Button>
                    <Button
                        onClick={redo}
                        className="cursor-pointer"
                        variant="outline"
                        disabled={future.length === 0}
                    >
                        Redo
                    </Button>
                    {isDirty && (
                        <span className="ml-4 px-2 py-1 bg-yellow-200 text-yellow-900 rounded text-xs font-semibold">
                            Unsaved changes
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center">
                            <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                            <p className="mt-4 text-sm text-muted-foreground">
                                Please wait...
                            </p>
                        </div>
                    </div>
                ) : phases.length > 0 ? (
                    <DndProvider backend={HTML5Backend}>
                        <div>
                            {phases.map((phase) => (
                                <div
                                    key={phase.id}
                                    className="mb-4 border rounded"
                                >
                                    <div className="flex items-center justify-between p-4 border-b">
                                        <div className="flex items-center">
                                            <span className="font-semibold text-lg">
                                                {phase.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    openConfirmDialog("phase", {
                                                        phaseId: phase.id,
                                                    })
                                                }
                                                className="h-8 w-8 cursor-pointer"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DndProvider>
                ) : (
                    <div className="flex flex-col items-center justify-center p-10">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-semibold mb-2 text-foreground">
                                No phases added yet
                            </h3>
                            <p className="text-muted-foreground">
                                Click &quot;Add Phase&quot; to get started
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Dialogs */}
            {showConfirm.type && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4">
                            {showConfirm.type === "phase" && "Delete Phase"}
                            {showConfirm.type === "session" && "Delete Session"}
                            {showConfirm.type === "exercise" &&
                                "Delete Exercise"}
                        </h2>
                        <p className="mb-6">
                            Are you sure you want to delete this{" "}
                            {showConfirm.type}?
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowConfirm({ type: null })}
                            >
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={closeDialog}>
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {editingExercise && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg max-w-xl w-full">
                        <h2 className="text-xl font-bold mb-4 text-center">
                            {editingExercise.isNew
                                ? "Add Exercise"
                                : "Edit Exercise"}
                        </h2>
                        <div className="mb-6">
                            <p>Exercise form would go here</p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={closeDialog}>
                                Cancel
                            </Button>
                            <Button onClick={closeDialog}>
                                {editingExercise.isNew
                                    ? "Add Exercise"
                                    : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
