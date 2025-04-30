"use server";

import { Exercises } from "@/db/schemas";
import { db } from "@/db/xata";
import { desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import "server-only";
import { requireTrainerOrAdmin } from "@/lib/auth-utils";

export async function getAllExercises(params: Record<string, unknown> = {}) {
    await requireTrainerOrAdmin();
    // Extract pagination parameters from params
    const pageIndex =
        typeof params.pageIndex === "number"
            ? params.pageIndex
            : typeof params.pageIndex === "string"
            ? parseInt(params.pageIndex, 10)
            : 0;

    const pageSize =
        typeof params.pageSize === "number"
            ? params.pageSize
            : typeof params.pageSize === "string"
            ? parseInt(params.pageSize, 10)
            : 10;

    // Extract sorting from params
    let sorting: Array<{ id: string; desc: boolean }> = [];
    if (params.sorting && typeof params.sorting === "string") {
        try {
            sorting = JSON.parse(params.sorting as string);
        } catch (e) {
            console.error("Error parsing sorting parameter:", e);
        }
    }

    // Extract search from params
    const search =
        typeof params.search === "string" ? params.search : undefined;

    // Extract filters from params
    let columnFilters: Array<{ id: string; value: string }> = [];
    if (params.filters && typeof params.filters === "string") {
        try {
            columnFilters = JSON.parse(params.filters as string);
        } catch (e) {
            console.error("Error parsing filters parameter:", e);
        }
    }

    console.log(
        `Fetching all exercises, page: ${pageIndex}, pageSize: ${pageSize}, search: ${search}`
    );
    if (sorting.length > 0) {
        console.log(`Sorting:`, sorting);
    }
    if (columnFilters.length > 0) {
        console.log(`Filters:`, columnFilters);
    }

    const Exercise = alias(Exercises, "exercise");

    // Create a Promise.all to fetch count and data concurrently
    const [countResult, exercisesData] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(Exercise),

        db
            .select({
                exerciseId: Exercise.exerciseId,
                name: Exercise.exerciseName,
                description: Exercise.description,
                motion: Exercise.motion,
                targetArea: Exercise.targetArea,
                status: Exercise.approvedByAdmin,
                videoUrl: Exercise.videoUrl,
                createdAt: Exercise.uploadDate,
            })
            .from(Exercise)
            .orderBy(desc(Exercise.uploadDate))
            .limit(pageSize)
            .offset(pageIndex * pageSize),
    ]);

    // Calculate accurate pagination values
    const totalCount = Number(countResult[0]?.count || 0);

    console.log(
        `Found ${
            exercisesData.length
        } exercises (page ${pageIndex} of ${Math.ceil(totalCount / pageSize)})`
    );

    return {
        data: exercisesData,
        meta: {
            totalCount,
            page: pageIndex,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize),
            hasMore: (pageIndex + 1) * pageSize < totalCount,
            totalRowCount: totalCount,
        },
    };
}

// New function to get all exercises with complete data for workout planning
export async function getAllExercisesForWorkoutPlanning() {
    try {
        const exercises = await db.select().from(Exercises);
        return exercises;
    } catch (error) {
        console.error("Error fetching exercises for workout planning:", error);
        return [];
    }
}
