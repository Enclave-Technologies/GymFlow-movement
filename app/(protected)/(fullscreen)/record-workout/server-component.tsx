import {
    fetchWorkoutTrackerData,
    startWorkoutSession,
    getWorkoutSessionDetails,
} from "@/actions/workout_tracker_actions";

// Define interfaces to match the client component's expected types
interface WorkoutPlan {
    planId: string;
    planName: string;
    createdByUserId: string;
    createdDate: string | Date;
    updatedAt: string | Date;
    assignedToUserId?: string;
    isActive: boolean;
    [key: string]: unknown;
}

interface WorkoutPhase {
    phaseId: string;
    planId: string;
    phaseName: string;
    orderNumber: number;
    isActive: boolean;
    [key: string]: unknown;
}

interface WorkoutSession {
    sessionId: string;
    phaseId: string;
    sessionName: string;
    orderNumber: number;
    sessionTime?: number;
    [key: string]: unknown;
}

interface ExerciseDetail {
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

interface WorkoutExercise {
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
    tut?: number; // Changed from TUT to tut to match database field name
    restMin?: number;
    restMax?: number;
    exerciseOrder: number;
    setOrderMarker?: string;
    customizations?: string;
    notes?: string;
    exerciseDetails?: ExerciseDetail;
    [key: string]: unknown;
}

interface ClientUser {
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

interface WorkoutData {
    plan: WorkoutPlan | null;
    phase: WorkoutPhase | null;
    session: WorkoutSession | null;
    exercises: WorkoutExercise[];
    client: ClientUser | null;
}

interface PastSession {
    session: {
        workoutSessionLogId: string;
        userId: string;
        sessionName: string;
        startTime: string | Date;
        endTime: string | Date | null;
        [key: string]: unknown;
    };
    details: {
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
    }[];
}

export async function WorkoutDataFetcher({
    sessionId,
    phaseId,
    clientId,
    workoutSessionLogId,
}: {
    sessionId: string;
    phaseId?: string;
    clientId?: string;
    workoutSessionLogId?: string;
}) {
    // Fetch the workout data on the server
    const rawData = await fetchWorkoutTrackerData({
        sessionId,
        phaseId,
        clientId,
    });

    // Get the session name for fetching past sessions
    const sessionName = rawData.session?.sessionName || "Workout Session";
    const userId = clientId || "current-user";

    // Fetch past sessions data
    let pastSessions: PastSession[] = [];
    let newWorkoutSessionLogId = workoutSessionLogId;

    // If no workoutSessionLogId is provided, create a new session
    if (!workoutSessionLogId) {
        const sessionResult = await startWorkoutSession(userId, sessionName);
        newWorkoutSessionLogId = sessionResult.newSession.workoutSessionLogId;
        pastSessions = sessionResult.pastSessions;
    } else {
        // Just fetch past sessions without creating a new session
        try {
            const sessionResult = await startWorkoutSession(
                userId,
                sessionName,
                workoutSessionLogId
            );
            newWorkoutSessionLogId =
                sessionResult.newSession.workoutSessionLogId;
            pastSessions = sessionResult.pastSessions;
        } catch (error) {
            console.error("Error fetching past sessions:", error);
        }
    }

    // Transform the data to match the expected types
    const workoutData: WorkoutData = {
        plan: rawData.plan
            ? {
                  planId: rawData.plan.planId,
                  planName: rawData.plan.planName,
                  createdByUserId: rawData.plan.createdByUserId,
                  createdDate: rawData.plan.createdDate,
                  updatedAt: rawData.plan.updatedAt,
                  assignedToUserId: rawData.plan.assignedToUserId || undefined,
                  isActive: Boolean(rawData.plan.isActive),
              }
            : null,
        phase: rawData.phase
            ? {
                  phaseId: rawData.phase.phaseId,
                  planId: rawData.phase.planId,
                  phaseName: rawData.phase.phaseName,
                  orderNumber: Number(rawData.phase.orderNumber),
                  isActive: Boolean(rawData.phase.isActive),
              }
            : null,
        session: rawData.session
            ? {
                  sessionId: rawData.session.sessionId,
                  phaseId: rawData.session.phaseId,
                  sessionName: rawData.session.sessionName,
                  orderNumber: Number(rawData.session.orderNumber),
                  sessionTime: rawData.session.sessionTime || undefined,
              }
            : null,
        exercises: rawData.exercises.map((ex) => {
            // Create a properly typed exercise object
            const exercise: WorkoutExercise = {
                planExerciseId: ex.planExerciseId,
                sessionId: ex.sessionId,
                exerciseId: ex.exerciseId,
                targetArea: ex.targetArea || undefined,
                motion: ex.motion || undefined,
                repsMin: ex.repsMin || undefined,
                repsMax: ex.repsMax || undefined,
                setsMin: ex.setsMin || undefined,
                setsMax: ex.setsMax || undefined,
                tempo: ex.tempo || undefined,
                tut: ex.tut || undefined,
                restMin: ex.restMin || undefined,
                restMax: ex.restMax || undefined,
                exerciseOrder: Number(ex.exerciseOrder),
                setOrderMarker: ex.setOrderMarker || undefined,
                customizations: ex.customizations || undefined,
                notes: ex.notes || undefined,
            };

            // Add exercise details if available
            if (ex.exerciseDetails) {
                exercise.exerciseDetails = {
                    exerciseId: ex.exerciseDetails.exerciseId,
                    exerciseName: ex.exerciseDetails.exerciseName,
                    description: ex.exerciseDetails.description || undefined,
                    uploadedByUserId: ex.exerciseDetails.uploadedByUserId,
                    uploadDate: ex.exerciseDetails.uploadDate,
                    approvedByAdmin:
                        ex.exerciseDetails.approvedByAdmin || undefined,
                    videoUrl: ex.exerciseDetails.videoUrl || undefined,
                    motion: ex.exerciseDetails.motion || undefined,
                    targetArea: ex.exerciseDetails.targetArea || undefined,
                    movementType: ex.exerciseDetails.movementType || undefined,
                    timeMultiplier:
                        ex.exerciseDetails.timeMultiplier || undefined,
                };
            }

            return exercise;
        }),
        client: rawData.client
            ? {
                  userId: rawData.client.userId,
                  fullName: rawData.client.fullName,
                  email: rawData.client.email || undefined,
                  registrationDate: rawData.client.registrationDate,
                  notes: rawData.client.notes || undefined,
                  phone: rawData.client.phone || undefined,
                  imageUrl: rawData.client.imageUrl || undefined,
                  gender: rawData.client.gender || undefined,
                  idealWeight: rawData.client.idealWeight || undefined,
                  dob: rawData.client.dob || undefined,
                  height: rawData.client.height || undefined,
              }
            : null,
    };

    // Fetch workout session details if a workoutSessionLogId is provided
    let workoutSessionDetails: {
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
    }[] = [];

    if (newWorkoutSessionLogId) {
        try {
            workoutSessionDetails = await getWorkoutSessionDetails(
                newWorkoutSessionLogId
            );
        } catch (error) {
            console.error("Error fetching workout session details:", error);
        }
    }

    // Return the data as a serializable object
    return {
        workoutData,
        pastSessions,
        workoutSessionLogId: newWorkoutSessionLogId,
        workoutSessionDetails,
    };
}
