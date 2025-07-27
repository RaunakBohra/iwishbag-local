# Cloudflare Web Analytics Setup Guide

## Getting Your Analytics Token

### 1. Access Cloudflare Dashboard
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your domain (iwishbag.com)

### 2. Set Up Web Analytics
1. In the left sidebar, go to **Analytics & Logs** → **Web Analytics**
2. Click **"Add a site"** if not already added
3. Enter your site details:
   - Site name: iwishBag
   - Hostname: iwishbag.com (or your domain)
   - Time zone: Your preferred timezone

### 3. Get Your Analytics Token
1. After adding the site, you'll see a code snippet
2. Look for the token in the snippet:
   ```html
   <script defer src='https://static.cloudflareinsights.com/beacon.min.js' 
           data-cf-beacon='{"token": "YOUR_TOKEN_HERE"}'></script>
   ```
3. Copy the token value (without quotes)

### 4. Add Token to Environment
Add to your `.env` file:
```bash
VITE_CLOUDFLARE_ANALYTICS_TOKEN=your_token_here
```

## Features You'll Get

- **Real-time Analytics**: See visitors as they browse
- **Core Web Vitals**: LCP, FID, CLS metrics
- **Geographic Data**: Where your visitors are from
- **Top Pages**: Most visited pages
- **Traffic Sources**: How users find your site
- **Browser & Device Stats**: What your users are using

## Privacy Benefits

- No cookies required
- GDPR compliant by default
- No personal data collected
- Lightweight (< 5KB script)

## Viewing Analytics

1. Go to Cloudflare Dashboard
2. Navigate to **Analytics & Logs** → **Web Analytics**
3. Select your site to view metrics

## Advanced Features (Cloudflare Pro/Business)

- Custom events tracking
- Advanced filtering
- Longer data retention
- API access for custom dashboards

## Troubleshooting

If analytics aren't showing:
1. Check if token is correctly set in `.env`
2. Ensure you're testing in production mode
3. Wait 5-10 minutes for data to appear
4. Check browser console for errors

## Testing Locally

Analytics are disabled in development. To test:
```bash
npm run build
npm run preview
```

Then visit your preview site and check Cloudflare dashboard after a few minutes.