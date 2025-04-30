"use server";

import { Exercises } from "@/db/schemas";
import { db } from "@/db/xata";
import { desc, sql, and } from "drizzle-orm";
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
  const search = typeof params.search === "string" ? params.search : undefined;

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
        difficulty: Exercise.motion,
        muscleGroup: Exercise.targetArea,
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
    `Found ${exercisesData.length} exercises (page ${pageIndex} of ${Math.ceil(
      totalCount / pageSize
    )})`
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

// Type for exercise creation
type CreateExerciseInput = {
  exerciseName: string;
  description?: string;
  videoUrl?: string;
  motion?: string;
  targetArea?: string;
  uploadedByUserId: string;
};

export async function createExercise(
  input: CreateExerciseInput | CreateExerciseInput[]
) {
  await requireTrainerOrAdmin();

  try {
    if (Array.isArray(input)) {
      // Handle bulk creation from CSV
      const exercises = input.map((exercise) => ({
        exerciseName: exercise.exerciseName,
        description: exercise.description || null,
        videoUrl: exercise.videoUrl || null,
        motion: exercise.motion || null,
        targetArea: exercise.targetArea || null,
        uploadedByUserId: exercise.uploadedByUserId,
        approvedByAdmin: false, // Default to false for new exercises
        uploadDate: new Date(),
      }));

      const result = await db.insert(Exercises).values(exercises).returning();
      return { success: true, data: result };
    } else {
      // Handle single exercise creation
      const result = await db
        .insert(Exercises)
        .values({
          exerciseName: input.exerciseName,
          description: input.description || null,
          videoUrl: input.videoUrl || null,
          motion: input.motion || null,
          targetArea: input.targetArea || null,
          uploadedByUserId: input.uploadedByUserId,
          approvedByAdmin: false, // Default to false for new exercise
          uploadDate: new Date(),
        })
        .returning();

      return { success: true, data: result[0] };
    }
  } catch (error) {
    console.error("Error creating exercise(s):", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}

export async function getExerciseById(exerciseId: string) {
  await requireTrainerOrAdmin();

  try {
    const exercise = await db
      .select()
      .from(Exercises)
      .where(sql`${Exercises.exerciseId} = ${exerciseId}`)
      .limit(1);

    const Exercise = alias(Exercises, "exercise");

    // Create a Promise.all to fetch count and data concurrently

    // Define allowed filter columns for exercises
    const ALLOWED_FILTER_COLUMNS = new Set([
        "name",
        "motion",
        "targetArea",
        "approval_status",
    ]);

    // Map filters to conditions
    const filterConditions = columnFilters
        .map((filter) => {
            const { id, value } = filter;
            if (!ALLOWED_FILTER_COLUMNS.has(id)) {
                console.warn(`Unsupported filter column: ${id}`);
                return undefined;
            }
            switch (id) {
                case "name":
                    return sql`${Exercise.exerciseName} ILIKE ${`%${value}%`}`;
                case "motion":
                    return sql`${Exercise.motion} ILIKE ${`%${value}%`}`;
                case "targetArea":
                    return sql`${Exercise.targetArea} ILIKE ${`%${value}%`}`;
                case "approval_status":
                    // For boolean filter, convert string to boolean
                    const boolValue =
                        value === "true" || value === "True" || value === "TRUE"
                            ? true
                            : false;
                    return sql`${Exercise.approvedByAdmin} = ${boolValue}`;
                default:
                    return undefined;
            }
        })
        .filter(Boolean);

    // Build search condition if present
    let searchCondition;
    if (search) {
        const searchLike = `%${search}%`;
        searchCondition = sql`(
            ${Exercise.exerciseName} ILIKE ${searchLike} OR
            ${Exercise.motion} ILIKE ${searchLike} OR
            ${Exercise.targetArea} ILIKE ${searchLike}
        )`;
    }

    // Combine all conditions
    const whereConditions = [
        ...(searchCondition ? [searchCondition] : []),
        ...filterConditions,
    ];

    // Build count query
    const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(Exercise)
        .where(
            whereConditions.length > 0 ? and(...whereConditions) : undefined
        );

    // Build data query
    let dataQuery = db
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
        .orderBy(
            ...(
                sorting.length > 0
                    ? sorting.map((sort) => {
                          const { id, desc: isDesc } = sort;
                          switch (id) {
                              case "name":
                                  return isDesc
                                      ? desc(Exercise.exerciseName)
                                      : sql`${Exercise.exerciseName} asc`;
                              case "motion":
                                  return isDesc
                                      ? desc(Exercise.motion)
                                      : sql`${Exercise.motion} asc`;
                              case "targetArea":
                                  return isDesc
                                      ? desc(Exercise.targetArea)
                                      : sql`${Exercise.targetArea} asc`;
                              case "approval_status":
                                  return isDesc
                                      ? desc(Exercise.approvedByAdmin)
                                      : sql`${Exercise.approvedByAdmin} asc`;
                              case "createdAt":
                                  return isDesc
                                      ? desc(Exercise.uploadDate)
                                      : sql`${Exercise.uploadDate} asc`;
                              default:
                                  return desc(Exercise.uploadDate);
                          }
                      })
                    : [desc(Exercise.uploadDate)]
            )
        )
        .limit(pageSize)
        .offset(pageIndex * pageSize);

    if (whereConditions.length > 0) {
        // @ts-expect-error workaround for missing where in type
        dataQuery = dataQuery.where(and(...whereConditions));
    }

    const [countResult, exercisesData] = await Promise.all([
        countQuery,
        dataQuery,
    ]);

    // Calculate accurate pagination values
    const totalCount = Number(countResult[0]?.count || 0);

    console.log(
        `Found ${
            exercisesData.length
        } exercises (page ${pageIndex} of ${Math.ceil(totalCount / pageSize)})`
    );

    return { success: true, data: exercise[0] };
  } catch (error) {
    console.error("Error fetching exercise:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch exercise",
    };
  }
}

export async function updateExercise(
  exerciseId: string,
  input: Partial<CreateExerciseInput>
) {
  await requireTrainerOrAdmin();

  try {
    const result = await db
      .update(Exercises)
      .set({
        exerciseName: input.exerciseName,
        description: input.description || null,
        videoUrl: input.videoUrl || null,
        motion: input.motion || null,
        targetArea: input.targetArea || null,
        // Don't update uploadedByUserId as it should remain the same
      })
      .where(sql`${Exercises.exerciseId} = ${exerciseId}`)
      .returning();

    if (!result || result.length === 0) {
      return { success: false, error: "Exercise not found" };
    }

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Error updating exercise:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update exercise",
    };
  }
}
