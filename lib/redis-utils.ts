// redis-config.js
import { ConnectionOptions } from "bullmq";
import dotenv from "dotenv";

// Load environment variables FIRST before any other imports
dotenv.config({ path: ".env.local" });

// Function to get Redis connection options dynamically
export function getRedisConnectionOptions(): ConnectionOptions {
    const options = {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        password: process.env.REDIS_PASSWORD || undefined,
        // Add other options like TLS if required by Sevalla's Redis
    };

    console.log("🔧 Getting Redis connection options:", {
        host: options.host,
        port: options.port,
        password: options.password ? "***" : "undefined",
    });

    return options;
}
