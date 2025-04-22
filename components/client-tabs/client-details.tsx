import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import WorkoutHistory from "@/components/workout-history/workout-history";
import WorkoutPlan from "@/components/workout-planning/workout-plan";
import GoalList from "@/components/goals/goal-list";
import BodyMassComposition from "@/components/body-mass-composition/body-mass-composition";

const ClientDetails = ({ client_id }: { client_id: string }) => {
    console.log("ClientDetails", client_id);

    return (
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8">
            <Tabs defaultValue="workout-history" className="w-full">
                <TabsList className="flex w-full space-x-2 overflow-x-auto sm:grid sm:grid-cols-4">
                    <TabsTrigger
                        className="flex-shrink-0 whitespace-nowrap"
                        value="workout-history"
                    >
                        Workout History
                    </TabsTrigger>
                    <TabsTrigger
                        className="flex-shrink-0 whitespace-nowrap"
                        value="workout-plan"
                    >
                        Workout Plan
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
                <TabsContent value="workout-history">
                    <WorkoutHistory client_id={client_id} />
                </TabsContent>
                <TabsContent value="workout-plan">
                    <WorkoutPlan client_id={client_id} />
                </TabsContent>
                <TabsContent value="goal-list">
                    <GoalList client_id={client_id} />
                </TabsContent>
                <TabsContent value="body-mass-composition">
                    <BodyMassComposition client_id={client_id} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ClientDetails;
