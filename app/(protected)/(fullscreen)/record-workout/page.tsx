"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ExerciseSet {
  id: number;
  reps: string;
  weight: string;
  completed?: boolean;
}

interface Exercise {
  id: string;
  name: string;
  order: string;
  sets: ExerciseSet[];
  setRange: string;
  repRange: string;
  tempo: string;
  restTime: string;
  notes: string;
  isExpanded: boolean;
}

const RecordWorkoutPage = () => {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const phaseId = searchParams.get("phaseId");
  const clientId = searchParams.get("clientId");

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [phaseName] = useState("Untitled Phase");
  const [sessionName] = useState("Untitled Session");
  const [timer, setTimer] = useState("00:00");
  const [isQuitDialogOpen, setIsQuitDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // using the sessionId, phaseId, and clientId - fetch the workout plan dummy data
    const dummyExercises: Exercise[] = [
      {
        id: "ex1",
        name: "Floor Dumbbell Chest Fly",
        order: "1",
        sets: [
          { id: 1, reps: "0", weight: "0" },
          { id: 2, reps: "0", weight: "0" },
          { id: 3, reps: "0", weight: "0" },
        ],
        setRange: "3-5",
        repRange: "8-12",
        tempo: "3 0 1 0",
        restTime: "45 - 60 seconds",
        notes: "",
        isExpanded: true,
      },
      {
        id: "ex2",
        name: "Cable Chest Press",
        order: "3",
        sets: [
          { id: 1, reps: "0", weight: "0" },
          { id: 2, reps: "0", weight: "0" },
          { id: 3, reps: "0", weight: "0" },
        ],
        setRange: "3-5",
        repRange: "8-12",
        tempo: "3 0 1 0",
        restTime: "45 - 60 seconds",
        notes: "",
        isExpanded: false,
      },
    ];

    setExercises(dummyExercises);

    // Timer timer
    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const minutes = Math.floor(elapsedTime / 60000);
      const seconds = Math.floor((elapsedTime % 60000) / 1000);
      setTimer(
        `${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [sessionId, phaseId, clientId]);

  const toggleExerciseExpansion = (exerciseId: string) => {
    setExercises(
      exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, isExpanded: !ex.isExpanded } : ex
      )
    );
  };

  const updateSetValue = (
    exerciseId: string,
    setId: number,
    field: "reps" | "weight",
    value: string
  ) => {
    setExercises(
      exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((set) =>
                set.id === setId ? { ...set, [field]: value } : set
              ),
            }
          : ex
      )
    );
  };

  const addSet = (exerciseId: string) => {
    setExercises(
      exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: [
                ...ex.sets,
                { id: ex.sets.length + 1, reps: "0", weight: "0" },
              ],
            }
          : ex
      )
    );
  };

  const updateNotes = (exerciseId: string, notes: string) => {
    setExercises(
      exercises.map((ex) => (ex.id === exerciseId ? { ...ex, notes } : ex))
    );
  };

  const deleteSet = (exerciseId: string, setId: number) => {
    setExercises(
      exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.filter((set) => set.id !== setId),
            }
          : ex
      )
    );
  };

  const openQuitDialog = () => {
    setIsQuitDialogOpen(true);
  };

  const handleQuitWithoutSaving = () => {
    window.history.back();
  };

  const handleSaveAndQuit = async () => {
    setIsSaving(true);
    try {
      // API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      window.history.back();
    } catch (error) {
      console.error("Error saving workout:", error);
      toast.error("Error saving workout");
    } finally {
      setIsSaving(false);
      setIsQuitDialogOpen(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // API call
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (error) {
      console.error("Error saving workout:", error);
      toast.error("Error saving workout");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-900 text-white">
      <header className="flex justify-between items-center p-4 bg-green-950 border-b border-green-800">
        <Button
          variant="destructive"
          className="bg-red-500 hover:bg-red-600 cursor-pointer"
          onClick={openQuitDialog}
        >
          <span className="mr-2">⬅</span> Quit
        </Button>
        <div className="text-center">
          <h1 className="text-xl font-bold">{phaseName}</h1>
          <h2 className="text-lg">{sessionName}</h2>
          <div className="text-xl">{timer}</div>
        </div>
        <Button
          variant="outline"
          className="text-white border-white hover:bg-green-800 cursor-pointer"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <div className="h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              Please wait...
            </>
          ) : (
            "Save"
          )}
        </Button>
      </header>

      <div className="container mx-auto p-4 max-w-4xl">
        {exercises.map((exercise) => (
          <div
            key={exercise.id}
            className="mb-6 bg-black bg-opacity-20 rounded-lg overflow-hidden shadow-md"
          >
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => toggleExerciseExpansion(exercise.id)}
            >
              <div className="flex items-center">
                <span className="mr-2">{exercise.order}.</span>
                <h3 className="text-lg font-medium">{exercise.name}</h3>
              </div>
              <div>
                {exercise.isExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </div>

            {exercise.isExpanded && (
              <div className="px-4 pb-4">
                <div className="text-sm mb-2">
                  {exercise.setRange} Sets Of {exercise.repRange} Reps
                </div>

                <div className="mb-4">
                  <div className="text-xs text-gray-300">
                    Tempo: {exercise.tempo}
                  </div>
                  <div className="text-xs text-gray-300">
                    Rest between sets: {exercise.restTime}
                  </div>
                </div>

                {/* Sets table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800 bg-opacity-50">
                        <th className="py-2 px-4 text-left">SET</th>
                        <th className="py-2 px-4 text-left">REPS</th>
                        <th className="py-2 px-4 text-left">WEIGHT (KG)</th>
                        <th className="py-2 px-4 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {exercise.sets.map((set) => (
                        <tr key={set.id} className="border-b border-gray-700">
                          <td className="py-2 px-4">{set.id}</td>
                          <td className="py-2 px-4">
                            <input
                              type="number"
                              className="w-16 bg-gray-800 text-white p-1 rounded"
                              value={set.reps}
                              onChange={(e) =>
                                updateSetValue(
                                  exercise.id,
                                  set.id,
                                  "reps",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td className="py-2 px-4">
                            <input
                              type="number"
                              className="w-16 bg-gray-800 text-white p-1 rounded"
                              value={set.weight}
                              onChange={(e) =>
                                updateSetValue(
                                  exercise.id,
                                  set.id,
                                  "weight",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td className="py-2 px-4 text-right">
                            <button
                              className="bg-red-600 text-white p-1 rounded w-7 h-7 flex items-center justify-center cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSet(exercise.id, set.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    className="w-full bg-green-800 hover:bg-green-700 text-white border-0 cursor-pointer"
                    onClick={() => addSet(exercise.id)}
                  >
                    Add Set
                  </Button>
                </div>

                <div className="mt-4">
                  <Textarea
                    placeholder="Notes"
                    className="w-full min-h-[120px] bg-gray-800 text-white border-gray-700 resize-none"
                    value={exercise.notes}
                    onChange={(e) => updateNotes(exercise.id, e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quit Confirmation Modal */}
      <Dialog open={isQuitDialogOpen} onOpenChange={setIsQuitDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl">End Workout Session?</DialogTitle>
            <DialogDescription className="text-gray-300">
              Choose an option for this workout session.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-row items-end justify-end gap-4 py-4">
            <Button
              variant="destructive"
              className="text-base cursor-pointer"
              onClick={handleQuitWithoutSaving}
            >
              Exit Without Saving
            </Button>

            <Button
              variant="default"
              className="bg-green-700 hover:bg-green-600 text-base cursor-pointer"
              onClick={handleSaveAndQuit}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  Please wait...
                </>
              ) : (
                "Save & Exit"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecordWorkoutPage;
