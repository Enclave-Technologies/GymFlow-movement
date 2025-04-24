"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import {
    fetchWorkoutDetailsBySession,
    updateWorkoutHistoryEntry,
    deleteWorkoutSession,
    fetchWorkoutSessionLogsPage,
} from "@/actions/workout_history_actions";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

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
    entryTime: string | null;
}

interface EditingNote {
    id: string;
    note: string;
}

interface ClientWorkoutHistoryListProps {
    initialSessions: SessionLog[];
    userId: string;
}

const ClientWorkoutHistoryList: React.FC<ClientWorkoutHistoryListProps> = ({
    initialSessions,
    userId,
}) => {
    const [sessions, setSessions] = useState<SessionLog[]>(initialSessions);
    const [page, setPage] = useState(1); // Start at page 1 since we already have page 0
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            async (entries) => {
                const target = entries[0];
                if (target.isIntersecting && hasMore && !isLoading) {
                    setIsLoading(true);
                    try {
                        const { items, total } =
                            await fetchWorkoutSessionLogsPage(
                                userId,
                                page * 10,
                                10
                            );
                        if (items.length > 0) {
                            setSessions((prev) => [...prev, ...items]);
                            setPage((p) => p + 1);
                            setHasMore(sessions.length + items.length < total);
                        } else {
                            setHasMore(false);
                        }
                    } catch (error) {
                        console.error("Failed to fetch more sessions:", error);
                        toast.error("Failed to load more sessions");
                    } finally {
                        setIsLoading(false);
                    }
                }
            },
            {
                threshold: 1.0,
            }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [page, hasMore, isLoading, sessions.length, userId]);
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const [detailsMap, setDetailsMap] = useState<
        Record<string, WorkoutDetail[]>
    >({});
    const [, startTransition] = useTransition();
    const [editingNote, setEditingNote] = useState<EditingNote | null>(null);

    const handleExpand = (sessionId: string) => {
        if (expandedSession === sessionId) {
            setExpandedSession(null);
            return;
        }
        setExpandedSession(sessionId);
        if (!detailsMap[sessionId]) {
            startTransition(async () => {
                try {
                    const details = await fetchWorkoutDetailsBySession(
                        sessionId,
                        userId
                    );
                    setDetailsMap((prev) => ({
                        ...prev,
                        [sessionId]: details,
                    }));
                } catch (error) {
                    console.error("Failed to fetch session details:", error);
                    toast.error("Failed to load workout details");
                }
            });
        }
    };

    const handleDeleteSession = (sessionId: string) => {
        if (
            confirm(
                "Are you sure you want to delete this entire workout session? This action cannot be undone."
            )
        ) {
            startTransition(async () => {
                await deleteWorkoutSession(sessionId);
                // Remove the session from the state
                setSessions((prev) =>
                    prev.filter((s) => s.workoutSessionLogId !== sessionId)
                );
                // Also clean up the details map
                setDetailsMap((prev) => {
                    const newMap = { ...prev };
                    delete newMap[sessionId];
                    return newMap;
                });
                setExpandedSession(null);
            });
        }
    };

    const handleEditDetail = (
        detailId: string,
        sessionId: string,
        changes: Partial<
            Omit<WorkoutDetail, "id" | "exerciseName" | "entryTime">
        >
    ) => {
        startTransition(async () => {
            try {
                await updateWorkoutHistoryEntry(detailId, changes);
                // Refetch the entire session details to ensure we have the latest data
                const updated = await fetchWorkoutDetailsBySession(
                    sessionId,
                    userId
                );
                setDetailsMap((prev) => {
                    const newMap = { ...prev };
                    newMap[sessionId] = updated;
                    return newMap;
                });
                toast.success("Note updated successfully");
            } catch (error) {
                console.error("Failed to update note:", error);
                toast.error("Failed to update note. Please try again.");
            }
        });
    };

    // Format date to match the design in the image
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: true,
        });
    };

    return (
        <div className="space-y-4 p-4 h-full overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-accent-foreground">
                Workout History
            </h2>
            {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No workout history found
                </div>
            ) : (
                sessions.map((session) => (
                    <div
                        key={session.workoutSessionLogId}
                        className="border border-border bg-card rounded-lg p-4 shadow-sm"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <button
                                className="font-semibold text-lg text-accent-foreground underline hover:font-bold hover:cursor-pointer"
                                onClick={() =>
                                    handleExpand(session.workoutSessionLogId)
                                }
                            >
                                {session.sessionName}
                            </button>
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-muted-foreground">
                                    {formatDate(session.startTime)}
                                </span>
                                <button
                                    className="text-destructive hover:text-destructive/80"
                                    onClick={() =>
                                        handleDeleteSession(
                                            session.workoutSessionLogId
                                        )
                                    }
                                    title="Delete workout session"
                                >
                                    {/* <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M3 6h18"></path>
                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    </svg> */}
                                    <Trash2 />
                                </button>
                            </div>
                        </div>

                        {/* Show session details even when not expanded */}
                        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                            <div>
                                <div className="font-medium text-accent-foreground">
                                    Start Time
                                </div>
                                <div className="text-muted-foreground">
                                    {formatDate(session.startTime)}
                                </div>
                            </div>
                            <div>
                                <div className="font-medium text-accent-foreground">
                                    End Time
                                </div>
                                <div className="text-muted-foreground">
                                    {session.endTime
                                        ? formatDate(session.endTime)
                                        : "N/A"}
                                </div>
                            </div>
                            <div>
                                <div className="font-medium text-accent-foreground">
                                    Total Volume
                                </div>
                                <div className="text-muted-foreground">
                                    {detailsMap[session.workoutSessionLogId]
                                        ? detailsMap[
                                              session.workoutSessionLogId
                                          ].reduce(
                                              (total, exercise) =>
                                                  parseFloat(
                                                      (
                                                          total +
                                                          exercise.sets *
                                                              exercise.reps *
                                                              exercise.weight
                                                      ).toFixed(2)
                                                  ),
                                              0
                                          ) + " kg"
                                        : "Expand to view"}
                                </div>
                            </div>
                        </div>

                        {expandedSession === session.workoutSessionLogId && (
                            <div className="mt-4 space-y-2">
                                {(() => {
                                    // Get the details for this session
                                    const details =
                                        detailsMap[
                                            session.workoutSessionLogId
                                        ] ?? [];

                                    // Group by exercise name
                                    const exerciseGroups: Record<
                                        string,
                                        WorkoutDetail[]
                                    > = {};

                                    details.forEach((detail) => {
                                        if (
                                            !exerciseGroups[detail.exerciseName]
                                        ) {
                                            exerciseGroups[
                                                detail.exerciseName
                                            ] = [];
                                        }
                                        exerciseGroups[
                                            detail.exerciseName
                                        ].push(detail);
                                    });

                                    return Object.entries(exerciseGroups).map(
                                        ([exerciseName, exercises]) => (
                                            <div
                                                key={exerciseName}
                                                className="mb-4 last:mb-0"
                                            >
                                                <div className="font-medium text-accent-foreground mb-4 text-lg text-center">
                                                    {exerciseName}
                                                </div>
                                                {exercises.map(
                                                    (exercise, index) => (
                                                        <div
                                                            key={exercise.id}
                                                            className="flex justify-between items-center py-3 border-t border-border"
                                                        >
                                                            <div className="text-sm text-accent-foreground">
                                                                Set {index + 1}:
                                                                Reps:{" "}
                                                                {exercise.reps},
                                                                Weight:{" "}
                                                                {
                                                                    exercise.weight
                                                                }
                                                                kg
                                                                {exercise.notes && (
                                                                    <div className="text-muted-foreground italic mt-1">
                                                                        {
                                                                            exercise.notes
                                                                        }
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <Popover
                                                                open={
                                                                    editingNote?.id ===
                                                                    exercise.id
                                                                }
                                                                onOpenChange={(
                                                                    open
                                                                ) => {
                                                                    if (open) {
                                                                        setEditingNote(
                                                                            {
                                                                                id: exercise.id,
                                                                                note: exercise.notes,
                                                                            }
                                                                        );
                                                                    } else {
                                                                        setEditingNote(
                                                                            null
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                <PopoverTrigger
                                                                    asChild
                                                                >
                                                                    <Button className="bg-secondary text-accent-foreground hover:bg-secondary/90 hover:text-accent-foreground text-sm hover:cursor-pointer">
                                                                        Edit
                                                                        Note
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-80">
                                                                    <div className="space-y-4">
                                                                        <Textarea
                                                                            value={
                                                                                editingNote?.note ??
                                                                                ""
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) =>
                                                                                setEditingNote(
                                                                                    (
                                                                                        prev
                                                                                    ) =>
                                                                                        prev
                                                                                            ? {
                                                                                                  ...prev,
                                                                                                  note: e
                                                                                                      .target
                                                                                                      .value,
                                                                                              }
                                                                                            : null
                                                                                )
                                                                            }
                                                                            placeholder="Add a note..."
                                                                            className="min-h-[100px]"
                                                                        />
                                                                        <div className="flex justify-end space-x-2">
                                                                            <Button
                                                                                variant="outline"
                                                                                onClick={() =>
                                                                                    setEditingNote(
                                                                                        null
                                                                                    )
                                                                                }
                                                                            >
                                                                                Cancel
                                                                            </Button>
                                                                            <Button
                                                                                onClick={() => {
                                                                                    if (
                                                                                        editingNote
                                                                                    ) {
                                                                                        handleEditDetail(
                                                                                            exercise.id,
                                                                                            session.workoutSessionLogId,
                                                                                            {
                                                                                                notes: editingNote.note,
                                                                                            }
                                                                                        );
                                                                                        setEditingNote(
                                                                                            null
                                                                                        );
                                                                                    }
                                                                                }}
                                                                            >
                                                                                Save
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                ))
            )}
            {/* Intersection observer target */}
            <div
                ref={observerTarget}
                className="h-10 flex items-center justify-center"
            >
                {isLoading && (
                    <div className="text-muted-foreground">Loading more...</div>
                )}
            </div>
        </div>
    );
};

export default ClientWorkoutHistoryList;
