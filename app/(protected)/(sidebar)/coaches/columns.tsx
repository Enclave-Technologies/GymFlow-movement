"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, MoreHorizontal, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";

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

// Define the response type for the coaches API
export type CoachResponse = {
  data: Coach[];
  meta: {
    totalRowCount: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
    hasMore?: boolean;
  };
};

// Create a separate client component for the actions cell
const ActionsCell = ({ coachId }: { coachId: string }) => {
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
            href={`/coach/${coachId}`}
            className="flex items-center gap-2 cursor-pointer"
            prefetch={false}
          >
            <User className="mr-2 h-4 w-4" />
            <span>View Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Link
            href={`/edit-trainer?id=${coachId}`}
            className="flex items-center gap-2 cursor-pointer"
            prefetch={false}
          >
            <Edit className="mr-2 h-4 w-4" />
            <span>Edit Profile</span>
          </Link>
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
    { id: "title", label: "Title" },
  ],
  sortableColumns: [
    { id: "fullName", label: "Name" },
    { id: "email", label: "Email" },
    { id: "phone", label: "Phone" },
    { id: "gender", label: "Gender" },
    { id: "title", label: "Title" },
    { id: "registrationDate", label: "Registered" },
  ],
};

export const columns: ColumnDef<Coach>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="h-4 w-4"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="h-4 w-4"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
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
      const coach = row.original;
      return (
        <Link
          href={`/coach/${coach.userId}`}
          className="flex items-center gap-2 font-bold underline text-inherit cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 rounded"
          title="View Profile"
          prefetch={false}
        >
          {coach.imageUrl ? (
            <Image
              src={coach.imageUrl}
              alt={name}
              className="h-8 w-8 rounded-full object-cover"
              width={32}
              height={32}
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-sm font-semibold text-gray-700">
              {name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .toUpperCase()
                .substring(0, 2)}
            </div>
          )}
          {name}
        </Link>
      );
    },
    size: 250,
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
      return <div className="truncate max-w-[200px]">{email || "—"}</div>;
    },
    size: 200,
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
      return <div className="text-center">{phone || "—"}</div>;
    },
    size: 150,
  },
  {
    accessorKey: "gender",
    header: () => <div>Gender</div>,
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
    size: 120,
  },
  {
    accessorKey: "registrationDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Registered
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.getValue("registrationDate") as Date;
      return (
        <div className="text-center">
          {date ? new Date(date).toLocaleDateString() : "—"}
        </div>
      );
    },
    size: 150,
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
    size: 60,
  },
];
