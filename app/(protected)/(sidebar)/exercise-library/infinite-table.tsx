/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import * as React from "react";
import { useRouter } from "next/navigation";

import { useTableActions } from "@/hooks/use-table-actions";
import { InfiniteDataTable } from "@/components/ui/infinite-data-table";
import { Exercise, ExerciseResponse, tableOperations } from "./columns";
import { motion } from "framer-motion";
import {
    useInfiniteQuery,
    useQueryClient,
    useMutation,
    keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import {
    ColumnDef,
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import CompactTableOperations from "@/components/ui/compact-table-operations";
import {
    bulkUpdateExerciseStatus,
    bulkDeleteExercises,
} from "@/actions/exercise_actions";

interface InfiniteTableProps {
    fetchDataFn: (params: any) => Promise<any>;
    columns: ColumnDef<any, unknown>[];
    queryId?: string;
}

export function InfiniteTable({
    fetchDataFn,
    columns,
    queryId = "default",
}: InfiniteTableProps) {
    const router = useRouter();
    // Reference to the scrolling element
    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    const [rowSelection, setRowSelection] = React.useState({});
    const [selectedRows, setSelectedRows] = React.useState<Exercise[]>([]);
    const [loadingOperation, setLoadingOperation] = React.useState<
        "approve" | "unapprove" | "delete" | null
    >(null);

    const queryClient = useQueryClient();

    // Mutation for bulk status update (approve/unapprove)
    const { mutate: bulkUpdateStatus } = useMutation({
        mutationFn: async ({
            exerciseIds,
            approved,
        }: {
            exerciseIds: string[];
            approved: boolean;
        }) => {
            setLoadingOperation(approved ? "approve" : "unapprove");
            try {
                const result = await bulkUpdateExerciseStatus(
                    exerciseIds,
                    approved
                );
                if (!result.success) {
                    throw new Error(result.message);
                }
                return result;
            } finally {
                setLoadingOperation(null);
            }
        },
        onSuccess: (data) => {
            toast.success(data.message);
            // Reset selection
            setRowSelection({});
            setSelectedRows([]);
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({
                queryKey: ["tableData", urlParams, queryId],
            });
        },
        onError: (error) => {
            toast.error(
                `Failed to update exercise status: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        },
    });

    // Mutation for bulk delete
    const { mutate: bulkDelete } = useMutation({
        mutationFn: async (data: { exerciseIds: string[] }) => {
            setLoadingOperation("delete");
            try {
                const result = await bulkDeleteExercises(data.exerciseIds);
                if (!result.success) {
                    throw new Error(result.message);
                }
                return result;
            } finally {
                setLoadingOperation(null);
            }
        },
        onSuccess: (data) => {
            // If we have details about failed deletions, show a more detailed message
            if (data.details?.failed && data.details.failed.length > 0) {
                const details = data.details as {
                    failed: Array<{ id: string; reason: string }>;
                };
                toast.custom(
                    () => (
                        <div className="bg-background border rounded-lg shadow-lg p-4 max-w-md">
                            <h3 className="font-semibold mb-2">
                                Bulk Delete Results
                            </h3>
                            <p className="text-sm mb-2">{data.message}</p>
                            <div className="mt-2">
                                <p className="text-sm font-medium mb-1">
                                    Failed to delete:
                                </p>
                                <ul className="text-sm space-y-1">
                                    {details.failed.map((failure) => (
                                        <li
                                            key={failure.id}
                                            className="text-muted-foreground"
                                        >
                                            • {failure.reason}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ),
                    {
                        duration: 5000,
                    }
                );
            } else {
                toast.success(data.message);
            }

            setRowSelection({});
            setSelectedRows([]);
            queryClient.invalidateQueries({
                queryKey: ["tableData", urlParams, queryId],
            });
        },
        onError: (error) => {
            // toast.error(`Error deleting exercises: ${error.message}`);
            const message =
                error instanceof Error ? error.message : String(error);
            toast.error(`Error deleting exercises: ${message}`);
        },
    });

    const {
        sorting,
        columnFilters,
        searchQuery,
        handleSearchChange,
        handleSortingChange,
        handleColumnFiltersChange,
        urlParams,
    } = useTableActions();

    // Use React Query for data fetching with infinite scroll
    const { data, fetchNextPage, isFetchingNextPage, isLoading } =
        useInfiniteQuery<ExerciseResponse>({
            queryKey: ["tableData", urlParams, queryId],
            queryFn: async ({ pageParam = 0 }) => {
                const params = {
                    ...urlParams,
                    pageIndex: pageParam,
                };
                return fetchDataFn(params as Record<string, unknown>);
            },
            initialPageParam: 0,
            getNextPageParam: (_lastPage, allPages) => {
                // Simply return the length of allPages as the next page param
                // This will be 1, 2, 3, etc. as pages are added
                return allPages.length;
            },
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            staleTime: 60 * 1000,
            placeholderData: keepPreviousData,
        });

    // Flatten the data from all pages
    const flatData = React.useMemo(
        () => data?.pages.flatMap((page) => page.data) || [],
        [data]
    );
    const totalRowCount = data?.pages[0]?.meta?.totalRowCount || 0;
    const totalFetched = flatData.length;

    // Create react-table instance
    const table = useReactTable({
        data: flatData,
        columns: columns as ColumnDef<Exercise, unknown>[],
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
            columnFilters,
            rowSelection,
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        manualSorting: true,
        debugTable: true,
    });

    // Update selected rows when rowSelection changes
    React.useEffect(() => {
        // const selectedRowsData = Object.keys(rowSelection)
        //     .map((index) => flatData[parseInt(index)])
        //     .filter(Boolean) as Exercise[];
        const selectedRowsData = table
            .getSelectedRowModel()
            .rows.map((r) => r.original as Exercise);

        setSelectedRows(selectedRowsData);
    }, [rowSelection, flatData]);

    // Create row virtualizer
    const rowVirtualizer = useVirtualizer({
        count: table.getRowModel().rows.length,
        estimateSize: () => 33, // estimate row height for accurate scrollbar dragging
        getScrollElement: () => tableContainerRef.current,
        // Measure dynamic row height, except in Firefox
        measureElement:
            typeof window !== "undefined" &&
            navigator.userAgent.indexOf("Firefox") === -1
                ? (element) => element?.getBoundingClientRect().height
                : undefined,
        overscan: 5,
    });

    // Set up effect to scroll to top when sorting changes
    React.useEffect(() => {
        if (
            table.getRowModel().rows.length > 0 &&
            rowVirtualizer.scrollToIndex
        ) {
            rowVirtualizer.scrollToIndex(0);
        }
    }, [sorting, rowVirtualizer, table]);

    // Function to fetch more data when scrolling to bottom
    const fetchMoreOnBottomReached = React.useCallback(
        (containerRefElement?: HTMLDivElement | null) => {
            if (containerRefElement) {
                const { scrollHeight, scrollTop, clientHeight } =
                    containerRefElement;
                // Once the user has scrolled within 500px of the bottom, fetch more data
                if (
                    scrollHeight - scrollTop - clientHeight < 500 &&
                    !isFetchingNextPage &&
                    totalFetched < totalRowCount
                ) {
                    console.log("Fetching more data...", {
                        scrollHeight,
                        scrollTop,
                        clientHeight,
                        isFetchingNextPage,
                        totalFetched,
                        totalRowCount,
                    });
                    fetchNextPage();
                }
            }
        },
        [fetchNextPage, isFetchingNextPage, totalFetched, totalRowCount]
    );

    React.useEffect(() => {
        fetchMoreOnBottomReached(tableContainerRef.current);
    }, [fetchMoreOnBottomReached]);

    if (isLoading && flatData.length === 0) {
        return (
            <div className="flex items-center h-full w-full justify-center bg-background z-[9999]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center justify-center"
                >
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="space-y-4 overflow-x-auto no-scrollbar pt-1">
            <CompactTableOperations
                className="min-w-[800px] flex-nowrap"
                columns={columns}
                globalFilter={searchQuery}
                setGlobalFilter={handleSearchChange}
                filterableColumns={tableOperations.filterableColumns}
                sortableColumns={tableOperations.sortableColumns}
                onSortChange={(columnId, desc) => {
                    if (columnId) {
                        handleSortingChange([{ id: columnId, desc }]);
                    } else {
                        handleSortingChange([]);
                    }
                }}
                onFilterChange={(columnId, value) => {
                    if (columnId && value) {
                        const newFilters = [...columnFilters];
                        const existingFilterIndex = newFilters.findIndex(
                            (f) => f.id === columnId
                        );

                        if (existingFilterIndex >= 0) {
                            newFilters[existingFilterIndex].value = value;
                        } else {
                            newFilters.push({
                                id: columnId,
                                value,
                            });
                        }
                        handleColumnFiltersChange(newFilters);
                    } else {
                        handleColumnFiltersChange([]);
                    }
                }}
                onApplyClick={() => {
                    queryClient.invalidateQueries({
                        queryKey: ["tableData", urlParams, queryId],
                    });
                }}
                showNewButton={true}
                onNewClick={() => {
                    router.push("/exercise");
                }}
                selectedRows={selectedRows}
                showDeleteButton={true}
                onDeleteClick={(rows) => {
                    if (rows.length > 0) {
                        bulkDelete({
                            exerciseIds: rows.map(
                                (exercise) => exercise.exerciseId
                            ),
                        });
                    }
                }}
                isDeleting={loadingOperation === "delete"}
                getRowSampleData={(rows) => (
                    <ul className="text-sm">
                        {rows.slice(0, 5).map((row) => (
                            <li
                                key={row.exerciseId}
                                className="mb-1 pb-1 border-b border-gray-100 last:border-0"
                            >
                                <div className="font-medium">{row.name}</div>
                                <div className="text-xs text-muted-foreground">
                                    {row.motion} • {row.targetArea}
                                </div>
                            </li>
                        ))}
                        {rows.length > 5 && (
                            <li className="text-xs text-muted-foreground mt-2">
                                ...and {rows.length - 5} more
                            </li>
                        )}
                    </ul>
                )}
                customOperations={[
                    {
                        label: "Approve",
                        icon: <CheckCircle2 size={16} />,
                        variant: "default",
                        onClick: (rows) => {
                            if (rows.length > 0) {
                                const exerciseIds = rows.map(
                                    (row) => row.exerciseId
                                );
                                bulkUpdateStatus({
                                    exerciseIds,
                                    approved: true,
                                });
                            }
                        },
                        showConfirmation: true,
                        confirmationTitle: "Confirm Bulk Approval",
                        confirmationDescription:
                            "You are about to approve the selected exercises. This will make them visible to all users.",
                        confirmationButtonText: "Approve",
                        isLoading: loadingOperation === "approve",
                        getRowSampleData: (rows) => (
                            <ul className="text-sm">
                                {rows.slice(0, 5).map((row) => (
                                    <li
                                        key={row.exerciseId}
                                        className="mb-1 pb-1 border-b border-gray-100 last:border-0"
                                    >
                                        <div className="font-medium">
                                            {row.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {row.motion} • {row.targetArea}
                                        </div>
                                    </li>
                                ))}
                                {rows.length > 5 && (
                                    <li className="text-xs text-muted-foreground mt-2">
                                        ...and {rows.length - 5} more
                                    </li>
                                )}
                            </ul>
                        ),
                    },
                    {
                        label: "Unapprove",
                        icon: <XCircle size={16} />,
                        variant: "secondary",
                        onClick: (rows) => {
                            if (rows.length > 0) {
                                const exerciseIds = rows.map(
                                    (row) => row.exerciseId
                                );
                                bulkUpdateStatus({
                                    exerciseIds,
                                    approved: false,
                                });
                            }
                        },
                        showConfirmation: true,
                        confirmationTitle: "Confirm Bulk Unapproval",
                        confirmationDescription:
                            "You are about to unapprove the selected exercises. This will make them hidden from all users.",
                        confirmationButtonText: "Unapprove",
                        isLoading: loadingOperation === "unapprove",
                        getRowSampleData: (rows) => (
                            <ul className="text-sm">
                                {rows.slice(0, 5).map((row) => (
                                    <li
                                        key={row.exerciseId}
                                        className="mb-1 pb-1 border-b border-gray-100 last:border-0"
                                    >
                                        <div className="font-medium">
                                            {row.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {row.motion} • {row.targetArea}
                                        </div>
                                    </li>
                                ))}
                                {rows.length > 5 && (
                                    <li className="text-xs text-muted-foreground mt-2">
                                        ...and {rows.length - 5} more
                                    </li>
                                )}
                            </ul>
                        ),
                    },
                ]}
            />

            <div className="flex items-center text-sm text-muted-foreground">
                ({flatData.length} of {totalRowCount} rows fetched)
            </div>

            <InfiniteDataTable
                columns={columns as ColumnDef<Exercise, unknown>[]}
                rowVirtualizer={rowVirtualizer}
                tableContainerRef={
                    tableContainerRef as React.RefObject<HTMLDivElement>
                }
                table={table}
                rows={table.getRowModel().rows}
                hasMore={totalFetched < totalRowCount}
                isLoading={isFetchingNextPage}
                emptyMessage={
                    columnFilters.length > 0 || searchQuery
                        ? "No results found. Try clearing your filters."
                        : "No data available."
                }
                onScroll={(e) => fetchMoreOnBottomReached(e.currentTarget)}
                height="calc(100vh - 290px)"
                className="w-full"
            />
        </div>
    );
}
