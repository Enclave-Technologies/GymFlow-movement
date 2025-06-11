"use client";

import { Button } from "@/components/ui/button";
import { Clock, X, History, Save } from "lucide-react";

interface WorkoutHeaderProps {
  phaseName: string;
  sessionName: string;
  timer: string;
  showPastWorkouts: boolean;
  pastSessionsCount: number;
  isSaving: boolean;
  onExit: () => void;
  onTogglePastWorkouts: () => void;
  onSave: () => void;
}

export function WorkoutHeader({
  phaseName,
  sessionName,
  timer,
  showPastWorkouts,
  pastSessionsCount,
  isSaving,
  onExit,
  onTogglePastWorkouts,
  onSave,
}: WorkoutHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-center p-4 bg-card border-b border-border gap-3">
      <div className="flex items-center w-full sm:w-auto justify-between sm:justify-start">
        <Button
          variant="outline"
          className="cursor-pointer border-border hover:bg-muted"
          onClick={onExit}
        >
          <X className="h-4 w-4 mr-2" /> Exit
        </Button>

        <div className="flex sm:hidden">
          <div className="text-xl font-bold flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            {timer}
          </div>
        </div>
      </div>

      <div className="text-center">
        <h1 className="text-xl font-bold">{phaseName}</h1>
        <h2 className="text-lg">{sessionName}</h2>
        <div className="text-xl hidden sm:block">{timer}</div>
      </div>

      <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
        {pastSessionsCount > 0 && (
          <Button
            variant="outline"
            className="text-foreground border-border hover:bg-muted cursor-pointer"
            onClick={onTogglePastWorkouts}
          >
            <History className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">
              {showPastWorkouts ? "Hide History" : "Show History"}
            </span>
            <span className="sm:hidden">
              {showPastWorkouts ? "Hide" : "History"}
            </span>
          </Button>
        )}
        <Button
          variant="outline"
          className="text-foreground border-border hover:bg-muted cursor-pointer"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <div className="h-4 w-4 mr-2 rounded-full border-2 border-foreground border-t-transparent animate-spin"></div>
              <span className="hidden sm:inline">Please wait...</span>
              <span className="sm:hidden">Wait...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Save</span>
              <span className="sm:hidden">Save</span>
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
