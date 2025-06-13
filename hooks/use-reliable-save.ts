"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
    logWorkoutSet,
    updateWorkoutSet,
    deleteWorkoutSet,
} from "@/actions/workout_tracker_actions";

interface SaveOperation {
    id: string;
    type: "create" | "update" | "delete";
    exerciseId: string;
    setId: string;
    data: {
        exerciseName: string;
        setNumber: number;
        reps: number;
        weight: number;
        notes?: string;
        setOrderMarker?: string;
    };
    timestamp: number;
    retryCount: number;
}

interface UseReliableSaveProps {
    workoutSessionLogId: string | null;
    onSaveSuccess?: (operation: SaveOperation) => void;
    onSaveError?: (operation: SaveOperation, error: Error) => void;
}

export function useReliableSave({
    workoutSessionLogId,
    onSaveSuccess,
    onSaveError,
}: UseReliableSaveProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<
        "idle" | "saving" | "saved" | "error"
    >("idle");
    const [pendingOperations, setPendingOperations] = useState<SaveOperation[]>(
        []
    );

    const saveQueueRef = useRef<SaveOperation[]>([]);
    const isProcessingRef = useRef(false);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const processQueueRef = useRef<() => void>(() => {});

    // Local storage key for offline backup
    const localStorageKey = `workout-backup-${workoutSessionLogId}`;

    // Save to local storage for offline support
    const saveToLocalStorage = useCallback(
        (operations: SaveOperation[]) => {
            if (!workoutSessionLogId) return;

            try {
                localStorage.setItem(
                    localStorageKey,
                    JSON.stringify({
                        operations,
                        timestamp: Date.now(),
                        sessionId: workoutSessionLogId,
                    })
                );
            } catch (error) {
                console.error("Failed to save to localStorage:", error);
            }
        },
        [localStorageKey, workoutSessionLogId]
    );

    // Schedule retry with exponential backoff
    const scheduleRetry = useCallback(() => {
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
        }

        const delay = Math.min(
            1000 * Math.pow(2, saveQueueRef.current[0]?.retryCount || 0),
            30000
        );

        retryTimeoutRef.current = setTimeout(() => {
            // Use ref to avoid stale closure and circular dependency issues
            processQueueRef.current();
        }, delay);
    }, []);

    // Process the save queue
    const processQueue = useCallback(async () => {
        if (
            isProcessingRef.current ||
            saveQueueRef.current.length === 0 ||
            !workoutSessionLogId
        ) {
            return;
        }

        isProcessingRef.current = true;
        setIsSaving(true);
        setSaveStatus("saving");

        const operations = [...saveQueueRef.current];
        const successfulOperations: SaveOperation[] = [];
        const failedOperations: SaveOperation[] = [];

        for (const operation of operations) {
            try {
                switch (operation.type) {
                    case "create":
                        await logWorkoutSet(
                            workoutSessionLogId,
                            operation.data.exerciseName,
                            operation.data.setNumber,
                            operation.data.reps,
                            operation.data.weight,
                            operation.data.notes,
                            operation.data.setOrderMarker
                        );
                        break;

                    case "update":
                        await updateWorkoutSet(operation.setId, {
                            reps: operation.data.reps,
                            weight: operation.data.weight,
                            coachNote: operation.data.notes,
                        });
                        break;

                    case "delete":
                        await deleteWorkoutSet(operation.setId);
                        break;
                }

                successfulOperations.push(operation);
                onSaveSuccess?.(operation);
            } catch (error) {
                console.error(
                    `Failed to process ${operation.type} operation:`,
                    error
                );

                // Increment retry count
                const updatedOperation = {
                    ...operation,
                    retryCount: operation.retryCount + 1,
                };

                // Only retry up to 3 times
                if (updatedOperation.retryCount < 3) {
                    failedOperations.push(updatedOperation);
                } else {
                    console.error(
                        "Max retries reached for operation:",
                        operation
                    );
                    onSaveError?.(operation, error as Error);
                }
            }
        }

        // Update the queue with failed operations
        saveQueueRef.current = failedOperations;
        setPendingOperations(failedOperations);

        // Update local storage
        saveToLocalStorage(failedOperations);

        // Update status
        if (failedOperations.length === 0) {
            setSaveStatus("saved");
            // Clear localStorage on successful save
            try {
                localStorage.removeItem(localStorageKey);
            } catch (error) {
                console.error("Failed to clear localStorage:", error);
            }
        } else {
            setSaveStatus("error");
            // Schedule retry for failed operations
            scheduleRetry();
        }

        setIsSaving(false);
        isProcessingRef.current = false;

        // Show appropriate toast
        if (successfulOperations.length > 0) {
            toast.success(`Saved ${successfulOperations.length} changes`);
        }
        if (failedOperations.length > 0) {
            toast.error(
                `${failedOperations.length} changes failed to save. Retrying...`
            );
        }
    }, [
        workoutSessionLogId,
        onSaveSuccess,
        onSaveError,
        saveToLocalStorage,
        localStorageKey,
        scheduleRetry,
    ]);

    // Update the ref whenever processQueue changes
    useEffect(() => {
        processQueueRef.current = processQueue;
    }, [processQueue]);

    // Load from local storage on mount
    useEffect(() => {
        if (!workoutSessionLogId) return;

        try {
            const stored = localStorage.getItem(localStorageKey);
            if (stored) {
                const { operations } = JSON.parse(stored);
                if (operations && operations.length > 0) {
                    setPendingOperations(operations);
                    saveQueueRef.current = [...operations];
                    // Auto-process pending operations (use ref to avoid dependency loop)
                    processQueueRef.current();
                }
            }
        } catch (error) {
            console.error("Failed to load from localStorage:", error);
        }
    }, [workoutSessionLogId, localStorageKey]); // Removed processQueue dependency

    // Add operation to queue
    const queueOperation = useCallback(
        (operation: Omit<SaveOperation, "timestamp" | "retryCount">) => {
            const fullOperation: SaveOperation = {
                ...operation,
                timestamp: Date.now(),
                retryCount: 0,
            };

            saveQueueRef.current.push(fullOperation);
            setPendingOperations((prev) => [...prev, fullOperation]);

            // Save to localStorage immediately
            saveToLocalStorage([...saveQueueRef.current]);

            // Process queue
            processQueue();
        },
        [saveToLocalStorage, processQueue]
    );

    // Manual save trigger
    const saveNow = useCallback(() => {
        processQueue();
    }, [processQueue]);

    // Clear all pending operations (for testing/debugging)
    const clearPending = useCallback(() => {
        saveQueueRef.current = [];
        setPendingOperations([]);
        try {
            localStorage.removeItem(localStorageKey);
        } catch (error) {
            console.error("Failed to clear localStorage:", error);
        }
    }, [localStorageKey]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, []);

    return {
        isSaving,
        saveStatus,
        pendingOperations: pendingOperations.length,
        queueOperation,
        saveNow,
        clearPending,
    };
}
