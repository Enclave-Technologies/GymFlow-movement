/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import * as React from "react";
import { useTableActions } from "@/hooks/use-table-actions";
import { InfiniteDataTable } from "@/components/ui/infinite-data-table";
import { Coach, CoachResponse, tableOperations } from "./columns";
import { motion } from "framer-motion";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ColumnDef,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import CompactTableOperations from "@/components/ui/compact-table-operations";
import { useRouter } from "next/navigation";

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
  const queryClient = useQueryClient();
  const router = useRouter();
  // Reference to the scrolling element
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  // State for row selection
  const [rowSelection, setRowSelection] = React.useState({});
  const [selectedRows, setSelectedRows] = React.useState<Coach[]>([]);

  // Placeholder mutation for bulk delete functionality
  const { mutate: bulkDelete } = useMutation({
    mutationFn: async (data: { coachIds: string[] }) => {
      console.log("Bulk delete coaches:", data.coachIds);
      // This is just a placeholder - no actual deletion happens yet
      return {
        success: true,
        message: `Deleted ${data.coachIds.length} coaches`,
      };
    },
    onSuccess: (data) => {
      toast.success(data.message);
      // Reset selection
      setRowSelection({});
      setSelectedRows([]);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ["allCoaches", urlParams, queryId],
      });
    },
    onError: (error) => {
      toast.error(`Error deleting coaches: ${error.message}`);
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
    useInfiniteQuery<CoachResponse>({
      queryKey: ["allCoaches", urlParams, queryId], //refetch when these change
      queryFn: async ({ pageParam = 0 }) => {
        // Add pageIndex to params but don't include it in URL
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
    columns: columns as ColumnDef<Coach, unknown>[],
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
    const selectedRowsData = Object.keys(rowSelection)
      .map((index) => flatData[parseInt(index)])
      .filter(Boolean) as Coach[];

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
    if (table.getRowModel().rows.length > 0 && rowVirtualizer.scrollToIndex) {
      rowVirtualizer.scrollToIndex(0);
    }
  }, [sorting, rowVirtualizer, table]);

  // Function to fetch more data when scrolling to bottom
  const fetchMoreOnBottomReached = React.useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        // Once the user has scrolled within 500px of the bottom, fetch more data
        if (
          scrollHeight - scrollTop - clientHeight < 500 &&
          !isFetchingNextPage &&
          totalFetched < totalRowCount
        ) {
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
            queryKey: ["allCoaches", urlParams, queryId],
          });
        }}
        showNewButton={true}
        onNewClick={() => {
          router.push("/add-trainer");
        }}
        showDeleteButton={true}
        selectedRows={selectedRows}
        onDeleteClick={(rows) => {
          if (rows.length > 0) {
            console.log("Delete button clicked for coaches", rows);
            // Call the mutation with the selected coach IDs
            bulkDelete({
              coachIds: rows.map((coach) => coach.userId),
            });
          }
        }}
        getRowSampleData={(rows) => (
          <ul className="text-sm">
            {rows.slice(0, 5).map((row) => (
              <li
                key={row.userId}
                className="mb-1 pb-1 border-b border-gray-100 last:border-0"
              >
                <div className="font-medium">{row.fullName}</div>
                <div className="text-xs text-muted-foreground">{row.email}</div>
              </li>
            ))}
            {rows.length > 5 && (
              <li className="text-xs text-muted-foreground mt-2">
                ...and {rows.length - 5} more
              </li>
            )}
          </ul>
        )}
      />

      <div className="flex items-center text-sm text-muted-foreground">
        ({flatData.length} of {totalRowCount} rows fetched)
      </div>

      <InfiniteDataTable
        columns={columns as ColumnDef<Coach, unknown>[]}
        rowVirtualizer={rowVirtualizer}
        tableContainerRef={tableContainerRef as React.RefObject<HTMLDivElement>}
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
