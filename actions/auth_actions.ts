"use server";
import { createAdminClient, createSessionClient } from "@/appwrite/config";
import {
    LoginFormSchema,
    RegisterFormSchema,
} from "@/form-validators/auth-forms";
import { MOVEMENT_SESSION_NAME } from "@/lib/constants";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppwriteException, ID } from "node-appwrite";
import { db } from "@/db/xata";
import "server-only";
import {
    InsertUser,
    InsertUserRole,
    Roles,
    UserRoles,
    Users,
    // genderEnum,
} from "@/db/schemas";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { revalidatePath } from "next/cache";
import sharp from "sharp";

export async function get_user_account() {
    const session = (await cookies()).get(MOVEMENT_SESSION_NAME)?.value || null;
    if (!session) {
        throw new Error("User not logged in");
    }

    try {
        const { account } = await createSessionClient(session);
        const appwriteUser = await account.get();

        const user = await getUserByAppwriteId(appwriteUser.$id);

        return {
            ...user,
        };
    } catch (error) {
        throw error;
    }
}

export async function getUserById(userId: string) {
    if (!userId) {
        return null;
    }

    const User = alias(Users, "user");

    const userData = await db
        .select({
            userId: User.userId,
            fullName: User.fullName,
            email: User.email,
            phone: User.phone,
            notes: User.notes,
            imageUrl: User.imageUrl,
            registrationDate: User.registrationDate,
            gender: User.gender,
            job_title: User.jobTitle,
        })
        .from(User)
        .where(eq(User.userId, userId))
        .limit(1);

    if (userData.length === 0) {
        return null;
    }

    // Map "Coach" job title to "Trainer" for consistency
    const user = userData[0];
    // if (user.job_title === "Coach") {
    //     user.job_title = "Trainer";
    // }

    return user;
}

export async function getUserByAppwriteId(userId: string) {
    if (!userId) {
        return null;
    }

    const User = alias(Users, "user");

    const userData = await db
        .select({
            userId: User.userId,
            fullName: User.fullName,
            email: User.email,
            phone: User.phone,
            notes: User.notes,
            imageUrl: User.imageUrl,
            registrationDate: User.registrationDate,
            gender: User.gender,
            job_title: User.jobTitle,
        })
        .from(User)
        .where(eq(User.appwrite_id, userId))
        .limit(1);

    if (userData.length === 0) {
        return null;
    }

    // Map "Coach" job title to "Trainer" for consistency
    const user = userData[0];
    // if (user.job_title === "Coach") {
    //     user.job_title = "Trainer";
    // }

    return user;
}

export async function login(previousState: string, formData: unknown) {
    console.log("[LOGIN] Starting login process");

    // 1. Validate if the input is FormData
    if (!(formData instanceof FormData)) {
        console.error("[LOGIN] Invalid input: Expected FormData");
        throw new Error("Invalid input: Expected FormData");
    }

    // 2. Convert FormData to a plain object for Zod validation
    const formDataObj = Object.fromEntries(formData.entries());
    console.log("[LOGIN] Form data converted to object:", formDataObj);

    // 3. Validate using Zod (throws if invalid)
    const result = LoginFormSchema.safeParse(formDataObj);
    if (!result.success) {
        console.error("[LOGIN] Validation failed:", result.error.message);
        return `Validation failed: ${result.error.message}`;
    }

    // 4. Proceed with validated data
    const { email, password } = result.data;
    console.log("[LOGIN] Validated data - email:", email);

    const { account } = await createAdminClient();

    let session;

    try {
        session = await account.createEmailPasswordSession(email, password);

        const cookieOptions = {
            httpOnly: true,
            sameSite: "strict" as const,
            secure: process.env.NODE_ENV === "production",
            expires: new Date(session.expire),
            path: "/",
        };

        (await cookies()).set(
            MOVEMENT_SESSION_NAME,
            session.secret,
            cookieOptions
        );
    } catch (error) {
        console.error("[LOGIN] Error during session creation:", error);

        // Handle specific error cases
        if (error instanceof AppwriteException) {
            console.error(
                `[LOGIN] Appwrite error - code: ${error.code}, message: ${error.message}`
            );
            if (error.code === 401) {
                return "Invalid email or password";
            } else if (error.code === 429) {
                return "Too many login attempts. Please try again later.";
            }
        }

        return "Invalid credentials";
    }

    let redirectPath = "/awaiting-approval"; // Default path

    try {
        const { account: clientAccount } = await createSessionClient(
            session.secret
        );
        const user = await clientAccount.get();

        const userRoleData = await db
            .select({
                roleName: Roles.roleName,
                approvedByAdmin: UserRoles.approvedByAdmin,
            })
            .from(UserRoles)
            .innerJoin(Roles, eq(UserRoles.roleId, Roles.roleId))
            .where(eq(UserRoles.userId, user.$id));

        if (userRoleData.length > 0) {
            // Check if user has only Client role
            const isOnlyClient =
                userRoleData.length === 1 &&
                userRoleData[0].roleName === "Client";
            if (isOnlyClient) {
                const logoutRedirect = await logout();
                redirectPath = `${logoutRedirect}?error=only_coach_allowed`;
            } else {
                // Check if any role is Guest and not approved
                const isGuestNotApproved = userRoleData.some(
                    (role) => role.roleName === "Guest" && !role.approvedByAdmin
                );

                if (!isGuestNotApproved) {
                    redirectPath = "/my-clients";
                }
            }
        } else {
            console.log("[LOGIN] No role data found for user");
        }
    } catch (error) {
        console.error("[LOGIN] Error fetching user role:", error);
    }

    console.log(`[LOGIN] Redirecting to ${redirectPath}`);
    redirect(redirectPath);
}

export async function logout() {
    const session = (await cookies()).get(MOVEMENT_SESSION_NAME);
    if (session) {
        const { account } = await createSessionClient(session.value);
        try {
            await account.deleteSession("current");
        } catch (error) {
            console.error("Error logging out:", error);
        }
        (await cookies()).delete(MOVEMENT_SESSION_NAME);
    }
    return "/login";
}

export async function register(previousState: string, formData: unknown) {
    // 1. Validate if the input is FormData
    if (!(formData instanceof FormData)) {
        throw new Error("Invalid input: Expected FormData");
    }
    // 2. Convert FormData to a plain object for Zod validation
    const formDataObj = Object.fromEntries(formData.entries());

    // 3. Validate using Zod (throws if invalid)
    const result = RegisterFormSchema.safeParse(formDataObj);
    if (!result.success) {
        // Compile all error messages into a single string
        const errorMessage = result.error.issues
            .map((issue) => {
                // const field = issue.path.length > 0 ? `${issue.path[0]}: ` : "";
                return `- ${issue.message}`;
            })
            .join("\n"); // Separate errors by newlines (or use ", " for inline)

        return `Validation failed:\n${errorMessage}`;
    }

    // 4. Proceed with validated data
    const { email, password, fullName } = result.data;
    const { appwrite_user } = await createAdminClient();
    const user_id = ID.unique();

    try {
        await appwrite_user.create(
            user_id, // userId
            email, // email
            // "", // phone (optional)
            undefined,
            password, // password
            fullName // name (optional)
        );
    } catch (error) {
        console.log(error);
        if (error instanceof AppwriteException) {
            if (error.code === 409) {
                return "Email already exists";
            }
        }
        return "Error creating user";
    }

    // 5. create team affiliation
    const guestTeam = await db
        .select({ id: Roles.roleId })
        .from(Roles)
        .where(eq(Roles.roleName, "Guest"));
    const newUserRole: InsertUserRole = {
        roleId: guestTeam[0].id,
        userId: user_id,
        approvedByAdmin: false,
    };
    const newPerson: InsertUser = {
        fullName: fullName,
        appwrite_id: user_id,
        userId: user_id,
        email: email,
        registrationDate: new Date(),
    };
    try {
        await db.transaction(async (tx) => {
            // Insert user/person
            await tx.insert(Users).values(newPerson);
            // Insert user role
            await tx.insert(UserRoles).values(newUserRole);
        });
    } catch (error) {
        console.error("Transaction failed:", error);

        await appwrite_user.delete(user_id); // Clean up by deleting the user

        // You can add more specific error handling here if needed
        return error instanceof Error
            ? error.message
            : "Unknown error occurred";
    }

    return "success";
}

export async function updateUser(
    prevState: { success: boolean; message: string } | null,
    formData: FormData
) {
    try {
        const session =
            (await cookies()).get(MOVEMENT_SESSION_NAME)?.value || null;
        if (!session) {
            return { success: false, message: "User not logged in" };
        }

        const { account } = await createSessionClient(session);
        const appwriteUser = await account.get();

        for (const [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }

        // Retrieve user from DB
        const dbUser = await getUserByAppwriteId(appwriteUser.$id);
        if (!dbUser || !dbUser.userId) {
            return { success: false, message: "User not found in database" };
        }

        if (!dbUser || !dbUser.userId) {
            return { success: false, message: "User not found in database" };
        }

        // Extract updated fields from formData
        const updates: Record<string, string | null> = {
            fullName: formData.get("fullName")?.toString().trim() || null,
            phone: formData.get("phone")?.toString().trim() || null,
            jobTitle: formData.get("job_title")?.toString().trim() || null,
            gender: formData.get("gender")?.toString().trim() || null,
            email: formData.get("email")?.toString().trim() || null,
        };

        // Remove empty/null fields
        Object.keys(updates).forEach((key) => {
            if (!updates[key]) {
                delete updates[key];
            }
        });

        // Handle email update separately because it requires password verification and Appwrite auth update
        const emailUpdating =
            updates.email && updates.email !== appwriteUser.email;
        if (emailUpdating) {
            const password = formData.get("password")?.toString();
            if (!password) {
                return {
                    success: false,
                    message: "Password required to update email",
                };
            }
            try {
                // Update Appwrite auth email with password verification
                await account.updateEmail(updates.email!, password);
            } catch (error) {
                console.error(
                    "Error verifying password or updating email:",
                    error
                );
                return {
                    success: false,
                    message: "Incorrect password or failed to update email",
                };
            }
        }

        // Prepare DB updates object, excluding email if not updating
        // Map to DB column names in case they differ (e.g., jobTitle instead of job_title)
        const dbUpdate: Record<string, string> = {};
        if (updates.fullName) dbUpdate["fullName"] = updates.fullName;
        if (updates.phone) dbUpdate["phone"] = updates.phone;
        if (updates.jobTitle) dbUpdate["jobTitle"] = updates.jobTitle;
        if (updates.gender) dbUpdate["gender"] = updates.gender;
        if (emailUpdating) dbUpdate["email"] = updates.email!; // Non-null asserted since we checked above

        // Update user name in Appwrite if changed (for example fullName)
        if (updates.fullName && updates.fullName !== appwriteUser.name) {
            try {
                const { appwrite_user } = await createAdminClient();
                await appwrite_user.updateName(
                    appwriteUser.$id,
                    updates.fullName
                );
            } catch (appwriteError) {
                console.error(
                    "Error updating Appwrite user name:",
                    appwriteError
                );
                // Not returning error here — user DB update may still proceed
            }
        }
        // Update user record in DB using drizzle
        if (Object.keys(dbUpdate).length > 0) {
            await db
                .update(Users)
                .set(dbUpdate)
                .where(eq(Users.userId, dbUser.userId));
        }

        // Revalidate root path so sidebar picks up updated profile
        revalidatePath("/");
        revalidatePath("/settings");

        return { success: true, message: "User updated successfully" };
    } catch (error) {
        return {
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown error occurred",
        };
    }
}

export async function updatePassword(
    prevState: { success: boolean; message: string } | null,
    formData: FormData
) {
    try {
        const session =
            (await cookies()).get(MOVEMENT_SESSION_NAME)?.value || null;
        if (!session) {
            return { success: false, message: "User not logged in" };
        }

        const currentPassword = formData.get("currentPassword") as string;
        const newPassword = formData.get("newPassword") as string;

        if (!currentPassword || !newPassword) {
            return {
                success: false,
                message: "Current password and new password are required",
            };
        }

        const { account } = await createSessionClient(session);

        try {
            // This will verify the current password internally
            await account.updatePassword(newPassword, currentPassword);

            return { success: true, message: "Password updated successfully" };
        } catch (error) {
            console.error("Error updating password:", error);

            if (error instanceof AppwriteException) {
                if (error.code === 401) {
                    return {
                        success: false,
                        message: "Current password is incorrect",
                    };
                }
                return { success: false, message: error.message };
            }

            return {
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Unknown error occurred",
            };
        }
    } catch (error) {
        console.error("Error in updatePassword:", error);
        return {
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown error occurred",
        };
    }
}

export async function uploadUserImage(
    prevState: { success: boolean; message: string; imageUrl?: string } | null,
    formData: FormData
) {
    try {
        // Check authentication
        const session =
            (await cookies()).get(MOVEMENT_SESSION_NAME)?.value || null;
        if (!session) {
            return { success: false, message: "User not logged in" };
        }

        // Get user information
        const { account } = await createSessionClient(session);
        const appwriteUser = await account.get();

        if (!appwriteUser || !appwriteUser.$id) {
            return { success: false, message: "User session invalid" };
        }

        // Validate file
        const file = formData.get("file") as File;
        if (!file) {
            return { success: false, message: "No file provided" };
        }

        // File validation
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_FILE_SIZE) {
            return { success: false, message: "File is too large (max 5MB)" };
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
        ];
        if (!allowedTypes.includes(file.type)) {
            return {
                success: false,
                message: "File must be a valid image (JPEG, PNG, WebP, or GIF)",
            };
        }

        // Then in your function, before creating apiFormData:
        // Convert image to WebP
        const webpBuffer = await sharp(await file.arrayBuffer())
            .webp({ quality: 80 })
            .toBuffer();

        // Create a new File object with the WebP data
        const webpFile = new File(
            [new Uint8Array(webpBuffer)],
            `${file.name.split(".")[0]}.webp`,
            {
                type: "image/webp",
            }
        );

        const dbUser = await getUserById(appwriteUser.$id);
        if (!dbUser || !dbUser.userId) {
            return { success: false, message: "User not found in database" };
        }

        try {
            // Generate IDs and URLs
            const fileId = ID.unique();
            const bucketId =
                process.env.NEXT_PUBLIC_STORAGE_IMAGES || "profile_images";
            const fileUrl = `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/view?project=${process.env.NEXT_PUBLIC_PROJECT_ID}`;

            // Create a new FormData to send the file
            const apiFormData = new FormData();
            apiFormData.append("fileId", fileId);
            apiFormData.append("file", webpFile);

            // Use the session token for authentication instead of API key
            const headers = {
                "X-Appwrite-Project": process.env.NEXT_PUBLIC_PROJECT_ID || "",
                "X-Appwrite-Session": session,
            };

            // Send the request to Appwrite API
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files`,
                {
                    method: "POST",
                    headers,
                    body: apiFormData,
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    `Upload failed: ${errorData.message || response.statusText}`
                );
            }

            // Update database after successful upload
            const User = alias(Users, "user");
            await db
                .update(User)
                .set({ imageUrl: fileUrl })
                .where(eq(User.userId, dbUser.userId));

            // Revalidate paths to bust the sidebar cache
            revalidatePath("/");
            revalidatePath("/settings");

            return {
                success: true,
                message: "Image uploaded successfully",
                imageUrl: fileUrl.trim(),
            };
        } catch (error) {
            console.error("Error during upload:", error);
            return {
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Error during upload",
            };
        }
    } catch (error) {
        console.error("Error in uploadUserImage:", error);
        return {
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown error occurred",
        };
    }
}
