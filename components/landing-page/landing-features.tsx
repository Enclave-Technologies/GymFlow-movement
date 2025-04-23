"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DumbbellIcon, UsersIcon, TargetIcon } from "lucide-react";
import { motion } from "framer-motion";

const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" },
    },
};

const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

const featuresData = [
    {
        title: "Client Management",
        icon: UsersIcon,
        description:
            "Keep track of all your clients, their goals, and progress in one organized place.",
    },
    {
        title: "Workout Builder",
        icon: DumbbellIcon,
        description:
            "Create and assign personalized training programs with ease using our extensive exercise library.",
    },
    {
        title: "Progress Tracking",
        icon: TargetIcon,
        description:
            "Monitor client performance, track measurements, and visualize progress over time with insightful charts.",
    },
];

export function LandingFeatures() {
    return (
        <motion.section
            id="features"
            className="w-full py-24 md:py-32 bg-background relative overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={sectionVariants}
        >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50" />
            
            <div className="container mx-auto px-4 md:px-8 relative z-10">
                <div className="flex flex-col items-center justify-center space-y-6 text-center mb-16">
                    <motion.div 
                        className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-2"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        Key Features
                    </motion.div>
                    <motion.h2 
                        className="text-4xl md:text-5xl font-bold tracking-tight text-foreground"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        Everything You Need to Succeed
                    </motion.h2>
                    <motion.p 
                        className="max-w-[800px] text-muted-foreground text-lg md:text-xl"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        Streamline your workflow, engage your clients effectively, and grow your fitness business faster than ever.
                    </motion.p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {featuresData.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            variants={cardVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -8, transition: { duration: 0.2 } }}
                        >
                            <Card className="h-full bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 overflow-hidden group">
                                <CardHeader className="flex flex-col items-center text-center pb-6 pt-8">
                                    <div className="p-3 rounded-full bg-primary/10 mb-5 group-hover:bg-primary/20 transition-colors duration-300">
                                        <feature.icon className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-xl font-bold text-foreground">
                                        {feature.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-center pb-8">
                                    <p className="text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-300">
                                        {feature.description}
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.section>
    );
}
