const { Queue } = require('bullmq');
require('dotenv').config({ path: '.env.local' });

const redisConnectionOptions = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
};

async function addTestJob() {
    try {
        // Create the same queue that the worker is listening to
        const messageQueue = new Queue('messageQueue', {
            connection: redisConnectionOptions,
        });

        console.log('Adding test job to messageQueue...');

        // Add a test job with the same structure as the app
        const testMessage = {
            messageType: "TEST",
            timestamp: new Date().toISOString(),
            userId: "test-user-123",
            metadata: {
                source: "manual-test",
                environment: "development",
            },
            data: {
                testType: "manual",
                payload: {
                    message: "Manual test job",
                    timestamp: Date.now(),
                },
            },
        };

        const job = await messageQueue.add('TEST', testMessage);
        console.log('✅ Test job added successfully:', job.id);

        // Wait a bit to see if it gets processed
        console.log('Waiting 5 seconds to see if job gets processed...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check job status
        const jobStatus = await job.getState();
        console.log('Job status:', jobStatus);

        await messageQueue.close();
        console.log('✅ Test completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to add test job:', error);
        process.exit(1);
    }
}

addTestJob();
