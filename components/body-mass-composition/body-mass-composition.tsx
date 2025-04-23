import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientById } from "@/actions/client_actions"; // Import getClientById

import { columns } from "./columns";
import { InfiniteTable } from "./infinite-table";
import { getClientBMCRecordPaginated } from "@/actions/bmc_actions";

const BodyMassComposition = async ({ client_id }: { client_id: string }) => {
    // Fetch client data
    const clientData = await getClientById(client_id);

    // Calculate age
    let age: number | null = null;
    if (clientData?.dob) {
        const today = new Date();
        const birthDate = new Date(clientData.dob);
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
    }

    // Get ideal weight
    const idealWeight = clientData?.idealWeight ?? null; // Use null if not available

    return (
        <div className="w-full">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Body Mass Composition</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex-1 overflow-hidden">
                        <Suspense fallback={<TableSkeleton />}>
                            <InfiniteTable
                                fetchDataFn={getClientBMCRecordPaginated}
                                columns={columns}
                                queryId="bmc-records"
                                clientId={client_id}
                                age={age} // Pass age
                                idealWeight={idealWeight} // Pass idealWeight
                            />
                        </Suspense>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

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

export default BodyMassComposition;
