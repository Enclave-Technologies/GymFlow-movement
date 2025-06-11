"use client";

import React from "react";
import { CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type QueueStatus =
    | "idle"
    | "queued"
    | "processing"
    | "success"
    | "error";

interface QueueStatusIndicatorProps {
    status: QueueStatus;
    message?: string;
    className?: string;
    showText?: boolean;
}

const statusConfig = {
    idle: {
        icon: null,
        color: "text-muted-foreground",
        bgColor: "bg-muted",
        text: "Ready",
        animate: false,
    },
    queued: {
        icon: Clock,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        text: "Queued",
        animate: false,
    },
    processing: {
        icon: Loader2,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        text: "Processing",
        animate: true,
    },
    success: {
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-50",
        text: "Saved",
        animate: false,
    },
    error: {
        icon: AlertCircle,
        color: "text-red-600",
        bgColor: "bg-red-50",
        text: "Error",
        animate: false,
    },
};

export function QueueStatusIndicator({
    status,
    message,
    className,
    showText = true,
}: QueueStatusIndicatorProps) {
    const config = statusConfig[status];
    const Icon = config.icon;

    if (status === "idle" && !showText) {
        return null;
    }

    return (
        <div
            className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                config.bgColor,
                config.color,
                className
            )}
        >
            {Icon && (
                <Icon
                    className={cn("h-3 w-3", config.animate && "animate-spin")}
                />
            )}
            {showText && <span>{message || config.text}</span>}
        </div>
    );
}

// Hook for managing queue status
export function useQueueStatus(initialStatus: QueueStatus = "idle") {
    const [status, setStatus] = React.useState<QueueStatus>(initialStatus);
    const [message, setMessage] = React.useState<string>("");

    const updateStatus = React.useCallback(
        (newStatus: QueueStatus, newMessage?: string) => {
            setStatus(newStatus);
            if (newMessage !== undefined) {
                setMessage(newMessage);
            }
        },
        []
    );

    const reset = React.useCallback(() => {
        setStatus("idle");
        setMessage("");
    }, []);

    return {
        status,
        message,
        updateStatus,
        reset,
    };
}
