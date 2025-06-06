const { Queue, Worker } = require('bullmq');
require('dotenv').config({ path: '.env.local' });

const redisConnectionOptions = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
};

console.log('Testing Redis connection with options:', {
    host: redisConnectionOptions.host,
    port: redisConnectionOptions.port,
    password: redisConnectionOptions.password ? '***' : 'none'
});

async function testConnection() {
    try {
        // Test queue creation
        const testQueue = new Queue('test-connection', {
            connection: redisConnectionOptions,
        });

        console.log('✅ Queue created successfully');

        // Test adding a job
        const job = await testQueue.add('test-job', { message: 'Hello Redis!' });
        console.log('✅ Job added successfully:', job.id);

        // Test worker creation
        const worker = new Worker('test-connection', async (job) => {
            console.log('✅ Processing job:', job.id, job.data);
            return { success: true };
        }, {
            connection: redisConnectionOptions,
        });

        console.log('✅ Worker created successfully');

        // Wait a bit for the job to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Cleanup
        await worker.close();
        await testQueue.close();
        
        console.log('✅ Redis connection test completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Redis connection test failed:', error);
        process.exit(1);
    }
}

testConnection();
