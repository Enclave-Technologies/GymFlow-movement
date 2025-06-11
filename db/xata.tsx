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

// Export the db instance for convenience, but only create it when used
// export const db =
//     process.env.NODE_ENV === "production"
//         ? getDb()
//         : (null as unknown as DbType); // This will be replaced with the actual db instance in production

export const db: DbType = getDb();
