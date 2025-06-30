import React from "react";
import { cn } from "@/lib/utils";

interface LinkifiedTextProps {
    text: string;
    className?: string;
    linkClassName?: string;
    fallback?: string;
}

/**
 * Component that automatically detects URLs in text and renders them as clickable links
 *
 * Supported URL formats:
 * - https://www.example.com
 * - http://example.com
 * - www.example.com (will be prefixed with https://)
 * - example.com (will be prefixed with https://)
 * - URLs with paths: https://docs.google.com/spreadsheets/d/1234/edit
 * - URLs with query params: https://youtube.com/watch?v=abc123
 * - Complex URLs: https://app.example.com/edit-client?id=b16c7ec4-23da-4a17-aae7-9d35f9edc0a9
 * - URLs with fragments: https://example.com/page#section
 * - URLs with ports: https://localhost:3000/path
 *
 * @example
 * <LinkifiedText text="Check out https://www.youtube.com/watch?v=abc123 for videos" />
 * <LinkifiedText text="Edit at https://app.example.com/edit?id=123&tab=settings" />
 * <LinkifiedText text="Visit our docs at docs.google.com/spreadsheet" />
 * <LinkifiedText text="Email me or visit www.example.com for more info" />
 *
 * @param text - The text content that may contain URLs
 * @param className - CSS classes for the container
 * @param linkClassName - CSS classes for the links
 * @param fallback - Fallback text to show if the text is empty
 */
export function LinkifiedText({
    text,
    className,
    linkClassName,
    fallback = "-",
}: LinkifiedTextProps) {
    if (!text || text.trim() === "") {
        return <span className={className}>{fallback}</span>;
    }

    // Enhanced URL regex that captures complete URLs including query parameters
    const urlRegex =
        /(https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\._~!$&'()*+,;=:@-]|%[0-9a-fA-F]{2})*)*(?:\?(?:[\w\._~!$&'()*+,;=:@\/?-]|%[0-9a-fA-F]{2})*)?(?:\#(?:[\w\._~!$&'()*+,;=:@\/?-]|%[0-9a-fA-F]{2})*)?)|(\b(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}(?:\/(?:[\w\._~!$&'()*+,;=:@-]|%[0-9a-fA-F]{2})*)*(?:\?(?:[\w\._~!$&'()*+,;=:@\/?-]|%[0-9a-fA-F]{2})*)?(?:\#(?:[\w\._~!$&'()*+,;=:@\/?-]|%[0-9a-fA-F]{2})*)?)/gi;

    const parts = text.split(urlRegex);

    return (
        <span className={className}>
            {parts.map((part, index) => {
                if (!part) return null;

                // Check if this part is a URL
                if (urlRegex.test(part)) {
                    // Reset regex lastIndex for next test
                    urlRegex.lastIndex = 0;

                    // Ensure the URL has a protocol
                    const href = part.startsWith("http")
                        ? part
                        : `https://${part}`;

                    return (
                        <a
                            key={index}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                                "text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors",
                                linkClassName
                            )}
                        >
                            {part}
                        </a>
                    );
                }

                return <span key={index}>{part}</span>;
            })}
        </span>
    );
}

/**
 * Utility function to check if text contains URLs
 * @param text - The text to check
 * @returns boolean indicating if URLs are present
 */
export function containsUrls(text: string): boolean {
    if (!text) return false;
    const urlRegex =
        /(https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\._~!$&'()*+,;=:@-]|%[0-9a-fA-F]{2})*)*(?:\?(?:[\w\._~!$&'()*+,;=:@\/?-]|%[0-9a-fA-F]{2})*)?(?:\#(?:[\w\._~!$&'()*+,;=:@\/?-]|%[0-9a-fA-F]{2})*)?)|(\b(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}(?:\/(?:[\w\._~!$&'()*+,;=:@-]|%[0-9a-fA-F]{2})*)*(?:\?(?:[\w\._~!$&'()*+,;=:@\/?-]|%[0-9a-fA-F]{2})*)?(?:\#(?:[\w\._~!$&'()*+,;=:@\/?-]|%[0-9a-fA-F]{2})*)?)/gi;
    return urlRegex.test(text);
}
