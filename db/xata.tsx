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
} from "./schemas";

// Load environment variables first (especially important for worker context)
dotenv.config({ path: ".env.local" });

// Create a function to get the database connection
// This way, the connection is only created when needed, not at import time
export function getDb() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error("❌ DATABASE_URL environment variable is not set!");
        throw new Error("DATABASE_URL environment variable is required");
    }

    console.log(
        "🔧 Creating database connection with URL:",
        databaseUrl ? "***" : "undefined"
    );

    const pool = new Pool({
        connectionString: databaseUrl,
        max: 20,
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
type DbType = ReturnType<typeof getDb>;

// Lazy database connection - only create when first accessed
let _db: DbType | null = null;

export const db = new Proxy({} as DbType, {
    get(_target, prop) {
        if (!_db) {
            _db = getDb();
        }
        return (_db as any)[prop];
    },
});
