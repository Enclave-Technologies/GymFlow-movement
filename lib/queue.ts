import { Queue, Job } from "bullmq";
import { getRedisConnectionOptions } from "./redis-utils";
import { QueueMessage, QueueJobOptions } from "@/types/queue-types";

// Create the main queue instance with reasonable cleanup settings
export const messageQueue = new Queue("messageQueue", {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
            type: "exponential",
            delay: 2000,
        },
    },
});

// Queue management functions
export class QueueManager {
    static async addMessage(
        message: QueueMessage,
        options: QueueJobOptions = {}
    ): Promise<Job<QueueMessage>> {
        try {
            const job = await messageQueue.add(message.messageType, message, {
                delay: options.delay,
                attempts: options.attempts || 3,
                backoff: options.backoff,
                priority: options.priority,
                removeOnComplete: options.removeOnComplete || 100, // Keep 100 completed jobs
                removeOnFail: options.removeOnFail || 50, // Keep 50 failed jobs
            });

            console.log(
                `Job added to queue: ${job.id} (${message.messageType})`
            );
            return job;
        } catch (error) {
            console.error("Failed to add job to queue:", error);
            throw error;
        }
    }

    static async getQueueStats() {
        try {
            // Use getJobCounts() for efficient counting without loading all jobs into memory
            const jobCounts = await messageQueue.getJobCounts();

            return {
                waiting: jobCounts.waiting,
                active: jobCounts.active,
                completed: jobCounts.completed,
                failed: jobCounts.failed,
                total:
                    jobCounts.waiting +
                    jobCounts.active +
                    jobCounts.completed +
                    jobCounts.failed,
            };
        } catch (error) {
            console.error("Failed to get queue stats:", error);
            throw error;
        }
    }

    static async clearQueue() {
        try {
            await messageQueue.obliterate({ force: true });
            console.log("Queue cleared successfully");
        } catch (error) {
            console.error("Failed to clear queue:", error);
            throw error;
        }
    }

    static async getRecentJobs(limit: number = 10) {
        try {
            const completed = await messageQueue.getCompleted(0, limit - 1);
            const failed = await messageQueue.getFailed(0, limit - 1);
            const active = await messageQueue.getActive(0, limit - 1);
            const waiting = await messageQueue.getWaiting(0, limit - 1);

            return {
                completed: completed.map((job) => ({
                    id: job.id,
                    name: job.name,
                    data: job.data,
                    processedOn: job.processedOn,
                    finishedOn: job.finishedOn,
                })),
                failed: failed.map((job) => ({
                    id: job.id,
                    name: job.name,
                    data: job.data,
                    failedReason: job.failedReason,
                    processedOn: job.processedOn,
                    finishedOn: job.finishedOn,
                })),
                active: active.map((job) => ({
                    id: job.id,
                    name: job.name,
                    data: job.data,
                    processedOn: job.processedOn,
                })),
                waiting: waiting.map((job) => ({
                    id: job.id,
                    name: job.name,
                    data: job.data,
                    timestamp: job.timestamp,
                })),
            };
        } catch (error) {
            console.error("Failed to get recent jobs:", error);
            throw error;
        }
    }
}
