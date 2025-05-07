export type WorkoutPlanResponse = {
    planId: string;
    updatedAt: Date;
    phases: Array<{
        id: string;
        name: string;
        isActive: boolean;
        isExpanded: boolean;
        sessions: Array<{
            id: string;
            name: string;
            duration: number | null;
            isExpanded: boolean;
            exercises: Array<{
                id: string;
                order: string;
                motion: string | null;
                targetArea: string | null;
                exerciseId: string | null;
                description: string | null;
                duration?: number;
                sets?: string;
                reps?: string;
                tut?: string;
                tempo?: string;
                rest?: string;
                additionalInfo?: string;
                setsMin?: string;
                setsMax?: string;
                repsMin?: string;
                repsMax?: string;
                restMin?: string;
                restMax?: string;
            }>;
        }>;
    }>;
};

export interface Exercise {
    id: string;
    order: string;
    motion: string;
    targetArea: string;
    exerciseId: string;
    description: string;
    sets?: string;
    reps?: string;
    tut?: string;
    tempo?: string;
    rest?: string;
    additionalInfo?: string;
    customizations?: string;
    duration: number;
    // Additional fields for min-max values
    setsMin?: string;
    setsMax?: string;
    repsMin?: string;
    repsMax?: string;
    restMin?: string;
    restMax?: string;
    notes?: string;
}

export interface Session {
    id: string;
    name: string;
    duration: number;
    isExpanded: boolean;
    exercises: Exercise[];
}

export interface Phase {
    id: string;
    name: string;
    isActive: boolean;
    isExpanded: boolean;
    sessions: Session[];
}

/**
 * Standard response type for workout plan server actions
 * Used for consistent error handling and concurrency control
 */
export interface WorkoutPlanActionResponse {
    success: boolean;
    error?: string;
    conflict?: boolean;
    planId?: string;
    updatedAt?: Date;
    serverUpdatedAt?: Date;
}

/**
 * Change tracking system for workout plan modifications
 * Used to efficiently track and send only changes to the backend
 */
export interface WorkoutPlanChanges {
    created: {
        phases: Phase[];
        sessions: { phaseId: string; session: Session }[];
        exercises: { sessionId: string; exercise: Exercise }[];
    };
    updated: {
        phases: { id: string; changes: Partial<Phase> }[];
        sessions: { id: string; changes: Partial<Session> }[];
        exercises: { id: string; changes: Partial<Exercise> }[];
    };
    deleted: {
        phases: string[];
        sessions: string[];
        exercises: string[];
    };
}
