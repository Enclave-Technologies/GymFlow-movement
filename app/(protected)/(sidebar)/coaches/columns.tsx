"use client";

import { ColumnDef } from "@tanstack/react-table";
// import { Checkbox } from "@/components/ui/checkbox";
import { Edit, MoreHorizontal, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define the Coach type to match our database schema
export type Coach = {
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  imageUrl: string | null;
  registrationDate: Date;
  gender: "male" | "female" | "non-binary" | "prefer-not-to-say" | null;
  approved: boolean | null;
  title?: string; // Role or title
};

// Create a separate client component for the actions cell
const ActionsCell = ({ coachId }: { coachId: string }) => {
  const router = useRouter();

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
        <DropdownMenuItem
          onClick={() => router.push(`/trainer/${coachId}`)}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>View Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleEditCoach(coachId)}
          className="cursor-pointer"
        >
          <Edit className="mr-2 h-4 w-4" />
          <span>Edit Profile</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Define which columns can be filtered and sorted with user-friendly labels
export const tableOperations = {
    filterableColumns: [
        { id: "fullName", label: "Name" },
        { id: "email", label: "Email" },
        { id: "phone", label: "Phone" },
        { id: "gender", label: "Gender" },
        { id: "title", label: "Title" }
    ],
    sortableColumns: [
        { id: "fullName", label: "Name" },
        { id: "email", label: "Email" },
        { id: "phone", label: "Phone" },
        { id: "gender", label: "Gender" },
        { id: "title", label: "Title" },
        { id: "registrationDate", label: "Registered" }
    ],
};

export const columns: ColumnDef<Coach>[] = [
  // {
  //   id: "select",
  //   header: ({ table }) => (
  //     <Checkbox
  //       checked={
  //         table.getIsAllPageRowsSelected() ||
  //         (table.getIsSomePageRowsSelected() && "indeterminate")
  //       }
  //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  //       aria-label="Select all"
  //     />
  //   ),
  //   cell: ({ row }) => (
  //     <Checkbox
  //       checked={row.getIsSelected()}
  //       onCheckedChange={(value) => row.toggleSelected(!!value)}
  //       aria-label="Select row"
  //     />
  //   ),
  //   enableSorting: false,
  //   enableHiding: false,
  // },
  {
    accessorKey: "fullName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
        </Button>
      );
    },
    cell: ({ row }) => {
      const name = row.getValue("fullName") as string;
      return <div className="font-medium">{name}</div>;
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
        </Button>
      );
    },
    cell: ({ row }) => {
      const email = row.getValue("email") as string;
      return <div className="text-muted-foreground">{email || "- -"}</div>;
    },
  },
  {
    accessorKey: "phone",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Phone
        </Button>
      );
    },
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string;
      return <div>{phone || "- -"}</div>;
    },
  },
  {
    accessorKey: "gender",
    header: "Gender",
    cell: ({ row }) => {
      const value = row.getValue("gender") as string | null;
      let display = "—";
      let icon = "";
      let variant: "default" | "secondary" | "destructive" | "outline" =
        "outline";

      if (value) {
        switch (value.toLowerCase()) {
          case "male":
          case "m":
            display = "M";
            icon = "♂️";
            variant = "default";
            break;
          case "female":
          case "f":
            display = "F";
            icon = "♀️";
            variant = "secondary";
            break;
          case "nb":
          case "non-binary":
            display = "NB";
            icon = "⚧";
            variant = "outline";
            break;
          default:
            display = "- -";
            icon = "-";
            variant = "outline";
        }
      }

      return (
        <Badge variant={variant} className="font-normal">
          <span aria-label={display} title={display}>
            {icon} {display}
          </span>
        </Badge>
      );
    },
  },
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Title
        </Button>
      );
    },
    cell: ({ row }) => {
      const title = row.getValue("title") as string;
      return <div>{title || "Trainer"}</div>; // Default to "Trainer" if no title is provided
    },
  },
  {
    accessorKey: "registrationDate",
    header: "Registered",
    cell: ({ row }) => {
      const date = row.getValue("registrationDate") as Date | null;

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
    header: "Actions",
    cell: ({ row }) => {
      const coach = row.original;
      return <ActionsCell coachId={coach.userId} />;
    },
    enableSorting: false,
    enableColumnFilter: false,
  },
];

// These functions should be implemented based on your application's needs
function handleEditCoach(coachId: string) {
  console.log(`Editing coach ${coachId}`);
  // Navigate to edit page or open edit modal
}
