import { Exercise, Phase, Session } from "../types";

/**
 * Returns a complete Exercise object by filling in missing fields with default values.
 *
 * Ensures all required and optional fields are present, assigning sensible defaults for legacy and new fields to support both backward compatibility and current data requirements.
 *
 * @param exercise - A partial Exercise object with any subset of fields.
 * @returns An Exercise object with all fields populated.
 */
export function addExerciseDefaults(exercise: Partial<Exercise>): Exercise {
    return {
        id: exercise.id || "",
        exerciseId: exercise.exerciseId || "",
        order: exercise.order || "",
        motion: exercise.motion || "Unspecified",
        targetArea: exercise.targetArea || "Unspecified",
        description: exercise.description || "New Exercise",
        duration: exercise.duration || 8,
        // Ensure sessionId is set
        sessionId: exercise.sessionId || "",

        // Legacy fields for backward compatibility
        sets: exercise.sets || "3-5",
        reps: exercise.reps || "8-12",
        rest: exercise.rest || "45-60",

        // New fields with defaults
        setsMin: exercise.setsMin || "3",
        setsMax: exercise.setsMax || "5",
        repsMin: exercise.repsMin || "8",
        repsMax: exercise.repsMax || "12",
        tempo: exercise.tempo || "3 0 1 0",
        restMin: exercise.restMin || "45",
        restMax: exercise.restMax || "60",
        additionalInfo: exercise.additionalInfo || "",
        customizations: exercise.customizations || "",
        notes: exercise.notes || "",
    };
}

/**
 * Converts a string-based order identifier (e.g., "A0", "B1") into a numeric value for database storage.
 *
 * If the input is already numeric, it is returned as a number. Otherwise, the alphabetical prefix is interpreted as a base-26 number and combined with the numeric suffix, allocating 100 numeric slots per letter sequence.
 *
 * @param order - The string order identifier to convert.
 * @returns The numeric representation of the order.
 */
export function convertOrderToNumber(order: string): number {
    if (!order) return 0;

    // If it's already a number, return it
    if (!isNaN(Number(order))) {
        return Number(order);
    }

    // Handle lexicographical ordering like 'A0', 'B1', etc.
    // Extract the letter and number parts
    const letterPart = order.match(/[A-Za-z]+/)?.[0] || "";
    const numberPart = order.match(/\d+/)?.[0] || "0";

    // Convert letter to a base-26 number (A=0, B=1, ..., Z=25)
    let letterValue = 0;
    for (let i = 0; i < letterPart.length; i++) {
        const charCode = letterPart.toUpperCase().charCodeAt(i) - 65; // 'A' is 65
        letterValue = letterValue * 26 + charCode;
    }

    // Combine letter value and number part
    // Multiply letter value by 100 to leave room for 100 numeric values per letter
    return letterValue * 100 + parseInt(numberPart, 10);
}

/**
 * Converts a frontend Exercise object to a database-compatible format.
 *
 * Converts the string-based order to a numeric value, parses numeric string fields to integers or null, and maps all relevant properties for database storage. The original order string is preserved as `setOrderMarker`.
 *
 * @returns An object representing the exercise in database format.
 */
export function mapExerciseToDb(exercise: Exercise): Record<string, unknown> {
    return {
        id: exercise.id,
        sessionId: exercise.sessionId,
        exerciseId: exercise.exerciseId,
        // Convert string order to number
        exerciseOrder: convertOrderToNumber(exercise.order),
        // Store the original string order as setOrderMarker
        setOrderMarker: exercise.order,
        // Map other fields
        targetArea: exercise.targetArea,
        motion: exercise.motion,
        setsMin: exercise.setsMin ? parseInt(exercise.setsMin, 10) : null,
        setsMax: exercise.setsMax ? parseInt(exercise.setsMax, 10) : null,
        repsMin: exercise.repsMin ? parseInt(exercise.repsMin, 10) : null,
        repsMax: exercise.repsMax ? parseInt(exercise.repsMax, 10) : null,
        tempo: exercise.tempo,
        restMin: exercise.restMin ? parseInt(exercise.restMin, 10) : null,
        restMax: exercise.restMax ? parseInt(exercise.restMax, 10) : null,
        customizations: exercise.customizations || exercise.additionalInfo,
        notes: exercise.notes,
    };
}

/**
 * Converts a frontend Session object to a database-compatible format.
 *
 * Maps session fields to database keys, converting the name to `sessionName`, duration to `sessionTime`, and ensuring `orderNumber` defaults to 0 if not provided.
 *
 * @returns An object representing the session in database format.
 */
export function mapSessionToDb(session: Session): Record<string, unknown> {
    return {
        id: session.id,
        phaseId: session.phaseId,
        sessionName: session.name,
        sessionTime: session.duration,
        orderNumber: session.orderNumber || 0,
    };
}

/**
 * Converts a frontend Phase object to a database-compatible format.
 *
 * Maps the phase's id, planId, name (as phaseName), orderNumber (defaulting to 0 if missing), and isActive status to a plain object suitable for database storage.
 *
 * @returns An object representing the phase in database format.
 */
export function mapPhaseToDb(phase: Phase): Record<string, unknown> {
    return {
        id: phase.id,
        planId: phase.planId,
        phaseName: phase.name,
        orderNumber: phase.orderNumber || 0,
        isActive: phase.isActive,
    };
}

/**
 * Checks whether an Exercise object has all required fields and valid numeric values.
 *
 * Returns `true` if the exercise has non-empty `id`, `exerciseId`, and `sessionId` fields, and if any present numeric fields (`setsMin`, `setsMax`, `repsMin`, `repsMax`, `restMin`, `restMax`) are valid numbers; otherwise returns `false`.
 */
export function validateExercise(exercise: Exercise): boolean {
    // Check for required fields
    if (!exercise.id || !exercise.exerciseId || !exercise.sessionId) {
        console.error("Missing required exercise fields:", exercise);
        return false;
    }

    // Validate numeric fields
    const numericFields = [
        { field: exercise.setsMin, name: "setsMin" },
        { field: exercise.setsMax, name: "setsMax" },
        { field: exercise.repsMin, name: "repsMin" },
        { field: exercise.repsMax, name: "repsMax" },
        { field: exercise.restMin, name: "restMin" },
        { field: exercise.restMax, name: "restMax" },
    ];

    for (const { field, name } of numericFields) {
        if (field && isNaN(Number(field))) {
            console.error(`Invalid ${name} value:`, field);
            return false;
        }
    }

    return true;
}

/**
 * Checks whether a session object contains all required fields.
 *
 * @param session - The session object to validate.
 * @returns True if both {@link session.id} and {@link session.phaseId} are present; otherwise, false.
 */
export function validateSession(session: Session): boolean {
    // Check for required fields
    if (!session.id || !session.phaseId) {
        console.error("Missing required session fields:", session);
        return false;
    }

    return true;
}

/**
 * Checks whether a phase object contains all required fields.
 *
 * @param phase - The phase object to validate.
 * @returns True if both {@link phase.id} and {@link phase.planId} are present; otherwise, false.
 */
export function validatePhase(phase: Phase): boolean {
    // Check for required fields
    if (!phase.id || !phase.planId) {
        console.error("Missing required phase fields:", phase);
        return false;
    }

    return true;
}

/**
 * Computes the differences between two arrays of phases, identifying added, updated, and deleted phases.
 *
 * @returns An object containing arrays of added phases, updated phases with their changed fields, and IDs of deleted phases.
 *
 * @remark The `updated` array includes only phases with changes in `name`, `isActive`, or `orderNumber`, and always includes `planId` in the changes for downstream processing.
 */
export function diffPhases(
    dbPhases: Phase[],
    fePhases: Phase[]
): {
    added: Phase[];
    updated: { id: string; changes: Partial<Phase> }[];
    deleted: string[];
} {
    const dbMap = new Map(dbPhases.map((p) => [p.id, p]));
    const feMap = new Map(fePhases.map((p) => [p.id, p]));

    // Added: in FE but not in DB
    const added = fePhases.filter((p) => !dbMap.has(p.id));

    // Deleted: in DB but not in FE
    const deleted = dbPhases.filter((p) => !feMap.has(p.id)).map((p) => p.id);

    // Updated: in both, but with changed fields
    const updated: { id: string; changes: Partial<Phase> }[] = [];
    for (const fePhase of fePhases) {
        const dbPhase = dbMap.get(fePhase.id);
        if (dbPhase) {
            const changes: Partial<Phase> = {};
            if (fePhase.name !== dbPhase.name) changes.name = fePhase.name;
            if (fePhase.isActive !== dbPhase.isActive)
                changes.isActive = fePhase.isActive;
            if (fePhase.orderNumber !== dbPhase.orderNumber)
                changes.orderNumber = fePhase.orderNumber;
            // Always include planId in changes for downstream logic
            changes.planId = fePhase.planId;
            // planId and isExpanded are not compared (planId is static, isExpanded is UI only)
            if (Object.keys(changes).length > 0) {
                updated.push({ id: fePhase.id, changes });
            }
        }
    }

    return { added, updated, deleted };
}

/**
 * Computes the differences between database and frontend session arrays.
 *
 * Returns an object containing sessions added in the frontend, deleted from the frontend, and updated in the frontend compared to the database. Updates include only changed fields (name, duration, orderNumber), and always include phaseId for downstream processing.
 *
 * @returns An object with `added`, `updated`, and `deleted` session entries.
 */
export function diffSessions(
    dbSessions: Session[],
    feSessions: Session[]
): {
    added: Session[];
    updated: { id: string; changes: Partial<Session> }[];
    deleted: string[];
} {
    const dbMap = new Map(dbSessions.map((s) => [s.id, s]));
    const feMap = new Map(feSessions.map((s) => [s.id, s]));

    // Added: in FE but not in DB
    const added = feSessions.filter((s) => !dbMap.has(s.id));

    // Deleted: in DB but not in FE
    const deleted = dbSessions.filter((s) => !feMap.has(s.id)).map((s) => s.id);

    // Updated: in both, but with changed fields
    const updated: { id: string; changes: Partial<Session> }[] = [];
    for (const feSession of feSessions) {
        const dbSession = dbMap.get(feSession.id);
        if (dbSession) {
            const changes: Partial<Session> = {};
            if (feSession.name !== dbSession.name)
                changes.name = feSession.name;
            if (feSession.duration !== dbSession.duration)
                changes.duration = feSession.duration;
            if (feSession.orderNumber !== dbSession.orderNumber)
                changes.orderNumber = feSession.orderNumber;
            // Always include phaseId in changes for downstream logic
            changes.phaseId = feSession.phaseId;
            // phaseId and isExpanded are not compared (phaseId is static, isExpanded is UI only)
            if (Object.keys(changes).length > 0) {
                updated.push({ id: feSession.id, changes });
            }
        }
    }

    return { added, updated, deleted };
}

/**
 * Computes the differences between two arrays of exercises, identifying added, updated, and deleted exercises.
 *
 * @returns An object containing arrays of added exercises, updated exercises with their changed fields, and IDs of deleted exercises.
 *
 * @remark Only specific fields are compared for updates: order, motion, targetArea, exerciseId, setsMin, setsMax, repsMin, repsMax, tempo, tut, restMin, restMax, customizations, and notes. The sessionId is always included in the update payload for downstream processing, but is not compared for changes. Fields such as description, additionalInfo, duration, sets, and reps are ignored in the comparison.
 */
export function diffExercises(
    dbExercises: Exercise[],
    feExercises: Exercise[]
): {
    added: Exercise[];
    updated: { id: string; changes: Partial<Exercise> }[];
    deleted: string[];
} {
    const dbMap = new Map(dbExercises.map((e) => [e.id, e]));
    const feMap = new Map(feExercises.map((e) => [e.id, e]));

    // Added: in FE but not in DB
    const added = feExercises.filter((e) => !dbMap.has(e.id));

    // Deleted: in DB but not in FE
    const deleted = dbExercises
        .filter((e) => !feMap.has(e.id))
        .map((e) => e.id);

    // Updated: in both, but with changed fields
    const updated: { id: string; changes: Partial<Exercise> }[] = [];
    for (const feExercise of feExercises) {
        const dbExercise = dbMap.get(feExercise.id);
        if (dbExercise) {
            const changes: Partial<Exercise> = {};
            if (feExercise.order !== dbExercise.order)
                changes.order = feExercise.order;
            if (feExercise.motion !== dbExercise.motion)
                changes.motion = feExercise.motion;
            if (feExercise.targetArea !== dbExercise.targetArea)
                changes.targetArea = feExercise.targetArea;
            if (feExercise.exerciseId !== dbExercise.exerciseId)
                changes.exerciseId = feExercise.exerciseId;
            if (feExercise.setsMin !== dbExercise.setsMin)
                changes.setsMin = feExercise.setsMin;
            if (feExercise.setsMax !== dbExercise.setsMax)
                changes.setsMax = feExercise.setsMax;
            if (feExercise.repsMin !== dbExercise.repsMin)
                changes.repsMin = feExercise.repsMin;
            if (feExercise.repsMax !== dbExercise.repsMax)
                changes.repsMax = feExercise.repsMax;
            if (feExercise.tempo !== dbExercise.tempo)
                changes.tempo = feExercise.tempo;
            if (feExercise.tut !== dbExercise.tut) changes.tut = feExercise.tut;
            if (feExercise.restMin !== dbExercise.restMin)
                changes.restMin = feExercise.restMin;
            if (feExercise.restMax !== dbExercise.restMax)
                changes.restMax = feExercise.restMax;
            if (feExercise.customizations !== dbExercise.customizations)
                changes.customizations = feExercise.customizations;
            if (feExercise.additionalInfo !== dbExercise.customizations)
                changes.customizations = feExercise.additionalInfo;
            if (feExercise.notes !== dbExercise.notes)
                changes.notes = feExercise.notes;
            // Always include sessionId in changes for downstream logic
            changes.sessionId = feExercise.sessionId;
            // sessionId, description, additionalInfo, duration, sets, reps are not compared (sessionId is static, others are UI only/legacy)
            if (Object.keys(changes).length > 0) {
                updated.push({ id: feExercise.id, changes });
            }
        }
    }

    return { added, updated, deleted };
}
