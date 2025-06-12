"use client";

import { History, Clock } from "lucide-react";
import { PastSession, WorkoutData } from "@/types/workout-tracker-types";

interface WorkoutHistorySidebarProps {
    pastSessions: PastSession[];
    initialWorkoutData: WorkoutData;
}

export function WorkoutHistorySidebar({
    pastSessions,
    initialWorkoutData,
}: WorkoutHistorySidebarProps) {
    if (pastSessions.length === 0) {
        return null;
    }

    // Get the last session for date and duration
    const lastSession = [...pastSessions].sort(
        (a, b) =>
            new Date(b.session.startTime).getTime() -
            new Date(a.session.startTime).getTime()
    )[0];

    // Group details by exercise name
    const groupedDetails = lastSession.details.reduce((acc, detail) => {
        if (!acc[detail.exerciseName]) {
            acc[detail.exerciseName] = [];
        }
        acc[detail.exerciseName].push(detail);
        return acc;
    }, {} as Record<string, typeof lastSession.details>);

    // Find exercise order from current workout data using setOrderMarker
    const exerciseOrderMap = new Map<string, string>();
    initialWorkoutData.exercises.forEach((ex) => {
        const exerciseName = ex.exerciseDetails?.exerciseName || "";
        if (exerciseName) {
            exerciseOrderMap.set(exerciseName, ex.setOrderMarker || "999");
        }
    });

    // Convert to array and sort by setOrderMarker, then by set number
    const sortedDetails = Object.entries(groupedDetails)
        .map(([name, sets]) => ({
            name,
            order: exerciseOrderMap.get(name) || "999", // Default high order if not found
            sets: sets.sort((a, b) => (a.sets || 0) - (b.sets || 0)), // Sort sets by set number
        }))
        .sort((a, b) => {
            // Sort by setOrderMarker, supporting alphanumeric
            return a.order.localeCompare(b.order, undefined, {
                numeric: true,
                sensitivity: "base",
            });
        });

    return (
        <div className="md:w-1/3 lg:w-1/4">
            <div className="bg-card rounded-lg shadow-md p-4 sticky top-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h3 className="text-lg font-semibold flex items-center">
                        <History className="h-4 w-4 mr-2" />
                        Last Workout
                    </h3>

                    <div className="text-xs flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                            {new Date(
                                lastSession.session.startTime
                            ).toLocaleDateString()}
                        </span>
                        {lastSession.session.endTime && (
                            <span className="bg-primary text-primary-foreground px-2 py-1 rounded flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {Math.round(
                                    (new Date(
                                        lastSession.session.endTime
                                    ).getTime() -
                                        new Date(
                                            lastSession.session.startTime
                                        ).getTime()) /
                                        60000
                                )}{" "}
                                min
                            </span>
                        )}
                    </div>
                </div>

                <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {sortedDetails.map((exerciseGroup) => (
                        <div
                            key={exerciseGroup.name}
                            className="bg-muted bg-opacity-20 rounded-lg p-3 mb-4"
                        >
                            <h4 className="text-md font-semibold mb-2">
                                {exerciseGroup.order}. {exerciseGroup.name}
                            </h4>
                            <div className="overflow-x-auto text-xs">
                                <table className="w-full min-w-[150px]">
                                    <thead>
                                        <tr className="bg-card bg-opacity-50">
                                            <th className="py-1 px-2 text-left whitespace-nowrap">
                                                Set
                                            </th>
                                            <th className="py-1 px-2 text-center whitespace-nowrap">
                                                Reps
                                            </th>
                                            <th className="py-1 px-2 text-center whitespace-nowrap">
                                                Kg
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {exerciseGroup.sets.map((set) => (
                                            <tr
                                                key={set.workoutDetailId}
                                                className="border-b border-border"
                                            >
                                                <td className="py-1 px-2 whitespace-nowrap">
                                                    {set.sets}
                                                </td>
                                                <td className="py-1 px-2 text-center whitespace-nowrap">
                                                    {set.reps}
                                                </td>
                                                <td className="py-1 px-2 text-center whitespace-nowrap">
                                                    {set.weight}
                                                </td>
                                            </tr>
                                        ))}
                                        {exerciseGroup.sets.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={3}
                                                    className="py-1 px-2 text-center text-muted-foreground"
                                                >
                                                    No details recorded
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
