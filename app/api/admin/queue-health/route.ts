/**
 * Queue Health Check API
 *
 * Provides comprehensive queue health metrics and monitoring data
 */

import { NextRequest, NextResponse } from "next/server";
import {
    QueueMonitoring,
    createMonitoringMiddleware,
} from "@/lib/queue-monitoring";

const middleware = createMonitoringMiddleware();

export async function GET(request: NextRequest) {
    try {
        // Apply authentication middleware
        const mockReq = {
            method: "GET",
            headers: Object.fromEntries(request.headers.entries()),
        };

        let middlewareError = null;
        const mockRes = {
            status: () => mockRes,
            json: (data: unknown) => data,
        };

        await new Promise<void>((resolve) => {
            middleware(mockReq, mockRes, (error?: unknown) => {
                middlewareError = error;
                resolve();
            });
        });

        if (middlewareError) {
            return NextResponse.json(
                { error: "Authentication failed" },
                { status: 401 }
            );
        }

        // Get comprehensive health data
        const [health, performance, failedJobs] = await Promise.all([
            QueueMonitoring.getQueueHealth(),
            QueueMonitoring.getPerformanceMetrics(60), // Last 60 minutes
            QueueMonitoring.getFailedJobsDetails(5), // Last 5 failed jobs
        ]);

        const response = {
            timestamp: new Date().toISOString(),
            health,
            performance,
            failedJobs,
            recommendations: generateRecommendations(health, performance),
        };

        return NextResponse.json(response, {
            status: 200,
            headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                Pragma: "no-cache",
                Expires: "0",
            },
        });
    } catch (error) {
        console.error("Queue health check error:", error);
        return NextResponse.json(
            {
                error: "Health check failed",
                details:
                    error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const action = body.action;

        // Apply authentication middleware
        const mockReq = {
            method: "POST",
            headers: Object.fromEntries(request.headers.entries()),
        };

        let middlewareError = null;
        const mockRes = {
            status: () => mockRes,
            json: (data: unknown) => data,
        };

        await new Promise<void>((resolve) => {
            middleware(mockReq, mockRes, (error?: unknown) => {
                middlewareError = error;
                resolve();
            });
        });

        if (middlewareError) {
            return NextResponse.json(
                { error: "Authentication failed" },
                { status: 401 }
            );
        }

        switch (action) {
            case "cleanup":
                const keepCompleted = body.keepCompleted || 100;
                const keepFailed = body.keepFailed || 50;
                const cleanupResult = await QueueMonitoring.cleanupOldJobs(
                    keepCompleted,
                    keepFailed
                );

                return NextResponse.json({
                    success: true,
                    action: "cleanup",
                    result: cleanupResult,
                    timestamp: new Date().toISOString(),
                });

            default:
                return NextResponse.json(
                    { error: "Unknown action", availableActions: ["cleanup"] },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error("Queue health action error:", error);
        return NextResponse.json(
            {
                error: "Action failed",
                details:
                    error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

function generateRecommendations(
    health: Awaited<ReturnType<typeof QueueMonitoring.getQueueHealth>>,
    performance: Awaited<
        ReturnType<typeof QueueMonitoring.getPerformanceMetrics>
    >
): string[] {
    const recommendations: string[] = [];

    // High error rate recommendations
    if (health.metrics.errorRate > 20) {
        recommendations.push(
            "🚨 High error rate detected. Review failed jobs and fix underlying issues."
        );
    } else if (health.metrics.errorRate > 10) {
        recommendations.push(
            "⚠️ Elevated error rate. Monitor failed jobs closely."
        );
    }

    // Queue length recommendations
    if (health.metrics.queueLength > 500) {
        recommendations.push(
            "📈 Very high queue length. Consider scaling workers or optimizing job processing."
        );
    } else if (health.metrics.queueLength > 100) {
        recommendations.push(
            "📊 High queue length. Monitor processing capacity."
        );
    }

    // Processing rate recommendations
    if (health.metrics.processingRate === 0 && health.metrics.queueLength > 0) {
        recommendations.push(
            "⏸️ No jobs processed recently. Check if workers are running."
        );
    } else if (
        health.metrics.processingRate < 5 &&
        health.metrics.queueLength > 50
    ) {
        recommendations.push(
            "🐌 Low processing rate with high queue length. Consider adding more workers."
        );
    }

    // Performance recommendations
    if (performance.avgProcessingTime > 30000) {
        // 30 seconds
        recommendations.push(
            "⏱️ High average processing time. Optimize job handlers or increase worker concurrency."
        );
    }

    if (performance.throughput < 1) {
        // Less than 1 job per minute
        recommendations.push(
            "📉 Low throughput detected. Review worker configuration and job complexity."
        );
    }

    // Old jobs recommendations
    if (
        health.metrics.oldestWaitingJob &&
        Date.now() - health.metrics.oldestWaitingJob > 600000
    ) {
        // 10 minutes
        recommendations.push(
            "⏰ Jobs waiting longer than 10 minutes. Check for processing bottlenecks."
        );
    }

    // General health recommendations
    if (health.status === "healthy" && recommendations.length === 0) {
        recommendations.push(
            "✅ Queue is healthy! Consider regular cleanup of old jobs to maintain performance."
        );
    }

    return recommendations;
}
