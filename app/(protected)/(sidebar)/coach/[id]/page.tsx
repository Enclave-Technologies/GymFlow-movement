import { authenticated_or_login } from "@/actions/appwrite_actions";
import { getClientsManagedByUserPaginated } from "@/actions/client_actions";
import { getCoachById } from "@/actions/coach_actions";
import { checkGuestApproval } from "@/lib/auth-utils";
import { MOVEMENT_SESSION_NAME } from "@/lib/constants";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { InfiniteTable } from "../../my-clients/infinite-table";
import { columns } from "../../my-clients/columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Calendar, Pencil } from "lucide-react";
import { safeImageUrl } from "@/lib/utils";
import Image from "next/image";

export default async function TrainerProfilePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
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

    const userId = resolvedParams.id;

    // Get trainer details and clients
    const trainerData = await getCoachById(userId);

    if (!trainerData) {
        return (
            <div className="container mx-auto py-10">
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle>Trainer Not Found</CardTitle>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const registrationDate = trainerData.registrationDate
        ? new Date(trainerData.registrationDate).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
          })
        : "Unknown";

    // Calculate time since registration
    let timeWithMovement = "";
    if (trainerData.registrationDate) {
        const now = new Date();
        const regDate = new Date(trainerData.registrationDate);
        const diffTime = Math.abs(now.getTime() - regDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 30) {
            timeWithMovement = `${diffDays} days`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            timeWithMovement = `${months} month${months > 1 ? "s" : ""}`;
        } else {
            const years = Math.floor(diffDays / 365);
            timeWithMovement = `${years} year${years > 1 ? "s" : ""}`;
        }
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

    // Bento-style grid: Top row (1/3 image, 2/3 info), bottom row (full width table)
    return (
        <div className="container mx-auto py-2 md:py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Profile Image (1/3 width, full card background) */}
                <Card className="relative overflow-hidden p-0 md:col-span-1 flex flex-col justify-end min-h-[260px] h-full">
                    {safeImageUrl(trainerData.imageUrl) ? (
                        <Image
                            src={safeImageUrl(trainerData.imageUrl) || ""}
                            alt={trainerData.fullName}
                            className="absolute inset-0 w-full h-full object-cover"
                            width={500}
                            height={500}
                        />
                    ) : (
                        <div className="absolute inset-0 w-full h-full bg-muted flex items-center justify-center text-5xl font-bold text-muted-foreground">
                            {getInitials(trainerData.fullName)}
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
                                {trainerData.fullName}
                            </span>
                            <span className="text-black/70 text-xs sm:text-sm font-medium mt-0.5">
                                {trainerData.job_title || "Trainer"}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Details (2/3 width) */}
                <Card className="flex flex-col justify-center p-6 md:col-span-2">
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <div className="text-sm font-medium">Email</div>
                                <div className="text-sm text-muted-foreground">
                                    {trainerData.email || "- -"}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <div className="text-sm font-medium">Phone</div>
                                <div className="text-sm text-muted-foreground">
                                    {trainerData.phone || "- -"}
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
                                    {formatGender(trainerData.gender)}
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
                                    {registrationDate}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {timeWithMovement} with Movement
                                </div>
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
                <Card className="flex flex-col p-4 min-h-[400px] md:col-span-3">
                    {/* <CardHeader>
                        <CardTitle className="text-lg">Clients</CardTitle>
                    </CardHeader>
                    <Separator className="my-2" /> */}
                    <CardContent>
                        <Suspense fallback={<div>Loading table...</div>}>
                            <InfiniteTable
                                fetchDataFn={getClientsManagedByUserPaginated}
                                columns={columns}
                                queryId={userId}
                                trainerId={userId}
                            />
                        </Suspense>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
