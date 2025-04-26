import { get_logged_in_user } from "@/actions/logged_in_user_actions";
import { redirect } from "next/navigation";

/**
 * Checks if the current user is a Guest and not approved by admin.
 * If so, redirects them to the awaiting approval page.
 * This function should be called at the beginning of each protected page.
 */
export async function checkGuestApproval() {
    const user = await get_logged_in_user();

    if (!user) {
        redirect("/login");
    }

    if (user.roles?.includes("Guest") && !user.approvedByAdmin) {
        redirect("/awaiting-approval");
    }

    return user;
}

/**
 * Checks if the current user is a Trainer or Admin.
 * If not logged in, redirects to login.
 * If not authorized, redirects to login or returns unauthorized error.
 * Use this at the top of all server actions to enforce access control.
 * @param {boolean} [throwInsteadOfRedirect=false] - If true, throws an error instead of redirecting (for pure logic functions).
 * @returns {Promise<object>} The user object if authorized, otherwise never (redirects or throws).
 */
export async function requireTrainerOrAdmin(throwInsteadOfRedirect = false) {
    const user = await get_logged_in_user();

    if (!user) {
        if (throwInsteadOfRedirect) {
            throw new Error("Unauthorized: Not logged in");
        }
        redirect("/login");
    }

    if (!user.roles?.includes("Trainer") && !user.roles?.includes("Admin")) {
        if (throwInsteadOfRedirect) {
            throw new Error("Unauthorized: Insufficient role");
        }
        redirect("/login");
    }

    return user;
}
