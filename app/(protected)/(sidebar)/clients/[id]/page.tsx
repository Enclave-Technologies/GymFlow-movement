import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getClientById } from "@/actions/client_actions";
import { formatDate } from "@/lib/utils";
import { checkGuestApproval } from "@/lib/auth-utils";
import { cookies } from "next/headers";
import { MOVEMENT_SESSION_NAME } from "@/lib/constants";
import { authenticated_or_login } from "@/actions/appwrite_actions";
import Image from "next/image";
import { Calendar, Mail, Pencil, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";

type PageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function ClientProfilePage({ params }: PageProps) {
    const resolvedParams = await params;

    await checkGuestApproval();

    const session = (await cookies()).get(MOVEMENT_SESSION_NAME)?.value || null;
    const result = await authenticated_or_login(session);

    if (result && "error" in result) {
        console.error("Error in Trainer:", result.error);
        redirect("/login?error=user_fetch_error");
    }

    if (!result || (!("error" in result) && !result)) {
        redirect("/login");
    }

    const client = await getClientById(resolvedParams.id);

    if (!client) {
        return (
            <div className="container mx-auto py-10">
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle>Client Not Found</CardTitle>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((part) => part.charAt(0))
            .join("")
            .toUpperCase()
            .substring(0, 2);
    };

    const formatGender = (gender: string | null) => {
        if (!gender) return "Not specified";
        return (
            gender.charAt(0).toUpperCase() + gender.slice(1).replace("-", " ")
        );
    };

    return (
        <div className="container mx-auto py-2 md:py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Profile Image (1/3 width, full card background) */}
                <Card className="relative overflow-hidden p-0 md:col-span-1 flex flex-col justify-end min-h-[60px] h-full">
                    {client.imageUrl ? (
                        <Image
                            src={client.imageUrl}
                            alt={client.fullName}
                            className="absolute inset-0 w-full h-full object-cover"
                            width={500}
                            height={500}
                        />
                    ) : (
                        <div className="absolute inset-0 w-full h-full bg-muted flex items-center justify-center text-5xl font-bold text-muted-foreground">
                            {getInitials(client.fullName)}
                        </div>
                    )}
                    {/* Glass overlay: small, pill-shaped, bottom-left, compact */}
                    <div
                        className="absolute left-4 bottom-4 z-10 flex flex-col items-start"
                        style={{
                            WebkitBackdropFilter: "blur(8px)",
                            backdropFilter: "blur(8px)",
                        }}
                    >
                        <div className="bg-white/60 rounded-2xl shadow-md px-4 py-2 flex flex-col items-start min-w-[140px] max-w-[90vw]">
                            <span className="text-black font-semibold text-base sm:text-lg leading-tight truncate">
                                {client.fullName}
                            </span>
                            {/* <span className="text-black/70 text-xs sm:text-sm font-medium mt-0.5">
                                Trainer
                            </span> */}
                        </div>
                    </div>
                </Card>
                <Card className="relative overflow-hidden p-4 md:col-span-1 flex flex-col justify-end min-h-[60px] h-full border border-muted rounded-lg shadow-sm">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                        Notes
                    </div>
                    <p className="text-gray-800 text-base">{client.notes}</p>
                </Card>

                <Card className="flex flex-col justify-center p-6 md:col-span-1">
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <div className="text-sm font-medium">Email</div>
                                <div className="text-sm text-muted-foreground">
                                    {client.email || "- -"}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <div className="text-sm font-medium">Phone</div>
                                <div className="text-sm text-muted-foreground">
                                    {client.phone || "- -"}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <div className="text-sm font-medium">
                                    Gender
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {formatGender(client.gender)}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <div className="text-sm font-medium">
                                    Joined
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {client.registrationDate
                                        ? formatDate(client.registrationDate)
                                        : "Unknown"}
                                </div>
                                {/* <div className="text-xs text-muted-foreground">
                                    {timeWithMovement} with Movement
                                </div> */}
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <Button variant="outline" size="sm">
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Profile
                            </Button>
                            {/* <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button> */}
                        </div>
                    </CardContent>
                </Card>

                {/* Table (full width, new row) */}
                <Card className="flex flex-col p-4 min-h-[350px] md:col-span-3">
                    {/* <CardHeader>
                        <CardTitle className="text-lg">Clients</CardTitle>
                    </CardHeader>
                    <Separator className="my-2" /> */}
                    <CardContent>
                        {/* <Suspense fallback={<div>Loading table...</div>}>
                            <InfiniteTable
                                fetchDataFn={getClientsManagedByUserPaginated}
                                columns={columns}
                                queryId={userId}
                                trainerId={userId}
                            />
                        </Suspense> */}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
