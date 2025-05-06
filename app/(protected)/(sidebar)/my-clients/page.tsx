import { authenticated_or_login } from "@/actions/appwrite_actions";
import {
  getClientsManagedByUserPaginated,
  getAllCoaches,
} from "@/actions/client_actions";
import { checkGuestApproval } from "@/lib/auth-utils";
import { MOVEMENT_SESSION_NAME } from "@/lib/constants";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { InfiniteTable } from "./infinite-table";
import { columns } from "./columns";

export default async function MyClients() {
  // Check if user is a Guest and not approved
  await checkGuestApproval();

  const session = (await cookies()).get(MOVEMENT_SESSION_NAME)?.value || null;

  const result = await authenticated_or_login(session);

  if (result && "error" in result) {
    console.error("Error in MyClients:", result.error);
    redirect("/login?error=user_fetch_error");
  }

  if (!result || (!("error" in result) && !result)) {
    redirect("/login");
  }

  // Get the user ID from the authenticated result
  const userId = result.$id; // Appwrite user ID

  // Fetch all coaches for the dropdown
  const coaches = await getAllCoaches();

  return (
    <div className="container mx-auto py-2 md:py-6 ">
      <h1 className="text-2xl font-bold mb-6">My Clients</h1>

      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<TableSkeleton />}>
          <InfiniteTable
            fetchDataFn={getClientsManagedByUserPaginated}
            columns={columns}
            queryId={`my-clients-${userId}`}
            trainerId={userId}
            coaches={coaches}
          />
        </Suspense>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Skeleton className="h-10 w-[300px]" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-[100px]" />
          <Skeleton className="h-9 w-[100px]" />
        </div>
      </div>

      <div className="rounded-md border">
        <div className="h-[600px] w-full relative">
          <Skeleton className="absolute inset-0" />
        </div>
      </div>
    </div>
  );
}
