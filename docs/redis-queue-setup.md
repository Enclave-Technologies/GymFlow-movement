# Redis Queue System Setup

This document explains how to set up and use the Redis queue system in the Movement Admin application.

## Overview

The Redis queue system provides a robust way to handle background processing of various tasks like:

-   **Workout Operations**: Plan creation, phase/session/exercise CRUD operations
-   **Event-driven Architecture**: Granular workout planner updates with queue events
-   **Job Dependencies**: Ensuring proper execution order (e.g., plan creation before phase creation)
-   **Retry Logic**: Automatic retry with exponential backoff for failed operations
-   **User action tracking**
-   **Notifications**
-   **Email sending**
-   **Data synchronization**
-   **Custom test messages**

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

    - Standalone Node.js background process (not Express)
    - Uses BullMQ for Redis-based job processing
    - Direct database connections via worker-specific config
    - Message type handlers and error handling

4. **Worker Database** (`lib/database/worker-db.ts`)

    - Worker-specific database configuration
    - Direct Drizzle ORM connection (no Next.js dependencies)
    - Optimized connection settings for background processing
    - Environment variable loading with dotenv

5. **Server Actions** (`actions/queue_actions.ts`)

    - `addJobToQueue` - Add jobs to queue with dependency support
    - `getQueueStats` - Get queue statistics
    - `clearQueue` - Clear queue (development only)
    - Specific message senders for each type

6. **Workout Database Service** (`lib/database/workout-database-service.ts`)

    - Worker-compatible database operations
    - Uses worker-specific database configuration
    - No Next.js dependencies for standalone execution
    - Handles workout plan CRUD operations

7. **Workout Queue Integration** (`lib/workout-queue-integration.ts`)

    - `queuePlanCreate` - Queue workout plan creation
    - `queuePhaseCreate` - Queue phase creation
    - `queuePhaseCreateWithDependency` - Queue phase creation with job dependencies
    - `queuePhaseUpdate/Delete` - Phase management operations
    - `queueSessionCreate/Update/Delete` - Session management operations
    - `queueExerciseCreate/Update/Delete` - Exercise management operations
    - `queueFullPlanSave` - Bulk plan operations (CSV uploads, etc.)

8. **Test Interface** (`/queue-test`)
    - Interactive testing page
    - Real-time queue monitoring
    - Sample message generators

## Worker Architecture

The queue worker runs as a **standalone Node.js process** (not Express server):

-   **Process Type**: Background Node.js process using `tsx` for TypeScript execution
-   **Queue System**: BullMQ (Redis-based job queue)
-   **Database**: Direct PostgreSQL connection via Drizzle ORM
-   **Configuration**: Worker-specific database config (`lib/database/worker-db.ts`)
-   **Isolation**: Completely separate from Next.js application context

### Key Benefits:

-   ✅ **Independent Scaling**: Worker can be scaled separately from web app
-   ✅ **Resource Isolation**: Background processing doesn't affect web performance
-   ✅ **Deployment Flexibility**: Can run on different servers/containers
-   ✅ **Fault Tolerance**: Worker crashes don't affect web application

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

#### Core System Messages

1. **TEST** - Basic test messages
2. **USER_ACTION** - User activity tracking
3. **NOTIFICATION** - Push notifications
4. **EMAIL** - Email sending
5. **DATA_SYNC** - Data backup/sync operations

#### Workout System Messages (Event-Driven Architecture)

6. **WORKOUT_UPDATE** - Legacy exercise plan modifications
7. **WORKOUT_PLAN_CREATE** - Create new workout plans
8. **WORKOUT_PHASE_CREATE** - Create phases (with dependency support)
9. **WORKOUT_PHASE_UPDATE** - Update phase properties
10. **WORKOUT_PHASE_DELETE** - Delete phases
11. **WORKOUT_SESSION_CREATE** - Create sessions within phases
12. **WORKOUT_SESSION_UPDATE** - Update session properties
13. **WORKOUT_SESSION_DELETE** - Delete sessions
14. **WORKOUT_EXERCISE_CREATE** - Create exercises within sessions
15. **WORKOUT_EXERCISE_UPDATE** - Update exercise properties
16. **WORKOUT_EXERCISE_DELETE** - Delete exercises
17. **WORKOUT_PLAN_FULL_SAVE** - Bulk operations (CSV uploads, full plan saves)

## Usage Examples

### Workout Queue Integration (Recommended)

For workout-related operations, use the specialized integration class:

```typescript
import { WorkoutQueueIntegration } from "@/lib/workout-queue-integration";

// Create a new workout plan
await WorkoutQueueIntegration.queuePlanCreate(
    "plan-123",
    "My Workout Plan",
    "client-456",
    "trainer-789",
    true // isActive
);

// Create a phase (for existing plan)
await WorkoutQueueIntegration.queuePhaseCreate(
    "plan-123",
    "client-456",
    "trainer-789",
    {
        id: "phase-456",
        name: "Strength Phase",
        orderNumber: 1,
        isActive: true,
    }
);

// Create a phase with dependency (for new plan)
const planResult = await WorkoutQueueIntegration.queuePlanCreate(/*...*/);
await WorkoutQueueIntegration.queuePhaseCreateWithDependency(
    "plan-123",
    "client-456",
    "trainer-789",
    {
        /* phase data */
    },
    planResult.success ? planResult.data?.jobId : undefined
);
```

### Job Dependencies and Race Condition Handling

The system automatically handles race conditions when creating plans and phases:

```typescript
// This sequence ensures proper order:
// 1. Plan creation job
// 2. Phase creation job (waits for plan completion)

if (!planExists) {
    // Generate IDs in frontend
    const newPlanId = uuidv4();

    // Create plan job
    const planJob = await WorkoutQueueIntegration.queuePlanCreate(
        newPlanId,
        "Workout Plan",
        clientId,
        trainerId,
        true
    );

    // Create phase job with dependency
    await WorkoutQueueIntegration.queuePhaseCreateWithDependency(
        newPlanId,
        clientId,
        trainerId,
        phaseData,
        planJob.success ? planJob.data?.jobId : undefined
    );
}
```

**Features:**

-   **Job Dependencies**: Phase creation waits for plan creation
-   **Automatic Retry**: Failed jobs retry with exponential backoff (2s, 4s, 8s...)
-   **Race Condition Protection**: Multiple layers of protection
-   **Non-blocking**: Worker continues processing other jobs during retries

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

## Event-Driven Architecture Pattern

The workout system implements an event-driven architecture where UI operations immediately update the local state, then emit queue events for background database persistence.

### Pattern Benefits

1. **Immediate UI Response**: Users see changes instantly
2. **Reliable Persistence**: Background jobs ensure data is saved
3. **Scalability**: Queue handles high-frequency operations
4. **Resilience**: Automatic retry for failed operations
5. **Auditability**: All changes are tracked as events

### Implementation Pattern

```typescript
// 1. Update UI immediately (optimistic update)
const updatedPhases = [...currentPhases, newPhase];
updatePhases(updatedPhases);
setHasUnsavedChanges(true);

// 2. Emit queue event for background persistence
try {
    await WorkoutQueueIntegration.queuePhaseCreate(
        planId,
        clientId,
        trainerId,
        phaseData
    );
    toast.success("Phase added and queued for processing.");
} catch (error) {
    console.error("Failed to queue phase creation:", error);
    // Don't show error to user as operation succeeded locally
}
```

### Event Granularity

The system uses **exercise-level granularity** for maximum flexibility:

-   **Plan Level**: Create/update entire plans
-   **Phase Level**: Create/update/delete phases
-   **Session Level**: Create/update/delete sessions
-   **Exercise Level**: Create/update/delete individual exercises

### Sequence for New Clients

When creating the first phase for a new client:

```
Click "Add Phase" → Check if plan exists
├─ YES: Queue WORKOUT_PHASE_CREATE
└─ NO:  Queue WORKOUT_PLAN_CREATE → Queue WORKOUT_PHASE_CREATE (with dependency)
```

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

4. **Race condition errors (Plan not found)**

    - Check if using `queuePhaseCreateWithDependency` for new plans
    - Verify job dependencies are properly set
    - Monitor retry attempts in worker logs
    - Ensure plan creation completes before phase creation

5. **Workout operations not persisting to database**

    - Restart the worker to pick up code changes
    - Check if worker is using updated processor code
    - Verify database connection in worker environment
    - Check for TypeScript compilation errors

6. **Worker import/module resolution errors**

    - Ensure worker uses `lib/database/worker-db.ts` (not `db/xata.tsx`)
    - Check that worker processors import from `types/workout-plan-types.ts`
    - Verify all worker files avoid Next.js-specific imports
    - Use explicit relative imports in worker context

### Debug Commands

```bash
# Use the test page for debugging
# Navigate to http://localhost:3000/queue-test

# Or use server actions in your code:
# await getQueueStats(true, 10)
# await clearQueue() // development only
```
