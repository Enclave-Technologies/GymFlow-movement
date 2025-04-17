import { getAllClientsPaginated } from "@/actions/client_actions";
import { get_logged_in_user } from "@/actions/logged_in_user_actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { InfiniteTable } from "../example-table/infinite-table";
import { columns } from "./columns";

export default async function AllClientsPage() {
  // Server component: fetch initial data
  const user = await get_logged_in_user();

  if (!user) {
    return <div>Please log in to view clients</div>;
  }

  // Fetch initial page of all clients in the system
  const initialClientsData = await getAllClientsPaginated(1, 10);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">All Clients</h1>

      <Suspense fallback={<TableSkeleton />}>
        <InfiniteTable
          initialData={initialClientsData}
          fetchDataFn={getAllClientsPaginated}
          columns={columns}
        />
      </Suspense>
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
