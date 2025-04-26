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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, Copy, Edit, Plus, Trash2 } from "lucide-react";
import { getWorkoutPlanByClientId } from "@/actions/workout_plan_actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Exercise, Session, Phase } from "./types";
import DraggableSession from "./draggable-session";

export default function WorkoutPlanner({ client_id }: { client_id: string }) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [startingSessionId, setStartingSessionId] = useState<string | null>(
    null
  );
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<{
    phaseId: string;
    sessionId: string;
    exerciseId: string;
    exercise: Exercise;
    isNew: boolean;
  } | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function getWorkout() {
      setIsLoading(true);
      try {
        const plan = await getWorkoutPlanByClientId(client_id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = plan.map((phase: Record<string, any>) => ({
          id: phase.id,
          name: phase.name,
          isActive: phase.isActive,
          isExpanded: phase.isExpanded,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sessions: phase.sessions.map((session: Record<string, any>) => {
            // Map exercises with safe defaults
            const exercises = session.exercises.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (e: Record<string, any>) => {
                const exercise: Exercise = {
                  id: e.id,
                  order: e.order,
                  motion: e.motion ?? "",
                  targetArea: e.targetArea ?? "",
                  description: e.description ?? "",
                  // Include additional properties if they exist
                  ...(e.sets && { sets: e.sets }),
                  ...(e.reps && { reps: e.reps }),
                  ...(e.tut && { tut: e.tut }),
                  ...(e.tempo && { tempo: e.tempo }),
                  ...(e.rest && { rest: e.rest }),
                  ...(e.additionalInfo && { additionalInfo: e.additionalInfo }),
                  duration: 8, // Default duration
                };

                // Set the duration if available
                if (e.duration && typeof e.duration === "number") {
                  exercise.duration = e.duration;
                }

                return exercise;
              }
            );

            // Calculate total session duration
            const calculatedDuration = exercises.reduce(
              (total: number, ex: Exercise) => total + (ex.duration || 8),
              0
            );

            return {
              id: session.id,
              name: session.name,
              duration: calculatedDuration,
              isExpanded: Boolean(session.isExpanded),
              exercises,
            };
          }),
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
          duration: 0,
          isExpanded: true,
          exercises: [],
        };
        return { ...phase, sessions: [...phase.sessions, newSession] };
      })
    );
  };

  const addExercise = (phaseId: string, sessionId: string) => {
    console.log("addExercise", !!editingExercise);
    setEditingExercise({
      phaseId,
      sessionId,
      exerciseId: `new-${Date.now()}`,
      exercise: {
        id: `new-${Date.now()}`,
        order: "",
        motion: "",
        targetArea: "",
        description: "",
        duration: 8,
      },
      isNew: true,
    });
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
              sessions: phase.sessions.filter((s) => s.id !== sessionId),
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
          s.id === editingSession ? { ...s, name: editSessionValue } : s
        ),
      }))
    );
    setEditingSession(null);
  };

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
      isNew: false,
    });
  };
  const saveExerciseEdit = async () => {
    if (!editingExercise) return;

    // Validate form - at minimum we need order and description
    if (
      !editingExercise.exercise.order ||
      !editingExercise.exercise.description
    ) {
      return; // Show validation error in a real implementation
    }

    setIsSaving(true);
    try {
      // API call

      setPhases(
        phases.map((phase) =>
          phase.id !== editingExercise.phaseId
            ? phase
            : {
                ...phase,
                sessions: phase.sessions.map((session) => {
                  // Handle adding or updating exercise
                  const updatedExercises = editingExercise.isNew
                    ? [...session.exercises, editingExercise.exercise]
                    : session.exercises.map((e) =>
                        e.id === editingExercise.exerciseId
                          ? editingExercise.exercise
                          : e
                      );

                  // Recalculate session duration when exercises change
                  const totalDuration =
                    calculateSessionDuration(updatedExercises);

                  return session.id !== editingExercise.sessionId
                    ? session
                    : {
                        ...session,
                        exercises: updatedExercises,
                        duration: totalDuration,
                      };
                }),
              }
        )
      );

      // API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setEditingExercise(null);
    } catch (error) {
      console.error("Error saving exercise:", error);
      toast.error("Error saving exercise");
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate session duration based on exercises
  const calculateSessionDuration = (exercises: Exercise[]): number => {
    if (!exercises.length) return 0;

    return exercises.reduce(
      (total, exercise) => total + (exercise.duration || 8),
      0
    );
  };

  const handleExerciseFormChange = (field: keyof Exercise, value: string) => {
    if (!editingExercise) return;

    setEditingExercise({
      ...editingExercise,
      exercise: {
        ...editingExercise.exercise,
        [field]: value,
      },
    });
  };

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

  // Save a single session
  const saveSession = async (phaseId: string, sessionId: string) => {
    setSavingSessionId(sessionId);
    try {
      // API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      const phaseToSave = phases.find((p) => p.id === phaseId);
      const sessionToSave = phaseToSave?.sessions.find(
        (s) => s.id === sessionId
      );

      console.log("Saving session:", sessionToSave);
    } catch (error) {
      console.error("Error saving session:", error);
      toast.error("Error saving session");
    } finally {
      setSavingSessionId(null);
    }
  };

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

  const renderExercisesTable = (phase: Phase, session: Session) => (
    <div className="mt-2">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead className="w-[80px]">Order</TableHead>
            <TableHead>Motion</TableHead>
            <TableHead>Target Area</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Sets</TableHead>
            <TableHead>Reps</TableHead>
            <TableHead>TUT</TableHead>
            <TableHead>Tempo</TableHead>
            <TableHead>Rest</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {session.exercises.map((exercise: Exercise) => (
            <TableRow key={exercise.id}>
              <TableCell>{exercise.order}</TableCell>
              <TableCell>{exercise.motion}</TableCell>
              <TableCell>{exercise.targetArea}</TableCell>
              <TableCell>{exercise.description}</TableCell>
              <TableCell>{exercise.sets || "-"}</TableCell>
              <TableCell>{exercise.reps || "-"}</TableCell>
              <TableCell>{exercise.tut || "-"}</TableCell>
              <TableCell>{exercise.tempo || "-"}</TableCell>
              <TableCell>{exercise.rest || "-"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      startEditExercise(phase.id, session.id, exercise)
                    }
                    className="h-8 w-8 cursor-pointer"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      deleteExercise(phase.id, session.id, exercise.id)
                    }
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto rounded-lg shadow-sm border text-accent-foreground">
      <div className="w-full p-4">
        <div className="mb-6 flex items-start">
          <Button onClick={addPhase} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" /> Add Phase
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
                        onClick={() => togglePhaseExpansion(phase.id)}
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
                            onChange={(e) => setEditPhaseValue(e.target.value)}
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
                        onClick={() => startEditPhase(phase.id, phase.name)}
                        className="h-8 w-8 cursor-pointer"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePhase(phase.id)}
                        className="h-8 w-8 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => duplicatePhase(phase.id)}
                        className="h-8 w-8 cursor-pointer"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => addSession(phase.id)}
                        className="h-8 w-8 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center ml-4">
                        <div className="flex flex-col">
                          <div className="flex items-center">
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
                      {phase.sessions.map((session, index) => (
                        <DraggableSession
                          key={session.id}
                          phase={phase}
                          session={session}
                          index={index}
                          toggleSessionExpansion={toggleSessionExpansion}
                          deleteSession={deleteSession}
                          duplicateSession={duplicateSession}
                          addExercise={addExercise}
                          startSession={startSession}
                          saveSession={saveSession}
                          startingSessionId={startingSessionId}
                          savingSessionId={savingSessionId}
                          startEditSession={startEditSession}
                          moveSession={moveSession}
                          renderExercisesTable={renderExercisesTable}
                          editingSession={editingSession}
                          editSessionValue={editSessionValue}
                          saveSessionEdit={saveSessionEdit}
                          setEditSessionValue={setEditSessionValue}
                        />
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

      {/* Exercise Edit/Add Dialog */}
      <Dialog
        open={!!editingExercise}
        onOpenChange={(open) => !open && setEditingExercise(null)}
      >
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="text-center">
              {editingExercise?.isNew ? "Add Exercise" : "Edit Exercise"}
            </DialogTitle>
          </DialogHeader>
          {editingExercise && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="order">Order</Label>
                  <Input
                    id="order"
                    placeholder="A1, B1, etc."
                    value={editingExercise.exercise.order}
                    onChange={(e) =>
                      handleExerciseFormChange("order", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motion">Motion</Label>
                  <Select
                    value={editingExercise.exercise.motion}
                    onValueChange={(value) =>
                      handleExerciseFormChange("motion", value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Motion" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Upper Body Pull">
                        Upper Body Pull
                      </SelectItem>
                      <SelectItem value="Upper Body Push">
                        Upper Body Push
                      </SelectItem>
                      <SelectItem value="Lower Body Pull">
                        Lower Body Pull
                      </SelectItem>
                      <SelectItem value="Lower Body Push">
                        Lower Body Push
                      </SelectItem>
                      <SelectItem value="Core">Core</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetArea">Target Area</Label>
                  <Select
                    value={editingExercise.exercise.targetArea}
                    onValueChange={(value) =>
                      handleExerciseFormChange("targetArea", value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Target Area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Chest">Chest</SelectItem>
                      <SelectItem value="Back">Back</SelectItem>
                      <SelectItem value="Shoulders">Shoulders</SelectItem>
                      <SelectItem value="Biceps">Biceps</SelectItem>
                      <SelectItem value="Triceps">Triceps</SelectItem>
                      <SelectItem value="Legs">Legs</SelectItem>
                      <SelectItem value="Calves">Calves</SelectItem>
                      <SelectItem value="Abs">Abs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Select
                    value={editingExercise.exercise.description}
                    onValueChange={(value) =>
                      handleExerciseFormChange("description", value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Exercise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Chin Up">Chin Up</SelectItem>
                      <SelectItem value="Cable Dumbell">
                        Cable Dumbell
                      </SelectItem>
                      <SelectItem value="Inverted Row">Inverted Row</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4">
                <h3 className="text-sm font-medium mb-3">
                  Exercise Parameters
                </h3>
                <div className="grid grid-cols-5 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="sets">Sets</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="sets-min"
                        placeholder="Min"
                        className="w-20"
                        value={
                          editingExercise.exercise.sets?.split("-")[0] || ""
                        }
                        onChange={(e) => {
                          const max =
                            editingExercise.exercise.sets?.split("-")[1] || "";
                          handleExerciseFormChange(
                            "sets",
                            `${e.target.value}${max ? "-" + max : ""}`
                          );
                        }}
                      />
                      <span>-</span>
                      <Input
                        id="sets-max"
                        placeholder="Max"
                        className="w-20"
                        value={
                          editingExercise.exercise.sets?.split("-")[1] || ""
                        }
                        onChange={(e) => {
                          const min =
                            editingExercise.exercise.sets?.split("-")[0] || "";
                          handleExerciseFormChange(
                            "sets",
                            `${min ? min + "-" : ""}${e.target.value}`
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reps">Reps</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="reps-min"
                        placeholder="Min"
                        className="w-20"
                        value={
                          editingExercise.exercise.reps?.split("-")[0] || ""
                        }
                        onChange={(e) => {
                          const max =
                            editingExercise.exercise.reps?.split("-")[1] || "";
                          handleExerciseFormChange(
                            "reps",
                            `${e.target.value}${max ? "-" + max : ""}`
                          );
                        }}
                      />
                      <span>-</span>
                      <Input
                        id="reps-max"
                        placeholder="Max"
                        className="w-20"
                        value={
                          editingExercise.exercise.reps?.split("-")[1] || ""
                        }
                        onChange={(e) => {
                          const min =
                            editingExercise.exercise.reps?.split("-")[0] || "";
                          handleExerciseFormChange(
                            "reps",
                            `${min ? min + "-" : ""}${e.target.value}`
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tut">TUT</Label>
                    <Input
                      id="tut"
                      placeholder="Time under tension"
                      value={editingExercise.exercise.tut || ""}
                      onChange={(e) =>
                        handleExerciseFormChange("tut", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tempo">Tempo</Label>
                    <Input
                      id="tempo"
                      placeholder="E.g. 3-1-1"
                      value={editingExercise.exercise.tempo || ""}
                      onChange={(e) =>
                        handleExerciseFormChange("tempo", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rest">Rest</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="rest-min"
                        placeholder="Min"
                        className="w-20"
                        value={
                          editingExercise.exercise.rest?.split("-")[0] || ""
                        }
                        onChange={(e) => {
                          const max =
                            editingExercise.exercise.rest?.split("-")[1] || "";
                          handleExerciseFormChange(
                            "rest",
                            `${e.target.value}${max ? "-" + max : ""}`
                          );
                        }}
                      />
                      <span>-</span>
                      <Input
                        id="rest-max"
                        placeholder="Max"
                        className="w-20"
                        value={
                          editingExercise.exercise.rest?.split("-")[1] || ""
                        }
                        onChange={(e) => {
                          const min =
                            editingExercise.exercise.rest?.split("-")[0] || "";
                          handleExerciseFormChange(
                            "rest",
                            `${min ? min + "-" : ""}${e.target.value}`
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalInfo">Additional Information</Label>
                <Input
                  id="additionalInfo"
                  placeholder="Additional notes for this exercise"
                  value={editingExercise.exercise.additionalInfo || ""}
                  onChange={(e) =>
                    handleExerciseFormChange("additionalInfo", e.target.value)
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingExercise(null)}>
              Cancel
            </Button>
            <Button onClick={saveExerciseEdit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="h-4 w-4 mr-2 rounded-full border-2 border-background border-t-transparent animate-spin"></div>
                  Please wait...
                </>
              ) : editingExercise?.isNew ? (
                "Add Exercise"
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
