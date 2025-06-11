import type { Metadata } from "next";
import "@/app/globals.css";
import { get_logged_in_user } from "@/actions/logged_in_user_actions";

export const metadata: Metadata = {
    title: "GymFlow | Movement Fitness",
    description: "A Lifestyle in Sai Ying Pun",
};

export default async function AppLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    await get_logged_in_user(); // Ensure user is authenticated

    return <div>{children}</div>;
}
