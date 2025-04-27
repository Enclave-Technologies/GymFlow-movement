"use server";

import { db } from "@/db/xata";
import {
    Goals,
    InsertGoal,
    SelectGoal,
    goalStatusEnum,
    goalTypeEnum,
} from "@/db/schemas";
import { eq } from "drizzle-orm";

// Get all goals for a specific user
export async function getGoalsByUserId(userId: string): Promise<SelectGoal[]> {
    try {
        const goals = await db
            .select()
            .from(Goals)
            .where(eq(Goals.userId, userId));
        return goals;
    } catch (error) {
        console.error("Error fetching goals:", error);
        throw new Error("Failed to fetch goals");
    }
}

// Create a new goal
export async function createGoal(
    goalData: Omit<InsertGoal, "goalId" | "createdDate">
): Promise<SelectGoal> {
    try {
        // Validate goal type
        if (
            !Object.values(goalTypeEnum.enumValues).includes(goalData.goalType)
        ) {
            throw new Error("Invalid goal type");
        }

        // Set default status if not provided
        const status = goalData.goalStatus || "in-progress";
        if (!Object.values(goalStatusEnum.enumValues).includes(status)) {
            throw new Error("Invalid goal status");
        }

        const [newGoal] = await db
            .insert(Goals)
            .values({
                ...goalData,
                goalStatus: status,
            })
            .returning();

        return newGoal;
    } catch (error) {
        console.error("Error creating goal:", error);
        throw new Error("Failed to create goal");
    }
}

// Update an existing goal
export async function updateGoal(
    goalId: string,
    goalData: Partial<Omit<InsertGoal, "goalId" | "userId" | "createdDate">>
): Promise<SelectGoal> {
    try {
        // Validate goal type if provided
        if (
            goalData.goalType &&
            !Object.values(goalTypeEnum.enumValues).includes(goalData.goalType)
        ) {
            throw new Error("Invalid goal type");
        }

        // Validate goal status if provided
        if (
            goalData.goalStatus &&
            !Object.values(goalStatusEnum.enumValues).includes(
                goalData.goalStatus
            )
        ) {
            throw new Error("Invalid goal status");
        }

        const [updatedGoal] = await db
            .update(Goals)
            .set(goalData)
            .where(eq(Goals.goalId, goalId))
            .returning();

        if (!updatedGoal) {
            throw new Error("Goal not found");
        }

        return updatedGoal;
    } catch (error) {
        console.error("Error updating goal:", error);
        throw new Error("Failed to update goal");
    }
}

// Delete a goal
export async function deleteGoal(
    goalId: string
): Promise<{ success: boolean }> {
    try {
        await db.delete(Goals).where(eq(Goals.goalId, goalId));
        return { success: true };
    } catch (error) {
        console.error("Error deleting goal:", error);
        throw new Error("Failed to delete goal");
    }
}

// Toggle goal status (achieved/in-progress)
export async function toggleGoalStatus(goalId: string): Promise<SelectGoal> {
    try {
        // First, get the current goal to check its status
        const [currentGoal] = await db
            .select()
            .from(Goals)
            .where(eq(Goals.goalId, goalId));

        if (!currentGoal) {
            throw new Error("Goal not found");
        }

        // Toggle the status
        const newStatus =
            currentGoal.goalStatus === "achieved" ? "in-progress" : "achieved";

        // Update the goal with the new status
        const [updatedGoal] = await db
            .update(Goals)
            .set({ goalStatus: newStatus })
            .where(eq(Goals.goalId, goalId))
            .returning();

        return updatedGoal;
    } catch (error) {
        console.error("Error toggling goal status:", error);
        throw new Error("Failed to toggle goal status");
    }
}

// Get goal categories with their goals
export async function getGoalCategoriesByUserId(userId: string): Promise<
    {
        type: string;
        goals: Array<{
            id: string;
            description: string;
            completed: boolean;
            deadline?: string;
            type: string;
        }>;
    }[]
> {
    try {
        // Fetch all goals for the user
        const goals = await getGoalsByUserId(userId);

        // Create a map of goal types to their respective goals
        const goalTypeMap: Record<string, Array<{
            id: string;
            description: string;
            completed: boolean;
            deadline?: string;
            type: string;
        }>> = {};

        // Initialize with all possible goal types
        goalTypeEnum.enumValues.forEach((type) => {
            const formattedType = type.split(" ")[0]; // Extract first word (physique, lifestyle, etc.)
            goalTypeMap[formattedType] = [];
        });

        // Populate the map with goals
        goals.forEach((goal) => {
            const type = goal.goalType.split(" ")[0]; // Extract first word (physique, lifestyle, etc.)

            goalTypeMap[type].push({
                id: goal.goalId,
                description: goal.goalDescription,
                completed: goal.goalStatus === "achieved",
                deadline: goal.deadline
                    ? goal.deadline.toISOString().split("T")[0]
                    : undefined,
                type: goal.goalType,
            });
        });

        // Convert the map to the expected format
        return Object.entries(goalTypeMap).map(([type, goals]) => ({
            type,
            goals,
        }));
    } catch (error) {
        console.error("Error fetching goal categories:", error);
        throw new Error("Failed to fetch goal categories");
    }
}
