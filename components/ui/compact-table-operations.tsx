"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Search, Filter, ArrowUpDown, X, Trash2 } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "./button";
import { cn } from "@/lib/utils";

// Define the column config type with label
interface ColumnConfig {
    id: string;
    label: string;
}

interface CustomOperation<TData> {
    label: string;
    icon?: React.ReactNode;
    variant?:
        | "default"
        | "destructive"
        | "outline"
        | "secondary"
        | "ghost"
        | "link";
    onClick: (selectedRows: TData[]) => void;
    showConfirmation?: boolean;
    confirmationTitle?: string;
    confirmationDescription?: string;
    confirmationButtonText?: string;
    getRowSampleData?: (rows: TData[]) => React.ReactNode;
}

interface CompactTableOperationsProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    globalFilter: string;
    setGlobalFilter: (value: string) => void;
    onSortChange?: (columnId: string, desc: boolean) => void;
    onFilterChange?: (columnId: string, value: string) => void;
    onApplyClick?: () => void;
    showNewButton?: boolean;
    onNewClick?: () => void;
    className?: string;
    filterableColumns?: ColumnConfig[] | string[];
    sortableColumns?: ColumnConfig[] | string[];
    showDeleteButton?: boolean;
    onDeleteClick?: (selectedRows: TData[]) => void;
    selectedRows?: TData[];
    getRowSampleData?: (rows: TData[]) => React.ReactNode;
    customOperations?: CustomOperation<TData>[];
}

export default function CompactTableOperations<TData, TValue>({
    columns,
    globalFilter,
    setGlobalFilter,
    onSortChange,
    onFilterChange,
    onApplyClick,
    showNewButton = false,
    onNewClick,
    className = "",
    filterableColumns,
    sortableColumns,
    showDeleteButton = false,
    onDeleteClick,
    selectedRows = [],
    getRowSampleData,
    customOperations = [],
}: CompactTableOperationsProps<TData, TValue>) {
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [selectedFilterColumn, setSelectedFilterColumn] = useState<
        string | null
    >(null);
    const [selectedFilterLabel, setSelectedFilterLabel] = useState<
        string | null
    >(null);
    const [filterValue, setFilterValue] = useState("");
    const [selectedSortColumn, setSelectedSortColumn] = useState<string | null>(
        null
    );
    const [selectedSortLabel, setSelectedSortLabel] = useState<string | null>(
        null
    );
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [activeCustomOperation, setActiveCustomOperation] =
        useState<CustomOperation<TData> | null>(null);

    // Count active filters/sorts for badges
    const hasActiveFilter = selectedFilterColumn && filterValue;
    const hasActiveSort = !!selectedSortColumn;
    const hasActiveSearch = !!globalFilter;
    const hasAnyActive = hasActiveFilter || hasActiveSort || hasActiveSearch;

    // Helper function to check if a column is filterable
    const isColumnFilterable = (columnId: string): boolean => {
        if (!filterableColumns) return true;

        if (Array.isArray(filterableColumns) && filterableColumns.length > 0) {
            if (typeof filterableColumns[0] === "string") {
                return (filterableColumns as string[]).includes(columnId);
            } else {
                return (filterableColumns as ColumnConfig[]).some(
                    (config) => config.id === columnId
                );
            }
        }

        return true;
    };

    // Helper function to check if a column is sortable
    const isColumnSortable = (columnId: string): boolean => {
        if (!sortableColumns) return true;

        if (Array.isArray(sortableColumns) && sortableColumns.length > 0) {
            if (typeof sortableColumns[0] === "string") {
                return (sortableColumns as string[]).includes(columnId);
            } else {
                return (sortableColumns as ColumnConfig[]).some(
                    (config) => config.id === columnId
                );
            }
        }

        return true;
    };

    // Helper function to get column label
    const getColumnLabel = (
        columnId: string,
        isForFilter: boolean = true
    ): string => {
        const columnList = isForFilter ? filterableColumns : sortableColumns;

        if (
            columnList &&
            Array.isArray(columnList) &&
            columnList.length > 0 &&
            typeof columnList[0] !== "string"
        ) {
            const columnConfig = (columnList as ColumnConfig[]).find(
                (config) => config.id === columnId
            );
            return columnConfig?.label || columnId;
        }

        return columnId;
    };

    const toggleSearch = () => {
        setSearchExpanded(!searchExpanded);
        if (!searchExpanded) {
            // Focus the search input when expanded
            setTimeout(() => {
                const searchInput = document.getElementById("search-input");
                if (searchInput) searchInput.focus();
            }, 100);
        }
    };

    const clearSearch = () => {
        setGlobalFilter("");
    };

    const handleFilterColumnSelect = (columnId: string) => {
        setSelectedFilterColumn(columnId);
        setSelectedFilterLabel(getColumnLabel(columnId, true));
    };

    const handleSortColumnSelect = (columnId: string) => {
        if (selectedSortColumn === columnId) {
            // Toggle direction if same column is selected
            const newDirection = sortDirection === "asc" ? "desc" : "asc";
            setSortDirection(newDirection);
            onSortChange?.(columnId, newDirection === "desc");
        } else {
            setSelectedSortColumn(columnId);
            setSelectedSortLabel(getColumnLabel(columnId, false));
            setSortDirection("asc");
            onSortChange?.(columnId, false);
        }
    };

    const toggleSortDirection = () => {
        const newDirection = sortDirection === "asc" ? "desc" : "asc";
        setSortDirection(newDirection);
        if (selectedSortColumn) {
            onSortChange?.(selectedSortColumn, newDirection === "desc");
        }
    };

    const clearFilter = () => {
        setSelectedFilterColumn(null);
        setSelectedFilterLabel(null);
        setFilterValue("");
        setFilterPopoverOpen(false);
        onFilterChange?.("", "");
    };

    const clearSort = () => {
        setSelectedSortColumn(null);
        setSelectedSortLabel(null);
        onSortChange?.("", false);
    };

    const applyFilter = () => {
        if (selectedFilterColumn && filterValue) {
            onFilterChange?.(selectedFilterColumn, filterValue);
            setFilterPopoverOpen(false);
        }
    };

    const clearAll = () => {
        setSelectedFilterColumn(null);
        setSelectedFilterLabel(null);
        setFilterValue("");
        setSelectedSortColumn(null);
        setSelectedSortLabel(null);
        setSortDirection("asc");
        setGlobalFilter("");
        setFilterPopoverOpen(false);

        // Clear URL parameters
        const newSearchParams = new URLSearchParams();
        const pathname = window.location.pathname;
        window.history.replaceState(null, "", `${pathname}?${newSearchParams}`);

        // Notify parent components
        onFilterChange?.("", "");
        onSortChange?.("", false);

        // Force a refresh of the table data
        onApplyClick?.();
    };

    return (
        <div className={cn("flex flex-col space-y-2", className)}>
            {/* Toolbar - Always visible */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto flex-nowrap no-scrollbar h-12">
                {/* Left side - Action buttons and active filters/sorts */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Search button/input */}
                    {searchExpanded ? (
                        <div className="flex items-center">
                            <div className="relative">
                                <Input
                                    id="search-input"
                                    placeholder="Search..."
                                    className="h-8 w-[200px] pr-8"
                                    value={globalFilter}
                                    onChange={(e) =>
                                        setGlobalFilter(e.target.value)
                                    }
                                />
                                {globalFilter && (
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        onClick={clearSearch}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={toggleSearch}
                                className="ml-1 h-8 w-8"
                            >
                                <X size={16} />
                            </Button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="p-2 relative rounded-md hover:bg-muted"
                            onClick={toggleSearch}
                        >
                            <Search size={18} />
                            {hasActiveSearch && (
                                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                                    1
                                </Badge>
                            )}
                        </button>
                    )}

                    <Popover
                        open={filterPopoverOpen}
                        onOpenChange={setFilterPopoverOpen}
                    >
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="p-2 relative rounded-md hover:bg-muted"
                            >
                                <Filter size={18} />
                                {hasActiveFilter && (
                                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                                        1
                                    </Badge>
                                )}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-3" align="start">
                            <div className="space-y-3">
                                <div className="text-sm font-medium">
                                    Filter by column
                                </div>

                                {!selectedFilterColumn ? (
                                    <div className="grid gap-2 max-h-[200px] overflow-y-auto">
                                        {columns.length > 0 ? (
                                            columns
                                                .map((column) => {
                                                    // Extract column name from header or accessorKey
                                                    const columnId =
                                                        typeof column.header ===
                                                        "string"
                                                            ? column.header
                                                            : "accessorKey" in
                                                              column
                                                            ? String(
                                                                  column.accessorKey
                                                              )
                                                            : column.id ||
                                                              "Column";

                                                    // Skip columns that are not filterable
                                                    if (
                                                        !isColumnFilterable(
                                                            columnId
                                                        )
                                                    ) {
                                                        return null;
                                                    }

                                                    // Skip columns with enableColumnFilter explicitly set to false
                                                    if (
                                                        column.enableColumnFilter ===
                                                        false
                                                    ) {
                                                        return null;
                                                    }

                                                    const columnLabel =
                                                        getColumnLabel(
                                                            columnId,
                                                            true
                                                        );

                                                    return (
                                                        <Button
                                                            key={`filter-${columnId}`}
                                                            variant="outline"
                                                            size="sm"
                                                            className="justify-start font-normal"
                                                            onClick={() =>
                                                                handleFilterColumnSelect(
                                                                    columnId
                                                                )
                                                            }
                                                        >
                                                            {columnLabel}
                                                        </Button>
                                                    );
                                                })
                                                .filter(Boolean)
                                        ) : (
                                            <div className="text-sm text-muted-foreground">
                                                No columns available
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className="font-normal"
                                            >
                                                {selectedFilterLabel ||
                                                    selectedFilterColumn}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => {
                                                    setSelectedFilterColumn(
                                                        null
                                                    );
                                                    setSelectedFilterLabel(
                                                        null
                                                    );
                                                }}
                                            >
                                                <X size={14} />
                                            </Button>
                                        </div>

                                        <div className="relative">
                                            <Input
                                                id="filter-input"
                                                placeholder={`Filter by ${
                                                    selectedFilterLabel ||
                                                    selectedFilterColumn
                                                }...`}
                                                className="h-8 pr-8"
                                                value={filterValue}
                                                onChange={(e) =>
                                                    setFilterValue(
                                                        e.target.value
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        applyFilter();
                                                    }
                                                }}
                                                autoFocus
                                            />
                                            {filterValue && (
                                                <button
                                                    type="button"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    onClick={() =>
                                                        setFilterValue("")
                                                    }
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setFilterPopoverOpen(false)
                                                }
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={applyFilter}
                                                disabled={!filterValue}
                                            >
                                                Apply
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="p-2 relative rounded-md hover:bg-muted"
                            >
                                <ArrowUpDown size={18} />
                                {hasActiveSort && (
                                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                                        1
                                    </Badge>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {columns.length > 0 ? (
                                columns
                                    .map((column) => {
                                        // Extract column name from header or accessorKey
                                        const columnId =
                                            typeof column.header === "string"
                                                ? column.header
                                                : "accessorKey" in column
                                                ? String(column.accessorKey)
                                                : column.id || "Column";

                                        // Skip columns that are not sortable
                                        if (!isColumnSortable(columnId)) {
                                            return null;
                                        }

                                        // Skip columns with enableSorting explicitly set to false
                                        if (column.enableSorting === false) {
                                            return null;
                                        }

                                        const columnLabel = getColumnLabel(
                                            columnId,
                                            false
                                        );

                                        return (
                                            <DropdownMenuItem
                                                key={`sort-${columnId}`}
                                                onClick={() =>
                                                    handleSortColumnSelect(
                                                        columnId
                                                    )
                                                }
                                            >
                                                {columnLabel}
                                            </DropdownMenuItem>
                                        );
                                    })
                                    .filter(Boolean)
                            ) : (
                                <DropdownMenuItem disabled>
                                    No columns available
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Active filters/sorts chips - inline with toolbar */}
                    {hasActiveFilter && (
                        <div className="flex items-center bg-primary text-primary-foreground rounded-full h-8 px-3 text-xs">
                            <span className="font-medium mr-1">Filter:</span>
                            <span className="truncate max-w-[120px]">
                                {selectedFilterLabel || selectedFilterColumn} ={" "}
                                {filterValue}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 ml-1 -mr-1 text-primary-foreground hover:text-primary-foreground/80 hover:bg-transparent rounded-full"
                                onClick={clearFilter}
                            >
                                <X size={10} />
                            </Button>
                        </div>
                    )}

                    {hasActiveSort && (
                        <div className="flex items-center bg-primary text-primary-foreground rounded-full h-8 px-3 text-xs">
                            <span className="font-medium mr-1">Sort:</span>
                            <button
                                type="button"
                                className="flex items-center cursor-pointer hover:underline truncate max-w-[120px]"
                                onClick={toggleSortDirection}
                                title="Click to toggle sort direction"
                            >
                                <span>
                                    {selectedSortLabel || selectedSortColumn} (
                                    {sortDirection === "asc" ? "asc" : "desc"})
                                </span>
                                <ArrowUpDown
                                    size={10}
                                    className="ml-1 flex-shrink-0"
                                />
                            </button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 ml-1 -mr-1 text-primary-foreground hover:text-primary-foreground/80 hover:bg-transparent rounded-full flex-shrink-0"
                                onClick={clearSort}
                            >
                                <X size={10} />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Right side - Action buttons */}
                <div className="flex items-center gap-2">
                    {/* Custom operations - only shown if enabled and rows are selected */}
                    {customOperations &&
                        selectedRows.length > 0 &&
                        customOperations.map((operation, index) => (
                            <Button
                                key={`custom-op-${index}`}
                                type="button"
                                variant={operation.variant || "outline"}
                                size="sm"
                                className="h-8"
                                onClick={() => {
                                    if (operation.showConfirmation) {
                                        setActiveCustomOperation(operation);
                                    } else {
                                        operation.onClick(selectedRows);
                                    }
                                }}
                            >
                                {operation.icon && (
                                    <span className="mr-1">
                                        {operation.icon}
                                    </span>
                                )}
                                {operation.label} ({selectedRows.length})
                            </Button>
                        ))}

                    {/* Delete button - only shown if enabled and rows are selected */}
                    {showDeleteButton && selectedRows.length > 0 && (
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-8"
                            onClick={() => setDeleteDialogOpen(true)}
                        >
                            <Trash2 size={16} className="mr-1" />
                            Delete ({selectedRows.length})
                        </Button>
                    )}

                    {/* Apply button - always visible */}
                    <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="h-8"
                        onClick={onApplyClick}
                    >
                        Apply
                    </Button>

                    {/* Clear All button - only shown when there are active filters/sorts */}
                    {hasAnyActive && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={clearAll}
                        >
                            <X size={16} className="mr-1" />
                            Clear All
                        </Button>
                    )}

                    {/* New button - only shown if enabled, positioned at the very right */}
                    {showNewButton && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={onNewClick}
                        >
                            New
                        </Button>
                    )}
                </div>
            </div>

            {/* Delete confirmation dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            You are about to delete {selectedRows.length} record
                            {selectedRows.length !== 1 ? "s" : ""}. This action
                            cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Sample data preview */}
                    {getRowSampleData && selectedRows.length > 0 && (
                        <div className="my-4 max-h-[200px] overflow-y-auto border rounded-md p-3">
                            <h4 className="text-sm font-medium mb-2">
                                Sample of affected records:
                            </h4>
                            {getRowSampleData(selectedRows)}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                onDeleteClick?.(selectedRows);
                                setDeleteDialogOpen(false);
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Custom operation confirmation dialog */}
            <Dialog
                open={!!activeCustomOperation?.showConfirmation}
                onOpenChange={(open) => {
                    if (!open) setActiveCustomOperation(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {activeCustomOperation?.confirmationTitle ||
                                "Confirm Action"}
                        </DialogTitle>
                        <DialogDescription>
                            {activeCustomOperation?.confirmationDescription ||
                                `You are about to perform this action on ${
                                    selectedRows.length
                                } record${
                                    selectedRows.length !== 1 ? "s" : ""
                                }.`}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Sample data preview */}
                    {activeCustomOperation?.getRowSampleData &&
                        selectedRows.length > 0 && (
                            <div className="my-4 max-h-[200px] overflow-y-auto border rounded-md p-3">
                                <h4 className="text-sm font-medium mb-2">
                                    Sample of affected records:
                                </h4>
                                {activeCustomOperation.getRowSampleData(
                                    selectedRows
                                )}
                            </div>
                        )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setActiveCustomOperation(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant={
                                activeCustomOperation?.variant || "default"
                            }
                            onClick={() => {
                                if (activeCustomOperation) {
                                    activeCustomOperation.onClick(selectedRows);
                                }
                                setActiveCustomOperation(null);
                            }}
                        >
                            {activeCustomOperation?.confirmationButtonText ||
                                "Confirm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
