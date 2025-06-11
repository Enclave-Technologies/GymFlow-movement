/**
 * Database configuration for workers
 * This module provides database connections without Next.js dependencies
 * for use in queue workers and other non-Next.js contexts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";
import {
    BMCMeasurements,
    ExercisePlanExercises,
    ExercisePlans,
    Exercises,
    Goals,
    Phases,
    Roles,
    Sessions,
    UserRoles,
    Users,
    WorkoutSessionDetails,
    WorkoutSessionsLog,
} from "./worker-schemas";

// Load environment variables for worker context
dotenv.config({ path: ".env.local" });

// Create a function to get the database connection for workers
export function createWorkerDb() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error("❌ DATABASE_URL environment variable is not set!");
        throw new Error("DATABASE_URL environment variable is required");
    }

    console.log(
        "🔧 Creating worker database connection with URL:",
        databaseUrl ? "***" : "undefined"
    );

    const pool = new Pool({
        connectionString: databaseUrl,
        max: 20,
        // Worker-specific pool settings
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    return drizzle(pool, {
        schema: {
            Roles,
            UserRoles,
            Users,
            Goals,
            ExercisePlans,
            Exercises,
            Phases,
            Sessions,
            ExercisePlanExercises,
            WorkoutSessionDetails,
            WorkoutSessionsLog,
            BMCMeasurements,
        },
    });
}

// Create a type for the database instance
type WorkerDbType = ReturnType<typeof createWorkerDb>;

// Lazy database connection for workers - only create when first accessed
let _workerDb: WorkerDbType | null = null;

export const workerDb = new Proxy({} as WorkerDbType, {
    get(_target, prop: string | symbol) {
        if (!_workerDb) {
            _workerDb = createWorkerDb();
        }
        return (_workerDb as WorkerDbType)[prop as keyof WorkerDbType];
    },
});

// Export the database instance as the default export for easy importing
export default workerDb;
