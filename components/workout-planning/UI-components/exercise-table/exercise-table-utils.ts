import type { SelectExercise } from "@/db/schemas";

/**
 * Utility functions for exercise table operations
 */

/**
 * Derive unique motion options from the exercises list
 */
export const getUniqueMotions = (exercisesList: SelectExercise[] = []): string[] => {
    if (!exercisesList || !Array.isArray(exercisesList)) return [];

    const motions = exercisesList
        .map((ex) => ex.motion)
        .filter(
            (motion): motion is string =>
                motion !== null && motion !== undefined
        );
    return [...new Set(motions)].sort();
};

/**
 * Derive unique target area options from the exercises list
 */
export const getUniqueTargetAreas = (
    exercisesList: SelectExercise[] = []
): string[] => {
    if (!exercisesList || !Array.isArray(exercisesList)) return [];

    const targetAreas = exercisesList
        .map((ex) => ex.targetArea)
        .filter((area): area is string => area !== null && area !== undefined);
    return [...new Set(targetAreas)].sort();
};

/**
 * Calculate TUT (Time Under Tension) for an exercise
 */
export const calculateTUT = (
    tempo: string = "3 0 1 0",
    setsMax: string | number = 5,
    repsMax: string | number = 12
): number => {
    // Extract all numbers from the tempo string
    const numbers = tempo.match(/\d+/g) || [];
    const tempoSum = numbers.reduce(
        (sum, num) => sum + parseInt(num, 10),
        0
    );

    const sets = Number(setsMax);
    const reps = Number(repsMax);
    return tempoSum * sets * reps;
};
