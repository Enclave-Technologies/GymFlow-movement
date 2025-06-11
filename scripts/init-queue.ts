#!/usr/bin/env tsx

/**
 * Manual Queue System Initialization Script
 *
 * This script manually initializes the queue system (worker + scheduler)
 * when you need queue functionality without auto-starting on every page load.
 *
 * Usage:
 *   npm run init-queue
 *   or
 *   npx tsx scripts/init-queue.ts
 */

import {
    initializeQueueSystem,
    getQueueStatus,
} from "../lib/queue-init-on-demand";
import { worker } from "../lib/queue-worker"; // Import worker for graceful shutdown

async function main() {
    console.log("🚀 Initializing queue system...");

    try {
        // Check current status
        const initialStatus = getQueueStatus();
        console.log("📊 Initial status:", initialStatus);

        if (initialStatus.workerStarted && initialStatus.schedulerStarted) {
            console.log("✅ Queue system is already running!");
            return;
        }

        // Initialize the queue system
        await initializeQueueSystem(15); // 15-minute cleanup interval

        // Check final status
        const finalStatus = getQueueStatus();
        console.log("📊 Final status:", finalStatus);

        console.log("✅ Queue system initialized successfully!");
        console.log("🔄 Worker is processing jobs from the messageQueue");
        console.log("🕐 Scheduler is running cleanup every 15 minutes");
        console.log("🔄 Press Ctrl+C to stop");

        // Keep the process alive
        process.on("SIGINT", async () => {
            console.log("\n🛑 Shutting down queue system gracefully...");
            if (worker) {
                await worker.close(); // drains & closes Redis connections
            }
            process.exit(0);
        });

        process.on("SIGTERM", async () => {
            console.log("\n🛑 Shutting down queue system gracefully...");
            if (worker) {
                await worker.close();
            }
            process.exit(0);
        });
    } catch (error) {
        console.error("❌ Failed to initialize queue system:", error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
});
