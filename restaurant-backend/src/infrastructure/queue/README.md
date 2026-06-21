# Invoice Queue Migration: In-Memory to BullMQ with Redis

## Overview

This directory contains the invoice processing queue implementation with support for both in-memory (development) and Redis-backed (production) queues.

## Architecture

### Files

1. **InvoiceQueue.ts** - Original in-memory queue implementation (fallback)
2. **BullMQInvoiceQueue.ts** - Redis-backed BullMQ implementation (production)
3. **QueueFactory.ts** - Smart factory that selects the appropriate implementation
4. **InvoiceQueue.test.ts** - Test suite

### Queue Selection Strategy

The factory automatically selects the queue implementation based on environment:

```typescript
import { getInvoiceQueue } from './infrastructure/queue/QueueFactory';

// Automatically returns the right queue based on REDIS_HOST env var
const queue = getInvoiceQueue();
```

**Selection Logic:**
- If `REDIS_HOST` is set → **BullMQInvoiceQueue** (Redis-backed)
- If `REDIS_HOST` is not set → **InvoiceQueue** (In-memory fallback)

## Features Comparison

| Feature | InvoiceQueue (In-Memory) | BullMQInvoiceQueue (Redis) |
|---------|-------------------------|----------------------------|
| Job Persistence | ❌ Lost on restart | ✅ Persisted in Redis |
| Horizontal Scaling | ❌ Single instance only | ✅ Multiple workers supported |
| Dead Letter Queue | ❌ Manual cleanup | ✅ Automatic DLQ with retention |
| Progress Tracking | ✅ In-memory only | ✅ Persisted in Redis |
| Retries | ✅ Exponential backoff | ✅ Exponential backoff |
| Concurrency | ✅ Configurable | ✅ Configurable |
| Job Timeout | ✅ 2 minutes | ✅ 2 minutes |

## Configuration

### Environment Variables

Add these to your `.env` file (see `.env.example`):

```bash
# Redis Configuration (for BullMQ queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Queue Configuration
QUEUE_CONCURRENCY=3
```

### Default Settings

Both implementations use the same defaults:

- **Max Attempts**: 3 retries
- **Backoff**: Exponential (5 seconds initial delay)
- **Concurrency**: 3 concurrent jobs
- **Job Timeout**: 120 seconds (2 minutes)

### BullMQ-Specific Settings

- **Completed Jobs Retention**: 100 jobs or 1 hour (whichever comes first)
- **Failed Jobs Retention**: 1000 jobs or 24 hours (acts as Dead Letter Queue)

## Usage

### Basic Usage

```typescript
import { getInvoiceQueue } from './infrastructure/queue/QueueFactory';

// Get the queue instance
const queue = getInvoiceQueue();

// Add a job
const job = await queue.add({
    orderId: '12345',
    order: orderData,
    client: clientData,
    taxRate: 0.15,
    logoUrl: 'https://example.com/logo.png'
});

// Process jobs
queue.process(async (job) => {
    // Your processing logic here
    const invoice = await generateInvoice(job.data);

    // Update progress (optional)
    await queue.updateProgress(job.id, 50);

    return invoice;
});

// Get job status
const jobInfo = await queue.getJob(job.id);
console.log(jobInfo.status); // PENDING, PROCESSING, COMPLETED, FAILED

// Get queue statistics
const stats = await queue.getStats();
console.log(stats); // { total, pending, processing, completed, failed }

// Clean old jobs
const cleaned = await queue.clean(3600000); // Remove jobs older than 1 hour
```

## Migration Guide

### Development Environment (No Redis)

1. Leave `REDIS_HOST` empty or commented in `.env`
2. The factory will automatically use `InvoiceQueue` (in-memory)
3. No additional setup required

### Production Environment (With Redis)

1. Install Redis:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server

   # macOS
   brew install redis

   # Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

2. Configure environment variables:
   ```bash
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=your-secure-password
   ```

3. Install dependencies:
   ```bash
   npm install bullmq ioredis
   ```

4. The factory will automatically detect Redis and use `BullMQInvoiceQueue`

## Error Handling

### Redis Connection Failures

If Redis is configured but connection fails, the factory will:
1. Log the error
2. Automatically fallback to in-memory queue
3. Continue operating (graceful degradation)

### Job Processing Errors

Both implementations support:
- Automatic retries (3 attempts)
- Exponential backoff (5s, 10s, 20s)
- Job timeout protection (120s)
- Error logging with context

## Monitoring

### BullMQ Dashboard (Optional)

You can add BullMQ Board for visual monitoring:

```bash
npm install @bull-board/express @bull-board/api
```

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
const queue = getInvoiceQueue();

if (queue instanceof BullMQInvoiceQueue) {
    createBullBoard({
        queues: [new BullMQAdapter(queue.queue)],
        serverAdapter
    });

    app.use('/admin/queues', serverAdapter.getRouter());
}
```

Access at: `http://localhost:3000/admin/queues`

## Testing

The queue factory can be reset for testing:

```typescript
import { resetQueueInstance } from './QueueFactory';

beforeEach(() => {
    resetQueueInstance();
});
```

## Performance Recommendations

### Development
- Use in-memory queue (no Redis required)
- Lower concurrency (1-2 workers)
- Shorter retention (clean frequently)

### Production
- Use BullMQ with Redis
- Scale concurrency based on load (3-10 workers)
- Monitor Redis memory usage
- Consider Redis persistence (AOF or RDB)
- Use Redis cluster for high availability

## Dead Letter Queue (DLQ)

BullMQ automatically implements a DLQ:
- Failed jobs are retained for 24 hours
- Up to 1000 failed jobs are kept
- Allows manual inspection and retry
- Automatic cleanup after retention period

## Troubleshooting

### "Redis connection error"
- Check Redis is running: `redis-cli ping`
- Verify REDIS_HOST and REDIS_PORT
- Check firewall rules
- Verify Redis password if set

### "Job stuck in PROCESSING"
- Check job timeout (default 120s)
- Verify worker is running
- Check Redis connection
- Review application logs

### "Too many jobs in queue"
- Increase QUEUE_CONCURRENCY
- Add more worker instances (BullMQ only)
- Check job processing performance
- Review retry strategy

## Maintenance

### Cleaning Old Jobs

```typescript
// Clean jobs older than 1 hour (completed + failed)
const queue = getInvoiceQueue();
const cleaned = await queue.clean(3600000);
console.log(`Cleaned ${cleaned} old jobs`);
```

### Monitoring Queue Size

```typescript
const stats = await queue.getStats();
if (stats.pending > 1000) {
    console.warn('Queue backlog detected', stats);
}
```

## Future Enhancements

Potential improvements:
- [ ] Job priority support
- [ ] Scheduled/delayed jobs
- [ ] Job batching
- [ ] Custom retry strategies per job type
- [ ] Metrics export (Prometheus)
- [ ] Queue pause/resume functionality
- [ ] Job dependencies/chains
