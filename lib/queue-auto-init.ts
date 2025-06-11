/**
 * Auto-initialization for Queue Worker in Development
 *
 * This file automatically starts the queue worker when explicitly imported.
 * It should NOT be imported in layout.tsx or other files that run on every page load.
 *
 * Only runs in development mode to avoid conflicts in production.
 * Uses a global flag to prevent multiple worker instances during hot reloads.
 *
 * Usage:
 * - Import this file only when you specifically need to start the queue worker
 * - Or use the on-demand initialization functions from queue-init-on-demand.ts
 */

// Global flag to prevent multiple worker instances
declare global {
    // eslint-disable-next-line no-var
    var __QUEUE_WORKER_STARTED__: boolean | undefined;
    // eslint-disable-next-line no-var
    var __QUEUE_AUTO_INIT_ATTEMPTED__: boolean | undefined;
}

// This export makes this file a module, which is required for global declarations
export {};

// Type-safe global access
interface GlobalWithQueue {
    __QUEUE_WORKER_STARTED__?: boolean;
    __QUEUE_AUTO_INIT_ATTEMPTED__?: boolean;
}

const globalWithQueue = global as typeof global & GlobalWithQueue;

// Only auto-start in development mode and if not already attempted
if (
    process.env.NODE_ENV === "development" &&
    process.env.AUTO_START_WORKER === "true" &&
    !globalWithQueue.__QUEUE_WORKER_STARTED__ &&
    !globalWithQueue.__QUEUE_AUTO_INIT_ATTEMPTED__
) {
    console.log("🚀 Auto-starting queue worker in development mode...");
    globalWithQueue.__QUEUE_WORKER_STARTED__ = true;
    globalWithQueue.__QUEUE_AUTO_INIT_ATTEMPTED__ = true;

    // Import the worker (this will start it automatically)
    import("./queue-worker")
        .then(async () => {
            console.log("✅ Queue worker auto-started successfully!");
        })
        .catch((error) => {
            console.error("❌ Failed to auto-start queue worker:", error);
            globalWithQueue.__QUEUE_WORKER_STARTED__ = false; // Reset on error
        });
} else if (
    process.env.NODE_ENV === "development" &&
    (globalWithQueue.__QUEUE_WORKER_STARTED__ ||
        globalWithQueue.__QUEUE_AUTO_INIT_ATTEMPTED__)
) {
    console.log(
        "🔄 Queue worker already running or initialization already attempted (skipping restart)"
    );
} else if (process.env.NODE_ENV === "development") {
    console.log(
        "💡 Queue worker auto-start disabled. Set AUTO_START_WORKER=true to enable, or run 'npm run worker' in a separate terminal."
    );
}
