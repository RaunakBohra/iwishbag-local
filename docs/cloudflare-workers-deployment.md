# Cloudflare Workers Deployment Guide

## 1. Prerequisites

- Cloudflare account with Workers enabled
- Wrangler CLI installed: `npm install -g wrangler`
- D1 database created
- KV namespace created

## 2. Worker Configuration

The `wrangler.toml` is already configured with:
```toml
name = "iwishbag-hybrid-worker"
account_id = "610762493d34333f1a6d72a037b345cf"

[[kv_namespaces]]
binding = "IWISHBAG_CACHE"
id = "6f5087b9d89146dfbeb8efa92a9b4756"

[[d1_databases]]
binding = "DB"
database_name = "iwishbag-edge-cache"
database_id = "3c663e4c-cad7-4262-a73d-f1ec9a4367a9"
```

## 3. Deploy the Worker

### Step 1: Authenticate with Cloudflare
```bash
wrangler login
```

### Step 2: Deploy the API Worker
```bash
# Deploy to production
wrangler deploy workers/api-worker.js

# Or deploy to a specific environment
wrangler deploy workers/api-worker.js --env staging
```

### Step 3: Set up custom domain (optional)
```bash
# Add custom domain
wrangler domains add api.iwishbag.com
```

## 4. Environment Variables

Add these to your Worker environment:
```bash
# Set secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY

# Set variables
wrangler vars put ALLOWED_ORIGINS "https://iwishbag.com,https://whyteclub.com"
```

## 5. Configure Routes

In Cloudflare Dashboard:
1. Go to Workers & Pages > your-worker
2. Click "Triggers" tab
3. Add routes:
   - `api.iwishbag.com/*`
   - `iwishbag.com/api/*`
   - `whyteclub.com/api/*`

## 6. Enable Workers AI (Optional)

For AI-powered product classification:
1. Go to Workers & Pages > your-worker
2. Click "Settings" > "Bindings"
3. Add AI binding:
   - Variable name: `AI`
   - Service: Workers AI

## 7. Update Frontend Configuration

Add Worker API URL to environment:
```env
VITE_WORKER_API_URL=https://api.iwishbag.workers.dev
```

Or for custom domain:
```env
VITE_WORKER_API_URL=https://api.iwishbag.com
```

## 8. Test Endpoints

### Health Check
```bash
curl https://api.iwishbag.workers.dev/api/health
```

### Currency Conversion
```bash
curl -X POST https://api.iwishbag.workers.dev/api/currency/convert \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "from": "USD", "to": "INR"}'
```

### Product Classification
```bash
curl -X POST https://api.iwishbag.workers.dev/api/product/classify \
  -H "Content-Type: application/json" \
  -d '{"product": "iPhone 15 Pro", "origin": "US", "destination": "IN"}'
```

## 9. Monitor Performance

### Analytics
- Go to Workers & Pages > your-worker > Analytics
- Monitor requests, errors, CPU time, and latency

### Logs
```bash
# Tail logs in real-time
wrangler tail

# Filter logs
wrangler tail --search "error"
```

## 10. Update Worker Code

### Development
```bash
# Start local development
wrangler dev workers/api-worker.js

# Test with local D1 and KV
wrangler dev workers/api-worker.js --local
```

### Deploy Updates
```bash
# Deploy new version
wrangler deploy workers/api-worker.js

# Rollback if needed
wrangler rollback
```

## 11. Cost Optimization

### Free Tier Limits
- 100,000 requests/day
- 10ms CPU time/invocation
- Workers KV: 100,000 reads/day
- D1: 5GB storage, 5M rows read/day

### Optimization Tips
1. Use KV caching for frequently accessed data
2. Batch operations when possible
3. Implement request coalescing
4. Use Durable Objects for stateful operations

## 12. Security Best Practices

1. **CORS Configuration**: Restrict allowed origins
2. **Rate Limiting**: Implement per-IP limits
3. **Input Validation**: Validate all inputs
4. **API Keys**: Use Wrangler secrets for sensitive data
5. **Error Handling**: Don't expose internal errors

## 13. Troubleshooting

### Common Issues

**Worker returns 500 error**
- Check wrangler tail for detailed logs
- Verify KV and D1 bindings
- Check for syntax errors

**CORS errors**
- Verify CORS headers in Worker
- Check allowed origins configuration

**Performance issues**
- Review Analytics for CPU time
- Optimize database queries
- Increase caching duration

## 14. Advanced Features

### Multi-Region Deployment
```toml
[env.production]
routes = [
  { pattern = "api-us.iwishbag.com/*", zone_name = "iwishbag.com" },
  { pattern = "api-eu.iwishbag.com/*", zone_name = "iwishbag.com" },
  { pattern = "api-asia.iwishbag.com/*", zone_name = "iwishbag.com" }
]
```

### A/B Testing
```javascript
// In Worker code
const variant = Math.random() > 0.5 ? 'A' : 'B';
// Route to different logic based on variant
```

### WebSocket Support
```javascript
// Upgrade to WebSocket
if (request.headers.get('Upgrade') === 'websocket') {
  return handleWebSocketUpgrade(request);
}
```

## 15. Integration with Other Cloudflare Services

- **Images**: Process images on upload
- **Stream**: Handle video processing
- **R2**: Store large files
- **Queues**: Process async tasks
- **Email**: Send transactional emails