"use client";

import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
// import { AlertCircle } from "lucide-react";
// import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    updateUser,
    updatePassword,
    uploadUserImage,
} from "@/actions/auth_actions";
import { toast } from "sonner";

import { ProfileSettings } from "./profile-settings";
import { PasswordSettings } from "./password-settings";
import { PasswordVerificationDialog } from "./password-verification-dialog";
import {
    settingsFormSchema,
    passwordFormSchema,
    passwordVerificationSchema,
    SettingsFormValues,
    PasswordFormValues,
    PasswordVerificationValues,
} from "./settings-schemas";

interface SettingsFormProps {
    user: {
        userId: string;
        fullName: string;
        email: string;
        phone?: string | null;
        gender?: string | null;
        imageUrl?: string | null;
        jobTitle?: string | null;
    };
}

export function SettingsForm({ user: initialUser }: SettingsFormProps) {
    // We don't need isMobile anymore since we're using Tailwind's responsive classes

    // State for tracking unsaved changes and current user data
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<FormData | null>(
        null
    );
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(
        initialUser.imageUrl || null
    );
    const [isUploading, setIsUploading] = useState(false);

    // Keep track of the current user data (will be updated after successful form submission)
    const [user, setUser] = useState(initialUser);

    // Main settings form
    const settingsForm = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsFormSchema),
        defaultValues: {
            fullName: user.fullName || "",
            email: user.email || "",
            phone: user.phone || "",
            gender:
                (user.gender as
                    | "male"
                    | "female"
                    | "non-binary"
                    | "prefer-not-to-say"
                    | undefined) || undefined,
            jobTitle: user.jobTitle || "",
        },
    });

    // Password change form
    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    // Password verification form
    const passwordVerificationForm = useForm<PasswordVerificationValues>({
        resolver: zodResolver(passwordVerificationSchema),
        defaultValues: {
            password: "",
        },
    });

    // Track unsaved changes in the main form
    useEffect(() => {
        const subscription = settingsForm.watch(() => {
            // Only set hasUnsavedChanges to true if the form values are different from the current user values
            const currentValues = settingsForm.getValues();
            const hasChanges =
                currentValues.fullName !== user.fullName ||
                currentValues.email !== user.email ||
                currentValues.phone !== user.phone ||
                currentValues.gender !== user.gender ||
                currentValues.jobTitle !== user.jobTitle ||
                imageFile !== null; // Also check if an image has been selected

            setHasUnsavedChanges(hasChanges);
        });
        return () => subscription.unsubscribe();
    }, [settingsForm, user, imageFile]);

    // Reset form when user data changes
    useEffect(() => {
        settingsForm.reset({
            fullName: user.fullName || "",
            email: user.email || "",
            phone: user.phone || "",
            gender:
                (user.gender as
                    | "male"
                    | "female"
                    | "non-binary"
                    | "prefer-not-to-say"
                    | undefined) || undefined,
            jobTitle: user.jobTitle || "",
        });
    }, [user, settingsForm]);

    // Handle image upload
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setHasUnsavedChanges(true);

            // Create a preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle main settings form submission
    const onSettingsSubmit = async (data: SettingsFormValues) => {
        const formData = new FormData();
        // formData.append("fullName", data.fullName);
        // formData.append("email", data.email);
        // if (data.phone) formData.append("phone", data.phone);
        // if (data.gender) formData.append("gender", data.gender);
        // if (data.jobTitle) formData.append("job_title", data.jobTitle);

        if (data.fullName !== user.fullName) {
            formData.append("fullName", data.fullName);
        }
        if (data.email !== user.email) {
            formData.append("email", data.email);
        }
        if (data.phone !== user.phone && data.phone) {
            formData.append("phone", data.phone);
        }
        if (data.gender !== user.gender && data.gender) {
            formData.append("gender", data.gender);
        }
        if (data.jobTitle !== user.jobTitle && data.jobTitle) {
            formData.append("job_title", data.jobTitle);
        }

        setPendingFormData(formData);

        // Only open password verification dialog if email is changed
        const isEmailChanged = data.email !== user.email;
        if (isEmailChanged) {
            setIsPasswordDialogOpen(true);
        } else {
            // If email is not changed, submit the form directly without password verification
            await handleFormSubmit(formData);
        }
    };

    // Handle form submission (with or without password)
    const handleFormSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        try {
            const result = await updateUser(null, formData);

            if (result.success) {
                // If we have an image file, upload it
                if (imageFile) {
                    await handleImageUpload();
                }

                toast.success("Settings updated", {
                    description:
                        "Your settings have been updated successfully.",
                });

                // Create updated user object
                const updatedUser = {
                    ...user,
                    fullName:
                        (formData.get("fullName") as string) || user.fullName,
                    email: (formData.get("email") as string) || user.email,
                    phone: (formData.get("phone") as string) || user.phone,
                    gender:
                        (formData.get("gender") as
                            | "male"
                            | "female"
                            | "non-binary"
                            | "prefer-not-to-say"
                            | undefined) || user.gender,
                    jobTitle:
                        (formData.get("job_title") as string) || user.jobTitle,
                };

                // Update the user state with the new values
                setUser(updatedUser);

                // Update the form's default values to match the new values
                const updatedValues = {
                    fullName: updatedUser.fullName || "",
                    email: updatedUser.email || "",
                    phone: updatedUser.phone || "",
                    gender:
                        (updatedUser.gender as
                            | "male"
                            | "female"
                            | "non-binary"
                            | "prefer-not-to-say"
                            | undefined) || undefined,
                    jobTitle: updatedUser.jobTitle || "",
                };

                // Reset the form with the new values
                settingsForm.reset(updatedValues, {
                    keepIsSubmitted: false,
                    keepErrors: false,
                    keepDirty: false,
                    keepValues: false,
                    keepDefaultValues: false,
                });

                // Reset the imageFile state to null
                setImageFile(null);

                // Set hasUnsavedChanges to false
                setHasUnsavedChanges(false);
            } else {
                toast.error("Error", {
                    description: result.message || "Failed to update settings.",
                });
            }
        } catch {
            toast.error("Error", {
                description: "An unexpected error occurred.",
            });
        } finally {
            setIsSubmitting(false);
            setPendingFormData(null);
        }
    };

    // Handle password verification
    const onPasswordVerify = async (data: PasswordVerificationValues) => {
        if (!pendingFormData) return;

        try {
            // Add the password to the form data for verification
            pendingFormData.append("password", data.password);

            // Submit the form with the password
            await handleFormSubmit(pendingFormData);
        } finally {
            setIsPasswordDialogOpen(false);
            // Reset the password verification form
            passwordVerificationForm.reset();
        }
    };

    // Handle image upload
    const handleImageUpload = async () => {
        if (!imageFile) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", imageFile);

            const result = await uploadUserImage(null, formData);

            if (result.success) {
                toast.success("Image uploaded", {
                    description: "Your profile image has been updated.",
                });
                // Update the image preview and user state with the new URL
                if (result.imageUrl) {
                    setImagePreview(result.imageUrl);
                    setUser({
                        ...user,
                        imageUrl: result.imageUrl,
                    });
                }

                // Reset the unsaved changes flag after successful image upload
                setHasUnsavedChanges(false);
            } else {
                toast.error("Error", {
                    description: result.message || "Failed to upload image.",
                });
            }
        } catch {
            toast.error("Error", {
                description:
                    "An unexpected error occurred while uploading the image.",
            });
        } finally {
            setIsUploading(false);
            setImageFile(null);
        }
    };

    // Handle password change form submission
    const onPasswordSubmit = async (data: PasswordFormValues) => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("currentPassword", data.currentPassword);
            formData.append("newPassword", data.newPassword);

            const result = await updatePassword(null, formData);

            if (result.success) {
                toast.success("Password updated", {
                    description: "Your password has been updated successfully.",
                });
                passwordForm.reset();
            } else {
                toast.error("Error", {
                    description: result.message || "Failed to update password.",
                });
            }
        } catch {
            toast.error("Error", {
                description: "An unexpected error occurred.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Unsaved changes alert */}
            {hasUnsavedChanges && (
                // <Alert className="bg-amber-50 border-amber-200">
                //     <AlertCircle className="h-4 w-4 text-amber-600" />
                //     <AlertDescription className="text-amber-800">
                //         You have unsaved changes. Don&apos;t forget to save your
                //         settings.
                //     </AlertDescription>
                // </Alert>
                <div className="flex items-center text-sm text-muted-foreground">
                    <span className="ml-2 text-yellow-600 font-medium">
                        * You have unsaved changes
                    </span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Primary Column - User Settings */}
                <div className="md:col-span-2">
                    <ProfileSettings
                        user={user}
                        form={settingsForm}
                        isSubmitting={isSubmitting}
                        hasUnsavedChanges={hasUnsavedChanges}
                        imagePreview={imagePreview}
                        isUploading={isUploading}
                        onImageChange={handleImageChange}
                        onSettingsSubmit={onSettingsSubmit}
                    />
                </div>

                {/* Secondary Column - Password Change */}
                <div>
                    <PasswordSettings
                        form={passwordForm}
                        isSubmitting={isSubmitting}
                        onSubmit={onPasswordSubmit}
                    />
                </div>
            </div>

            {/* Password Verification Dialog */}
            <PasswordVerificationDialog
                isOpen={isPasswordDialogOpen}
                onOpenChange={setIsPasswordDialogOpen}
                form={passwordVerificationForm}
                isSubmitting={isSubmitting}
                onSubmit={onPasswordVerify}
            />
        </div>
    );
}
