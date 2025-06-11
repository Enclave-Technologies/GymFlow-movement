import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandInput,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import type { SelectExercise } from "@/db/schemas";

interface ExerciseDropdownProps {
    exercises: SelectExercise[];
    selectedDescription: string;
    onExerciseSelect: (exercise: SelectExercise) => void;
    placeholder?: string;
}

/**
 * Exercise selection dropdown component
 * Provides searchable exercise selection with autocomplete
 */
const ExerciseDropdown: React.FC<ExerciseDropdownProps> = ({
    exercises,
    selectedDescription,
    onExerciseSelect,
    placeholder = "Select exercise...",
}) => {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Memoize filtered exercises based on search term
    const filteredExercises = useMemo(
        () =>
            exercises?.filter((ex) =>
                ex.exerciseName.toLowerCase().includes(searchTerm.toLowerCase())
            ) || [],
        [exercises, searchTerm]
    );

    const handleExerciseSelect = (exercise: SelectExercise) => {
        onExerciseSelect(exercise);
        setOpen(false);
        setSearchTerm(""); // Reset search term
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selectedDescription || placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0">
                <Command>
                    <CommandInput
                        placeholder="Search exercises..."
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                    />
                    <CommandEmpty>
                        No exercise found.
                    </CommandEmpty>
                    <CommandGroup className="max-h-[350px] overflow-auto">
                        {filteredExercises.map((ex) => (
                            <CommandItem
                                key={ex.exerciseId}
                                value={ex.exerciseName}
                                onSelect={() => handleExerciseSelect(ex)}
                                className="cursor-pointer"
                            >
                                <div className="flex flex-col">
                                    <span className="font-medium">
                                        {ex.exerciseName}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {ex.motion} • {ex.targetArea}
                                    </span>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default ExerciseDropdown;
