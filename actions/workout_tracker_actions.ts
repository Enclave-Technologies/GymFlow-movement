"use server";

import { db } from "@/db/xata"; // Assuming xata.ts exports your DB client as 'db'
import {
    ExercisePlans,
    Phases,
    Sessions,
    ExercisePlanExercises,
    Exercises,
    Users,
    WorkoutSessionsLog,
    WorkoutSessionDetails,
    SelectExercisePlan,
    SelectPhase,
    SelectSession,
    SelectExercisePlanExercise,
    SelectExercise,
    SelectUser,
    SelectWorkoutSessionLog,
    SelectWorkoutSessionDetail,
    InsertWorkoutSessionLog,
    InsertWorkoutSessionDetail,
} from "@/db/schemas";
import {
    desc,
    eq,
    and,
    gte,
    lte,
    isNotNull,
    inArray,
    isNull,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { unstable_noStore as noStore } from "next/cache";

// Define interfaces for the data structures we'll return

interface WorkoutTrackerData {
    plan: SelectExercisePlan | null;
    phase: SelectPhase | null;
    session: SelectSession | null;
    exercises: (SelectExercisePlanExercise & {
        exerciseDetails: SelectExercise | null;
    })[];
    client: SelectUser | null;
}

interface FetchWorkoutDataParams {
    planId?: string;
    phaseId?: string;
    sessionId?: string;
    clientId?: string; // ID of the client whose workout is being tracked
}

/**
 * Fetches the necessary data for the workout tracker page based on search parameters.
 * This includes plan, phase, session details, and the exercises within that session.
 * It also fetches the client's details if a clientId is provided.
 *
 * @param params - Object containing planId, phaseId, sessionId, and clientId.
 * @returns WorkoutTrackerData object or throws an error.
 */
export async function fetchWorkoutTrackerData(
    params: FetchWorkoutDataParams
): Promise<WorkoutTrackerData> {
    noStore(); // Ensure data isn't cached aggressively

    const { sessionId, clientId } = params;

    if (!sessionId) {
        // For now, return empty data or throw an error.
        console.error("Session ID is required to fetch workout tracker data.");
        // Returning empty structure for now, adjust as needed
        return {
            plan: null,
            phase: null,
            session: null,
            exercises: [],
            client: null,
        };
        // Or throw new Error("Session ID is required.");
    }

    try {
        // 1. Fetch Session, Phase, and Plan details
        const sessionAlias = alias(Sessions, "s");
        const phaseAlias = alias(Phases, "p");
        const planAlias = alias(ExercisePlans, "ep");

        const sessionDetails = await db
            .select({
                session: sessionAlias,
                phase: phaseAlias,
                plan: planAlias,
            })
            .from(sessionAlias)
            .where(eq(sessionAlias.sessionId, sessionId))
            .leftJoin(phaseAlias, eq(sessionAlias.phaseId, phaseAlias.phaseId))
            .leftJoin(planAlias, eq(phaseAlias.planId, planAlias.planId))
            .limit(1);

        const sessionData = sessionDetails[0]?.session ?? null;
        const phaseData = sessionDetails[0]?.phase ?? null;
        const planData = sessionDetails[0]?.plan ?? null;

        if (!sessionData) {
            console.warn(`Session with ID ${sessionId} not found.`);
            // Decide how to handle - return empty or throw?
            return {
                plan: null,
                phase: null,
                session: null,
                exercises: [],
                client: null,
            };
        }

        // 2. Fetch Exercises for the Session with their details
        const exercisesData = await db
            .select()
            .from(ExercisePlanExercises)
            .where(eq(ExercisePlanExercises.sessionId, sessionId))
            .orderBy(ExercisePlanExercises.setOrderMarker);

        // 3. Fetch exercise details for each exercise
        const exercisesWithDetails = await Promise.all(
            exercisesData.map(async (planExercise) => {
                const exerciseDetails = await db
                    .select()
                    .from(Exercises)
                    .where(eq(Exercises.exerciseId, planExercise.exerciseId))
                    .limit(1);

                return {
                    ...planExercise,
                    exerciseDetails: exerciseDetails[0] || null,
                };
            })
        );

        // 4. Fetch Client Details (if clientId is provided)
        let clientData: SelectUser | null = null;
        if (clientId) {
            const clientResult = await db
                .select()
                .from(Users)
                .where(eq(Users.userId, clientId))
                .limit(1);
            clientData = clientResult[0] ?? null;
        }

        return {
            plan: planData,
            phase: phaseData,
            session: sessionData,
            exercises: exercisesWithDetails,
            client: clientData,
        };
    } catch (error) {
        console.error("Error fetching workout tracker data:", error);
        // Consider more specific error handling or re-throwing
        throw new Error("Failed to fetch workout data.");
    }
}

interface StartWorkoutSessionResponse {
    newSession: SelectWorkoutSessionLog;
    pastSessions: {
        session: SelectWorkoutSessionLog;
        details: SelectWorkoutSessionDetail[];
    }[];
}

/**
 * Creates a workout session log entry with a specific ID.
 * This is used for eager log creation when starting a workout session.
 *
 * @param workoutSessionLogId - The specific ID to use for the log entry
 * @param userId - The ID of the user starting the workout
 * @param sessionName - The name of the session being performed
 * @returns The created workout session log entry
 */
export async function createWorkoutSessionLog(
    workoutSessionLogId: string,
    userId: string,
    sessionName: string
): Promise<SelectWorkoutSessionLog> {
    noStore();

    try {
        // Create a new workout session log entry with the specific ID
        // Use ON CONFLICT DO NOTHING to handle race conditions
        const newSessionData: InsertWorkoutSessionLog = {
            workoutSessionLogId,
            userId,
            sessionName,
            startTime: new Date(),
            // endTime is left null until the session is completed
        };

        const result = await db
            .insert(WorkoutSessionsLog)
            .values(newSessionData)
            .onConflictDoNothing()
            .returning();

        // If no result returned, the session already exists - fetch it
        if (!result || result.length === 0) {
            console.log(
                `Workout session log ${workoutSessionLogId} already exists, fetching existing record`
            );

            const existingSession = await db
                .select()
                .from(WorkoutSessionsLog)
                .where(
                    eq(
                        WorkoutSessionsLog.workoutSessionLogId,
                        workoutSessionLogId
                    )
                )
                .limit(1);

            if (!existingSession || existingSession.length === 0) {
                throw new Error(
                    "Failed to create or retrieve workout session log"
                );
            }

            return existingSession[0];
        }

        console.log(`✅ Created workout session log: ${workoutSessionLogId}`);
        return result[0];
    } catch (error) {
        console.error("Error creating workout session log:", error);
        throw new Error("Failed to create workout session log");
    }
}

/**
 * Starts a new workout session for a user and returns similar past sessions.
 * If an existing workoutSessionLogId is provided, it will not create a new session
 * but will return the past sessions.
 *
 * @param userId - The ID of the user starting the workout
 * @param sessionName - The name of the session being performed
 * @param existingWorkoutSessionLogId - Optional ID of an existing workout session
 * @returns Object containing the new session (or existing session) and past similar sessions
 */
export async function startWorkoutSession(
    userId: string,
    sessionName: string,
    existingWorkoutSessionLogId?: string
): Promise<StartWorkoutSessionResponse> {
    noStore();

    try {
        let newSession;

        // If an existing workout session log ID is provided, fetch it instead of creating a new one
        if (existingWorkoutSessionLogId) {
            const existingSession = await db
                .select()
                .from(WorkoutSessionsLog)
                .where(
                    eq(
                        WorkoutSessionsLog.workoutSessionLogId,
                        existingWorkoutSessionLogId
                    )
                )
                .limit(1);

            if (existingSession.length === 0) {
                throw new Error(
                    `Workout session with ID ${existingWorkoutSessionLogId} not found`
                );
            }

            newSession = existingSession[0];
        } else {
            // Check if there's an existing unfinished session for this user and session name
            const existingUnfinishedSession = await db
                .select()
                .from(WorkoutSessionsLog)
                .where(
                    and(
                        eq(WorkoutSessionsLog.userId, userId),
                        eq(WorkoutSessionsLog.sessionName, sessionName),
                        isNull(WorkoutSessionsLog.endTime)
                    )
                )
                .limit(1);

            if (existingUnfinishedSession.length > 0) {
                // Use the existing unfinished session
                newSession = existingUnfinishedSession[0];
                console.log(
                    "Using existing unfinished session:",
                    newSession.workoutSessionLogId
                );
            } else {
                // Use a transaction to handle race conditions when creating new sessions
                // This prevents multiple sessions being created simultaneously for the same user/sessionName
                newSession = await db.transaction(async (tx) => {
                    // Double-check for existing unfinished session within transaction
                    const existingUnfinishedSessionInTx = await tx
                        .select()
                        .from(WorkoutSessionsLog)
                        .where(
                            and(
                                eq(WorkoutSessionsLog.userId, userId),
                                eq(WorkoutSessionsLog.sessionName, sessionName),
                                isNull(WorkoutSessionsLog.endTime)
                            )
                        )
                        .limit(1);

                    if (existingUnfinishedSessionInTx.length > 0) {
                        // Another transaction created a session, use it
                        return existingUnfinishedSessionInTx[0];
                    }

                    // Create a new workout session log entry
                    const newSessionData: InsertWorkoutSessionLog = {
                        userId,
                        sessionName,
                        startTime: new Date(),
                        // endTime is left null until the session is completed
                    };

                    const result = await tx
                        .insert(WorkoutSessionsLog)
                        .values(newSessionData)
                        .returning();

                    if (!result || result.length === 0) {
                        throw new Error("Failed to create workout session log");
                    }

                    return result[0];
                });
            }
        }

        // Get past sessions with the same name (most recent first)
        const pastSessions = await db
            .select()
            .from(WorkoutSessionsLog)
            .where(
                and(
                    eq(WorkoutSessionsLog.userId, userId),
                    eq(WorkoutSessionsLog.sessionName, sessionName),
                    isNotNull(WorkoutSessionsLog.endTime)
                )
            )
            .orderBy(desc(WorkoutSessionsLog.startTime))

        // Get details for each past session
        const pastSessionsWithDetails = await Promise.all(
            pastSessions.map(async (session) => {
                const details = await db
                    .select()
                    .from(WorkoutSessionDetails)
                    .where(
                        eq(
                            WorkoutSessionDetails.workoutSessionLogId,
                            session.workoutSessionLogId
                        )
                    );
                return {
                    session,
                    details,
                };
            })
        );

        return {
            newSession,
            pastSessions: pastSessionsWithDetails,
        };
    } catch (error) {
        console.error("Error starting workout session:", error);
        throw new Error("Failed to start workout session");
    }
}

/**
 * Logs a set of an exercise during a workout session.
 *
 * @param workoutSessionLogId - The ID of the workout session log
 * @param exerciseName - The name of the exercise performed
 * @param sets - Number of sets performed
 * @param reps - Number of repetitions performed
 * @param weight - Weight used (if applicable)
 * @param coachNote - Optional note from coach
 * @param setOrderMarker - Optional order marker for the exercise
 * @returns The created workout session detail entry
 */
export async function logWorkoutSet(
    workoutSessionLogId: string,
    exerciseName: string,
    setNumber: number | null,
    reps: number | null,
    weight: number | null,
    coachNote?: string,
    setOrderMarker?: string
): Promise<SelectWorkoutSessionDetail> {
    noStore();

    try {
        // First, verify that the workout session log exists
        const sessionExists = await db
            .select({ id: WorkoutSessionsLog.workoutSessionLogId })
            .from(WorkoutSessionsLog)
            .where(
                eq(WorkoutSessionsLog.workoutSessionLogId, workoutSessionLogId)
            )
            .limit(1);

        if (!sessionExists || sessionExists.length === 0) {
            throw new Error(
                `Workout session with ID ${workoutSessionLogId} does not exist`
            );
        }

        // Calculate workout volume if possible
        let workoutVolume: number | null = null;
        if (reps !== null && weight !== null) {
            workoutVolume = reps * weight;
        }

        // Create a new workout session detail entry
        const newDetail: InsertWorkoutSessionDetail = {
            workoutSessionLogId,
            exerciseName,
            sets: setNumber,
            reps,
            weight,
            workoutVolume,
            coachNote: coachNote || null,
            setOrderMarker: setOrderMarker || null,
            entryTime: new Date(),
        };

        const result = await db
            .insert(WorkoutSessionDetails)
            .values(newDetail)
            .returning();

        if (!result || result.length === 0) {
            throw new Error("Failed to log workout set");
        }

        return result[0];
    } catch (error) {
        console.error("Error logging workout set:", error);
        throw new Error("Failed to log workout set");
    }
}

/**
 * Updates an existing workout set entry.
 * Useful for correcting mistakes or updating information.
 *
 * @param workoutDetailId - The ID of the workout detail to update
 * @param updates - Object containing the fields to update
 * @returns The updated workout session detail entry
 */
export async function updateWorkoutSet(
    workoutDetailId: string,
    updates: {
        sets?: number | null;
        reps?: number | null;
        weight?: number | null;
        coachNote?: string | null;
    }
): Promise<SelectWorkoutSessionDetail> {
    noStore();

    try {
        // Calculate workout volume if all required fields are present
        const updateData: Partial<InsertWorkoutSessionDetail> = { ...updates };

        // If all three values are provided, recalculate the workout volume
        if (
            updates.sets !== undefined ||
            updates.reps !== undefined ||
            updates.weight !== undefined
        ) {
            // First get the current record to have all values
            const currentRecord = await db
                .select()
                .from(WorkoutSessionDetails)
                .where(
                    eq(WorkoutSessionDetails.workoutDetailId, workoutDetailId)
                )
                .limit(1);

            if (!currentRecord || currentRecord.length === 0) {
                throw new Error("Workout set not found");
            }

            const current = currentRecord[0];
            const reps = updates.reps ?? current.reps;
            const weight = updates.weight ?? current.weight;

            // Only calculate volume if reps and weight are non-null
            if (reps !== null && weight !== null) {
                updateData.workoutVolume = reps * weight;
            } else {
                updateData.workoutVolume = null;
            }
        }

        const result = await db
            .update(WorkoutSessionDetails)
            .set(updateData)
            .where(eq(WorkoutSessionDetails.workoutDetailId, workoutDetailId))
            .returning();

        if (!result || result.length === 0) {
            throw new Error("Failed to update workout set");
        }

        return result[0];
    } catch (error) {
        console.error("Error updating workout set:", error);
        throw new Error("Failed to update workout set");
    }
}

/**
 * Deletes a workout set entry.
 *
 * @param workoutDetailId - The ID of the workout detail to delete
 * @returns Boolean indicating success
 */
export async function deleteWorkoutSet(
    workoutDetailId: string
): Promise<boolean> {
    noStore();

    try {
        const result = await db
            .delete(WorkoutSessionDetails)
            .where(eq(WorkoutSessionDetails.workoutDetailId, workoutDetailId))
            .returning({ deletedId: WorkoutSessionDetails.workoutDetailId });

        return result.length > 0;
    } catch (error) {
        console.error("Error deleting workout set:", error);
        throw new Error("Failed to delete workout set");
    }
}

/**
 * Gets workout statistics for a user within a specified date range.
 *
 * @param userId - The ID of the user
 * @param startDate - Start date for the statistics (optional)
 * @param endDate - End date for the statistics (optional)
 * @returns Workout statistics
 */
export async function getUserWorkoutStats(
    userId: string,
    startDate?: Date,
    endDate?: Date
): Promise<{
    totalSessions: number;
    totalVolume: number;
    totalDuration: number; // in minutes
    exerciseCounts: Record<string, number>;
}> {
    noStore();

    try {
        // Build the query conditions
        const conditions = [eq(WorkoutSessionsLog.userId, userId)];

        if (startDate) {
            conditions.push(gte(WorkoutSessionsLog.startTime, startDate));
        }

        if (endDate) {
            conditions.push(lte(WorkoutSessionsLog.startTime, endDate));
        }

        // Get all completed workout sessions
        const sessions = await db
            .select()
            .from(WorkoutSessionsLog)
            .where(and(...conditions, isNotNull(WorkoutSessionsLog.endTime)));

        // Get all workout details for these sessions
        const sessionIds = sessions.map((s) => s.workoutSessionLogId);

        // If no sessions found, return empty stats
        if (sessionIds.length === 0) {
            return {
                totalSessions: 0,
                totalVolume: 0,
                totalDuration: 0,
                exerciseCounts: {},
            };
        }

        const details = await db
            .select()
            .from(WorkoutSessionDetails)
            .where(
                inArray(WorkoutSessionDetails.workoutSessionLogId, sessionIds)
            );

        // Calculate statistics
        let totalVolume = 0;
        let totalDuration = 0;
        const exerciseCounts: Record<string, number> = {};

        // Calculate total volume
        details.forEach((detail) => {
            if (detail.workoutVolume) {
                totalVolume += detail.workoutVolume;
            }

            // Count exercises
            if (detail.exerciseName) {
                exerciseCounts[detail.exerciseName] =
                    (exerciseCounts[detail.exerciseName] || 0) + 1;
            }
        });

        // Calculate total duration in minutes
        sessions.forEach((session) => {
            if (session.startTime && session.endTime) {
                const durationMs =
                    new Date(session.endTime).getTime() -
                    new Date(session.startTime).getTime();
                totalDuration += durationMs / (1000 * 60); // Convert ms to minutes
            }
        });

        return {
            totalSessions: sessions.length,
            totalVolume,
            totalDuration,
            exerciseCounts,
        };
    } catch (error) {
        console.error("Error getting user workout stats:", error);
        throw new Error("Failed to get workout statistics");
    }
}

/**
 * Ends a workout session by updating the endTime.
 *
 * @param workoutSessionLogId - The ID of the workout session log to end
 * @returns The updated workout session log entry
 */
export async function endWorkoutSession(
    workoutSessionLogId: string
): Promise<SelectWorkoutSessionLog> {
    noStore();

    try {
        // Update the workout session log with the end time
        const result = await db
            .update(WorkoutSessionsLog)
            .set({ endTime: new Date() })
            .where(
                eq(WorkoutSessionsLog.workoutSessionLogId, workoutSessionLogId)
            )
            .returning();

        if (!result || result.length === 0) {
            throw new Error("Failed to end workout session");
        }

        return result[0];
    } catch (error) {
        console.error("Error ending workout session:", error);
        throw new Error("Failed to end workout session");
    }
}

/**
 * Retrieves all workout session logs for a specific user.
 *
 * @param userId - The ID of the user whose workout logs to retrieve
 * @param limit - Maximum number of logs to return (default: 10)
 * @param offset - Number of logs to skip (for pagination)
 * @returns Array of workout session logs
 */
export async function getUserWorkoutLogs(
    userId: string,
    limit: number = 10,
    offset: number = 0
): Promise<SelectWorkoutSessionLog[]> {
    noStore();

    try {
        const logs = await db
            .select()
            .from(WorkoutSessionsLog)
            .where(eq(WorkoutSessionsLog.userId, userId))
            .orderBy(desc(WorkoutSessionsLog.startTime))
            .limit(limit)
            .offset(offset);

        return logs;
    } catch (error) {
        console.error("Error fetching user workout logs:", error);
        throw new Error("Failed to fetch workout logs");
    }
}

/**
 * Retrieves workout details for a specific workout session log.
 *
 * @param workoutSessionLogId - The ID of the workout session log
 * @returns Array of workout session details
 */
export async function getWorkoutSessionDetails(
    workoutSessionLogId: string
): Promise<SelectWorkoutSessionDetail[]> {
    noStore();

    try {
        const details = await db
            .select()
            .from(WorkoutSessionDetails)
            .where(
                eq(
                    WorkoutSessionDetails.workoutSessionLogId,
                    workoutSessionLogId
                )
            )
            .orderBy(WorkoutSessionDetails.entryTime);

        return details;
    } catch (error) {
        console.error("Error fetching workout session details:", error);
        throw new Error("Failed to fetch workout session details");
    }
}

/**
 * Deletes an entire workout session and all its details (for active sessions).
 * This is used when a user wants to quit without saving their current session.
 * Unlike deleteEmptyWorkoutSession, this deletes regardless of content.
 *
 * @param workoutSessionLogId - The ID of the workout session log to delete
 * @returns Boolean indicating success
 */
export async function deleteActiveWorkoutSession(
    workoutSessionLogId: string
): Promise<boolean> {
    noStore();

    try {
        // First delete all workout details associated with this session
        await db
            .delete(WorkoutSessionDetails)
            .where(
                eq(
                    WorkoutSessionDetails.workoutSessionLogId,
                    workoutSessionLogId
                )
            );

        // Then delete the session itself
        const result = await db
            .delete(WorkoutSessionsLog)
            .where(
                eq(WorkoutSessionsLog.workoutSessionLogId, workoutSessionLogId)
            )
            .returning({ deletedId: WorkoutSessionsLog.workoutSessionLogId });

        console.log(
            `✅ Deleted active workout session and all details: ${workoutSessionLogId}`
        );
        return result.length > 0;
    } catch (error) {
        console.error("Error deleting active workout session:", error);
        throw new Error("Failed to delete active workout session");
    }
}

/**
 * Deletes an empty workout session (one with no meaningful workout details).
 * A session is considered empty if it has no details OR all details have 0 reps.
 * This is useful for cleaning up sessions that were started but abandoned.
 *
 * @param workoutSessionLogId - The ID of the workout session log to delete
 * @returns Boolean indicating success
 */
export async function deleteEmptyWorkoutSession(
    workoutSessionLogId: string
): Promise<boolean> {
    noStore();

    try {
        // Check if the session has any workout details with non-zero reps
        const meaningfulDetails = await db
            .select({
                workoutDetailId: WorkoutSessionDetails.workoutDetailId,
                reps: WorkoutSessionDetails.reps,
            })
            .from(WorkoutSessionDetails)
            .where(
                and(
                    eq(
                        WorkoutSessionDetails.workoutSessionLogId,
                        workoutSessionLogId
                    ),
                    // Only consider details with reps > 0 as meaningful
                    gte(WorkoutSessionDetails.reps, 1)
                )
            );

        if (meaningfulDetails.length > 0) {
            console.warn(
                `Cannot delete workout session ${workoutSessionLogId} - it has ${meaningfulDetails.length} sets with recorded reps`
            );
            return false;
        }

        // Delete any existing details with 0 reps first (cleanup)
        await db
            .delete(WorkoutSessionDetails)
            .where(
                eq(
                    WorkoutSessionDetails.workoutSessionLogId,
                    workoutSessionLogId
                )
            );

        // Delete the empty workout session
        const result = await db
            .delete(WorkoutSessionsLog)
            .where(
                eq(WorkoutSessionsLog.workoutSessionLogId, workoutSessionLogId)
            )
            .returning({ deletedId: WorkoutSessionsLog.workoutSessionLogId });

        console.log(`✅ Deleted empty workout session ${workoutSessionLogId}`);
        return result.length > 0;
    } catch (error) {
        console.error("Error deleting empty workout session:", error);
        throw new Error("Failed to delete empty workout session");
    }
}
