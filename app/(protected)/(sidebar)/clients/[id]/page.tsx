import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getClientById } from "@/actions/client_actions";
import { formatDate } from "@/lib/utils";
import { checkGuestApproval } from "@/lib/auth-utils";
import { cookies } from "next/headers";
import { MOVEMENT_SESSION_NAME } from "@/lib/constants";
import { authenticated_or_login } from "@/actions/appwrite_actions";
import Image from "next/image";
import { Calendar, Mail, Pencil, Phone, User } from "lucide-react";
import ClientTabs from "@/components/client-tabs/client-tabs";
import Link from "next/link";
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
    return gender.charAt(0).toUpperCase() + gender.slice(1).replace("-", " ");
  };

  return (
    <div className="container mx-auto py-2 md:py-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        {/* Profile Image */}
        <Card className="relative overflow-hidden p-0 md:col-span-1 flex flex-col justify-end h-48">
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
          {/* Name overlay */}
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
            </div>
          </div>
        </Card>
        <Card className="relative overflow-hidden p-2 md:col-span-3 flex flex-col justify-end h-48 border border-muted rounded-lg shadow-sm">
          <div className="mb-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-xs text-muted-foreground">
                  Ideal Weight
                </span>
                <div className="text-base font-medium text-gray-900">
                  {client.idealWeight !== null &&
                  client.idealWeight !== undefined
                    ? `${client.idealWeight} kg`
                    : "- -"}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  Emergency Contact Name
                </span>
                <div className="text-base font-medium text-gray-900">
                  {client.emergencyContactName || "- -"}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  Emergency Contact Phone
                </span>
                <div className="text-base font-medium text-gray-900">
                  {client.emergencyContactPhone || "- -"}
                </div>
              </div>
            </div>
          </div>
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Notes
          </div>
          <p className="text-gray-800 text-base">{client.notes}</p>
        </Card>

        <Card className="flex flex-col justify-center p-3 md:col-span-1 h-48">
          <CardContent className="flex flex-col h-full p-0">
            <div className="grid grid-cols-2 gap-2 text-center mb-auto">
              <div className="flex flex-col items-center">
                <Mail className="h-5 w-5 text-muted-foreground mb-1" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-xs text-muted-foreground truncate w-full px-1">
                        {client.email || "- -"}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{client.email || "- -"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex flex-col items-center">
                <Phone className="h-5 w-5 text-muted-foreground mb-1" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-xs text-muted-foreground truncate w-full px-1">
                        {client.phone || "- -"}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{client.phone || "- -"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex flex-col items-center">
                <User className="h-5 w-5 text-muted-foreground mb-1" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-xs text-muted-foreground truncate w-full px-1">
                        {formatGender(client.gender)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{formatGender(client.gender)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex flex-col items-center">
                <Calendar className="h-5 w-5 text-muted-foreground mb-1" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-xs text-muted-foreground truncate w-full px-1">
                        {client.registrationDate
                          ? formatDate(client.registrationDate)
                          : "Unknown"}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {client.registrationDate
                          ? formatDate(client.registrationDate)
                          : "Unknown"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="flex justify-center mt-2">
              <Link
                href={`/onboard-users?id=${client.userId}`}
                className="h-full w-full flex items-center justify-center p-2 border border-muted rounded-md gap-2"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col p-4 h-[800px] md:col-span-5">
          <CardContent className="h-full p-0">
            <ClientTabs params={{ userdata: client }} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
