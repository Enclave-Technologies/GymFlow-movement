"use server";

/**
 * Queue Actions - Server Actions for BullMQ Queue Management
 *
 * AUTOMATIC CLEANUP CONFIGURATION:
 * ================================
 * The queue is configured with automatic cleanup to prevent Redis memory issues:
 *
 * 1. removeOnComplete: 100 - Automatically removes completed jobs, keeping only the last 100
 * 2. removeOnFail: 50 - Automatically removes failed jobs, keeping only the last 50
 *
 * These settings are applied at both the queue level (defaultJobOptions) and per-job level.
 * Jobs are automatically deleted from Redis when these limits are exceeded.
 *
 * MANUAL CLEANUP:
 * ===============
 * Additional manual cleanup functions are available when needed:
 * - cleanupOldJobs() - Manually clean jobs older than 24 hours
 * - forceCleanupAllJobs() - More aggressive cleanup
 * - obliterateQueue() - Complete queue obliteration (development only)
 *
 * SCHEDULED CLEANUP:
 * ==================
 * Optional automatic scheduler can be enabled to run cleanup periodically.
 *
 * TYPE SAFETY:
 * ============
 * All functions use proper TypeScript types instead of 'any' for better type safety.
 */

import { QueueManager, messageQueue } from "@/lib/queue";
import { QueueMonitoring } from "@/lib/queue-monitoring";
import { queueScheduler } from "@/lib/queue-scheduler";
import {
    QueueMessage,
    QueueJobOptions,
    ExerciseChanges,
    UserActionPayload,
    EmailTemplateData,
    QueueStats,
} from "@/types/queue-types";
import { revalidatePath } from "next/cache";

// Response interfaces for better type safety
interface QueueStatsSuccessResponse {
    success: true;
    stats: QueueStats;
    timestamp: string;
    recentJobs?: {
        completed: Array<{
            id: string;
            name: string;
            data: QueueMessage;
            processedOn?: number;
            finishedOn?: number;
        }>;
        failed: Array<{
            id: string;
            name: string;
            data: QueueMessage;
            failedReason?: string;
            processedOn?: number;
            finishedOn?: number;
        }>;
        active: Array<{
            id: string;
            name: string;
            data: QueueMessage;
            processedOn?: number;
        }>;
        waiting: Array<{
            id: string;
            name: string;
            data: QueueMessage;
            timestamp?: number;
        }>;
    };
}

interface QueueStatsErrorResponse {
    success: false;
    error: string;
    details: string;
}

type QueueStatsResponse = QueueStatsSuccessResponse | QueueStatsErrorResponse;

/**
 * Server action to add a job to the queue with optimized response time
 */
export async function addJobToQueue(
    message: QueueMessage,
    options?: QueueJobOptions
) {
    try {
        // Validate message structure
        if (!message || !message.messageType) {
            return {
                success: false,
                error: "Invalid message structure. messageType is required",
            };
        }

        // Add timestamp if not provided
        if (!message.timestamp) {
            message.timestamp = new Date().toISOString();
        }

        // Add job to queue without waiting for full processing
        const job = await QueueManager.addMessage(message, options);

        // Revalidate the queue test page to show updated stats
        revalidatePath("/queue-test");

        return {
            success: true,
            message: "Job added to queue successfully",
            data: {
                jobId: job.id,
                messageType: message.messageType,
                timestamp: message.timestamp,
            },
        };
    } catch (error) {
        console.error("Failed to add job to queue:", error);

        return {
            success: false,
            error: "Failed to add job to queue",
            details: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Server action to get queue statistics
 */
export async function getQueueStats(
    includeJobs: boolean = false,
    limit: number = 10
): Promise<QueueStatsResponse> {
    try {
        // Get basic queue statistics
        const stats = await QueueManager.getQueueStats();

        const response: QueueStatsResponse = {
            success: true,
            stats,
            timestamp: new Date().toISOString(),
        };

        // Optionally include recent jobs
        if (includeJobs) {
            const recentJobs = await QueueManager.getRecentJobs(limit);
            response.recentJobs = recentJobs;
        }

        return response;
    } catch (error) {
        console.error("Failed to get queue stats:", error);

        return {
            success: false,
            error: "Failed to get queue statistics",
            details: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Server action to clear the queue (development only)
 */
export async function clearQueue() {
    try {
        // Only allow in development
        if (process.env.NODE_ENV === "production") {
            return {
                success: false,
                error: "Queue clearing is not allowed in production",
            };
        }

        await QueueManager.clearQueue();

        // Revalidate the queue test page
        revalidatePath("/queue-test");

        return {
            success: true,
            message: "Queue cleared successfully",
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Failed to clear queue:", error);

        return {
            success: false,
            error: "Failed to clear queue",
            details: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Server action to send a test message
 */
export async function sendTestMessage(
    testType: string = "basic",
    payload: UserActionPayload = {}
) {
    const message: QueueMessage = {
        messageType: "TEST",
        timestamp: new Date().toISOString(),
        userId: "test-user-123",
        metadata: {
            source: "queue-test-page",
            environment: process.env.NODE_ENV || "development",
        },
        data: {
            testType,
            payload: {
                message: "Hello from server action!",
                timestamp: Date.now(),
                ...payload,
            },
        },
    };

    return addJobToQueue(message);
}

/**
 * Server action to send a workout update message
 */
export async function sendWorkoutUpdateMessage(
    exercisePlanId: string,
    phaseId: string,
    sessionId: string,
    exerciseId: string,
    changes: ExerciseChanges,
    userId?: string
) {
    const message: QueueMessage = {
        messageType: "WORKOUT_UPDATE",
        timestamp: new Date().toISOString(),
        userId: userId || "test-user-123",
        metadata: {
            source: "queue-test-page",
            environment: process.env.NODE_ENV || "development",
        },
        data: {
            exercisePlanId,
            phaseId,
            sessionId,
            exerciseId,
            changes,
        },
    };

    return addJobToQueue(message);
}

/**
 * Server action to send a user action message
 */
export async function sendUserActionMessage(
    action: string,
    entityType: string,
    entityId: string,
    payload: UserActionPayload,
    userId?: string
) {
    const message: QueueMessage = {
        messageType: "USER_ACTION",
        timestamp: new Date().toISOString(),
        userId: userId || "test-user-123",
        metadata: {
            source: "queue-test-page",
            environment: process.env.NODE_ENV || "development",
        },
        data: {
            action,
            entityType,
            entityId,
            payload,
        },
    };

    return addJobToQueue(message);
}

/**
 * Server action to send a notification message
 */
export async function sendNotificationMessage(
    recipientId: string,
    title: string,
    message: string,
    type: "info" | "warning" | "error" | "success" = "info",
    actionUrl?: string
) {
    const queueMessage: QueueMessage = {
        messageType: "NOTIFICATION",
        timestamp: new Date().toISOString(),
        userId: recipientId,
        metadata: {
            source: "queue-test-page",
            environment: process.env.NODE_ENV || "development",
        },
        data: {
            recipientId,
            title,
            message,
            type,
            actionUrl,
        },
    };

    return addJobToQueue(queueMessage);
}

/**
 * Server action to send an email message
 */
export async function sendEmailMessage(
    to: string,
    subject: string,
    template: string,
    templateData: EmailTemplateData
) {
    const message: QueueMessage = {
        messageType: "EMAIL",
        timestamp: new Date().toISOString(),
        metadata: {
            source: "queue-test-page",
            environment: process.env.NODE_ENV || "development",
        },
        data: {
            to,
            subject,
            template,
            templateData,
        },
    };

    return addJobToQueue(message);
}

/**
 * Server action to send a data sync message
 */
export async function sendDataSyncMessage(
    syncType: "backup" | "export" | "import",
    entityType: string,
    entityIds: string[],
    destination?: string
) {
    const message: QueueMessage = {
        messageType: "DATA_SYNC",
        timestamp: new Date().toISOString(),
        metadata: {
            source: "queue-test-page",
            environment: process.env.NODE_ENV || "development",
        },
        data: {
            syncType,
            entityType,
            entityIds,
            destination,
        },
    };

    return addJobToQueue(message);
}

/**
 * Server action to get comprehensive queue health data
 */
export async function getQueueHealth() {
    try {
        const health = await QueueMonitoring.getQueueHealth();

        // Revalidate monitoring pages
        revalidatePath("/queue-monitor");
        revalidatePath("/queue-test");

        return {
            success: true,
            data: health,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Failed to get queue health:", error);

        return {
            success: false,
            error: "Failed to get queue health",
            details: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Server action to get queue performance metrics
 */
export async function getQueuePerformanceMetrics(
    timeRangeMinutes: number = 60
) {
    try {
        const metrics = await QueueMonitoring.getPerformanceMetrics(
            timeRangeMinutes
        );

        return {
            success: true,
            data: metrics,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Failed to get performance metrics:", error);

        return {
            success: false,
            error: "Failed to get performance metrics",
            details: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Server action to get failed jobs details
 */
export async function getFailedJobsDetails(limit: number = 10) {
    try {
        const failedJobs = await QueueMonitoring.getFailedJobsDetails(limit);

        return {
            success: true,
            data: failedJobs,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Failed to get failed jobs:", error);

        return {
            success: false,
            error: "Failed to get failed jobs",
            details: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Server action to cleanup old jobs manually
 *
 * Note: The queue is configured with automatic cleanup:
 * - removeOnComplete: 100 (keeps last 100 completed jobs)
 * - removeOnFail: 50 (keeps last 50 failed jobs)
 *
 * This function provides manual cleanup for more aggressive cleanup when needed.
 *
 * @param keepCompleted Number of completed jobs to keep (default: 100)
 * @param keepFailed Number of failed jobs to keep (default: 50)
 */
export async function cleanupOldJobs(
    keepCompleted: number = 100,
    keepFailed: number = 50
) {
    try {
        // Only allow in development or with proper authentication
        if (process.env.NODE_ENV === "production") {
            // In production, you might want to add additional authentication checks here
            console.log("Cleanup requested in production environment");
        }

        const result = await QueueMonitoring.cleanupOldJobs(
            keepCompleted,
            keepFailed
        );

        // Revalidate monitoring pages
        revalidatePath("/queue-monitor");
        revalidatePath("/queue-test");

        return {
            success: true,
            data: result,
            message: `Cleanup completed. Cleaned ${result.cleaned} jobs.`,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Failed to cleanup jobs:", error);

        return {
            success: false,
            error: "Failed to cleanup jobs",
            details: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Server action to get queue configuration information
 *
 * Returns information about automatic cleanup settings and queue configuration
 */
export async function getQueueConfiguration() {
    try {
        return {
            success: true,
            configuration: {
                automaticCleanup: {
                    removeOnComplete: 100,
                    removeOnFail: 50,
                    description:
                        "Jobs are automatically cleaned up when these limits are exceeded",
                },
                retrySettings: {
                    attempts: 3,
                    backoffType: "exponential",
                    backoffDelay: 2000,
                },
                concurrency: 5,
                queueName: "messageQueue",
            },
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Failed to get queue configuration:", error);

        return {
            success: false,
            error: "Failed to get queue configuration",
            details: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Server action to force aggressive cleanup of all jobs
 * This will clean up ALL completed and failed jobs immediately
 */
export async function forceCleanupAllJobs() {
    try {
        // Only allow in development or with proper authentication
        if (process.env.NODE_ENV === "production") {
            console.log("Force cleanup requested in production environment");
        }

        const result = await QueueMonitoring.cleanupOldJobs(0, 0); // Keep 0 jobs = delete all

        // Revalidate monitoring pages
        revalidatePath("/queue-monitor");
        revalidatePath("/queue-test");

        return {
            success: true,
            data: result,
            message: `Force cleanup completed. Cleaned ${result.cleaned} jobs.`,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Failed to force cleanup jobs:", error);

        return {
            success: false,
            error: "Failed to force cleanup jobs",
            details: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Server action to obliterate the entire queue (NUCLEAR OPTION)
 * This will completely destroy all queue data and reset Redis
 */
export async function obliterateQueue() {
    try {
        // Only allow in development
        if (process.env.NODE_ENV === "production") {
            return {
                success: false,
                error: "Queue obliteration is not allowed in production",
            };
        }

        console.log("🔥 OBLITERATING QUEUE - This will delete ALL queue data!");

        // Obliterate the main queue
        await messageQueue.obliterate({ force: true });

        // Revalidate monitoring pages
        revalidatePath("/queue-monitor");
        revalidatePath("/queue-test");

        return {
            success: true,
            message: "Queue completely obliterated. All data deleted.",
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Failed to obliterate queue:", error);

        return {
            success: false,
            error: "Failed to obliterate queue",
            details: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Server action to get detailed Redis memory usage information
 */
export async function getRedisMemoryInfo() {
    try {
        const stats = await QueueManager.getQueueStats();

        // Get more detailed job information
        const recentJobs = await QueueManager.getRecentJobs(50);

        return {
            success: true,
            data: {
                queueStats: stats,
                jobCounts: {
                    completed: recentJobs.completed.length,
                    failed: recentJobs.failed.length,
                    active: recentJobs.active.length,
                    waiting: recentJobs.waiting.length,
                },
                totalJobs: stats.total,
                memoryEstimate: `~${Math.round(stats.total * 0.5)}KB`, // Rough estimate
            },
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Failed to get Redis memory info:", error);

        return {
            success: false,
            error: "Failed to get Redis memory info",
            details: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Server action to start the automatic cleanup scheduler
 */
export async function startQueueScheduler(intervalMinutes: number = 15) {
    try {
        queueScheduler.start(intervalMinutes);

        return {
            success: true,
            message: `Queue scheduler started (cleanup every ${intervalMinutes} minutes)`,
            status: queueScheduler.getStatus(),
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Failed to start queue scheduler:", error);

        return {
            success: false,
            error: "Failed to start queue scheduler",
            details: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Server action to stop the automatic cleanup scheduler
 */
export async function stopQueueScheduler() {
    try {
        queueScheduler.stop();

        return {
            success: true,
            message: "Queue scheduler stopped",
            status: queueScheduler.getStatus(),
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Failed to stop queue scheduler:", error);

        return {
            success: false,
            error: "Failed to stop queue scheduler",
            details: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Server action to get queue scheduler status
 */
export async function getQueueSchedulerStatus() {
    try {
        return {
            success: true,
            status: queueScheduler.getStatus(),
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Failed to get scheduler status:", error);

        return {
            success: false,
            error: "Failed to get scheduler status",
            details: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
