"use client";

import React, { useEffect, useRef } from "react"; // Import useEffect and useRef
import { ColumnDef, Row } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { MoreHorizontal, Edit, Save, X, Trash2 } from "lucide-react";
import { format } from "date-fns";

// Define the BMC record type to match what comes from the database
export type BMCRecord = {
    measurementId: string;
    userId: string;
    date: Date;
    height: number | null;
    weight: number | null;
    chin: number | null;
    cheek: number | null;
    pec: number | null;
    biceps: number | null;
    triceps: number | null;
    subscap: number | null;
    midax: number | null;
    supra: number | null;
    upperThigh: number | null;
    ubmil: number | null;
    knee: number | null;
    calf: number | null;
    quad: number | null;
    ham: number | null;
    // Add new girth measurements
    waistGirth: number | null;
    leftThighGirth: number | null;
    rightThighGirth: number | null;
    leftArmGirth: number | null;
    rightArmGirth: number | null;
    hipGirth: number | null;
    chestGirth: number | null;
    // End of new girth measurements
    bmi: number | null;
    bf: number | null; // Body Fat %
    lm: number | null; // Lean Mass
    photoPath: string | null;
    isNew?: boolean;
    isEditing?: boolean;
    isDirty?: boolean;
};

export type BMCRecordResponse = {
    data: BMCRecord[];
    meta: {
        totalRowCount: number;
    };
};

// Define the table meta type for TypeScript
export interface BMCTableMeta {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
    onEdit: (rowIndex: number) => void;
    onSave: (rowIndex: number) => void;
    onCancel: (rowIndex: number) => void;
    onDelete: (rowIndex: number) => void;
    age?: number | null; // Add age from meta
    idealWeight?: number | null; // Add idealWeight from meta
}

// Component for the editable cell
function EditableCell({
    value,
    onChange,
    isEditing,
    autoFocus = false, // Add autoFocus prop
}: {
    value: number | null;
    onChange: (value: number | null) => void;
    isEditing: boolean;
    autoFocus?: boolean; // Define prop type
}) {
    const inputRef = useRef<HTMLInputElement>(null); // Create ref

    // Effect to focus the input when editing starts and autoFocus is true
    useEffect(() => {
        if (isEditing && autoFocus && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select(); // Select text for easy replacement
        }
    }, [isEditing, autoFocus]);

    return isEditing ? (
        <Input
            ref={inputRef} // Assign ref
            type="number"
            value={value === null ? "" : value}
            onChange={(e) => {
                const val =
                    e.target.value === "" ? null : parseFloat(e.target.value);
                onChange(val);
            }}
            className="h-8 w-full text-center"
            step="0.1"
        />
    ) : (
        <div className="text-center">{value === null ? "—" : value}</div>
    );
}

// Component for the Actions cell
function ActionsCell({
    row,
    onEdit,
    onSave,
    onCancel,
    onDelete,
}: {
    row: Row<BMCRecord>;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    onDelete: () => void;
}) {
    const isEditing = row.original.isEditing;
    const isDirty = row.original.isDirty;

    if (isEditing) {
        return (
            <div className="flex justify-center space-x-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 p-0 text-green-600"
                    onClick={onSave}
                    disabled={!isDirty}
                >
                    <Save className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 p-0 text-red-600"
                    onClick={onCancel}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={onDelete}
                    className="text-red-600 focus:text-red-700"
                >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// Define which columns can be filtered and sorted with user-friendly labels
export const tableOperations = {
    filterableColumns: [
        { id: "date", label: "Date" },
        { id: "weight", label: "Weight" },
        { id: "bmi", label: "BMI" },
        { id: "bf", label: "Body Fat %" },
    ],
    sortableColumns: [
        { id: "date", label: "Date" },
        { id: "weight", label: "Weight" },
        { id: "height", label: "Height" },
        { id: "bmi", label: "BMI" },
        { id: "bf", label: "Body Fat %" },
        { id: "lm", label: "Lean Mass" },
    ],
};

export const columns: ColumnDef<BMCRecord>[] = [
    {
        accessorKey: "date",
        header: () => <div className="text-center">Date</div>,
        cell: ({ row, table }) => {
            const value = row.getValue("date") as Date;
            const isEditing = row.original.isEditing;

            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            if (isEditing && updateData) {
                return (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "justify-start text-left font-normal h-8",
                                    !value && "text-muted-foreground"
                                )}
                            >
                                {value ? (
                                    format(new Date(value), "MMM d, yyyy")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-auto p-0 z-50 mt-2 min-w-[250px]"
                            align="start"
                        >
                            <Calendar
                                mode="single"
                                selected={value ? new Date(value) : undefined}
                                onSelect={(date) => {
                                    if (date) {
                                        updateData(row.index, "date", date);
                                    }
                                }}
                            />
                        </PopoverContent>
                    </Popover>
                );
            }

            return (
                <div className="text-center flex justify-center">
                    {value ? format(new Date(value), "MMM d, yyyy") : "—"}
                </div>
            );
        },
        size: 120,
    },
    {
        accessorKey: "height",
        header: () => (
            <div className="text-center">
                <div>Height</div>
                <div className="text-xs font-normal">(cm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("height") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        autoFocus={true} // Pass autoFocus prop for height column
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "height", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "weight",
        header: () => (
            <div className="text-center">
                <div>Weight</div>
                <div className="text-xs font-normal">(kg)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("weight") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "weight", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "bmi",
        header: () => <div className="text-center">BMI</div>,
        cell: ({ row }) => {
            const height = row.original.height;
            const weight = row.original.weight;
            let bmi: number | null = null;

            if (height && weight && height > 0) {
                const heightM = height / 100; // Convert cm to meters
                bmi = Number((weight / (heightM * heightM)).toFixed(2));
            } else if (height === 0 && weight) {
                bmi = 0; // Return 0 if height is 0 but weight is present
            }

            return (
                <div className="text-center flex justify-center">
                    {bmi === null ? "—" : bmi.toFixed(1)}
                </div>
            );
        },
        size: 80,
    },
    {
        accessorKey: "bf",
        header: () => (
            <div className="text-center">
                <div>Body Fat</div>
                <div className="text-xs font-normal"> (%)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const meta = table.options.meta as BMCTableMeta | undefined;
            const age = meta?.age;
            let idealWeight = meta?.idealWeight;

            const {
                height,
                weight,
                pec,
                subscap,
                midax,
                supra,
                ubmil, // Corrected typo from 'umbil' in formula description to match type
                triceps,
                calf,
                quad,
                ham,
            } = row.original;

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
                return <div className="text-center flex justify-center">—</div>;
            }

            // Calculate idealWeight if not provided
            if (
                idealWeight === null ||
                idealWeight === undefined ||
                idealWeight === 0
            ) {
                idealWeight = 55 + (height - 160) / 2;
            }

            // Ensure calculated idealWeight is valid
            if (idealWeight === null || idealWeight === undefined) {
                return <div className="text-center flex justify-center">—</div>;
            }

            // Calculate BF% step-by-step
            try {
                const bb = (Math.max(quad!, ham!) + quad!) / 2; // quad and ham are checked for null above
                const ai = Math.max(Math.pow(idealWeight / weight, 2), 1);
                const ap =
                    pec! +
                    subscap! +
                    midax! +
                    supra! +
                    ubmil! +
                    (triceps! + calf! + bb) * ai; // Skinfolds checked for null above
                const aj = (160 - height) / 400;
                const ak = 1 / (1 + aj); // Potential division by zero if aj = -1 (height = 560cm) - unlikely but good to note
                const bc = (1 + 0.195 * ap - 0.00024 * ap * ap) * 0.01;
                const bd = Math.max(age - 18, 0) * 0.8 * bc * bc; // Ensure age factor is not negative
                const bf = (bc * 100) / ak + bd;

                // Check for NaN or Infinity
                if (!Number.isFinite(bf)) {
                    return (
                        <div className="text-center flex justify-center">—</div>
                    );
                }

                return (
                    <div className="text-center flex justify-center">
                        {bf.toFixed(1)}
                    </div>
                );
            } catch (error) {
                console.error("Error calculating BF%:", error);
                return (
                    <div className="text-center flex justify-center">Error</div>
                );
            }
        },
        size: 100,
    },
    {
        accessorKey: "lm",
        header: () => (
            <div className="text-center">
                <div>Lean Mass</div>
                <div className="text-xs font-normal"> (kg)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const meta = table.options.meta as BMCTableMeta | undefined;
            const age = meta?.age;
            let idealWeight = meta?.idealWeight;

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
            } = row.original;

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
                return <div className="text-center flex justify-center">—</div>;
            }

            // Calculate idealWeight if not provided
            if (idealWeight === null || idealWeight === undefined) {
                idealWeight = 55 + (height - 160) / 2;
            }

            // Ensure calculated idealWeight is valid
            if (idealWeight === null || idealWeight === undefined) {
                return <div className="text-center flex justify-center">—</div>;
            }

            // Recalculate BF% to ensure consistency
            let bf: number | null = null;
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
                bf = (bc * 100) / ak + bd;

                if (!Number.isFinite(bf)) {
                    bf = null; // Reset bf if calculation failed
                }
            } catch (error) {
                console.error("Error recalculating BF% for LM:", error);
                bf = null; // Ensure bf is null if calculation fails
            }

            // Calculate Lean Mass (LM)
            let lm: number | null = null;
            if (bf !== null && weight !== null) {
                lm = weight - (weight * bf) / 100;
            }

            return (
                <div className="text-center flex justify-center">
                    {lm === null ? "—" : lm.toFixed(1)}
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "chin",
        header: () => (
            <div className="text-center">
                <div>Chin</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("chin") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "chin", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "cheek",
        header: () => (
            <div className="text-center">
                <div>Cheek</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("cheek") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "cheek", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "pec",
        header: () => (
            <div className="text-center">
                <div>Pec</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("pec") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "pec", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "biceps",
        header: () => (
            <div className="text-center">
                <div>Biceps</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("biceps") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "biceps", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "triceps",
        header: () => (
            <div className="text-center">
                <div>Triceps</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("triceps") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "triceps", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "subscap",
        header: () => (
            <div className="text-center">
                <div>Subscap</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("subscap") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "subscap", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "midax",
        header: () => (
            <div className="text-center">
                <div>Midax</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("midax") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "midax", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "supra",
        header: () => (
            <div className="text-center">
                <div>Supra</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("supra") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "supra", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "upperThigh",
        header: () => (
            <div className="text-center">
                <div>Upper Thigh</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("upperThigh") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "upperThigh", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 120,
    },
    {
        accessorKey: "ubmil",
        header: () => (
            <div className="text-center">
                <div>Umbilical</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("ubmil") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "ubmil", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "knee",
        header: () => (
            <div className="text-center">
                <div>Knee</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("knee") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "knee", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "calf",
        header: () => (
            <div className="text-center">
                <div>Calf</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("calf") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "calf", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "quad",
        header: () => (
            <div className="text-center">
                <div>Quad</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("quad") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "quad", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "ham",
        header: () => (
            <div className="text-center">
                <div>Ham</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("ham") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "ham", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "waistGirth",
        header: () => (
            <div className="text-center">
                <div>Waist</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("waistGirth") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "waistGirth", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "leftThighGirth",
        header: () => (
            <div className="text-center">
                <div>Left Thigh</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("leftThighGirth") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(
                                    row.index,
                                    "leftThighGirth",
                                    newValue
                                );
                            }
                        }}
                    />
                </div>
            );
        },
        size: 120,
    },
    {
        accessorKey: "rightThighGirth",
        header: () => (
            <div className="text-center">
                <div>Right Thigh</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("rightThighGirth") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(
                                    row.index,
                                    "rightThighGirth",
                                    newValue
                                );
                            }
                        }}
                    />
                </div>
            );
        },
        size: 120,
    },
    {
        accessorKey: "leftArmGirth",
        header: () => (
            <div className="text-center">
                <div>Left Arm</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("leftArmGirth") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(
                                    row.index,
                                    "leftArmGirth",
                                    newValue
                                );
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "rightArmGirth",
        header: () => (
            <div className="text-center">
                <div>Right Arm</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("rightArmGirth") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(
                                    row.index,
                                    "rightArmGirth",
                                    newValue
                                );
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "hipGirth",
        header: () => (
            <div className="text-center">
                <div>Hip</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("hipGirth") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "hipGirth", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    {
        accessorKey: "chestGirth",
        header: () => (
            <div className="text-center">
                <div>Chest</div>
                <div className="text-xs font-normal">(mm)</div>
            </div>
        ),
        cell: ({ row, table }) => {
            const value = row.getValue("chestGirth") as number | null;
            const isEditing = row.original.isEditing;
            const updateData = (table.options.meta as BMCTableMeta | undefined)
                ?.updateData;

            return (
                <div className="text-center flex justify-center">
                    <EditableCell
                        value={value}
                        isEditing={!!isEditing}
                        onChange={(newValue) => {
                            if (updateData) {
                                updateData(row.index, "chestGirth", newValue);
                            }
                        }}
                    />
                </div>
            );
        },
        size: 100,
    },
    // End of new girth measurement columns
    {
        id: "actions",
        header: () => <div className="text-center">Actions</div>,
        cell: ({ row, table }) => {
            const meta = table.options.meta as BMCTableMeta | undefined;

            return (
                <div className="flex justify-center">
                    <ActionsCell
                        row={row}
                        onEdit={() => meta?.onEdit?.(row.index)}
                        onSave={() => meta?.onSave?.(row.index)}
                        onCancel={() => meta?.onCancel?.(row.index)}
                        onDelete={() => meta?.onDelete?.(row.index)}
                    />
                </div>
            );
        },
        enableSorting: false,
        enableColumnFilter: false,
        size: 80,
        meta: {
            className: "sticky right-0 bg-background z-10",
        },
    },
];
