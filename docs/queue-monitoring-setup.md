# Queue Monitoring Setup Guide

This guide explains how to set up and use the BullMQ monitoring dashboard for your queue system.

## Overview

The monitoring system provides:

1. **Bull Board Dashboard** - Official BullMQ web interface for detailed queue management
2. **Custom Monitoring Page** - User-friendly dashboard with health metrics and recommendations
3. **Queue Health API** - Programmatic access to queue statistics and performance data
4. **Real-time Monitoring** - Live updates and auto-refresh capabilities

## Installation

The monitoring dependencies are already installed:

```bash
npm install @bull-board/express @bull-board/ui express concurrently --legacy-peer-deps
```

## Environment Variables

Add these optional environment variables to your `.env.local`:

```env
# Bull Board Monitoring (Optional)
BULL_BOARD_PORT=3001
BULL_BOARD_USERNAME=admin
BULL_BOARD_PASSWORD=your_secure_password
QUEUE_ADMIN_KEY=your_admin_api_key

# Redis Configuration (Required)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_if_needed
```

## Running the Monitoring System

### Option 1: Full Development Setup (Recommended)

Run everything together:

```bash
npm run dev:full
```

This starts:
- Next.js application (port 3000)
- Queue worker (background process)
- Bull Board monitoring server (port 3001)

### Option 2: Individual Components

Start each component separately:

```bash
# Terminal 1: Next.js app
npm run dev

# Terminal 2: Queue worker
npm run worker

# Terminal 3: Monitoring server
npm run monitor
```

## Accessing the Dashboards

### 1. Custom Monitoring Dashboard
- **URL**: `http://localhost:3000/queue-monitor`
- **Features**: 
  - Queue health status with color-coded alerts
  - Performance metrics and recommendations
  - Failed job details
  - Quick actions (cleanup, etc.)
  - Auto-refresh capabilities

### 2. Bull Board Dashboard
- **URL**: `http://localhost:3001/admin/queues`
- **Features**:
  - Detailed job inspection
  - Job retry/remove capabilities
  - Real-time queue statistics
  - Job timeline and logs

### 3. Queue Test Interface
- **URL**: `http://localhost:3000/queue-test`
- **Features**:
  - Send test messages
  - Basic queue statistics
  - Links to monitoring dashboards

## API Endpoints

### Queue Health Check
```bash
GET /api/admin/queue-health
```

Returns comprehensive health data including:
- Queue status (healthy/warning/critical)
- Performance metrics
- Failed job details
- Recommendations

### Queue Cleanup
```bash
POST /api/admin/queue-health
Content-Type: application/json

{
  "action": "cleanup",
  "keepCompleted": 100,
  "keepFailed": 50
}
```

## Security

### Development Mode
- No authentication required
- All endpoints accessible
- Monitoring server runs without credentials

### Production Mode
- Bull Board requires basic authentication
- API endpoints check for admin key
- Environment variables control access

**Production Security Setup:**

1. Set strong credentials:
```env
BULL_BOARD_USERNAME=your_admin_username
BULL_BOARD_PASSWORD=your_strong_password
QUEUE_ADMIN_KEY=your_secure_api_key
```

2. Access Bull Board with credentials:
- Username: `your_admin_username`
- Password: `your_strong_password`

3. API requests need authorization header:
```bash
curl -H "Authorization: Bearer your_secure_api_key" \
     http://localhost:3000/api/admin/queue-health
```

## Monitoring Features

### Health Status Indicators

- **🟢 Healthy**: Error rate < 10%, queue length < 100, processing normally
- **🟡 Warning**: Error rate 10-50%, queue length 100-1000, or processing delays
- **🔴 Critical**: Error rate > 50%, queue length > 1000, or system failures

### Performance Metrics

- **Processing Rate**: Jobs processed per minute
- **Average Processing Time**: Time taken to complete jobs
- **Throughput**: Total jobs processed over time period
- **Error Rate**: Percentage of failed jobs

### Automated Recommendations

The system provides intelligent recommendations based on current metrics:

- Scale workers for high queue lengths
- Investigate errors for high failure rates
- Optimize job handlers for slow processing
- Clean up old jobs for maintenance

## Troubleshooting

### Common Issues

1. **Bull Board not accessible**
   - Check if monitoring server is running (`npm run monitor`)
   - Verify port 3001 is not in use
   - Check Redis connection

2. **Authentication errors in production**
   - Verify environment variables are set
   - Check credentials match configuration
   - Ensure API key is correct

3. **Queue health API returns errors**
   - Verify Redis is running and accessible
   - Check queue worker is processing jobs
   - Review application logs

### Debug Commands

```bash
# Check if Redis is running
redis-cli ping

# Test queue health endpoint
curl http://localhost:3000/api/admin/queue-health

# Check monitoring server status
curl http://localhost:3001/health

# View queue statistics
curl http://localhost:3000/api/queue-stats
```

## Integration with Existing Code

### Using Queue Health in Components

```typescript
import { getQueueHealth } from '@/actions/queue_actions';

const health = await getQueueHealth();
if (health.success) {
  console.log('Queue status:', health.data.status);
  console.log('Alerts:', health.data.alerts);
}
```

### Monitoring Queue Performance

```typescript
import { getQueuePerformanceMetrics } from '@/actions/queue_actions';

const metrics = await getQueuePerformanceMetrics(60); // Last 60 minutes
if (metrics.success) {
  console.log('Throughput:', metrics.data.throughput);
  console.log('Avg processing time:', metrics.data.avgProcessingTime);
}
```

### Cleanup Old Jobs

```typescript
import { cleanupOldJobs } from '@/actions/queue_actions';

const result = await cleanupOldJobs(100, 50); // Keep 100 completed, 50 failed
if (result.success) {
  console.log('Cleaned up:', result.data.cleaned, 'jobs');
}
```

## Production Deployment

### Docker Compose

Add monitoring service to your `docker-compose.yml`:

```yaml
services:
  queue-monitor:
    build: .
    command: node scripts/monitoring-server.js
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - BULL_BOARD_USERNAME=${BULL_BOARD_USERNAME}
      - BULL_BOARD_PASSWORD=${BULL_BOARD_PASSWORD}
    depends_on:
      - redis
```

### Kubernetes

Create monitoring deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: queue-monitor
spec:
  replicas: 1
  selector:
    matchLabels:
      app: queue-monitor
  template:
    metadata:
      labels:
        app: queue-monitor
    spec:
      containers:
      - name: monitor
        image: your-app:latest
        command: ["node", "scripts/monitoring-server.js"]
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_HOST
          value: "redis-service"
```

## Best Practices

1. **Regular Monitoring**: Check queue health daily in production
2. **Automated Alerts**: Set up alerts for critical queue status
3. **Cleanup Schedule**: Run cleanup jobs regularly to prevent memory issues
4. **Performance Tracking**: Monitor trends over time
5. **Security**: Use strong credentials and restrict access in production

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review application logs
3. Test individual components
4. Verify Redis connectivity and queue worker status
