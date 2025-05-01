import type { Metadata } from "next";

import { LandingNav } from "@/components/landing-page/landing-nav";

export const metadata: Metadata = {
    title: "GymFlow | Movement Fitness",
    description: "A Lifestyle in Sai Ying Pun",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <LandingNav />
            {children}
        </>
    );
}
