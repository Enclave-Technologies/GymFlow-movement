import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date | string | null): string {
    if (!date) return "—";

    const d = typeof date === "string" ? new Date(date) : date;

    // Check if date is valid
    if (isNaN(d.getTime())) return "Invalid date";

    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

/**
 * Get initials from a name string
 * @param name - The full name string
 * @returns The initials (e.g., "JD" for "John Doe")
 */
export function getInitials(name: string | null | undefined): string {
    if (!name) return "?";
    const words = name.trim().split(/\s+/);
    if (words.length === 0) return "?";
    if (words.length === 1) return words[0][0]?.toUpperCase() || "?";
    return (
        (words[0][0]?.toUpperCase() || "") + (words[1][0]?.toUpperCase() || "")
    );
}

/**
 * Safely prepare image URLs by trimming whitespace and handling null/undefined values
 */
export function safeImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    return trimmed === "" ? null : trimmed;
}
