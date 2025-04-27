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
import {
    ChevronDown,
    ChevronUp,
    Copy,
    Edit,
    Loader,
    Plus,
    Save,
    Trash2,
} from "lucide-react";
import {
    getWorkoutPlanByClientId,
    updateWorkoutPlan,
    updatePhaseActivation,
    createWorkoutPlan,
} from "@/actions/workout_plan_actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Exercise, Session, Phase } from "./types";

// Define the response type from getWorkoutPlanByClientId
type WorkoutPlanResponse = {
    planId: string;
    updatedAt: Date;
    phases: Array<{
        id: string;
        name: string;
        isActive: boolean;
        isExpanded: boolean;
        sessions: Array<{
            id: string;
            name: string;
            duration: number | null;
            isExpanded: boolean;
            exercises: Array<{
                id: string;
                order: string;
                motion: string | null;
                targetArea: string | null;
                description: string | null;
                duration?: number;
                sets?: string;
                reps?: string;
                tut?: string;
                tempo?: string;
                rest?: string;
                additionalInfo?: string;
                setsMin?: string;
                setsMax?: string;
                repsMin?: string;
                repsMax?: string;
                restMin?: string;
                restMax?: string;
            }>;
        }>;
    }>;
};
import DraggableSession from "./draggable-session";
import ExerciseTableInline from "./ExerciseTableInline";
import { TooltipContent, Tooltip, TooltipTrigger } from "../ui/tooltip";
import type { SelectExercise } from "@/db/schemas";

type WorkoutPlannerProps = {
    client_id: string;
    exercises: SelectExercise[];
};

export default function WorkoutPlanner({
    client_id,
    exercises,
}: WorkoutPlannerProps) {
    // ===== UI State =====
    const [phases, setPhases] = useState<Phase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setSaving] = useState(false); // Used in saveAll and togglePhaseActivation
    const [planId, setPlanId] = useState<string | null>(null);
    const [lastKnownUpdatedAt, setLastKnownUpdatedAt] = useState<Date | null>(
        null
    );
    const [conflictError, setConflictError] = useState<{
        message: string;
        serverTime: Date;
    } | null>(null); // Used for conflict detection
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

    // ===== Router =====
    const router = useRouter();

    // ===== Data Fetching =====
    useEffect(() => {
        async function getWorkout() {
            setIsLoading(true);
            try {
                const response = await getWorkoutPlanByClientId(client_id);
                console.log("Fetched workout plan (raw):", response);

                // If no plan exists yet or empty array is returned
                if (
                    !response ||
                    (Array.isArray(response) && response.length === 0)
                ) {
                    setPhases([]);
                    return;
                }

                // Store the plan ID and last updated timestamp for concurrency control
                if ("planId" in response && "updatedAt" in response) {
                    setPlanId(response.planId);
                    setLastKnownUpdatedAt(new Date(response.updatedAt));
                }

                // Map the phases from the response
                const mapped = (response as WorkoutPlanResponse).phases.map(
                    (phase) => ({
                        id: phase.id,
                        name: phase.name,
                        isActive: phase.isActive,
                        isExpanded: phase.isExpanded,
                        sessions: phase.sessions.map((session) => {
                            // Map exercises with safe defaults and include all fields
                            const exercises = session.exercises?.map((e) => {
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
                                    duration:
                                        typeof e.duration === "number"
                                            ? e.duration
                                            : 8,
                                    // Include all possible fields from Exercise interface
                                    sets: e.sets ?? "",
                                    reps: e.reps ?? "",
                                    tut: e.tut ?? "",
                                    tempo: e.tempo ?? "",
                                    rest: e.rest ?? "",
                                    additionalInfo: e.additionalInfo ?? "",
                                    setsMin: e.setsMin ?? "",
                                    setsMax: e.setsMax ?? "",
                                    repsMin: e.repsMin ?? "",
                                    repsMax: e.repsMax ?? "",
                                    restMin: e.restMin ?? "",
                                    restMax: e.restMax ?? "",
                                    // Map additionalInfo to customizations for backend
                                    customizations: e.additionalInfo ?? "",
                                };

                                return exercise;
                            });

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
                        }),
                    })
                );

                console.log(
                    "Mapped workout plan (frontend structure):",
                    mapped
                );
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

    // ===== Global Save =====
    const saveAll = async () => {
        // Log the current state to the console
        console.log("Saving workout plan (current state):", phases);

        // Set saving state
        setSaving(true);

        try {
            let result;

            if (!planId || !lastKnownUpdatedAt) {
                // Create a new plan if no planId exists
                result = await createWorkoutPlan(client_id, {
                    phases,
                });

                // Update local state with the new plan ID and timestamp
                if (result.success && result.planId && result.updatedAt) {
                    setPlanId(result.planId);
                    setLastKnownUpdatedAt(new Date(result.updatedAt));
                }
            } else {
                // Update existing plan
                result = await updateWorkoutPlan(planId, lastKnownUpdatedAt, {
                    phases,
                });
            }

            if (result.success) {
                toast.success("All changes saved successfully");
                setHasUnsavedChanges(false);
                // Clear any previous conflict errors
                setConflictError(null);
                
                // Force a refetch of the workout plan to ensure we have the latest data
                const refetchWorkout = async () => {
                    try {
                        const response = await getWorkoutPlanByClientId(client_id);
                        if (response && "planId" in response && "updatedAt" in response) {
                            setPlanId(response.planId);
                            setLastKnownUpdatedAt(new Date(response.updatedAt));
                            
                            // Map the phases from the response
                            const mapped = (response as WorkoutPlanResponse).phases.map(
                                // ... (same mapping logic as in the useEffect)
                                (phase) => ({
                                    id: phase.id,
                                    name: phase.name,
                                    isActive: phase.isActive,
                                    isExpanded: phase.isExpanded,
                                    sessions: phase.sessions.map((session) => {
                                        // Map exercises with safe defaults and include all fields
                                        const exercises = session.exercises?.map((e) => {
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
                                                duration:
                                                    typeof e.duration === "number"
                                                        ? e.duration
                                                        : 8,
                                                // Include all possible fields from Exercise interface
                                                sets: e.sets ?? "",
                                                reps: e.reps ?? "",
                                                tut: e.tut ?? "",
                                                tempo: e.tempo ?? "",
                                                rest: e.rest ?? "",
                                                additionalInfo: e.additionalInfo ?? "",
                                                setsMin: e.setsMin ?? "",
                                                setsMax: e.setsMax ?? "",
                                                repsMin: e.repsMin ?? "",
                                                repsMax: e.repsMax ?? "",
                                                restMin: e.restMin ?? "",
                                                restMax: e.restMax ?? "",
                                                // Map additionalInfo to customizations for backend
                                                customizations: e.additionalInfo ?? "",
                                            };

                                            return exercise;
                                        });

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
                                    }),
                                })
                            );
                            
                            setPhases(mapped);
                        }
                    } catch (error) {
                        console.error("Error refetching workout plan:", error);
                    }
                };
                
                refetchWorkout();
            } else {
                // Handle errors
                if (result.conflict) {
                    // Handle conflict - another user has modified the plan
                    setConflictError({
                        message:
                            result.error ||
                            "Plan has been modified by another user",
                        serverTime: new Date(result.serverUpdatedAt!),
                    });
                    toast.error(
                        "Conflict detected: Plan has been modified by another user"
                    );
                } else {
                    // Handle other errors
                    toast.error(result.error || "Failed to save changes");
                }
            }
        } catch (error) {
            console.error("Error saving workout plan:", error);
            toast.error("An error occurred while saving");
        } finally {
            setSaving(false);
        }
    };

    // ===== Phase CRUD =====
    const addPhase = () => {
        const newPhase: Phase = {
            id: uuidv4(),
            name: `Untitled Phase`,
            isActive: false,
            isExpanded: true,
            sessions: [],
        };
        setPhases([...phases, newPhase]);
        setHasUnsavedChanges(true);
    };

    const togglePhaseExpansion = (phaseId: string) => {
        setPhases(
            phases.map((phase) =>
                phase.id === phaseId
                    ? { ...phase, isExpanded: !phase.isExpanded }
                    : phase
            )
        );
        setHasUnsavedChanges(true);
    };

    const togglePhaseActivation = async (phaseId: string) => {
        // Get the new active state (opposite of current)
        const isActive = !phases.find((p) => p.id === phaseId)?.isActive;

        // Optimistically update the UI
        setPhases(
            phases.map((phase) =>
                phase.id === phaseId
                    ? { ...phase, isActive }
                    : { ...phase, isActive: false }
            )
        );

        // Set saving state
        setSaving(true);

        try {
            // Call the backend to update the phase activation
            const result = await updatePhaseActivation(
                phaseId,
                isActive,
                lastKnownUpdatedAt || undefined
            );

            if (result.success) {
                toast.success(
                    `Phase ${
                        isActive ? "activated" : "deactivated"
                    } successfully`
                );
                setHasUnsavedChanges(false);
                // Clear any previous conflict errors
                setConflictError(null);

                // If we have a planId, update the lastKnownUpdatedAt
                if (result.serverUpdatedAt) {
                    setLastKnownUpdatedAt(new Date(result.serverUpdatedAt));
                }
            } else {
                // Handle errors
                if (result.conflict) {
                    // Handle conflict - another user has modified the plan
                    setConflictError({
                        message:
                            result.error ||
                            "Plan has been modified by another user",
                        serverTime: new Date(result.serverUpdatedAt!),
                    });
                    toast.error(
                        "Conflict detected: Plan has been modified by another user"
                    );

                    // Revert the optimistic update
                    // We should refetch the plan here, but for simplicity we'll just revert the local state
                    setPhases(
                        phases.map((phase) =>
                            phase.id === phaseId
                                ? { ...phase, isActive: !isActive }
                                : phase
                        )
                    );
                } else {
                    // Handle other errors
                    toast.error(
                        result.error
                            ? String(result.error)
                            : "Failed to update phase"
                    );

                    // Revert the optimistic update
                    setPhases(
                        phases.map((phase) =>
                            phase.id === phaseId
                                ? { ...phase, isActive: !isActive }
                                : phase
                        )
                    );
                }
            }
        } catch (error) {
            console.error("Error updating phase activation:", error);
            toast.error("An error occurred while updating phase");

            // Revert the optimistic update
            setPhases(
                phases.map((phase) =>
                    phase.id === phaseId
                        ? { ...phase, isActive: !isActive }
                        : phase
                )
            );
        } finally {
            setSaving(false);
        }
    };

    const deletePhase = (phaseId: string) =>
        setShowConfirm({ type: "phase", phaseId });
    const confirmDeletePhase = (phaseId: string) => {
        setPhases(phases.filter((phase) => phase.id !== phaseId));
        setShowConfirm({ type: null });
        setHasUnsavedChanges(true);
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
        setHasUnsavedChanges(true);
    };

    // ===== Session CRUD =====
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
        setHasUnsavedChanges(true);
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
        setHasUnsavedChanges(true);
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
        setHasUnsavedChanges(true);
    };

    // ===== Exercise CRUD =====
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
        setHasUnsavedChanges(true);
    };

    // Reset the editingExercise state after the exercise has been saved or cancelled
    const handleExerciseEditEnd = () => {
        setEditingExercise(null);
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
        setHasUnsavedChanges(true);
    };

    // ===== Phase/Session/Exercise Editing State =====
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
        setHasUnsavedChanges(true);
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
        setHasUnsavedChanges(true);
    };

    // Exercise editing is now handled by the ExerciseTableInline component

    // ===== Utility Functions =====
    // Calculate session duration based on exercises
    const calculateSessionDuration = (exercises: Exercise[]): number => {
        if (!exercises.length) return 0;

        return exercises.reduce(
            (total, exercise) => total + (exercise.duration || 8),
            0
        );
    };

    // Exercise form handling is now in ExerciseTableInline component

    // ===== Session Actions =====
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

    // ===== Render Helpers =====
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
                exercises={exercises}
                setHasUnsavedChanges={setHasUnsavedChanges}
            />
        );
    };

    return (
        <div className="w-full max-w-6xl mx-auto rounded-lg text-accent-foreground bg-card">
            <div className="w-full p-2">
                <div className="mb-2 flex items-center gap-2">
                    {/* Add Phase Button with Tooltip */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={addPhase}
                                className="cursor-pointer"
                            >
                                <Plus className="h-4 w-4 mr-2" /> Add Phase
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add a new phase</TooltipContent>
                    </Tooltip>
                    {/* Save All Button with Tooltip */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={saveAll}
                                className="cursor-pointer"
                            >
                                <Save className="h-4 w-4 mr-2" /> Save All
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Save all changes</TooltipContent>
                    </Tooltip>
                    {hasUnsavedChanges && (
                        <span className="ml-2 text-yellow-600 font-medium text-sm">
                            * You have unsaved changes
                        </span>
                    )}
                    {isSaving && (
                        <span className="ml-2 text-blue-600 font-medium text-sm flex items-center">
                            <Loader className="animate-spin h-4 w-4 mr-1" />
                            Saving...
                        </span>
                    )}
                    {conflictError && (
                        <span className="ml-2 text-red-600 font-medium text-sm">
                            * {conflictError.message}
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center">
                            {/* Updated: Use Lucide Loader icon for loading spinner */}
                            <Loader className="animate-spin h-8 w-8 text-primary" />
                            <p className="mt-4 text-sm text-muted-foreground">
                                Please wait...
                            </p>
                        </div>
                    </div>
                ) : phases.length > 0 ? (
                    <DndProvider backend={HTML5Backend}>
                        {phases.map((phase) => (
                            <Card
                                key={phase.id}
                                className="mb-4 shadow-none bg-background py-2"
                            >
                                <CardContent className="p-0">
                                    {/* Phase Header with distinct background */}
                                    <div className="flex items-center justify-between pl-4 pr-5 bg-muted rounded-md">
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
                                            {/* Edit Phase */}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
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
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Edit Phase Name
                                                </TooltipContent>
                                            </Tooltip>
                                            {/* Delete Phase */}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            deletePhase(
                                                                phase.id
                                                            )
                                                        }
                                                        className="h-8 w-8 cursor-pointer"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Delete Phase
                                                </TooltipContent>
                                            </Tooltip>
                                            {/* Duplicate Phase */}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            duplicatePhase(
                                                                phase.id
                                                            )
                                                        }
                                                        className="h-8 w-8 cursor-pointer"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Duplicate Phase
                                                </TooltipContent>
                                            </Tooltip>
                                            {/* Add Session */}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
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
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Add Session
                                                </TooltipContent>
                                            </Tooltip>
                                            {/* Activate/Deactivate Phase */}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
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
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {phase.isActive
                                                        ? "Deactivate this phase"
                                                        : "Activate this phase"}
                                                </TooltipContent>
                                            </Tooltip>
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
