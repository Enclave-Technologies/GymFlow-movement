"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { XCircle, LogOut, Loader2 } from "lucide-react";

interface QuitWorkoutDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onQuitWithoutSaving: () => void;
    onEndWorkout: () => void;
    isQuittingWithoutSaving?: boolean;
    isEndingWorkout?: boolean;
}

export function QuitWorkoutDialog({
    isOpen,
    onClose,
    onQuitWithoutSaving,
    onEndWorkout,
    isQuittingWithoutSaving = false,
    isEndingWorkout = false,
}: QuitWorkoutDialogProps) {
    const isAnyOperationInProgress = isQuittingWithoutSaving || isEndingWorkout;
    return (
        <Dialog
            open={isOpen}
            onOpenChange={isAnyOperationInProgress ? undefined : onClose}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>End Workout Session</DialogTitle>
                    <DialogDescription>
                        What would you like to do with your current workout
                        session?
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 mt-4">
                    <Button
                        variant="destructive"
                        onClick={onQuitWithoutSaving}
                        className="w-full"
                        disabled={isAnyOperationInProgress}
                    >
                        {isQuittingWithoutSaving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                        )}
                        {isQuittingWithoutSaving
                            ? "Quitting..."
                            : "Quit Without Saving"}
                    </Button>
                    <Button
                        onClick={onEndWorkout}
                        className="w-full"
                        disabled={isAnyOperationInProgress}
                    >
                        {isEndingWorkout ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <LogOut className="h-4 w-4 mr-2" />
                        )}
                        {isEndingWorkout
                            ? "Saving & Ending..."
                            : "End & Save Workout"}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full"
                        disabled={isAnyOperationInProgress}
                    >
                        Continue Workout
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
