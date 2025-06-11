/**
 * Queue Status Checker
 *
 * Utility functions to check the status of the queue system
 * and help debug queue-related issues.
 */

// import { messageQueue } from "./queue";
import { QueueManager } from "./queue";
import { QueueMessage, QueueStats } from "@/types/queue-types";

// Type definitions for better type safety
interface RecentJobs {
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
}

interface QueueStatusSuccess {
    success: true;
    stats: QueueStats;
    recentJobs: RecentJobs;
    timestamp: string;
}

interface QueueStatusError {
    success: false;
    error: string;
    timestamp: string;
}

type QueueStatusResponse = QueueStatusSuccess | QueueStatusError;

export class QueueStatus {
    /**
     * Get comprehensive queue status
     */
    static async getStatus(): Promise<QueueStatusResponse> {
        try {
            const stats = await QueueManager.getQueueStats();
            const recentJobs = await QueueManager.getRecentJobs(5);

            return {
                success: true,
                stats,
                recentJobs,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            };
        }
    }

    /**
     * Check if queue is healthy and processing jobs
     */
    static async isHealthy() {
        try {
            const stats = await QueueManager.getQueueStats();

            // Queue is healthy if:
            // 1. We can get stats (Redis connection works)
            // 2. There are no stuck jobs (active jobs should be processing)
            // 3. Failed jobs are not accumulating excessively

            const isHealthy = stats.failed < 10; // Less than 10 failed jobs

            return {
                healthy: isHealthy,
                stats,
                issues: isHealthy ? [] : ["Too many failed jobs"],
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                healthy: false,
                stats: null,
                issues: ["Cannot connect to queue"],
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            };
        }
    }

    /**
     * Add a test job to verify queue is working
     */
    static async addTestJob() {
        try {
            const testMessage = {
                messageType: "TEST" as const,
                timestamp: new Date().toISOString(),
                userId: "test-user",
                metadata: {
                    source: "queue-status-checker",
                    updateType: "test",
                },
                data: {
                    testType: "status-check",
                    payload: {
                        field: "test",
                        oldValue: "before",
                        newValue: "after",
                    },
                },
            };

            const job = await QueueManager.addMessage(testMessage);

            return {
                success: true,
                jobId: job.id,
                message: "Test job added successfully",
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            };
        }
    }

    /**
     * Log queue status to console (useful for debugging)
     */
    static async logStatus() {
        console.log("🔍 Checking queue status...");

        const status = await this.getStatus();

        if (status.success) {
            console.log("📊 Queue Stats:", status.stats);
            console.log("📝 Recent Jobs:", {
                completed: status.recentJobs.completed.length,
                failed: status.recentJobs.failed.length,
                active: status.recentJobs.active.length,
                waiting: status.recentJobs.waiting.length,
            });
        } else {
            console.error("❌ Queue Status Error:", status.error);
        }

        const health = await this.isHealthy();
        console.log(
            "💚 Queue Health:",
            health.healthy ? "HEALTHY" : "UNHEALTHY"
        );

        if (!health.healthy) {
            console.log("⚠️ Issues:", health.issues);
        }
    }
}
