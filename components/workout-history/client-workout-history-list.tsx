"use client";

import React, { useState, useTransition } from "react";
import {
    fetchWorkoutDetailsBySession,
    deleteWorkoutHistoryEntry,
    updateWorkoutHistoryEntry,
} from "@/actions/workout_history_actions";

interface SessionLog {
    workoutSessionLogId: string;
    sessionName: string;
    startTime: string;
    endTime: string | null;
}

interface WorkoutDetail {
    id: string;
    exerciseName: string;
    sets: number;
    reps: number;
    weight: number;
    notes: string;
    entryTime: string;
}

interface ClientWorkoutHistoryListProps {
    initialSessions: SessionLog[];
}

const ClientWorkoutHistoryList: React.FC<ClientWorkoutHistoryListProps> = ({
    initialSessions,
}) => {
    const [sessions] = useState<SessionLog[]>(initialSessions);
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const [detailsMap, setDetailsMap] = useState<
        Record<string, WorkoutDetail[]>
    >({});
    const [, startTransition] = useTransition();

    const handleExpand = (sessionId: string) => {
        if (expandedSession === sessionId) {
            setExpandedSession(null);
            return;
        }
        setExpandedSession(sessionId);
        if (!detailsMap[sessionId]) {
            startTransition(async () => {
                const details = await fetchWorkoutDetailsBySession(sessionId);
                setDetailsMap((prev) => ({ ...prev, [sessionId]: details }));
            });
        }
    };

    const handleDeleteDetail = (detailId: string, sessionId: string) => {
        startTransition(async () => {
            await deleteWorkoutHistoryEntry(detailId);
            // refresh details map
            const updated = await fetchWorkoutDetailsBySession(sessionId);
            setDetailsMap((prev) => ({ ...prev, [sessionId]: updated }));
        });
    };

    const handleEditDetail = (
        detailId: string,
        sessionId: string,
        changes: Partial<
            Omit<WorkoutDetail, "id" | "exerciseName" | "entryTime">
        >
    ) => {
        startTransition(async () => {
            await updateWorkoutHistoryEntry(detailId, changes);
            const updated = await fetchWorkoutDetailsBySession(sessionId);
            setDetailsMap((prev) => ({ ...prev, [sessionId]: updated }));
        });
    };

    return (
        <div className="space-y-4 p-4">
            <h2 className="text-2xl font-bold mb-6 text-accent-foreground">
                Workout History
            </h2>
            {sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No workout history found
                </div>
            ) : (
                sessions.map((session) => (
                    <div
                        key={session.workoutSessionLogId}
                        className="border rounded-lg p-4"
                    >
                        <div className="flex justify-between items-center">
                            <button
                                className="font-semibold text-lg"
                                onClick={() =>
                                    handleExpand(session.workoutSessionLogId)
                                }
                            >
                                {session.sessionName}
                            </button>
                            <span>
                                {new Date(session.startTime).toLocaleString()}
                            </span>
                        </div>
                        {expandedSession === session.workoutSessionLogId && (
                            <div className="mt-4">
                                {(
                                    detailsMap[session.workoutSessionLogId] ??
                                    []
                                ).map((d) => (
                                    <div
                                        key={d.id}
                                        className="flex justify-between items-center py-2 border-t"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {d.exerciseName}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                Sets: {d.sets}, Reps: {d.reps},
                                                Weight: {d.weight}kg
                                            </div>
                                            {d.notes && (
                                                <div className="text-sm">
                                                    Notes: {d.notes}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                className="text-red-500"
                                                onClick={() =>
                                                    handleDeleteDetail(
                                                        d.id,
                                                        session.workoutSessionLogId
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>
                                            <button
                                                className="text-blue-500"
                                                onClick={() =>
                                                    handleEditDetail(
                                                        d.id,
                                                        session.workoutSessionLogId,
                                                        {
                                                            // example: prompt user or open form in future
                                                            notes: d.notes,
                                                        }
                                                    )
                                                }
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

export default ClientWorkoutHistoryList;
