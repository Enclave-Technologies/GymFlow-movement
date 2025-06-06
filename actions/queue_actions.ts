"use server";

import { QueueManager } from "@/lib/queue";
import { QueueMonitoring } from "@/lib/queue-monitoring";
import {
    QueueMessage,
    QueueJobOptions,
    ExerciseChanges,
    UserActionPayload,
    EmailTemplateData,
} from "@/types/queue-types";
import { revalidatePath } from "next/cache";

/**
 * Server action to add a job to the queue
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

        // Add job to queue
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
) {
    try {
        // Get basic queue statistics
        const stats = await QueueManager.getQueueStats();

        let response: any = {
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
    payload: Record<string, any> = {}
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
 * Server action to cleanup old jobs
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
