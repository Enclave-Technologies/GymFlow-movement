export interface Exercise {
    id: string;
    order: string;
    motion: string;
    targetArea: string;
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
