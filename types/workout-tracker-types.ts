export interface ExerciseSet {
    id: string;
    reps: string;
    weight: string;
    notes?: string;
    completed?: boolean;
    isNew?: boolean;
}

export interface Exercise {
    id: string;
    name: string;
    order: string;
    sets: ExerciseSet[];
    setRange: string;
    repRange: string;
    tempo: string;
    restTime: string;
    notes: string;
    isExpanded: boolean;
    setOrderMarker?: string;
    customizations?: string;
}

export interface WorkoutPlan {
    planId: string;
    planName: string;
    createdByUserId: string;
    createdDate: string | Date;
    updatedAt: string | Date;
    assignedToUserId?: string;
    isActive: boolean;
    [key: string]: unknown;
}

export interface WorkoutPhase {
    phaseId: string;
    planId: string;
    phaseName: string;
    orderNumber: number;
    isActive: boolean;
    [key: string]: unknown;
}

export interface WorkoutSession {
    sessionId: string;
    phaseId: string;
    sessionName: string;
    orderNumber: number;
    sessionTime?: number;
    [key: string]: unknown;
}

export interface ExerciseDetail {
    exerciseId: string;
    exerciseName: string;
    description?: string;
    uploadedByUserId: string;
    uploadDate: string | Date;
    approvedByAdmin?: boolean;
    videoUrl?: string;
    motion?: string;
    targetArea?: string;
    movementType?: string;
    timeMultiplier?: number;
    [key: string]: unknown;
}

export interface WorkoutExercise {
    planExerciseId: string;
    sessionId: string;
    exerciseId: string;
    targetArea?: string;
    motion?: string;
    repsMin?: number;
    repsMax?: number;
    setsMin?: number;
    setsMax?: number;
    tempo?: string;
    tut?: number;
    restMin?: number;
    restMax?: number;
    exerciseOrder: number;
    setOrderMarker?: string;
    customizations?: string;
    notes?: string;
    exerciseDetails?: ExerciseDetail;
    [key: string]: unknown;
}

export interface ClientUser {
    userId: string;
    fullName: string;
    email?: string;
    registrationDate: string | Date;
    notes?: string;
    phone?: string;
    imageUrl?: string;
    gender?: string;
    idealWeight?: number;
    dob?: string | Date;
    height?: number;
    [key: string]: unknown;
}

export interface WorkoutData {
    plan: WorkoutPlan | null;
    phase: WorkoutPhase | null;
    session: WorkoutSession | null;
    exercises: WorkoutExercise[];
    client: ClientUser | null;
}

export interface PastSessionDetail {
    workoutDetailId: string;
    workoutSessionLogId: string;
    exerciseName: string;
    sets: number | null;
    reps: number | null;
    weight: number | null;
    workoutVolume: number | null;
    coachNote: string | null;
    setOrderMarker: string | null;
    entryTime: string | Date | null;
    [key: string]: unknown;
}

export interface PastSession {
    session: {
        workoutSessionLogId: string;
        userId: string;
        sessionName: string;
        startTime: string | Date;
        endTime: string | Date | null;
        [key: string]: unknown;
    };
    details: PastSessionDetail[];
}

export interface RecordWorkoutClientProps {
    initialWorkoutData: WorkoutData;
    sessionId: string;
    phaseId?: string;
    clientId?: string;
    workoutSessionLogId?: string;
    pastSessions?: PastSession[];
    workoutSessionDetails?: PastSessionDetail[];
}
