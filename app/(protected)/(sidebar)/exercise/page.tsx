import { authenticated_or_login } from "@/actions/appwrite_actions";
import { checkGuestApproval } from "@/lib/auth-utils";
import { MOVEMENT_SESSION_NAME } from "@/lib/constants";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
    getAllExercisesForWorkoutPlanning,
    getExerciseById,
} from "@/actions/exercise_actions";
import AddExerciseForm from "./add-exercise-form";
import { get_logged_in_user } from "@/actions/logged_in_user_actions";

export default async function ExercisePage({
    searchParams,
}: {
    searchParams: Promise<{ id?: string }>;
}) {
    await checkGuestApproval();

    const resolvedParams = await searchParams;
    const session = (await cookies()).get(MOVEMENT_SESSION_NAME)?.value || null;
    const result = await authenticated_or_login(session);

    if (result && "error" in result) {
        console.error("Error in Exercise:", result.error);
        redirect("/login?error=user_fetch_error");
    }

    if (!result || (!("error" in result) && !result)) {
        redirect("/login");
    }

    const [exercises, user] = await Promise.all([
        getAllExercisesForWorkoutPlanning(),
        get_logged_in_user(),
    ]);

    // If we have an ID, fetch the exercise data
    let existingExercise = null;
    if (resolvedParams.id) {
        const exerciseResult = await getExerciseById(resolvedParams.id);
        if (!exerciseResult.success || !exerciseResult.data) {
            redirect("/exercise-library");
        }
        existingExercise = exerciseResult.data;
    }

    return (
        <AddExerciseForm
            exercises={exercises}
            userId={user?.id || ""}
            existingExercise={existingExercise}
        />
    );
}
