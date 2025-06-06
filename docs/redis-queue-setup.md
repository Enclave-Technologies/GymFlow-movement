# Redis Queue System Setup

This document explains how to set up and use the Redis queue system in the Movement Admin application.

## Overview

The Redis queue system provides a robust way to handle background processing of various tasks like:

-   Workout plan updates
-   User action tracking
-   Notifications
-   Email sending
-   Data synchronization
-   Custom test messages

## Architecture

### Components

1. **Queue Types** (`types/queue-types.ts`)

    - Defines uniform message structure
    - Type-safe message definitions
    - Job options and result interfaces

2. **Queue Manager** (`lib/queue.ts`)

    - Queue instance creation
    - Job management functions
    - Statistics and monitoring

3. **Queue Worker** (`lib/queue-worker.ts`)

    - Background job processor
    - Message type handlers
    - Error handling and logging

4. **Server Actions** (`actions/queue_actions.ts`)

    - `addJobToQueue` - Add jobs to queue
    - `getQueueStats` - Get queue statistics
    - `clearQueue` - Clear queue (development only)
    - Specific message senders for each type

5. **Test Interface** (`/queue-test`)
    - Interactive testing page
    - Real-time queue monitoring
    - Sample message generators

## Setup Instructions

### 1. Redis Configuration

Ensure your Redis connection is configured in `lib/redis-utils.ts`:

```typescript
export const redisConnectionOptions: ConnectionOptions = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
};
```

### 2. Environment Variables

Add to your `.env.local`:

```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_password_if_needed
```

### 3. Start the Worker

In a separate terminal, run:

```bash
npm run worker
```

This starts the background worker that processes jobs from the queue.

### 4. Start the Application

For full development with monitoring:

```bash
npm run dev:full
```

This starts:

-   Next.js application (port 3000)
-   Queue worker (background process)
-   Bull Board monitoring server (port 3001)

Or start components individually:

```bash
# Terminal 1: Next.js app
npm run dev

# Terminal 2: Queue worker
npm run worker

# Terminal 3: Monitoring server (optional)
npm run monitor
```

### 5. Test the Queue

Navigate to `/queue-test` in your browser to test the queue system.

### 6. Access Monitoring

-   **Custom Dashboard**: `http://localhost:3000/queue-monitor`
-   **Bull Board**: `http://localhost:3001/admin/queues`
-   **Health API**: `http://localhost:3000/api/admin/queue-health`

## Message Structure

All messages follow a uniform structure:

```typescript
interface BaseQueueMessage {
    messageType: string;
    timestamp: string;
    userId?: string;
    metadata?: Record<string, any>;
    data: any; // Specific to message type
}
```

### Supported Message Types

1. **TEST** - Basic test messages
2. **WORKOUT_UPDATE** - Exercise plan modifications
3. **USER_ACTION** - User activity tracking
4. **NOTIFICATION** - Push notifications
5. **EMAIL** - Email sending
6. **DATA_SYNC** - Data backup/sync operations

## Usage Examples

### Adding a Job via Server Action

```typescript
import { addJobToQueue } from "@/actions/queue_actions";

const message = {
    messageType: "WORKOUT_UPDATE",
    timestamp: new Date().toISOString(),
    userId: "user-123",
    data: {
        exercisePlanId: "plan-456",
        phaseId: "phase-789",
        sessionId: "session-101",
        exerciseId: "exercise-202",
        changes: { sets: 4, reps: 12, weight: 135 },
    },
};

const result = await addJobToQueue(message, {
    delay: 5000, // 5 second delay
    attempts: 3,
    priority: 10,
});

if (result.success) {
    console.log("Job added:", result.data?.jobId);
} else {
    console.error("Failed:", result.error);
}
```

### Using Specific Message Senders

```typescript
import {
    sendWorkoutUpdateMessage,
    sendNotificationMessage,
    getQueueStats,
} from "@/actions/queue_actions";

// Send a workout update
const result = await sendWorkoutUpdateMessage(
    "plan-456",
    "phase-789",
    "session-101",
    "exercise-202",
    { sets: 4, reps: 12, weight: 135 },
    "user-123"
);

// Send a notification
await sendNotificationMessage(
    "user-123",
    "Workout Complete!",
    "Great job on finishing your workout!",
    "success",
    "/workouts"
);

// Get queue statistics
const stats = await getQueueStats(true, 10); // include jobs, limit 10
```

## Monitoring

The system provides comprehensive monitoring capabilities through multiple interfaces:

### 1. Bull Board Dashboard (Recommended)

Professional monitoring interface with full queue management:

```bash
# Start monitoring server
npm run monitor

# Access dashboard
http://localhost:3001/admin/queues
```

Features:

-   Real-time job inspection and management
-   Job retry/remove capabilities
-   Detailed job timelines and logs
-   Queue performance metrics

### 2. Custom Monitoring Dashboard

User-friendly interface with health insights:

```bash
# Access via main application
http://localhost:3000/queue-monitor
```

Features:

-   Queue health status with alerts
-   Performance recommendations
-   Failed job analysis
-   Automated cleanup tools

### 3. Queue Statistics API

Programmatic access to queue data:

```bash
# Get comprehensive health data
GET /api/admin/queue-health

# Basic queue statistics
GET /api/queue-stats
```

### 4. Real-time Monitoring

The system tracks:

-   **Waiting**: Jobs waiting to be processed
-   **Active**: Jobs currently being processed
-   **Completed**: Successfully completed jobs
-   **Failed**: Failed jobs with error details
-   **Processing Rate**: Jobs per minute
-   **Error Rate**: Percentage of failed jobs
-   **Average Processing Time**: Performance metrics

### 5. Health Alerts

Automated status monitoring:

-   🟢 **Healthy**: Normal operation
-   🟡 **Warning**: Performance issues detected
-   🔴 **Critical**: Immediate attention required

### 6. Logs and Debugging

Worker logs show:

-   Job processing start/completion
-   Success/failure status with details
-   Processing time and performance
-   Error details and stack traces

## Development

### Adding New Message Types

1. Define the message interface in `types/queue-types.ts`
2. Add to the `QueueMessage` union type
3. Implement processor in `lib/queue-worker.ts`
4. Add to the switch statement in `processJob`

### Testing

Use the `/queue-test` page to:

-   Send test messages
-   Monitor queue statistics
-   View recent jobs
-   Clear the queue

## Production Considerations

1. **Redis Persistence**: Configure Redis with appropriate persistence settings
2. **Worker Scaling**: Run multiple worker instances for high throughput
3. **Error Handling**: Implement proper error handling and alerting
4. **Monitoring**: Set up monitoring for queue health and performance
5. **Security**: Secure Redis access and API endpoints

## Troubleshooting

### Common Issues

1. **Worker not processing jobs**

    - Check Redis connection
    - Ensure worker is running (`npm run worker`)
    - Check worker logs for errors

2. **Jobs failing**

    - Check worker logs for error details
    - Verify message structure
    - Check database connections

3. **Queue growing too large**
    - Increase worker concurrency
    - Add more worker instances
    - Check for processing bottlenecks

### Debug Commands

```bash
# Use the test page for debugging
# Navigate to http://localhost:3000/queue-test

# Or use server actions in your code:
# await getQueueStats(true, 10)
# await clearQueue() // development only
```
