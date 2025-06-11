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
import { Badge } from "@/components/ui/badge";
import {
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    ExternalLink,
    RefreshCw,
    Settings,
    TrendingUp,
    XCircle,
    Zap,
} from "lucide-react";
import { toast } from "sonner";

interface QueueHealth {
    status: "healthy" | "warning" | "critical";
    metrics: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        total: number;
        processingRate: number;
        avgProcessingTime: number;
        errorRate: number;
        queueLength: number;
        oldestWaitingJob?: number;
    };
    alerts: string[];
}

interface PerformanceMetrics {
    jobsProcessed: number;
    jobsFailed: number;
    avgProcessingTime: number;
    throughput: number;
    peakQueueLength: number;
}

interface FailedJob {
    id: string;
    name: string;
    failedReason: string;
    attemptsMade: number;
    timestamp: number;
}

interface HealthData {
    timestamp: string;
    health: QueueHealth;
    performance: PerformanceMetrics;
    failedJobs: FailedJob[];
    recommendations: string[];
}

export default function QueueMonitorPage() {
    const [healthData, setHealthData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchHealthData = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/queue-health");
            if (response.ok) {
                const data = await response.json();
                setHealthData(data);
                setLastUpdated(new Date());
            } else {
                toast.error("Failed to fetch queue health data");
            }
        } catch (error) {
            console.error("Error fetching health data:", error);
            toast.error("Error fetching queue health data");
        } finally {
            setLoading(false);
        }
    };

    const performCleanup = async () => {
        try {
            const response = await fetch("/api/admin/queue-health", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "cleanup" }),
            });

            if (response.ok) {
                const result = await response.json();
                toast.success(
                    `Cleanup completed: ${result.result.cleaned} jobs cleaned`
                );
                fetchHealthData(); // Refresh data
            } else {
                toast.error("Cleanup failed");
            }
        } catch (error) {
            console.error("Cleanup error:", error);
            toast.error("Cleanup error");
        }
    };

    useEffect(() => {
        fetchHealthData();
    }, []);

    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(fetchHealthData, 5000); // 5 seconds
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "healthy":
                return "text-green-600 bg-green-50 border-green-200";
            case "warning":
                return "text-yellow-600 bg-yellow-50 border-yellow-200";
            case "critical":
                return "text-red-600 bg-red-50 border-red-200";
            default:
                return "text-gray-600 bg-gray-50 border-gray-200";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "healthy":
                return <CheckCircle className="h-5 w-5" />;
            case "warning":
                return <AlertTriangle className="h-5 w-5" />;
            case "critical":
                return <XCircle className="h-5 w-5" />;
            default:
                return <Activity className="h-5 w-5" />;
        }
    };

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    };

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Queue Monitor</h1>
                    <p className="text-muted-foreground">
                        Real-time monitoring and management of BullMQ queues
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={
                            autoRefresh ? "bg-green-50 border-green-200" : ""
                        }
                    >
                        <Activity className="h-4 w-4 mr-2" />
                        Auto Refresh {autoRefresh ? "ON" : "OFF"}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchHealthData}
                        disabled={loading}
                    >
                        <RefreshCw
                            className={`h-4 w-4 mr-2 ${
                                loading ? "animate-spin" : ""
                            }`}
                        />
                        Refresh
                    </Button>
                </div>
            </div>

            {lastUpdated && (
                <p className="text-sm text-muted-foreground">
                    Last updated: {lastUpdated.toLocaleString()}
                </p>
            )}

            {healthData && (
                <>
                    {/* Status Overview */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {getStatusIcon(healthData.health.status)}
                                Queue Health Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 mb-4">
                                <Badge
                                    variant="outline"
                                    className={`px-3 py-1 ${getStatusColor(
                                        healthData.health.status
                                    )}`}
                                >
                                    {healthData.health.status.toUpperCase()}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    Error Rate:{" "}
                                    {healthData.health.metrics.errorRate.toFixed(
                                        1
                                    )}
                                    %
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    Processing Rate:{" "}
                                    {healthData.health.metrics.processingRate}{" "}
                                    jobs/min
                                </span>
                            </div>

                            {healthData.health.alerts.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-medium text-sm">
                                        Active Alerts:
                                    </h4>
                                    {healthData.health.alerts.map(
                                        (alert, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-2 text-sm"
                                            >
                                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                                {alert}
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Queue Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Waiting Jobs
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {healthData.health.metrics.waiting}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3 inline mr-1" />
                                    Queue Length:{" "}
                                    {healthData.health.metrics.queueLength}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Active Jobs
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {healthData.health.metrics.active}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    <Zap className="h-3 w-3 inline mr-1" />
                                    Currently processing
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Completed
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {healthData.health.metrics.completed}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    <CheckCircle className="h-3 w-3 inline mr-1" />
                                    Successfully processed
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Failed
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">
                                    {healthData.health.metrics.failed}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    <XCircle className="h-3 w-3 inline mr-1" />
                                    Error rate:{" "}
                                    {healthData.health.metrics.errorRate.toFixed(
                                        1
                                    )}
                                    %
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Performance Metrics */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Performance Metrics (Last Hour)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <div className="text-lg font-semibold">
                                        {healthData.performance.jobsProcessed}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Jobs Processed
                                    </p>
                                </div>
                                <div>
                                    <div className="text-lg font-semibold">
                                        {formatDuration(
                                            healthData.performance
                                                .avgProcessingTime
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Avg Processing Time
                                    </p>
                                </div>
                                <div>
                                    <div className="text-lg font-semibold">
                                        {healthData.performance.throughput.toFixed(
                                            1
                                        )}
                                        /min
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Throughput
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        window.open(
                                            "/api/admin/queue-dashboard",
                                            "_blank"
                                        )
                                    }
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open Bull Board Dashboard
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        window.open("/queue-test", "_blank")
                                    }
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Queue Test Interface
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={performCleanup}
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Cleanup Old Jobs
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recommendations */}
                    {healthData.recommendations.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>💡 Recommendations</CardTitle>
                                <CardDescription>
                                    Suggestions to improve queue performance and
                                    health
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {healthData.recommendations.map(
                                        (rec, index) => (
                                            <div
                                                key={index}
                                                className="text-sm p-2 bg-blue-50 border border-blue-200 rounded"
                                            >
                                                {rec}
                                            </div>
                                        )
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Recent Failed Jobs */}
                    {healthData.failedJobs.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <XCircle className="h-5 w-5 text-red-500" />
                                    Recent Failed Jobs
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {healthData.failedJobs.map((job) => (
                                        <div
                                            key={job.id}
                                            className="border rounded p-3 bg-red-50"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-sm">
                                                    Job ID: {job.id}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatTimestamp(
                                                        job.timestamp
                                                    )}
                                                </span>
                                            </div>
                                            <p className="text-sm text-red-600 mb-1">
                                                <strong>Error:</strong>{" "}
                                                {job.failedReason}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Attempts: {job.attemptsMade}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {!healthData && !loading && (
                <Card>
                    <CardContent className="text-center py-8">
                        <p className="text-muted-foreground">
                            Click &quot;Refresh&quot; to load queue monitoring
                            data
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
