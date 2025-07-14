-- Verification queries to confirm PayPal payment ledger is working correctly

-- 1. Check if the specific payment now has a ledger entry
SELECT 
    'Checking payment a36749d6-c659-4048-b170-774fe15c5372' as check_type,
    pt.id as transaction_id,
    pt.quote_id,
    pt.amount,
    pt.currency,
    pt.paypal_order_id,
    pl.id as ledger_id,
    pl.created_at as ledger_created,
    CASE WHEN pl.id IS NOT NULL THEN '✓ Fixed' ELSE '✗ Still Missing' END as status
FROM payment_transactions pt
LEFT JOIN payment_ledger pl ON pl.payment_transaction_id = pt.id
WHERE (pt.id = 'a36749d6-c659-4048-b170-774fe15c5372'::uuid
   OR pt.quote_id = 'a36749d6-c659-4048-b170-774fe15c5372'::uuid)
   AND pt.payment_method = 'paypal';

-- 2. Summary of PayPal payments in ledger
SELECT 
    'PayPal Payment Ledger Summary' as report_type,
    COUNT(DISTINCT pt.id) as total_paypal_payments,
    COUNT(DISTINCT pl.id) as payments_with_ledger,
    COUNT(DISTINCT pt.id) - COUNT(DISTINCT pl.id) as missing_entries
FROM payment_transactions pt
LEFT JOIN payment_ledger pl ON pl.payment_transaction_id = pt.id
WHERE pt.payment_method = 'paypal'
  AND pt.status = 'completed';

-- 3. Recent PayPal ledger entries (last 24 hours)
SELECT 
    'Recent PayPal Ledger Entries' as section,
    pl.id,
    pl.quote_id,
    pl.amount,
    pl.currency,
    pl.payment_date,
    pl.gateway_transaction_id,
    pl.notes,
    q.order_display_id
FROM payment_ledger pl
JOIN quotes q ON pl.quote_id = q.id
WHERE pl.payment_method = 'paypal'
  AND pl.created_at > NOW() - INTERVAL '24 hours'
ORDER BY pl.created_at DESC
LIMIT 10;

-- 4. Test the new function with a sample call
-- This shows how the function can be used from the client
SELECT record_paypal_payment_to_ledger(
    p_quote_id := (SELECT quote_id FROM payment_transactions WHERE payment_method = 'paypal' LIMIT 1),
    p_transaction_id := (SELECT id FROM payment_transactions WHERE payment_method = 'paypal' LIMIT 1),
    p_amount := 100.00,
    p_currency := 'USD',
    p_order_id := 'TEST_ORDER_123',
    p_capture_id := 'TEST_CAPTURE_123',
    p_payer_email := 'test@example.com'
) as function_test;

-- 5. Verify RLS policy is working
-- This query should work for authenticated users
SELECT 
    'RLS Policy Test' as test_type,
    current_setting('request.jwt.claims', true)::json->>'sub' as current_user_id,
    EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payment_ledger' 
        AND policyname = 'Users can insert payment ledger for own quotes'
    ) as insert_policy_exists;