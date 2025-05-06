"use client";

import React, { useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Eye, UserX, UserCog, Edit } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { switchClientCoach } from "@/actions/client_actions";
import { toast } from "sonner";

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
    trainerName?: string | null;
};

export type ClientResponse = {
    data: Client[];
    meta: {
        totalRowCount: number;
    };
};

// Function to get initials from a name
function getInitials(name: string): string {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
}

// Component for the Trainer cell with switch functionality
export function TrainerCell({
    coaches,
    trainerName,
    userId,
    setRefreshState,
}: {
    coaches: { userId: string; fullName: string }[];
    trainerName: string | null;
    userId: string;
    setRefreshState: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedCoach, setSelectedCoach] = useState<{
        userId: string;
        fullName: string;
    } | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredCoaches = useMemo(() => {
        return coaches.filter((coach) =>
            coach.fullName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [coaches, searchTerm]);

    const closeDropdown = () => setIsDropdownOpen(false);

    const openDialog = () => setIsDialogOpen(true);
    const closeDialog = () => setIsDialogOpen(false);

    const handleAssignCoach = async () => {
        try {
            if (!selectedCoach) return;

            const result = await switchClientCoach({
                clientId: userId,
                newCoachId: selectedCoach.userId,
            });

            if (result.error) {
                throw new Error(result.error);
            }

            toast.success(`Coach switched to ${selectedCoach.fullName}`);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to switch coach"
            );
        } finally {
            setRefreshState((prevState) => !prevState);
            closeDialog();
            closeDropdown();
        }
    };

    return (
        <div className="flex items-center justify-center gap-2">
            <div className="text-center">{trainerName || "—"}</div>
            <DropdownMenu
                open={isDropdownOpen}
                onOpenChange={setIsDropdownOpen}
            >
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0 flex-shrink-0"
                    >
                        <span className="sr-only">Switch trainer</span>
                        <UserCog className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 p-2">
                    <DropdownMenuLabel>Switch Trainer</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Input
                        placeholder="Search coaches..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mb-2"
                    />
                    <div className="max-h-48 overflow-y-auto">
                        {filteredCoaches.map((coach) => (
                            <div
                                key={coach.userId}
                                className={`cursor-pointer rounded px-2 py-1 hover:bg-gray-200 ${
                                    selectedCoach?.userId === coach.userId
                                        ? "bg-gray-300"
                                        : ""
                                }`}
                                onClick={() => setSelectedCoach(coach)}
                            >
                                {coach.fullName}
                            </div>
                        ))}
                        {filteredCoaches.length === 0 && (
                            <div className="text-sm text-gray-500">
                                No coaches found
                            </div>
                        )}
                    </div>
                    {selectedCoach && (
                        <div className="mt-2 flex justify-end gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCoach(null)}
                            >
                                Cancel
                            </Button>
                            <AlertDialog
                                open={isDialogOpen}
                                onOpenChange={setIsDialogOpen}
                            >
                                <AlertDialogTrigger asChild>
                                    <Button
                                        size="sm"
                                        disabled={!selectedCoach}
                                        onClick={openDialog}
                                    >
                                        Assign
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            Confirm Trainer Change
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to change the
                                            trainer from{" "}
                                            <strong>
                                                {trainerName || "N/A"}
                                            </strong>{" "}
                                            to{" "}
                                            <strong>
                                                {selectedCoach.fullName}
                                            </strong>
                                            ?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>
                                            Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleAssignCoach}
                                        >
                                            Confirm
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

// Component for the Actions cell
function ActionsCell({ userId }: { userId: string }) {
    const handleDeleteUser = () => {
        // TODO: Implement delete user logic, e.g. API call with confirmation
        console.log(`Delete user ${userId}`);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <Link href={`/clients/${userId}`}>
                    <DropdownMenuItem className="cursor-pointer">
                        <Eye className="mr-2 h-4 w-4" /> View Profile
                    </DropdownMenuItem>
                </Link>

                <Link href={`/edit-client?id=${userId}`}>
                    <DropdownMenuItem className="cursor-pointer">
                        <Edit className="mr-2 h-4 w-4" /> Edit Client
                    </DropdownMenuItem>
                </Link>

                <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={handleDeleteUser}
                >
                    <UserX className="mr-2 h-4 w-4" /> Delete User
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// Define which columns can be filtered and sorted with user-friendly labels
export const tableOperations = {
    filterableColumns: [
        { id: "fullName", label: "Full Name" },
        { id: "email", label: "Email" },
        { id: "phone", label: "Phone" },
        { id: "gender", label: "Gender" },
    ],
    sortableColumns: [
        { id: "fullName", label: "Full Name" },
        { id: "email", label: "Email" },
        { id: "phone", label: "Phone" },
        { id: "gender", label: "Gender" },
        { id: "age", label: "Age" },
        { id: "registrationDate", label: "Member Since" },
        { id: "trainerName", label: "Trainer" },
    ],
};

export const columns: ColumnDef<Client>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <div className="flex justify-center">
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
        enableColumnFilter: false,
        size: 40,
    },
    {
        accessorKey: "fullName",
        header: () => <div>Full Name</div>,
        cell: ({ row }) => {
            const value = row.getValue("fullName") as string;
            const imageUrl = row.original.imageUrl;

            return (
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={imageUrl || undefined} alt={value} />
                        <AvatarFallback>{getInitials(value)}</AvatarFallback>
                    </Avatar>
                    <Link
                        href={`/clients/${row.original.userId}`}
                        className="flex items-center gap-2 font-bold underline text-inherit cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 rounded"
                    >
                        {value || "—"}
                    </Link>
                </div>
            );
        },
        size: 250,
    },
    {
        accessorKey: "email",
        header: () => <div>Email</div>,
        cell: ({ row }) => {
            const value = row.getValue("email") as string;
            return <div className="truncate max-w-[200px]">{value || "—"}</div>;
        },
        size: 200,
    },
    {
        accessorKey: "registrationDate",
        header: () => <div>Member Since</div>,
        cell: ({ row }) => {
            const value = row.getValue("registrationDate") as Date;
            return <div className="text-center">{formatDate(value)}</div>;
        },
        enableColumnFilter: false,
        size: 120,
    },
    {
        accessorKey: "phone",
        header: () => <div>Phone</div>,
        cell: ({ row }) => {
            const value = row.getValue("phone") as string;
            return <div className="text-center">{value || "—"}</div>;
        },
        size: 120,
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
                        display = "N/A";
                        icon = "—";
                        variant = "outline";
                }
            }

            return (
                <div className="flex justify-center">
                    <Badge variant={variant} className="font-normal">
                        <span aria-label={display} title={display}>
                            {icon} {display}
                        </span>
                    </Badge>
                </div>
            );
        },
        size: 80,
    },
    {
        accessorKey: "age",
        header: () => <div>Age</div>,
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

            return (
                <div className="text-center">
                    {age !== null && age !== undefined ? age : "—"}
                </div>
            );
        },
        enableColumnFilter: false,
        size: 60,
    },
    {
        accessorKey: "trainerName",
        header: () => <div>Trainer</div>,
        cell: ({ row, table }) => {
            const trainerName = row.getValue("trainerName") as string | null;
            const userId = row.original.userId;
            // Pull coaches from table options to pass to TrainerCell
            const coaches =
                (
                    table.options.meta as {
                        coaches?: { userId: string; fullName: string }[];
                        setRefreshState: React.Dispatch<
                            React.SetStateAction<boolean>
                        >;
                    }
                )?.coaches || [];
            const setRefreshState = (
                table.options.meta as {
                    coaches?: { userId: string; fullName: string }[];
                    setRefreshState: React.Dispatch<
                        React.SetStateAction<boolean>
                    >;
                }
            )?.setRefreshState;
            return (
                <TrainerCell
                    coaches={coaches}
                    trainerName={trainerName}
                    userId={userId}
                    setRefreshState={setRefreshState}
                />
            );
        },
        size: 150,
    },
    {
        id: "actions",
        header: () => <div>Actions</div>,
        cell: ({ row }) => {
            const userId = row.original.userId;
            return (
                <div className="flex justify-center">
                    <ActionsCell userId={userId} />
                </div>
            );
        },
        enableSorting: false,
        enableColumnFilter: false,
        size: 80,
    },
];
