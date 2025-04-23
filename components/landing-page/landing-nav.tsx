"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MountainIcon, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { ModeToggle } from "../theme/theme-toggle";

export function LandingNav() {
    return (
        <motion.header
            className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
                {/* Logo */}
                <Link
                    href="#"
                    className="flex items-center gap-2 transition-colors hover:opacity-90"
                    prefetch={false}
                >
                    <MountainIcon className="h-7 w-7 text-primary" />
                    <span className="font-bold text-xl">GymFlow</span>
                </Link>

                {/* Center Navigation */}
                <div className="hidden md:flex items-center justify-center">
                    <nav className="flex items-center">
                        <Link
                            href="#features"
                            className="relative px-4 py-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
                            prefetch={false}
                        >
                            Features
                        </Link>
                    </nav>
                </div>

                {/* Right Side - Auth Buttons */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-sm"
                        asChild
                    >
                        <Link href="/login">Login</Link>
                    </Button>
                    <Button
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                        asChild
                    >
                        <Link
                            href="/sign-up"
                            className="flex items-center gap-1"
                        >
                            Sign Up <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                    </Button>
                    <ModeToggle />
                </div>
            </div>
        </motion.header>
    );
}
