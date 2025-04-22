"use server";

import { db } from "@/db/xata";
import { WorkoutSessionDetails, WorkoutSessionsLog } from "@/db/schemas";
import { eq, desc, sql } from "drizzle-orm";

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
export async function fetchWorkoutSessionLogsPage(start: number, size: number) {
    const [rows, countResult] = await Promise.all([
        db
            .select({
                workoutSessionLogId: WorkoutSessionsLog.workoutSessionLogId,
                sessionName: WorkoutSessionsLog.sessionName,
                startTime: WorkoutSessionsLog.startTime,
                endTime: WorkoutSessionsLog.endTime,
            })
            .from(WorkoutSessionsLog)
            .orderBy(desc(WorkoutSessionsLog.startTime))
            .limit(size)
            .offset(start),
        db.select({ count: sql<number>`count(*)` }).from(WorkoutSessionsLog),
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

// Fetch all workout details for a given session
export async function fetchWorkoutDetailsBySession(sessionLogId: string) {
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

    // map raw rows to client-friendly shape
    return rows.map((row) => ({
        id: row.workoutDetailId,
        exerciseName: row.exerciseName,
        sets: row.sets ?? 0,
        reps: row.reps ?? 0,
        weight: row.weight ?? 0,
        notes: row.coachNote ?? "",
        entryTime: row.entryTime ? row.entryTime.toISOString() : null,
    }));
}
