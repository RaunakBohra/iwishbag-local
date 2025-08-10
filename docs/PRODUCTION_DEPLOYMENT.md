# Production Deployment Guide

## 🔒 Environment Variables Setup

### 1. Supabase Edge Functions

Navigate to your Supabase project dashboard and set these secrets:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_production_aws_access_key
AWS_SECRET_ACCESS_KEY=your_production_aws_secret_key
AWS_REGION=us-east-1

# Third-party APIs
SCRAPER_API_KEY=your_production_scraper_api_key
BRIGHTDATA_API_KEY=your_production_brightdata_api_key

# Payment Webhooks
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
AIRWALLEX_WEBHOOK_SECRET=your_production_airwallex_webhook_secret

# Email Service
RESEND_API_KEY=re_your_production_resend_api_key
```

**How to set:**
1. Go to Supabase Dashboard → Your Project → Edge Functions
2. Click "Manage secrets" 
3. Add each environment variable

### 2. Cloudflare Workers

For your Cloudflare Workers, set these environment variables:

```bash
# Via Cloudflare Dashboard
CLOUDFLARE_API_TOKEN=your_production_cloudflare_api_token
BRIGHTDATA_API_KEY=your_production_brightdata_api_key
SYNC_API_KEY=your_production_sync_api_key
```

**How to set:**
1. Cloudflare Dashboard → Workers & Pages → Your Worker
2. Settings → Environment Variables
3. Add production variables

### 3. GitHub Secrets (for Actions)

Set these in your GitHub repository:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
SYNC_API_KEY=your_production_sync_api_key
```

**How to set:**
1. GitHub Repository → Settings → Secrets and Variables → Actions
2. Click "New repository secret"
3. Add each secret

### 4. Frontend Environment (.env.production)

Create `.env.production` file:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key
VITE_SCRAPER_API_KEY=your_production_scraper_api_key
VITE_PROXY_API_KEY=your_production_proxy_api_key
```

## 🚀 Deployment Commands

### Deploy Edge Functions
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy send-email-ses
```

### Deploy Cloudflare Workers
```bash
# Deploy with production environment
wrangler deploy --env production
```

### Build and Deploy Frontend
```bash
# Build for production
npm run build

# Deploy to your hosting platform
# (Vercel, Netlify, etc.)
```

## ✅ Post-Deployment Checklist

- [ ] All environment variables set in Supabase
- [ ] Cloudflare Workers environment configured
- [ ] GitHub Actions secrets added
- [ ] Frontend production build working
- [ ] Payment webhooks configured and tested
- [ ] Email sending functionality tested
- [ ] Database connections verified
- [ ] API rate limits and quotas checked

## 🔍 Testing Production Setup

### Test Edge Functions
```bash
curl -X POST "https://your-project-ref.supabase.co/functions/v1/send-email" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Test API Integrations
```bash
# Test exchange rates
curl "https://your-worker.your-subdomain.workers.dev/api/rates"

# Test scraping service
curl -X POST "https://your-project-ref.supabase.co/functions/v1/scrape-product" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"url": "https://example.com/product"}'
```

## 🚨 Security Best Practices

1. **Rotate Keys Regularly**: Update API keys and secrets periodically
2. **Monitor Usage**: Keep track of API quotas and costs
3. **Separate Environments**: Never use production keys in development
4. **Access Control**: Limit who has access to production secrets
5. **Backup Configs**: Keep secure backups of your configurations

## 📞 Support

If you encounter issues:
1. Check logs in Supabase Dashboard → Edge Functions → Logs
2. Review Cloudflare Worker logs in the dashboard
3. Verify all environment variables are set correctly
4. Test individual components before full deployment