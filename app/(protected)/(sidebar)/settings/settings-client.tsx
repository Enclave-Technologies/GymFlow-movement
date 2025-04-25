"use client";

import {
    get_user_account,
    updateUser,
    updatePassword,
    uploadUserImage,
} from "@/actions/auth_actions";
import React, { useState, useEffect, useRef } from "react";
import { genderEnum } from "@/db/schemas";
import { getAllRoles } from "@/actions/coach_actions";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectItem,
    SelectContent,
    SelectValue,
    SelectTrigger,
} from "@/components/ui/select";
import { Loader, User, Camera, Eye, EyeOff, AlertTriangle } from "lucide-react";

interface UserData {
    userId?: string;
    email?: string;
    fullName?: string;
    phone?: string;
    job_title?: string;
    gender?: string;
    imageUrl?: string;
    registrationDate?: Date;
}

interface RoleOption {
    roleName: string;
    roleId: string;
}

export function SettingsClient() {
    const [accountData, setAccountData] = useState<UserData>({
        email: "",
        fullName: "",
        phone: "",
        job_title: "",
        gender: "",
        imageUrl: "",
    });

    // Track original data to detect changes
    const [originalAccountData, setOriginalAccountData] = useState<UserData>(
        {}
    );
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const [formState, formAction] = React.useActionState(updateUser, null);
    const [passwordFormState, passwordFormAction] = React.useActionState(
        updatePassword,
        null
    );
    const [imageFormState, imageFormAction] = React.useActionState(
        uploadUserImage,
        null
    );
    const [formStatus, setFormStatus] = useState<
        "idle" | "submitting" | "success" | "error"
    >("idle");
    const [passwordFormStatus, setPasswordFormStatus] = useState<
        "idle" | "submitting" | "success" | "error"
    >("idle");
    const [imageUploadStatus, setImageUploadStatus] = useState<
        "idle" | "uploading" | "success" | "error"
    >("idle");

    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [isLoading, setIsLoading] = useState(true);
    const [roles, setRoles] = useState<RoleOption[]>([]);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isPasswordFormValid, setIsPasswordFormValid] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const { currentPassword, newPassword, confirmPassword } = passwordData;
        const isValid =
            currentPassword.length > 0 &&
            newPassword.length > 0 &&
            confirmPassword.length > 0 &&
            newPassword === confirmPassword;

        setIsPasswordFormValid(isValid);
    }, [passwordData]);

    // Show status based on form state
    useEffect(() => {
        if (formState) {
            if (formState.success) {
                setFormStatus("success");
                toast.success(formState.message);
            } else if (formState.message) {
                setFormStatus("error");
                toast.error(formState.message);
            }
        }
    }, [formState]);

    useEffect(() => {
        if (passwordFormState) {
            setPasswordFormStatus("idle");
            if (passwordFormState.success) {
                toast.success(passwordFormState.message);

                setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                });
            } else if (passwordFormState.message) {
                toast.error(passwordFormState.message);
            }
        }
    }, [passwordFormState]);

    useEffect(() => {
        if (imageFormState) {
            if (imageFormState.success) {
                setImageUploadStatus("success");

                toast.success(
                    imageFormState.message || "Image uploaded successfully"
                );

                if (imageFormState.imageUrl) {
                    setAccountData((prev) => ({
                        ...prev,
                        imageUrl: imageFormState.imageUrl,
                    }));
                }
            } else if (imageFormState.message) {
                setImageUploadStatus("error");
                toast.error(imageFormState.message);
            }
        }
    }, [imageFormState]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        const newData = { ...accountData, [name]: value };
        setAccountData(newData);
        checkForChanges(newData);
    };

    const handleSelectChange = (name: string, value: string) => {
        const newData = { ...accountData, [name]: value };
        setAccountData(newData);
        checkForChanges(newData);
    };

    // Function to check if there are unsaved changes
    const checkForChanges = (currentData: UserData) => {
        const hasChanges =
            currentData.fullName !== originalAccountData.fullName ||
            currentData.phone !== originalAccountData.phone ||
            currentData.job_title !== originalAccountData.job_title ||
            currentData.gender !== originalAccountData.gender;

        setHasUnsavedChanges(hasChanges);
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleAccountSubmit = () => {
        setFormStatus("submitting");
        // Form is handled by the server action via formAction
    };

    const handlePasswordSubmit = () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("New passwords don't match");
            return;
        }
        setPasswordFormStatus("submitting");
    };

    const handleImageUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size should be less than 5MB");
            return;
        }

        setImageUploadStatus("uploading");

        try {
            const actionData = new FormData();
            actionData.append("file", file);

            // Use startTransition to properly handle the server action
            React.startTransition(() => {
                imageFormAction(actionData);
            });
        } catch (e) {
            console.error("Error initiating upload:", e);
            setImageUploadStatus("error");
            toast.error("Failed to start upload");
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userData = await get_user_account();

                if (!userData) {
                    throw new Error("Failed to fetch user data");
                }

                const nameParts = userData.fullName?.split(" ") || ["", ""];
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(" ");

                const formattedData = {
                    email: userData.email || "",
                    fullName: userData.fullName || `${firstName} ${lastName}`,
                    phone: userData.phone || "",
                    job_title: userData.job_title || "",
                    gender: userData.gender || "",
                    imageUrl: userData.imageUrl || "",
                };

                setAccountData(formattedData);
                setOriginalAccountData(formattedData);

                // Fetch roles
                try {
                    const rolesResponse = await getAllRoles();
                    setRoles(rolesResponse);
                } catch (roleError) {
                    return roleError;
                }

                setIsLoading(false);
            } catch (error) {
                setIsLoading(false);
                return error;
            }
        };

        fetchUserData();
    }, []);

    const firstName = accountData.fullName?.split(" ")[0] || "";
    const lastName = accountData.fullName?.split(" ").slice(1).join(" ") || "";

    // Convert gender enum for display options
    const genderOptions = Object.values(genderEnum.enumValues).map((value) => ({
        value,
        label:
            value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, " "),
    }));

    return (
        <div className="py-8 px-10">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold">Settings</h1>
                {hasUnsavedChanges && (
                    <div className="flex items-center text-yellow-600">
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        <span className="font-medium">
                            You have unsaved changes
                        </span>
                    </div>
                )}
            </div>
            <p className="text-gray-600 mb-8">
                Update your photo and personal details here
            </p>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader className="h-12 w-12 animate-spin text-green-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-semibold mb-4">
                            Account Settings
                        </h2>

                        <div className="mb-8">
                            <div
                                className="relative w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-4 cursor-pointer group"
                                onClick={triggerFileInput}
                            >
                                {accountData.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={accountData.imageUrl}
                                        alt="Profile"
                                        className="w-full h-full object-cover rounded-full"
                                    />
                                ) : (
                                    <User className="h-16 w-16 text-gray-500" />
                                )}
                                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-50 transition-opacity">
                                    <Camera className="h-8 w-8 text-white" />
                                </div>
                                {imageUploadStatus === "uploading" && (
                                    <div className="absolute inset-0 backdrop-blur-xs rounded-full flex items-center justify-center">
                                        <Loader className="h-8 w-8 animate-spin text-green-500" />
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                        </div>

                        <form
                            className="space-y-6"
                            action={formAction}
                            onSubmit={handleAccountSubmit}
                        >
                            <div className="space-y-3">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={accountData.email}
                                    onChange={handleInputChange}
                                    placeholder="Email"
                                    readOnly
                                />
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={firstName}
                                    onChange={(e) => {
                                        const newFirstName = e.target.value;
                                        setAccountData((prev) => ({
                                            ...prev,
                                            fullName: `${newFirstName} ${lastName}`,
                                        }));
                                    }}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={lastName}
                                    onChange={(e) => {
                                        const newLastName = e.target.value;
                                        setAccountData((prev) => ({
                                            ...prev,
                                            fullName: `${firstName} ${newLastName}`,
                                        }));
                                    }}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="job_title">Role</Label>
                                <Select
                                    value={accountData.job_title}
                                    onValueChange={(value) =>
                                        handleSelectChange("job_title", value)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem
                                                key={role.roleId}
                                                value={role.roleName}
                                            >
                                                {role.roleName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={accountData.phone}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="gender">Gender</Label>
                                <Select
                                    value={accountData.gender}
                                    onValueChange={(value) =>
                                        handleSelectChange("gender", value)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {genderOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <input
                                type="hidden"
                                name="fullName"
                                value={`${firstName} ${lastName}`}
                            />

                            <button
                                type="submit"
                                disabled={formStatus === "submitting"}
                                className={`px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                                    formStatus === "submitting"
                                        ? "opacity-70 cursor-not-allowed"
                                        : "cursor-pointer"
                                }`}
                            >
                                {formStatus === "submitting"
                                    ? "Please wait..."
                                    : "Submit"}
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <h2 className="text-xl font-semibold mb-4">
                            Change Password
                        </h2>

                        <form
                            className="space-y-6"
                            action={passwordFormAction}
                            onSubmit={handlePasswordSubmit}
                        >
                            <div className="relative space-y-3">
                                <Label htmlFor="currentPassword">
                                    Current Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        type={
                                            showCurrentPassword
                                                ? "text"
                                                : "password"
                                        }
                                        id="currentPassword"
                                        name="currentPassword"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordChange}
                                    />
                                    <button
                                        type="button"
                                        className="absolute top-1/2 right-0 -translate-y-1/2 flex items-center justify-center pr-3 h-full"
                                        onClick={() =>
                                            setShowCurrentPassword(
                                                !showCurrentPassword
                                            )
                                        }
                                        aria-label="Toggle password visibility"
                                    >
                                        {showCurrentPassword ? (
                                            <EyeOff className="h-5 w-5 text-gray-500" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-gray-500" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="relative space-y-3">
                                <Label htmlFor="newPassword">
                                    New Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        type={
                                            showNewPassword
                                                ? "text"
                                                : "password"
                                        }
                                        id="newPassword"
                                        name="newPassword"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordChange}
                                    />
                                    <button
                                        type="button"
                                        className="absolute top-1/2 right-0 -translate-y-1/2 flex items-center justify-center pr-3 h-full"
                                        onClick={() =>
                                            setShowNewPassword(!showNewPassword)
                                        }
                                        aria-label="Toggle password visibility"
                                    >
                                        {showNewPassword ? (
                                            <EyeOff className="h-5 w-5 text-gray-500" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-gray-500" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="relative space-y-3">
                                <Label htmlFor="confirmPassword">
                                    Re-enter New Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        type={
                                            showConfirmPassword
                                                ? "text"
                                                : "password"
                                        }
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordChange}
                                    />
                                    <button
                                        type="button"
                                        className="absolute top-1/2 right-0 -translate-y-1/2 flex items-center justify-center pr-3 h-full"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                !showConfirmPassword
                                            )
                                        }
                                        aria-label="Toggle password visibility"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-5 w-5 text-gray-500" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-gray-500" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={
                                    !isPasswordFormValid ||
                                    passwordFormStatus === "submitting"
                                }
                                className={`w-full px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                                    isPasswordFormValid &&
                                    passwordFormStatus !== "submitting"
                                        ? "cursor-pointer"
                                        : "opacity-70 cursor-not-allowed"
                                }`}
                            >
                                {passwordFormStatus === "submitting"
                                    ? "Please wait..."
                                    : "Confirm New Password"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
