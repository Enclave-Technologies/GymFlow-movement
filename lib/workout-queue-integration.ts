/**
 * Workout Queue Integration
 *
 * This file provides helper functions to integrate the queue system
 * with workout planning operations for event-driven architecture.
 */

import { addJobToQueue } from "@/actions/queue_actions";
import {
    WorkoutPlanCreateMessage,
    WorkoutPhaseCreateMessage,
    WorkoutPhaseUpdateMessage,
    WorkoutPhaseDeleteMessage,
    WorkoutPhaseDuplicateMessage,
    WorkoutPhaseActivateMessage,
    WorkoutSessionCreateMessage,
    WorkoutSessionUpdateMessage,
    WorkoutSessionDeleteMessage,
    WorkoutSessionDuplicateMessage,
    WorkoutExerciseSaveMessage,
    WorkoutExerciseDeleteMessage,
    WorkoutPlanFullSaveMessage,
    QueueJobOptions,
} from "@/types/queue-types";
import type { Phase, Session } from "@/components/workout-planning/types";

export class WorkoutQueueIntegration {
    /**
     * Queue a plan creation for background processing
     */
    static async queuePlanCreate(
        planId: string,
        planName: string,
        clientId: string,
        trainerId: string,
        isActive: boolean = true,
        userId?: string
    ) {
        const message: WorkoutPlanCreateMessage = {
            messageType: "WORKOUT_PLAN_CREATE",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "workout-planner",
                updateType: "plan_creation",
            },
            data: {
                planId,
                planName,
                clientId,
                trainerId,
                isActive,
            },
        };

        return addJobToQueue(message, {
            priority: 8, // High priority for plan creation
            attempts: 3,
            delay: 0,
        });
    }

    /**
     * Queue a phase creation for background processing
     */
    static async queuePhaseCreate(
        planId: string,
        clientId: string,
        trainerId: string,
        phase: {
            id: string;
            name: string;
            orderNumber: number;
            isActive: boolean;
        },
        userId?: string
    ) {
        const message: WorkoutPhaseCreateMessage = {
            messageType: "WORKOUT_PHASE_CREATE",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "workout-planner",
                updateType: "phase_creation",
            },
            data: {
                planId,
                clientId,
                trainerId,
                phase,
            },
        };

        return addJobToQueue(message, {
            priority: 5,
            attempts: 3,
            delay: 0,
        });
    }

    /**
     * Queue a phase creation with dependency on another job
     */
    static async queuePhaseCreateWithDependency(
        planId: string,
        clientId: string,
        trainerId: string,
        phase: {
            id: string;
            name: string;
            orderNumber: number;
            isActive: boolean;
        },
        dependsOnJobId?: string,
        userId?: string
    ) {
        const message: WorkoutPhaseCreateMessage = {
            messageType: "WORKOUT_PHASE_CREATE",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "workout-planner",
                updateType: "phase_creation_with_dependency",
            },
            data: {
                planId,
                clientId,
                trainerId,
                phase,
            },
        };

        // Add dependency and retry options for race condition handling
        const jobOptions: QueueJobOptions = {
            priority: 5,
            attempts: 5, // Increased attempts for dependency scenarios
            delay: 0,
            backoff: {
                type: "exponential",
                delay: 2000, // Start with 2 second delay
            },
        };

        // Note: BullMQ job dependencies are not supported in the current QueueJobOptions interface
        // If job dependencies are needed, they would need to be implemented at the application level
        if (dependsOnJobId) {
            console.log(
                `Phase creation depends on job: ${dependsOnJobId} (dependency tracking not implemented)`
            );
        }

        return addJobToQueue(message, jobOptions);
    }

    /**
     * Queue a phase update for background processing
     */
    static async queuePhaseUpdate(
        planId: string,
        phaseId: string,
        clientId: string,
        changes: {
            name?: string;
            isActive?: boolean;
            orderNumber?: number;
        },
        lastKnownUpdatedAt: Date,
        userId?: string
    ) {
        const message: WorkoutPhaseUpdateMessage = {
            messageType: "WORKOUT_PHASE_UPDATE",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "workout-planner",
                updateType: "phase_update",
            },
            data: {
                planId,
                phaseId,
                clientId,
                changes,
                lastKnownUpdatedAt: lastKnownUpdatedAt.toISOString(),
            },
        };

        return addJobToQueue(message, {
            priority: 5,
            attempts: 3,
            delay: 0,
        });
    }

    /**
     * Queue a phase deletion for background processing
     */
    static async queuePhaseDelete(
        planId: string,
        phaseId: string,
        clientId: string,
        lastKnownUpdatedAt: Date,
        userId?: string
    ) {
        const message: WorkoutPhaseDeleteMessage = {
            messageType: "WORKOUT_PHASE_DELETE",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "workout-planner",
                updateType: "phase_deletion",
            },
            data: {
                planId,
                phaseId,
                clientId,
                lastKnownUpdatedAt: lastKnownUpdatedAt.toISOString(),
            },
        };

        return addJobToQueue(message, {
            priority: 5,
            attempts: 3,
            delay: 0,
        });
    }

    /**
     * Queue a phase duplication for background processing
     */
    static async queuePhaseDuplicate(
        planId: string,
        clientId: string,
        trainerId: string,
        originalPhaseId: string,
        duplicatedPhase: Phase,
        lastKnownUpdatedAt: Date,
        userId?: string
    ) {
        const message: WorkoutPhaseDuplicateMessage = {
            messageType: "WORKOUT_PHASE_DUPLICATE",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "workout-planner",
                updateType: "phase_duplication",
            },
            data: {
                planId,
                clientId,
                trainerId,
                originalPhaseId,
                duplicatedPhase: {
                    id: duplicatedPhase.id,
                    name: duplicatedPhase.name,
                    orderNumber: duplicatedPhase.orderNumber || 0,
                    isActive: duplicatedPhase.isActive,
                    sessions: duplicatedPhase.sessions.map((session) => ({
                        id: session.id,
                        name: session.name,
                        orderNumber: session.orderNumber || 0,
                        sessionTime: session.duration,
                        exercises: session.exercises.map((exercise) => ({
                            id: exercise.id,
                            exerciseId: exercise.exerciseId,
                            description: exercise.description,
                            motion: exercise.motion,
                            targetArea: exercise.targetArea,
                            setsMin: exercise.setsMin,
                            setsMax: exercise.setsMax,
                            repsMin: exercise.repsMin,
                            repsMax: exercise.repsMax,
                            tempo: exercise.tempo,
                            restMin: exercise.restMin,
                            restMax: exercise.restMax,
                            customizations: exercise.customizations,
                            additionalInfo: exercise.additionalInfo,
                            notes: exercise.notes,
                            order: exercise.order,
                        })),
                    })),
                },
                lastKnownUpdatedAt: lastKnownUpdatedAt.toISOString(),
            },
        };

        return addJobToQueue(message, {
            priority: 4, // Medium priority for duplication operations
            attempts: 3,
            delay: 0,
        });
    }

    /**
     * Queue a phase activation/deactivation for background processing
     * Ensures only one phase is active at a time
     */
    static async queuePhaseActivate(
        planId: string,
        phaseId: string,
        clientId: string,
        isActivating: boolean,
        allPhaseIds: string[],
        lastKnownUpdatedAt: Date,
        userId?: string
    ) {
        const message: WorkoutPhaseActivateMessage = {
            messageType: "WORKOUT_PHASE_ACTIVATE",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "workout-planner",
                updateType: "phase_activation",
            },
            data: {
                planId,
                phaseId,
                clientId,
                isActivating,
                allPhaseIds,
                lastKnownUpdatedAt: lastKnownUpdatedAt.toISOString(),
            },
        };

        return addJobToQueue(message, {
            priority: 3, // High priority for activation operations
            attempts: 3,
            delay: 0,
        });
    }

    /**
     * Queue a session creation for background processing
     */
    static async queueSessionCreate(
        planId: string,
        phaseId: string,
        clientId: string,
        session: {
            id: string;
            name: string;
            orderNumber: number;
            sessionTime?: number;
        },
        lastKnownUpdatedAt: Date,
        userId?: string
    ) {
        const message: WorkoutSessionCreateMessage = {
            messageType: "WORKOUT_SESSION_CREATE",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "workout-planner",
                updateType: "session_creation",
            },
            data: {
                planId,
                phaseId,
                clientId,
                session,
                lastKnownUpdatedAt: lastKnownUpdatedAt.toISOString(),
            },
        };

        return addJobToQueue(message, {
            priority: 5,
            attempts: 3,
            delay: 0,
        });
    }

    /**
     * Queue a session update for background processing
     */
    static async queueSessionUpdate(
        planId: string,
        phaseId: string,
        sessionId: string,
        clientId: string,
        changes: {
            name?: string;
            orderNumber?: number;
            sessionTime?: number;
        },
        lastKnownUpdatedAt: Date,
        userId?: string
    ) {
        const message: WorkoutSessionUpdateMessage = {
            messageType: "WORKOUT_SESSION_UPDATE",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "workout-planner",
                updateType: "session_update",
            },
            data: {
                planId,
                phaseId,
                sessionId,
                clientId,
                changes,
                lastKnownUpdatedAt: lastKnownUpdatedAt.toISOString(),
            },
        };

        return addJobToQueue(message, {
            priority: 5,
            attempts: 3,
            delay: 0,
        });
    }

    /**
     * Queue a session deletion for background processing
     */
    static async queueSessionDelete(
        planId: string,
        phaseId: string,
        sessionId: string,
        clientId: string,
        lastKnownUpdatedAt: Date,
        userId?: string
    ) {
        const message: WorkoutSessionDeleteMessage = {
            messageType: "WORKOUT_SESSION_DELETE",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "workout-planner",
                updateType: "session_deletion",
            },
            data: {
                planId,
                phaseId,
                sessionId,
                clientId,
                lastKnownUpdatedAt: lastKnownUpdatedAt.toISOString(),
            },
        };

        return addJobToQueue(message, {
            priority: 5,
            attempts: 3,
            delay: 0,
        });
    }

    /**
     * Queue a session duplication for background processing
     */
    static async queueSessionDuplicate(
        planId: string,
        phaseId: string,
        clientId: string,
        originalSessionId: string,
        duplicatedSession: Session,
        lastKnownUpdatedAt: Date,
        userId?: string
    ) {
        const message: WorkoutSessionDuplicateMessage = {
            messageType: "WORKOUT_SESSION_DUPLICATE",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "workout-planner",
                updateType: "session_duplication",
            },
            data: {
                planId,
                phaseId,
                clientId,
                originalSessionId,
                duplicatedSession: {
                    id: duplicatedSession.id,
                    name: duplicatedSession.name,
                    orderNumber: duplicatedSession.orderNumber || 0,
                    sessionTime: duplicatedSession.duration,
                    exercises: duplicatedSession.exercises.map((exercise) => ({
                        id: exercise.id,
                        exerciseId: exercise.exerciseId,
                        description: exercise.description,
                        motion: exercise.motion,
                        targetArea: exercise.targetArea,
                        setsMin: exercise.setsMin,
                        setsMax: exercise.setsMax,
                        repsMin: exercise.repsMin,
                        repsMax: exercise.repsMax,
                        tempo: exercise.tempo,
                        restMin: exercise.restMin,
                        restMax: exercise.restMax,
                        customizations: exercise.customizations,
                        additionalInfo: exercise.additionalInfo,
                        notes: exercise.notes,
                        order: exercise.order,
                    })),
                },
                lastKnownUpdatedAt: lastKnownUpdatedAt.toISOString(),
            },
        };

        return addJobToQueue(message, {
            priority: 4, // Medium priority for duplication operations
            attempts: 3,
            delay: 0,
        });
    }

    /**
     * Queue an exercise save (create or update) for background processing
     */
    static async queueExerciseSave(
        planId: string,
        phaseId: string,
        sessionId: string,
        planExerciseId: string,
        clientId: string,
        exercise: {
            id: string;
            exerciseId: string;
            description: string;
            motion: string;
            targetArea: string;
            setsMin?: string;
            setsMax?: string;
            repsMin?: string;
            repsMax?: string;
            tempo?: string;
            restMin?: string;
            restMax?: string;
            customizations?: string;
            notes?: string;
            order?: string;
            additionalInfo?: string;
        },
        isNew: boolean,
        lastKnownUpdatedAt: Date,
        userId?: string
    ) {
        const message: WorkoutExerciseSaveMessage = {
            messageType: "WORKOUT_EXERCISE_SAVE",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "workout-planner",
                updateType: isNew ? "exercise_creation" : "exercise_update",
            },
            data: {
                planId,
                phaseId,
                sessionId,
                exerciseId: planExerciseId,
                planExerciseId,
                clientId,
                exercise,
                isNew,
                lastKnownUpdatedAt: lastKnownUpdatedAt.toISOString(),
            },
        };

        return addJobToQueue(message, {
            priority: 5,
            attempts: 3,
            delay: 0,
        });
    }

    /**
     * Queue an exercise deletion for background processing
     */
    static async queueExerciseDelete(
        planId: string,
        phaseId: string,
        sessionId: string,
        exerciseId: string,
        planExerciseId: string,
        clientId: string,
        lastKnownUpdatedAt: Date,
        userId?: string
    ) {
        const message: WorkoutExerciseDeleteMessage = {
            messageType: "WORKOUT_EXERCISE_DELETE",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "workout-planner",
                updateType: "exercise_deletion",
            },
            data: {
                planId,
                phaseId,
                sessionId,
                exerciseId,
                planExerciseId,
                clientId,
                lastKnownUpdatedAt: lastKnownUpdatedAt.toISOString(),
            },
        };

        return addJobToQueue(message, {
            priority: 5,
            attempts: 3,
            delay: 0,
        });
    }

    /**
     * Queue a full workout plan save for background processing
     * This is used for complex operations like CSV uploads or bulk changes
     */
    static async queueFullPlanSave(
        planId: string | undefined,
        clientId: string,
        trainerId: string,
        phases: Phase[],
        lastKnownUpdatedAt?: Date,
        userId?: string
    ) {
        const message: WorkoutPlanFullSaveMessage = {
            messageType: "WORKOUT_PLAN_FULL_SAVE",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "workout-planner",
                updateType: "full_plan_save",
            },
            data: {
                planId,
                clientId,
                trainerId,
                phases,
                lastKnownUpdatedAt: lastKnownUpdatedAt?.toISOString(),
            },
        };

        return addJobToQueue(message, {
            priority: 3, // Lower priority for bulk operations
            attempts: 3,
            delay: 0,
        });
    }
}
