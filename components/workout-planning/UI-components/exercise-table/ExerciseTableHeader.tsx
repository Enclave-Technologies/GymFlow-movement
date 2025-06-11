import React from "react";
import {
    TableHeader,
    TableRow,
    TableHead,
} from "@/components/ui/table";

/**
 * Exercise table header component
 * Defines the column structure for the exercise table
 */
const ExerciseTableHeader: React.FC = () => {
    return (
        <TableHeader className="bg-muted sticky top-0 z-10">
            <TableRow>
                <TableHead className="w-[80px] min-w-[80px]">
                    Order
                </TableHead>
                <TableHead className="min-w-[200px] max-w-[300px]">
                    <div>Description</div>
                </TableHead>
                <TableHead className="min-w-[120px] max-w-[150px] hidden sm:table-cell">
                    <div>Motion</div>
                </TableHead>
                <TableHead className="min-w-[120px] max-w-[150px] hidden md:table-cell">
                    <div>Target Area</div>
                </TableHead>
                <TableHead className="min-w-[100px] max-w-[120px]">
                    <div>Sets</div>
                    <div className="text-xs text-muted-foreground">
                        (min-max)
                    </div>
                </TableHead>
                <TableHead className="min-w-[100px] max-w-[120px]">
                    <div>Reps</div>
                    <div className="text-xs text-muted-foreground">
                        (min-max)
                    </div>
                </TableHead>
                <TableHead className="min-w-[100px] max-w-[120px] hidden lg:table-cell">
                    <div>Tempo</div>
                </TableHead>
                <TableHead className="min-w-[100px] max-w-[120px]">
                    <div>Rest</div>
                    <div className="text-xs text-muted-foreground">
                        (min-max)
                    </div>
                </TableHead>
                <TableHead className="min-w-[80px] max-w-[100px] hidden xl:table-cell">
                    TUT
                </TableHead>
                <TableHead className="min-w-[150px] max-w-[200px] hidden lg:table-cell">
                    <div>Additional Instructions</div>
                </TableHead>
                <TableHead className="text-right sticky right-0 bg-muted z-20 w-[120px] min-w-[120px]">
                    Actions
                </TableHead>
            </TableRow>
        </TableHeader>
    );
};

export default ExerciseTableHeader;
