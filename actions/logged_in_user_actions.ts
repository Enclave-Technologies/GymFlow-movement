import { createSessionClient } from "@/appwrite/config";
import { Roles, UserRoles, Users } from "@/db/schemas";
import { db } from "@/db/xata";
import { defaultProfileURL, MOVEMENT_SESSION_NAME } from "@/lib/constants";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function get_logged_in_user() {
    const session = (await cookies()).get(MOVEMENT_SESSION_NAME)?.value || null;
    if (session) {
        const { account } = await createSessionClient(session);
        const user = await account.get();

        // Get user data with role information
        const db_user = await db
            .select({
                id: Users.userId,
                name: Users.fullName,
                email: Users.email,
                avatar: Users.imageUrl,
            })
            .from(Users)
            .where(eq(Users.userId, user.$id));

        // Get user role information
        const userRoleData = await db
            .select({
                roleId: UserRoles.roleId,
                roleName: Roles.roleName,
                approvedByAdmin: UserRoles.approvedByAdmin,
            })
            .from(UserRoles)
            .innerJoin(Roles, eq(UserRoles.roleId, Roles.roleId))
            .where(eq(UserRoles.userId, user.$id));

        const modified_user = db_user.map((user) => ({
            ...user,
            email: user.email || "No email provided", // Provide a default value if email is missing
            avatar: user.avatar || defaultProfileURL, // Use a placeholder or dummy URL
            role: userRoleData.length > 0 ? userRoleData[0].roleName : null,
            approvedByAdmin:
                userRoleData.length > 0
                    ? userRoleData[0].approvedByAdmin
                    : false,
        }));

        return modified_user[0];
    } else {
        redirect("/login");
    }
}
