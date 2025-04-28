"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AddExercisePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    motion: "", // previously difficulty
    targetArea: "", // previously muscleGroup
    equipmentRequired: "",
    videoUrl: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add API call to save exercise
    console.log("Form submitted:", formData);
    router.push("/exercise-library");
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Exercise</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Exercise Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter exercise name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the exercise"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="motion">Motion Type</Label>
                <Input
                  id="motion"
                  name="motion"
                  value={formData.motion}
                  onChange={handleChange}
                  placeholder="e.g., Push, Pull, Squat"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetArea">Target Area</Label>
                <Input
                  id="targetArea"
                  name="targetArea"
                  value={formData.targetArea}
                  onChange={handleChange}
                  placeholder="e.g., Chest, Back, Legs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="equipmentRequired">Equipment Required</Label>
                <Input
                  id="equipmentRequired"
                  name="equipmentRequired"
                  value={formData.equipmentRequired}
                  onChange={handleChange}
                  placeholder="e.g., Barbell, Dumbbells"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL</Label>
                <Input
                  id="videoUrl"
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleChange}
                  placeholder="Enter video URL"
                  type="url"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/exercise-library")}
              >
                Cancel
              </Button>
              <Button type="submit">Save Exercise</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
