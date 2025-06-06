#!/usr/bin/env node

/**
 * Test script to check Redis cleanup and memory usage
 * Run with: node scripts/test-cleanup.js
 */

const { Queue } = require('bullmq');
require('dotenv').config({ path: '.env.local' });

const redisConnectionOptions = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
};

console.log('🔧 Testing Redis cleanup with options:', {
    host: redisConnectionOptions.host,
    port: redisConnectionOptions.port,
    password: redisConnectionOptions.password ? '***' : 'none'
});

async function testCleanup() {
    const queue = new Queue("messageQueue", {
        connection: redisConnectionOptions,
    });

    try {
        console.log('\n📊 Getting current queue stats...');
        
        // Get job counts
        const jobCounts = await queue.getJobCounts();
        console.log('Job counts:', jobCounts);

        // Get waiting jobs
        const waiting = await queue.getWaiting();
        console.log(`Waiting jobs: ${waiting.length}`);

        // Get active jobs
        const active = await queue.getActive();
        console.log(`Active jobs: ${active.length}`);

        // Get completed jobs
        const completed = await queue.getCompleted();
        console.log(`Completed jobs: ${completed.length}`);

        // Get failed jobs
        const failed = await queue.getFailed();
        console.log(`Failed jobs: ${failed.length}`);

        console.log('\n🧹 Starting aggressive cleanup...');

        // Clean completed jobs (keep only 5)
        const completedCleaned = await queue.clean(
            60 * 60 * 1000, // 1 hour
            5, // Keep only 5
            "completed"
        );
        console.log(`✅ Cleaned ${completedCleaned.length} completed jobs`);

        // Clean failed jobs (keep only 2)
        const failedCleaned = await queue.clean(
            60 * 60 * 1000, // 1 hour
            2, // Keep only 2
            "failed"
        );
        console.log(`✅ Cleaned ${failedCleaned.length} failed jobs`);

        // Clean old active jobs
        const activeCleaned = await queue.clean(
            60 * 60 * 1000, // 1 hour
            0, // Keep 0 old active jobs
            "active"
        );
        console.log(`✅ Cleaned ${activeCleaned.length} stalled active jobs`);

        console.log('\n📊 Getting updated queue stats...');
        
        // Get updated counts
        const newJobCounts = await queue.getJobCounts();
        console.log('New job counts:', newJobCounts);

        const totalBefore = Object.values(jobCounts).reduce((a, b) => a + b, 0);
        const totalAfter = Object.values(newJobCounts).reduce((a, b) => a + b, 0);
        
        console.log(`\n📈 Summary:`);
        console.log(`Total jobs before: ${totalBefore}`);
        console.log(`Total jobs after: ${totalAfter}`);
        console.log(`Jobs cleaned: ${totalBefore - totalAfter}`);
        console.log(`Memory reduction: ~${Math.round((totalBefore - totalAfter) * 0.5)}KB estimated`);

        if (totalAfter >= totalBefore) {
            console.log('\n⚠️  WARNING: No jobs were cleaned! This indicates a problem with cleanup.');
            console.log('Possible issues:');
            console.log('- Jobs are not completing properly');
            console.log('- Jobs are being added faster than cleaned');
            console.log('- Cleanup configuration is not working');
        } else {
            console.log('\n✅ Cleanup successful!');
        }

    } catch (error) {
        console.error('❌ Error during cleanup test:', error);
    } finally {
        await queue.close();
        process.exit(0);
    }
}

testCleanup();
