"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { formatDate } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Eye, UserX } from "lucide-react";

// Define the client type to match what comes from the database
export type Client = {
    userId: string;
    fullName: string;
    email: string | null;
    registrationDate: Date;
    phone: string | null;
    gender: string | null;
    assignedDate: Date;
    notes: string | null;
    imageUrl: string | null;
    relationshipId: string;
    idealWeight?: number | null;
    dob?: Date | null;
    age?: number | null;
};

// Component for the Actions cell
function ActionsCell({ userId }: { userId: string }) {
    const handleViewProfile = () => {
        // TODO: Implement view profile logic, e.g. navigate to profile page
        console.log(`View profile for user ${userId}`);
    };

    const handleDeleteUser = () => {
        // TODO: Implement delete user logic, e.g. API call with confirmation
        console.log(`Delete user ${userId}`);
    };

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
                <DropdownMenuItem onClick={handleViewProfile}>
                    <Eye className="mr-2 h-4 w-4" /> View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteUser}>
                    <UserX className="mr-2 h-4 w-4" /> Delete User
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export const columns: ColumnDef<Client>[] = [
    {
        accessorKey: "fullName",
        header: "Name",
        cell: ({ row }) => {
            const value = row.getValue("fullName") as string;
            return <div className="font-medium">{value || "- -"}</div>;
        },
    },
    {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => {
            const value = row.getValue("email") as string;
            return <div>{value || "- -"}</div>;
        },
    },
    {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => {
            const value = row.getValue("phone") as string;
            return <div>{value || "- -"}</div>;
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
                        display = "N/A";
                        icon = "—";
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
        accessorKey: "age",
        header: "Age",
        cell: ({ row }) => {
            const value = row.getValue("age") as number | null;
            const dob = row.original.dob;

            // Calculate age if it's not provided but dob is available
            let age = value;
            if (age === undefined && dob) {
                const today = new Date();
                const birthDate = new Date(dob);
                age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (
                    m < 0 ||
                    (m === 0 && today.getDate() < birthDate.getDate())
                ) {
                    age--;
                }
            }

            return <div>{age !== null && age !== undefined ? age : "—"}</div>;
        },
    },
    {
        accessorKey: "registrationDate",
        header: "Registered",
        cell: ({ row }) => {
            const value = row.getValue("registrationDate") as Date;
            return <div>{formatDate(value)}</div>;
        },
    },
    {
        accessorKey: "assignedDate",
        header: "Assigned",
        cell: ({ row }) => {
            const value = row.getValue("assignedDate") as Date;
            return <div>{formatDate(value)}</div>;
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const userId = row.original.userId;
            return <ActionsCell userId={userId} />;
        },
    },
];
