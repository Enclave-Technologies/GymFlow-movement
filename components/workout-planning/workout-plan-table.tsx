"use client";

import { useEffect, useState } from "react";
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
import { Clock, Dumbbell } from "lucide-react";
import Link from "next/link";
import type { Phase } from "./types";
import { getWorkoutPlanByClientId } from "@/actions/workout_client_actions";
import { mapWorkoutPlanResponseToPhase } from "./workout-utils/workout-utils";
import type { WorkoutPlanResponse } from "./types";

interface WorkoutPlanTableProps {
    client_id: string;
    trainer_id: string;
}

export default function WorkoutPlanTable({
    client_id,
    trainer_id,
}: WorkoutPlanTableProps) {
    const [phases, setPhases] = useState<Phase[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadWorkoutPlan = async () => {
            try {
                setLoading(true);
                const response = await getWorkoutPlanByClientId(client_id);

                // If no plan exists yet or empty array is returned
                if (
                    !response ||
                    (Array.isArray(response) && response.length === 0)
                ) {
                    setPhases([]);
                    return;
                }

                // Map the phases from the response
                const mapped = mapWorkoutPlanResponseToPhase(
                    response as WorkoutPlanResponse
                );

                // Ensure phases are sorted by orderNumber
                const sortedPhases = [...mapped].sort(
                    (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
                );

                // For each phase, ensure sessions are sorted by orderNumber
                const phasesWithSortedSessions = sortedPhases.map((phase) => ({
                    ...phase,
                    sessions: [...phase.sessions].sort(
                        (a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)
                    ),
                }));

                setPhases(phasesWithSortedSessions);
            } catch (error) {
                console.error("Failed to load workout plan:", error);
                setPhases([]);
            } finally {
                setLoading(false);
            }
        };

        loadWorkoutPlan();
    }, [client_id, trainer_id]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Current Workout Plan</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                            <Button className="bg-blue-600 hover:bg-blue-700">
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
                    <Link href={`/workout-planner/${client_id}`}>
                        <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 hover:text-accent-background"
                        >
                            Edit Workout Plan
                        </Button>
                    </Link>
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
                                                                        {exercise.notes ||
                                                                            exercise.additionalInfo ||
                                                                            exercise.customizations ||
                                                                            "-"}
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
