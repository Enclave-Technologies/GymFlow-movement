"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Exercise } from "@/types/workout-tracker-types";

interface ExerciseCardProps {
  exercise: Exercise;
  onToggleExpansion: (exerciseId: string) => void;
  onUpdateSetValue: (
    exerciseId: string,
    setId: string,
    field: "reps" | "weight",
    value: string
  ) => void;
  onAddSet: (exerciseId: string) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onUpdateNotes: (exerciseId: string, notes: string) => void;
}

export function ExerciseCard({
  exercise,
  onToggleExpansion,
  onUpdateSetValue,
  onAddSet,
  onDeleteSet,
  onUpdateNotes,
}: ExerciseCardProps) {
  return (
    <div className="mb-6 bg-card bg-opacity-20 rounded-lg overflow-hidden shadow-md">
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => onToggleExpansion(exercise.id)}
      >
        <div className="flex items-center">
          <span className="mr-2 font-semibold">
            {exercise.setOrderMarker}.
          </span>
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
            <div className="text-xs text-muted-foreground">
              Tempo: {exercise.tempo}
            </div>
            <div className="text-xs text-muted-foreground">
              Rest between sets: {exercise.restTime}
            </div>
          </div>

          {/* Sets table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted bg-opacity-50">
                  <th className="py-2 px-4 text-left">SET</th>
                  <th className="py-2 px-4 text-left">REPS</th>
                  <th className="py-2 px-4 text-left">WEIGHT (KG)</th>
                  <th className="py-2 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {exercise.sets.map((set, index) => (
                  <tr key={set.id} className="border-b border-border">
                    <td className="py-2 px-4">{index + 1}</td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        className="w-16 bg-muted text-foreground p-1 rounded"
                        value={set.reps}
                        onChange={(e) =>
                          onUpdateSetValue(
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
                        className="w-16 bg-muted text-foreground p-1 rounded"
                        value={set.weight}
                        onChange={(e) =>
                          onUpdateSetValue(
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
                        className="bg-destructive text-destructive-foreground p-1 rounded w-7 h-7 flex items-center justify-center cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSet(exercise.id, set.id);
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
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 cursor-pointer"
              onClick={() => onAddSet(exercise.id)}
            >
              Add Set
            </Button>
          </div>

          <div className="mt-4">
            <Textarea
              placeholder="Notes"
              className="w-full min-h-[120px] bg-muted text-foreground border-border resize-none"
              value={exercise.notes}
              onChange={(e) => onUpdateNotes(exercise.id, e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
