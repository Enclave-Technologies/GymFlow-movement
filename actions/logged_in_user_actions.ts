"use server";
import { createSessionClient } from "@/appwrite/config";
import { Roles, UserRoles, Users } from "@/db/schemas";
import { db } from "@/db/xata";
import { defaultProfileURL, MOVEMENT_SESSION_NAME } from "@/lib/constants";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import "server-only";

export async function get_logged_in_user() {
    const session = (await cookies()).get(MOVEMENT_SESSION_NAME)?.value || null;
    if (session) {
        let user;
        try {
            let account;
            try {
                const sessionClient = await createSessionClient(session);
                account = sessionClient.account;
            } catch (err) {
                console.error("Error creating session client:", err);
                // throw err;
                return null;
            }

            try {
                user = await account.get();
            } catch (err) {
                console.error("Error getting account data:", err);
                // If we get an AppwriteException about missing scope, it means the user isn't properly authenticated
                // or doesn't have the right permissions
                return null;
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            // (await cookies()).delete(MOVEMENT_SESSION_NAME);
            // redirect("/login?error=session_expired");
            return null;
        }

        // Get user data with role information in a single query
        const db_user_with_role = await db
            .select({
                id: Users.userId,
                appwrite_id: Users.appwrite_id,
                name: Users.fullName,
                email: Users.email,
                avatar: Users.imageUrl,
                role: Roles.roleName,
                approvedByAdmin: UserRoles.approvedByAdmin,
            })
            .from(Users)
            .innerJoin(UserRoles, eq(Users.userId, UserRoles.userId))
            .innerJoin(Roles, eq(UserRoles.roleId, Roles.roleId))
            .where(eq(Users.appwrite_id, user.$id));

        if (!db_user_with_role || db_user_with_role.length === 0) {
            return null;
        }

        // Aggregate all roles and approvedByAdmin values
        const roles = db_user_with_role
            .map((user) => user.role)
            .filter(Boolean);
        const approvedByAdminArr = db_user_with_role.map(
            (user) => user.approvedByAdmin
        );

        // If all approvedByAdmin values are the same, use a single boolean, else return array
        const allApprovedSame = approvedByAdminArr.every(
            (val) => val === approvedByAdminArr[0]
        );
        const approvedByAdmin = allApprovedSame
            ? approvedByAdminArr[0]
            : approvedByAdminArr;

        // Use the first user object for common fields
        const baseUser = db_user_with_role[0];

        return {
            userId: baseUser.id,
            appwrite_id: baseUser.appwrite_id,
            name: baseUser.name,
            email: baseUser.email || "No email provided",
            avatar: baseUser.avatar || defaultProfileURL,
            roles,
            approvedByAdmin,
        };
    } else {
        return null;
    }
}
