import type { Metadata } from "next";
import "@/app/globals.css";
import { AppSidebar } from "@/components/layout-components/app-sidebar";
// import { Separator } from "@/components/ui/separator";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme/theme-toggle";
import { QueryProvider } from "@/providers/query-provider";
import { get_logged_in_user } from "@/actions/logged_in_user_actions";
import { GlobalSearch } from "@/components/layout-components/GlobalSearch";

export const metadata: Metadata = {
    title: "GymFlow | Movement Fitness",
    description: "A Lifestyle in Sai Ying Pun",
};

export default async function AppLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const user = await get_logged_in_user();

    return (
        <SidebarProvider>
            <AppSidebar user={user} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center justify-between px-4 w-full gap-4">
                    <SidebarTrigger className="-ml-2" />
                    {/* <Separator orientation="vertical" className="mr-2 h-4" /> */}

                    {/* Replace the old input with the GlobalSearch component */}
                    <GlobalSearch />

                    <ModeToggle />
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <QueryProvider>{children}</QueryProvider>
                    {/* <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                        <div className="aspect-video rounded-xl bg-muted/50" />
                        <div className="aspect-video rounded-xl bg-muted/50" />
                        <div className="aspect-video rounded-xl bg-muted/50" />
                    </div>
                    <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" /> */}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
