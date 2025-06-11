#!/usr/bin/env tsx

/**
 * Test Database Connection Script
 * 
 * This script tests if the database connection works in the worker context
 */

import dotenv from "dotenv";

// Load environment variables first
dotenv.config({ path: ".env.local" });

console.log("🔧 Environment variables loaded:");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "***" : "undefined");

// Import database after loading env vars
import { db } from "../db/xata";
import { Users } from "../db/schemas";

async function testDatabaseConnection() {
    try {
        console.log("🔍 Testing database connection...");
        
        // Simple query to test connection
        const result = await db.select().from(Users).limit(1);
        
        console.log("✅ Database connection successful!");
        console.log("📊 Query result:", result.length > 0 ? "Found users" : "No users found");
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Database connection failed:", error);
        process.exit(1);
    }
}

testDatabaseConnection();
