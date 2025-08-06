"use client";

import React, { useState, useTransition, useRef, useEffect, Dispatch, SetStateAction } from "react";
import {
    fetchWorkoutDetailsBySession,
    updateWorkoutHistoryEntry,
    deleteWorkoutSession,
    fetchWorkoutSessionLogsPage,
    deleteWorkoutSessionLog,
} from "@/actions/workout_history_actions";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, EllipsisVertical, Trash2 } from "lucide-react";
import { LinkifiedText } from "@/components/ui/linkified-text";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
// import { Input } from "../ui/input";

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
    setOrderMarker: string;
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

    useEffect(()=>{
        setSessions(initialSessions);
    },[initialSessions]);

    // Refetch data when page becomes visible (e.g., when navigating back from workout)
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (!document.hidden) {
                // Page became visible, refetch the first page
                try {
                    const { items } = await fetchWorkoutSessionLogsPage(
                        userId,
                        0,
                        10
                    );
                    setSessions(items);
                    setPage(1);
                    setHasMore(true);
                } catch (error) {
                    console.error("Error refetching workout sessions:", error);
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, [userId]);

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

    const handleDeleteLog = (sessionId: string, exerciseLogId: string) => {
        console.log(detailsMap[sessionId], exerciseLogId);
        if (
            confirm(
                "Are you sure you want to delete this workout log? This action cannot be undone."
            )
        ) {
            startTransition(async () => {
                await deleteWorkoutSessionLog(exerciseLogId);
                setDetailsMap((prev) => {
                    const newMap = {...prev};
                    newMap[sessionId] = newMap[sessionId].filter((log) => log.id !== exerciseLogId)
                    return newMap;
                });
                toast.success("Deleted successfully");
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
    function formatDate(dateString: string): string {
        try {
            const date = new Date(dateString);

            // Check if the date object is valid after parsing.
            if (isNaN(date.getTime())) {
            return "Invalid Date String Provided";
            }

            // Use Intl.DateTimeFormat for robust, locale-aware formatting.
            // By not specifying a locale (or using 'undefined'), we instruct it to use the user's
            // browser/system settings for timezone and locale conventions.
            const options: Intl.DateTimeFormatOptions = {
            weekday: 'short',   // e.g., "Thu"
            year: 'numeric',    // e.g., "2025"
            month: 'short',     // e.g., "Jul"
            day: 'numeric',     // e.g., "31"
            hour: 'numeric',    // e.g., "10"
            minute: '2-digit',  // e.g., "37"
            hour12: true,       // Use 12-hour clock with AM/PM
            };

            // We use 'en-GB' or a similar locale to get the day-month-year order,
            // but the timezone conversion is still based on the user's system.
            // The final string is constructed manually to ensure the exact format.
            const formatter = new Intl.DateTimeFormat('en-US', options);
            const parts = formatter.formatToParts(date);

            // Create a simple key-value map from the parts array for easier access.
            const partsMap = new Map(parts.map(part => [part.type, part.value]));

            // Assemble the final string exactly as requested.
            // Note: The example date in the prompt "25 Jul" differs from the input "2025-07-31".
            // This function correctly uses the date from the input string.
            const formattedString = `${partsMap.get('day')} ${partsMap.get('month')} ${partsMap.get('year')}, ${partsMap.get('weekday')} - ${partsMap.get('hour')}:${partsMap.get('minute')} ${partsMap.get('dayPeriod')}`;

            return formattedString;

        } catch (error) {
            console.error("An error occurred during date formatting:", error);
            return "Error formatting date";
        }
        }

    return (
        <div className="space-y-4 p-4 h-full overflow-y-auto">
            {isLoading && sessions.length === 0 ? null : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No workout history found
                </div>
            ) : (
                sessions.map((session) => (
                    <div
                        key={session.workoutSessionLogId}
                        className="border border-border bg-card rounded-lg p-4 shadow-sm"
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center min-w-0 flex-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleExpand(session.workoutSessionLogId)}
                                    className="p-1 h-auto mr-2 cursor-pointer"
                                >
                                    {expandedSession === session.workoutSessionLogId ? (
                                        <ChevronDown className="h-5 w-5" />
                                    ) : (
                                        <ChevronUp className="h-5 w-5" />
                                    )}
                                </Button>
                                <div className="flex flex-row items-center gap-2">
                                    <span className="font-semibold text-lg">
                                        {session.sessionName}
                                    </span>
                                    <span className="text-base text-muted-foreground">
                                        - {formatDate(session.startTime)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <button
                                    className="text-destructive hover:text-destructive/80"
                                    onClick={() =>
                                        handleDeleteSession(
                                            session.workoutSessionLogId
                                        )
                                    }
                                    title="Delete workout session"
                                >
                                    <Trash2 />
                                </button>
                            </div>
                        </div>

                        {/* Show session details even when not expanded */}
                        {/* <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
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
                                                          exercise.reps *
                                                              exercise.weight
                                                      ).toFixed(2)
                                                  ),
                                              0
                                          ) + " kg"
                                        : "Expand to view"}
                                </div>
                            </div>
                        </div> */}

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

                                    console.log(
                                        JSON.stringify(exerciseGroups, null, 2)
                                    );
                                    return Object.entries(exerciseGroups).map(
                                        ([exerciseName, exercises]) => (
                                            <div
                                                key={exerciseName}
                                                className="mb-4 last:mb-0"
                                            >
                                                <div className="font-medium text-accent-foreground mb-4 text-lg">
                                                    {
                                                        exercises[0]
                                                            .setOrderMarker
                                                    }
                                                    {" "}{exerciseName}
                                                </div>
                                                {exercises.map(
                                                    (exercise, index) => (
                                                        <ExerciseTile 
                                                            key={exercise.id} 
                                                            exercise={exercise} 
                                                            index={index} 
                                                            editingNote={editingNote}
                                                            setEditingNote={setEditingNote}
                                                            handleEditDetail={handleEditDetail}
                                                            session={session}
                                                            handleDeleteLog={handleDeleteLog}
                                                        />
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

const ExerciseTile = ({
    exercise,
    index,
    editingNote,
    setEditingNote,
    handleEditDetail,
    session,
    handleDeleteLog
}: {
    exercise: WorkoutDetail, 
    index: number,
    editingNote: EditingNote | null, setEditingNote: Dispatch<SetStateAction<EditingNote | null>>, 
    handleEditDetail: (detailId: string, sessionId: string, changes: Partial<Omit<WorkoutDetail, "id" | "exerciseName" | "entryTime">>) => void, 
    session: SessionLog,
    handleDeleteLog: (sessionId: string, exerciseId: string) => void
}) => {
    return (
        <div
            key={exercise.id}
            className="flex justify-between items-center py-3 border-t border-border"
        >
            <div className="text-sm text-accent-foreground">
                Set {index + 1}:
                Reps:{" "}
                {exercise.reps},
                Weight:{" "}
                {typeof exercise.weight ===
                "number"
                    ? exercise.weight.toFixed(
                        1
                    )
                    : exercise.weight}
                kg, Volume:{" "}
                {(
                    exercise.reps *
                    exercise.weight
                ).toFixed(2)}
                kg
                {exercise.notes && (
                    <div className="text-muted-foreground italic mt-1">
                        <LinkifiedText
                            text={
                                exercise.notes
                            }
                            linkClassName="text-blue-400 hover:text-blue-300"
                        />
                    </div>
                )}
            </div>
            <div className="flex flex-row items-center gap-4">
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
                <ExerciseDropdownMenu handleDeleteLog={()=>{handleDeleteLog(session.workoutSessionLogId, exercise.id)}}/>
            </div>
        </div>
    )
};

const ExerciseDropdownMenu = ({handleDeleteLog}: {handleDeleteLog: () => void}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
    return (
        <DropdownMenu
            open={isDropdownOpen}
            onOpenChange={setIsDropdownOpen}
        >
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 p-0 flex-shrink-0"
                >
                    <span className="sr-only">Switch trainer</span>
                    <EllipsisVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-2">
                <DropdownMenuItem className="cursor-pointer hover:bg-red-400" onClick={()=>{
                    // Delete Log from Workout History
                    handleDeleteLog()
                }}>
                    <Trash2 className="h-4 w-4" /> Delete Log
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
};

export default ClientWorkoutHistoryList;
