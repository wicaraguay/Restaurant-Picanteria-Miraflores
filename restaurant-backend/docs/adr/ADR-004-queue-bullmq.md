# ADR-004: Use BullMQ for Background Jobs

## Status

Accepted

## Context

The system needs to process SRI invoice submissions asynchronously to avoid blocking HTTP requests and handle failures gracefully.

**Requirements**:
- **Asynchronous Processing**: Invoice submission to SRI can take 2-10 seconds; can't block REST API responses
- **Retry Logic**: Network failures, SRI downtime, or transient errors require automatic retries
- **Job Persistence**: Jobs must survive server restarts (e.g., during deployments)
- **Monitoring**: Need visibility into queued, active, failed, and completed jobs
- **Concurrency Control**: Limit concurrent SRI requests to avoid rate limiting
- **Dead Letter Queue**: Permanently failed jobs should be stored for manual review

**Alternatives Considered**:

1. **No Queue (Synchronous)**:
   - Pros: Simple, no additional infrastructure
   - Cons: Slow API responses, no retry on failure, blocks server if SRI is down

2. **In-Memory Queue (Custom)**:
   - Pros: No Redis dependency, easy local development
   - Cons: Jobs lost on restart, no scalability, manual retry logic

3. **Bull (Redis-based)**:
   - Pros: Popular, Redis-backed persistence, good docs
   - Cons: Outdated (last major update 2020), moving to BullMQ

4. **BullMQ (Redis-based)**:
   - Pros: Modern (TypeScript-first), active maintenance, better performance, Redis-backed
   - Cons: Requires Redis in production

5. **AWS SQS / Google Cloud Tasks**:
   - Pros: Fully managed, serverless
   - Cons: Vendor lock-in, higher cost, requires AWS/GCP setup

## Decision

Use **BullMQ** for production with an **in-memory fallback** for development/testing.

**Architecture**:
```typescript
// Factory pattern for environment-based selection
QueueFactory.create() → {
  if (REDIS_HOST) → BullMQInvoiceQueue (production)
  else           → InvoiceQueue (in-memory dev fallback)
}
```

**Configuration**:
- **Production**: BullMQ with Redis backend
- **Development**: In-memory queue (no Redis required)
- **Testing**: In-memory queue for fast test execution

**Job Types**:
1. `process-invoice`: Submit invoice XML to SRI
2. `retry-failed-invoice`: Manual retry of failed jobs
3. (Future) `send-invoice-email`: Email PDF + XML to customer
4. (Future) `sync-inventory`: Periodic inventory synchronization

**Retry Strategy**:
- Max 3 attempts
- Exponential backoff: 5s, 25s, 125s
- Permanent failure after 3 attempts → move to Dead Letter Queue

## Consequences

### Positive

- **Non-Blocking**: API responds immediately with bill status "pending"; processing happens in background
- **Resilience**: Automatic retries for transient failures (network, SRI timeout)
- **Persistence**: Jobs survive server restarts (Redis durability)
- **Scalability**: Can scale workers independently from API servers
- **Monitoring**: Built-in job status tracking (queued, active, completed, failed)
- **Rate Limiting**: Control concurrency to avoid overwhelming SRI or hitting rate limits
- **Development Experience**: No Redis needed locally (in-memory fallback)
- **Job Prioritization**: Can prioritize urgent invoices (e.g., large orders)

### Negative

- **Infrastructure Dependency**: Production requires Redis (additional service to manage)
- **Complexity**: Adds asynchronous complexity compared to synchronous processing
- **Debugging**: Harder to debug async job failures compared to inline code
- **Redis Cost**: Requires Redis hosting (though Redis is cheap on most cloud providers)
- **Job Loss Risk**: If Redis crashes without backups, queued jobs are lost
- **Dev/Prod Parity**: Different queue implementations in dev vs. production (mitigated by shared interface)

### Mitigations

- **Abstraction**: `InvoiceQueue` interface allows swapping queue implementations
- **Redis Hosting**: Use managed Redis (e.g., Redis Cloud, AWS ElastiCache) for durability
- **Monitoring**: Sentry integration for job failures
- **Logging**: Detailed logs for each job stage (enqueue, process, complete, fail)
- **Dev Fallback**: In-memory queue for local development (no Redis setup needed)
- **Health Checks**: Monitor Redis connection status, alert on downtime

## Implementation Details

**BullMQ Configuration** (`src/infrastructure/queue/BullMQInvoiceQueue.ts`):
```typescript
const queue = new Queue('invoice-processing', {
  connection: { host: 'localhost', port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: false     // Keep failed jobs for debugging
  }
});
```

**In-Memory Fallback** (`src/infrastructure/queue/InvoiceQueue.ts`):
```typescript
// Simple in-memory queue for development
class InvoiceQueue {
  private jobs: Map<string, Job> = new Map();

  async add(data: InvoiceJobData): Promise<string> {
    const jobId = uuid();
    this.jobs.set(jobId, { id: jobId, data, status: 'queued' });
    this.processNext(); // Process immediately in dev
    return jobId;
  }
}
```

**Environment Variables**:
```bash
# Production
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=secret

# Development (omit to use in-memory queue)
# REDIS_HOST=
```

**Worker Setup**:
```typescript
// src/infrastructure/queue/worker.ts
const worker = new Worker('invoice-processing', async (job) => {
  const sriClient = new SRIClient();
  const result = await sriClient.submitInvoice(job.data.xml);

  // Update bill status in database
  await billRepository.updateStatus(job.data.billId, result.status);

  return result;
}, { connection: redisConfig });
```

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Best Practices](https://redis.io/topics/best-practices)
- `src/infrastructure/queue/` - Queue implementation
- `src/infrastructure/queue/QueueFactory.ts` - Environment-based selection
