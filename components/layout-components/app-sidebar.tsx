"use client";

import * as React from "react";
import {
    // BookOpen,
    // Bot,
    Dumbbell,
    // Command,
    // Frame,
    // LifeBuoy,
    // Map,
    MountainIcon,
    // PieChart,
    // Send,
    Settings2,
    // SquareTerminal,
    UserCircle,
    Users,
} from "lucide-react";

import { NavMain } from "@/components/layout-components/nav-main";
// import { NavProjects } from "@/components/layout-components/nav-projects";
// import { NavSecondary } from "@/components/layout-components/nav-secondary";
import { NavUser } from "@/components/layout-components/nav-user";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";

// Define the user data structure based on NavUser component
export interface UserData {
    name: string;
    email: string;
    avatar: string;
}

// Define props interface including the user data
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
    user: UserData | null;
}

// Keep navMain static for now, or make it a prop too if needed
// Removed user from here
// import * as React from "react";
// import { usePathname } from "next/navigation";
// import {
//     Dumbbell,
//     MountainIcon,
//     Settings2,
//     UserCircle,
//     Users,
// } from "lucide-react";

// import { NavMain } from "@/components/layout-components/nav-main";
// // import { NavProjects } from "@/components/layout-components/nav-projects";
// // import { NavSecondary } from "@/components/layout-components/nav-secondary";
// import { NavUser } from "@/components/layout-components/nav-user";
// import {
//     Sidebar,
//     SidebarContent,
//     SidebarFooter,
//     SidebarHeader,
//     SidebarMenu,
//     SidebarMenuButton,
//     SidebarMenuItem,
// } from "@/components/ui/sidebar";

// export interface UserData {
//     name: string;
//     email: string;
//     avatar: string;
// }

// interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
//     user: UserData;
// }

const navMain = [
    {
        title: "Clients",
        url: "/my-clients",
        icon: Users,
        items: [
            {
                title: "My Clients",
                url: "/my-clients",
            },
            {
                title: "All Clients",
                url: "/all-clients",
            },
            {
                title: "Add Client",
                url: "/add-client",
            },
        ],
    },
    {
        title: "Coaches",
        url: "/coaches",
        icon: UserCircle,
        items: [
            {
                title: "All Coaches",
                url: "/coaches",
            },
            {
                title: "Add Coach",
                url: "/add-trainer",
            },
        ],
    },
    {
        title: "Library",
        url: "/exercise-library",
        icon: Dumbbell,
        items: [
            {
                title: "Exercises",
                url: "/exercise-library",
            },
            {
                title: "Add Exercise",
                url: "/exercise",
            },
        ],
    },
    {
        title: "Settings",
        url: "/settings",
        icon: Settings2,
        items: [
            {
                title: "General",
                url: "/settings",
            },
            // {
            //     title: "Billing",
            //     url: "/settings/billing",
            // },
            // {
            //     title: "Limits",
            //     url: "/settings/limits",
            // },
        ],
    },
];
// Removed stray closing brace from original 'data' object below
// navSecondary: [
//     {
//         title: "Support",
//         url: "#",
//         icon: LifeBuoy,
//     },
//     {
//         title: "Feedback",
//         url: "#",
//         icon: Send,
//     },
// ],
// projects: [
//     {
//         name: "Design Engineering",
//         url: "#",
//         icon: Frame,
//     },
//     {
//         name: "Sales & Marketing",
//         url: "#",
//         icon: PieChart,
//     },
//     {
//         name: "Travel",
//         url: "#",
//         icon: Map,
//     },
// ],
// Removed stray closing brace from original 'data' object above

export function AppSidebar({ user, ...props }: AppSidebarProps) {
    // const [user, setUser] = React.useState<UserData | null>(null);

    const pathname = usePathname();
    const [openItems, setOpenItems] = React.useState<string[]>([]);

    // React.useEffect(() => {
    //     async function fetchUser() {
    //         const user = await get_logged_in_user();
    //         setUser(user);
    //     }
    //     fetchUser();
    // }, []);

    React.useEffect(() => {
        // Open the collapsible for the active main item or if any submenu is active
        const activeItems = navMain
            .filter(
                (item) =>
                    pathname === item.url ||
                    pathname.startsWith(item.url + "/") ||
                    item.items?.some(
                        (subItem) =>
                            pathname === subItem.url ||
                            pathname.startsWith(subItem.url + "/")
                    )
            )
            .map((item) => item.title);
        setOpenItems(activeItems);
    }, [pathname]);

    const toggleItem = (title: string) => {
        setOpenItems((prev) =>
            prev.includes(title)
                ? prev.filter((t) => t !== title)
                : [...prev, title]
        );
    };

    if (user === null) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-sidebar-primary-foreground">
                <svg
                    className="animate-spin h-8 w-8 text-sidebar-primary mb-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    ></circle>
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    ></path>
                </svg>
                <span className="text-sm font-medium">Loading...</span>
            </div>
        );
    }

    return (
        <Sidebar variant="inset" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <MountainIcon className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">
                                        GymFlow
                                    </span>
                                    <span className="truncate text-xs">
                                        Movement Fitness
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain
                    items={navMain}
                    openItems={openItems}
                    onToggleItem={toggleItem}
                />
                {/* <NavProjects projects={data.projects} />
                <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={user} />
            </SidebarFooter>
        </Sidebar>
    );
}
