/**
 * Queue Monitoring Setup
 *
 * This file sets up Bull Board dashboard for monitoring BullMQ queues
 * and provides additional monitoring utilities.
 */

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Request, Response, NextFunction } from "express";
import { messageQueue } from "./queue";
import { QueueStats } from "@/types/queue-types";

// Create the Bull Board server adapter
export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/api/admin/queue-dashboard");

// Create the Bull Board instance
export const bullBoard = createBullBoard({
    queues: [new BullMQAdapter(messageQueue)],
    serverAdapter: serverAdapter,
});

/**
 * Enhanced queue monitoring utilities
 */
export class QueueMonitoring {
    /**
     * Get comprehensive queue health metrics
     */
    static async getQueueHealth(): Promise<{
        status: "healthy" | "warning" | "critical";
        metrics: QueueStats & {
            processingRate: number;
            avgProcessingTime: number;
            errorRate: number;
            queueLength: number;
            oldestWaitingJob?: number;
        };
        alerts: string[];
    }> {
        try {
            const [waiting, active, completed, failed] = await Promise.all([
                messageQueue.getWaiting(),
                messageQueue.getActive(),
                messageQueue.getCompleted(),
                messageQueue.getFailed(),
            ]);

            const queueLength = waiting.length + active.length;
            const total =
                waiting.length +
                active.length +
                completed.length +
                failed.length;
            const errorRate = total > 0 ? (failed.length / total) * 100 : 0;

            // Calculate processing rate (jobs per minute)
            const recentCompleted = completed.filter(
                (job) => job.finishedOn && Date.now() - job.finishedOn < 60000
            );
            const processingRate = recentCompleted.length;

            // Calculate average processing time
            const avgProcessingTime =
                recentCompleted.length > 0
                    ? recentCompleted.reduce((sum, job) => {
                          const processTime =
                              job.finishedOn! - job.processedOn!;
                          return sum + processTime;
                      }, 0) / recentCompleted.length
                    : 0;

            // Find oldest waiting job
            const oldestWaitingJob =
                waiting.length > 0
                    ? Math.min(...waiting.map((job) => job.timestamp))
                    : undefined;

            const metrics = {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                total,
                processingRate,
                avgProcessingTime,
                errorRate,
                queueLength,
                oldestWaitingJob,
            };

            // Determine health status and generate alerts
            const alerts: string[] = [];
            let status: "healthy" | "warning" | "critical" = "healthy";

            // Check for critical conditions
            if (errorRate > 50) {
                status = "critical";
                alerts.push(`High error rate: ${errorRate.toFixed(1)}%`);
            }

            if (queueLength > 1000) {
                status = "critical";
                alerts.push(`Queue length is very high: ${queueLength} jobs`);
            }

            if (oldestWaitingJob && Date.now() - oldestWaitingJob > 300000) {
                // 5 minutes
                status = status === "critical" ? "critical" : "warning";
                alerts.push("Jobs waiting longer than 5 minutes");
            }

            // Check for warning conditions
            if (status === "healthy") {
                if (errorRate > 10) {
                    status = "warning";
                    alerts.push(
                        `Elevated error rate: ${errorRate.toFixed(1)}%`
                    );
                }

                if (queueLength > 100) {
                    status = "warning";
                    alerts.push(`Queue length is high: ${queueLength} jobs`);
                }

                if (processingRate === 0 && queueLength > 0) {
                    status = "warning";
                    alerts.push("No jobs processed in the last minute");
                }
            }

            return {
                status,
                metrics,
                alerts,
            };
        } catch (error) {
            console.error("Error getting queue health:", error);
            return {
                status: "critical",
                metrics: {
                    waiting: 0,
                    active: 0,
                    completed: 0,
                    failed: 0,
                    total: 0,
                    processingRate: 0,
                    avgProcessingTime: 0,
                    errorRate: 0,
                    queueLength: 0,
                },
                alerts: ["Failed to retrieve queue metrics"],
            };
        }
    }

    /**
     * Get queue performance metrics over time
     */
    static async getPerformanceMetrics(timeRangeMinutes: number = 60): Promise<{
        jobsProcessed: number;
        jobsFailed: number;
        avgProcessingTime: number;
        throughput: number;
        peakQueueLength: number;
    }> {
        try {
            const cutoffTime = Date.now() - timeRangeMinutes * 60 * 1000;

            const [completed, failed] = await Promise.all([
                messageQueue.getCompleted(),
                messageQueue.getFailed(),
            ]);

            const recentCompleted = completed.filter(
                (job) => job.finishedOn && job.finishedOn > cutoffTime
            );

            const recentFailed = failed.filter(
                (job) => job.finishedOn && job.finishedOn > cutoffTime
            );

            const avgProcessingTime =
                recentCompleted.length > 0
                    ? recentCompleted.reduce((sum, job) => {
                          const processTime =
                              job.finishedOn! - job.processedOn!;
                          return sum + processTime;
                      }, 0) / recentCompleted.length
                    : 0;

            const throughput =
                (recentCompleted.length + recentFailed.length) /
                timeRangeMinutes;

            return {
                jobsProcessed: recentCompleted.length,
                jobsFailed: recentFailed.length,
                avgProcessingTime,
                throughput,
                peakQueueLength: 0, // This would require historical data tracking
            };
        } catch (error) {
            console.error("Error getting performance metrics:", error);
            return {
                jobsProcessed: 0,
                jobsFailed: 0,
                avgProcessingTime: 0,
                throughput: 0,
                peakQueueLength: 0,
            };
        }
    }

    /**
     * Get failed jobs with details for debugging
     */
    static async getFailedJobsDetails(limit: number = 10) {
        try {
            const failed = await messageQueue.getFailed(0, limit - 1);

            return failed.map((job) => ({
                id: job.id,
                name: job.name,
                data: job.data,
                failedReason: job.failedReason,
                stacktrace: job.stacktrace,
                attemptsMade: job.attemptsMade,
                timestamp: job.timestamp,
                processedOn: job.processedOn,
                finishedOn: job.finishedOn,
            }));
        } catch (error) {
            console.error("Error getting failed jobs:", error);
            return [];
        }
    }

    /**
     * Clean up old completed and failed jobs
     */
    static async cleanupOldJobs(
        keepCompleted: number = 100,
        keepFailed: number = 50
    ): Promise<{ cleaned: number; errors: string[] }> {
        try {
            const errors: string[] = [];
            let cleaned = 0;

            // Get current counts before cleanup
            const beforeStats = await messageQueue.getJobCounts();
            console.log("Before cleanup:", beforeStats);

            try {
                // Clean completed jobs older than 24 hours
                const completedCleaned = await messageQueue.clean(
                    24 * 60 * 60 * 1000, // 24 hours
                    keepCompleted,
                    "completed"
                );
                cleaned += completedCleaned.length || 0;
                console.log(
                    `Cleaned ${completedCleaned.length || 0} completed jobs`
                );
            } catch (error) {
                errors.push(`Failed to clean completed jobs: ${error}`);
            }

            try {
                // Clean failed jobs older than 24 hours
                const failedCleaned = await messageQueue.clean(
                    24 * 60 * 60 * 1000, // 24 hours
                    keepFailed,
                    "failed"
                );
                cleaned += failedCleaned.length || 0;
                console.log(`Cleaned ${failedCleaned.length || 0} failed jobs`);
            } catch (error) {
                errors.push(`Failed to clean failed jobs: ${error}`);
            }

            // Also clean active jobs that might be stalled (older than 24 hours)
            try {
                const activeCleaned = await messageQueue.clean(
                    24 * 60 * 60 * 1000, // 24 hours
                    0, // Keep 0 old active jobs
                    "active"
                );
                cleaned += activeCleaned.length || 0;
                console.log(
                    `Cleaned ${activeCleaned.length || 0} stalled active jobs`
                );
            } catch (error) {
                errors.push(`Failed to clean stalled active jobs: ${error}`);
            }

            // Get counts after cleanup
            const afterStats = await messageQueue.getJobCounts();
            console.log("After cleanup:", afterStats);

            return { cleaned, errors };
        } catch (error) {
            console.error("Error cleaning up jobs:", error);
            return { cleaned: 0, errors: [`Cleanup failed: ${error}`] };
        }
    }
}

/**
 * Monitoring middleware for access control
 */
export function createMonitoringMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
        // In production, add authentication/authorization here
        if (process.env.NODE_ENV === "production") {
            // Example: Check for admin role or API key
            const authHeader = req.headers.authorization;
            const adminKey = process.env.QUEUE_ADMIN_KEY;

            if (
                !authHeader ||
                !adminKey ||
                authHeader !== `Bearer ${adminKey}`
            ) {
                return res.status(401).json({ error: "Unauthorized" });
            }
        }

        next();
    };
}
