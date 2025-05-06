"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
import { addRoleToUser, registerInternalUser } from "@/actions/client_actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export default function AddTrainerForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("new");

  // Form for new user
  const [newUserForm, setNewUserForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    gender: "",
    dateOfBirth: undefined as Date | undefined,
    jobTitle: "Trainer",
    role: "Trainer", // Default role
    address: "", // Added address field
  });

  // Form for existing user
  const [existingUserForm, setExistingUserForm] = useState({
    email: "",
    role: "Trainer", // Default role
  });

  const [loading, setLoading] = useState(false);

  const handleNewUserChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewUserForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleExistingUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setExistingUserForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewUserSelectChange = (name: string, value: string) => {
    setNewUserForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleExistingUserSelectChange = (name: string, value: string) => {
    setExistingUserForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setNewUserForm((prev) => ({ ...prev, dateOfBirth: date }));
  };

  const handleNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Register new user with our internal function
      const result = await registerInternalUser({
        fullName: newUserForm.fullName,
        email: newUserForm.email,
        phoneNumber: newUserForm.phoneNumber,
        gender: newUserForm.gender as
          | "male"
          | "female"
          | "non-binary"
          | "prefer-not-to-say",
        dateOfBirth: newUserForm.dateOfBirth,
        jobTitle: newUserForm.jobTitle,
        role: newUserForm.role,
        address: newUserForm.address, // Added address field
      });

      if (!result.success) {
        throw new Error(
          result.error || `Failed to register ${newUserForm.role}`
        );
      }

      toast.success(`User created with ${newUserForm.role} role successfully`);
      router.push("/coaches");
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create user"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExistingUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Add the selected role to existing user
      const result = await addRoleToUser(
        existingUserForm.email,
        existingUserForm.role
      );

      if (!result.success) {
        throw new Error(
          result.error || `Failed to add ${existingUserForm.role} role`
        );
      }

      toast.success(`${existingUserForm.role} role added successfully`);
      router.push("/coaches");
    } catch (error) {
      console.error("Error adding role:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add role"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new">New Trainer</TabsTrigger>
          <TabsTrigger value="existing">Existing User</TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <Card>
            <CardContent className="pt-6">
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
                    <p className="text-sm text-muted-foreground">
                      Default password will be set to &quot;<i>password</i>
                      &quot;
                    </p>
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
                        <SelectItem value="Guest">Guest</SelectItem>
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
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Please wait..." : `Create ${newUserForm.role}`}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="existing">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleExistingUserSubmit} className="space-y-6">
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
                    The user must already exist in the system and have
                    authentication enabled.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="existingRole">Role *</Label>
                  <Select
                    value={existingUserForm.role}
                    onValueChange={(value) =>
                      handleExistingUserSelectChange("role", value)
                    }
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Trainer">Trainer</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Guest">Guest</SelectItem>
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
                      : `Add ${existingUserForm.role} Role`}
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
