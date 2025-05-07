export type WorkoutPlanResponse = {
    planId: string;
    updatedAt: Date;
    phases: Array<{
        id: string;
        name: string;
        isActive: boolean;
        isExpanded: boolean;
        orderNumber?: number;  // Added orderNumber
        planId?: string;       // Added planId
        sessions: Array<{
            id: string;
            name: string;
            duration: number | null;
            isExpanded: boolean;
            orderNumber?: number;  // Added orderNumber
            phaseId?: string;      // Added phaseId
            exercises: Array<{
                id: string;
                order: string;
                motion: string | null;
                targetArea: string | null;
                exerciseId: string | null;
                description: string | null;
                sessionId?: string;  // Added sessionId
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
                customizations?: string;
                notes?: string;
            }>;
        }>;
    }>;
};

export interface Exercise {
    id: string;                  // planExerciseId in the database
    sessionId?: string;          // Parent session reference
    exerciseId: string;          // Reference to the exercise in the Exercises table
    order: string;               // String representation of order (e.g., 'A0', 'B1')
    motion?: string;
    targetArea?: string;
    description?: string;
    duration?: number;           // For UI calculations, not stored in DB
    
    // String values in UI that will be converted to numbers for DB
    sets?: string;               // Legacy field, use setsMin/setsMax instead
    reps?: string;               // Legacy field, use repsMin/repsMax instead
    rest?: string;               // Legacy field, use restMin/restMax instead
    setsMin?: string;
    setsMax?: string;
    repsMin?: string;
    repsMax?: string;
    restMin?: string;
    restMax?: string;
    tut?: string;
    
    // Other fields
    tempo?: string;
    additionalInfo?: string;     // Will be mapped to customizations in DB
    customizations?: string;
    notes?: string;
}

export interface Session {
    id: string;                  // sessionId in the database
    phaseId?: string;            // Parent phase reference
    name: string;                // sessionName in the database
    duration: number;            // sessionTime in the database
    orderNumber?: number;        // Numeric order in the database
    isExpanded: boolean;         // UI state, not stored in DB
    exercises: Exercise[];       // Child exercises
}

export interface Phase {
    id: string;                  // phaseId in the database
    planId?: string;             // Parent plan reference
    name: string;                // phaseName in the database
    orderNumber?: number;        // Numeric order in the database
    isActive: boolean;           // isActive in the database
    isExpanded: boolean;         // UI state, not stored in DB
    sessions: Session[];         // Child sessions
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
