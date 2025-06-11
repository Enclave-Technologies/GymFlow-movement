// Queue message types and structures

// More specific types for better type safety
export type ExerciseChanges = {
    sets?: number;
    reps?: number;
    weight?: number;
    duration?: number;
    rest?: number;
    notes?: string;
    [key: string]: string | number | boolean | undefined;
};

export type UserActionPayload = {
    field?: string;
    oldValue?: string | number | boolean;
    newValue?: string | number | boolean;
    [key: string]: string | number | boolean | undefined;
};

export type EmailTemplateData = {
    userName?: string;
    loginUrl?: string;
    supportEmail?: string;
    dashboardUrl?: string;
    weeklyGoals?: number;
    completedWorkouts?: number;
    totalWorkouts?: number;
    totalExercises?: number;
    totalSets?: number;
    totalReps?: number;
    [key: string]: string | number | boolean | undefined;
};

export type QueueMetadata = {
    source?: string;
    environment?: string;
    userAgent?: string;
    channel?: string;
    emailType?: string;
    [key: string]: string | number | boolean | undefined;
};

export interface BaseQueueMessage {
    messageType: string;
    timestamp: string;
    userId?: string;
    metadata?: QueueMetadata;
    [key: string]: unknown; // Index signature for compatibility
}

// Specific message types
export interface WorkoutUpdateMessage extends BaseQueueMessage {
    messageType: "WORKOUT_UPDATE";
    data: {
        exercisePlanId: string;
        phaseId: string;
        sessionId: string;
        exerciseId: string;
        changes: ExerciseChanges;
    };
}

// New granular workout operation message types
export interface WorkoutPlanCreateMessage extends BaseQueueMessage {
    messageType: "WORKOUT_PLAN_CREATE";
    data: {
        planId: string; // Generated in frontend
        planName: string;
        clientId: string;
        trainerId: string;
        isActive: boolean;
    };
}

export interface WorkoutPhaseCreateMessage extends BaseQueueMessage {
    messageType: "WORKOUT_PHASE_CREATE";
    data: {
        planId: string;
        clientId: string;
        trainerId: string;
        phase: {
            id: string;
            name: string;
            orderNumber: number;
            isActive: boolean;
        };
    };
}

export interface WorkoutPhaseUpdateMessage extends BaseQueueMessage {
    messageType: "WORKOUT_PHASE_UPDATE";
    data: {
        planId: string;
        phaseId: string;
        clientId: string;
        changes: {
            name?: string;
            isActive?: boolean;
            orderNumber?: number;
        };
        lastKnownUpdatedAt: string; // ISO string
    };
}

export interface WorkoutPhaseDeleteMessage extends BaseQueueMessage {
    messageType: "WORKOUT_PHASE_DELETE";
    data: {
        planId: string;
        phaseId: string;
        clientId: string;
        lastKnownUpdatedAt: string; // ISO string
    };
}

export interface WorkoutPhaseDuplicateMessage extends BaseQueueMessage {
    messageType: "WORKOUT_PHASE_DUPLICATE";
    data: {
        planId: string;
        clientId: string;
        trainerId: string;
        originalPhaseId: string;
        duplicatedPhase: {
            id: string;
            name: string;
            orderNumber: number;
            isActive: boolean;
            sessions: Array<{
                id: string;
                name: string;
                orderNumber: number;
                sessionTime?: number;
                exercises: Array<{
                    id: string;
                    exerciseId: string;
                    description?: string;
                    motion?: string;
                    targetArea?: string;
                    setsMin?: string;
                    setsMax?: string;
                    repsMin?: string;
                    repsMax?: string;
                    tempo?: string;
                    restMin?: string;
                    restMax?: string;
                    customizations?: string;
                    additionalInfo?: string;
                    notes?: string;
                    order?: string;
                }>;
            }>;
        };
        lastKnownUpdatedAt: string; // ISO string
    };
}

export interface WorkoutPhaseActivateMessage extends BaseQueueMessage {
    messageType: "WORKOUT_PHASE_ACTIVATE";
    data: {
        planId: string;
        phaseId: string; // Phase to activate
        clientId: string;
        isActivating: boolean; // true = activate, false = deactivate
        allPhaseIds: string[]; // All phase IDs in the plan (for deactivating others)
        lastKnownUpdatedAt: string; // ISO string
    };
}

export interface WorkoutSessionCreateMessage extends BaseQueueMessage {
    messageType: "WORKOUT_SESSION_CREATE";
    data: {
        planId: string;
        phaseId: string;
        clientId: string;
        session: {
            id: string;
            name: string;
            orderNumber: number;
            sessionTime?: number;
        };
        lastKnownUpdatedAt: string; // ISO string
    };
}

export interface WorkoutSessionUpdateMessage extends BaseQueueMessage {
    messageType: "WORKOUT_SESSION_UPDATE";
    data: {
        planId: string;
        phaseId: string;
        sessionId: string;
        clientId: string;
        changes: {
            name?: string;
            orderNumber?: number;
            sessionTime?: number;
        };
        lastKnownUpdatedAt: string; // ISO string
    };
}

export interface WorkoutSessionDeleteMessage extends BaseQueueMessage {
    messageType: "WORKOUT_SESSION_DELETE";
    data: {
        planId: string;
        phaseId: string;
        sessionId: string;
        clientId: string;
        lastKnownUpdatedAt: string; // ISO string
    };
}

export interface WorkoutSessionDuplicateMessage extends BaseQueueMessage {
    messageType: "WORKOUT_SESSION_DUPLICATE";
    data: {
        planId: string;
        phaseId: string;
        clientId: string;
        originalSessionId: string;
        duplicatedSession: {
            id: string;
            name: string;
            orderNumber: number;
            sessionTime?: number;
            exercises: Array<{
                id: string;
                exerciseId: string;
                description?: string;
                motion?: string;
                targetArea?: string;
                setsMin?: string;
                setsMax?: string;
                repsMin?: string;
                repsMax?: string;
                tempo?: string;
                restMin?: string;
                restMax?: string;
                customizations?: string;
                additionalInfo?: string;
                notes?: string;
                order?: string;
            }>;
        };
        lastKnownUpdatedAt: string; // ISO string
    };
}

export interface WorkoutExerciseSaveMessage extends BaseQueueMessage {
    messageType: "WORKOUT_EXERCISE_SAVE";
    data: {
        planId: string;
        phaseId: string;
        sessionId: string;
        exerciseId: string; // The plan exercise ID (exercise.id)
        planExerciseId: string; // Same as exerciseId for consistency
        clientId: string;
        exercise: {
            id: string;
            exerciseId: string;
            description: string;
            motion: string;
            targetArea: string;
            setsMin?: string;
            setsMax?: string;
            repsMin?: string;
            repsMax?: string;
            tempo?: string;
            restMin?: string;
            restMax?: string;
            customizations?: string;
            notes?: string;
            order?: string; // Changed from exerciseOrder (number) to order (string)
            additionalInfo?: string;
        };
        isNew: boolean; // Flag to indicate if this is a new exercise or update
        lastKnownUpdatedAt: string; // ISO string
    };
}

export interface WorkoutExerciseDeleteMessage extends BaseQueueMessage {
    messageType: "WORKOUT_EXERCISE_DELETE";
    data: {
        planId: string;
        phaseId: string;
        sessionId: string;
        exerciseId: string;
        planExerciseId: string;
        clientId: string;
        lastKnownUpdatedAt: string; // ISO string
    };
}

// Import Phase type for proper typing
import type { Phase } from "@/components/workout-planning/types";

export interface WorkoutPlanFullSaveMessage extends BaseQueueMessage {
    messageType: "WORKOUT_PLAN_FULL_SAVE";
    data: {
        planId?: string;
        clientId: string;
        trainerId: string;
        phases: Phase[]; // Full phase data structure
        lastKnownUpdatedAt?: string; // ISO string
    };
}

export interface UserActionMessage extends BaseQueueMessage {
    messageType: "USER_ACTION";
    data: {
        action: string;
        entityType: string;
        entityId: string;
        payload: UserActionPayload;
    };
}

export interface NotificationMessage extends BaseQueueMessage {
    messageType: "NOTIFICATION";
    data: {
        recipientId: string;
        title: string;
        message: string;
        type: "info" | "warning" | "error" | "success";
        actionUrl?: string;
    };
}

export interface EmailMessage extends BaseQueueMessage {
    messageType: "EMAIL";
    data: {
        to: string;
        subject: string;
        template: string;
        templateData: EmailTemplateData;
    };
}

export interface DataSyncMessage extends BaseQueueMessage {
    messageType: "DATA_SYNC";
    data: {
        syncType: "backup" | "export" | "import";
        entityType: string;
        entityIds: string[];
        destination?: string;
    };
}

// Test/Demo message type
export interface TestMessage extends BaseQueueMessage {
    messageType: "TEST";
    data: {
        testType: string;
        payload: UserActionPayload;
    };
}

// Union type for all possible messages
export type QueueMessage =
    | WorkoutUpdateMessage
    | WorkoutPlanCreateMessage
    | WorkoutPhaseCreateMessage
    | WorkoutPhaseUpdateMessage
    | WorkoutPhaseDeleteMessage
    | WorkoutPhaseDuplicateMessage
    | WorkoutPhaseActivateMessage
    | WorkoutSessionCreateMessage
    | WorkoutSessionUpdateMessage
    | WorkoutSessionDeleteMessage
    | WorkoutSessionDuplicateMessage
    | WorkoutExerciseSaveMessage
    | WorkoutExerciseDeleteMessage
    | WorkoutPlanFullSaveMessage
    | UserActionMessage
    | NotificationMessage
    | EmailMessage
    | DataSyncMessage
    | TestMessage;

// Job options
export interface QueueJobOptions {
    delay?: number;
    attempts?: number;
    backoff?: {
        type: "exponential" | "fixed";
        delay: number;
    };
    priority?: number;
    removeOnComplete?: number;
    removeOnFail?: number;
}

// Queue job result
export interface QueueJobResult {
    success: boolean;
    message: string;
    data?: Record<string, string | number | boolean>;
    error?: string;
    processedAt: string;
}

// Queue statistics
export interface QueueStats {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    total: number;
}
