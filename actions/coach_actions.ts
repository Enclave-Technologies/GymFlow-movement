"use server";

import { Roles, UserRoles, Users } from "@/db/schemas";
import { db } from "@/db/xata";
import { eq, desc, and, sql, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import "server-only";

/**
 * Returns a trainer by their user ID
 * @param trainerId - The user ID of the trainer
 * @returns Trainer user data or null if not found
 */
import { requireTrainerOrAdmin } from "@/lib/auth-utils";

export async function getCoachById(trainerId: string) {
  await requireTrainerOrAdmin();
  if (!trainerId) {
    console.log(`No trainer ID provided`);
    return null;
  }

  console.log(`Fetching trainer with ID: ${trainerId}`);

  const Trainer = alias(Users, "trainer");

  // Join Users with UserRoles and Roles to verify the user is a trainer
  const trainerData = await db
    .select({
      userId: Trainer.userId,
      fullName: Trainer.fullName,
      email: Trainer.email,
      phone: Trainer.phone,
      notes: Trainer.notes,
      imageUrl: Trainer.imageUrl,
      registrationDate: Trainer.registrationDate,
      gender: Trainer.gender,
      approved: UserRoles.approvedByAdmin,
      job_title: Trainer.jobTitle,
    })
    .from(Trainer)
    .innerJoin(UserRoles, eq(Trainer.userId, UserRoles.userId))
    .innerJoin(Roles, eq(UserRoles.roleId, Roles.roleId))
    .where(
      and(
        eq(Trainer.userId, trainerId),
        or(eq(Roles.roleName, "Trainer"), eq(Roles.roleName, "Admin"))
      )
    )
    .limit(1);

  if (trainerData.length === 0) {
    console.log(`No trainer found with ID: ${trainerId}`);
    return null;
  }

  console.log(`Found trainer: ${trainerData[0].fullName}`);

  return trainerData[0];
}

/**
 * Debug function to fetch all roles from the database
 * This will help identify what roles actually exist in your system
 */
export async function getAllRoles() {
  await requireTrainerOrAdmin();
  console.log("DEBUG: Fetching all roles from database");

  const roles = await db
    .select({
      roleId: Roles.roleId,
      roleName: Roles.roleName,
    })
    .from(Roles);

  return roles;
}


/**
 * Returns paginated list of coaches with filtering, sorting, and search from URL params.
 * This function is used by the coaches/infinite-table.tsx component.
 * @param params - Object containing pagination, sorting, filtering, and search parameters
 * @returns Object containing coaches array and pagination info
 */
export async function getCoachesPaginated(
  params: Record<string, unknown> = {}
) {
  await requireTrainerOrAdmin();
  // Log input parameters
  console.log(
    "getCoachesPaginated - Received params:",
    JSON.stringify(params, null, 2)
  );

  // Parse pagination, sorting, search, and filters from params
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

  console.log(
    `getCoachesPaginated - Parsed pagination - pageIndex: ${pageIndex}, pageSize: ${pageSize}`
  );

  let sorting: Array<{ id: string; desc: boolean }> = [];
  let search: string | undefined;
  let parsedFilters: Array<{ id: string; value: unknown }> = [];

  if (params.sorting && typeof params.sorting === "string") {
    try {
      sorting = JSON.parse(params.sorting as string);
      console.log(
        "getCoachesPaginated - Parsed sorting:",
        JSON.stringify(sorting)
      );
    } catch (e) {
      console.error(
        "getCoachesPaginated - Error parsing sorting parameter:",
        e
      );
    }
  } else {
    console.log(
      "getCoachesPaginated - No sorting parameter provided or invalid type"
    );
  }

  if (typeof params.search === "string") {
    search = params.search;
    console.log(`getCoachesPaginated - Search string: "${search}"`);
  } else {
    console.log("getCoachesPaginated - No search parameter provided");
  }

  if (params.filters && typeof params.filters === "string") {
    try {
      parsedFilters = JSON.parse(params.filters as string);
      console.log(
        "getCoachesPaginated - Parsed filters:",
        JSON.stringify(parsedFilters)
      );
    } catch (e) {
      console.error(
        "getCoachesPaginated - Error parsing filters parameter:",
        e
      );
    }
  } else {
    console.log(
      "getCoachesPaginated - No filters parameter provided or invalid type"
    );
  }

  const Coach = alias(Users, "coach");

  // Base conditions: role must be Trainer or Admin
  const baseConditions = [
    or(eq(Roles.roleName, "Trainer"), eq(Roles.roleName, "Admin")),
  ];

  console.log(
    "getCoachesPaginated - Base conditions: role is Trainer or Admin"
  );

  // Allowed filter columns for coaches
  const ALLOWED_FILTER_COLUMNS = new Set([
    "fullName",
    "email",
    "phone",
    "gender",
  ]);

  // Build filter conditions for debugging
  const filterConditionsDebug: string[] = [];

  // Build filter conditions
  const filterConditions = parsedFilters
    .map((filter) => {
      const { id, value } = filter;
      if (!ALLOWED_FILTER_COLUMNS.has(id)) {
        console.warn(`getCoachesPaginated - Unsupported filter column: ${id}`);
        return undefined;
      }
      switch (id) {
        case "fullName":
          filterConditionsDebug.push(`fullName ILIKE %${value}%`);
          return sql`${Coach.fullName} ILIKE ${`%${String(value)}%`}`;
        case "email":
          filterConditionsDebug.push(`email ILIKE %${value}%`);
          return sql`${Coach.email} ILIKE ${`%${String(value)}%`}`;
        case "phone":
          filterConditionsDebug.push(`phone ILIKE %${value}%`);
          return sql`${Coach.phone} ILIKE ${`%${String(value)}%`}`;
        case "gender":
          const genderValue = String(value).toLowerCase();
          filterConditionsDebug.push(`gender = ${genderValue}`);
          if (genderValue === "male" || genderValue === "m") {
            return eq(Coach.gender, "male");
          } else if (genderValue === "female" || genderValue === "f") {
            return eq(Coach.gender, "female");
          } else if (genderValue === "non-binary" || genderValue === "nb") {
            return eq(Coach.gender, "non-binary");
          } else {
            return eq(Coach.gender, "prefer-not-to-say");
          }
        default:
          return undefined;
      }
    })
    .filter(Boolean);

  if (filterConditionsDebug.length > 0) {
    console.log(
      "getCoachesPaginated - Filter conditions applied:",
      filterConditionsDebug.join(", ")
    );
  } else {
    console.log("getCoachesPaginated - No filter conditions applied");
  }

  // Build search condition if search is provided
  let searchCondition;
  if (search) {
    const searchLike = `%${search}%`;
    console.log(
      `getCoachesPaginated - Applying search filter with pattern: ${searchLike}`
    );
    searchCondition = sql`(
          ${Coach.fullName} ILIKE ${searchLike} OR
          ${Coach.email} ILIKE ${searchLike} OR
          ${Coach.phone} ILIKE ${searchLike}
        )`;
  }

  // Combine all where conditions
  const whereConditions = [
    ...baseConditions,
    ...filterConditions,
    ...(searchCondition ? [searchCondition] : []),
  ];

  console.log(
    `getCoachesPaginated - Total where conditions: ${whereConditions.length}`
  );

  // Build order by columns
  let orderByColumns = [desc(Coach.registrationDate)]; // default sorting

  if (sorting.length > 0) {
    const orderByDebug: string[] = [];
    orderByColumns = sorting.map(({ id, desc: isDesc }) => {
      orderByDebug.push(`${id} ${isDesc ? "DESC" : "ASC"}`);
      switch (id) {
        case "email":
          return isDesc ? desc(Coach.email) : sql`${Coach.email} asc`;
        case "fullName":
          return isDesc ? desc(Coach.fullName) : sql`${Coach.fullName} asc`;
        case "registrationDate":
          return isDesc
            ? desc(Coach.registrationDate)
            : sql`${Coach.registrationDate} asc`;
        case "phone":
          return isDesc ? desc(Coach.phone) : sql`${Coach.phone} asc`;
        case "gender":
          return isDesc ? desc(Coach.gender) : sql`${Coach.gender} asc`;
        default:
          console.warn(`getCoachesPaginated - Unsupported sort column: ${id}`);
          return desc(Coach.registrationDate);
      }
    });
    console.log(
      "getCoachesPaginated - Sorting applied:",
      orderByDebug.join(", ")
    );
  } else {
    console.log("getCoachesPaginated - Default sorting: registrationDate DESC");
  }

  console.log("getCoachesPaginated - Executing database queries...");

  try {
    // Fetch total count and paginated coaches concurrently
    const [countResult, coachesData] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(Coach)
        .innerJoin(UserRoles, eq(Coach.userId, UserRoles.userId))
        .innerJoin(Roles, eq(UserRoles.roleId, Roles.roleId))
        .where(and(...whereConditions)),
      db
        .select({
          userId: Coach.userId,
          fullName: Coach.fullName,
          email: Coach.email,
          phone: Coach.phone,
          imageUrl: Coach.imageUrl,
          notes: Coach.notes,
          gender: Coach.gender,
          approved: UserRoles.approvedByAdmin,
          registrationDate: Coach.registrationDate,
        })
        .from(Coach)
        .innerJoin(UserRoles, eq(Coach.userId, UserRoles.userId))
        .innerJoin(Roles, eq(UserRoles.roleId, Roles.roleId))
        .where(and(...whereConditions))
        .orderBy(...orderByColumns)
        .limit(pageSize)
        .offset(pageIndex * pageSize),
    ]);

    const totalCount = Number(countResult[0]?.count || 0);

    console.log(
      `getCoachesPaginated - Found ${
        coachesData.length
      } coaches (page ${pageIndex} of ${Math.ceil(totalCount / pageSize)})`
    );

    // Log first few results for debugging
    if (coachesData.length > 0) {
      console.log("getCoachesPaginated - First result:", {
        userId: coachesData[0].userId,
        fullName: coachesData[0].fullName,
        email: coachesData[0].email,
      });
    }

    return {
      data: coachesData,
      meta: {
        totalCount,
        page: pageIndex,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        hasMore: (pageIndex + 1) * pageSize < totalCount,
        totalRowCount: totalCount,
      },
    };
  } catch (error) {
    console.error("getCoachesPaginated - Error executing query:", error);
    throw error;
  }
}
