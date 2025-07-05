# Quote Expiration System Setup

## Overview
This system automatically expires quotes after 5 days if they haven't been paid. It includes:
- Database triggers to set expiration timestamps
- Beautiful countdown timer UI
- Automated expiration via cron job
- Status transition logging

## Database Migration
Run the migration to add expiration tracking:
```bash
supabase db push
```

## Edge Function Deployment
Deploy the expiration function:
```bash
supabase functions deploy expire-quotes
```

## Cron Job Setup

### Option 1: Supabase Cron (Recommended)
Add this to your `supabase/config.toml`:

```toml
[cron]
  [cron.expire-quotes]
    schedule = "0 0 * * *"  # Daily at midnight
    function = "expire-quotes"
```

### Option 2: External Cron Service
Use a service like cron-job.org or GitHub Actions:

**GitHub Actions Example:**
```yaml
name: Expire Quotes
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  expire-quotes:
    runs-on: ubuntu-latest
    steps:
      - name: Call Expire Quotes Function
        run: |
          curl -X POST "https://your-project.supabase.co/functions/v1/expire-quotes" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

**cron-job.org Example:**
- URL: `https://your-project.supabase.co/functions/v1/expire-quotes`
- Method: POST
- Headers: 
  - `Authorization: Bearer your_service_role_key`
  - `Content-Type: application/json`
- Schedule: Daily at 00:00

## Testing

### Manual Test
```bash
node test-quote-expiration.js
```

### Manual Function Call
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/expire-quotes" \
  -H "Authorization: Bearer your_service_role_key" \
  -H "Content-Type: application/json"
```

## How It Works

### 1. Quote Status Changes to 'sent'
- Database trigger automatically sets `sent_at = NOW()`
- Database trigger automatically sets `expires_at = NOW() + INTERVAL '5 days'`

### 2. Daily Cron Job
- Calls `expire_quotes()` database function
- Finds quotes with `status = 'sent'` and `expires_at <= NOW()`
- Updates them to `status = 'expired'`
- Logs the transition in `status_transitions_log`

### 3. UI Countdown Timer
- Shows beautiful countdown for quotes with `status = 'sent'`
- Changes color based on time remaining:
  - Green: > 3 days
  - Orange: 1-3 days  
  - Red: < 1 day
- Shows warning message when < 1 day remaining

## Configuration

### Expiration Duration
To change from 5 days to another duration, update the trigger function:

```sql
-- In the migration file, change this line:
NEW.expires_at = NOW() + INTERVAL '5 days';

-- To your desired duration, e.g.:
NEW.expires_at = NOW() + INTERVAL '7 days';  -- 7 days
NEW.expires_at = NOW() + INTERVAL '3 days';  -- 3 days
```

### Cron Schedule
Change the cron schedule in your config:

```toml
# Run every 6 hours instead of daily
schedule = "0 */6 * * *"

# Run every hour
schedule = "0 * * * *"

# Run every 30 minutes
schedule = "*/30 * * * *"
```

## Monitoring

### Check Expired Quotes
```sql
SELECT id, display_id, email, status, sent_at, expires_at, final_total
FROM quotes 
WHERE status = 'expired'
ORDER BY updated_at DESC;
```

### Check Expiring Soon
```sql
SELECT id, display_id, email, status, sent_at, expires_at, final_total
FROM quotes 
WHERE status = 'sent' 
  AND expires_at IS NOT NULL
  AND expires_at <= NOW() + INTERVAL '1 day'
ORDER BY expires_at ASC;
```

### Check Function Logs
```sql
SELECT * FROM status_transitions_log 
WHERE trigger = 'auto_expiration'
ORDER BY changed_at DESC;
```

## Troubleshooting

### Quotes Not Expiring
1. Check if cron job is running: `supabase functions logs expire-quotes`
2. Verify trigger function: Test manually updating a quote status to 'sent'
3. Check database function: `SELECT expire_quotes();`

### Timer Not Showing
1. Verify quote has `status = 'sent'`
2. Check if `expires_at` is set
3. Ensure component is imported and used correctly

### Performance Issues
- Add indexes on `status` and `expires_at` columns
- Consider running cron less frequently for large datasets
- Monitor function execution time in Supabase logs 