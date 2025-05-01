"use server";

import { createAdminClient } from "@/appwrite/config";
import { Roles, TrainerClients, UserRoles, Users } from "@/db/schemas";
import { db } from "@/db/xata";
import { requireTrainerOrAdmin } from "@/lib/auth-utils";
import { eq, and, desc, sql, inArray, ilike, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ID, AppwriteException } from "node-appwrite";
import "server-only";
import { randomUUID } from "crypto";

/**
 * Update a user's idealWeight in the Users table.
 * @param userId - The user's ID
 * @param idealWeight - The ideal weight to set
 * @returns Success status and message
 */

export async function updateUserIdealWeight(
    userId: string,
    idealWeight: number
) {
    await requireTrainerOrAdmin();
    try {
        await db
            .update(Users)
            .set({ idealWeight })
            .where(eq(Users.userId, userId));
        return {
            success: true,
            message: "Ideal weight updated successfully",
        };
    } catch (error) {
        console.error("Error updating ideal weight:", error);
        return {
            success: false,
            message: `Error updating ideal weight: ${
                error instanceof Error ? error.message : String(error)
            }`,
        };
    }
}

export async function userRoleTable() {
    await requireTrainerOrAdmin();
    const userRoleData = await db
        .select({
            userId: Users.userId,
            roleName: Roles.roleName,
            approvedByAdmin: UserRoles.approvedByAdmin,
            userName: Users.fullName, // Include Users.name in the output
        })
        .from(UserRoles)
        .innerJoin(Roles, eq(UserRoles.roleId, Roles.roleId))
        .innerJoin(Users, eq(UserRoles.userId, Users.userId)); // Join the Users table
    return userRoleData;
}

/**
 * Returns all users (clients) managed by the given trainer appwrite_id.
 * @param trainerAppwriteId - The appwrite_id of the trainer
 * @returns Array of Users being managed by this trainer
 */
export async function getClientsManagedByUser(trainerAppwriteId: string) {
    await requireTrainerOrAdmin();
    console.log(`Fetching all clients for trainer: ${trainerAppwriteId}`);

    // First, get the trainer's name
    const trainerResult = await db
        .select({
            fullName: Users.fullName,
        })
        .from(Users)
        .where(eq(Users.userId, trainerAppwriteId))
        .limit(1);

    const trainerName = trainerResult[0]?.fullName || "Unknown Trainer";

    // Then get the clients
    const clients = await db
        .select({
            userId: Users.userId,
            fullName: Users.fullName,
            email: Users.email,
            registrationDate: Users.registrationDate,
            notes: Users.notes,
            phone: Users.phone,
            imageUrl: Users.imageUrl,
            gender: Users.gender,
            idealWeight: Users.idealWeight,
            dob: Users.dob,
            // Calculate age in JavaScript after fetching
            relationshipId: TrainerClients.relationshipId,
            assignedDate: TrainerClients.assignedDate,
        })
        .from(TrainerClients)
        .innerJoin(Users, eq(TrainerClients.clientId, Users.userId))
        .where(
            and(
                eq(TrainerClients.trainerId, trainerAppwriteId),
                eq(TrainerClients.isActive, true)
            )
        )
        .orderBy(desc(TrainerClients.assignedDate));

    // Add age and trainerName to each client
    const clientsWithAge = clients.map((client) => {
        // Calculate age from dob if available
        let age = null;
        if (client.dob) {
            const today = new Date();
            const birthDate = new Date(client.dob);
            age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
        }

        return {
            ...client,
            age,
            trainerName,
        };
    });

    console.log("Found clients:", clientsWithAge.length);
    // console.log("Sample client data:", clientsWithAge[0] || "No clients found");
    return clientsWithAge;
}

/**
 * Returns paginated users (clients) managed by the given trainer appwrite_id.
 * @param trainerAppwriteId - The appwrite_id of the trainer
 * @param params - Object containing pagination, sorting, and filtering parameters
 *                 OR page number (0-based) for backward compatibility
 * @param pageSize - Number of items per page (used only if first param is a number)
 * @returns Object containing clients array and pagination info
 */
export async function getClientsManagedByUserPaginated(
    trainerAppwriteId: string,
    params: Record<string, unknown> | number = 0,
    pageSize: number = 10
) {
    await requireTrainerOrAdmin();
    // Handle both new params object and old separate parameters
    let page = 0;
    let size = pageSize;
    let filters: Record<string, unknown> = {};
    let sorting: Array<{ id: string; desc: boolean }> = [];
    let search: string | undefined;
    let parsedFilters: Array<{ id: string; value: unknown }> = [];

    // Ensure trainerAppwriteId is a string
    if (typeof trainerAppwriteId !== "string") {
        console.error("Invalid trainerAppwriteId:", trainerAppwriteId);
        throw new Error("trainerAppwriteId must be a string");
    }

    console.log(
        `Received params for trainer ${trainerAppwriteId}:\n`,
        JSON.stringify(params, null, 2)
    );

    if (typeof params === "object") {
        // Extract pagination parameters from params
        page =
            typeof params.pageIndex === "number"
                ? params.pageIndex
                : typeof params.pageIndex === "string"
                ? parseInt(params.pageIndex, 10)
                : 0;

        size =
            typeof params.pageSize === "number"
                ? params.pageSize
                : typeof params.pageSize === "string"
                ? parseInt(params.pageSize, 10)
                : 10;

        // Extract sorting from params
        if (params.sorting && typeof params.sorting === "string") {
            try {
                sorting = JSON.parse(params.sorting as string);
            } catch (e) {
                console.error("Error parsing sorting parameter:", e);
            }
        }

        // Extract search from params
        search = typeof params.search === "string" ? params.search : undefined;

        // Extract filters from params
        if (params.filters && typeof params.filters === "string") {
            try {
                parsedFilters = JSON.parse(params.filters as string);
                console.log("Parsed filters:", parsedFilters);
            } catch (e) {
                console.error("Error parsing filters parameter:", e);
            }
        }

        // Keep all other params for potential filtering
        filters = { ...params };

        console.log("Extracted filters:", filters);
        console.log("Extracted sorting:", sorting);
        console.log("Extracted search:", search);
        console.log("Extracted page:", page);
        console.log("Extracted pageSize:", size);

        // Remove extracted pagination params to avoid duplication
        delete filters.pageIndex;
        delete filters.pageSize;
        delete filters.sorting;
        delete filters.search;
        delete filters.filters;
    } else {
        // Old style: separate parameters
        page = params;
    }

    console.log(
        `Fetching paginated clients for trainer: ${trainerAppwriteId}, page: ${page}, pageSize: ${size}`
    );
    if (sorting.length > 0) {
        console.log(`Sorting:`, sorting);
    }
    if (search) {
        console.log(`Search query:`, search);
    }
    if (Object.keys(filters).length > 0) {
        console.log(`Additional filters:`, filters);
    }

    const Trainer = alias(Users, "trainer");
    const Client = alias(Users, "client");

    // Build where conditions
    const baseConditions = [
        eq(TrainerClients.trainerId, trainerAppwriteId),
        eq(TrainerClients.isActive, true),
    ];

    // Define allowed filter columns
    const ALLOWED_FILTER_COLUMNS = new Set([
        "fullName",
        "email",
        "phone",
        "gender",
    ]);

    // Add filter conditions
    const filterConditions = parsedFilters
        .map((filter: { id: string; value: unknown }) => {
            const { id, value } = filter;

            // Skip filters for columns that are not in the allowed list
            if (!ALLOWED_FILTER_COLUMNS.has(id)) {
                console.warn(`Unsupported filter column: ${id}`);
                return undefined;
            }

            switch (id) {
                case "fullName":
                    return sql`${Client.fullName} ILIKE ${`%${String(
                        value
                    )}%`}`;
                case "email":
                    return sql`${Client.email} ILIKE ${`%${String(value)}%`}`;
                case "phone":
                    return sql`${Client.phone} ILIKE ${`%${String(value)}%`}`;
                case "gender":
                    // Handle gender as enum with specific allowed values
                    const genderValue = String(value).toUpperCase();
                    if (genderValue === "M" || genderValue === "MALE") {
                        return eq(Client.gender, "male");
                    } else if (
                        genderValue === "F" ||
                        genderValue === "FEMALE"
                    ) {
                        return eq(Client.gender, "female");
                    } else if (
                        genderValue === "NB" ||
                        genderValue === "NON-BINARY"
                    ) {
                        return eq(Client.gender, "non-binary");
                    } else {
                        return eq(Client.gender, "prefer-not-to-say");
                    }
                default:
                    console.warn(`Unsupported filter column: ${id}`);
                    return undefined;
            }
        })
        .filter(Boolean);

    // Add search condition if provided
    let searchCondition;
    if (search) {
        const searchLike = `%${search}%`;
        searchCondition = sql`(
            ${Client.fullName} ILIKE ${searchLike} OR
            ${Client.email} ILIKE ${searchLike} OR
            ${Client.phone} ILIKE ${searchLike}
        )`;
    }

    // Combine all conditions
    const whereConditions = [
        ...baseConditions,
        ...filterConditions,
        ...(searchCondition ? [searchCondition] : []),
    ];

    // Build order by
    let orderByColumns = [desc(TrainerClients.assignedDate)]; // Default sorting

    if (sorting.length > 0) {
        orderByColumns = sorting.map((sort) => {
            const { id, desc: isDesc } = sort;
            switch (id) {
                case "email":
                    return isDesc
                        ? desc(Client.email)
                        : sql`${Client.email} asc`;
                case "fullName":
                    return isDesc
                        ? desc(Client.fullName)
                        : sql`${Client.fullName} asc`;
                case "registrationDate":
                    return isDesc
                        ? desc(Client.registrationDate)
                        : sql`${Client.registrationDate} asc`;
                case "phone":
                    return isDesc
                        ? desc(Client.phone)
                        : sql`${Client.phone} asc`;
                case "gender":
                    return isDesc
                        ? desc(Client.gender)
                        : sql`${Client.gender} asc`;
                case "age":
                    // Age is calculated, so we sort by dob instead
                    return isDesc ? sql`${Client.dob} asc` : desc(Client.dob); // Reverse logic for age
                case "trainerName":
                    return isDesc
                        ? desc(Trainer.fullName)
                        : sql`${Trainer.fullName} asc`;
                default:
                    console.warn(`Unsupported sort column: ${id}`);
                    return desc(TrainerClients.assignedDate); // Default
            }
        });
    }

    // Fetch total count and paginated clients concurrently for faster response
    const [countResult, clientsWithTrainerName] = await Promise.all([
        db
            .select({ count: sql<number>`count(*)` })
            .from(TrainerClients)
            .innerJoin(Client, eq(Client.userId, TrainerClients.clientId))
            .innerJoin(Trainer, eq(Trainer.userId, TrainerClients.trainerId))
            .where(and(...whereConditions)),
        db
            .select({
                trainerName: Trainer.fullName,
                userId: Client.userId,
                fullName: Client.fullName,
                email: Client.email,
                registrationDate: Client.registrationDate,
                notes: Client.notes,
                phone: Client.phone,
                imageUrl: Client.imageUrl,
                gender: Client.gender,
                idealWeight: Client.idealWeight,
                dob: Client.dob,
                relationshipId: TrainerClients.relationshipId,
                assignedDate: TrainerClients.assignedDate,
            })
            .from(TrainerClients)
            .innerJoin(Trainer, eq(Trainer.userId, TrainerClients.trainerId)) // trainer join
            .innerJoin(Client, eq(Client.userId, TrainerClients.clientId)) // client join
            .where(and(...whereConditions))
            .orderBy(...orderByColumns)
            .limit(size)
            .offset(page * size),
    ]);

    const totalCount = Number(countResult[0]?.count || 0);

    // Map clients to add age calculated on server side
    const clientsWithAge = clientsWithTrainerName.map((client) => {
        let age = null;
        if (client.dob) {
            const today = new Date();
            const birthDate = new Date(client.dob);
            age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
        }
        return { ...client, age };
    });

    console.log(
        `Found ${clientsWithAge.length} clients (page ${page} of ${Math.ceil(
            totalCount / size
        )}) for trainer: ${trainerAppwriteId}`
    );

    return {
        data: clientsWithAge,
        meta: {
            totalRowCount: totalCount,
            page,
            pageSize: size,
            totalPages: Math.ceil(totalCount / size),
            hasMore: (page + 1) * size < totalCount,
        },
    };
}

/**
 * Returns paginated list of all clients in the system.
 * @param params - Object containing pagination, sorting, and filtering parameters
 *                 OR page number (0-based) for backward compatibility
 * @param pageSize - Number of items per page (used only if first param is a number)
 * @returns Object containing clients array and pagination info
 */
export async function getAllClientsPaginated(
    params: Record<string, unknown> | number = 0,
    pageSize: number = 10
) {
    await requireTrainerOrAdmin();
    // Handle both new params object and old separate parameters
    let page = 0;
    let size = pageSize;
    let filters: Record<string, unknown> = {};
    let sorting: Array<{ id: string; desc: boolean }> = [];
    let search: string | undefined;
    let parsedFilters: Array<{ id: string; value: unknown }> = [];

    console.log(`Received params:`, JSON.stringify(params, null, 2));

    if (typeof params === "object") {
        // Extract pagination parameters from params
        page =
            typeof params.pageIndex === "number"
                ? params.pageIndex
                : typeof params.pageIndex === "string"
                ? parseInt(params.pageIndex, 10)
                : 0;

        size =
            typeof params.pageSize === "number"
                ? params.pageSize
                : typeof params.pageSize === "string"
                ? parseInt(params.pageSize, 10)
                : 10;

        // Extract sorting from params
        if (params.sorting && typeof params.sorting === "string") {
            try {
                sorting = JSON.parse(params.sorting as string);
            } catch (e) {
                console.error("Error parsing sorting parameter:", e);
            }
        }

        // Extract search from params
        search = typeof params.search === "string" ? params.search : undefined;

        // Extract filters from params
        if (params.filters && typeof params.filters === "string") {
            try {
                parsedFilters = JSON.parse(params.filters as string);
                console.log("Parsed filters:", parsedFilters);
            } catch (e) {
                console.error("Error parsing filters parameter:", e);
            }
        }

        // Keep all other params for potential filtering
        filters = { ...params };
        // Remove extracted pagination params to avoid duplication
        delete filters.pageIndex;
        delete filters.pageSize;
        delete filters.sorting;
        delete filters.search;
        delete filters.filters;
    } else {
        // Old style: separate parameters
        page = params;
    }

    console.log(`Fetching all clients, page: ${page}, pageSize: ${size}`);
    if (sorting.length > 0) {
        console.log(`Sorting:`, sorting);
    }
    if (search) {
        console.log(`Search query:`, search);
    }
    if (Object.keys(filters).length > 0) {
        console.log(`Additional filters:`, filters);
    }

    // return {
    //     data: [],
    //     meta: {
    //         totalRowCount: 0,
    //     },
    // }; // Temporary placeholder

    const Client = alias(Users, "client");
    const Trainer = alias(Users, "trainer");

    // Build where conditions
    const baseConditions = [
        eq(Roles.roleName, "Client"),
        eq(TrainerClients.isActive, true),
    ];

    // Define allowed filter columns
    const ALLOWED_FILTER_COLUMNS = new Set([
        "fullName",
        "email",
        "phone",
        "gender",
    ]);

    // Add filter conditions
    const filterConditions = parsedFilters
        .map((filter: { id: string; value: unknown }) => {
            const { id, value } = filter;

            // Skip filters for columns that are not in the allowed list
            if (!ALLOWED_FILTER_COLUMNS.has(id)) {
                console.warn(`Unsupported filter column: ${id}`);
                return undefined;
            }

            switch (id) {
                case "fullName":
                    return sql`${Client.fullName} ILIKE ${`%${String(
                        value
                    )}%`}`;
                case "email":
                    return sql`${Client.email} ILIKE ${`%${String(value)}%`}`;
                case "phone":
                    return sql`${Client.phone} ILIKE ${`%${String(value)}%`}`;
                case "gender":
                    // Handle gender as enum with specific allowed values
                    const genderValue = String(value).toUpperCase();
                    if (genderValue === "M" || genderValue === "MALE") {
                        return eq(Client.gender, "male");
                    } else if (
                        genderValue === "F" ||
                        genderValue === "FEMALE"
                    ) {
                        return eq(Client.gender, "female");
                    } else if (
                        genderValue === "NB" ||
                        genderValue === "NON-BINARY"
                    ) {
                        return eq(Client.gender, "non-binary");
                    } else {
                        return eq(Client.gender, "prefer-not-to-say");
                    }
                default:
                    console.warn(`Unsupported filter column: ${id}`);
                    return undefined;
            }
        })
        .filter(Boolean);

    // Add search condition if provided
    let searchCondition;
    if (search) {
        const searchLike = `%${search}%`;
        searchCondition = sql`(
            ${Client.fullName} ILIKE ${searchLike} OR
            ${Client.email} ILIKE ${searchLike} OR
            ${Client.phone} ILIKE ${searchLike} OR
            ${Trainer.fullName} ILIKE ${searchLike}
        )`;
    }

    // Combine all conditions
    const whereConditions = [
        ...baseConditions,
        ...filterConditions,
        ...(searchCondition ? [searchCondition] : []),
    ];

    // Build order by
    let orderByColumns = [desc(Client.registrationDate)]; // Default sorting

    if (sorting.length > 0) {
        orderByColumns = sorting.map((sort) => {
            const { id, desc: isDesc } = sort;
            switch (id) {
                case "email":
                    return isDesc
                        ? desc(Client.email)
                        : sql`${Client.email} asc`;
                case "fullName":
                    return isDesc
                        ? desc(Client.fullName)
                        : sql`${Client.fullName} asc`;
                case "registrationDate":
                    return isDesc
                        ? desc(Client.registrationDate)
                        : sql`${Client.registrationDate} asc`;
                case "phone":
                    return isDesc
                        ? desc(Client.phone)
                        : sql`${Client.phone} asc`;
                case "gender":
                    return isDesc
                        ? desc(Client.gender)
                        : sql`${Client.gender} asc`;
                case "age":
                    // Age is calculated, so we sort by dob instead
                    return isDesc ? sql`${Client.dob} asc` : desc(Client.dob); // Reverse logic for age
                case "trainerName":
                    return isDesc
                        ? desc(Trainer.fullName)
                        : sql`${Trainer.fullName} asc`;
                default:
                    console.warn(`Unsupported sort column: ${id}`);
                    return desc(Client.registrationDate); // Default
            }
        });
    }

    // Get total count of clients with role "client" who have an active trainer relationship
    const [countResult, clientsQuery] = await Promise.all([
        db
            .select({ count: sql<number>`count(*)` })
            .from(Client)
            .innerJoin(
                TrainerClients,
                and(
                    eq(Client.userId, TrainerClients.clientId),
                    eq(TrainerClients.isActive, true)
                )
            )
            .innerJoin(Trainer, eq(Trainer.userId, TrainerClients.trainerId))
            .innerJoin(UserRoles, eq(Client.userId, UserRoles.userId))
            .innerJoin(Roles, eq(UserRoles.roleId, Roles.roleId))
            .where(and(...whereConditions)),
        db
            .select({
                userId: Client.userId,
                fullName: Client.fullName,
                email: Client.email,
                registrationDate: Client.registrationDate,
                notes: Client.notes,
                phone: Client.phone,
                imageUrl: Client.imageUrl,
                gender: Client.gender,
                idealWeight: Client.idealWeight,
                dob: Client.dob,
                relationshipId: TrainerClients.relationshipId,
                assignedDate: TrainerClients.assignedDate,
                trainerId: Trainer.userId,
                trainerName: Trainer.fullName,
            })
            .from(TrainerClients)
            .innerJoin(Client, eq(Client.userId, TrainerClients.clientId))
            .innerJoin(Trainer, eq(Trainer.userId, TrainerClients.trainerId))
            .innerJoin(UserRoles, eq(Client.userId, UserRoles.userId))
            .innerJoin(Roles, eq(UserRoles.roleId, Roles.roleId))
            .where(and(...whereConditions))
            .orderBy(...orderByColumns)
            .limit(size)
            .offset(page * size),
    ]);

    const totalCount = Number(countResult[0]?.count || 0);
    console.log(`Total clients found: ${totalCount}`);

    // Add age calculation
    const clients = clientsQuery.map((client) => {
        let age: number | null = null;
        if (client.dob) {
            const today = new Date();
            const birthDate = new Date(client.dob);
            age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
        }
        return { ...client, age };
    });

    console.log(
        `Found ${clients.length} clients (page ${page} of ${Math.ceil(
            totalCount / size
        )})`
    );

    return {
        data: clients,
        meta: {
            totalRowCount: totalCount,
            page,
            pageSize: size,
            totalPages: Math.ceil(totalCount / size),
            hasMore: (page + 1) * size < totalCount,
        },
    };
}

/**
 * Returns paginated list of all exercises in the system
 * @param params - Object containing pagination, sorting, and filtering parameters
 * @returns Object containing exercises array and pagination info
 */
/**
 * Bulk delete client relationships for a trainer
 * @param trainerAppwriteId - The appwrite_id of the trainer
 * @param clientIds - Array of client IDs to delete
 * @returns Object containing success status and count of deleted relationships
 */
export async function bulkDeleteClientRelationships(
    trainerAppwriteId: string,
    clientIds: string[]
) {
    await requireTrainerOrAdmin();
    console.log(
        `Bulk deleting ${clientIds.length} client relationships for trainer: ${trainerAppwriteId}`
    );

    if (!clientIds.length) {
        return {
            success: false,
            message: "No client IDs provided",
            count: 0,
        };
    }

    try {
        // Mark relationships as inactive rather than deleting them
        await db
            .update(TrainerClients)
            .set({
                isActive: false,
            })
            .where(
                and(
                    eq(TrainerClients.trainerId, trainerAppwriteId),
                    inArray(TrainerClients.clientId, clientIds)
                )
            );

        console.log(
            `Successfully marked ${clientIds.length} client relationships as inactive`
        );

        return {
            success: true,
            message: `Successfully removed ${clientIds.length} client${
                clientIds.length !== 1 ? "s" : ""
            }`,
            count: clientIds.length,
        };
    } catch (error) {
        console.error("Error bulk deleting client relationships:", error);
        return {
            success: false,
            message: `Error removing clients: ${
                error instanceof Error ? error.message : String(error)
            }`,
            count: 0,
        };
    }
}

export async function getClientById(clientId: string) {
    await requireTrainerOrAdmin();
    const client = await db
        .select({
            userId: Users.userId,
            fullName: Users.fullName,
            email: Users.email,
            phone: Users.phone,
            imageUrl: sql<string>`COALESCE(${Users.imageUrl}, '')`.as(
                "imageUrl"
            ),
            gender: Users.gender,
            idealWeight: Users.idealWeight,
            dob: Users.dob,
            notes: Users.notes,
            registrationDate: Users.registrationDate,
            emergencyContactName: Users.emergencyContactName,
            emergencyContactPhone: Users.emergencyContactPhone,
            trainerId: TrainerClients.trainerId,
        })
        .from(Users)
        .innerJoin(UserRoles, eq(Users.userId, UserRoles.userId))
        .innerJoin(Roles, eq(UserRoles.roleId, Roles.roleId))
        .innerJoin(TrainerClients, eq(Users.userId, TrainerClients.clientId))
        .where(and(eq(Users.userId, clientId), eq(Roles.roleName, "Client")))
        .limit(1);

    return client[0] || null;
}

/**
 * Create a new client with associated trainer
 * @param clientData - Client data including personal details and trainer assignment
 * @returns The created client data or error
 */
export async function createClient(clientData: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    coachNotes?: string;
    gender?: string;
    dateOfBirth?: Date;
    idealWeight?: number;
    trainerId: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
}) {
    await requireTrainerOrAdmin();
    try {
        console.log("Creating new client:", clientData);

        // Create fullName from firstName and lastName or use provided fullName
        let fullName = clientData.fullName || "";
        if (!fullName && (clientData.firstName || clientData.lastName)) {
            fullName = `${clientData.firstName || ""} ${
                clientData.lastName || ""
            }`.trim();
        }

        // Determine if this client will have authentication
        const hasEmail = !!clientData.email;

        // Check if a user with this email already exists
        let existingUser = null;
        if (hasEmail && clientData.email) {
            const existingUsers = await db
                .select({
                    userId: Users.userId,
                    appwrite_id: Users.appwrite_id,
                    has_auth: Users.has_auth,
                })
                .from(Users)
                .where(eq(Users.email, clientData.email))
                .limit(1);

            if (existingUsers.length > 0) {
                existingUser = existingUsers[0];
                console.log(
                    `Found existing user with email ${clientData.email}:`,
                    existingUser
                );
            }
        }

        // Generate a unique ID for user if not existing
        const userId = existingUser ? existingUser.userId : randomUUID();

        // If client has email and doesn't exist yet, create Appwrite account
        if (hasEmail && clientData.email && !existingUser) {
            try {
                // Create a temporary password for the user
                // const tempPassword = ID.unique();

                // Get Appwrite admin client
                const { appwrite_user } = await createAdminClient();

                // Create Appwrite user
                await appwrite_user.create(
                    userId, // userId
                    clientData.email, // email
                    undefined, // phone (optional)
                    "password", // password
                    fullName // name
                );

                console.log(`Created Appwrite account for client: ${userId}`);
            } catch (error) {
                // Handle Appwrite account creation errors
                if (error instanceof AppwriteException) {
                    if (error.code === 409) {
                        throw new Error(
                            "Email already exists in Appwrite but not in our database"
                        );
                    }
                }
                console.error("Error creating Appwrite account:", error);
                throw new Error("Failed to create Appwrite account");
            }
        }

        // Insert new user or add client role to existing user
        const newClient = await db.transaction(async (tx) => {
            let user;

            if (existingUser) {
                // Use existing user
                [user] = await tx
                    .select()
                    .from(Users)
                    .where(eq(Users.userId, existingUser.userId))
                    .limit(1);

                // Build update object with only provided fields
                const updateData: Partial<typeof Users.$inferInsert> = {};
                if (fullName) updateData.fullName = fullName;
                if (clientData.phoneNumber !== undefined)
                    updateData.phone = clientData.phoneNumber;
                if (clientData.coachNotes !== undefined)
                    updateData.notes = clientData.coachNotes;
                if (clientData.gender !== undefined) {
                    updateData.gender = clientData.gender as
                        | "male"
                        | "female"
                        | "non-binary"
                        | "prefer-not-to-say";
                }
                if (clientData.dateOfBirth !== undefined) {
                    updateData.dob = clientData.dateOfBirth
                        ? new Date(clientData.dateOfBirth)
                        : null;
                }
                if (clientData.emergencyContactName !== undefined)
                    updateData.emergencyContactName =
                        clientData.emergencyContactName;
                if (clientData.emergencyContactPhone !== undefined)
                    updateData.emergencyContactPhone =
                        clientData.emergencyContactPhone;

                // Only update if there are fields to update
                if (Object.keys(updateData).length > 0) {
                    await tx
                        .update(Users)
                        .set(updateData)
                        .where(eq(Users.userId, existingUser.userId));
                }
            } else {
                // Create new user
                [user] = await tx
                    .insert(Users)
                    .values({
                        userId,
                        // Only set appwrite_id if email is provided
                        appwrite_id: hasEmail ? userId : null,
                        has_auth: hasEmail,
                        fullName,
                        email: clientData.email || null,
                        phone: clientData.phoneNumber || null,
                        notes: clientData.coachNotes || null,
                        gender:
                            (clientData.gender as
                                | "male"
                                | "female"
                                | "non-binary"
                                | "prefer-not-to-say") || null,
                        dob: clientData.dateOfBirth
                            ? new Date(clientData.dateOfBirth)
                            : null,
                        idealWeight: clientData.idealWeight || null,
                        registrationDate: new Date(),
                    })
                    .returning();
            }

            if (!user) {
                throw new Error("Failed to create or retrieve user");
            }

            // Get Client role ID
            const clientRole = await tx
                .select({ roleId: Roles.roleId })
                .from(Roles)
                .where(eq(Roles.roleName, "Client"))
                .limit(1);

            if (!clientRole.length) {
                throw new Error("Client role not found");
            }

            // Check if user already has the client role
            const existingRole = await tx
                .select()
                .from(UserRoles)
                .where(
                    and(
                        eq(UserRoles.userId, user.userId),
                        eq(UserRoles.roleId, clientRole[0].roleId)
                    )
                )
                .limit(1);

            // Only assign client role if not already assigned
            if (existingRole.length === 0) {
                await tx.insert(UserRoles).values({
                    userId: user.userId,
                    roleId: clientRole[0].roleId,
                    approvedByAdmin: true,
                });
            }

            // Check if trainer-client relationship already exists
            const existingRelationship = await tx
                .select()
                .from(TrainerClients)
                .where(
                    and(
                        eq(TrainerClients.clientId, user.userId),
                        eq(TrainerClients.trainerId, clientData.trainerId),
                        eq(TrainerClients.isActive, true)
                    )
                )
                .limit(1);

            // Only create trainer-client relationship if not already exists
            if (existingRelationship.length === 0) {
                await tx.insert(TrainerClients).values({
                    trainerId: clientData.trainerId,
                    clientId: user.userId,
                    assignedDate: new Date(),
                    isActive: true,
                });
            }

            return user;
        });

        console.log("Client created/updated successfully:", newClient.userId);
        return { success: true, data: newClient };
    } catch (error) {
        console.error("Error creating client:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Searches for clients by name (case-insensitive).
 * Used for the global search bar.
 * @param query - The search term
 * @returns Array of matching clients with id, name, and imageUrl
 */
export async function searchClientsByNameAction(
    query: string
): Promise<{ id: string; name: string; imageUrl: string | null }[]> {
    // No auth check needed for basic search, but consider adding if sensitive
    await requireTrainerOrAdmin();

    if (!query || query.trim() === "") {
        return [];
    }

    const searchTerm = `%${query.trim()}%`;

    try {
        const clients = await db
            .select({
                id: Users.userId,
                name: Users.fullName,
                imageUrl: Users.imageUrl, // Select imageUrl
            })
            .from(Users)
            .leftJoin(UserRoles, eq(Users.userId, UserRoles.userId))
            .leftJoin(Roles, eq(UserRoles.roleId, Roles.roleId))
            // Optional: Join with UserRoles/TrainerClients to ensure they are active clients?
            // This might be needed depending on whether non-clients should appear.
            // For now, searching all users by name.
            .where(
                and(
                    ilike(Users.fullName, searchTerm),
                    eq(Roles.roleName, "Client")
                )
            )
            .limit(10); // Limit results for performance

        console.log(`Search for "${query}" found ${clients.length} clients.`);
        // Ensure fullName is not null before returning
        return clients.filter((client) => client.name !== null) as {
            id: string;
            name: string;
            imageUrl: string | null; // Update cast type
        }[];
    } catch (error) {
        console.error("Error searching clients by name:", error);
        return []; // Return empty array on error
    }
}

/**
 * Update an existing client
 * @param clientId - ID of the client to update
 * @param clientData - Updated client data
 * @returns Success status and updated client data
 */
/**
 * Register a new user from within the app (for admin/trainer use)
 * @param userData - User data including personal details and role
 * @returns Success status and user data
 */
export async function registerInternalUser(userData: {
    fullName: string;
    email: string;
    password?: string;
    phoneNumber?: string;
    gender?: "male" | "female" | "non-binary" | "prefer-not-to-say";
    dateOfBirth?: Date;
    jobTitle?: string;
    role: string; // "Trainer", "Admin", "Guest"
}) {
    await requireTrainerOrAdmin();
    // Define user_id outside try block so it's available in catch block
    let user_id: string = ID.unique();

    try {
        console.log(`Registering new ${userData.role}:`, userData.email);

        // Use a default password if not provided
        const password = userData.password || "password";
        user_id = ID.unique();

        // 1. Create Appwrite account
        try {
            const { appwrite_user } = await createAdminClient();
            await appwrite_user.create(
                user_id,
                userData.email,
                undefined, // phone (optional)
                password,
                userData.fullName
            );
            console.log(
                `Created Appwrite account for ${userData.role}: ${user_id}`
            );
        } catch (error) {
            if (error instanceof AppwriteException) {
                if (error.code === 409) {
                    return {
                        success: false,
                        error: "Email already exists",
                    };
                }
            }
            console.error("Error creating Appwrite account:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }

        // 2. Create user in database with all provided fields
        await db.transaction(async (tx) => {
            // Insert user
            await tx.insert(Users).values({
                userId: user_id,
                appwrite_id: user_id,
                has_auth: true,
                fullName: userData.fullName,
                email: userData.email,
                phone: userData.phoneNumber || null,
                gender: userData.gender || null,
                dob: userData.dateOfBirth || null,
                jobTitle: userData.jobTitle || null,
                registrationDate: new Date(),
            });

            // Get role ID
            const role = await tx
                .select({ roleId: Roles.roleId })
                .from(Roles)
                .where(eq(Roles.roleName, userData.role))
                .limit(1);

            if (role.length === 0) {
                throw new Error(`Role ${userData.role} not found`);
            }

            // Add role to user
            await tx.insert(UserRoles).values({
                userId: user_id,
                roleId: role[0].roleId,
                approvedByAdmin: true, // Auto-approve since this is done by admin/trainer
            });
        });

        return {
            success: true,
            message: `${userData.role} registered successfully`,
            data: {
                userId: user_id,
                fullName: userData.fullName,
                email: userData.email,
                role: userData.role,
            },
        };
    } catch (error) {
        console.error(`Error registering ${userData.role}:`, error);

        // Try to clean up the Appwrite user if database transaction failed
        try {
            const { appwrite_user } = await createAdminClient();
            await appwrite_user.delete(user_id);
        } catch (cleanupError) {
            console.error("Error cleaning up Appwrite user:", cleanupError);
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Add a role to an existing user
 * @param email - Email of the existing user
 * @param roleName - Name of the role to add (e.g., "Client", "Trainer", "Admin")
 * @returns Success status and user data
 */
export async function addRoleToUser(email: string, roleName: string) {
    await requireTrainerOrAdmin();
    try {
        console.log(`Adding role ${roleName} to user with email ${email}`);

        // 1. Check if user exists
        const existingUsers = await db
            .select({
                userId: Users.userId,
                appwrite_id: Users.appwrite_id,
                has_auth: Users.has_auth,
                fullName: Users.fullName,
            })
            .from(Users)
            .where(eq(Users.email, email))
            .limit(1);

        if (existingUsers.length === 0) {
            return {
                success: false,
                error: `User with email ${email} not found`,
            };
        }

        const user = existingUsers[0];

        // 2. Validate role transition (Client without auth -> Trainer)
        if (roleName === "Trainer" && !user.has_auth) {
            return {
                success: false,
                error: "Cannot assign Trainer role to a client without authentication",
            };
        }

        // 3. Get role ID
        const roles = await db
            .select({ roleId: Roles.roleId })
            .from(Roles)
            .where(eq(Roles.roleName, roleName))
            .limit(1);

        if (roles.length === 0) {
            return {
                success: false,
                error: `Role ${roleName} not found`,
            };
        }

        const roleId = roles[0].roleId;

        // 4. Check if user already has this role
        const existingRole = await db
            .select()
            .from(UserRoles)
            .where(
                and(
                    eq(UserRoles.userId, user.userId),
                    eq(UserRoles.roleId, roleId)
                )
            )
            .limit(1);

        if (existingRole.length > 0) {
            return {
                success: false,
                error: `User already has the ${roleName} role`,
            };
        }

        // 5. Add role to user
        await db.insert(UserRoles).values({
            userId: user.userId,
            roleId: roleId,
            approvedByAdmin: true, // Assuming admin approval since this is done by admin/trainer
        });

        console.log(
            `Successfully added ${roleName} role to user ${user.userId} (${user.fullName})`
        );

        return {
            success: true,
            message: `Successfully added ${roleName} role to user`,
            data: {
                userId: user.userId,
                fullName: user.fullName,
                role: roleName,
            },
        };
    } catch (error) {
        console.error(`Error adding role ${roleName} to user:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Get all coaches (trainers and admins) for dropdown selection
 * @returns Array of coaches with userId and fullName
 */
export async function getAllCoaches() {
    await requireTrainerOrAdmin();
    console.log("Fetching all coaches (trainers and admins)");

    const Coach = alias(Users, "coach");

    try {
        const coaches = await db
            .select({
                userId: Coach.userId,
                fullName: Coach.fullName,
            })
            .from(Coach)
            .innerJoin(UserRoles, eq(Coach.userId, UserRoles.userId))
            .innerJoin(Roles, eq(UserRoles.roleId, Roles.roleId))
            .where(
                or(eq(Roles.roleName, "Trainer"), eq(Roles.roleName, "Admin"))
            )
            .orderBy(Coach.fullName);

        console.log(`Found ${coaches.length} coaches`);
        return coaches;
    } catch (error) {
        console.error("Error fetching coaches:", error);
        throw error;
    }
}

/**
 * Switch a client's coach
 * @param params - Object containing clientId and newCoachId
 * @returns Success status and message
 */
export async function switchClientCoach(params: {
    clientId: string;
    newCoachId: string;
}) {
    await requireTrainerOrAdmin();
    const { clientId, newCoachId } = params;

    console.log(`Switching coach for client ${clientId} to ${newCoachId}`);

    try {
        // Check if client exists
        const client = await db
            .select({
                userId: Users.userId,
                fullName: Users.fullName,
            })
            .from(Users)
            .where(eq(Users.userId, clientId))
            .limit(1);

        if (client.length === 0) {
            return { error: "Client not found" };
        }

        // Check if coach exists
        const coach = await db
            .select({
                userId: Users.userId,
                fullName: Users.fullName,
            })
            .from(Users)
            .innerJoin(UserRoles, eq(Users.userId, UserRoles.userId))
            .innerJoin(Roles, eq(UserRoles.roleId, Roles.roleId))
            .where(
                and(
                    eq(Users.userId, newCoachId),
                    or(
                        eq(Roles.roleName, "Trainer"),
                        eq(Roles.roleName, "Admin")
                    )
                )
            )
            .limit(1);

        if (coach.length === 0) {
            return { error: "Coach not found" };
        }

        // Get current active relationship
        const currentRelationship = await db
            .select({
                relationshipId: TrainerClients.relationshipId,
                trainerId: TrainerClients.trainerId,
            })
            .from(TrainerClients)
            .where(
                and(
                    eq(TrainerClients.clientId, clientId),
                    eq(TrainerClients.isActive, true)
                )
            )
            .limit(1);

        await db.transaction(async (tx) => {
            // If there's an existing relationship, delete it
            if (currentRelationship.length > 0) {
                // If the client is already assigned to this coach, do nothing
                if (currentRelationship[0].trainerId === newCoachId) {
                    return;
                }

                await tx
                    .delete(TrainerClients)
                    .where(
                        eq(
                            TrainerClients.relationshipId,
                            currentRelationship[0].relationshipId
                        )
                    );
            }

            // Instead of blind insert, check if (newCoachId, clientId) exists:
            const existingNewRelationship = await tx
                .select()
                .from(TrainerClients)
                .where(
                    and(
                        eq(TrainerClients.trainerId, newCoachId),
                        eq(TrainerClients.clientId, clientId)
                    )
                )
                .limit(1);

            if (existingNewRelationship.length > 0) {
                // Reactivate existing relationship
                await tx
                    .update(TrainerClients)
                    .set({ isActive: true, assignedDate: new Date() })
                    .where(
                        eq(
                            TrainerClients.relationshipId,
                            existingNewRelationship[0].relationshipId
                        )
                    );
            } else {
                // Create new relationship
                await tx.insert(TrainerClients).values({
                    trainerId: newCoachId,
                    clientId: clientId,
                    assignedDate: new Date(),
                    isActive: true,
                });
            }
        });

        console.log(
            `Successfully switched coach for client ${client[0].fullName} to ${coach[0].fullName}`
        );

        return {
            success: true,
            message: `Successfully switched coach to ${coach[0].fullName}`,
        };
    } catch (error) {
        console.error("Error switching coach:", error);
        return {
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

export async function updateClient(
    clientId: string,
    clientData: {
        fullName?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        phoneNumber?: string;
        coachNotes?: string;
        gender?: string;
        dateOfBirth?: Date;
        idealWeight?: number;
        trainerId?: string;
        emergencyContactName?: string;
        emergencyContactPhone?: string;
    }
) {
    await requireTrainerOrAdmin();
    try {
        console.log("Updating client:", clientId, clientData);

        // Create fullName from firstName and lastName or use provided fullName
        let fullName = clientData.fullName || "";
        if (!fullName && (clientData.firstName || clientData.lastName)) {
            fullName = `${clientData.firstName || ""} ${
                clientData.lastName || ""
            }`.trim();
        }

        // Update user record
        await db.transaction(async (tx) => {
            // 1. Update the user details
            await tx
                .update(Users)
                .set({
                    fullName,
                    email: clientData.email || null,
                    phone: clientData.phoneNumber || null,
                    notes: clientData.coachNotes || null,
                    gender:
                        (clientData.gender as
                            | "male"
                            | "female"
                            | "non-binary"
                            | "prefer-not-to-say") || null,
                    dob: clientData.dateOfBirth
                        ? new Date(clientData.dateOfBirth)
                        : null,
                    idealWeight: clientData.idealWeight || null,
                })
                .where(eq(Users.userId, clientId));

            // 2. Update trainer relationship if trainerId is provided
            if (clientData.trainerId) {
                // Check if there's an existing relationship
                const existingRelationship = await tx
                    .select()
                    .from(TrainerClients)
                    .where(
                        and(
                            eq(TrainerClients.clientId, clientId),
                            eq(TrainerClients.isActive, true)
                        )
                    )
                    .limit(1);

                if (existingRelationship.length > 0) {
                    // If relationship exists with a different trainer, update it
                    if (
                        existingRelationship[0].trainerId !==
                        clientData.trainerId
                    ) {
                        // Mark old relationship as inactive
                        await tx
                            .update(TrainerClients)
                            .set({ isActive: false })
                            .where(
                                eq(
                                    TrainerClients.relationshipId,
                                    existingRelationship[0].relationshipId
                                )
                            );

                        // Create new relationship
                        await tx.insert(TrainerClients).values({
                            trainerId: clientData.trainerId,
                            clientId: clientId,
                            assignedDate: new Date(),
                            isActive: true,
                        });
                    }
                } else {
                    // Create new relationship if none exists
                    await tx.insert(TrainerClients).values({
                        trainerId: clientData.trainerId,
                        clientId: clientId,
                        assignedDate: new Date(),
                        isActive: true,
                    });
                }
            }
        });

        // Fetch updated client to return
        const updatedClient = await getClientById(clientId);

        console.log("Client updated successfully:", clientId);
        return { success: true, data: updatedClient };
    } catch (error) {
        console.error("Error updating client:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
