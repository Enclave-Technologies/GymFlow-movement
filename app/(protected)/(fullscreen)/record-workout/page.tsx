import { Suspense } from "react";
import { WorkoutDataFetcher } from "./server-component";
import RecordWorkoutClient from "./client-component";

// This is the server component that handles the initial data fetching
export default async function RecordWorkoutPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const sessionId = (await searchParams).sessionId as string;
    const phaseId = (await searchParams).phaseId as string;
    const clientId = (await searchParams).clientId as string;
    const workoutSessionLogId = (await searchParams)
        .workoutSessionLogId as string;

    if (!sessionId) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="p-6 bg-card rounded-lg shadow-lg">
                    <h1 className="text-xl font-bold mb-4">Error</h1>
                    <p>Session ID is required to load workout data.</p>
                </div>
            </div>
        );
    }

    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    <span className="ml-3">Loading workout data...</span>
                </div>
            }
        >
            <WorkoutDataFetcherWrapper
                sessionId={sessionId}
                phaseId={phaseId}
                clientId={clientId}
                workoutSessionLogId={workoutSessionLogId}
            />
        </Suspense>
    );
}

// This component wraps the data fetcher and passes the data to the client component
async function WorkoutDataFetcherWrapper({
    sessionId,
    phaseId,
    clientId,
    workoutSessionLogId,
}: {
    sessionId: string;
    phaseId?: string;
    clientId?: string;
    workoutSessionLogId?: string;
}) {
    const {
        workoutData,
        pastSessions,
        workoutSessionLogId: newWorkoutSessionLogId,
        workoutSessionDetails,
    } = await WorkoutDataFetcher({
        sessionId,
        phaseId,
        clientId,
        workoutSessionLogId,
    });

    return (
        <RecordWorkoutClient
            initialWorkoutData={workoutData}
            sessionId={sessionId}
            phaseId={phaseId}
            clientId={clientId}
            workoutSessionLogId={newWorkoutSessionLogId}
            pastSessions={pastSessions}
            workoutSessionDetails={workoutSessionDetails}
        />
    );
}
