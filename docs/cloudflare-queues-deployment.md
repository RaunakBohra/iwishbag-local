# Cloudflare Queues Deployment Guide

## 1. Prerequisites

- Cloudflare account with Workers plan
- Wrangler CLI installed and authenticated
- D1 database set up for logging
- Email service provider (SendGrid, Mailgun, etc.)

## 2. Create Queue

### Via Wrangler CLI
```bash
# Create the queue
wrangler queues create iwishbag-tasks

# View queue details
wrangler queues list
```

### Via Dashboard
1. Go to Workers & Pages > Manage > Queues
2. Create new queue: `iwishbag-tasks`
3. Configure settings (batch size, timeout)

## 3. Configure wrangler.toml

The configuration is already set up:
```toml
[[queues.producers]]
queue = "iwishbag-tasks"
binding = "TASK_QUEUE"

[[queues.consumers]]
queue = "iwishbag-tasks"
max_batch_size = 10
max_batch_timeout = 5
```

## 4. Deploy Queue Workers

### Deploy Consumer Worker
```bash
# Deploy the consumer that processes messages
wrangler deploy workers/queue-consumer.js --name iwishbag-queue-consumer
```

### Deploy Producer Worker
```bash
# Deploy the producer that receives HTTP requests
wrangler deploy workers/queue-producer.js --name iwishbag-queue-producer
```

## 5. Set Up Environment Variables

### For Consumer Worker
```bash
# Email service credentials
wrangler secret put SENDGRID_API_KEY --name iwishbag-queue-consumer

# Webhook security
wrangler secret put WEBHOOK_SECRET --name iwishbag-queue-consumer

# Optional: External analytics
wrangler secret put MIXPANEL_TOKEN --name iwishbag-queue-consumer
```

### For Producer Worker
```bash
# Queue access permissions (usually auto-configured)
wrangler secret put QUEUE_TOKEN --name iwishbag-queue-producer
```

## 6. Configure D1 Database

Apply the queue logging schema:
```bash
# Apply queue tables migration
wrangler d1 execute iwishbag-edge-cache --file=supabase/migrations/20250726000000_queue_logging_tables.sql
```

## 7. Set Up Custom Domains

### Producer API Domain
```bash
# Add custom domain for queue API
wrangler domains add queue-api.iwishbag.com --worker iwishbag-queue-producer
```

### Configure DNS
Add CNAME record:
- Name: `queue-api`
- Content: `iwishbag-queue-producer.workers.dev`

## 8. Configure Email Service

### SendGrid Setup
1. Create SendGrid account
2. Generate API key with Mail Send permissions
3. Add API key as secret:
```bash
wrangler secret put SENDGRID_API_KEY --name iwishbag-queue-consumer
```

### Custom SMTP (Alternative)
```bash
wrangler secret put SMTP_HOST --name iwishbag-queue-consumer
wrangler secret put SMTP_PORT --name iwishbag-queue-consumer
wrangler secret put SMTP_USERNAME --name iwishbag-queue-consumer
wrangler secret put SMTP_PASSWORD --name iwishbag-queue-consumer
```

## 9. Update Frontend Configuration

Add queue API URL to environment:
```env
# .env.local
VITE_QUEUE_WORKER_URL=https://queue-api.iwishbag.com

# For webhooks
VITE_ORDER_WEBHOOK_URL=https://your-external-system.com/webhooks/orders
VITE_PAYMENT_WEBHOOK_URL=https://your-external-system.com/webhooks/payments
```

## 10. Test Queue Operations

### Test Single Message
```bash
curl -X POST https://queue-api.iwishbag.com/queue/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email:order_confirmation",
    "data": {
      "orderId": "test-123",
      "customerEmail": "test@example.com",
      "customerName": "Test User",
      "orderDetails": {
        "items": [{"name": "Test Item", "quantity": 1, "total": 100}],
        "total": 100,
        "currency": "USD"
      }
    },
    "priority": "high"
  }'
```

### Test Batch Messages
```bash
curl -X POST https://queue-api.iwishbag.com/queue/batch \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "type": "email:order_confirmation",
        "data": {...},
        "priority": "high"
      },
      {
        "type": "webhook:order_created",
        "data": {...},
        "priority": "normal"
      }
    ]
  }'
```

### Check Queue Stats
```bash
curl https://queue-api.iwishbag.com/queue/stats
```

## 11. Monitor Queue Performance

### View Logs
```bash
# Tail consumer logs
wrangler tail --name iwishbag-queue-consumer

# Tail producer logs
wrangler tail --name iwishbag-queue-producer
```

### Query D1 Metrics
```sql
-- Check recent queue activity
SELECT * FROM recent_queue_activity;

-- Check failure rates
SELECT * FROM failed_messages_summary;

-- Check email delivery stats
SELECT * FROM email_delivery_stats;
```

### Cloudflare Dashboard
1. Go to Workers & Pages > iwishbag-queue-consumer
2. View Analytics for:
   - Request count
   - Error rate
   - CPU time
   - Queue depth

## 12. Error Handling & Retry Logic

### Consumer Retry Configuration
Messages automatically retry with exponential backoff:
- 1st retry: 1 second delay
- 2nd retry: 2 seconds delay
- 3rd retry: 4 seconds delay
- Max retries: 3 (configurable)

### Dead Letter Queue
Failed messages after max retries go to:
- D1 table: `queue_failures`
- Can be manually reprocessed
- Alerts can be set up for DLQ items

## 13. Scaling Configuration

### Adjust Batch Size
```toml
[[queues.consumers]]
queue = "iwishbag-tasks"
max_batch_size = 100  # Increase for higher throughput
max_batch_timeout = 10  # Increase timeout accordingly
```

### Consumer Concurrency
Multiple consumer instances automatically scale based on queue depth.

## 14. Security Best Practices

### Message Validation
- Validate message types and data structure
- Sanitize user inputs
- Verify webhook signatures

### Access Control
- Use API keys for external access
- Implement rate limiting
- Monitor for abuse patterns

### Data Privacy
- Don't log sensitive data
- Encrypt PII in message payloads
- Comply with GDPR/privacy laws

## 15. Cost Optimization

### Free Tier Limits
- 1M requests/month free
- Additional: $0.15 per 1M requests
- No charges for queue operations themselves

### Optimization Tips
1. **Batch messages** when possible
2. **Use appropriate priorities** to avoid blocking
3. **Implement deduplication** to prevent duplicate processing
4. **Monitor failed messages** to optimize retry logic

## 16. Backup & Recovery

### Message Persistence
- Messages are persisted in Cloudflare's durable storage
- Automatic replication across regions
- No data loss during outages

### Disaster Recovery
- Queue state is maintained globally
- Workers can be redeployed without losing messages
- D1 logs provide audit trail

## 17. Integration Patterns

### With Supabase
```typescript
// In your Supabase functions
import { cloudflareQueueService } from './queue-service';

// After order creation
await cloudflareQueueService.sendOrderCompletionWorkflow(
  orderId, 
  customerData, 
  orderDetails
);
```

### With Webhooks
```javascript
// Webhook signature verification
const signature = generateHMAC(payload, secret);
await env.TASK_QUEUE.send({
  type: 'webhook:order_created',
  data: { webhookUrl, payload, signature }
});
```

## 18. Troubleshooting

### Common Issues

**Messages not processing:**
- Check consumer worker is deployed
- Verify queue binding configuration
- Check worker logs for errors

**Email delivery failures:**
- Verify email service credentials
- Check recipient email validity
- Monitor bounce/complaint rates

**High queue depth:**
- Increase consumer batch size
- Optimize message processing time
- Check for consumer errors

### Debug Commands
```bash
# Check queue configuration
wrangler queues list

# View consumer worker status
wrangler deployments list --name iwishbag-queue-consumer

# Test queue connectivity
curl https://queue-api.iwishbag.com/health
```