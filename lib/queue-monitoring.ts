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
            // Get job counts efficiently without loading all jobs into memory
            const jobCounts = await messageQueue.getJobCounts();

            const queueLength = jobCounts.waiting + jobCounts.active;
            const total =
                jobCounts.waiting +
                jobCounts.active +
                jobCounts.completed +
                jobCounts.failed;
            const errorRate = total > 0 ? (jobCounts.failed / total) * 100 : 0;

            // Get limited recent completed jobs for processing rate and time calculations
            const recentCompletedJobs = await messageQueue.getCompleted(0, 99); // Last 100 jobs max

            // Calculate processing rate (jobs per minute) from recent jobs
            const oneMinuteAgo = Date.now() - 60000;
            const recentCompleted = recentCompletedJobs.filter(
                (job) => job.finishedOn && job.finishedOn > oneMinuteAgo
            );
            const processingRate = recentCompleted.length;

            // Calculate average processing time from recent completed jobs
            const avgProcessingTime =
                recentCompleted.length > 0
                    ? recentCompleted.reduce((sum, job) => {
                          const processTime =
                              job.finishedOn! - job.processedOn!;
                          return sum + processTime;
                      }, 0) / recentCompleted.length
                    : 0;

            // Get oldest waiting job efficiently (just the first one)
            let oldestWaitingJob: number | undefined;
            if (jobCounts.waiting > 0) {
                const oldestWaitingJobs = await messageQueue.getWaiting(0, 0); // Get just the first waiting job
                if (oldestWaitingJobs.length > 0) {
                    oldestWaitingJob = oldestWaitingJobs[0].timestamp;
                }
            }

            const metrics = {
                waiting: jobCounts.waiting,
                active: jobCounts.active,
                completed: jobCounts.completed,
                failed: jobCounts.failed,
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

            // Get limited recent jobs instead of all jobs to reduce memory usage
            // For longer time ranges, we might miss some jobs, but this is a reasonable trade-off
            const maxJobsToFetch = Math.min(1000, timeRangeMinutes * 10); // Estimate ~10 jobs per minute max

            const [completed, failed] = await Promise.all([
                messageQueue.getCompleted(0, maxJobsToFetch - 1),
                messageQueue.getFailed(0, maxJobsToFetch - 1),
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
            const graceTime = 24 * 60 * 60 * 1000; // 24 hours

            // Get current counts before cleanup
            const beforeStats = await messageQueue.getJobCounts();
            console.log("Before cleanup:", beforeStats);

            try {
                // For completed jobs: calculate how many to remove
                // Get a sample of recent completed jobs to estimate old vs new
                const recentCompleted = await messageQueue.getCompleted(
                    0,
                    Math.min(beforeStats.completed, 1000)
                );
                const cutoffTime = Date.now() - graceTime;
                const oldCompletedCount = recentCompleted.filter(
                    (job) => job.finishedOn && job.finishedOn < cutoffTime
                ).length;

                // If we have more old jobs than we want to keep, calculate removal count
                const completedToRemove = Math.max(
                    oldCompletedCount - keepCompleted,
                    0
                );

                if (completedToRemove > 0) {
                    const completedCleaned = await messageQueue.clean(
                        graceTime, // 24 hours
                        completedToRemove, // Number to remove, not keep
                        "completed"
                    );
                    cleaned += completedCleaned.length || 0;
                    console.log(
                        `Cleaned ${
                            completedCleaned.length || 0
                        } completed jobs (wanted to remove ${completedToRemove})`
                    );
                } else {
                    console.log("No old completed jobs to clean");
                }
            } catch (error) {
                errors.push(`Failed to clean completed jobs: ${error}`);
            }

            try {
                // For failed jobs: calculate how many to remove
                const recentFailed = await messageQueue.getFailed(
                    0,
                    Math.min(beforeStats.failed, 1000)
                );
                const cutoffTime = Date.now() - graceTime;
                const oldFailedCount = recentFailed.filter(
                    (job) => job.finishedOn && job.finishedOn < cutoffTime
                ).length;

                const failedToRemove = Math.max(oldFailedCount - keepFailed, 0);

                if (failedToRemove > 0) {
                    const failedCleaned = await messageQueue.clean(
                        graceTime, // 24 hours
                        failedToRemove, // Number to remove, not keep
                        "failed"
                    );
                    cleaned += failedCleaned.length || 0;
                    console.log(
                        `Cleaned ${
                            failedCleaned.length || 0
                        } failed jobs (wanted to remove ${failedToRemove})`
                    );
                } else {
                    console.log("No old failed jobs to clean");
                }
            } catch (error) {
                errors.push(`Failed to clean failed jobs: ${error}`);
            }

            // For active jobs: remove ALL old ones (stalled jobs should not remain active)
            try {
                const activeCleaned = await messageQueue.clean(
                    graceTime, // 24 hours
                    1000, // Remove up to 1000 old active jobs (should be very few)
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
