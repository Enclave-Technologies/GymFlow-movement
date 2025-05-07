import { Phase, Session, Exercise, WorkoutPlanChanges } from "./types";

/**
 * Tracks changes to a workout plan by comparing the current state with the previous state
 * This allows us to send only the changes to the server, rather than the entire plan
 */
export class WorkoutPlanChangeTracker {
    private previousPhases: Phase[] = [];
    private currentPhases: Phase[] = [];
    private changes: WorkoutPlanChanges = {
        created: {
            phases: [],
            sessions: [],
            exercises: [],
        },
        updated: {
            phases: [],
            sessions: [],
            exercises: [],
        },
        deleted: {
            phases: [],
            sessions: [],
            exercises: [],
        },
    };

    /**
     * Initialize the change tracker with the current state of the workout plan
     * @param phases The current phases of the workout plan
     */
    constructor(phases: Phase[]) {
        this.previousPhases = this.deepClone(phases);
        this.currentPhases = this.deepClone(phases);
    }

    /**
     * Update the current state of the workout plan and track changes
     * @param phases The new current state of the workout plan
     * @returns The changes detected between the previous and current state
     */
    updateCurrentState(phases: Phase[]): WorkoutPlanChanges {
        this.previousPhases = this.deepClone(this.currentPhases);
        this.currentPhases = this.deepClone(phases);
        this.detectChanges();
        return this.changes;
    }

    /**
     * Get the current tracked changes without updating the state
     * @returns The current tracked changes
     */
    getChanges(): WorkoutPlanChanges {
        return this.changes;
    }

    /**
     * Reset the change tracker to a clean state
     * @param phases The current phases to use as the baseline
     */
    reset(phases: Phase[]): void {
        this.previousPhases = this.deepClone(phases);
        this.currentPhases = this.deepClone(phases);
        this.resetChanges();
    }

    /**
     * Deep clone an object to avoid reference issues
     * @param obj The object to clone
     * @returns A deep clone of the object
     */
    private deepClone<T>(obj: T): T {
        // Use a more efficient deep clone for large objects
        // This is faster than JSON.parse(JSON.stringify()) for large objects
        if (obj === null || obj === undefined) return obj;

        // Handle Date objects
        if (obj instanceof Date) {
            return new Date(obj.getTime()) as unknown as T;
        }

        // Handle arrays with optimized approach for better performance
        if (Array.isArray(obj)) {
            // Pre-allocate array for better performance
            const length = obj.length;
            const result = new Array(length);
            for (let i = 0; i < length; i++) {
                result[i] = this.deepClone(obj[i]);
            }
            return result as unknown as T;
        }

        // Handle objects with optimized approach
        if (typeof obj === "object") {
            // Use Object.create(null) for faster object creation without prototype
            const result = Object.create(null) as Record<string, unknown>;
            // Use Object.keys for better performance than for...in
            const keys = Object.keys(obj as object);
            const keysLength = keys.length;

            for (let i = 0; i < keysLength; i++) {
                const key = keys[i];
                result[key] = this.deepClone(
                    (obj as Record<string, unknown>)[key]
                );
            }
            return result as T;
        }

        // Handle primitives
        return obj;
    }

    /**
     * Reset the changes to an empty state
     */
    private resetChanges(): void {
        this.changes = {
            created: {
                phases: [],
                sessions: [],
                exercises: [],
            },
            updated: {
                phases: [],
                sessions: [],
                exercises: [],
            },
            deleted: {
                phases: [],
                sessions: [],
                exercises: [],
            },
        };
    }

    /**
     * Detect changes between the previous and current state
     * Optimized implementation with Map lookups for better performance
     */
    private detectChanges(): void {
        this.resetChanges();

        // Estimate capacity for maps and sets based on previous data
        // const estimatedPhaseCount = Math.max(
        //     this.previousPhases.length,
        //     this.currentPhases.length
        // );
        // const estimatedSessionCount = estimatedPhaseCount * 10; // Assuming ~10 sessions per phase
        // const estimatedExerciseCount = estimatedSessionCount * 15; // Assuming ~15 exercises per session

        // Create maps for faster lookups with pre-allocated capacity
        const prevPhaseMap = new Map<string, Phase>();
        const currPhaseMap = new Map<string, Phase>();
        const prevSessionMap = new Map<
            string,
            { session: Session; phaseId: string }
        >();
        const prevExerciseMap = new Map<
            string,
            { exercise: Exercise; sessionId: string; phaseId: string }
        >();

        // Use Sets for faster lookups of IDs
        const currSessionIds = new Set<string>();
        const currExerciseIds = new Set<string>();

        // Pre-allocate arrays for changes to avoid resizing
        this.changes.created.phases = new Array<Phase>();
        this.changes.updated.phases = new Array<{
            id: string;
            changes: Partial<Phase>;
        }>();
        this.changes.deleted.phases = new Array<string>();
        this.changes.created.sessions = new Array<{
            phaseId: string;
            session: Session;
        }>();
        this.changes.updated.sessions = new Array<{
            id: string;
            changes: Partial<Session>;
        }>();
        this.changes.deleted.sessions = new Array<string>();
        this.changes.created.exercises = new Array<{
            sessionId: string;
            exercise: Exercise;
        }>();
        this.changes.updated.exercises = new Array<{
            id: string;
            changes: Partial<Exercise>;
        }>();
        this.changes.deleted.exercises = new Array<string>();

        // Populate phase maps
        const prevPhasesLength = this.previousPhases.length;
        const currPhasesLength = this.currentPhases.length;

        // Populate previous phase map - process all previous data in a single pass
        for (let i = 0; i < prevPhasesLength; i++) {
            const phase = this.previousPhases[i];
            prevPhaseMap.set(phase.id, phase);

            // Populate session and exercise maps from previous state
            const sessionsLength = phase.sessions.length;
            for (let j = 0; j < sessionsLength; j++) {
                const session = phase.sessions[j];
                prevSessionMap.set(session.id, { session, phaseId: phase.id });

                const exercisesLength = session.exercises.length;
                for (let k = 0; k < exercisesLength; k++) {
                    const exercise = session.exercises[k];
                    prevExerciseMap.set(exercise.id, {
                        exercise,
                        sessionId: session.id,
                        phaseId: phase.id,
                    });
                }
            }
        }

        // Populate current phase map and process changes
        for (let i = 0; i < currPhasesLength; i++) {
            const phase = this.currentPhases[i];
            currPhaseMap.set(phase.id, phase);

            // Check if phase is new or updated
            if (!prevPhaseMap.has(phase.id)) {
                // New phase
                this.changes.created.phases.push(phase);
            } else {
                // Existing phase - check for updates
                const prevPhase = prevPhaseMap.get(phase.id);
                if (prevPhase && this.hasPhaseChanged(prevPhase, phase)) {
                    this.changes.updated.phases.push({
                        id: phase.id,
                        changes: {
                            name: phase.name,
                            isActive: phase.isActive,
                            isExpanded: phase.isExpanded,
                        },
                    });
                }
            }

            // Process sessions in this phase
            const sessionsLength = phase.sessions.length;
            for (let j = 0; j < sessionsLength; j++) {
                const session = phase.sessions[j];
                currSessionIds.add(session.id);

                if (!prevSessionMap.has(session.id)) {
                    // New session
                    this.changes.created.sessions.push({
                        phaseId: phase.id,
                        session,
                    });
                } else {
                    // Existing session - check for updates
                    const prevSessionData = prevSessionMap.get(session.id);
                    if (prevSessionData && prevSessionData.session) {
                        const prevSession = prevSessionData.session;
                        if (this.hasSessionChanged(prevSession, session)) {
                            this.changes.updated.sessions.push({
                                id: session.id,
                                changes: {
                                    name: session.name,
                                    duration: session.duration,
                                    isExpanded: session.isExpanded,
                                },
                            });
                        }
                    }
                }

                // Process exercises in this session - batch process exercises
                const exercises = session.exercises;
                const exercisesLength = exercises.length;

                // Pre-allocate batch arrays for better performance
                const newExercises = [];
                const updatedExercises = [];

                for (let k = 0; k < exercisesLength; k++) {
                    const exercise = exercises[k];
                    currExerciseIds.add(exercise.id);

                    if (!prevExerciseMap.has(exercise.id)) {
                        // New exercise - collect for batch processing
                        newExercises.push({
                            sessionId: session.id,
                            exercise,
                        });
                    } else {
                        // Existing exercise - check for updates
                        const prevExerciseData = prevExerciseMap.get(
                            exercise.id
                        );
                        if (prevExerciseData && prevExerciseData.exercise) {
                            const prevExercise = prevExerciseData.exercise;
                            if (
                                this.hasExerciseChanged(prevExercise, exercise)
                            ) {
                                // Updated exercise - collect for batch processing
                                updatedExercises.push({
                                    id: exercise.id,
                                    changes: this.getExerciseChanges(
                                        prevExercise,
                                        exercise
                                    ),
                                });
                            }
                        }
                    }
                }

                // Batch add new exercises
                if (newExercises.length > 0) {
                    this.changes.created.exercises.push(...newExercises);
                }

                // Batch add updated exercises
                if (updatedExercises.length > 0) {
                    this.changes.updated.exercises.push(...updatedExercises);
                }
            }
        }

        // Detect deleted items by comparing previous and current IDs
        // Process deletions in batches for better performance
        const deletedPhases = [];
        const deletedSessions = [];
        const deletedExercises = [];

        // Find deleted phases
        for (const [phaseId] of prevPhaseMap.entries()) {
            if (!currPhaseMap.has(phaseId)) {
                deletedPhases.push(phaseId);
            }
        }

        // Find deleted sessions
        for (const [sessionId] of prevSessionMap.entries()) {
            if (!currSessionIds.has(sessionId)) {
                deletedSessions.push(sessionId);
            }
        }

        // Find deleted exercises
        for (const [exerciseId] of prevExerciseMap.entries()) {
            if (!currExerciseIds.has(exerciseId)) {
                deletedExercises.push(exerciseId);
            }
        }

        // Batch add deletions
        if (deletedPhases.length > 0) {
            this.changes.deleted.phases.push(...deletedPhases);
        }

        if (deletedSessions.length > 0) {
            this.changes.deleted.sessions.push(...deletedSessions);
        }

        if (deletedExercises.length > 0) {
            this.changes.deleted.exercises.push(...deletedExercises);
        }
    }

    /**
     * Check if a phase has changed
     * @param prev The previous phase
     * @param curr The current phase
     * @returns True if the phase has changed
     */
    private hasPhaseChanged(prev: Phase, curr: Phase): boolean {
        return (
            prev.name !== curr.name ||
            prev.isActive !== curr.isActive ||
            prev.isExpanded !== curr.isExpanded
        );
    }

    /**
     * Check if a session has changed
     * @param prev The previous session
     * @param curr The current session
     * @returns True if the session has changed
     */
    private hasSessionChanged(prev: Session, curr: Session): boolean {
        return (
            prev.name !== curr.name ||
            prev.duration !== curr.duration ||
            prev.isExpanded !== curr.isExpanded
        );
    }

    /**
     * Check if an exercise has changed
     * @param prev The previous exercise
     * @param curr The current exercise
     * @returns True if the exercise has changed
     */
    private hasExerciseChanged(prev: Exercise, curr: Exercise): boolean {
        // Compare all properties that might change
        return (
            prev.order !== curr.order ||
            prev.motion !== curr.motion ||
            prev.targetArea !== curr.targetArea ||
            prev.description !== curr.description ||
            prev.exerciseId !== curr.exerciseId ||
            prev.sets !== curr.sets ||
            prev.reps !== curr.reps ||
            prev.tut !== curr.tut ||
            prev.tempo !== curr.tempo ||
            prev.rest !== curr.rest ||
            prev.additionalInfo !== curr.additionalInfo ||
            prev.customizations !== curr.customizations ||
            prev.setsMin !== curr.setsMin ||
            prev.setsMax !== curr.setsMax ||
            prev.repsMin !== curr.repsMin ||
            prev.repsMax !== curr.repsMax ||
            prev.restMin !== curr.restMin ||
            prev.restMax !== curr.restMax ||
            prev.notes !== curr.notes
        );
    }

    /**
     * Get the changes between two exercises
     * @param prev The previous exercise
     * @param curr The current exercise
     * @returns A partial exercise with only the changed properties
     */
    private getExerciseChanges(
        prev: Exercise,
        curr: Exercise
    ): Partial<Exercise> {
        const changes: Partial<Exercise> = {};

        // Only include properties that have changed
        if (prev.order !== curr.order) changes.order = curr.order;
        if (prev.motion !== curr.motion) changes.motion = curr.motion;
        if (prev.targetArea !== curr.targetArea)
            changes.targetArea = curr.targetArea;
        if (prev.description !== curr.description)
            changes.description = curr.description;
        if (prev.exerciseId !== curr.exerciseId) 
            changes.exerciseId = curr.exerciseId;
        if (prev.sets !== curr.sets) changes.sets = curr.sets;
        if (prev.reps !== curr.reps) changes.reps = curr.reps;
        if (prev.tut !== curr.tut) changes.tut = curr.tut;
        if (prev.tempo !== curr.tempo) changes.tempo = curr.tempo;
        if (prev.rest !== curr.rest) changes.rest = curr.rest;
        if (prev.additionalInfo !== curr.additionalInfo)
            changes.additionalInfo = curr.additionalInfo;
        if (prev.customizations !== curr.customizations)
            changes.customizations = curr.customizations;
        if (prev.setsMin !== curr.setsMin) changes.setsMin = curr.setsMin;
        if (prev.setsMax !== curr.setsMax) changes.setsMax = curr.setsMax;
        if (prev.repsMin !== curr.repsMin) changes.repsMin = curr.repsMin;
        if (prev.repsMax !== curr.repsMax) changes.repsMax = curr.repsMax;
        if (prev.restMin !== curr.restMin) changes.restMin = curr.restMin;
        if (prev.restMax !== curr.restMax) changes.restMax = curr.restMax;
        if (prev.notes !== curr.notes) changes.notes = curr.notes;

        return changes;
    }
}
