# Payment Proof Bulk Verification Fix

## Issue
The bulk payment verification shows "Verify Payments (0)" but the Payment Proofs card shows "2". This is because the database functions need to be created.

## Solution
Run the migration file `supabase/migrations/20250111000010_fix_payment_proof_functions.sql` in your Supabase SQL editor.

### Steps:
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20250111000010_fix_payment_proof_functions.sql`
4. Click "Run"

### What this fixes:
1. Creates the `get_orders_with_payment_proofs` function that fetches pending payment proofs
2. Creates the `get_payment_proof_stats` function that provides statistics
3. Handles multiple payment proofs per order (re-submissions)
4. Only shows the latest payment proof for each order

### After applying:
- The Payment Proofs card will show the correct count
- The Verify Payments button will show the same count
- The bulk verification modal will display the pending payment proofs
- Re-submitted payment proofs will appear correctly

### Note:
The frontend code has a fallback query that will work even without the database functions, but the functions provide better performance and consistency.