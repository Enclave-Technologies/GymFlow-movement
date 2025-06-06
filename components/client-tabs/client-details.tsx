import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import GoalList from "@/components/goals/goal-list";
import BodyMassComposition from "@/components/body-mass-composition/body-mass-composition";
import WorkoutHistoryList from "../workout-history/workout-history-list";
// import WorkoutPlanTable from "@/components/workout-planning/workout-plan-table";
import WorkoutPlanner from "@/components/workout-planning/workout-plan";
import { ClientType } from "./client-tabs";
import { get_logged_in_user } from "@/actions/logged_in_user_actions";
import { getAllExercisesForWorkoutPlanning } from "@/actions/exercise_actions";
import { redirect } from "next/navigation";

type ClientDetailsProps = {
    client_id: string;
    userdata: ClientType;
};

const ClientDetails = async ({ client_id, userdata }: ClientDetailsProps) => {
    const logged_in_user = await get_logged_in_user();

    if (!logged_in_user) {
        redirect("/login");
    }

    // Fetch exercises for the workout planner
    const exercises = await getAllExercisesForWorkoutPlanning();

    return (
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 h-full">
            <Tabs
                defaultValue="workout-planner"
                className="w-full h-full flex flex-col"
            >
                <TabsList className="flex w-full space-x-2 overflow-x-auto sm:grid sm:grid-cols-4">
                    <TabsTrigger
                        className="flex-shrink-0 whitespace-nowrap"
                        value="workout-history"
                    >
                        Workout History
                    </TabsTrigger>
                    {/* <TabsTrigger
                        className="flex-shrink-0 whitespace-nowrap"
                        value="workout-plan"
                    >
                        Workout Plan
                    </TabsTrigger> */}
                    <TabsTrigger
                        className="flex-shrink-0 whitespace-nowrap"
                        value="workout-planner"
                    >
                        Workout Planner
                    </TabsTrigger>
                    <TabsTrigger
                        className="flex-shrink-0 whitespace-nowrap"
                        value="goal-list"
                    >
                        Goal List
                    </TabsTrigger>
                    <TabsTrigger
                        className="flex-shrink-0 whitespace-nowrap"
                        value="body-mass-composition"
                    >
                        Body Mass Composition
                    </TabsTrigger>
                </TabsList>
                <TabsContent
                    value="workout-history"
                    className="flex-1 overflow-hidden"
                >
                    <WorkoutHistoryList client_id={client_id} />
                </TabsContent>
                {/* <TabsContent
                    value="workout-plan"
                    className="flex-1 overflow-hidden"
                >
                    <WorkoutPlanTable
                        client_id={client_id}
                        trainer_id={String(logged_in_user?.userId)}
                    />
                </TabsContent> */}
                <TabsContent
                    value="workout-planner"
                    className="flex-1 overflow-hidden"
                >
                    <WorkoutPlanner
                        client_id={client_id}
                        trainer_id={String(logged_in_user?.userId)}
                        exercises={exercises}
                    />
                </TabsContent>
                <TabsContent value="goal-list">
                    <GoalList client_id={client_id} userdata={userdata} />
                </TabsContent>
                <TabsContent value="body-mass-composition">
                    <BodyMassComposition client_id={client_id} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ClientDetails;
