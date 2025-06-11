/**
 * On-demand Queue Initialization
 *
 * This file provides functions to initialize queue components when needed,
 * rather than automatically on every page load.
 *
 * Use this for manual initialization or in specific API routes that need queue functionality.
 */

// Global flags to prevent multiple instances
declare global {
    // eslint-disable-next-line no-var
    var __QUEUE_WORKER_STARTED__: boolean | undefined;
    // eslint-disable-next-line no-var
    var __QUEUE_SCHEDULER_STARTED__: boolean | undefined;
}

/**
 * Initialize the queue worker on demand
 * @returns Promise that resolves when worker is started
 */
export async function initializeQueueWorker(): Promise<void> {
    if (global.__QUEUE_WORKER_STARTED__) {
        console.log("🔄 Queue worker already running");
        return;
    }

    console.log("🚀 Starting queue worker on demand...");
    global.__QUEUE_WORKER_STARTED__ = true;

    try {
        // Import the worker (this will start it automatically)
        await import("./queue-worker");
        console.log("✅ Queue worker started successfully!");
    } catch (error) {
        console.error("❌ Failed to start queue worker:", error);
        global.__QUEUE_WORKER_STARTED__ = false; // Reset on error
        throw error;
    }
}

/**
 * Initialize the queue scheduler on demand
 * @param intervalMinutes How often to run cleanup (default: 15 minutes)
 */
export async function initializeQueueScheduler(
    intervalMinutes: number = 15
): Promise<void> {
    if (global.__QUEUE_SCHEDULER_STARTED__) {
        console.log("🔄 Queue scheduler already running");
        return;
    }

    console.log("🚀 Starting queue scheduler on demand...");
    global.__QUEUE_SCHEDULER_STARTED__ = true;

    try {
        const { queueScheduler } = await import("./queue-scheduler");
        queueScheduler.start(intervalMinutes);
        console.log("✅ Queue scheduler started successfully!");
    } catch (error) {
        console.error("❌ Failed to start queue scheduler:", error);
        global.__QUEUE_SCHEDULER_STARTED__ = false; // Reset on error
        throw error;
    }
}

/**
 * Initialize both queue worker and scheduler
 * @param schedulerIntervalMinutes How often to run cleanup (default: 15 minutes)
 */
export async function initializeQueueSystem(
    schedulerIntervalMinutes: number = 15
): Promise<void> {
    await Promise.all([
        initializeQueueWorker(),
        initializeQueueScheduler(schedulerIntervalMinutes),
    ]);
}

/**
 * Check if queue components are initialized
 */
export function getQueueStatus() {
    return {
        workerStarted: !!global.__QUEUE_WORKER_STARTED__,
        schedulerStarted: !!global.__QUEUE_SCHEDULER_STARTED__,
    };
}
