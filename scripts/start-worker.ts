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
import "../lib/queue-worker";

console.log("🚀 Redis Queue Worker started successfully!");
console.log("📊 Worker is now processing jobs from the messageQueue");
console.log("🔄 Press Ctrl+C to stop the worker");

// Keep the process alive
process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down worker...");
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\n🛑 Shutting down worker...");
    process.exit(0);
});

// Prevent the script from exiting
setInterval(() => {
    // Keep alive
}, 1000);
