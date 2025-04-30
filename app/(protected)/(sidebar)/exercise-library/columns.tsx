"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, Edit, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

// Define the Exercise type to match our database schema
export type Exercise = {
    exerciseId: string;
    name: string;
    description: string | null;
    difficulty: string | null; // motion
    muscleGroup: string | null; // target area
    equipmentRequired: string | null;
    videoUrl: string | null;
    createdAt: Date;
    status?: boolean;
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
    ],
    sortableColumns: [
        { id: "name", label: "Exercise Name" },
        { id: "motion", label: "Motion" },
        { id: "targetArea", label: "Target Area" },
        { id: "status", label: "Approval Status" },
        { id: "createdAt", label: "Created" },
    ],
};

// These functions should be implemented based on your application's needs
function handleStatusChange(exerciseId: string, status: boolean) {
  console.log(
    `Changing status of exercise ${exerciseId} to ${
      status ? "approved" : "unapproved"
    }`
  );
  // Call your server action to update the exercise status
  // Example: updateExerciseStatus(exerciseId, status);
}

// Create a proper React component for the actions cell
function ActionCell({ exerciseId }: { exerciseId: string }) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => router.push(`/exercise?id=${exerciseId}`)}
    >
      <Edit className="h-4 w-4" />
      <span className="sr-only">Edit</span>
    </Button>
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
            return (
                <div className="flex items-center gap-2">
                    {/* <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    > */}
                    Exercise Name
                    {/* </Button> */}
                </div>
            );
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
            return (
                <div className="flex items-center gap-2">
                    {/* <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    > */}
                    Motion
                    {/* </Button> */}
                </div>
            );
        },
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue("motion")}</div>
        ),
        size: 200,
    },
    {
        accessorKey: "targetArea",
        header: () => {
            return (
                <div className="flex items-center gap-2">
                    {/* <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    > */}
                    Target Area
                    {/* </Button> */}
                </div>
            );
        },
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue("targetArea")}</div>
        ),
        size: 150,
    },
    {
        accessorKey: "status",
        header: () => (
            <>
                <div className="flex items-center gap-2">
                    {/* <Button variant="ghost" className="px-0 py-0" disabled> */}
                    Approval Status
                    {/* </Button> */}
                </div>
            </>
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
                            <ArrowUpDown className="ml-2 h-3 w-3" />
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
        header: () => (
            <>
                <div className="flex items-center gap-2">
                    {/* <Button variant="ghost" className="px-0 py-0" disabled> */}
                    Created
                    {/* </Button> */}
                </div>
            </>
        ),
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

// These functions should be implemented based on your application's needs
function handleStatusChange(exerciseId: string, status: boolean) {
    console.log(
        `Changing status of exercise ${exerciseId} to ${
            status ? "approved" : "unapproved"
        }`
    );
    // Call your server action to update the exercise status
    // Example: updateExerciseStatus(exerciseId, status);
}

function handleEditExercise(exerciseId: string) {
    console.log(`Editing exercise ${exerciseId}`);
    // Navigate to edit page or open edit modal
    // Example: router.push(`/exercises/edit/${exerciseId}`);
}

