"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCoachesPaginated } from "@/actions/coach_actions";
import { getClientById, addRoleToUser } from "@/actions/client_actions";
import { updateClient, createClient } from "@/actions/client_actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

type Coach = {
    userId: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    imageUrl: string | null;
    notes: string | null;
    gender: "male" | "female" | "non-binary" | "prefer-not-to-say" | null;
    approved: boolean | null;
    registrationDate: Date;
    role?: string;
    trainerId: string;
    dob: string;
};

export default function AddClientForm() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const userId = searchParams.get("id");
    const isEdit = !!userId;
    const [activeTab, setActiveTab] = useState("new");

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phoneNumber: "",
        coachNotes: "",
        gender: "",
        dateOfBirth: undefined as Date | undefined,
        trainerId: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
    });

    // Form for existing user
    const [existingUserForm, setExistingUserForm] = useState({
        email: "",
        trainerId: "", // Added trainer selection for existing users
    });

    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loading, setLoading] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(isEdit);
    const [isLoadingCoaches, setIsLoadingCoaches] = useState(true);

    useEffect(() => {
        const fetchCoaches = async () => {
            setIsLoadingCoaches(true);
            try {
                const coachesData = await getCoachesPaginated({
                    pageIndex: 0,
                    pageSize: 1000,
                    search: "",
                });

                console.log("Coaches data:", coachesData);

                const coachesWithRole = coachesData.data.map((coach) => ({
                    ...coach,
                    role: "Trainer",
                })) as Coach[];

                console.log("Coaches with role:", coachesWithRole);

                setCoaches(coachesWithRole);
            } catch (error) {
                console.error("Error fetching coaches:", error);
                toast.error("Failed to load coaches");
            } finally {
                setIsLoadingCoaches(false);
            }
        };

        fetchCoaches();

        if (isEdit) {
            const fetchUserData = async () => {
                setIsLoadingData(true);
                try {
                    const response = await getClientById(userId);

                    const userData = response;
                    setFormData({
                        fullName: userData.fullName || "",
                        email: userData.email || "",
                        phoneNumber: userData.phone || "",
                        coachNotes: userData.notes || "",
                        gender: userData.gender || "",
                        dateOfBirth: userData.dob
                            ? new Date(userData.dob)
                            : undefined,
                        trainerId: userData.trainerId || "",
                        emergencyContactName:
                            userData.emergencyContactName || "",
                        emergencyContactPhone:
                            userData.emergencyContactPhone || "",
                    });
                } catch (error) {
                    console.error("Error fetching user:", error);
                    toast.error("Failed to load user data");
                } finally {
                    setIsLoadingData(false);
                }
            };

            fetchUserData();
        }
    }, [userId, isEdit]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleExistingUserChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const { name, value } = e.target;
        setExistingUserForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleExistingUserSelectChange = (name: string, value: string) => {
        setExistingUserForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (date: Date | undefined) => {
        setFormData((prev) => ({ ...prev, dateOfBirth: date }));
    };

    const handleNewClientSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Split fullName into firstName and lastName for the backend
            const nameParts = formData.fullName.trim().split(/\s+/);
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";

            const clientData = {
                firstName,
                lastName,
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                coachNotes: formData.coachNotes,
                gender: formData.gender,
                dateOfBirth: formData.dateOfBirth,
                trainerId: formData.trainerId,
                emergencyContactName: formData.emergencyContactName,
                emergencyContactPhone: formData.emergencyContactPhone,
            };

            let response;

            if (isEdit && userId) {
                response = await updateClient(userId, clientData);
            } else {
                response = await createClient(clientData);
            }

            if (!response.success) {
                throw new Error(response.error || "Failed to save client");
            }

            toast.success(
                isEdit
                    ? "Client updated successfully"
                    : "Client added successfully"
            );

            router.push("/my-clients");
        } catch (error) {
            console.error("Error saving client:", error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to save client data"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleExistingUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Add Client role to the existing user
            const roleResult = await addRoleToUser(
                existingUserForm.email,
                "Client"
            );

            if (!roleResult.success) {
                throw new Error(
                    roleResult.error || "Failed to add Client role to user"
                );
            }

            // 2. If trainer is selected, create a client-trainer relationship
            if (existingUserForm.trainerId) {
                // Use the createClient function to establish the trainer relationship
                // We only need to pass the email and trainerId
                const clientResult = await createClient({
                    email: existingUserForm.email,
                    trainerId: existingUserForm.trainerId,
                });

                if (!clientResult.success) {
                    throw new Error(
                        clientResult.error ||
                            "Failed to associate client with trainer"
                    );
                }
            }

            toast.success("Client role added successfully");
            router.push("/my-clients");
        } catch (error) {
            console.error("Error adding client role:", error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to add client role"
            );
        } finally {
            setLoading(false);
        }
    };

    // Helper function to get initials from name
    const getInitials = (fullName: string) => {
        if (!fullName) return "";
        const nameParts = fullName.split(" ");
        if (nameParts.length >= 2) {
            return `${nameParts[0].charAt(0)}${nameParts[1].charAt(
                0
            )}`.toUpperCase();
        }
        return fullName.charAt(0).toUpperCase();
    };

    // Find the selected coach name for display
    const selectedCoach = coaches.find(
        (coach) => coach.userId === formData.trainerId
    );
    const selectedCoachName = selectedCoach ? selectedCoach.fullName : "";

    // Find the selected coach for existing user form
    const selectedExistingCoach = coaches.find(
        (coach) => coach.userId === existingUserForm.trainerId
    );
    const selectedExistingCoachName = selectedExistingCoach
        ? selectedExistingCoach.fullName
        : "";

    // Add loading state UI
    if (isLoadingData) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
                <div className="space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-32 w-full" />
                </div>
                <div className="flex justify-end space-x-4">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
            >
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="new">New Client</TabsTrigger>
                    <TabsTrigger value="existing">Existing User</TabsTrigger>
                </TabsList>

                <TabsContent value="new">
                    <Card>
                        <CardContent className="pt-6">
                            <form
                                onSubmit={handleNewClientSubmit}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3 md:col-span-2">
                                        <Label htmlFor="fullName">
                                            Full Name *
                                        </Label>
                                        <Input
                                            id="fullName"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            required
                                            placeholder="Full Name"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="Email"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="phoneNumber">
                                            Phone Number *
                                        </Label>
                                        <Input
                                            id="phoneNumber"
                                            name="phoneNumber"
                                            value={formData.phoneNumber}
                                            onChange={handleChange}
                                            required
                                            placeholder="Phone Number"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="gender">Gender *</Label>
                                        <Select
                                            value={formData.gender}
                                            onValueChange={(value) =>
                                                handleSelectChange(
                                                    "gender",
                                                    value
                                                )
                                            }
                                            required
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">
                                                    Male
                                                </SelectItem>
                                                <SelectItem value="female">
                                                    Female
                                                </SelectItem>
                                                <SelectItem value="non-binary">
                                                    Non-binary
                                                </SelectItem>
                                                <SelectItem value="prefer-not-to-say">
                                                    Prefer not to say
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="dateOfBirth">
                                            Date of Birth *
                                        </Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !formData.dateOfBirth &&
                                                            "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {formData.dateOfBirth ? (
                                                        format(
                                                            formData.dateOfBirth,
                                                            "PPP"
                                                        )
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-auto p-0"
                                                align="start"
                                            >
                                                <Calendar
                                                    mode="single"
                                                    selected={
                                                        formData.dateOfBirth
                                                    }
                                                    onSelect={handleDateChange}
                                                    initialFocus
                                                    captionLayout="dropdown-buttons"
                                                    fromYear={1920}
                                                    toYear={new Date().getFullYear()}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="space-y-3 w-full">
                                        <Label htmlFor="trainerId">
                                            Select Trainer *
                                        </Label>
                                        <Select
                                            value={formData.trainerId}
                                            onValueChange={(value) =>
                                                handleSelectChange(
                                                    "trainerId",
                                                    value
                                                )
                                            }
                                            required
                                            disabled={isLoadingCoaches}
                                        >
                                            <SelectTrigger className="w-full">
                                                {isLoadingCoaches ? (
                                                    <span className="text-muted-foreground">
                                                        Loading trainers...
                                                    </span>
                                                ) : (
                                                    <SelectValue placeholder="Select...">
                                                        {selectedCoachName}
                                                    </SelectValue>
                                                )}
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60">
                                                {coaches.map((coach) => (
                                                    <SelectItem
                                                        key={coach.userId}
                                                        value={coach.userId}
                                                        className="py-3 px-4"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage
                                                                    src={
                                                                        coach.imageUrl ||
                                                                        ""
                                                                    }
                                                                    alt={
                                                                        coach.fullName
                                                                    }
                                                                />
                                                                <AvatarFallback>
                                                                    {getInitials(
                                                                        coach.fullName
                                                                    )}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="text-sm font-medium">
                                                                    {
                                                                        coach.fullName
                                                                    }
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {coach.role ||
                                                                        "Trainer"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="emergencyContactName">
                                            Emergency Contact Name
                                        </Label>
                                        <Input
                                            id="emergencyContactName"
                                            name="emergencyContactName"
                                            value={
                                                formData.emergencyContactName
                                            }
                                            onChange={handleChange}
                                            placeholder="Emergency Contact Name"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="emergencyContactPhone">
                                            Emergency Contact Phone
                                        </Label>
                                        <Input
                                            id="emergencyContactPhone"
                                            name="emergencyContactPhone"
                                            value={
                                                formData.emergencyContactPhone
                                            }
                                            onChange={handleChange}
                                            placeholder="Emergency Contact Phone"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="coachNotes">
                                        Coach&apos;s Notes
                                    </Label>
                                    <Textarea
                                        id="coachNotes"
                                        name="coachNotes"
                                        value={formData.coachNotes}
                                        onChange={handleChange}
                                        placeholder="Enter notes about this client"
                                        rows={5}
                                    />
                                </div>

                                <div className="flex justify-end space-x-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.back()}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={loading}>
                                        {loading
                                            ? "Please wait..."
                                            : "Add Client"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="existing">
                    <Card>
                        <CardContent className="pt-6">
                            <form
                                onSubmit={handleExistingUserSubmit}
                                className="space-y-6"
                            >
                                <div className="space-y-3">
                                    <Label htmlFor="existingEmail">
                                        Email of Existing User *
                                    </Label>
                                    <Input
                                        id="existingEmail"
                                        name="email"
                                        type="email"
                                        value={existingUserForm.email}
                                        onChange={handleExistingUserChange}
                                        required
                                        placeholder="Enter email of existing user"
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        The user must already exist in the
                                        system and have authentication enabled.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="existingTrainerId">
                                        Select Trainer *
                                    </Label>
                                    <Select
                                        value={existingUserForm.trainerId}
                                        onValueChange={(value) =>
                                            handleExistingUserSelectChange(
                                                "trainerId",
                                                value
                                            )
                                        }
                                        required
                                        disabled={isLoadingCoaches}
                                    >
                                        <SelectTrigger className="w-full">
                                            {isLoadingCoaches ? (
                                                <span className="text-muted-foreground">
                                                    Loading trainers...
                                                </span>
                                            ) : (
                                                <SelectValue placeholder="Select...">
                                                    {selectedExistingCoachName}
                                                </SelectValue>
                                            )}
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            {coaches.map((coach) => (
                                                <SelectItem
                                                    key={coach.userId}
                                                    value={coach.userId}
                                                    className="py-3 px-4"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage
                                                                src={
                                                                    coach.imageUrl ||
                                                                    ""
                                                                }
                                                                alt={
                                                                    coach.fullName
                                                                }
                                                            />
                                                            <AvatarFallback>
                                                                {getInitials(
                                                                    coach.fullName
                                                                )}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                {coach.fullName}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {coach.role ||
                                                                    "Trainer"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex justify-end space-x-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.back()}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={loading}>
                                        {loading
                                            ? "Please wait..."
                                            : "Add Client Role"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
