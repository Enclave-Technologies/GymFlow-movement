"use client";

import { useState, useEffect, useRef } from "react";

export function useWorkoutTimer() {
  const [timer, setTimer] = useState("00:00:00");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const isTimerRunningRef = useRef(false);

  // Update ref when state changes
  useEffect(() => {
    isTimerRunningRef.current = isTimerRunning;
  }, [isTimerRunning]);

  // Timer functionality
  useEffect(() => {
    // Start the timer when the hook is initialized
    const sessionStartTime = new Date();
    setStartTime(sessionStartTime);
    setIsTimerRunning(true);

    const timerInterval = setInterval(() => {
      // Use ref to check current timer state
      if (isTimerRunningRef.current) {
        const currentTime = new Date();
        const elapsed = currentTime.getTime() - sessionStartTime.getTime();
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

        setTimer(
          `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        );
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []); // Only run once on mount

  const pauseTimer = () => setIsTimerRunning(false);
  const resumeTimer = () => setIsTimerRunning(true);

  return {
    timer,
    startTime,
    isTimerRunning,
    pauseTimer,
    resumeTimer,
  };
}
