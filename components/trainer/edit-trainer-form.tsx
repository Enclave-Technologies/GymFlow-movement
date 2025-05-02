"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { getCoachById, updateCoach } from "@/actions/coach_actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PasswordVerificationDialog } from "@/components/settings/password-verification-dialog";
import { passwordVerificationSchema } from "@/components/settings/settings-schemas";
import type { PasswordVerificationValues } from "@/components/settings/settings-schemas";

export default function EditTrainerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trainerId = searchParams.get("id");

  // Form for new user
  const [newUserForm, setNewUserForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    gender: "",
    dateOfBirth: undefined as Date | undefined,
    jobTitle: "Trainer",
    role: "Trainer",
    address: "",
  });

  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [originalTrainerData, setOriginalTrainerData] = useState<{
    email: string;
  } | null>(null);

  const formFields = Array(8).fill(null);

  // Password verification form
  const passwordVerificationForm = useForm<PasswordVerificationValues>({
    resolver: zodResolver(passwordVerificationSchema),
    defaultValues: {
      password: "",
    },
  });

  useEffect(() => {
    async function fetchTrainerData() {
      if (!trainerId) {
        setIsFetching(false);
        return;
      }

      try {
        setIsFetching(true);
        const trainerData = await getCoachById(trainerId);

        if (!trainerData) {
          toast.error("Trainer not found");
          return;
        }

        // Store original email for comparison
        setOriginalTrainerData({
          email: trainerData.email || "",
        });

        setNewUserForm({
          fullName: trainerData.fullName || "",
          email: trainerData.email || "",
          phoneNumber: trainerData.phone || "",
          gender: trainerData.gender || "",
          dateOfBirth: trainerData.registrationDate
            ? new Date(trainerData.registrationDate)
            : undefined,
          jobTitle: trainerData.job_title || "Trainer",
          role: "Trainer",
          address: trainerData.address || "",
        });
      } catch (error) {
        console.error("Error fetching trainer data:", error);
        toast.error("Failed to load trainer data");
      } finally {
        setIsFetching(false);
      }
    }

    fetchTrainerData();
  }, [trainerId]);

  const handleNewUserChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewUserForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewUserSelectChange = (name: string, value: string) => {
    setNewUserForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setNewUserForm((prev) => ({ ...prev, dateOfBirth: date }));
  };

  const handleNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerId || !originalTrainerData) return;

    // Check if email is being changed
    const isEmailChanged = newUserForm.email !== originalTrainerData.email;
    if (isEmailChanged) {
      setIsPasswordDialogOpen(true);
      return;
    }

    await handleFormSubmit(newUserForm);
  };

  const handleFormSubmit = async (
    formData: typeof newUserForm,
    password?: string
  ) => {
    if (!trainerId) return;

    try {
      setLoading(true);
      const result = await updateCoach(trainerId, {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        gender: formData.gender as
          | "male"
          | "female"
          | "non-binary"
          | "prefer-not-to-say",
        jobTitle: formData.jobTitle,
        address: formData.address,
        password, // Only passed when email is changed
      });

      if (result.success) {
        toast.success("Trainer updated successfully");
        router.push("/coaches");
      } else {
        toast.error(result.error || "Failed to update trainer");
      }
    } catch (error) {
      toast.error("An error occurred while updating the trainer");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle password verification
  const onPasswordVerify = async (data: PasswordVerificationValues) => {
    try {
      await handleFormSubmit(newUserForm, data.password);
    } finally {
      setIsPasswordDialogOpen(false);
      passwordVerificationForm.reset();
    }
  };

  if (isFetching) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {formFields.map((_, index) => (
                <div key={index} className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">
          {trainerId ? "Edit Trainer" : "Add New Trainer"}
        </h2>
        <form onSubmit={handleNewUserSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                name="fullName"
                value={newUserForm.fullName}
                onChange={handleNewUserChange}
                required
                placeholder="Full Name"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={newUserForm.email}
                onChange={handleNewUserChange}
                required
                placeholder="Email"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={newUserForm.role}
                onValueChange={(value) =>
                  handleNewUserSelectChange("role", value)
                }
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Trainer">Trainer</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                value={newUserForm.phoneNumber}
                onChange={handleNewUserChange}
                placeholder="Phone Number"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={newUserForm.gender}
                onValueChange={(value) =>
                  handleNewUserSelectChange("gender", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non-binary">Non-binary</SelectItem>
                  <SelectItem value="prefer-not-to-say">
                    Prefer not to say
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newUserForm.dateOfBirth && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newUserForm.dateOfBirth ? (
                      format(newUserForm.dateOfBirth, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newUserForm.dateOfBirth}
                    onSelect={handleDateChange}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={1920}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                name="jobTitle"
                value={newUserForm.jobTitle}
                onChange={handleNewUserChange}
                placeholder="Job Title"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={newUserForm.address}
                onChange={handleNewUserChange}
                placeholder="Address"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
              className="cursor-pointer"
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading} className="cursor-pointer">
              {loading ? "Please wait..." : `Edit ${newUserForm.role}`}
            </Button>
          </div>
        </form>
      </div>

      {/* Password Verification Dialog */}
      <PasswordVerificationDialog
        isOpen={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        form={passwordVerificationForm}
        isSubmitting={loading}
        onSubmit={onPasswordVerify}
      />
    </div>
  );
}
