#!/usr/bin/env node

/**
 * Redis Analysis Script - Check what's using Redis memory
 * Run with: node scripts/redis-analysis.js
 */

const Redis = require("ioredis");
require("dotenv").config({ path: ".env.local" });

const redisConnectionOptions = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
};

console.log("🔧 Analyzing Redis with options:", {
    host: redisConnectionOptions.host,
    port: redisConnectionOptions.port,
    password: redisConnectionOptions.password ? "***" : "none",
});

async function analyzeRedis() {
    const redis = new Redis(redisConnectionOptions);

    try {
        console.log("\n📊 Getting Redis info...");

        // Get all keys
        console.log("\n🔍 Scanning all Redis keys...");
        const keys = await redis.keys("*");
        console.log(`Total keys: ${keys.length}`);

        // Analyze key patterns
        const keyPatterns = {};
        const keyDetails = [];

        for (const key of keys) {
            // Get key type
            const type = await redis.type(key);

            keyDetails.push({
                key,
                type,
            });

            // Group by pattern
            const pattern = key.split(":")[0] || "other";
            if (!keyPatterns[pattern]) {
                keyPatterns[pattern] = { count: 0 };
            }
            keyPatterns[pattern].count++;
        }

        console.log("\n📈 All keys found:");
        keyDetails.forEach((item, index) => {
            console.log(`${index + 1}. ${item.key} (${item.type})`);
        });

        console.log("\n📊 Key count by pattern:");
        Object.entries(keyPatterns)
            .sort(([, a], [, b]) => b.count - a.count)
            .forEach(([pattern, data]) => {
                console.log(`${pattern}: ${data.count} keys`);
            });

        // Check for BullMQ specific keys
        console.log("\n🔍 BullMQ specific analysis:");
        const bullKeys = keys.filter(
            (key) => key.includes("bull:") || key.includes("messageQueue")
        );
        console.log(`BullMQ keys found: ${bullKeys.length}`);

        if (bullKeys.length > 0) {
            console.log("BullMQ keys:");
            bullKeys.forEach((key) => {
                const detail = keyDetails.find((d) => d.key === key);
                if (detail) {
                    console.log(`  - ${key} (${detail.type})`);
                }
            });
        }

        // Check Redis info
        console.log("\n📋 Redis server info:");
        const info = await redis.info("memory");
        const infoLines = info
            .split("\r\n")
            .filter((line) => line.includes("memory") || line.includes("used"));
        infoLines.forEach((line) => {
            if (line.trim()) console.log(`  ${line}`);
        });

        // Cleanup suggestions
        console.log("\n💡 Cleanup suggestions:");

        if (bullKeys.length === 0) {
            console.log(
                "✅ No BullMQ keys found - queue cleanup is working correctly"
            );
            console.log("❓ Memory usage is likely from other sources:");
            console.log("   - Other applications using this Redis instance");
            console.log("   - Redis persistence files (RDB/AOF)");
            console.log("   - Redis internal overhead");
            console.log("   - Non-queue related data");
        } else {
            console.log(
                "⚠️  BullMQ keys found - queue cleanup may not be working"
            );
            console.log("   Consider running manual cleanup");
        }

        // Summary
        console.log(`\n📋 Summary:`);
        console.log(`Total Redis keys: ${keys.length}`);
        console.log(`BullMQ keys: ${bullKeys.length}`);
        console.log(`Other keys: ${keys.length - bullKeys.length}`);
    } catch (error) {
        console.error("❌ Error during Redis analysis:", error);
    } finally {
        await redis.disconnect();
        process.exit(0);
    }
}

analyzeRedis();
