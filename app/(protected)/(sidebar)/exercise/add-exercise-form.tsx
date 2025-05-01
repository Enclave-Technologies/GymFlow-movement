"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectExercise } from "@/db/schemas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createExercise, updateExercise } from "@/actions/exercise_actions";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const getUniqueMotions = (
  exercisesList: SelectExercise[] = [],
  currentMotion?: string | null
): string[] => {
  if (!exercisesList || !Array.isArray(exercisesList))
    return currentMotion ? [currentMotion] : [];

  const motions = exercisesList
    .map((ex) => ex.motion)
    .filter(
      (motion): motion is string => motion !== null && motion !== undefined
    );

  // Include current motion if it exists and isn't already in the list
  if (currentMotion && !motions.includes(currentMotion)) {
    motions.push(currentMotion);
  }

  return [...new Set(motions)].sort();
};

const getUniqueTargetAreas = (
  exercisesList: SelectExercise[] = [],
  currentTargetArea?: string | null
): string[] => {
  if (!exercisesList || !Array.isArray(exercisesList))
    return currentTargetArea ? [currentTargetArea] : [];

  const targetAreas = exercisesList
    .map((ex) => ex.targetArea)
    .filter((area): area is string => area !== null && area !== undefined);

  // Include current target area if it exists and isn't already in the list
  if (currentTargetArea && !targetAreas.includes(currentTargetArea)) {
    targetAreas.push(currentTargetArea);
  }

  return [...new Set(targetAreas)].sort();
};

type UploadResult = {
  successCount: number;
  duplicates: string[];
};

export default function AddExerciseForm({
  exercises,
  userId,
  existingExercise,
}: {
  exercises: SelectExercise[];
  userId: string;
  existingExercise?: SelectExercise | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const exerciseMotionOptions = getUniqueMotions(
    exercises,
    existingExercise?.motion
  );
  const exerciseTargetAreaOptions = getUniqueTargetAreas(
    exercises,
    existingExercise?.targetArea
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult>({
    successCount: 0,
    duplicates: [],
  });
  const [csvContent, setCsvContent] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    exerciseName: existingExercise?.exerciseName || "",
    description: existingExercise?.description || "",
    videoUrl: existingExercise?.videoUrl || "",
    motion: existingExercise?.motion || "",
    targetArea: existingExercise?.targetArea || "",
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

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;

      if (existingExercise) {
        result = await updateExercise(existingExercise.exerciseId, {
          ...formData,
          uploadedByUserId: userId,
        });
      } else {
        result = await createExercise({
          ...formData,
          uploadedByUserId: userId,
        });
      }

      if (!result.success) {
        throw new Error(result.error || "Failed to save exercise");
      }

      toast.success(
        existingExercise
          ? "Exercise updated successfully"
          : "Exercise created successfully"
      );
      // Invalidate the exercise library query cache to ensure fresh data is fetched
      queryClient.invalidateQueries({ queryKey: ["tableData"] });
      
      router.push("/exercise-library");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save exercise"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const CSV_HEADER_MAPPING = {
    "Exercise Name": "exerciseName",
    Description: "description",
    "Motion Type": "motion",
    "Target Area": "targetArea",
    "Video URL": "videoUrl",
  } as const;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      try {
        const text = await file.text();
        setCsvContent(text);
      } catch {
        toast.error("Error reading file");
        setUploadedFile(null);
        setCsvContent(null);
      }
    }
  };

  const handleUploadCSV = async () => {
    if (!csvContent) {
      toast.error("Please select a CSV file first");
      return;
    }

    setIsLoading(true);

    try {
      const rows = csvContent.split("\n");

      // Check if file is empty or has only headers
      if (rows.length <= 1) {
        toast.error("The CSV file is empty");
        return;
      }

      const headers = rows[0].split(",");

      // Validate headers
      const requiredHeaders = ["Exercise Name"];
      const missingHeaders = requiredHeaders.filter(
        (required) => !headers.some((h) => h.trim() === required)
      );

      if (missingHeaders.length > 0) {
        toast.error(`Missing required headers: ${missingHeaders.join(", ")}`);
        return;
      }

      // Map readable headers to our field names
      const mappedHeaders = headers.map(
        (header) =>
          CSV_HEADER_MAPPING[
            header.trim() as keyof typeof CSV_HEADER_MAPPING
          ] || header
      );

      // Process the data and check for duplicates
      const exercisesToCreate = rows
        .slice(1)
        .filter((row) => row.trim())
        .map((row) => {
          const values = row.split(",");
          const exerciseData = mappedHeaders.reduce((obj, header, index) => {
            obj[header] = values[index]?.trim() || "";
            return obj;
          }, {} as Record<string, string>);

          return {
            exerciseName: exerciseData.exerciseName || "",
            description: exerciseData.description,
            videoUrl: exerciseData.videoUrl,
            motion: exerciseData.motion,
            targetArea: exerciseData.targetArea,
            uploadedByUserId: userId,
          };
        })
        .filter((exercise) => exercise.exerciseName);

      // Check if we have any valid exercises after filtering
      if (exercisesToCreate.length === 0) {
        toast.error("No valid exercises found in the CSV file");
        return;
      }

      // Check for duplicates in recent exercises
      const duplicates = exercisesToCreate
        .filter((newEx) =>
          exercises.some(
            (ex) =>
              ex.exerciseName.toLowerCase() === newEx.exerciseName.toLowerCase()
          )
        )
        .map((ex) => ex.exerciseName);

      const uniqueExercises = exercisesToCreate.filter(
        (newEx) =>
          !exercises.some(
            (ex) =>
              ex.exerciseName.toLowerCase() === newEx.exerciseName.toLowerCase()
          )
      );

      if (uniqueExercises.length > 0) {
        const result = await createExercise(uniqueExercises);
        if (!result.success) {
          throw new Error(result.error || "Failed to create exercises");
        }
      }

      if (duplicates.length > 0) {
        // Show modal for duplicates
        setUploadResult({
          successCount: uniqueExercises.length,
          duplicates,
        });
        setShowResultsDialog(true);
      } else {
        // All exercises created successfully
        toast.success(
          `Successfully created ${uniqueExercises.length} exercises`
        );
        // Invalidate the exercise library query cache to ensure fresh data is fetched
        queryClient.invalidateQueries({ queryKey: ["tableData"] });
        
        router.push("/exercise-library");
        router.refresh();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error processing CSV"
      );
      setUploadedFile(null);
      setCsvContent(null);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const templateUrl = "/templates/exercise-template.csv";
    const link = document.createElement("a");
    link.href = templateUrl;
    link.download = "exercise-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {existingExercise ? "Edit Exercise" : "Add New Exercise"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="exerciseName">Exercise Name</Label>
              <Input
                id="exerciseName"
                name="exerciseName"
                value={formData.exerciseName}
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
                <Select
                  value={formData.motion}
                  onValueChange={(value) => handleSelectChange("motion", value)}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Motion" />
                  </SelectTrigger>
                  <SelectContent>
                    {exerciseMotionOptions.length > 0 ? (
                      exerciseMotionOptions.map((opt: string) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-motions" disabled>
                        No motions available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetArea">Target Area</Label>
                <Select
                  value={formData.targetArea}
                  onValueChange={(value) =>
                    handleSelectChange("targetArea", value)
                  }
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Target Area" />
                  </SelectTrigger>
                  <SelectContent>
                    {exerciseTargetAreaOptions.length > 0 ? (
                      exerciseTargetAreaOptions.map((opt: string) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-target-areas" disabled>
                        No target areas available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
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

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => router.push("/exercise-library")}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="cursor-pointer"
              >
                {isLoading
                  ? "Please wait..."
                  : existingExercise
                  ? "Update"
                  : "Submit"}
              </Button>
            </div>
          </form>

          {!existingExercise && (
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    OR
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-upload"
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor="csv-upload"
                    className="cursor-pointer block transition-colors"
                  >
                    {uploadedFile ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground font-bold">
                          Selected file: {uploadedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground underline">
                          Change file
                        </p>

                        <Button
                          onClick={handleUploadCSV}
                          disabled={isLoading}
                          className="cursor-pointer mt-4"
                        >
                          {isLoading ? "Please wait..." : "Upload CSV"}
                        </Button>
                      </div>
                    ) : (
                      "Drop CSV file here"
                    )}
                  </Label>
                </div>
                <div className="mt-2 text-end">
                  <Button
                    variant="link"
                    className="text-xs text-muted-foreground cursor-pointer font-bold"
                    onClick={downloadSampleCSV}
                    disabled={isLoading}
                  >
                    Download Sample CSV
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Results</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="mb-4">
                  {uploadResult.successCount} exercises were created
                  successfully.
                </p>
                <p className="mb-2">
                  The following exercises ({uploadResult.duplicates.length})
                  were not uploaded because they already exist:
                </p>
                <ul className="list-disc pl-6">
                  {uploadResult.duplicates.map((name, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setShowResultsDialog(false);
                    // Invalidate the exercise library query cache to ensure fresh data is fetched
                    queryClient.invalidateQueries({ queryKey: ["tableData"] });
                    
                    router.push("/exercise-library");
                    router.refresh();
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
