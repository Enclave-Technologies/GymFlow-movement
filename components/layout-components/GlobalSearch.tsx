"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink } from "lucide-react"; // Import ExternalLink
import Link from "next/link";
import { useDebounce } from "use-debounce";
import { searchClientsByNameAction } from "@/actions/client_actions"; // Import the server action
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar components
import { getInitials } from "@/lib/utils"; // Assuming a utility function for initials exists

// Define the type for a client result (matches the server action return type)
interface ClientSearchResult {
    id: string;
    name: string;
    imageUrl: string | null; // Add imageUrl
}

export function GlobalSearch() {
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState<ClientSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);

    const [debouncedSearchTerm] = useDebounce(searchTerm, 300); // 300ms debounce

    const handleSearch = useCallback(async (query: string) => {
        if (query.trim() === "") {
            setResults([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const clients = await searchClientsByNameAction(query); // Use the imported server action
            setResults(clients);
        } catch (error) {
            console.error("Search failed:", error);
            setResults([]); // Clear results on error
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        handleSearch(debouncedSearchTerm);
    }, [debouncedSearchTerm, handleSearch]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setSearchTerm(value);
        if (value.trim() !== "") {
            setIsDropdownVisible(true);
        } else {
            setIsDropdownVisible(false);
            setResults([]); // Clear results immediately if input is empty
        }
    };

    const handleBlur = () => {
        // Delay hiding the dropdown to allow clicking on links
        setTimeout(() => {
            setIsDropdownVisible(false);
        }, 150);
    };

    const handleFocus = () => {
        if (searchTerm.trim() !== "") {
            setIsDropdownVisible(true);
        }
    };

    return (
        <div className="relative w-full">
            <Input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                className="w-full" // Ensure input takes full width of its container
            />
            {isDropdownVisible && (
                <div className="absolute z-50 mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto"> {/* Increased z-index */}
                    {isLoading ? (
                        <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : results.length > 0 ? (
                        <ul>
                            {results.map((client) => (
                                <li key={client.id}> {/* Removed border classes */}
                                    <Link
                                        href={`/clients/${client.id}`} // Adjust URL structure as needed
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-accent hover:text-accent-foreground text-sm" // Added justify-between
                                        // onClick={() => setIsDropdownVisible(false)} // Optionally hide dropdown on click
                                    >
                                        <div className="flex items-center gap-3"> {/* Group avatar and name */}
                                            <Avatar className="h-6 w-6">
                                            <AvatarImage
                                                src={
                                                    client.imageUrl ?? undefined
                                                }
                                                alt={client.name}
                                            />
                                            <AvatarFallback>
                                                {getInitials(client.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span>{client.name}</span>
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-muted-foreground" /> {/* Added icon */}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : searchTerm.trim() !== "" ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                            No clients found.
                        </div>
                    ) : null}
                    {/* Render nothing if search term is empty and not loading */}
                </div>
            )}
        </div>
    );
}
