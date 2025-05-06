"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import {
    updateExerciseApprovalStatus
} from "@/actions/exercise_actions";

// Define the Exercise type to match our database schema
export type Exercise = {
    exerciseId: string;
    name: string;
    description: string | null;
    motion: string | null; // formerly difficulty
    targetArea: string | null; // formerly muscleGroup
    equipmentRequired: string | null;
    videoUrl: string | null;
    createdAt: Date;
    status?: boolean;
    movementType: string | null;
    timeMultiplier: number;
};

export type ExerciseResponse = {
    data: Exercise[];
    meta: {
        totalRowCount: number;
        page?: number;
        pageSize?: number;
        totalPages?: number;
        hasMore?: boolean;
    };
};

// Define which columns can be filtered and sorted with user-friendly labels
export const tableOperations = {
    filterableColumns: [
        { id: "name", label: "Exercise Name" },
        { id: "motion", label: "Motion" },
        { id: "targetArea", label: "Target Area" },
        { id: "movementType", label: "Movement Type" },
    ],
    sortableColumns: [
        { id: "name", label: "Exercise Name" },
        { id: "motion", label: "Motion" },
        { id: "targetArea", label: "Target Area" },
        { id: "movementType", label: "Movement Type" },
        { id: "status", label: "Approval Status" },
        { id: "createdAt", label: "Created" },
    ],
};

async function handleStatusChange(exerciseId: string, status: boolean) {
    try {
        const result = await updateExerciseApprovalStatus(exerciseId, status);
        if (!result.success) {
            throw new Error(result.error || "Failed to update approval status");
        }
        console.log(
            `Exercise ${exerciseId} status changed to ${
                status ? "approved" : "unapproved"
            }`
        );
    } catch (error) {
        console.error("Error changing exercise status:", error);
        // Optionally, show error toast here
    }
}

// Create a proper React component for the actions cell
function ActionsCell({ exerciseId }: { exerciseId: string }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link
                        href={`/exercise?id=${exerciseId}`}
                        className="flex items-center gap-2 cursor-pointer"
                        prefetch={false}
                    >
                        <Edit className="h-4 w-4" />
                        <span>Edit Exercise</span>
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export const columns: ColumnDef<Exercise>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) =>
                    table.toggleAllPageRowsSelected(!!value)
                }
                aria-label="Select all"
                className="h-4 w-4"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                className="h-4 w-4"
            />
        ),
        enableSorting: false,
        enableHiding: false,
        enableColumnFilter: false,
        size: 40,
    },
    {
        accessorKey: "name",
        header: () => {
            return <div className="flex items-center gap-2">Exercise Name</div>;
        },
        cell: ({ row }) => (
            <div className="flex items-center gap-2 font-medium">
                {row.getValue("name")}
            </div>
        ),
        size: 400,
    },
    {
        accessorKey: "motion",
        header: () => {
            return <div className="flex items-center gap-2">Motion</div>;
        },
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue("motion")}</div>
        ),
        size: 200,
    },
    {
        accessorKey: "targetArea",
        header: () => {
            return <div className="flex items-center gap-2">Target Area</div>;
        },
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue("targetArea")}</div>
        ),
        size: 150,
    },
    {
        accessorKey: "movementType",
        header: () => {
            return <div className="flex items-center gap-2">Movement Type</div>;
        },
        cell: ({ row }) => (
            <div className="font-medium capitalize">
                {row.getValue("movementType")}
            </div>
        ),
        size: 150,
    },
    {
        accessorKey: "status",
        header: () => (
            <div className="flex items-center gap-2">Approval Status</div>
        ),
        cell: ({ row }) => {
            const exercise = row.original;
            const isApproved = exercise.status;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={` py-1 ${
                                isApproved
                                    ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
                                    : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-800"
                            }`}
                        >
                            <span className="capitalize">
                                {isApproved ? "Approved" : "Unapproved"}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            className="text-green-700 dark:text-green-300"
                            onClick={() =>
                                handleStatusChange(exercise.exerciseId, true)
                            }
                        >
                            Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-yellow-700 dark:text-yellow-300"
                            onClick={() =>
                                handleStatusChange(exercise.exerciseId, false)
                            }
                        >
                            Unapprove
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
        size: 150,
    },
    {
        accessorKey: "createdAt",
        header: () => <div className="flex items-center gap-2">Created</div>,
        cell: ({ row }) => {
            const date = row.getValue("createdAt") as Date | null;

            if (!date) return <div className="text-muted-foreground">—</div>;

            // Format the date to a readable format
            const formattedDate = new Date(date).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
            });

            // Calculate time since registration
            const now = new Date();
            const regDate = new Date(date);
            const diffTime = Math.abs(now.getTime() - regDate.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            let timeAgo = "";
            if (diffDays < 30) {
                timeAgo = `${diffDays} days ago`;
            } else if (diffDays < 365) {
                const months = Math.floor(diffDays / 30);
                timeAgo = `${months} month${months > 1 ? "s" : ""} ago`;
            } else {
                const years = Math.floor(diffDays / 365);
                timeAgo = `${years} year${years > 1 ? "s" : ""} ago`;
            }

            return (
                <div className="flex flex-col">
                    <span>{formattedDate}</span>
                    <span className="text-xs text-muted-foreground">
                        {timeAgo}
                    </span>
                </div>
            );
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const exercise = row.original;
            return <ActionsCell exerciseId={exercise.exerciseId} />;
        },
        enableSorting: false,
        enableColumnFilter: false,
        size: 60,
    },
];

// Export the columns for use in the data table
