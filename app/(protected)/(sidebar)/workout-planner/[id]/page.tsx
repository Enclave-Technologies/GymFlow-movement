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
import { Card, CardContent } from "@/components/ui/card";

interface WorkoutPlannerPageProps {
    params: Promise<{
        id: string;
    }>;
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
        <div className="container mx-auto py-2 md:py-6">
            {/* Header */}
            <div className="flex-shrink-0 w-full px-4 py-2 md:py-4 bg-background">
                <div className="flex items-center justify-between w-full min-w-0">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl font-bold text-foreground truncate">
                            Workout Planner
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                            Planning workout for {clientData.fullName}
                        </p>
                    </div>
                    <div className="flex items-center space-x-3 flex-shrink-0">
                        <a
                            href={`/clients/${resolvedParams.id}`}
                            className="text-sm text-primary hover:text-primary/80 font-medium whitespace-nowrap"
                        >
                            ← Back to Client
                        </a>
                    </div>
                </div>
            </div>

            {/* Workout Planner Component */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                <Card className="flex flex-col p-4 h-full min-h-[800px] md:col-span-5">
                    <CardContent className="h-full p-0">
                        <WorkoutPlanner
                            client_id={resolvedParams.id}
                            trainer_id={String(user.userId)}
                            exercises={exercises}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
