"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" },
    },
};

export function LandingHero() {
    return (
        <motion.section
            className="w-full py-24 md:py-32 lg:py-40 xl:py-52 bg-background flex flex-col items-center justify-center relative overflow-hidden"
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
        >
            {/* Simple background */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />

            <div className="container mx-auto px-4 md:px-8 text-center relative z-10">
                <div className="flex flex-col items-center space-y-8 max-w-4xl mx-auto">
                    <motion.h1
                        className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl text-foreground"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        Elevate Your Coaching Game
                    </motion.h1>
                    <motion.p
                        className="mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                    >
                        The ultimate platform for Movement Fitness trainers to
                        manage clients, track progress, and build personalized
                        workout plans efficiently.
                    </motion.p>
                    <motion.div
                        className="flex flex-wrap justify-center gap-4 mt-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                    >
                        <Button
                            size="lg"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                            asChild
                        >
                            <Link
                                href="#features"
                                className="flex items-center gap-2"
                            >
                                Learn More <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </motion.div>
                </div>
            </div>
        </motion.section>
    );
}
