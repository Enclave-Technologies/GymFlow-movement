"use client";

import { useState } from "react";
// import { cn } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth_actions";
import { Loader2, LogOut } from "lucide-react";

export function LogoutButton({
    className = "w-full",
    buttonText = "Logout",
}: {
    className?: string;
    buttonText?: string;
}) {
    const [isLoading, setIsLoading] = useState(false);

    const handleLogout = async () => {
        if (isLoading) return; // Prevent multiple logout attempts

        setIsLoading(true);
        try {
            const redirectPath = await logout();
            // Use window.location instead of router.push for more reliable logout
            window.location.href = redirectPath;
        } catch (error) {
            console.error("Logout error:", error);
            // Even if logout fails, redirect to login page
            window.location.href = "/login";
        } finally {
            // Don't set loading to false here since we're redirecting
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="destructive"
                    disabled={isLoading}
                    className={className}
                >
                    {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <LogOut className="mr-2 h-4 w-4 text-white" />
                    )}
                    {buttonText}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Logout</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to logout?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleLogout}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Logout
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
