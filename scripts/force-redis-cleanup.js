#!/usr/bin/env node

/**
 * Force Redis Cleanup Script - Aggressively clean all BullMQ data
 * Run with: node scripts/force-redis-cleanup.js
 */

const { Queue } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config({ path: '.env.local' });

const redisConnectionOptions = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
};

console.log('🔧 Force cleaning Redis with options:', {
    host: redisConnectionOptions.host,
    port: redisConnectionOptions.port,
    password: redisConnectionOptions.password ? '***' : 'none'
});

async function forceCleanup() {
    const redis = new Redis(redisConnectionOptions);
    
    // Create queue instances for cleanup
    const messageQueue = new Queue("messageQueue", {
        connection: redisConnectionOptions,
    });
    
    const testQueue = new Queue("test-connection", {
        connection: redisConnectionOptions,
    });

    try {
        console.log('\n📊 Before cleanup - Redis analysis...');
        
        // Get all keys before cleanup
        const keysBefore = await redis.keys('*');
        console.log(`Total keys before: ${keysBefore.length}`);
        keysBefore.forEach((key, index) => {
            console.log(`${index + 1}. ${key}`);
        });

        console.log('\n🧹 Starting aggressive cleanup...');

        // 1. Clean the main messageQueue
        console.log('\n🔄 Cleaning messageQueue...');
        try {
            await messageQueue.obliterate({ force: true });
            console.log('✅ messageQueue obliterated');
        } catch (error) {
            console.log('⚠️ messageQueue obliterate failed:', error.message);
        }

        // 2. Clean the test-connection queue
        console.log('\n🔄 Cleaning test-connection queue...');
        try {
            await testQueue.obliterate({ force: true });
            console.log('✅ test-connection queue obliterated');
        } catch (error) {
            console.log('⚠️ test-connection obliterate failed:', error.message);
        }

        // 3. Manual cleanup of any remaining bull keys
        console.log('\n🔄 Manual cleanup of remaining bull keys...');
        const bullKeys = await redis.keys('bull:*');
        if (bullKeys.length > 0) {
            console.log(`Found ${bullKeys.length} remaining bull keys, deleting...`);
            for (const key of bullKeys) {
                try {
                    await redis.del(key);
                    console.log(`✅ Deleted: ${key}`);
                } catch (error) {
                    console.log(`❌ Failed to delete ${key}:`, error.message);
                }
            }
        } else {
            console.log('✅ No remaining bull keys found');
        }

        // 4. Check final state
        console.log('\n📊 After cleanup - Redis analysis...');
        const keysAfter = await redis.keys('*');
        console.log(`Total keys after: ${keysAfter.length}`);
        
        if (keysAfter.length > 0) {
            console.log('Remaining keys:');
            keysAfter.forEach((key, index) => {
                console.log(`${index + 1}. ${key}`);
            });
        } else {
            console.log('✅ Redis is completely clean!');
        }

        // 5. Get memory info
        console.log('\n📋 Memory info after cleanup:');
        const info = await redis.info('memory');
        const memoryLines = info.split('\r\n').filter(line => 
            line.includes('used_memory_human') || 
            line.includes('used_memory_dataset') ||
            line.includes('used_memory_overhead')
        );
        memoryLines.forEach(line => {
            if (line.trim()) console.log(`  ${line}`);
        });

        console.log('\n✅ Force cleanup completed!');
        console.log(`Keys cleaned: ${keysBefore.length - keysAfter.length}`);
        
        if (keysAfter.length === 0) {
            console.log('🎉 Redis is now completely clean!');
            console.log('💡 Memory usage should start decreasing now.');
        } else {
            console.log('⚠️ Some keys remain. They might be from other applications.');
        }

    } catch (error) {
        console.error('❌ Error during force cleanup:', error);
    } finally {
        await messageQueue.close();
        await testQueue.close();
        await redis.disconnect();
        process.exit(0);
    }
}

forceCleanup();
