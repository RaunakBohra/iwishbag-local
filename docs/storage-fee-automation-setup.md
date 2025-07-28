# Storage Fee Automation Setup Guide

## Overview
The storage fee automation system calculates and creates storage fees daily for packages that have exceeded their free storage period. This guide explains how to set up the automated scheduling.

## Database Functions Created
- `calculate_and_create_storage_fees()` - Main function that calculates fees
- `get_packages_approaching_fees()` - Returns packages nearing fee period
- `waive_storage_fees()` - Admin function to waive fees
- `extend_storage_exemption()` - Admin function to extend free period

## Setting Up Automated Execution

### Option 1: Supabase Edge Functions (Recommended)

Create a scheduled Edge Function that runs daily:

```typescript
// supabase/functions/calculate-storage-fees/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabase.rpc('calculate_and_create_storage_fees')
  
  if (error) {
    console.error('Storage fee calculation failed:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  console.log('Storage fees calculated:', data)
  
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Deploy and schedule:
```bash
supabase functions deploy calculate-storage-fees
supabase functions schedule calculate-storage-fees --cron "0 0 * * *"
```

### Option 2: pg_cron Extension

If your Supabase instance has pg_cron enabled:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily storage fee calculation at midnight UTC
SELECT cron.schedule(
  'calculate-storage-fees',
  '0 0 * * *',
  $$SELECT calculate_and_create_storage_fees();$$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- Remove job if needed
SELECT cron.unschedule('calculate-storage-fees');
```

### Option 3: External Cron Job

Use a service like GitHub Actions, Vercel Cron, or your own server:

```yaml
# .github/workflows/calculate-storage-fees.yml
name: Calculate Storage Fees

on:
  schedule:
    - cron: '0 0 * * *' # Daily at midnight UTC
  workflow_dispatch: # Allow manual trigger

jobs:
  calculate-fees:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Function
        run: |
          curl -X POST \
            '${{ secrets.SUPABASE_URL }}/rest/v1/rpc/calculate_and_create_storage_fees' \
            -H 'apikey: ${{ secrets.SUPABASE_SERVICE_KEY }}' \
            -H 'Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}' \
            -H 'Content-Type: application/json' \
            -d '{}'
```

## Configuration

Storage fee settings can be configured through the admin panel or directly in the database:

```sql
-- View current configuration
SELECT * FROM unified_configuration WHERE config_key = 'storage_fees';

-- Update configuration
INSERT INTO unified_configuration (config_key, config_value, description)
VALUES (
  'storage_fees',
  '{
    "freeDays": 30,
    "dailyRateUSD": 1.00,
    "warningDaysBeforeFees": 7,
    "lateFeeThresholdDays": 90,
    "lateFeeRateUSD": 2.00
  }'::jsonb,
  'Storage fee automation configuration'
)
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = NOW();
```

## Manual Execution

To manually run the storage fee calculation:

### From Admin Panel
Navigate to Warehouse Management > Financial tab and click "Run Daily Calculation"

### From SQL
```sql
SELECT * FROM calculate_and_create_storage_fees();
```

### From Application Code
```typescript
const result = await storageFeeAutomationService.calculateDailyStorageFees();
console.log(`Processed ${result.processed} packages, created ${result.newFees} new fees`);
```

## Monitoring

### Check Recent Fee Calculations
```sql
-- View recently created storage fees
SELECT 
  sf.*,
  rp.tracking_number,
  rp.sender_name
FROM storage_fees sf
JOIN received_packages rp ON sf.package_id = rp.id
ORDER BY sf.created_at DESC
LIMIT 20;

-- Check packages approaching fees
SELECT * FROM get_packages_approaching_fees(7); -- 7 day warning
```

### View Analytics
```sql
-- Storage fee summary by user
SELECT * FROM storage_fee_summary;

-- Total revenue and unpaid fees
SELECT 
  COUNT(DISTINCT package_id) as total_packages,
  SUM(CASE WHEN is_paid THEN total_fee_usd ELSE 0 END) as paid_revenue,
  SUM(CASE WHEN NOT is_paid THEN total_fee_usd ELSE 0 END) as unpaid_fees,
  AVG(days_stored) as avg_days_stored
FROM storage_fees;
```

## Customer Notifications

The system displays storage fee alerts to customers:
- Warning when packages approach the end of free period
- Alert showing total unpaid fees
- Details of which packages are accruing fees

These appear automatically on the Package Forwarding dashboard.

## Troubleshooting

### Fees Not Calculating
1. Check that packages have `storage_fee_exempt_until` dates in the past
2. Verify the scheduled job is running
3. Check for errors in the function execution logs

### Incorrect Fee Amounts
1. Verify configuration in `unified_configuration` table
2. Check that package received dates are correct
3. Ensure no duplicate fee records exist

### Performance Issues
1. Ensure indexes exist on `storage_fee_exempt_until` and related columns
2. Consider batching if processing thousands of packages
3. Monitor query performance with EXPLAIN ANALYZE