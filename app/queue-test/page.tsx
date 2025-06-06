"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
import {
    Loader2,
    RefreshCw,
    Trash2,
    ExternalLink,
    Activity,
} from "lucide-react";
import { toast } from "sonner";
import {
    getQueueStats,
    clearQueue,
    sendTestMessage,
    sendWorkoutUpdateMessage,
    sendUserActionMessage,
    sendNotificationMessage,
    sendEmailMessage,
    sendDataSyncMessage,
} from "@/actions/queue_actions";

interface QueueStats {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    total: number;
}

interface QueueJob {
    id: string;
    name: string;
    data: Record<string, unknown>;
    processedOn?: number;
    finishedOn?: number;
    failedReason?: string;
    timestamp?: number;
}

interface QueueData {
    stats: QueueStats;
    recentJobs?: {
        completed: QueueJob[];
        failed: QueueJob[];
        active: QueueJob[];
        waiting: QueueJob[];
    };
}

export default function QueueTestPage() {
    const [loading, setLoading] = useState<string | null>(null);
    const [queueData, setQueueData] = useState<QueueData | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Fetch queue statistics
    const fetchQueueStats = async () => {
        try {
            const data = await getQueueStats(true, 5);

            if (data.success) {
                setQueueData(data);
            } else {
                toast.error("Failed to fetch queue stats");
            }
        } catch (error) {
            console.error("Error fetching queue stats:", error);
            toast.error("Error fetching queue stats");
        }
    };

    // Auto-refresh effect
    useEffect(() => {
        fetchQueueStats();

        if (autoRefresh) {
            const interval = setInterval(fetchQueueStats, 2000);
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    // Send different types of messages using server actions
    const handleSendTestMessage = async () => {
        setLoading("TEST");

        // Optimistic UI update
        setQueueData((prevData) =>
            prevData
                ? {
                      ...prevData,
                      stats: {
                          ...prevData.stats,
                          waiting: prevData.stats.waiting + 1,
                          total: prevData.stats.total + 1,
                      },
                  }
                : null
        );

        try {
            // Fire and forget - don't await the full operation
            sendTestMessage("basic", {
                message: "Hello from queue test!",
                timestamp: Date.now(),
            }).then((result) => {
                if (!result.success) {
                    toast.error(`Failed to add test job: ${result.error}`);
                    // Revert optimistic update
                    fetchQueueStats();
                }
            });

            // Show success immediately
            toast.success("Test job added to queue!");

            // Schedule a refresh after a short delay
            setTimeout(() => fetchQueueStats(), 500);
        } catch (error) {
            console.error("Error sending test message:", error);
            toast.error("Error sending test message");
            fetchQueueStats(); // Revert optimistic update
        } finally {
            // Release UI quickly
            setTimeout(() => setLoading(null), 300);
        }
    };

    const handleSendWorkoutUpdate = async () => {
        setLoading("WORKOUT_UPDATE");

        // Optimistic UI update
        setQueueData((prevData) =>
            prevData
                ? {
                      ...prevData,
                      stats: {
                          ...prevData.stats,
                          waiting: prevData.stats.waiting + 1,
                          total: prevData.stats.total + 1,
                      },
                  }
                : null
        );

        try {
            // Fire and forget
            sendWorkoutUpdateMessage(
                "plan-123",
                "phase-456",
                "session-789",
                "exercise-101",
                { sets: 4, reps: 12, weight: 135 }
            ).then((result) => {
                if (!result.success) {
                    toast.error(
                        `Failed to add workout update job: ${result.error}`
                    );
                    fetchQueueStats();
                }
            });

            toast.success("Workout update job added to queue!");
            setTimeout(() => fetchQueueStats(), 500);
        } catch (error) {
            console.error("Error sending workout update:", error);
            toast.error("Error sending workout update");
            fetchQueueStats();
        } finally {
            setTimeout(() => setLoading(null), 300);
        }
    };

    const handleSendUserAction = async () => {
        setLoading("USER_ACTION");

        // Optimistic UI update
        setQueueData((prevData) =>
            prevData
                ? {
                      ...prevData,
                      stats: {
                          ...prevData.stats,
                          waiting: prevData.stats.waiting + 1,
                          total: prevData.stats.total + 1,
                      },
                  }
                : null
        );

        try {
            // Fire and forget
            sendUserActionMessage("profile_update", "user", "user-123", {
                field: "email",
                oldValue: "old@example.com",
                newValue: "new@example.com",
            }).then((result) => {
                if (!result.success) {
                    toast.error(
                        `Failed to add user action job: ${result.error}`
                    );
                    fetchQueueStats();
                }
            });

            toast.success("User action job added to queue!");
            setTimeout(() => fetchQueueStats(), 500);
        } catch (error) {
            console.error("Error sending user action:", error);
            toast.error("Error sending user action");
            fetchQueueStats();
        } finally {
            setTimeout(() => setLoading(null), 300);
        }
    };

    const handleSendNotification = async () => {
        setLoading("NOTIFICATION");

        // Optimistic UI update
        setQueueData((prevData) =>
            prevData
                ? {
                      ...prevData,
                      stats: {
                          ...prevData.stats,
                          waiting: prevData.stats.waiting + 1,
                          total: prevData.stats.total + 1,
                      },
                  }
                : null
        );

        try {
            // Fire and forget
            sendNotificationMessage(
                "user-123",
                "Workout Reminder",
                "Time for your scheduled workout!",
                "info",
                "/workouts"
            ).then((result) => {
                if (!result.success) {
                    toast.error(
                        `Failed to add notification job: ${result.error}`
                    );
                    fetchQueueStats();
                }
            });

            toast.success("Notification job added to queue!");
            setTimeout(() => fetchQueueStats(), 500);
        } catch (error) {
            console.error("Error sending notification:", error);
            toast.error("Error sending notification");
            fetchQueueStats();
        } finally {
            setTimeout(() => setLoading(null), 300);
        }
    };

    const handleSendEmail = async () => {
        setLoading("EMAIL");

        // Optimistic UI update
        setQueueData((prevData) =>
            prevData
                ? {
                      ...prevData,
                      stats: {
                          ...prevData.stats,
                          waiting: prevData.stats.waiting + 1,
                          total: prevData.stats.total + 1,
                      },
                  }
                : null
        );

        try {
            // Fire and forget
            sendEmailMessage(
                "user@example.com",
                "Weekly Progress Report",
                "progress_report",
                {
                    userName: "John Doe",
                    weeklyGoals: 5,
                    completedWorkouts: 4,
                }
            ).then((result) => {
                if (!result.success) {
                    toast.error(`Failed to add email job: ${result.error}`);
                    fetchQueueStats();
                }
            });

            toast.success("Email job added to queue!");
            setTimeout(() => fetchQueueStats(), 500);
        } catch (error) {
            console.error("Error sending email:", error);
            toast.error("Error sending email");
            fetchQueueStats();
        } finally {
            setTimeout(() => setLoading(null), 300);
        }
    };

    const handleSendDataSync = async () => {
        setLoading("DATA_SYNC");

        // Optimistic UI update
        setQueueData((prevData) =>
            prevData
                ? {
                      ...prevData,
                      stats: {
                          ...prevData.stats,
                          waiting: prevData.stats.waiting + 1,
                          total: prevData.stats.total + 1,
                      },
                  }
                : null
        );

        try {
            // Fire and forget
            sendDataSyncMessage(
                "backup",
                "workout_plans",
                ["plan-1", "plan-2", "plan-3"],
                "s3://backup-bucket/workouts"
            ).then((result) => {
                if (!result.success) {
                    toast.error(`Failed to add data sync job: ${result.error}`);
                    fetchQueueStats();
                }
            });

            toast.success("Data sync job added to queue!");
            setTimeout(() => fetchQueueStats(), 500);
        } catch (error) {
            console.error("Error sending data sync:", error);
            toast.error("Error sending data sync");
            fetchQueueStats();
        } finally {
            setTimeout(() => setLoading(null), 300);
        }
    };

    // Clear the queue
    const handleClearQueue = async () => {
        setLoading("clear");

        try {
            const result = await clearQueue();

            if (result.success) {
                toast.success("Queue cleared successfully!");
                fetchQueueStats();
            } else {
                toast.error("Failed to clear queue");
            }
        } catch (error) {
            console.error("Error clearing queue:", error);
            toast.error("Error clearing queue");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Redis Queue Test</h1>
                    <p className="text-muted-foreground">
                        Test the Redis queue system with different message types
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open("/queue-monitor", "_blank")}
                    >
                        <Activity className="h-4 w-4 mr-2" />
                        Monitor Dashboard
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            window.open("/api/admin/queue-dashboard", "_blank")
                        }
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Bull Board
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                        <RefreshCw
                            className={`h-4 w-4 mr-2 ${
                                autoRefresh ? "animate-spin" : ""
                            }`}
                        />
                        Auto Refresh {autoRefresh ? "ON" : "OFF"}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchQueueStats}
                        disabled={loading !== null}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Queue Statistics */}
            {queueData && (
                <Card>
                    <CardHeader>
                        <CardTitle>Queue Statistics</CardTitle>
                        <CardDescription>
                            Current state of the message queue
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-600">
                                    {queueData.stats.waiting}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Waiting
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {queueData.stats.active}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Active
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {queueData.stats.completed}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Completed
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">
                                    {queueData.stats.failed}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Failed
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold">
                                    {queueData.stats.total}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Total
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Test Buttons */}
            <Card>
                <CardHeader>
                    <CardTitle>Send Test Messages</CardTitle>
                    <CardDescription>
                        Click buttons to add different types of messages to the
                        queue
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Button
                            onClick={handleSendTestMessage}
                            disabled={loading !== null}
                            className="h-auto p-4 flex flex-col items-start"
                        >
                            {loading === "TEST" && (
                                <Loader2 className="h-4 w-4 animate-spin mb-2" />
                            )}
                            <div className="font-semibold">Test Message</div>
                            <div className="text-sm opacity-80">
                                Basic test payload
                            </div>
                        </Button>

                        <Button
                            onClick={handleSendWorkoutUpdate}
                            disabled={loading !== null}
                            className="h-auto p-4 flex flex-col items-start"
                        >
                            {loading === "WORKOUT_UPDATE" && (
                                <Loader2 className="h-4 w-4 animate-spin mb-2" />
                            )}
                            <div className="font-semibold">Workout Update</div>
                            <div className="text-sm opacity-80">
                                Exercise plan changes
                            </div>
                        </Button>

                        <Button
                            onClick={handleSendUserAction}
                            disabled={loading !== null}
                            className="h-auto p-4 flex flex-col items-start"
                        >
                            {loading === "USER_ACTION" && (
                                <Loader2 className="h-4 w-4 animate-spin mb-2" />
                            )}
                            <div className="font-semibold">User Action</div>
                            <div className="text-sm opacity-80">
                                User activity tracking
                            </div>
                        </Button>

                        <Button
                            onClick={handleSendNotification}
                            disabled={loading !== null}
                            className="h-auto p-4 flex flex-col items-start"
                        >
                            {loading === "NOTIFICATION" && (
                                <Loader2 className="h-4 w-4 animate-spin mb-2" />
                            )}
                            <div className="font-semibold">Notification</div>
                            <div className="text-sm opacity-80">
                                Push notification
                            </div>
                        </Button>

                        <Button
                            onClick={handleSendEmail}
                            disabled={loading !== null}
                            className="h-auto p-4 flex flex-col items-start"
                        >
                            {loading === "EMAIL" && (
                                <Loader2 className="h-4 w-4 animate-spin mb-2" />
                            )}
                            <div className="font-semibold">Email</div>
                            <div className="text-sm opacity-80">
                                Email notification
                            </div>
                        </Button>

                        <Button
                            onClick={handleSendDataSync}
                            disabled={loading !== null}
                            className="h-auto p-4 flex flex-col items-start"
                        >
                            {loading === "DATA_SYNC" && (
                                <Loader2 className="h-4 w-4 animate-spin mb-2" />
                            )}
                            <div className="font-semibold">Data Sync</div>
                            <div className="text-sm opacity-80">
                                Backup operation
                            </div>
                        </Button>
                    </div>

                    <div className="mt-6 pt-6 border-t">
                        <Button
                            variant="destructive"
                            onClick={handleClearQueue}
                            disabled={loading !== null}
                        >
                            {loading === "clear" ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Clear Queue
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
