import React from "react";
import { fetchWorkoutSessionLogsPage } from "@/actions/workout_history_actions";
import ClientWorkoutHistoryList from "./client-workout-history-list";

/**
 * Server component: fetches the first page of workout session logs (10 items)
 * and hands off to a client component for interactive expand/edit/delete and pagination.
 */
const WorkoutHistoryList = async () => {
    // initial fetch: latest 10 session logs
    const { items } = await fetchWorkoutSessionLogsPage(0, 10);

    return <ClientWorkoutHistoryList initialSessions={items} />;
};

export default WorkoutHistoryList;
