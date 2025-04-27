"use client";

import { v4 as uuidv4 } from "uuid";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
// Table components are now used in ExerciseTableInline component
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Select components are now used in ExerciseTableInline component
import { ChevronDown, ChevronUp, Copy, Edit, Plus, Trash2 } from "lucide-react";
import { getWorkoutPlanByClientId } from "@/actions/workout_plan_actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Exercise, Session, Phase } from "./types";
import DraggableSession from "./draggable-session";
import ExerciseTableInline from "./ExerciseTableInline";

export default function WorkoutPlanner({ client_id }: { client_id: string }) {
    const [phases, setPhases] = useState<Phase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // isSaving state is no longer needed as dialog is removed
    // Undo/redo removed
    const [showConfirm, setShowConfirm] = useState<{
        type: "phase" | "session" | "exercise" | null;
        phaseId?: string;
        sessionId?: string;
        exerciseId?: string;
    }>({ type: null });
    const [startingSessionId, setStartingSessionId] = useState<string | null>(
        null
    );
    // These states are no longer needed as dialog is removed
    // but we're keeping the interface for now to avoid breaking changes

    const router = useRouter();

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

                console.log(mapped);
                setPhases(mapped);
            } catch (error) {
                console.error("Error fetching workout plan:", error);
                // Fallback to empty data
                setPhases([]);
            } finally {
                setIsLoading(false);
            }
        }
        getWorkout();
    }, [client_id]);

    // --- Undo/Redo helpers removed ---

    // --- Global Save All ---
    const saveAll = () => {
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
        setPhases([...phases, newPhase]);
    };

    const togglePhaseExpansion = (phaseId: string) => {
        setPhases(
            phases.map((phase) =>
                phase.id === phaseId
                    ? { ...phase, isExpanded: !phase.isExpanded }
                    : phase
            )
        );
    };

    const toggleSessionExpansion = (phaseId: string, sessionId: string) => {
        setPhases(
            phases.map((phase) => {
                if (phase.id !== phaseId) return phase;
                return {
                    ...phase,
                    sessions: phase.sessions.map((session) =>
                        session.id === sessionId
                            ? { ...session, isExpanded: !session.isExpanded }
                            : session
                    ),
                };
            })
        );
    };

    const togglePhaseActivation = async (phaseId: string) => {
        // Dummy: just update local state
        const isActive = !phases.find((p) => p.id === phaseId)?.isActive;
        setPhases(
            phases.map((phase) =>
                phase.id === phaseId
                    ? { ...phase, isActive }
                    : { ...phase, isActive: false }
            )
        );
        // If backend needed, call updatePhaseActivation here
    };

    const addSession = (phaseId: string) => {
        setPhases(
            phases.map((phase) => {
                if (phase.id !== phaseId) return phase;
                const count = phase.sessions.length + 1;
                const newSession: Session = {
                    id: uuidv4(),
                    name: `Session ${count}: New`,
                    duration: 0,
                    isExpanded: true,
                    exercises: [],
                };
                return { ...phase, sessions: [...phase.sessions, newSession] };
            })
        );
    };

    // State to track which session and exercise is being edited
    const [editingExercise, setEditingExercise] = useState<{
        sessionId: string;
        exerciseId: string;
    } | null>(null);

    // This function is called when the "Add Exercise" button is clicked in the session header
    const addExercise = (phaseId: string, sessionId: string) => {
        // Create a new blank exercise
        const newExercise = {
            id: uuidv4(),
            order: "",
            motion: "",
            targetArea: "",
            description: "",
            duration: 8,
        };
        // Push the new exercise to the correct session in phases
        setPhases(
            phases.map((phase) =>
                phase.id !== phaseId
                    ? phase
                    : {
                          ...phase,
                          sessions: phase.sessions.map((session) =>
                              session.id !== sessionId
                                  ? session
                                  : {
                                        ...session,
                                        exercises: [
                                            ...session.exercises,
                                            newExercise,
                                        ],
                                    }
                          ),
                      }
            )
        );
        // Set the editing exercise state
        setEditingExercise({ sessionId, exerciseId: newExercise.id });
    };

    // Reset the editingExercise state after the exercise has been saved or cancelled
    const handleExerciseEditEnd = () => {
        setEditingExercise(null);
    };

    const deletePhase = (phaseId: string) =>
        setShowConfirm({ type: "phase", phaseId });
    const confirmDeletePhase = (phaseId: string) => {
        setPhases(phases.filter((phase) => phase.id !== phaseId));
        setShowConfirm({ type: null });
    };

    const deleteSession = (phaseId: string, sessionId: string) =>
        setShowConfirm({ type: "session", phaseId, sessionId });
    const confirmDeleteSession = (phaseId: string, sessionId: string) => {
        setPhases(
            phases.map((phase) =>
                phase.id !== phaseId
                    ? phase
                    : {
                          ...phase,
                          sessions: phase.sessions.filter(
                              (s) => s.id !== sessionId
                          ),
                      }
            )
        );
        setShowConfirm({ type: null });
    };

    const deleteExercise = (
        phaseId: string,
        sessionId: string,
        exerciseId: string
    ) => setShowConfirm({ type: "exercise", phaseId, sessionId, exerciseId });
    const confirmDeleteExercise = (
        phaseId: string,
        sessionId: string,
        exerciseId: string
    ) => {
        setPhases(
            phases.map((phase) =>
                phase.id !== phaseId
                    ? phase
                    : {
                          ...phase,
                          sessions: phase.sessions.map((session) => {
                              if (session.id !== sessionId) return session;

                              // Remove the exercise
                              const updatedExercises = session.exercises.filter(
                                  (e) => e.id !== exerciseId
                              );

                              // Recalculate total session duration
                              const totalDuration =
                                  calculateSessionDuration(updatedExercises);

                              return {
                                  ...session,
                                  exercises: updatedExercises,
                                  duration: totalDuration,
                              };
                          }),
                      }
            )
        );
        setShowConfirm({ type: null });
    };

    const duplicatePhase = (phaseId: string) => {
        const target = phases.find((p) => p.id === phaseId);
        if (!target) return;
        const copy: Phase = {
            ...target,
            id: uuidv4(),
            name: `${target.name} (Copy)`,
            isActive: false,
        };
        setPhases([...phases, copy]);
    };

    const duplicateSession = (phaseId: string, sessionId: string) => {
        setPhases(
            phases.map((phase) => {
                if (phase.id !== phaseId) return phase;
                const target = phase.sessions.find((s) => s.id === sessionId);
                if (!target) return phase;
                const copy: Session = {
                    ...target,
                    id: uuidv4(),
                    name: `${target.name} (Copy)`,
                };
                return { ...phase, sessions: [...phase.sessions, copy] };
            })
        );
    };

    const [editingPhase, setEditingPhase] = useState<string | null>(null);
    const [editPhaseValue, setEditPhaseValue] = useState("");
    const startEditPhase = (id: string, name: string) => {
        setEditingPhase(id);
        setEditPhaseValue(name);
    };
    const savePhaseEdit = () => {
        if (!editingPhase) return;
        setPhases(
            phases.map((p) =>
                p.id === editingPhase ? { ...p, name: editPhaseValue } : p
            )
        );
        setEditingPhase(null);
    };

    const [editingSession, setEditingSession] = useState<string | null>(null);
    const [editSessionValue, setEditSessionValue] = useState("");
    const startEditSession = (id: string, name: string) => {
        setEditingSession(id);
        setEditSessionValue(name);
    };
    const saveSessionEdit = () => {
        if (!editingSession) return;
        setPhases(
            phases.map((phase) => ({
                ...phase,
                sessions: phase.sessions.map((s) =>
                    s.id === editingSession
                        ? { ...s, name: editSessionValue }
                        : s
                ),
            }))
        );
        setEditingSession(null);
    };

    // Exercise editing is now handled by the ExerciseTableInline component

    // Calculate session duration based on exercises
    const calculateSessionDuration = (exercises: Exercise[]): number => {
        if (!exercises.length) return 0;

        return exercises.reduce(
            (total, exercise) => total + (exercise.duration || 8),
            0
        );
    };

    // Exercise form handling is now in ExerciseTableInline component

    // Handle starting a session
    const startSession = async (sessionId: string, phaseId: string) => {
        setStartingSessionId(sessionId);
        try {
            // API call
            await new Promise((resolve) => setTimeout(resolve, 1000));

            router.push(
                `/record-workout?sessionId=${sessionId}&phaseId=${phaseId}&clientId=${client_id}`
            );
        } catch (error) {
            console.error("Error starting session:", error);
        } finally {
            setStartingSessionId(null);
        }
    };

    // Save a single session (removed)

    // Function to move a session within a phase
    const moveSession = (
        phaseId: string,
        dragIndex: number,
        hoverIndex: number
    ) => {
        setPhases(
            phases.map((phase) => {
                if (phase.id !== phaseId) return phase;

                const newSessions = [...phase.sessions];
                const draggedSession = newSessions[dragIndex];
                newSessions.splice(dragIndex, 1);
                newSessions.splice(hoverIndex, 0, draggedSession);

                return {
                    ...phase,
                    sessions: newSessions,
                };
            })
        );
    };

    // Inline editing state and functions are now handled by the ExerciseTableInline component

    // Function to render the exercises table
    const renderExercisesTable = (phase: Phase, session: Session) => {
        // Determine if this session has an exercise being edited
        const editingExerciseId =
            editingExercise && editingExercise.sessionId === session.id
                ? editingExercise.exerciseId
                : null;

        // Handler to set the editing exercise for this session
        const handleEditExercise = (exerciseId: string) => {
            setEditingExercise({ sessionId: session.id, exerciseId });
        };

        return (
            <ExerciseTableInline
                phase={phase}
                session={session}
                setPhases={setPhases}
                phases={phases}
                deleteExercise={deleteExercise}
                calculateSessionDuration={calculateSessionDuration}
                editingExerciseId={editingExerciseId}
                onEditEnd={handleExerciseEditEnd}
                onEditExercise={handleEditExercise}
            />
        );
    };

    return (
        <div className="w-full max-w-6xl mx-auto rounded-lg shadow-sm border text-accent-foreground">
            <div className="w-full p-4">
                <div className="mb-6 flex items-center gap-4">
                    <Button onClick={addPhase} className="cursor-pointer">
                        <Plus className="h-4 w-4 mr-2" /> Add Phase
                    </Button>
                    <Button onClick={saveAll} className="cursor-pointer">
                        Save All
                    </Button>
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
                        {phases.map((phase) => (
                            <Card key={phase.id} className="mb-4">
                                <CardContent className="p-0">
                                    <div className="flex items-center justify-between p-4 border-b">
                                        <div className="flex items-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    togglePhaseExpansion(
                                                        phase.id
                                                    )
                                                }
                                                className="p-1 h-auto mr-2 cursor-pointer"
                                            >
                                                {phase.isExpanded ? (
                                                    <ChevronDown className="h-5 w-5" />
                                                ) : (
                                                    <ChevronUp className="h-5 w-5" />
                                                )}
                                            </Button>
                                            {editingPhase === phase.id ? (
                                                <div className="flex items-center">
                                                    <Input
                                                        value={editPhaseValue}
                                                        onChange={(e) =>
                                                            setEditPhaseValue(
                                                                e.target.value
                                                            )
                                                        }
                                                        className="h-8 w-48"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={savePhaseEdit}
                                                        className="ml-2 cursor-pointer"
                                                    >
                                                        Save
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="font-semibold text-lg">
                                                    {phase.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    startEditPhase(
                                                        phase.id,
                                                        phase.name
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
                                                    deletePhase(phase.id)
                                                }
                                                className="h-8 w-8 cursor-pointer"
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    duplicatePhase(phase.id)
                                                }
                                                className="h-8 w-8 cursor-pointer"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    addSession(phase.id)
                                                }
                                                className="h-8 w-8 cursor-pointer"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                            <div className="flex items-center ml-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center">
                                                        <Switch
                                                            checked={
                                                                phase.isActive
                                                            }
                                                            onCheckedChange={() =>
                                                                togglePhaseActivation(
                                                                    phase.id
                                                                )
                                                            }
                                                            id={`activate-${phase.id}`}
                                                        />
                                                        <Label
                                                            htmlFor={`activate-${phase.id}`}
                                                            className="ml-2"
                                                        >
                                                            {phase.isActive
                                                                ? "Deactivate Phase"
                                                                : "Activate Phase"}
                                                        </Label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {phase.isExpanded && (
                                        <div className="p-4">
                                            {phase.sessions.map(
                                                (session, index) => (
                                                    <DraggableSession
                                                        key={session.id}
                                                        phase={phase}
                                                        session={session}
                                                        index={index}
                                                        toggleSessionExpansion={
                                                            toggleSessionExpansion
                                                        }
                                                        deleteSession={
                                                            deleteSession
                                                        }
                                                        duplicateSession={
                                                            duplicateSession
                                                        }
                                                        addExercise={
                                                            addExercise
                                                        }
                                                        startSession={
                                                            startSession
                                                        }
                                                        startingSessionId={
                                                            startingSessionId
                                                        }
                                                        startEditSession={
                                                            startEditSession
                                                        }
                                                        moveSession={
                                                            moveSession
                                                        }
                                                        renderExercisesTable={
                                                            renderExercisesTable
                                                        }
                                                        editingSession={
                                                            editingSession
                                                        }
                                                        editSessionValue={
                                                            editSessionValue
                                                        }
                                                        saveSessionEdit={
                                                            saveSessionEdit
                                                        }
                                                        setEditSessionValue={
                                                            setEditSessionValue
                                                        }
                                                    />
                                                )
                                            )}
                                            {phase.sessions.length === 0 && (
                                                <div className="text-center py-8 text-muted-foreground">
                                                    No sessions added. Click +
                                                    to add.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
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

            {/* Confirm Delete Dialog */}
            {showConfirm.type && (
                <Dialog
                    open
                    onOpenChange={() => setShowConfirm({ type: null })}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {showConfirm.type === "phase" && "Delete Phase"}
                                {showConfirm.type === "session" &&
                                    "Delete Session"}
                                {showConfirm.type === "exercise" &&
                                    "Delete Exercise"}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            Are you sure you want to delete this{" "}
                            {showConfirm.type}?
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setShowConfirm({ type: null })}
                            >
                                Cancel
                            </Button>
                            {showConfirm.type === "phase" && (
                                <Button
                                    variant="destructive"
                                    onClick={() =>
                                        confirmDeletePhase(showConfirm.phaseId!)
                                    }
                                >
                                    Delete
                                </Button>
                            )}
                            {showConfirm.type === "session" && (
                                <Button
                                    variant="destructive"
                                    onClick={() =>
                                        confirmDeleteSession(
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
                                        confirmDeleteExercise(
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
            )}

            {/* Exercise editing is now handled inline by the ExerciseTableInline component */}
        </div>
    );
}
