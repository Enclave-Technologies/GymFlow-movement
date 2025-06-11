import { Worker, Job } from "bullmq";
import { getRedisConnectionOptions } from "./redis-utils";
import { WorkoutProcessorsMain } from "./queue-processors/workout-processors-main";
import { GeneralProcessors } from "./queue-processors/general-processors";
import {
    QueueMessage,
    QueueJobResult,
    WorkoutUpdateMessage,
    WorkoutPlanCreateMessage,
    WorkoutPhaseCreateMessage,
    WorkoutPhaseUpdateMessage,
    WorkoutPhaseDeleteMessage,
    WorkoutPhaseDuplicateMessage,
    WorkoutPhaseActivateMessage,
    WorkoutSessionCreateMessage,
    WorkoutSessionUpdateMessage,
    WorkoutSessionDeleteMessage,
    WorkoutExerciseSaveMessage,
    WorkoutExerciseDeleteMessage,
    WorkoutPlanFullSaveMessage,
    UserActionMessage,
    NotificationMessage,
    EmailMessage,
    DataSyncMessage,
    TestMessage,
} from "../types/queue-types";

// Type for our specific Redis connection configuration
interface RedisConnectionConfig {
    host: string;
    port: number;
    password?: string;
}

// Message processors bridge class
// This class serves as a bridge to the separated processor files
class MessageProcessors {
    // Workout-related processors (using worker-compatible versions)
    static processWorkoutUpdate = WorkoutProcessorsMain.processWorkoutUpdate;
    static processWorkoutPlanCreate =
        WorkoutProcessorsMain.processWorkoutPlanCreate;
    static processWorkoutPhaseCreate =
        WorkoutProcessorsMain.processWorkoutPhaseCreate;
    static processWorkoutPhaseUpdate =
        WorkoutProcessorsMain.processWorkoutPhaseUpdate;
    static processWorkoutPhaseDelete =
        WorkoutProcessorsMain.processWorkoutPhaseDelete;
    static processWorkoutPhaseDuplicate =
        WorkoutProcessorsMain.processWorkoutPhaseDuplicate;
    static processWorkoutPhaseActivate =
        WorkoutProcessorsMain.processWorkoutPhaseActivate;
    static processWorkoutSessionCreate =
        WorkoutProcessorsMain.processWorkoutSessionCreate;
    static processWorkoutSessionUpdate =
        WorkoutProcessorsMain.processWorkoutSessionUpdate;
    static processWorkoutSessionDelete =
        WorkoutProcessorsMain.processWorkoutSessionDelete;
    static processWorkoutExerciseSave =
        WorkoutProcessorsMain.processWorkoutExerciseSave;
    static processWorkoutExerciseDelete =
        WorkoutProcessorsMain.processWorkoutExerciseDelete;
    static processWorkoutPlanFullSave =
        WorkoutProcessorsMain.processWorkoutPlanFullSave;

    // General processors
    static processUserAction = GeneralProcessors.processUserAction;
    static processNotification = GeneralProcessors.processNotification;
    static processEmail = GeneralProcessors.processEmail;
    static processDataSync = GeneralProcessors.processDataSync;
    static processTest = GeneralProcessors.processTest;
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
            case "WORKOUT_PLAN_CREATE":
                result = await MessageProcessors.processWorkoutPlanCreate(
                    message as WorkoutPlanCreateMessage
                );
                break;
            case "WORKOUT_PHASE_CREATE":
                result = await MessageProcessors.processWorkoutPhaseCreate(
                    message as WorkoutPhaseCreateMessage
                );
                break;
            case "WORKOUT_PHASE_UPDATE":
                result = await MessageProcessors.processWorkoutPhaseUpdate(
                    message as WorkoutPhaseUpdateMessage
                );
                break;
            case "WORKOUT_PHASE_DELETE":
                result = await MessageProcessors.processWorkoutPhaseDelete(
                    message as WorkoutPhaseDeleteMessage
                );
                break;
            case "WORKOUT_PHASE_DUPLICATE":
                result = await MessageProcessors.processWorkoutPhaseDuplicate(
                    message as WorkoutPhaseDuplicateMessage
                );
                break;
            case "WORKOUT_PHASE_ACTIVATE":
                result = await MessageProcessors.processWorkoutPhaseActivate(
                    message as WorkoutPhaseActivateMessage
                );
                break;
            case "WORKOUT_SESSION_CREATE":
                result = await MessageProcessors.processWorkoutSessionCreate(
                    message as WorkoutSessionCreateMessage
                );
                break;
            case "WORKOUT_SESSION_UPDATE":
                result = await MessageProcessors.processWorkoutSessionUpdate(
                    message as WorkoutSessionUpdateMessage
                );
                break;
            case "WORKOUT_SESSION_DELETE":
                result = await MessageProcessors.processWorkoutSessionDelete(
                    message as WorkoutSessionDeleteMessage
                );
                break;
            case "WORKOUT_EXERCISE_SAVE":
                result = await MessageProcessors.processWorkoutExerciseSave(
                    message as WorkoutExerciseSaveMessage
                );
                break;
            case "WORKOUT_EXERCISE_DELETE":
                result = await MessageProcessors.processWorkoutExerciseDelete(
                    message as WorkoutExerciseDeleteMessage
                );
                break;
            case "WORKOUT_PLAN_FULL_SAVE":
                result = await MessageProcessors.processWorkoutPlanFullSave(
                    message as WorkoutPlanFullSaveMessage
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

// Singleton pattern to prevent multiple workers in development
let messageWorker: Worker | null = null;

// Get Redis connection options dynamically
const connectionOptions = getRedisConnectionOptions();

// Create worker only if it doesn't exist
if (!messageWorker) {
    messageWorker = new Worker("messageQueue", processJob, {
        connection: connectionOptions,
        concurrency: 5, // Process up to 5 jobs concurrently
    });
}

export { messageWorker };

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

// Type-safe access to connection options
const redisConfig = connectionOptions as RedisConnectionConfig;
console.log("🔗 Redis connection:", {
    host: redisConfig.host || "unknown",
    port: redisConfig.port || "unknown",
    password: redisConfig.password ? "***" : "undefined",
});
