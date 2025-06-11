"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { XCircle, LogOut } from "lucide-react";

interface QuitWorkoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onQuitWithoutSaving: () => void;
  onEndWorkout: () => void;
}

export function QuitWorkoutDialog({
  isOpen,
  onClose,
  onQuitWithoutSaving,
  onEndWorkout,
}: QuitWorkoutDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>End Workout Session</DialogTitle>
          <DialogDescription>
            What would you like to do with your current workout session?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button
            variant="destructive"
            onClick={onQuitWithoutSaving}
            className="w-full"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Quit Without Saving
          </Button>
          <Button onClick={onEndWorkout} className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            End & Save Workout
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full">
            Continue Workout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
