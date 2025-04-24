"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    ChevronDown,
    ChevronUp,
    Clipboard,
    Copy,
    Edit,
    GripVertical,
    Plus,
    Trash2,
} from "lucide-react";
import { getWorkoutPlanByClientId } from "@/actions/workout_plan_actions";

// Types
interface Exercise {
    id: string;
    order: string;
    motion: string;
    targetArea: string;
    description: string;
}

interface Session {
    id: string;
    name: string;
    duration: number;
    exercises: Exercise[];
    isExpanded: boolean;
}

interface Phase {
    id: string;
    name: string;
    isActive: boolean;
    sessions: Session[];
    isExpanded: boolean;
}

export default function WorkoutPlanner({ client_id }: { client_id: string }) {
    const [phases, setPhases] = useState<Phase[]>([
        {
            id: "phase-1",
            name: "Phase Bulking",
            isActive: false,
            isExpanded: true,
            sessions: [
                {
                    id: "session-1",
                    name: "Session 1: Back",
                    duration: 56,
                    isExpanded: true,
                    exercises: [
                        {
                            id: "ex-1",
                            order: "A1",
                            motion: "Upper Body Pull",
                            targetArea: "Back",
                            description: "Pull Up",
                        },
                        {
                            id: "ex-2",
                            order: "A2",
                            motion: "Upper Body Pull",
                            targetArea: "Back",
                            description: "Face Pull",
                        },
                        {
                            id: "ex-3",
                            order: "B1",
                            motion: "Upper Body Pull",
                            targetArea: "Back",
                            description: "Bent Over Row - Barbell",
                        },
                        {
                            id: "ex-4",
                            order: "B2",
                            motion: "Upper Body Pull",
                            targetArea: "Back",
                            description: "Bent Over Row - Dumbbell",
                        },
                        {
                            id: "ex-5",
                            order: "C1",
                            motion: "Upper Body Pull",
                            targetArea: "Biceps",
                            description: "EZ Bar Curl",
                        },
                        {
                            id: "ex-6",
                            order: "C2",
                            motion: "Upper Body Pull",
                            targetArea: "Biceps",
                            description: "Single Arm Cable Bicep Curls",
                        },
                        {
                            id: "ex-7",
                            order: "C3",
                            motion: "Upper Body Push",
                            targetArea: "Chest",
                            description: "Cable Chest Fly",
                        },
                    ],
                },
            ],
        },
    ]);

    useEffect(() => {
        async function getWorkout() {
            const plan = await getWorkoutPlanByClientId(client_id);
            const mapped = plan.map((phase) => ({
                id: phase.id,
                name: phase.name,
                isActive: phase.isActive,
                isExpanded: phase.isExpanded,
                sessions: phase.sessions.map((session) => ({
                    id: session.id,
                    name: session.name,
                    duration: session.duration ?? 0,
                    isExpanded: session.isExpanded,
                    exercises: session.exercises.map((e) => ({
                        id: e.id,
                        order: e.order,
                        motion: e.motion ?? "",
                        targetArea: e.targetArea ?? "",
                        description: e.description ?? "",
                    })),
                })),
            }));

            console.log(mapped);

            setPhases(mapped);
        }
        getWorkout();
    }, [client_id]);

    const addPhase = () => {
        const newPhase: Phase = {
            id: `phase-${phases.length + 1}`,
            name: `New Phase`,
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

    const togglePhaseActivation = (phaseId: string) => {
        setPhases(
            phases.map((phase) =>
                phase.id === phaseId
                    ? { ...phase, isActive: !phase.isActive }
                    : { ...phase, isActive: false }
            )
        );
    };

    const addSession = (phaseId: string) => {
        setPhases(
            phases.map((phase) => {
                if (phase.id !== phaseId) return phase;
                const count = phase.sessions.length + 1;
                const newSession: Session = {
                    id: `session-${Date.now()}`,
                    name: `Session ${count}: New`,
                    duration: 45,
                    isExpanded: true,
                    exercises: [],
                };
                return { ...phase, sessions: [...phase.sessions, newSession] };
            })
        );
    };

    const addExercise = (phaseId: string, sessionId: string) => {
        setPhases(
            phases.map((phase) => {
                if (phase.id !== phaseId) return phase;
                return {
                    ...phase,
                    sessions: phase.sessions.map((session) => {
                        if (session.id !== sessionId) return session;
                        const count = session.exercises.length;
                        const groups = ["A", "B", "C", "D", "E", "F"];
                        const group = groups[Math.floor(count / 3)];
                        const number = (count % 3) + 1;
                        const ex: Exercise = {
                            id: `ex-${Date.now()}`,
                            order: `${group}${number}`,
                            motion: "Select Motion",
                            targetArea: "Select Area",
                            description: "New Exercise",
                        };
                        return {
                            ...session,
                            exercises: [...session.exercises, ex],
                        };
                    }),
                };
            })
        );
    };

    const deletePhase = (phaseId: string) =>
        setPhases(phases.filter((phase) => phase.id !== phaseId));

    const deleteSession = (phaseId: string, sessionId: string) =>
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

    const deleteExercise = (
        phaseId: string,
        sessionId: string,
        exerciseId: string
    ) =>
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
                                        exercises: session.exercises.filter(
                                            (e) => e.id !== exerciseId
                                        ),
                                    }
                          ),
                      }
            )
        );

    const duplicatePhase = (phaseId: string) => {
        const target = phases.find((p) => p.id === phaseId);
        if (!target) return;
        const copy: Phase = {
            ...target,
            id: `phase-${Date.now()}`,
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
                    id: `session-${Date.now()}`,
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

    const [editingExercise, setEditingExercise] = useState<{
        phaseId: string;
        sessionId: string;
        exerciseId: string;
        exercise: Exercise;
    } | null>(null);
    const startEditExercise = (
        phaseId: string,
        sessionId: string,
        exercise: Exercise
    ) => {
        setEditingExercise({
            phaseId,
            sessionId,
            exerciseId: exercise.id,
            exercise,
        });
    };
    const saveExerciseEdit = () => {
        if (!editingExercise) return;
        setPhases(
            phases.map((phase) =>
                phase.id !== editingExercise.phaseId
                    ? phase
                    : {
                          ...phase,
                          sessions: phase.sessions.map((session) =>
                              session.id !== editingExercise.sessionId
                                  ? session
                                  : {
                                        ...session,
                                        exercises: session.exercises.map((e) =>
                                            e.id === editingExercise.exerciseId
                                                ? editingExercise.exercise
                                                : e
                                        ),
                                    }
                          ),
                      }
            )
        );
        setEditingExercise(null);
    };

    return (
        <div className="w-full max-w-6xl mx-auto rounded-lg shadow-sm border text-accent-foreground">
            <div className="w-full p-4">
                {client_id}
                <div className="mb-6">
                    <Button onClick={addPhase}>
                        <Plus className="h-4 w-4 mr-2" /> Add Phase
                    </Button>
                </div>

                {phases.map((phase) => (
                    <Card key={phase.id} className="mb-4">
                        <CardContent className="p-0">
                            <div className="flex items-center justify-between p-4 border-b">
                                <div className="flex items-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                            togglePhaseExpansion(phase.id)
                                        }
                                        className="p-1 h-auto mr-2"
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
                                                className="ml-2"
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
                                            startEditPhase(phase.id, phase.name)
                                        }
                                        className="h-8 w-8"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deletePhase(phase.id)}
                                        className="h-8 w-8"
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => duplicatePhase(phase.id)}
                                        className="h-8 w-8"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => addSession(phase.id)}
                                        className="h-8 w-8"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                    <div className="flex items-center ml-4">
                                        <Switch
                                            checked={phase.isActive}
                                            onCheckedChange={() =>
                                                togglePhaseActivation(phase.id)
                                            }
                                            id={`activate-${phase.id}`}
                                        />
                                        <Label
                                            htmlFor={`activate-${phase.id}`}
                                            className="ml-2"
                                        >
                                            Activate Phase
                                        </Label>
                                    </div>
                                </div>
                            </div>

                            {phase.isExpanded && (
                                <div className="p-4">
                                    {phase.sessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className="border rounded-md mb-4"
                                        >
                                            <div className="flex items-center justify-between p-3 bg-muted">
                                                <div className="flex items-center">
                                                    <GripVertical className="h-4 w-4 text-muted-foreground mr-2" />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            toggleSessionExpansion(
                                                                phase.id,
                                                                session.id
                                                            )
                                                        }
                                                        className="p-1 h-auto mr-2"
                                                    >
                                                        {session.isExpanded ? (
                                                            <ChevronDown className="h-5 w-5" />
                                                        ) : (
                                                            <ChevronUp className="h-5 w-5" />
                                                        )}
                                                    </Button>
                                                    {editingSession ===
                                                    session.id ? (
                                                        <div className="flex items-center">
                                                            <Input
                                                                value={
                                                                    editSessionValue
                                                                }
                                                                onChange={(e) =>
                                                                    setEditSessionValue(
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                                className="h-8 w-48"
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={
                                                                    saveSessionEdit
                                                                }
                                                                className="ml-2"
                                                            >
                                                                Save
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <span className="font-medium">
                                                            {session.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            startEditSession(
                                                                session.id,
                                                                session.name
                                                            )
                                                        }
                                                        className="h-8 w-8"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            deleteSession(
                                                                phase.id,
                                                                session.id
                                                            )
                                                        }
                                                        className="h-8 w-8"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            duplicateSession(
                                                                phase.id,
                                                                session.id
                                                            )
                                                        }
                                                        className="h-8 w-8"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            addExercise(
                                                                phase.id,
                                                                session.id
                                                            )
                                                        }
                                                        className="h-8 w-8"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                    >
                                                        <Clipboard className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        className="ml-4"
                                                    >
                                                        Start Session (
                                                        {session.duration} mins)
                                                    </Button>
                                                </div>
                                            </div>

                                            {session.isExpanded &&
                                                session.exercises.length >
                                                    0 && (
                                                    <div className="mt-2">
                                                        <Table>
                                                            <TableHeader className="bg-muted">
                                                                <TableRow>
                                                                    <TableHead className="w-[80px]">
                                                                        Order
                                                                    </TableHead>
                                                                    <TableHead>
                                                                        Motion
                                                                    </TableHead>
                                                                    <TableHead>
                                                                        Target
                                                                        Area
                                                                    </TableHead>
                                                                    <TableHead>
                                                                        Description
                                                                    </TableHead>
                                                                    <TableHead className="text-right">
                                                                        Actions
                                                                    </TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {session.exercises.map(
                                                                    (
                                                                        exercise
                                                                    ) => (
                                                                        <TableRow
                                                                            key={
                                                                                exercise.id
                                                                            }
                                                                        >
                                                                            <TableCell>
                                                                                {
                                                                                    exercise.order
                                                                                }
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {
                                                                                    exercise.motion
                                                                                }
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {
                                                                                    exercise.targetArea
                                                                                }
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {
                                                                                    exercise.description
                                                                                }
                                                                            </TableCell>
                                                                            <TableCell className="text-right">
                                                                                <div className="flex justify-end gap-1">
                                                                                    <Dialog>
                                                                                        <DialogTrigger
                                                                                            asChild
                                                                                        >
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                onClick={() =>
                                                                                                    startEditExercise(
                                                                                                        phase.id,
                                                                                                        session.id,
                                                                                                        exercise
                                                                                                    )
                                                                                                }
                                                                                                className="h-8 w-8"
                                                                                            >
                                                                                                <Edit className="h-4 w-4" />
                                                                                            </Button>
                                                                                        </DialogTrigger>
                                                                                        <DialogContent>
                                                                                            <DialogHeader>
                                                                                                <DialogTitle>
                                                                                                    Edit
                                                                                                    Exercise
                                                                                                </DialogTitle>
                                                                                            </DialogHeader>
                                                                                            {editingExercise && (
                                                                                                <div className="grid gap-4 py-4">
                                                                                                    {/* fields */}
                                                                                                </div>
                                                                                            )}
                                                                                            <DialogFooter>
                                                                                                <Button
                                                                                                    onClick={
                                                                                                        saveExerciseEdit
                                                                                                    }
                                                                                                >
                                                                                                    Save
                                                                                                    changes
                                                                                                </Button>
                                                                                            </DialogFooter>
                                                                                        </DialogContent>
                                                                                    </Dialog>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        onClick={() =>
                                                                                            deleteExercise(
                                                                                                phase.id,
                                                                                                session.id,
                                                                                                exercise.id
                                                                                            )
                                                                                        }
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
                                                )}
                                            {session.exercises.length === 0 && (
                                                <div className="text-center py-8 text-muted-foreground">
                                                    No exercises. Add one above.
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {phase.sessions.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No sessions added. Click + to add.
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
