import React from "react";
import { fetchWorkoutSessionLogsPage } from "@/actions/workout_history_actions";
import ClientWorkoutHistoryList from "./client-workout-history-list";

/**
 * Server component: fetches the first page of workout session logs (10 items)
 * and hands off to a client component for interactive expand/edit/delete and pagination.
 */
const WorkoutHistoryList = async ({ client_id }: { client_id: string }) => {
    // initial fetch: latest 10 session logs
    const { items } = await fetchWorkoutSessionLogsPage(client_id, 0, 10);

    return (
        <div className="h-full">
            <ClientWorkoutHistoryList
                userId={client_id}
                initialSessions={items}
            />
        </div>
    );
};

export default WorkoutHistoryList;
