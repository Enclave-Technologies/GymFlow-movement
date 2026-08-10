"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ChevronDown, ChevronUp, Trash2, Plus, ArrowLeftRight } from "lucide-react";
import { Exercise, ExerciseSet } from "@/types/workout-tracker-types";
import React, { useEffect, useState } from "react";
import { SelectExercise } from "@/db/schemas";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import ExerciseDropdown from "../workout-planning/UI-components/exercise-table/ExerciseDropdown";

interface PastSessionDetails {
    id: string;
    exerciseName: string;
    sets: number;
    reps: number;
    weight: number;
    notes: string;
    setOrderMarker: string;
    entryTime: string | null;
}

interface EnhancedExerciseCardProps {
    exercise: Exercise;
    onToggleExpansion: (exerciseId: string) => void;
    onUpdateSetValue: (
        exerciseId: string,
        setId: string,
        field: "reps" | "weight" | "notes",
        value: string
    ) => void;
    onAddSet: (exerciseId: string) => void;
    onDeleteSet: (exerciseId: string, setId: string) => void;
    onDeleteExercise: (exerciseId: string) => void;
    pastSessionDetails: PastSessionDetails[][];
    onReplaceExercise: (exerciseId: string, exercise: Exercise) => void;
    allExercises: SelectExercise[];
}

function UnMemoizedEnhancedExerciseCard({
    exercise,
    onToggleExpansion,
    onUpdateSetValue,
    onAddSet,
    onDeleteSet,
    onDeleteExercise,
    onReplaceExercise,
    pastSessionDetails,
    allExercises
}: EnhancedExerciseCardProps) {
    // Calculate max reps for input validation only
    const [currentExerciseInstances, setCurrentExerciseInstances] = useState<PastSessionDetails[][]>([]);
    const maxReps =
        parseInt(exercise.repRange.split("-")[1] || exercise.repRange) || 12;

    useEffect(()=>{
        const currentExerciseInstances = pastSessionDetails.map((entry: PastSessionDetails[]) => {
            return entry.filter((sessionDetail)=>sessionDetail.exerciseName === exercise.name);
        })
        setCurrentExerciseInstances(currentExerciseInstances);
    },[pastSessionDetails, exercise]);

    return (
        <div className="flex flex-row w-full gap-4">
            <div className="w-full mb-2 bg-card rounded-lg overflow-hidden shadow-md border border-border">
                {/* Exercise Header */}
                <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onToggleExpansion(exercise.id)}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">
                            {exercise.setOrderMarker}
                        </span>
                        <div>
                            <h3 className="text-lg font-semibold">
                                {exercise.name}
                            </h3>
                            <div className="text-sm text-muted-foreground">
                                {exercise.setRange} Sets × {exercise.repRange} Reps
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            {exercise.sets.filter((s) => s.reps && s.weight).length}
                            /{exercise.sets.length} completed
                        </span>
                        {exercise.isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                        ) : (
                            <ChevronDown className="h-5 w-5" />
                        )}
                    </div>
                </div>

                {exercise.isExpanded && (
                    <ExerciseExpanded 
                        exercise={exercise} 
                        onAddSet={onAddSet} 
                        maxReps={maxReps} 
                        onUpdateSetValue={onUpdateSetValue} 
                        onDeleteExercise={onDeleteExercise} 
                        onDeleteSet={onDeleteSet}
                        currentExerciseInstances={currentExerciseInstances}
                        onReplaceExercise={onReplaceExercise}
                        allExercises={allExercises}
                    />
                )}
            </div>
        </div>
    );
}

const ExerciseExpanded = ({exercise, onAddSet, maxReps, onUpdateSetValue, onDeleteSet, currentExerciseInstances, onDeleteExercise, onReplaceExercise, allExercises}: {   
    exercise: Exercise;
    onUpdateSetValue: (
        exerciseId: string,
        setId: string,
        field: "reps" | "weight" | "notes",
        value: string
    ) => void;
    onAddSet: (exerciseId: string) => void;
    onDeleteSet: (exerciseId: string, setId: string) => void;
    onDeleteExercise: (exerciseId: string) => void;
    maxReps: number;
    currentExerciseInstances:PastSessionDetails[][];
    onReplaceExercise: (exerciseId: string, exercise: Exercise) => void;
    allExercises: SelectExercise[];
    }) => {

    const today = new Date();
    const day = getDayWithOrdinal(today.getDate());
    const month = today.toLocaleString('default', { month: 'long' });
    const year = today.getFullYear();
    const dayOfWeek = today.toLocaleString('default', { weekday: 'long' });

    const formattedDate = `${day} ${month} ${year} - ${dayOfWeek}`;

    // Example output: "21st August 2025 - Thursday"

    // Group Current Exercises
    const sessionsGroupedByDate = groupByDate(currentExerciseInstances);
    return (
        <div className="border-t border-border">
            {/* Exercise Details */}
            <div className="p-4 bg-muted/20">
                <div className="flex flex-row items-center justify-between">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">
                                Tempo:
                            </span>
                            <span className="ml-2 font-medium">
                                {exercise.tempo}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                Rest:
                            </span>
                            <span className="ml-2 font-medium">
                                {exercise.restTime}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                Target Sets:
                            </span>
                            <span className="ml-2 font-medium">
                                {exercise.setRange}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                Target Reps:
                            </span>
                            <span className="ml-2 font-medium">
                                {exercise.repRange}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-row">
                        <ReplaceExerciseSheet onReplaceExercise={onReplaceExercise} allExercises={allExercises} currentExercise={exercise}/>
                        <div className="cursor-pointer" onClick={()=>{
                            onDeleteExercise(exercise.id);
                        }}>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer h-10 w-10 p-0"
                                onClick={() => {/*onDeleteExercise()*/}}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Customizations - Full width if present */}
                {exercise.customizations &&
                    exercise.customizations.trim() && (
                        <div className="mt-3 pt-3 border-t border-border">
                            <div className="text-sm">
                                <span className="text-muted-foreground">
                                    Customizations:
                                </span>
                                <div className="mt-1 text-foreground font-medium">
                                    {exercise.customizations}
                                </div>
                            </div>
                        </div>
                    )}
            </div>

            {/* Sets Recording Table */}
            <div className="p-4">
                <div className="flex flex-row gap-2 overflow-x-auto">
                    <div className="flex flex-col w-auto border-[0.2px] border-gray-300 p-4">
                        <div className="flex flex-row justify-between items-center">
                            <h3>{formattedDate}</h3>
                            <div className="w-3 h-3 bg-green-400 rounded-full"/>
                        </div>
                        <div className="flex flex-row">
                            <EntryTable exercise={exercise.sets} isEditable={true} maxReps={maxReps} onUpdateSetValue={onUpdateSetValue} onDeleteSet={onDeleteSet} exerciseId={exercise.id} onAddSet={onAddSet}/>
                        </div>
                    </div>
                    {Object.entries(sessionsGroupedByDate).length > 0 ?
                        Object.entries(sessionsGroupedByDate).map(([date, sets], index) => <ExerciseInstancesInPastWorkouts key={index} date={date} sets={sets}/>): 
                        <div className="flex flex-col items-center justify-center w-auto p-4">
                            <p className="text-primary">No Workout History Available for this Exercise</p>
                        </div>
                    }
                </div>
            </div>
        </div>
    )
};

const ExerciseInstancesInPastWorkouts = ({sets, date}: {sets: PastSessionDetails[], date: string}) => {
    return (
        <div className="flex flex-col w-auto border-[0.2px] border-gray-300 p-4">
            <h3>{date}</h3>
            <div className="flex flex-row overflow-x-auto">
                <EntryTable exercise={sets.sort((a,b) => a.entryTime && b.entryTime ? new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime() : 0)} isEditable={false} />
            </div>
        </div>
    )
};

const EntryTable = ({
        exercise, 
        isEditable, 
        maxReps, 
        onUpdateSetValue, 
        onDeleteSet, 
        exerciseId,
        onAddSet
    } : {
        exercise: PastSessionDetails[] | ExerciseSet[], 
        isEditable:boolean, 
        maxReps?:number, 
        onUpdateSetValue?: (
            exerciseId: string,
            setId: string,
            field: "reps" | "weight" | "notes",
            value: string
        ) => void, 
        onDeleteSet?: (exerciseId: string, setId: string) => void,
        exerciseId?: string
        onAddSet?: (exerciseId: string) => void;
    }) => {
    return (
        <div className="w-full">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">
                            SET
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">
                            REPS
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground min-w-28">
                            WEIGHT (KG)
                        </th>
                        <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">
                            NOTES
                        </th>
                        {isEditable && <th className="text-right py-3 px-2 text-sm font-semibold text-muted-foreground">
                            ACTION
                        </th>}
                    </tr>
                </thead>
                <tbody>
                    {/* Render ONLY existing sets - no empty rows, no filling up */}
                    {exercise.map((set: PastSessionDetails | ExerciseSet, index: number) => {
                        const setNumber = index + 1;
                        return (
                            <tr
                                key={set.id}
                                className="border-b border-border hover:bg-muted/30 transition-colors"
                            >
                                <td className="py-3 px-2">
                                    <span className="font-medium text-primary">
                                        {setNumber}
                                    </span>
                                </td>
                                <td className="py-3 px-2">
                                    {exerciseId && isEditable && maxReps && onUpdateSetValue ? 
                                    <Input
                                            type="number"
                                            min="0"
                                            max={maxReps * 2}
                                            className="w-20 h-10"
                                            value={set.reps || ""}
                                            onChange={(e) => {
                                                onUpdateSetValue(
                                                    exerciseId,
                                                    set.id,
                                                    "reps",
                                                    e.target.value
                                                );
                                            }}
                                            placeholder="0"
                                        />
                                    : <span className="font-medium text-primary">
                                        {set.reps}
                                    </span>
                                    }
                                </td>
                                <td className="py-3 px-2">
                                    {exerciseId && isEditable && maxReps && onUpdateSetValue ? 
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        className="w-24 h-10"
                                        value={set.weight || ""}
                                        onChange={(e) => {
                                            onUpdateSetValue(
                                                exerciseId,
                                                set.id,
                                                "weight",
                                                e.target.value
                                            );
                                        }}
                                        placeholder="0"
                                    /> :
                                    <span className="font-medium text-primary">
                                        {set.weight}
                                    </span>}
                                </td>
                                <td className={`py-3 px-2 ${set.notes && set.notes !== "" ? "min-w-64" : "w-auto"}`}>
                                    {exerciseId && isEditable && maxReps && onUpdateSetValue ? <Input
                                        type="text"
                                        className="w-64 h-10"
                                        value={set.notes || ""}
                                        onChange={(e) => {
                                            onUpdateSetValue(
                                                exerciseId,
                                                set.id,
                                                "notes",
                                                e.target.value
                                            );
                                        }}
                                        placeholder="Notes..."
                                    /> :
                                    <span className={`font-medium text-primary`}>
                                        {set.notes}
                                    </span>}
                                </td>
                                {exerciseId && isEditable && onDeleteSet && <td className="py-3 px-2 text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer h-10 w-10 p-0"
                                        onClick={() =>
                                            onDeleteSet(
                                                exerciseId,
                                                set.id
                                            )
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </td>}
                            </tr>
                        );
                    })}
                    {isEditable && exerciseId && onAddSet && <tr
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                        <td className="py-3 px-2">
                            <span className="font-medium text-primary">
                                {exercise.length + 1}
                            </span>
                        </td>        
                        <td className="col-span-3" colSpan={3}>
                            <Button
                                variant="default"
                                size="lg"
                                onClick={() => onAddSet(exerciseId)}
                                className="cursor-pointer h-10 px-4"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Add Set
                            </Button>
                        </td>             
                    </tr>}
                </tbody>
            </table>
        </div>
    )
};

export const EnhancedExerciseCard = React.memo(UnMemoizedEnhancedExerciseCard);

// Define a generic type for the objects we expect in the array.
// They must have an entryTime property which can be a Date object or a string.

/**
 * Groups elements from a 2D array by the date of their entryTime field.
 *
 * @param data - A 2D array of objects, where each object has an 'entryTime' property.
 * @returns An object where keys are date strings ('YYYY-MM-DD') and
 * values are arrays of the original objects belonging to that date.
 */
function groupByDate(data: PastSessionDetails[][]) {
  // Use a Record (a dictionary-like object) to store the grouped results.
  // The key will be the date string, and the value will be an array of items.
  const grouped: Record<string, PastSessionDetails[]> = {};

  // Flatten the 2D array into a 1D array to simplify iteration.
  const flattenedData = data.flat();

  // Iterate over each item in the flattened array.
  flattenedData.forEach(item => {
    // Create a Date object from the entryTime. This handles both
    // Date objects and date strings.
    const entryDate = new Date(item.entryTime ?? "");

    // Check if the date is valid. If not, we can skip this item or handle the error.
    if (isNaN(entryDate.getTime())) {
        console.warn("Invalid date found for item:", item);
        return; // Skip this item
    }

    // Convert the date to a standardized ISO string format 'YYYY-MM-DD'.
    // .toISOString() returns something like '2025-08-21T10:30:00.000Z'.
    // We split at 'T' and take the first part to get just the date.
    const day = getDayWithOrdinal(entryDate.getDate());
    const month = entryDate.toLocaleString('default', { month: 'long' });
    const year = entryDate.getFullYear();
    const dayOfWeek = entryDate.toLocaleString('default', { weekday: 'long' });

    const formattedDate = `${day} ${month} ${year} - ${dayOfWeek}`;
    const dateKey = formattedDate;

    // If we haven't seen this date key before, initialize an empty array for it.
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    // Push the current item into the array for its corresponding date.
    grouped[dateKey].push(item);
  });
  return grouped;
}

function getDayWithOrdinal(day: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = day % 100;
    return day + (s[(v - 20) % 10] || s[v] || s[0]);
}

const ReplaceExerciseSheet = ({onReplaceExercise, allExercises, currentExercise}: {
        onReplaceExercise: (exerciseId: string, exercise: Exercise) => void;
        allExercises: SelectExercise[];
        currentExercise: Exercise
}) => {
    const [selectedExercise, setSelectedExercise] = useState<SelectExercise>();
    return (
        <Sheet>
            <SheetTrigger asChild>
                <div className="cursor-pointer">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-foreground hover:text-foreground hover:bg-primary/10 cursor-pointer h-10 w-10 p-0"
                        onClick={() => {/*onDeleteExercise()*/}}
                    >
                        <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                </div>
            </SheetTrigger>
            <SheetContent side="right" className="w-full">
                <SheetHeader>
                <SheetTitle>Replace Exercise</SheetTitle>
                <SheetDescription>
                    Replace current exercise with another.
                </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 p-4">
                    {/* Your form or content goes here */}
                    <div className="flex flex-col items-start gap-2">
                        {/* <label htmlFor="name" className="text-right">Target Muscle Group</label> */}
                            {/* Show a checklist of all muscle groups */}
                        {/* <label htmlFor="name" className="text-right">Motion</label> */}
                            {/* Show a checklist of all motions available in that muscle group */}
                        <div className="py-2 w-full flex flex-col items-start gap-2">
                            <label htmlFor="name" className="text-right">Exercise Order</label>
                            <Input value={currentExercise.order} disabled/>         
                        </div>
                        <div className="py-2 w-full flex flex-col items-start gap-2">
                            <label htmlFor="name" className="text-right">Current Exercise</label>
                            <Input value={currentExercise.name} disabled/>                  
                        </div>
                        <div className="py-2 w-full flex flex-col items-start gap-2">
                            <label htmlFor="name" className="text-right">New Exercise</label>
                            <ExerciseDropdown
                                exercises={allExercises}
                                selectedDescription={selectedExercise?.exerciseName || ""}
                                onExerciseSelect={(ex)=>{
                                    // Add Exercise to this Workout Plan
                                    setSelectedExercise(ex)
                                }}
                                placeholder="Select exercise..."
                            />                  
                        </div>
                    </div>
                </div>
                <SheetFooter>
                {/* The SheetClose component can be used to create a button that closes the sheet */}
                <Button type="submit" onClick={()=>{
                    if(selectedExercise) {
                        onReplaceExercise(currentExercise.id || "", {
                            customizations: "",
                            id: selectedExercise?.exerciseId,
                            isExpanded: true,
                            name: selectedExercise?.exerciseName,
                            notes: "",
                            order: currentExercise.order,
                            repRange: '8-10',
                            restTime: '45-60s',
                            setOrderMarker: currentExercise.setOrderMarker,
                            setRange: "3",
                            sets: [],
                            tempo: "3 0 1 0" 
                        })
                    }
                }}>Save changes</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
};