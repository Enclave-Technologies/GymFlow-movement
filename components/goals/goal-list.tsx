"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
    Check,
    CalendarIcon,
    Plus,
    PencilIcon,
    Trash2,
    Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ClientType } from "../client-tabs/client-tabs";
import {
    createGoal,
    updateGoal,
    deleteGoal,
    toggleGoalStatus,
    getGoalCategoriesByUserId,
} from "@/actions/goals_actions";
import { Calendar } from "../ui/calendar";

export interface Goal {
    id: string;
    description: string;
    completed: boolean;
    deadline?: string;
}

export interface GoalCategory {
    type: "physique" | "performance" | "skill" | "lifestyle";
    goals: Goal[];
}

// // Dummy data
// const SAMPLE_GOALS: GoalCategory[] = [
//     {
//         type: "physique",
//         goals: [
//             {
//                 id: "677f6d040001f43ea593",
//                 description: "Chest 50 inches",
//                 completed: false,
//                 deadline: "2023-12-31",
//             },
//         ],
//     },
//     {
//         type: "performance",
//         goals: [
//             {
//                 id: "67d7edfe003882bf2a74",
//                 description: "Test",
//                 completed: false,
//                 deadline: "2023-11-15",
//             },
//         ],
//     },
//     {
//         type: "skill",
//         goals: [
//             {
//                 id: "67b76146001c941aa0e8",
//                 description: "Learn muscle-up",
//                 completed: false,
//                 deadline: "2023-10-01",
//             },
//         ],
//     },
//     {
//         type: "lifestyle",
//         goals: [],
//     },
// ];

const formatCategoryTitle = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1) + " Goals";
};

const GoalList = ({
    client_id,
    userdata,
}: {
    client_id: string;
    userdata: ClientType;
}) => {
    const [goals, setGoals] = useState<GoalCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
    const [isEditGoalOpen, setIsEditGoalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedGoalType, setSelectedGoalType] = useState<string>("");
    const [goalDescription, setGoalDescription] = useState("");
    const [goalDeadline, setGoalDeadline] = useState<Date | undefined>(
        undefined
    );
    const [editingGoal, setEditingGoal] = useState<{
        categoryIndex: number;
        goalIndex: number;
    } | null>(null);
    const [deletingGoal, setDeletingGoal] = useState<{
        categoryIndex: number;
        goalIndex: number;
        description: string;
    } | null>(null);

    // Handle checking and unchecking goals
    const handleGoalToggle = (categoryIndex: number, goalIndex: number) => {
        if (isEditMode) return;

        const goal = goals[categoryIndex].goals[goalIndex];

        startTransition(async () => {
            try {
                await toggleGoalStatus(goal.id);

                // Update local state
                const updatedGoals = [...goals];
                updatedGoals[categoryIndex].goals[goalIndex].completed =
                    !updatedGoals[categoryIndex].goals[goalIndex].completed;
                setGoals(updatedGoals);
            } catch (error) {
                console.error("Failed to toggle goal status:", error);
            }
        });
    };

    const handleAddGoal = () => {
        setIsAddGoalOpen(true);
        setSelectedGoalType("");
        setGoalDescription("");
        setGoalDeadline(undefined);
    };

    const handleEnterEditMode = () => {
        setIsEditMode(true);
    };

    const handleExitEditMode = () => {
        setIsEditMode(false);
    };

    const handleEditGoal = (categoryIndex: number, goalIndex: number) => {
        const goal = goals[categoryIndex].goals[goalIndex];
        setEditingGoal({ categoryIndex, goalIndex });
        setSelectedGoalType(goals[categoryIndex].type);
        setGoalDescription(goal.description);
        setGoalDeadline(goal.deadline ? new Date(goal.deadline) : undefined);
        setIsEditGoalOpen(true);
    };

    const handleConfirmDeleteGoal = (
        categoryIndex: number,
        goalIndex: number
    ) => {
        const goal = goals[categoryIndex].goals[goalIndex];
        setDeletingGoal({
            categoryIndex,
            goalIndex,
            description: goal.description,
        });
        setIsDeleteConfirmOpen(true);
    };

    const handleDeleteGoal = () => {
        if (!deletingGoal) return;

        const { categoryIndex, goalIndex } = deletingGoal;
        const goalId = goals[categoryIndex].goals[goalIndex].id;

        startTransition(async () => {
            try {
                await deleteGoal(goalId);

                // Update local state
                const updatedGoals = [...goals];
                updatedGoals[categoryIndex].goals.splice(goalIndex, 1);
                setGoals(updatedGoals);
            } catch (error) {
                console.error("Failed to delete goal:", error);
            } finally {
                setIsDeleteConfirmOpen(false);
                setDeletingGoal(null);
            }
        });
    };

    const handleSaveAddGoal = () => {
        if (!selectedGoalType || !goalDescription) return;

        // Convert UI goal type to database goal type format
        const goalTypeMap = {
            physique: "physique goal" as const,
            performance: "performance goal" as const,
            skill: "skill goal" as const,
            lifestyle: "lifestyle goal" as const,
        };

        const goalType =
            goalTypeMap[selectedGoalType as keyof typeof goalTypeMap];

        startTransition(async () => {
            try {
                const newGoal = await createGoal({
                    userId: client_id,
                    goalDescription: goalDescription,
                    goalType: goalType,
                    deadline: goalDeadline,
                });

                // Update local state
                const updatedGoals = [...goals];
                const categoryIndex = updatedGoals.findIndex(
                    (cat) => cat.type === selectedGoalType
                );

                if (categoryIndex !== -1) {
                    updatedGoals[categoryIndex].goals.push({
                        id: newGoal.goalId,
                        description: newGoal.goalDescription,
                        completed: newGoal.goalStatus === "achieved",
                        deadline: newGoal.deadline
                            ? new Date(newGoal.deadline)
                                  .toISOString()
                                  .split("T")[0]
                            : undefined,
                    });

                    setGoals(updatedGoals);
                }
            } catch (error) {
                console.error("Failed to create goal:", error);
            } finally {
                setIsAddGoalOpen(false);
                setSelectedGoalType("");
                setGoalDescription("");
                setGoalDeadline(undefined);
            }
        });
    };

    const handleSaveEditGoal = () => {
        if (!editingGoal || !goalDescription) return;

        const { categoryIndex, goalIndex } = editingGoal;
        const originalGoal = goals[categoryIndex].goals[goalIndex];
        const originalType = goals[categoryIndex].type;
        const goalId = originalGoal.id;

        // Convert UI goal type to database goal type format
        const goalTypeMap = {
            physique: "physique goal" as const,
            performance: "performance goal" as const,
            skill: "skill goal" as const,
            lifestyle: "lifestyle goal" as const,
        };

        const goalType =
            goalTypeMap[selectedGoalType as keyof typeof goalTypeMap];

        startTransition(async () => {
            try {
                await updateGoal(goalId, {
                    goalDescription: goalDescription,
                    goalType: goalType,
                    deadline: goalDeadline,
                });

                // Update local state
                const updatedGoals = [...goals];

                // Check if goal type has changed
                if (originalType !== selectedGoalType) {
                    updatedGoals[categoryIndex].goals.splice(goalIndex, 1);

                    // Find new category index
                    const newCategoryIndex = updatedGoals.findIndex(
                        (cat) => cat.type === selectedGoalType
                    );

                    if (newCategoryIndex !== -1) {
                        // Add goal to new category
                        updatedGoals[newCategoryIndex].goals.push({
                            ...originalGoal,
                            description: goalDescription,
                            deadline: goalDeadline
                                ? goalDeadline.toISOString().split("T")[0]
                                : undefined,
                        });
                    }
                } else {
                    // Just update the goal in the same category
                    updatedGoals[categoryIndex].goals[goalIndex] = {
                        ...originalGoal,
                        description: goalDescription,
                        deadline: goalDeadline
                            ? goalDeadline.toISOString().split("T")[0]
                            : undefined,
                    };
                }

                setGoals(updatedGoals);
            } catch (error) {
                console.error("Failed to update goal:", error);
            } finally {
                setIsEditGoalOpen(false);
                setEditingGoal(null);
            }
        });
    };

    const [isPending, startTransition] = useTransition();

    // Show loading indicator when actions are pending
    useEffect(() => {
        if (isPending) {
            // You could add a loading indicator here if needed
            document.body.style.cursor = "wait";
        } else {
            document.body.style.cursor = "default";
        }

        return () => {
            document.body.style.cursor = "default";
        };
    }, [isPending]);

    useEffect(() => {
        const fetchGoals = async () => {
            setLoading(true);
            try {
                const fetchedGoals = await getGoalCategoriesByUserId(client_id);

                // If fetched data is empty, make sure we still have the category structure in place
                const initialGoals: GoalCategory[] =
                    fetchedGoals.length > 0
                        ? fetchedGoals.map((category) => ({
                              type: category.type as
                                  | "physique"
                                  | "performance"
                                  | "skill"
                                  | "lifestyle",
                              goals: category.goals.map((goal) => ({
                                  id: goal.id,
                                  description: goal.description,
                                  completed: goal.completed,
                                  deadline: goal.deadline,
                              })),
                          }))
                        : [
                              { type: "physique", goals: [] },
                              { type: "performance", goals: [] },
                              { type: "skill", goals: [] },
                              { type: "lifestyle", goals: [] },
                          ];

                setGoals(initialGoals);
            } catch (error) {
                console.error("Failed to fetch goals:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGoals();
    }, [client_id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-foreground">Loading goals...</span>
                </div>
            </div>
        );
    }

    const hasAnyGoals = goals.some((category) => category.goals.length > 0);

    return (
        <div className="space-y-8">
            {hasAnyGoals && (
                <div className="flex gap-2 mt-4">
                    <Button
                        onClick={handleAddGoal}
                        className="bg-green-800 hover:bg-green-700 text-white flex items-center gap-1"
                    >
                        <Plus className="h-4 w-4" />
                        Add Goal
                    </Button>

                    {!isEditMode ? (
                        <Button
                            onClick={handleEnterEditMode}
                            variant="outline"
                            className="border-gray-300 text-foreground dark:border-gray-600"
                        >
                            <PencilIcon className="h-4 w-4 mr-1" />
                            Edit Goals
                        </Button>
                    ) : (
                        <Button
                            onClick={handleExitEditMode}
                            variant="outline"
                            className="border-gray-300 text-foreground dark:border-gray-600"
                        >
                            Done Editing
                        </Button>
                    )}
                </div>
            )}

            {hasAnyGoals ? (
                goals.map((category, categoryIndex) => (
                    <div key={category.type} className="mb-6">
                        <h2 className="text-xl font-semibold text-foreground mb-4">
                            {formatCategoryTitle(category.type)}
                        </h2>

                        {category.goals.length > 0 ? (
                            <div className="space-y-2">
                                {category.goals.map((goal, goalIndex) => (
                                    <div
                                        key={goal.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 border rounded-lg transition-colors",
                                            goal.completed && !isEditMode
                                                ? "bg-green-800 text-white border-green-900"
                                                : isEditMode
                                                ? "bg-card border-border"
                                                : "bg-white dark:bg-card border-border hover:bg-accent/5 cursor-pointer"
                                        )}
                                        onClick={() =>
                                            !isEditMode &&
                                            handleGoalToggle(
                                                categoryIndex,
                                                goalIndex
                                            )
                                        }
                                    >
                                        <div className="flex items-center space-x-3 flex-1">
                                            {!isEditMode && (
                                                <div
                                                    className={cn(
                                                        "w-6 h-6 rounded-full border flex items-center justify-center transition-colors shrink-0",
                                                        goal.completed
                                                            ? "bg-white border-white"
                                                            : "border-gray-300 dark:border-gray-600"
                                                    )}
                                                >
                                                    {goal.completed && (
                                                        <Check className="h-4 w-4 text-green-800" />
                                                    )}
                                                </div>
                                            )}
                                            <span
                                                className={cn(
                                                    "text-base",
                                                    goal.completed &&
                                                        !isEditMode
                                                        ? "text-white"
                                                        : "text-foreground"
                                                )}
                                            >
                                                {goal.description}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {goal.deadline && !isEditMode && (
                                                <div className="flex items-center text-sm text-white">
                                                    <CalendarIcon className="h-4 w-4 mr-1" />
                                                    <span>
                                                        {format(
                                                            new Date(
                                                                goal.deadline
                                                            ),
                                                            "MMM d, yyyy"
                                                        )}
                                                    </span>
                                                </div>
                                            )}

                                            {isEditMode && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-green-700 hover:text-green-800 cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditGoal(
                                                                categoryIndex,
                                                                goalIndex
                                                            );
                                                        }}
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleConfirmDeleteGoal(
                                                                categoryIndex,
                                                                goalIndex
                                                            );
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-muted/40 dark:bg-muted/20 rounded-lg border border-dashed border-border">
                                <p className="text-foreground">
                                    No Goals Added Yet For{" "}
                                    {category?.type?.charAt(0).toUpperCase() +
                                        category?.type?.slice(1)}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Click &quot;Add Goal&quot; To Get Started
                                </p>
                            </div>
                        )}
                    </div>
                ))
            ) : (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="text-center max-w-md">
                        <h3 className="text-xl font-semibold mb-2 text-foreground">
                            {userdata.fullName} does not have any goals added
                            yet.
                        </h3>
                        <p className="text-muted-foreground mb-6">
                            Add a Custom Goal or Select a goal from your
                            Template Library
                        </p>
                        <Button
                            onClick={handleAddGoal}
                            className="bg-green-800 hover:bg-green-700 text-white"
                        >
                            + Add Goal
                        </Button>
                    </div>
                </div>
            )}

            {/* Add Goal Modal */}
            <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-center">
                            Add Goal
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Select
                            value={selectedGoalType}
                            onValueChange={setSelectedGoalType}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Goal Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="physique">
                                    Physique Goal
                                </SelectItem>
                                <SelectItem value="performance">
                                    Performance Goal
                                </SelectItem>
                                <SelectItem value="skill">
                                    Skill Goal
                                </SelectItem>
                                <SelectItem value="lifestyle">
                                    Lifestyle Goal
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Input
                            placeholder="New Goal"
                            value={goalDescription}
                            onChange={(e) => setGoalDescription(e.target.value)}
                        />

                        <div className="grid gap-2">
                            <div className="flex flex-col space-y-1.5">
                                <label
                                    htmlFor="deadline"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Deadline (Optional)
                                </label>
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="deadline"
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !goalDeadline &&
                                                "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {goalDeadline ? (
                                            format(goalDeadline, "PPP")
                                        ) : (
                                            <span>Select deadline</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                >
                                    <Calendar
                                        mode="single"
                                        selected={goalDeadline}
                                        onSelect={setGoalDeadline}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsAddGoalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveAddGoal}
                            className="bg-green-800 hover:bg-green-700 text-white"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                "Add Goal"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Goal Modal */}
            <Dialog open={isEditGoalOpen} onOpenChange={setIsEditGoalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-center">
                            Edit Goal
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Select
                            value={selectedGoalType}
                            onValueChange={setSelectedGoalType}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Goal Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="physique">
                                    Physique Goal
                                </SelectItem>
                                <SelectItem value="performance">
                                    Performance Goal
                                </SelectItem>
                                <SelectItem value="skill">
                                    Skill Goal
                                </SelectItem>
                                <SelectItem value="lifestyle">
                                    Lifestyle Goal
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Input
                            value={goalDescription}
                            onChange={(e) => setGoalDescription(e.target.value)}
                        />

                        <div className="grid gap-2">
                            <div className="flex flex-col space-y-1.5">
                                <label
                                    htmlFor="deadline"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Deadline (Optional)
                                </label>
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="deadline"
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !goalDeadline &&
                                                "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {goalDeadline ? (
                                            format(goalDeadline, "PPP")
                                        ) : (
                                            <span>Select deadline</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-auto p-0"
                                    align="start"
                                >
                                    <Calendar
                                        mode="single"
                                        selected={goalDeadline}
                                        onSelect={setGoalDeadline}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsEditGoalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveEditGoal}
                            className="bg-green-800 hover:bg-green-700 text-white"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Goal"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog
                open={isDeleteConfirmOpen}
                onOpenChange={setIsDeleteConfirmOpen}
            >
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-center">
                            Delete Goal
                        </DialogTitle>
                        <DialogDescription className="text-center pt-2">
                            Are you sure you want to delete this goal?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-center font-medium">
                            &quot;{deletingGoal?.description}&quot;
                        </p>
                    </div>
                    <DialogFooter className="sm:justify-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteConfirmOpen(false)}
                            className="cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteGoal}
                            variant="destructive"
                            className="bg-red-500 hover:bg-red-600 cursor-pointer"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Yes, Delete"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GoalList;
