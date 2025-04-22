"use server";

import { db } from "@/db/xata";
import { WorkoutSessionDetails, WorkoutSessionsLog } from "@/db/schemas";
import { eq, desc, sql, and } from "drizzle-orm";

/**
 * Fetch a page of workout history details.
 * @param start zero-based offset
 * @param size number of records to fetch
 * @returns items and total count
 */
export async function fetchWorkoutHistoryPage(start: number, size: number) {
    // Query detail rows with optional session info (e.g. session start time)
    const [rows, countResult] = await Promise.all([
        db
            .select({
                workoutDetailId: WorkoutSessionDetails.workoutDetailId,
                workoutSessionLogId: WorkoutSessionDetails.workoutSessionLogId,
                exerciseName: WorkoutSessionDetails.exerciseName,
                sets: WorkoutSessionDetails.sets,
                reps: WorkoutSessionDetails.reps,
                weight: WorkoutSessionDetails.weight,
                coachNote: WorkoutSessionDetails.coachNote,
                entryTime: WorkoutSessionDetails.entryTime,
                sessionStart: WorkoutSessionsLog.startTime,
            })
            .from(WorkoutSessionDetails)
            .leftJoin(
                WorkoutSessionsLog,
                eq(
                    WorkoutSessionDetails.workoutSessionLogId,
                    WorkoutSessionsLog.workoutSessionLogId
                )
            )
            .orderBy(desc(WorkoutSessionDetails.entryTime))
            .limit(size)
            .offset(start),
        db.select({ count: sql<number>`count(*)` }).from(WorkoutSessionDetails),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const items = rows.map((row) => ({
        id: row.workoutDetailId,
        date: row.entryTime ? row.entryTime.toISOString() : null,
        exerciseName: row.exerciseName,
        sets: row.sets ?? 0,
        reps: row.reps ?? 0,
        weight: row.weight ?? 0,
        notes: row.coachNote ?? "",
    }));

    return { items, total };
}

/**
 * Delete a single workout detail entry by its ID.
 * @param detailId the UUID of the WorkoutSessionDetails record
 */
export async function deleteWorkoutHistoryEntry(detailId: string) {
    await db
        .delete(WorkoutSessionDetails)
        .where(eq(WorkoutSessionDetails.workoutDetailId, detailId));
}

/**
 * Update a single workout detail entry.
 * @param detailId the UUID of the WorkoutSessionDetails record
 * @param changes partial fields to update
 */
export async function updateWorkoutHistoryEntry(
    detailId: string,
    changes: Partial<{
        exerciseName: string;
        sets: number;
        reps: number;
        weight: number;
        coachNote: string;
    }>
) {
    await db
        .update(WorkoutSessionDetails)
        .set(changes)
        .where(eq(WorkoutSessionDetails.workoutDetailId, detailId));
}

// Fetch a page of workout session logs (session-level data)
export async function fetchWorkoutSessionLogsPage(
    userId: string,
    start: number,
    size: number
) {
    const [rows, countResult] = await Promise.all([
        db
            .select({
                workoutSessionLogId: WorkoutSessionsLog.workoutSessionLogId,
                sessionName: WorkoutSessionsLog.sessionName,
                startTime: WorkoutSessionsLog.startTime,
                endTime: WorkoutSessionsLog.endTime,
            })
            .from(WorkoutSessionsLog)
            .where(eq(WorkoutSessionsLog.userId, userId))
            .orderBy(desc(WorkoutSessionsLog.startTime))
            .limit(size)
            .offset(start),
        db
            .select({ count: sql<number>`count(*)` })
            .from(WorkoutSessionsLog)
            .where(eq(WorkoutSessionsLog.userId, userId)),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    // Convert dates to ISO strings for client-side use
    const items = rows.map((row) => ({
        workoutSessionLogId: row.workoutSessionLogId,
        sessionName: row.sessionName,
        startTime: row.startTime.toISOString(),
        endTime: row.endTime ? row.endTime.toISOString() : null,
    }));

    return { items, total };
}

/**
 * Delete an entire workout session and all its details.
 * @param sessionId the UUID of the WorkoutSessionsLog record
 */
export async function deleteWorkoutSession(sessionId: string) {
    // First delete all workout details associated with this session
    await db
        .delete(WorkoutSessionDetails)
        .where(eq(WorkoutSessionDetails.workoutSessionLogId, sessionId));

    // Then delete the session itself
    await db
        .delete(WorkoutSessionsLog)
        .where(eq(WorkoutSessionsLog.workoutSessionLogId, sessionId));
}

// Fetch all workout details for a given session, grouped by exercise name
export async function fetchWorkoutDetailsBySession(
    sessionLogId: string,
    userId: string
) {
    // First verify this session belongs to the user
    const session = await db
        .select()
        .from(WorkoutSessionsLog)
        .where(
            and(
                eq(WorkoutSessionsLog.workoutSessionLogId, sessionLogId),
                eq(WorkoutSessionsLog.userId, userId)
            )
        )
        .limit(1);

    if (!session.length) {
        throw new Error("Session not found or unauthorized");
    }

    const rows = await db
        .select({
            workoutDetailId: WorkoutSessionDetails.workoutDetailId,
            exerciseName: WorkoutSessionDetails.exerciseName,
            sets: WorkoutSessionDetails.sets,
            reps: WorkoutSessionDetails.reps,
            weight: WorkoutSessionDetails.weight,
            coachNote: WorkoutSessionDetails.coachNote,
            entryTime: WorkoutSessionDetails.entryTime,
        })
        .from(WorkoutSessionDetails)
        .where(eq(WorkoutSessionDetails.workoutSessionLogId, sessionLogId))
        .orderBy(desc(WorkoutSessionDetails.entryTime));

    // Convert rows to client-friendly shape
    const details = rows.map((row) => ({
        id: row.workoutDetailId,
        exerciseName: row.exerciseName,
        sets: row.sets ?? 0,
        reps: row.reps ?? 0,
        weight: row.weight ?? 0,
        notes: row.coachNote ?? "",
        entryTime: row.entryTime ? row.entryTime.toISOString() : null,
    }));

    // Group by exercise name
    const groupedByExercise: Record<string, typeof details> = {};

    details.forEach((detail) => {
        if (!groupedByExercise[detail.exerciseName]) {
            groupedByExercise[detail.exerciseName] = [];
        }
        groupedByExercise[detail.exerciseName].push(detail);
    });

    // Flatten the grouped exercises back into an array, but now ordered by exercise name
    const result: typeof details = [];

    Object.values(groupedByExercise).forEach((exercises) => {
        // Sort exercises by entryTime if needed
        exercises.sort((a, b) => {
            if (!a.entryTime) return 1;
            if (!b.entryTime) return -1;
            return (
                new Date(b.entryTime).getTime() -
                new Date(a.entryTime).getTime()
            );
        });

        result.push(...exercises);
    });

    return result;
}
