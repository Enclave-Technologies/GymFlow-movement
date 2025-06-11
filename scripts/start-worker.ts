#!/usr/bin/env tsx

/**
 * Redis Queue Worker Startup Script
 *
 * This script starts the Redis queue worker to process background jobs.
 * Run this script in a separate terminal or as a background process.
 *
 * Usage:
 *   npm run worker
 *   or
 *   npx tsx scripts/start-worker.ts
 */

// Import the worker (this will start it automatically)
import { worker } from "../lib/queue-worker"; // export the Worker instance

console.log("🚀 Redis Queue Worker started successfully!");
console.log("📊 Worker is now processing jobs from the messageQueue");
console.log("🔄 Press Ctrl+C to stop the worker");

// Keep the process alive
process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down worker gracefully...");
    if (worker) {
        await worker.close(); // drains & closes Redis connections
    }
    process.exit(0);
});

process.on("SIGTERM", async () => {
    console.log("\n🛑 Shutting down worker gracefully...");
    if (worker) {
        await worker.close();
    }
    process.exit(0);
});
