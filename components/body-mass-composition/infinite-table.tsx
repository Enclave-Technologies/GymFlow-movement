/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import * as React from "react";
import { InfiniteDataTable } from "@/components/ui/infinite-data-table";
import { BMCRecord, BMCRecordResponse } from "./columns";
import { motion } from "framer-motion";
import {
    keepPreviousData,
    useInfiniteQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
    ColumnDef,
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    TableMeta,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { saveBMCRecord } from "@/actions/bmc_actions";

// Helper function to calculate BF% and LM
const calculateBfAndLm = (
    record: BMCRecord,
    age: number | null | undefined,
    initialIdealWeight: number | null | undefined
): { bf: number | null; lm: number | null } => {
    let idealWeight = initialIdealWeight;
    const {
        height,
        weight,
        pec,
        subscap,
        midax,
        supra,
        ubmil,
        triceps,
        calf,
        quad,
        ham,
    } = record;

    // Ensure all required values are present and are numbers
    const requiredSkinfolds = [
        pec,
        subscap,
        midax,
        supra,
        ubmil,
        triceps,
        calf,
        quad,
        ham,
    ];
    if (
        age === null ||
        age === undefined ||
        height === null ||
        weight === null ||
        requiredSkinfolds.some((sf) => sf === null)
    ) {
        return { bf: null, lm: null };
    }

    // Calculate idealWeight if not provided
    if (idealWeight === null || idealWeight === undefined) {
        idealWeight = 55 + (height - 160) / 2;
    }

    // Ensure calculated idealWeight is valid
    if (idealWeight === null || idealWeight === undefined) {
        return { bf: null, lm: null };
    }

    let bf: number | null = null;
    let lm: number | null = null;

    try {
        const bb = (Math.max(quad!, ham!) + quad!) / 2;
        const ai = Math.max(Math.pow(idealWeight / weight, 2), 1);
        const ap =
            pec! +
            subscap! +
            midax! +
            supra! +
            ubmil! +
            (triceps! + calf! + bb) * ai;
        const aj = (160 - height) / 400;
        const ak = 1 / (1 + aj);
        const bc = (1 + 0.195 * ap - 0.00024 * ap * ap) * 0.01;
        const bd = Math.max(age - 18, 0) * 0.8 * bc * bc;
        const calculatedBf = (bc * 100) / ak + bd;

        if (Number.isFinite(calculatedBf)) {
            bf = parseFloat(calculatedBf.toFixed(1)); // Store with 1 decimal place
            // Calculate Lean Mass (LM)
            lm = parseFloat(
                (weight - (weight * calculatedBf) / 100).toFixed(1)
            ); // Store with 1 decimal place
        }
    } catch (error) {
        console.error("Error calculating BF% and LM in updateData:", error);
        // bf and lm remain null
    }

    return { bf, lm };
};

interface InfiniteTableProps {
    fetchDataFn: (params: any) => Promise<any>;
    columns: ColumnDef<any, unknown>[];
    queryId?: string;
    clientId?: string;
    age?: number | null; // Add age prop
    idealWeight?: number | null; // Add idealWeight prop
}

export function InfiniteTable({
    fetchDataFn,
    columns,
    queryId = "default",
    clientId,
    age, // Destructure age
    idealWeight, // Destructure idealWeight
}: InfiniteTableProps) {
    const queryClient = useQueryClient();
    // Reference to the scrolling element
    const tableContainerRef = React.useRef<HTMLDivElement>(null);

    // State for row selection
    const [rowSelection, setRowSelection] = React.useState({});

    // State for editing
    const [data, setData] = React.useState<BMCRecord[]>([]);
    const [originalData, setOriginalData] = React.useState<BMCRecord[]>([]);
    const [unsavedChanges, setUnsavedChanges] = React.useState<boolean>(false);
    const [isSaving, setIsSaving] = React.useState<boolean>(false);

    // Use React Query for data fetching with infinite scroll
    const {
        data: queryData,
        fetchNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery<BMCRecordResponse>({
        queryKey: ["bmcRecords", queryId, clientId], //refetch when these change
        queryFn: async ({ pageParam = 0 }) => {
            // Add pageIndex and pageSize to params but don't include them in URL
            const params = {
                pageIndex: pageParam,
                pageSize: 50,
                clientId,
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

    // Flatten the data from all pages and update our state
    React.useEffect(() => {
        if (queryData) {
            const flattenedData = queryData.pages.flatMap((page) => page.data);
            setData(flattenedData);
            setOriginalData(JSON.parse(JSON.stringify(flattenedData)));
        }
    }, [queryData]);

    const totalRowCount = queryData?.pages[0]?.meta?.totalRowCount || 0;
    const totalFetched = data.length;

    // Function to add a new empty record
    const addNewRecord = () => {
        // Get height from the most recent previous record, if available
        const previousHeight = data.length > 0 ? data[0].height : null;

        const today = new Date();
        const newRecord: BMCRecord = {
            measurementId: `temp-${Date.now()}`,
            userId: clientId || "",
            date: today,
            height: previousHeight, // Use the retrieved previous height here
            weight: null,
            chin: null,
            cheek: null,
            pec: null,
            biceps: null,
            triceps: null,
            subscap: null,
            midax: null,
            supra: null,
            upperThigh: null,
            ubmil: null,
            knee: null,
            calf: null,
            quad: null,
            ham: null,
            // Add new girth measurements
            waist_girth: null,
            thigh_left_girth: null,
            thigh_right_girth: null,
            arm_left_girth: null,
            arm_right_girth: null,
            hip_girth: null,
            chest_girth: null,
            // End of new girth measurements
            bmi: null,
            bf: null,
            lm: null,
            photoPath: null,
            isNew: true,
            isEditing: true,
            isDirty: false,
        };

        setData([newRecord, ...data]);
        setUnsavedChanges(true);
    };

    // Function to update data in a row
    const updateData = (rowIndex: number, columnId: string, value: any) => {
        setData((old) => {
            const newData = [...old];
            newData[rowIndex] = {
                ...newData[rowIndex],
                [columnId]: value,
                isDirty: true,
            };

            const updatedRecord = newData[rowIndex];

            // Define columns that trigger BF% and LM recalculation
            const relevantColumns = [
                "height",
                "weight",
                "pec",
                "subscap",
                "midax",
                "supra",
                "ubmil",
                "triceps",
                "calf",
                "quad",
                "ham",
            ];

            // Recalculate BMI, BF%, and LM if a relevant column changed
            if (relevantColumns.includes(columnId)) {
                // BMI Calculation
                if (
                    updatedRecord.height &&
                    updatedRecord.weight &&
                    updatedRecord.height > 0
                ) {
                    const heightM = updatedRecord.height / 100;
                    updatedRecord.bmi = parseFloat(
                        (updatedRecord.weight / (heightM * heightM)).toFixed(1)
                    );
                } else if (updatedRecord.height === 0 && updatedRecord.weight) {
                    updatedRecord.bmi = 0;
                } else {
                    updatedRecord.bmi = null;
                }

                // BF% and LM Calculation using helper function
                const { bf: calculatedBf, lm: calculatedLm } = calculateBfAndLm(
                    updatedRecord,
                    age, // Use age from component props
                    idealWeight // Use idealWeight from component props
                );
                updatedRecord.bf = calculatedBf;
                updatedRecord.lm = calculatedLm;
            }

            setUnsavedChanges(true);
            return newData;
        });
    };

    // Function to handle edit action
    const handleEdit = (rowIndex: number) => {
        setData((old) => {
            const newData = [...old];
            newData[rowIndex] = {
                ...newData[rowIndex],
                isEditing: true,
                isDirty: false,
            };
            return newData;
        });
    };

    // Function to handle save action
    const handleSave = async (rowIndex: number) => {
        const record = data[rowIndex];
        if (!record.isDirty) return;

        setIsSaving(true);

        try {
            // Call the server action to save the data
            const result = await saveBMCRecord({
                measurementId: record.measurementId,
                userId: record.userId,
                date: record.date,
                height: record.height,
                weight: record.weight,
                chin: record.chin,
                cheek: record.cheek,
                pec: record.pec,
                biceps: record.biceps,
                triceps: record.triceps,
                subscap: record.subscap,
                midax: record.midax,
                supra: record.supra,
                upperThigh: record.upperThigh,
                ubmil: record.ubmil,
                knee: record.knee,
                calf: record.calf,
                quad: record.quad,
                ham: record.ham,
                // Add new girth measurements
                waist_girth: record.waist_girth,
                thigh_left_girth: record.thigh_left_girth,
                thigh_right_girth: record.thigh_right_girth,
                arm_left_girth: record.arm_left_girth,
                arm_right_girth: record.arm_right_girth,
                hip_girth: record.hip_girth,
                chest_girth: record.chest_girth,
                // End of new girth measurements
                bmi: record.bmi,
                bf: record.bf,
                lm: record.lm,
                photoPath: record.photoPath,
            });

            if (result.success) {
                toast.success(result.message);

                // Update the record with the saved data from the server
                setData((old) => {
                    const newData = [...old];
                    if (result.data) {
                        newData[rowIndex] = {
                            ...result.data,
                            measurementId: result.data.measurementId || "",
                            userId: result.data.userId || "",
                            date: result.data.date || new Date(),
                            isEditing: false,
                            isNew: false,
                            isDirty: false,
                        } as BMCRecord;
                    }
                    return newData;
                });

                // Update the original data to match the current state
                setOriginalData((old) => {
                    const newData = [...old];
                    if (!result.data) return newData;

                    if (record.isNew) {
                        // If it's a new record, add it to the original data
                        return [
                            {
                                ...result.data,
                                measurementId: result.data.measurementId || "",
                                userId: result.data.userId || "",
                                date: result.data.date || new Date(),
                            } as BMCRecord,
                            ...newData,
                        ];
                    } else {
                        // If it's an existing record, update it
                        const index = newData.findIndex(
                            (r) => r.measurementId === record.measurementId
                        );
                        if (index !== -1) {
                            newData[index] = {
                                ...result.data,
                                measurementId: result.data.measurementId || "",
                                userId: result.data.userId || "",
                                date: result.data.date || new Date(),
                            } as BMCRecord;
                        }
                        return newData;
                    }
                });

                // Check if we still have unsaved changes in other rows
                const stillHasUnsavedChanges = data.some(
                    (record, idx) =>
                        idx !== rowIndex && (record.isDirty || record.isNew)
                );
                setUnsavedChanges(stillHasUnsavedChanges);

                // Invalidate queries to refresh data from server
                queryClient.invalidateQueries({
                    queryKey: ["bmcRecords", queryId, clientId],
                });
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error(
                `Failed to save record: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        } finally {
            setIsSaving(false);
        }
    };

    // Function to handle cancel action
    const handleCancel = (rowIndex: number) => {
        const record = data[rowIndex];

        if (record.isNew) {
            // If it's a new record, remove it
            setData((old) => old.filter((_, idx) => idx !== rowIndex));
        } else {
            // If it's an existing record, revert to original
            setData((old) => {
                const newData = [...old];
                const originalRecord = originalData.find(
                    (r) => r.measurementId === record.measurementId
                );
                if (originalRecord) {
                    newData[rowIndex] = {
                        ...originalRecord,
                        isEditing: false,
                        isDirty: false,
                    };
                }
                return newData;
            });
        }

        // Check if we still have unsaved changes
        const stillHasUnsavedChanges = data.some(
            (record, idx) =>
                idx !== rowIndex && (record.isDirty || record.isNew)
        );
        setUnsavedChanges(stillHasUnsavedChanges);
    };

    // Create react-table instance with meta data for our custom actions
    const table = useReactTable({
        data,
        columns: columns as ColumnDef<BMCRecord, unknown>[],
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: {
            rowSelection,
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        manualSorting: true,
        meta: {
            updateData,
            onEdit: handleEdit,
            onSave: handleSave,
            onCancel: handleCancel,
            age, // Pass age to meta
            idealWeight, // Pass idealWeight to meta
        } as TableMeta<BMCRecord> & {
            age?: number | null;
            idealWeight?: number | null;
        }, // Extend TableMeta type
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
    }, [rowVirtualizer, table]);

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

    if (isLoading && data.length === 0) {
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
        <div className="space-y-4 pt-1">
            <div className="flex justify-between items-center">
                <div className="flex items-center text-sm text-muted-foreground">
                    ({data.length} of {totalRowCount} records)
                    {unsavedChanges && (
                        <span className="ml-2 text-yellow-600 font-medium">
                            * You have unsaved changes
                        </span>
                    )}
                </div>

                <Button
                    onClick={addNewRecord}
                    className="ml-auto"
                    disabled={isSaving}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Record
                </Button>
            </div>

            {/* Container with horizontal scroll */}
            <div className="w-full overflow-x-auto">
                <style jsx global>{`
                    /* Apply sticky styles to the last header and data cells */
                    table thead tr th:last-child,
                    table tbody tr td:last-child {
                        position: sticky !important; /* Use important to override potential conflicts */
                        right: 0 !important;
                        z-index: 10 !important; /* Ensure it stays on top */
                        background-color: var(
                            --background
                        ) !important; /* Match background */
                        box-shadow: -2px 0 4px rgba(0, 0, 0, 0.05) !important; /* Optional shadow for separation (negative x-offset for left side shadow) */
                    }
                `}</style>
                <InfiniteDataTable
                    columns={columns as ColumnDef<BMCRecord, unknown>[]}
                    rowVirtualizer={rowVirtualizer}
                    tableContainerRef={
                        tableContainerRef as React.RefObject<HTMLDivElement>
                    }
                    table={table}
                    rows={table.getRowModel().rows}
                    hasMore={totalFetched < totalRowCount}
                    isLoading={isFetchingNextPage || isSaving}
                    emptyMessage="No BMC records available. Click 'Add New Record' to create one."
                    onScroll={(e) => fetchMoreOnBottomReached(e.currentTarget)}
                    height="calc(100vh - 290px)"
                    // Apply min-width and full width to ensure proper table layout
                    className="min-w-[400px] w-full"
                    headerJustifyContent="center"
                    cellJustifyContent="center"
                />
            </div>
        </div>
    );
}
