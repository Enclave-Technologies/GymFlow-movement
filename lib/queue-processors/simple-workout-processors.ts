/**
 * Simplified Workout Processors for Queue Worker
 *
 * This file provides simplified processors that just log operations
 * without Next.js dependencies, allowing the queue worker to run.
 */

import {
    QueueJobResult,
    WorkoutUpdateMessage,
    WorkoutPhaseCreateMessage,
    WorkoutPhaseUpdateMessage,
    WorkoutPhaseDeleteMessage,
    WorkoutSessionCreateMessage,
    WorkoutSessionUpdateMessage,
    WorkoutSessionDeleteMessage,
    WorkoutExerciseCreateMessage,
    WorkoutExerciseUpdateMessage,
    WorkoutExerciseDeleteMessage,
    WorkoutPlanFullSaveMessage,
} from "@/types/queue-types";

export class SimpleWorkoutProcessors {
    static async processWorkoutUpdate(
        message: WorkoutUpdateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing workout update:", message.data);

        try {
            // Simulate processing time
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Workout update processed successfully",
                data: {
                    exercisePlanId: message.data.exercisePlanId,
                    updatedFieldsCount: Object.keys(message.data.changes)
                        .length,
                },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process workout update",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutPhaseCreate(
        message: WorkoutPhaseCreateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing phase creation:", message.data);

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Phase creation processed successfully",
                data: {
                    planId: message.data.planId,
                    phaseId: message.data.phase.id,
                    phaseName: message.data.phase.name,
                },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process phase creation",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutPhaseUpdate(
        message: WorkoutPhaseUpdateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing phase update:", message.data);

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Phase update processed successfully",
                data: {
                    planId: message.data.planId,
                    phaseId: message.data.phaseId,
                    updatedFields: Object.keys(message.data.changes).length,
                },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process phase update",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutPhaseDelete(
        message: WorkoutPhaseDeleteMessage
    ): Promise<QueueJobResult> {
        console.log("Processing phase deletion:", message.data);

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Phase deletion processed successfully",
                data: {
                    planId: message.data.planId,
                    phaseId: message.data.phaseId,
                },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process phase deletion",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutSessionCreate(
        message: WorkoutSessionCreateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing session creation:", message.data);

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Session creation processed successfully",
                data: { sessionId: message.data.session.id },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process session creation",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutSessionUpdate(
        message: WorkoutSessionUpdateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing session update:", message.data);

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Session update processed successfully",
                data: { sessionId: message.data.sessionId },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process session update",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutSessionDelete(
        message: WorkoutSessionDeleteMessage
    ): Promise<QueueJobResult> {
        console.log("Processing session deletion:", message.data);

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Session deletion processed successfully",
                data: { sessionId: message.data.sessionId },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process session deletion",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutExerciseCreate(
        message: WorkoutExerciseCreateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing exercise creation:", message.data);

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Exercise creation processed successfully",
                data: { exerciseId: message.data.exercise.id },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process exercise creation",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutExerciseUpdate(
        message: WorkoutExerciseUpdateMessage
    ): Promise<QueueJobResult> {
        console.log("Processing exercise update:", message.data);

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Exercise update processed successfully",
                data: { exerciseId: message.data.exerciseId },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process exercise update",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutExerciseDelete(
        message: WorkoutExerciseDeleteMessage
    ): Promise<QueueJobResult> {
        console.log("Processing exercise deletion:", message.data);

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                message: "Exercise deletion processed successfully",
                data: { exerciseId: message.data.exerciseId },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process exercise deletion",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }

    static async processWorkoutPlanFullSave(
        message: WorkoutPlanFullSaveMessage
    ): Promise<QueueJobResult> {
        console.log("Processing full plan save:", message.data);

        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));

            return {
                success: true,
                message: "Full plan save processed successfully",
                data: {
                    planId: message.data.planId ?? "",
                    phasesCount: message.data.phases.length,
                },
                processedAt: new Date().toISOString(),
            };
        } catch (error) {
            return {
                success: false,
                message: "Failed to process full plan save",
                error: error instanceof Error ? error.message : "Unknown error",
                processedAt: new Date().toISOString(),
            };
        }
    }
}
