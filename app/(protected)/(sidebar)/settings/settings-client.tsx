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

        toast.success(imageFormState.message || "Image uploaded successfully");

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
    setAccountData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setAccountData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

        setAccountData({
          email: userData.email || "",
          fullName: userData.fullName || `${firstName} ${lastName}`,
          phone: userData.phone || "",
          job_title: userData.job_title || "",
          gender: userData.gender || "",
          imageUrl: userData.imageUrl || "",
        });

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
    label: value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, " "),
  }));

  return (
    <div className="py-8 px-10">
      <h1 className="text-3xl font-bold mb-4">Settings</h1>
      <p className="text-gray-600 mb-8">
        Update your photo and personal details here
      </p>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold mb-4">Account Settings</h2>

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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-50 transition-opacity">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                {imageUploadStatus === "uploading" && (
                  <div className="absolute inset-0 backdrop-blur-xs rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
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
                      <SelectItem key={role.roleId} value={role.roleName}>
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
                  onValueChange={(value) => handleSelectChange("gender", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
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
                {formStatus === "submitting" ? "Please wait..." : "Submit"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-xl font-semibold mb-4">Change Password</h2>

            <form
              className="space-y-6"
              action={passwordFormAction}
              onSubmit={handlePasswordSubmit}
            >
              <div className="relative space-y-3">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showCurrentPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="relative space-y-3">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showNewPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="relative space-y-3">
                <Label htmlFor="confirmPassword">Re-enter New Password</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showConfirmPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  !isPasswordFormValid || passwordFormStatus === "submitting"
                }
                className={`w-full px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                  isPasswordFormValid && passwordFormStatus !== "submitting"
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
