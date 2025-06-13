"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, X, History, User } from "lucide-react";

interface Exercise {
    setOrderMarker?: string;
    name: string;
}

interface WorkoutHeaderProps {
    clientName: string;
    clientImage?: string;
    phaseName: string;
    sessionName: string;
    exercises: Exercise[];
    timer: string;
    showPastWorkouts: boolean;
    pastSessionsCount: number;
    saveStatus: "idle" | "saving" | "saved" | "error";
    pendingOperations: number;
    onExit: () => void;
    onTogglePastWorkouts: () => void;
}

export function WorkoutHeader({
    clientName,
    clientImage,
    phaseName,
    sessionName,
    exercises,
    timer,
    showPastWorkouts,
    pastSessionsCount,
    saveStatus,
    pendingOperations,
    onExit,
    onTogglePastWorkouts,
}: WorkoutHeaderProps) {
    const getStatusMessage = () => {
        if (pendingOperations > 0) {
            return `* ${pendingOperations} unsaved changes`;
        }
        switch (saveStatus) {
            case "saving":
                return "Saving...";
            case "saved":
                return "Saved successfully";
            case "error":
                return "Save failed - retrying...";
            default:
                return "";
        }
    };

    const getStatusColor = () => {
        if (pendingOperations > 0) return "text-yellow-500";
        switch (saveStatus) {
            case "saving":
                return "text-blue-500";
            case "saved":
                return "text-green-500";
            case "error":
                return "text-red-500";
            default:
                return "text-muted-foreground";
        }
    };
    return (
        <header className="bg-card border-b border-border">
            {/* Top row - Controls and Timer */}
            <div className="flex justify-between items-center p-4 gap-4">
                {/* Left side - Exit button */}
                <div className="flex items-center">
                    <Button
                        variant="destructive"
                        size="lg"
                        className="h-10 px-4"
                        onClick={onExit}
                    >
                        <X className="h-5 w-5 mr-2" /> Exit
                    </Button>
                </div>

                {/* Center - Client Info Section */}
                <div className="flex items-center gap-3 flex-1 justify-center">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={clientImage} alt={clientName} />
                        <AvatarFallback>
                            <User className="h-6 w-6" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                        <div className="text-sm text-muted-foreground font-medium">
                            {clientName}
                        </div>
                        <h1 className="text-lg font-bold">{phaseName}</h1>
                        <h2 className="text-md text-muted-foreground">
                            {sessionName}
                        </h2>
                    </div>
                </div>

                {/* Right side - Timer and action buttons */}
                <div className="flex items-center gap-3">
                    <div className="text-xl font-bold flex items-center">
                        <Clock className="h-5 w-5 mr-2" />
                        {timer}
                    </div>

                    <div className="flex gap-2">
                        {pastSessionsCount > 0 && (
                            <Button
                                variant="outline"
                                size="lg"
                                className="h-10 px-4"
                                onClick={onTogglePastWorkouts}
                            >
                                <History className="h-5 w-5 mr-2" />
                                <span className="hidden sm:inline">
                                    {showPastWorkouts
                                        ? "Hide History"
                                        : "Show History"}
                                </span>
                                <span className="sm:hidden">
                                    {showPastWorkouts ? "Hide" : "History"}
                                </span>
                            </Button>
                        )}
                        {/* Save button removed - using auto-save instead */}
                    </div>
                </div>
            </div>

            {/* Exercise List Preview */}
            <div className="px-4 pb-3">
                <div className="text-sm text-muted-foreground mb-2">
                    Exercises:
                </div>
                <div className="flex flex-wrap gap-2">
                    {exercises.map((exercise, index) => (
                        <span
                            key={index}
                            className="text-xs bg-muted px-2 py-1 rounded-md"
                        >
                            {exercise.setOrderMarker}. {exercise.name}
                        </span>
                    ))}
                </div>
            </div>

            {/* Save Status */}
            {getStatusMessage() && (
                <div className="px-4 pb-2">
                    <div className={`text-sm ${getStatusColor()}`}>
                        {getStatusMessage()}
                    </div>
                </div>
            )}
        </header>
    );
}
