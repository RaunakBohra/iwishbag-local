# Cloudflare Real User Monitoring (RUM) Setup Guide

## 1. Enable RUM in Cloudflare Dashboard

1. Log in to Cloudflare Dashboard
2. Select your domain (whyteclub.com)
3. Navigate to **Analytics & Logs** > **Web Analytics**
4. Click on **Real User Monitoring** tab
5. Enable RUM and copy your RUM token

## 2. Configure RUM Token

Add the RUM token to your environment variables:

```bash
# .env.local
VITE_CLOUDFLARE_RUM_TOKEN=your_rum_token_here
```

For Cloudflare Pages:
1. Go to **Workers & Pages** > Your project > **Settings**
2. Add environment variable: `VITE_CLOUDFLARE_RUM_TOKEN`

## 3. RUM Integration

The RUM component is already integrated in `App.tsx`:

```tsx
import { CloudflareRUM } from '@/components/analytics/CloudflareRUM';

// In your app
<CloudflareRUM />
```

## 4. Core Web Vitals Tracking

RUM automatically tracks:
- **LCP (Largest Contentful Paint)**: Target < 2.5s
- **FID (First Input Delay)**: Target < 100ms
- **CLS (Cumulative Layout Shift)**: Target < 0.1
- **TTFB (Time to First Byte)**: Target < 800ms

## 5. Custom Metrics

Track custom business metrics:

```typescript
import { trackBusinessMetric, trackEvent } from '@/components/analytics/CloudflareRUM';

// Track conversion metrics
trackBusinessMetric('quote_value', 1500.00, {
  currency: 'USD',
  destination: 'IN',
  item_count: 3
});

// Track user events
trackEvent('checkout_completed', {
  payment_method: 'stripe',
  order_value: 1500.00
});
```

## 6. User Tracking

Set user ID for authenticated users:

```typescript
import { setRUMUser } from '@/components/analytics/CloudflareRUM';

// After login
setRUMUser(user.id);
```

## 7. Page View Tracking

Track SPA navigation:

```typescript
import { trackPageView } from '@/components/analytics/CloudflareRUM';

// In your router
trackPageView('/checkout', {
  referrer: '/cart',
  cart_value: 1500.00
});
```

## 8. Performance Dashboard

Enable the performance dashboard in development:

```tsx
import { PerformanceDashboard } from '@/components/analytics/PerformanceDashboard';

// Shows in bottom-right corner in dev mode
{import.meta.env.DEV && <PerformanceDashboard />}
```

## 9. RUM Data in Cloudflare

View RUM data:
1. Go to **Analytics & Logs** > **Web Analytics**
2. Select **Real User Monitoring**
3. View dashboards for:
   - Core Web Vitals trends
   - Performance by page
   - User segments
   - Geographic performance
   - Device/browser breakdown

## 10. Alerting

Set up alerts for performance degradation:

1. Go to **Notifications**
2. Create alert for:
   - LCP > 4s for > 10% of users
   - FID > 300ms for > 5% of users
   - Error rate > 1%

## 11. Best Practices

### Optimize LCP
- Use Cloudflare Images for hero images
- Preload critical resources
- Minimize render-blocking CSS/JS

### Optimize FID
- Break up long tasks
- Use web workers for heavy computation
- Implement code splitting

### Optimize CLS
- Set explicit dimensions for images/ads
- Avoid inserting content above existing content
- Use CSS transforms for animations

## 12. Custom Dimensions

RUM tracks these custom dimensions:
- `app_version`: Application version
- `environment`: dev/staging/production
- `user_type`: guest/authenticated
- `user_id`: For authenticated users
- `page_type`: Category of page

## 13. API Performance Tracking

RUM automatically tracks:
- All fetch() requests
- Response times by endpoint
- Error rates
- Slow API detection (>1s)

## 14. Integration with Workers

Combine RUM with Worker analytics:
- Edge location performance
- Worker execution time
- Cache hit rates
- Regional performance

## 15. Privacy Compliance

RUM respects:
- No cookies required
- No PII in URLs
- IP anonymization
- GDPR compliant

## 16. Troubleshooting

**RUM not loading:**
- Check token is correct
- Verify domain is active in Cloudflare
- Check browser console for errors

**Missing metrics:**
- Ensure page fully loads
- Check browser compatibility
- Verify no ad blockers

**Custom events not tracking:**
- Confirm RUM is initialized
- Check event names (alphanumeric + underscores)
- Verify data size < 1KB per event

## 17. Cost

RUM pricing:
- First 1M page views/month: Free
- Additional: $0.01 per 1,000 page views
- No charge for custom metrics/events

## 18. Advanced Features

### Sampling
Control sampling rate to reduce costs:
```javascript
RUM_CONFIG.sampleRate = 10; // Sample 10% of sessions
```

### Session Replay (Coming Soon)
- Record user sessions
- Replay for debugging
- Privacy-safe recording

### A/B Testing Integration
Track experiment metrics:
```typescript
trackEvent('experiment_viewed', {
  experiment: 'new_checkout_flow',
  variant: 'B'
});
```