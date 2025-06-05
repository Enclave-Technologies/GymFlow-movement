import { redirect } from "next/navigation";
import { db } from "@/db/xata";
import { Users } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { getAllExercisesForWorkoutPlanning } from "@/actions/exercise_actions";
import WorkoutPlanner from "@/components/workout-planning/workout-plan";
import { checkGuestApproval } from "@/lib/auth-utils";
import { MOVEMENT_SESSION_NAME } from "@/lib/constants";
import { authenticated_or_login } from "@/actions/appwrite_actions";
import { cookies } from "next/headers";
import { get_user_account } from "@/actions/auth_actions";

interface WorkoutPlannerPageProps {
    params: {
        id: string;
    };
}

export default async function WorkoutPlannerPage({
    params,
}: WorkoutPlannerPageProps) {
    const resolvedParams = await params;
    await checkGuestApproval();

    const session = (await cookies()).get(MOVEMENT_SESSION_NAME)?.value || null;
    const result = await authenticated_or_login(session);

    if (result && "error" in result) {
        console.error("Error in Trainer:", result.error);
        redirect("/login?error=user_fetch_error");
    }

    if (!result || (!("error" in result) && !result)) {
        redirect("/login");
    }

    const user = await get_user_account();

    // Fetch client data to verify access and get client info
    const client = await db
        .select()
        .from(Users)
        .where(eq(Users.userId, resolvedParams.id))
        .limit(1);

    if (!client.length) {
        redirect("/clients");
    }

    const clientData = client[0];

    // Fetch exercises for the workout planner
    const exercises = await getAllExercisesForWorkoutPlanning();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Workout Planner
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Planning workout for {clientData.fullName}
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <a
                            href={`/clients/${params.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            ← Back to Client
                        </a>
                    </div>
                </div>
            </div>

            {/* Workout Planner Component */}
            <div className="p-6">
                <WorkoutPlanner
                    client_id={params.id}
                    trainer_id={String(user.userId)}
                    exercises={exercises}
                />
            </div>
        </div>
    );
}
