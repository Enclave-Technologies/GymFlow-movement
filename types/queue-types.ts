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
