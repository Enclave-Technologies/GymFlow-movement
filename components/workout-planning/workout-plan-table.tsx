"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Clock, Dumbbell, Loader2, Download, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useWorkoutPlanCache } from "./hooks/use-workout-plan-cache";
import {
    downloadWorkoutPlanCsv,
    debugWorkoutPlanStructure,
} from "./workout-utils/workout-plan-csv";
import { toast } from "sonner";
import { LinkifiedText } from "@/components/ui/linkified-text";

interface WorkoutPlanTableProps {
    client_id: string;
    trainer_id: string;
}

export default function WorkoutPlanTable({
    client_id,
}: // trainer_id, // Keep for interface compatibility, but not needed for cached data
WorkoutPlanTableProps) {
    // Use cached workout plan data instead of fetching every time
    const {
        phases,
        isLoading: loading,
        error,
        isStale,
    } = useWorkoutPlanCache(client_id);

    // Log cache status for debugging (can be removed in production)
    console.log(
        `Workout plan cache status - Loading: ${loading}, Stale: ${isStale}, Phases: ${phases.length}`
    );

    // Log any errors (optional - could be removed in production)
    if (error) {
        console.error("Failed to load workout plan:", error);
    }

    // Handle download functionality
    const handleDownload = () => {
        // Prevent export if data is still loading
        if (loading) {
            toast.error(
                "Please wait for the workout plan to finish loading before exporting"
            );
            return;
        }

        // Prevent export if cache is stale
        if (isStale) {
            toast.error(
                "Workout plan data is outdated. Please refresh the page and try again."
            );
            return;
        }

        // Check if we have valid data to export
        if (!phases || phases.length === 0) {
            toast.error("No workout plan data available to export");
            return;
        }

        // Count total exercises to give user feedback
        const totalExercises = phases.reduce(
            (acc, phase) =>
                acc +
                phase.sessions.reduce(
                    (sessionAcc, session) =>
                        sessionAcc + session.exercises.length,
                    0
                ),
            0
        );

        if (totalExercises === 0) {
            toast.error("No exercises found in the workout plan to export");
            return;
        }

        try {
            // Debug logging in development
            if (process.env.NODE_ENV === "development") {
                debugWorkoutPlanStructure(phases, client_id);
            }

            downloadWorkoutPlanCsv(phases, `workout-plan-${client_id}.csv`);
            toast.success(
                `Workout plan exported successfully (${totalExercises} exercises)`
            );
        } catch (err) {
            console.error("Error downloading workout plan:", err);
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "Failed to download workout plan";
            toast.error(errorMessage);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Current Workout Plan</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-gray-600">
                            Loading workout plan...
                        </span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (phases.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Current Workout Plan</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <Dumbbell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">
                            No workout plan created yet
                        </p>
                        <Link href={`/workout-planner/${client_id}`}>
                            <Button className="bg-primary hover:bg-primary/80">
                                Create First Workout Plan
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Current Workout Plan</CardTitle>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownload}
                            className="flex items-center gap-2"
                            disabled={loading || isStale || phases.length === 0}
                        >
                            <Download className="h-4 w-4" />
                            Download CSV
                        </Button>
                        <Link href={`/workout-planner/${client_id}`}>
                            <Button
                                size="sm"
                                className="bg-primary hover:bg-primary/90 hover:text-accent-background"
                            >
                                Edit Workout Plan
                            </Button>
                        </Link>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" className="space-y-4">
                    {phases.map((phase) => (
                        <AccordionItem
                            key={phase.id}
                            value={phase.id}
                            className="border rounded-lg !border-b"
                        >
                            <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                <div className="flex items-center space-x-2">
                                    <h3 className="font-semibold">
                                        {phase.name}
                                    </h3>
                                    {phase.isActive && (
                                        <Badge
                                            variant="default"
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Active
                                        </Badge>
                                    )}
                                    <Badge variant="secondary">
                                        {phase.sessions.length} session
                                        {phase.sessions.length !== 1 ? "s" : ""}
                                    </Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                <Accordion
                                    type="multiple"
                                    className="space-y-2"
                                >
                                    {phase.sessions.map((session) => (
                                        <AccordionItem
                                            key={session.id}
                                            value={session.id}
                                            className="border rounded bg-white !border-b"
                                        >
                                            <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-medium">
                                                        {session.name}
                                                    </span>
                                                    <div className="flex items-center space-x-1 text-xs text-gray-600">
                                                        <Clock className="h-3 w-3" />
                                                        <span>
                                                            {session.duration}
                                                            min
                                                        </span>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs"
                                                    >
                                                        {
                                                            session.exercises
                                                                .length
                                                        }{" "}
                                                        exercise
                                                        {session.exercises
                                                            .length !== 1
                                                            ? "s"
                                                            : ""}
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-3 pb-3">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-16">
                                                                Order
                                                            </TableHead>
                                                            <TableHead>
                                                                Exercise
                                                            </TableHead>
                                                            <TableHead className="w-20">
                                                                Sets
                                                            </TableHead>
                                                            <TableHead className="w-20">
                                                                Reps
                                                            </TableHead>
                                                            <TableHead className="w-20">
                                                                Rest
                                                            </TableHead>
                                                            <TableHead className="w-20">
                                                                TUT
                                                            </TableHead>
                                                            <TableHead>
                                                                Notes
                                                            </TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {session.exercises.map(
                                                            (exercise) => (
                                                                <TableRow
                                                                    key={
                                                                        exercise.id
                                                                    }
                                                                >
                                                                    <TableCell className="font-medium">
                                                                        {
                                                                            exercise.order
                                                                        }
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {exercise.description ||
                                                                            "Exercise"}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {exercise.setsMin &&
                                                                        exercise.setsMax
                                                                            ? `${exercise.setsMin}-${exercise.setsMax}`
                                                                            : exercise.sets ||
                                                                              "-"}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {exercise.repsMin &&
                                                                        exercise.repsMax
                                                                            ? `${exercise.repsMin}-${exercise.repsMax}`
                                                                            : exercise.reps ||
                                                                              "-"}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {exercise.restMin &&
                                                                        exercise.restMax
                                                                            ? `${exercise.restMin}-${exercise.restMax}s`
                                                                            : exercise.rest
                                                                            ? `${exercise.rest}s`
                                                                            : "-"}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {exercise.tut ||
                                                                            "-"}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-gray-600">
                                                                        <LinkifiedText
                                                                            text={
                                                                                exercise.notes ||
                                                                                exercise.additionalInfo ||
                                                                                exercise.customizations ||
                                                                                "-"
                                                                            }
                                                                        />
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>

                {/* Summary Information */}
                <div className="mt-4 mb-4 flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                        <span>
                            {phases.length} Phase
                            {phases.length !== 1 ? "s" : ""}
                        </span>
                        <span>
                            {phases.reduce(
                                (acc, phase) => acc + phase.sessions.length,
                                0
                            )}{" "}
                            Session
                            {phases.reduce(
                                (acc, phase) => acc + phase.sessions.length,
                                0
                            ) !== 1
                                ? "s"
                                : ""}
                        </span>
                        <span>
                            {phases.reduce(
                                (acc, phase) =>
                                    acc +
                                    phase.sessions.reduce(
                                        (sessionAcc, session) =>
                                            sessionAcc +
                                            session.exercises.length,
                                        0
                                    ),
                                0
                            )}{" "}
                            Exercise
                            {phases.reduce(
                                (acc, phase) =>
                                    acc +
                                    phase.sessions.reduce(
                                        (sessionAcc, session) =>
                                            sessionAcc +
                                            session.exercises.length,
                                        0
                                    ),
                                0
                            ) !== 1
                                ? "s"
                                : ""}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
