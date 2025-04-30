"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

// Define which columns can be filtered and sorted with user-friendly labels
export const tableOperations = {
  filterableColumns: [
    { id: "name", label: "Exercise Name" },
    { id: "difficulty", label: "Motion" },
    { id: "muscleGroup", label: "Target Area" },
  ],
  sortableColumns: [
    { id: "name", label: "Exercise Name" },
    { id: "difficulty", label: "Motion" },
    { id: "muscleGroup", label: "Target Area" },
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
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "difficulty",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Motion
        </Button>
      );
    },
    cell: ({ row }) => {
      const motion = row.getValue("difficulty") as string;
      return <div className="font-medium">{motion || "N/A"}</div>;
    },
  },
  {
    accessorKey: "muscleGroup",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Target Area
        </Button>
      );
    },
    cell: ({ row }) => {
      const targetArea = row.getValue("muscleGroup") as string;
      return <div>{targetArea || "N/A"}</div>;
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Exercise Name
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "status",
    header: "Approval Status",
    cell: ({ row }) => {
      const exercise = row.original;
      const isApproved = exercise.status;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`px-2 py-1 ${
                isApproved
                  ? "bg-green-50 text-green-700 hover:bg-green-100"
                  : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
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
              className="text-green-700"
              onClick={() => handleStatusChange(exercise.exerciseId, true)}
            >
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-yellow-700"
              onClick={() => handleStatusChange(exercise.exerciseId, false)}
            >
              Unapprove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
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
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const exercise = row.original;
      return <ActionCell exerciseId={exercise.exerciseId} />;
    },
    enableSorting: false,
    enableColumnFilter: false,
  },
];
