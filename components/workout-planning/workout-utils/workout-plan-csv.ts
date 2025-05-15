import { Phase, Session, Exercise } from "../types";
import { v4 as uuidv4 } from "uuid";
import type { SelectExercise } from "@/db/schemas";

// Define the CSV column structure
export interface WorkoutPlanCsvRow {
    PhaseName: string;
    SessionName: string;
    ExerciseOrder: string;
    ExerciseDescription: string;
    SetsMin: string;
    SetsMax: string;
    RepsMin: string;
    RepsMax: string;
    Tempo: string;
    RestMin: string;
    RestMax: string;
    Customizations: string;
}

/**
 * Converts workout plan phases to CSV format
 * @param phases The workout plan phases to convert
 * @returns CSV string representation of the workout plan
 */
export function exportWorkoutPlanToCsv(phases: Phase[]): string {
    // Define CSV header
    const header = [
        "PhaseName",
        "SessionName",
        "ExerciseOrder",
        "ExerciseDescription",
        "Sets Min",
        "Sets Max",
        "Reps Min",
        "Reps Max",
        "Tempo",
        "Rest Min",
        "Rest Max",
        "Customizations",
    ].join(",");

    // Convert phases to CSV rows
    const rows: string[] = [];

    phases.forEach((phase) => {
        phase.sessions.forEach((session) => {
            session.exercises.forEach((exercise) => {
                const row = [
                    phase.name,
                    session.name,
                    exercise.order,
                    exercise.description,
                    exercise.setsMin || "",
                    exercise.setsMax || "",
                    exercise.repsMin || "",
                    exercise.repsMax || "",
                    exercise.tempo || "",
                    exercise.restMin || "",
                    exercise.restMax || "",
                    exercise.additionalInfo || exercise.customizations || "",
                ]
                    .map((value) => {
                        // Escape any commas in the values to prevent CSV format issues
                        return String(value).replace(/,/g, ";");
                    })
                    .join(",");

                rows.push(row);
            });
        });
    });

    // Combine header and rows
    return [header, ...rows].join("\n");
}

/**
 * Parses a CSV string into workout plan data
 * @param csvContent The CSV content to parse
 * @param exercisesList Optional list of exercises to match descriptions with
 * @returns Structured workout plan phases
 */
export function importWorkoutPlanFromCsv(
    csvContent: string,
    exercisesList?: SelectExercise[]
): Phase[] {
    // Split CSV into lines
    const lines = csvContent.split(/\r?\n/);

    // Extract header and validate format
    const header = lines[0].split(",");
    const expectedColumns = [
        "PhaseName",
        "SessionName",
        "ExerciseOrder",
        "ExerciseDescription",
        "Sets Min",
        "Sets Max",
        "Reps Min",
        "Reps Max",
        "Tempo",
        "Rest Min",
        "Rest Max",
        "Customizations",
    ];

    // Validate header columns
    const isValidFormat = expectedColumns.every((col) => header.includes(col));
    if (!isValidFormat) {
        throw new Error("Invalid CSV format. Please use the correct template.");
    }

    // Parse data rows
    const dataRows = lines.slice(1).filter((line) => line.trim() !== "");
    const csvRows: WorkoutPlanCsvRow[] = dataRows
        .map((line) => {
            // Skip completely empty rows
            if (line.trim() === "") return null;

            const values = line.split(",");

            // Skip rows that don't have enough data
            if (values.length < 4) return null;
            // Create a properly typed row object
            const row: Partial<WorkoutPlanCsvRow> = {};

            // Map each column to its corresponding property in WorkoutPlanCsvRow
            expectedColumns.forEach((column) => {
                const columnIndex = header.indexOf(column);
                const value =
                    columnIndex !== -1 ? values[columnIndex] || "" : "";

                // Type-safe assignment using type assertion for specific properties
                switch (column) {
                    case "PhaseName":
                        row.PhaseName = value;
                        break;
                    case "SessionName":
                        row.SessionName = value;
                        break;
                    case "ExerciseOrder":
                        row.ExerciseOrder = value;
                        break;
                    case "ExerciseDescription":
                        row.ExerciseDescription = value;
                        break;
                    case "Sets Min":
                        row.SetsMin = value;
                        break;
                    case "Sets Max":
                        row.SetsMax = value;
                        break;
                    case "Reps Min":
                        row.RepsMin = value;
                        break;
                    case "Reps Max":
                        row.RepsMax = value;
                        break;
                    case "Tempo":
                        row.Tempo = value;
                        break;
                    case "Rest Min":
                        row.RestMin = value;
                        break;
                    case "Rest Max":
                        row.RestMax = value;
                        break;
                    case "Customizations":
                        row.Customizations = value;
                        break;
                }
            });

            // Ensure all required properties are present
            return {
                PhaseName: row.PhaseName || "",
                SessionName: row.SessionName || "",
                ExerciseOrder: row.ExerciseOrder || "",
                ExerciseDescription: row.ExerciseDescription || "",
                SetsMin: row.SetsMin || "",
                SetsMax: row.SetsMax || "",
                RepsMin: row.RepsMin || "",
                RepsMax: row.RepsMax || "",
                Tempo: row.Tempo || "",
                RestMin: row.RestMin || "",
                RestMax: row.RestMax || "",
                Customizations: row.Customizations || "",
            };
        })
        .filter((row): row is WorkoutPlanCsvRow => row !== null);

    // Convert CSV rows to phases structure
    return convertCsvRowsToPhases(csvRows, exercisesList);
}

/**
 * Converts CSV rows to workout plan phases
 * @param csvRows The CSV rows to convert
 * @param exercisesList Optional list of exercises to match descriptions with
 * @returns Structured workout plan phases
 */
function convertCsvRowsToPhases(
    csvRows: WorkoutPlanCsvRow[],
    exercisesList?: SelectExercise[]
): Phase[] {
    const phases: Phase[] = [];
    const phaseMap = new Map<string, Phase>();
    const sessionMap = new Map<string, Session>();
    
    // Track phase and session order counters
    let phaseOrderCounter = 0;
    const sessionOrderCounters = new Map<string, number>();

    // Process each CSV row
    csvRows.forEach((row) => {
        const phaseName = row.PhaseName;
        const sessionName = row.SessionName;
        const phaseSessionKey = `${phaseName}|${sessionName}`;

        // Create or get phase
        let phase = phaseMap.get(phaseName);
        if (!phase) {
            phase = {
                id: uuidv4(),
                name: phaseName,
                isActive: false,
                isExpanded: true,
                orderNumber: phaseOrderCounter++, // Set order number for phase
                sessions: [],
            };
            phaseMap.set(phaseName, phase);
            phases.push(phase);
            
            // Initialize session order counter for this phase
            sessionOrderCounters.set(phaseName, 0);
        }

        // Create or get session
        let session = sessionMap.get(phaseSessionKey);
        if (!session) {
            // Get the current session order counter for this phase
            const sessionOrder = sessionOrderCounters.get(phaseName) || 0;
            
            session = {
                id: uuidv4(),
                name: sessionName,
                duration: 0, // Will be calculated later
                isExpanded: true,
                orderNumber: sessionOrder, // Set order number for session
                exercises: [],
            };
            
            // Increment the session order counter for this phase
            sessionOrderCounters.set(phaseName, sessionOrder + 1);
            
            sessionMap.set(phaseSessionKey, session);
            phase.sessions.push(session);
        }

        // Create exercise
        let motion = "";
        let targetArea = "";
        let exerciseId = "";

        // Try to find matching exercise in the exercises list
        if (
            exercisesList &&
            Array.isArray(exercisesList) &&
            exercisesList.length > 0
        ) {
            // First try exact match (case-insensitive)
            let matchingExercise = exercisesList.find(
                (ex) =>
                    ex.exerciseName &&
                    ex.exerciseName.toLowerCase().trim() ===
                        row.ExerciseDescription.toLowerCase().trim()
            );

            // If no exact match, try partial match
            if (!matchingExercise) {
                matchingExercise = exercisesList.find(
                    (ex) =>
                        ex.exerciseName &&
                        row.ExerciseDescription.toLowerCase().includes(
                            ex.exerciseName.toLowerCase()
                        )
                );
            }

            // If still no match, try the other way around
            if (!matchingExercise) {
                matchingExercise = exercisesList.find(
                    (ex) =>
                        ex.exerciseName &&
                        ex.exerciseName
                            .toLowerCase()
                            .includes(row.ExerciseDescription.toLowerCase())
                );
            }

            if (matchingExercise) {
                console.log(
                    `Matched exercise: "${row.ExerciseDescription}" with "${matchingExercise.exerciseName}"`
                );
                motion = matchingExercise.motion || "";
                targetArea = matchingExercise.targetArea || "";
                exerciseId = matchingExercise.exerciseId || "";
            } else {
                console.log(
                    `No match found for exercise: "${row.ExerciseDescription}"`
                );
            }
        }

        const exercise: Exercise = {
            id: uuidv4(),
            order: row.ExerciseOrder,
            motion: motion,
            targetArea: targetArea,
            exerciseId: exerciseId,
            description: row.ExerciseDescription,
            setsMin: row.SetsMin,
            setsMax: row.SetsMax,
            repsMin: row.RepsMin,
            repsMax: row.RepsMax,
            tempo: row.Tempo,
            restMin: row.RestMin,
            restMax: row.RestMax,
            additionalInfo: row.Customizations,
            duration: 0, // Will be calculated later
        };

        // Add exercise to session
        session.exercises.push(exercise);
    });

    // Sort phases by orderNumber
    phases.sort((a, b) => {
        return (a.orderNumber || 0) - (b.orderNumber || 0);
    });

    // Sort sessions within each phase by orderNumber
    phases.forEach(phase => {
        phase.sessions.sort((a, b) => {
            return (a.orderNumber || 0) - (b.orderNumber || 0);
        });
        
        // Sort exercises within each session by order
        phase.sessions.forEach(session => {
            session.exercises.sort((a, b) => {
                const orderA = parseInt(a.order) || 0;
                const orderB = parseInt(b.order) || 0;
                return orderA - orderB;
            });
        });
    });

    // Set the first phase as active
    if (phases.length > 0) {
        phases[0].isActive = true;
    }

    return phases;
}

/**
 * Downloads the workout plan as a CSV file
 * @param phases The workout plan phases to download
 * @param filename The name of the file to download
 */
export function downloadWorkoutPlanCsv(
    phases: Phase[],
    filename: string = "workout-plan.csv"
): void {
    const csvContent = exportWorkoutPlanToCsv(phases);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Converts exercises list to CSV format
 * @param exercises The exercises list to convert
 * @returns CSV string representation of the exercises
 */
export function exportExercisesToCsv(exercises: SelectExercise[]): string {
    const header = [
        // "ExerciseId",
        "ExerciseName",
        "Motion",
        "TargetArea",
    ].join(",");

    const rows = exercises.map((ex) =>
        [
            // ex.exerciseId || "",
            ex.exerciseName || "",
            ex.motion || "",
            ex.targetArea || "",
        ]
            .map((value) => String(value).replace(/,/g, ";"))
            .join(",")
    );

    return [header, ...rows].join("\n");
}

/**
 * Downloads the exercises list as a CSV file
 * @param exercises The exercises list to download
 * @param filename The name of the file to download
 */
export function downloadExercisesCsv(
    exercises: SelectExercise[],
    filename: string = "exercises.csv"
): void {
    const csvContent = exportExercisesToCsv(exercises);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
