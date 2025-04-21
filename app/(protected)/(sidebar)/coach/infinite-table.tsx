/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import * as React from "react";
import { useTableActions } from "@/hooks/use-table-actions";
import { InfiniteDataTable } from "@/components/ui/infinite-data-table";
import { Client } from "./columns";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import {
    ColumnDef,
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import CompactTableOperations from "@/components/ui/compact-table-operations";

interface InfiniteTableProps {
    initialData: {
        data: any[];
        meta: {
            totalRowCount: number;
        };
    };
    fetchDataFn: (params: any) => Promise<any>;
    columns: ColumnDef<any, unknown>[];
    queryId?: string;
}

export function InfiniteTable({
    initialData,
    fetchDataFn,
    columns,
    queryId = "default",
}: InfiniteTableProps) {
    // Reference to the scrolling element
    const tableContainerRef = React.useRef<HTMLDivElement>(null);

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
        useInfiniteQuery({
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
            initialData: {
                pages: [initialData],
                pageParams: [0],
            },
            refetchOnWindowFocus: false,
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
        columns: columns as ColumnDef<Client, unknown>[],
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
            columnFilters,
        },
        manualSorting: true,
        debugTable: true,
    });

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

    // Check on mount and after data changes if we need to fetch more
    React.useEffect(() => {
        fetchMoreOnBottomReached(tableContainerRef.current);
    }, [fetchMoreOnBottomReached]);

    if (isLoading && flatData.length === 0) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-4">
            <CompactTableOperations
                columns={columns}
                globalFilter={searchQuery}
                setGlobalFilter={handleSearchChange}
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
                    console.log("Apply clicked - refreshing data");
                    // In a real application, you might want to trigger a data refresh here
                }}
                showNewButton={true}
                onNewClick={() => {
                    console.log("New button clicked");
                    // In a real application, you might want to navigate to a create form or open a modal
                }}
            />

            <div className="flex items-center text-sm text-muted-foreground">
                ({flatData.length} of {totalRowCount} rows fetched)
            </div>

            <InfiniteDataTable
                columns={columns as ColumnDef<Client, unknown>[]}
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

            {/* Loading indicator is now handled by the InfiniteDataTable component */}
        </div>
    );
}
