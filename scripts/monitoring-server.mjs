/**
 * Standalone Bull Board Monitoring Server
 *
 * This script creates a standalone Express server for Bull Board dashboard
 * that can run alongside your Next.js application.
 *
 * Usage: node scripts/monitoring-server.js
 */

import express from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { ExpressAdapter } from "@bull-board/express";
import { Queue } from "bullmq";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Redis connection configuration
const redisConnectionOptions = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
};

// Create queue instance
const messageQueue = new Queue("messageQueue", {
    connection: redisConnectionOptions,
});

// Create Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
    queues: [new BullMQAdapter(messageQueue)],
    serverAdapter: serverAdapter,
});

// Create Express app
const app = express();
const PORT = process.env.BULL_BOARD_PORT || 3001;

// Basic authentication middleware (optional)
const basicAuth = (req, res, next) => {
    // Skip auth in development
    if (process.env.NODE_ENV !== "production") {
        return next();
    }

    const auth = req.headers.authorization;
    if (!auth) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Bull Board"');
        return res.status(401).send("Authentication required");
    }

    const credentials = Buffer.from(auth.split(" ")[1], "base64")
        .toString()
        .split(":");
    const username = credentials[0];
    const password = credentials[1];

    // Check credentials (you should use environment variables for these)
    const validUsername = process.env.BULL_BOARD_USERNAME || "admin";
    const validPassword = process.env.BULL_BOARD_PASSWORD || "admin123";

    if (username === validUsername && password === validPassword) {
        next();
    } else {
        res.setHeader("WWW-Authenticate", 'Basic realm="Bull Board"');
        res.status(401).send("Invalid credentials");
    }
};

// Apply authentication middleware
app.use("/admin/queues", basicAuth);

// Mount Bull Board
app.use("/admin/queues", serverAdapter.getRouter());

// Health check endpoint
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        queues: ["messageQueue"],
        redis: {
            host: redisConnectionOptions.host,
            port: redisConnectionOptions.port,
        },
    });
});

// Root endpoint with information
app.get("/", (_req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Queue Monitoring Server</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 800px;
                    margin: 50px auto;
                    padding: 20px;
                    line-height: 1.6;
                }
                .header { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
                .link { 
                    display: inline-block;
                    background: #007bff;
                    color: white;
                    padding: 10px 20px;
                    text-decoration: none;
                    border-radius: 4px;
                    margin: 10px 10px 10px 0;
                }
                .link:hover { background: #0056b3; }
                .info { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; }
                .status { color: #28a745; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🚀 Queue Monitoring Server</h1>
                <p class="status">Status: Running on port ${PORT}</p>
            </div>
            
            <div class="info">
                <h3>📊 Available Dashboards</h3>
                <a href="/admin/queues" class="link">🎛️ Bull Board Dashboard</a>
                <a href="/health" class="link">❤️ Health Check</a>
            </div>
            
            <div class="info">
                <h3>🔧 Configuration</h3>
                <ul>
                    <li><strong>Redis Host:</strong> ${
                        redisConnectionOptions.host
                    }</li>
                    <li><strong>Redis Port:</strong> ${
                        redisConnectionOptions.port
                    }</li>
                    <li><strong>Environment:</strong> ${
                        process.env.NODE_ENV || "development"
                    }</li>
                    <li><strong>Authentication:</strong> ${
                        process.env.NODE_ENV === "production"
                            ? "Enabled"
                            : "Disabled (dev mode)"
                    }</li>
                </ul>
            </div>
            
            <div class="info">
                <h3>🔗 Integration</h3>
                <p>This monitoring server runs alongside your Next.js application and provides real-time queue monitoring capabilities.</p>
                <p>Access the dashboard from your main application at: <code>http://localhost:${PORT}/admin/queues</code></p>
            </div>
        </body>
        </html>
    `);
});

// Error handling
app.use((err, _req, res) => {
    console.error("Monitoring server error:", err);
    res.status(500).json({
        error: "Internal server error",
        message: err.message,
        timestamp: new Date().toISOString(),
    });
});

// Start server
app.listen(PORT, () => {
    console.log(
        `🚀 Bull Board monitoring server running on http://localhost:${PORT}`
    );
    console.log(
        `📊 Dashboard available at: http://localhost:${PORT}/admin/queues`
    );
    console.log(`❤️ Health check at: http://localhost:${PORT}/health`);

    if (process.env.NODE_ENV === "production") {
        console.log(
            `🔒 Authentication enabled - use credentials from environment variables`
        );
    } else {
        console.log(`🔓 Authentication disabled in development mode`);
    }

    console.log(
        `🔗 Redis connection: ${redisConnectionOptions.host}:${redisConnectionOptions.port}`
    );
});

// Graceful shutdown
process.on("SIGTERM", () => {
    console.log("📴 Shutting down monitoring server...");
    process.exit(0);
});

process.on("SIGINT", () => {
    console.log("📴 Shutting down monitoring server...");
    process.exit(0);
});
