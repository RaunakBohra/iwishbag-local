# eSewa Payment Gateway Cloud Database Setup Instructions

## Overview
Since direct database connection isn't working with the provided credentials, please follow these steps to configure eSewa in your cloud Supabase database using the dashboard.

## Steps to Configure eSewa

### 1. Access Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project: **iWishBag-Latest** (grgvlrvywsfmnmkxrecd)

### 2. Open SQL Editor
1. In the left sidebar, click on **SQL Editor**
2. Click **New Query** to create a new SQL script

### 3. Execute eSewa Configuration Script
Copy and paste the entire content from `esewa_dashboard_script.sql` into the SQL editor and click **Run**.

The script will:
- Show current payment gateways
- Remove any existing eSewa configuration
- Insert the new eSewa configuration with proper settings
- Verify the configuration was applied correctly

### 4. Verify Configuration
After running the main script, create another new query and run the content from `verify_esewa_config.sql` to ensure everything was configured correctly.

## Expected Configuration Details

The eSewa configuration will include:

| Field | Value |
|-------|--------|
| **code** | `esewa` |
| **name** | `eSewa` |
| **is_active** | `true` |
| **supported_countries** | `['NP']` |
| **supported_currencies** | `['NPR']` |
| **fee_percent** | `2.5` |
| **fee_fixed** | `0` |
| **test_mode** | `true` |
| **priority** | `3` |
| **description** | `eSewa digital wallet for Nepal - Test Environment` |

### Configuration JSON:
```json
{
  "product_code": "EPAYTEST",
  "secret_key": "8gBm/:&EnhH.1/q",
  "environment": "test",
  "success_url": "/payment-callback/esewa-success",
  "failure_url": "/payment-callback/esewa-failure"
}
```

## Files Created

1. **`esewa_dashboard_script.sql`** - Main configuration script
2. **`verify_esewa_config.sql`** - Verification script
3. **`insert_esewa_config.sql`** - Standalone insert script
4. **`check_payment_gateways.sql`** - Simple check script

## Alternative Approach

If the dashboard approach doesn't work, you can also:

1. Use the Supabase API directly from your application
2. Create a migration script in your application code
3. Use the Supabase client library to insert the configuration

## Troubleshooting

If you encounter issues:

1. **Permission Error**: Ensure you have admin access to the Supabase project
2. **Table Not Found**: Verify the `payment_gateways` table exists in your schema
3. **JSON Error**: Check that the JSON configuration is properly formatted
4. **Constraint Violation**: Ensure no existing eSewa configuration conflicts

## Verification Steps

After running the scripts, verify:

1. ✅ eSewa appears in the payment_gateways table
2. ✅ is_active is set to `true`
3. ✅ supported_currencies contains `NPR`
4. ✅ config JSON contains all required fields
5. ✅ test_mode is set to `true`

## Next Steps

Once eSewa is configured in the cloud database:

1. Update your application's payment gateway selection logic
2. Test eSewa payments in the application
3. Verify callback URLs are working correctly
4. Switch to production credentials when ready for live payments

---

**Note**: This configuration matches your local database setup and uses test credentials. Remember to update to production credentials before going live.