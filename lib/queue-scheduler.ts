/**
 * Queue Scheduler - Automatic cleanup and maintenance
 *
 * This module provides scheduled cleanup to ensure Redis memory doesn't grow indefinitely
 */

import { messageQueue } from "./queue";
import { QueueMonitoring } from "./queue-monitoring";

class QueueScheduler {
    private cleanupInterval: NodeJS.Timeout | null = null;
    private isRunning = false;

    /**
     * Start the automatic cleanup scheduler
     * @param intervalMinutes How often to run cleanup (default: 30 minutes)
     */
    start(intervalMinutes: number = 30) {
        if (this.isRunning) {
            console.log("⚠️ Queue scheduler is already running");
            return;
        }

        console.log(
            `🕐 Starting queue scheduler (cleanup every ${intervalMinutes} minutes)`
        );

        this.isRunning = true;

        // Run cleanup immediately
        this.performScheduledCleanup();

        // Schedule regular cleanup
        this.cleanupInterval = setInterval(() => {
            this.performScheduledCleanup();
        }, intervalMinutes * 60 * 1000);
    }

    /**
     * Stop the automatic cleanup scheduler
     */
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.isRunning = false;
        console.log("🛑 Queue scheduler stopped");
    }

    /**
     * Perform scheduled cleanup
     */
    private async performScheduledCleanup() {
        try {
            console.log("🧹 Starting scheduled queue cleanup...");

            // Get stats before cleanup
            const beforeStats = await messageQueue.getJobCounts();
            const totalBefore = Object.values(beforeStats).reduce(
                (a, b) => a + b,
                0
            );

            console.log(`📊 Jobs before cleanup: ${totalBefore}`, beforeStats);

            // Perform standard cleanup
            const result = await QueueMonitoring.cleanupOldJobs(100, 50); // Keep 100 completed, 50 failed

            // Get stats after cleanup
            const afterStats = await messageQueue.getJobCounts();
            const totalAfter = Object.values(afterStats).reduce(
                (a, b) => a + b,
                0
            );

            console.log(`📊 Jobs after cleanup: ${totalAfter}`, afterStats);
            console.log(
                `✅ Scheduled cleanup completed. Cleaned ${
                    totalBefore - totalAfter
                } jobs`
            );

            if (result.errors.length > 0) {
                console.log("⚠️ Cleanup errors:", result.errors);
            }

            // If we still have too many jobs, do more aggressive cleanup
            if (totalAfter > 500) {
                console.log(
                    "⚠️ Still too many jobs, performing more aggressive cleanup..."
                );
                await this.performUltraAggressiveCleanup();
            }
        } catch (error) {
            console.error("❌ Scheduled cleanup failed:", error);
        }
    }

    /**
     * More aggressive cleanup when normal cleanup isn't enough
     */
    private async performUltraAggressiveCleanup() {
        try {
            // Clean everything older than 12 hours (more reasonable)
            const completedCleaned = await messageQueue.clean(
                12 * 60 * 60 * 1000, // 12 hours
                50, // Keep 50 completed jobs
                "completed"
            );

            const failedCleaned = await messageQueue.clean(
                12 * 60 * 60 * 1000, // 12 hours
                25, // Keep 25 failed jobs
                "failed"
            );

            const activeCleaned = await messageQueue.clean(
                12 * 60 * 60 * 1000, // 12 hours
                0, // Keep 0 old active jobs
                "active"
            );

            console.log(
                `🔥 More aggressive cleanup: ${
                    completedCleaned.length +
                    failedCleaned.length +
                    activeCleaned.length
                } jobs cleaned`
            );
        } catch (error) {
            console.error("❌ More aggressive cleanup failed:", error);
        }
    }

    /**
     * Get scheduler status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            hasInterval: this.cleanupInterval !== null,
        };
    }
}

// Export singleton instance
export const queueScheduler = new QueueScheduler();

// Auto-start in production or when explicitly enabled
if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_QUEUE_SCHEDULER === "true"
) {
    console.log("🚀 Auto-starting queue scheduler...");
    queueScheduler.start(15); // Every 15 minutes in production
} else {
    console.log(
        "💡 Queue scheduler not auto-started. Set ENABLE_QUEUE_SCHEDULER=true to enable."
    );
}
