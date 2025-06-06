/**
 * Queue Integration Helpers
 *
 * This file provides helper functions to integrate the queue system
 * with existing application features like workout planning.
 */

import { addJobToQueue } from "@/actions/queue_actions";
import {
    WorkoutUpdateMessage,
    UserActionMessage,
    NotificationMessage,
    EmailMessage,
    ExerciseChanges,
    UserActionPayload,
    // EmailTemplateData,
} from "@/types/queue-types";

export class WorkoutQueueIntegration {
    /**
     * Queue a workout plan update for background processing
     */
    static async queueWorkoutUpdate(
        exercisePlanId: string,
        phaseId: string,
        sessionId: string,
        exerciseId: string,
        changes: ExerciseChanges,
        userId?: string
    ) {
        const message: WorkoutUpdateMessage = {
            messageType: "WORKOUT_UPDATE",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "workout-planner",
                updateType: "exercise_modification",
            },
            data: {
                exercisePlanId,
                phaseId,
                sessionId,
                exerciseId,
                changes,
            },
        };

        try {
            const result = await addJobToQueue(message, {
                priority: 5, // Medium priority
                attempts: 3,
            });

            if (result.success) {
                console.log(`Workout update queued: ${result.data?.jobId}`);
                return result;
            } else {
                throw new Error(
                    result.error || "Failed to queue workout update"
                );
            }
        } catch (error) {
            console.error("Failed to queue workout update:", error);
            throw error;
        }
    }

    /**
     * Queue a bulk workout update (multiple exercises)
     */
    static async queueBulkWorkoutUpdate(
        exercisePlanId: string,
        updates: Array<{
            phaseId: string;
            sessionId: string;
            exerciseId: string;
            changes: ExerciseChanges;
        }>,
        userId?: string
    ) {
        const jobs = [];

        for (const update of updates) {
            const job = await this.queueWorkoutUpdate(
                exercisePlanId,
                update.phaseId,
                update.sessionId,
                update.exerciseId,
                update.changes,
                userId
            );
            jobs.push(job);
        }

        return jobs;
    }

    /**
     * Queue a user action for analytics/tracking
     */
    static async queueUserAction(
        action: string,
        entityType: string,
        entityId: string,
        payload: UserActionPayload,
        userId?: string
    ) {
        const message: UserActionMessage = {
            messageType: "USER_ACTION",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "workout-planner",
                userAgent:
                    typeof window !== "undefined"
                        ? window.navigator.userAgent
                        : "server",
            },
            data: {
                action,
                entityType,
                entityId,
                payload,
            },
        };

        try {
            const result = await addJobToQueue(message, {
                priority: 3, // Lower priority for analytics
                attempts: 2,
            });

            if (result.success) {
                console.log(`User action queued: ${result.data?.jobId}`);
                return result;
            } else {
                console.error("Failed to queue user action:", result.error);
                return null; // Don't throw for analytics - it's not critical
            }
        } catch (error) {
            console.error("Failed to queue user action:", error);
            // Don't throw for analytics - it's not critical
            return null;
        }
    }
}

export class NotificationQueueIntegration {
    /**
     * Queue a notification for a user
     */
    static async queueNotification(
        recipientId: string,
        title: string,
        message: string,
        type: "info" | "warning" | "error" | "success" = "info",
        actionUrl?: string
    ) {
        const notificationMessage: NotificationMessage = {
            messageType: "NOTIFICATION",
            timestamp: new Date().toISOString(),
            userId: recipientId,
            metadata: {
                source: "system",
                channel: "in-app",
            },
            data: {
                recipientId,
                title,
                message,
                type,
                actionUrl,
            },
        };

        try {
            const result = await addJobToQueue(notificationMessage, {
                priority: 7, // High priority for notifications
                attempts: 3,
            });

            if (result.success) {
                console.log(`Notification queued: ${result.data?.jobId}`);
                return result;
            } else {
                throw new Error(result.error || "Failed to queue notification");
            }
        } catch (error) {
            console.error("Failed to queue notification:", error);
            throw error;
        }
    }

    /**
     * Queue workout completion notification
     */
    static async queueWorkoutCompletionNotification(
        userId: string,
        workoutName: string,
        completedExercises: number,
        totalExercises: number
    ) {
        const title = "Workout Completed! 🎉";
        const message = `Great job! You completed ${completedExercises}/${totalExercises} exercises in "${workoutName}".`;

        return this.queueNotification(
            userId,
            title,
            message,
            "success",
            "/workouts/history"
        );
    }

    /**
     * Queue workout reminder notification
     */
    static async queueWorkoutReminder(
        userId: string,
        workoutName: string,
        scheduledTime: string
    ) {
        const title = "Workout Reminder 💪";
        const message = `Don't forget your "${workoutName}" workout scheduled for ${scheduledTime}.`;

        return this.queueNotification(
            userId,
            title,
            message,
            "info",
            "/workouts/today"
        );
    }
}

export class EmailQueueIntegration {
    /**
     * Queue a welcome email for new users
     */
    static async queueWelcomeEmail(
        userEmail: string,
        userName: string,
        userId?: string
    ) {
        const message: EmailMessage = {
            messageType: "EMAIL",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "user-registration",
                emailType: "welcome",
            },
            data: {
                to: userEmail,
                subject: "Welcome to GymFlow Movement!",
                template: "welcome",
                templateData: {
                    userName,
                    loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
                    supportEmail: "support@gymflow.com",
                },
            },
        };

        try {
            const result = await addJobToQueue(message, {
                priority: 6, // High priority for welcome emails
                attempts: 3,
                delay: 5000, // 5 second delay to ensure user is fully created
            });

            if (result.success) {
                console.log(`Welcome email queued: ${result.data?.jobId}`);
                return result;
            } else {
                throw new Error(
                    result.error || "Failed to queue welcome email"
                );
            }
        } catch (error) {
            console.error("Failed to queue welcome email:", error);
            throw error;
        }
    }

    /**
     * Queue weekly progress report email
     */
    static async queueProgressReportEmail(
        userEmail: string,
        userName: string,
        weeklyStats: {
            completedWorkouts: number;
            totalWorkouts: number;
            totalExercises: number;
            totalSets: number;
            totalReps: number;
        },
        userId?: string
    ) {
        const message: EmailMessage = {
            messageType: "EMAIL",
            timestamp: new Date().toISOString(),
            userId,
            metadata: {
                source: "weekly-report",
                emailType: "progress-report",
            },
            data: {
                to: userEmail,
                subject: "Your Weekly Fitness Progress 📊",
                template: "weekly-progress",
                templateData: {
                    userName,
                    ...weeklyStats,
                    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
                },
            },
        };

        try {
            const result = await addJobToQueue(message, {
                priority: 4, // Medium priority for reports
                attempts: 2,
            });

            if (result.success) {
                console.log(
                    `Progress report email queued: ${result.data?.jobId}`
                );
                return result;
            } else {
                throw new Error(
                    result.error || "Failed to queue progress report email"
                );
            }
        } catch (error) {
            console.error("Failed to queue progress report email:", error);
            throw error;
        }
    }
}

// Usage examples for integration with existing code:

/*
// In your workout planning component:
import { WorkoutQueueIntegration } from '@/lib/queue-integration';

// When an exercise is updated:
await WorkoutQueueIntegration.queueWorkoutUpdate(
  exercisePlanId,
  phaseId,
  sessionId,
  exerciseId,
  { sets: 4, reps: 12, weight: 135 },
  userId
);

// Track user actions:
await WorkoutQueueIntegration.queueUserAction(
  'exercise_updated',
  'exercise',
  exerciseId,
  { field: 'sets', oldValue: 3, newValue: 4 },
  userId
);

// Send notifications:
await NotificationQueueIntegration.queueWorkoutCompletionNotification(
  userId,
  'Push Day',
  8,
  10
);

// Send emails:
await EmailQueueIntegration.queueWelcomeEmail(
  'user@example.com',
  'John Doe',
  userId
);
*/
