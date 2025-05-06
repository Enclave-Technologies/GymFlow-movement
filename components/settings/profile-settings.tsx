"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Camera } from "lucide-react";
import { genderEnum } from "@/db/schemas";
import { SettingsFormValues } from "./settings-schemas";

interface ProfileSettingsProps {
    user: {
        userId: string;
        fullName: string;
        email: string;
        phone?: string | null;
        gender?: string | null;
        imageUrl?: string | null;
        jobTitle?: string | null;
    };
    form: ReturnType<typeof useForm<SettingsFormValues>>;
    isSubmitting: boolean;
    hasUnsavedChanges: boolean;
    imagePreview: string | null;
    isUploading: boolean;
    onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSettingsSubmit: (data: SettingsFormValues) => Promise<void>;
}

export function ProfileSettings({
    user,
    form,
    isSubmitting,
    hasUnsavedChanges,
    imagePreview,
    isUploading,
    onImageChange,
    onSettingsSubmit,
}: ProfileSettingsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSettingsSubmit)}
                        className="space-y-6"
                    >
                        {/* Profile Image */}
                        <div className="mb-6 relative w-24">
                            <Avatar className="h-24 w-24">
                                <AvatarImage
                                    src={imagePreview || undefined}
                                    alt={user.fullName}
                                />
                                <AvatarFallback>
                                    {user.fullName
                                        .substring(0, 2)
                                        .toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <label
                                htmlFor="profile-image"
                                className="cursor-pointer absolute inset-0 flex items-center justify-center"
                            >
                                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="text-white text-center">
                                        {isUploading ? (
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                                        ) : (
                                            <Camera className="h-8 w-8 mx-auto" />
                                        )}
                                    </div>
                                </div>
                            </label>
                            <input
                                id="profile-image"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={onImageChange}
                                disabled={isUploading}
                            />
                        </div>

                        {/* Full Name */}
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Your full name"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Job Title */}
                        <FormField
                            control={form.control}
                            name="jobTitle"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Job Title</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Your job title"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Gender */}
                        <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Gender</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select your gender" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {genderEnum.enumValues.map(
                                                (gender) => (
                                                    <SelectItem
                                                        key={gender}
                                                        value={gender}
                                                    >
                                                        {gender
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                            gender
                                                                .slice(1)
                                                                .replace(
                                                                    /-/g,
                                                                    " "
                                                                )}
                                                    </SelectItem>
                                                )
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Phone Number */}
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone Number</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Your phone number"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Email */}
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Your email address"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex items-center justify-between">
                            <Button
                                type="submit"
                                disabled={isSubmitting || !hasUnsavedChanges}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </Button>
                            {/* Unsaved changes alert */}
                            {hasUnsavedChanges && (
                                <div className="text-sm text-yellow-600 font-medium ml-4">
                                    * You have unsaved changes
                                </div>
                            )}
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
