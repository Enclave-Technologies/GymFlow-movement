import { Worker, Job } from "bullmq";
import { getRedisConnectionOptions } from "./redis-utils";
import {
    QueueMessage,
    QueueJobResult,
    WorkoutUpdateMessage,
    UserActionMessage,
    NotificationMessage,
    EmailMessage,
    DataSyncMessage,
    TestMessage,
} from "@/types/queue-types";

// Message processors
class MessageProcessors {
    static async processWorkoutUpdate(
        message: WorkoutUpdateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing workout update:", message.data);

        try {
            // TODO: Implement actual workout update logic
            // This would typically involve database updates

            // Simulate processing time
            await new Promise((resolve) => setTimeout(resolve, 1000));

            return {
                success: true,
                message: "Workout update processed successfully",
                data: {
                    exercisePlanId: message.data.exercisePlanId,
                    updatedFieldsCount: Object.keys(message.data.changes)
                        .length,
                },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process workout update",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processUserAction(
        message: UserActionMessage
    ): Promise<QueueJobResult> {
        console.log("Processing user action:", message.data);

        try {
            // TODO: Implement actual user action logic
            // This could involve logging, analytics, notifications, etc.

            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "User action processed successfully",
                data: {
                    action: message.data.action,
                    entityType: message.data.entityType,
                    entityId: message.data.entityId,
                },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process user action",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processNotification(
        message: NotificationMessage
    ): Promise<QueueJobResult> {
        console.log("Processing notification:", message.data);

        try {
            // TODO: Implement actual notification logic
            // This could involve push notifications, in-app notifications, etc.

            await new Promise((resolve) => setTimeout(resolve, 300));

            return {
                success: true,
                message: "Notification processed successfully",
                data: {
                    recipientId: message.data.recipientId,
                    type: message.data.type,
                    title: message.data.title,
                },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process notification",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processEmail(message: EmailMessage): Promise<QueueJobResult> {
        console.log("Processing email:", message.data);

        try {
            // TODO: Implement actual email sending logic
            // This would typically involve an email service like SendGrid, SES, etc.

            await new Promise((resolve) => setTimeout(resolve, 2000));

            return {
                success: true,
                message: "Email processed successfully",
                data: {
                    to: message.data.to,
                    subject: message.data.subject,
                    template: message.data.template,
                },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process email",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processDataSync(
        message: DataSyncMessage
    ): Promise<QueueJobResult> {
        console.log("Processing data sync:", message.data);

        try {
            // TODO: Implement actual data sync logic
            // This could involve backups, exports, imports, etc.

            await new Promise((resolve) => setTimeout(resolve, 5000));

            return {
                success: true,
                message: "Data sync processed successfully",
                data: {
                    syncType: message.data.syncType,
                    entityType: message.data.entityType,
                    entityCount: message.data.entityIds.length,
                },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process data sync",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processTest(message: TestMessage): Promise<QueueJobResult> {
        console.log("Processing test message:", message.data);

        try {
            // Simulate some processing
            await new Promise((resolve) => setTimeout(resolve, 1000));

            return {
                success: true,
                message: "Test message processed successfully",
                data: {
                    testType: message.data.testType,
                    payloadSize: Object.keys(message.data.payload).length,
                    processedBy: "queue-worker",
                },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process test message",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }
}

// Main job processor
async function processJob(job: Job<QueueMessage>): Promise<QueueJobResult> {
    const message = job.data;

    console.log(`Processing job ${job.id}: ${message.messageType}`);

    try {
        let result: QueueJobResult;

        switch (message.messageType) {
            case "WORKOUT_UPDATE":
                result = await MessageProcessors.processWorkoutUpdate(
                    message as WorkoutUpdateMessage
                );
                break;
            case "USER_ACTION":
                result = await MessageProcessors.processUserAction(
                    message as UserActionMessage
                );
                break;
            case "NOTIFICATION":
                result = await MessageProcessors.processNotification(
                    message as NotificationMessage
                );
                break;
            case "EMAIL":
                result = await MessageProcessors.processEmail(
                    message as EmailMessage
                );
                break;
            case "DATA_SYNC":
                result = await MessageProcessors.processDataSync(
                    message as DataSyncMessage
                );
                break;
            case "TEST":
                result = await MessageProcessors.processTest(
                    message as TestMessage
                );
                break;
            default:
                throw new Error(
                    `Unknown message type: ${
                        (message as QueueMessage).messageType
                    }`
                );
        }

        console.log(`Job ${job.id} completed:`, result);
        return result;
    } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        throw error;
    }
}

// Get Redis connection options dynamically
const connectionOptions = getRedisConnectionOptions();

// Create and export the worker
export const messageWorker = new Worker("messageQueue", processJob, {
    connection: connectionOptions,
    concurrency: 5, // Process up to 5 jobs concurrently
});

// Worker event handlers
messageWorker.on("completed", (job, result) => {
    console.log(`✅ Job ${job.id} completed successfully:`, result);
});

messageWorker.on("failed", (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
});

messageWorker.on("error", (err) => {
    console.error("❌ Worker error:", err);
});

messageWorker.on("ready", () => {
    console.log("🔄 Worker is ready and waiting for jobs");
});

messageWorker.on("active", (job) => {
    console.log(`🔄 Job ${job.id} is now active`);
});

messageWorker.on("stalled", (jobId) => {
    console.log(`⚠️ Job ${jobId} stalled`);
});

messageWorker.on("progress", (job, progress) => {
    console.log(`📊 Job ${job.id} progress: ${progress}%`);
});

console.log("🚀 Message queue worker started");
console.log("🔗 Redis connection:", connectionOptions);
