-- Verify PayPal Refund System in Production
-- Run these queries to verify the deployment

-- 1. Check if PayPal refund tables exist
SELECT 
    'paypal_refunds' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'paypal_refunds'
    ) as exists;

SELECT 
    'paypal_refund_reasons' as table_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'paypal_refund_reasons'
    ) as exists;

-- 2. Check if new columns were added to payment_transactions
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'payment_transactions'
    AND column_name IN ('total_refunded', 'refund_count', 'is_fully_refunded', 'last_refund_at')
ORDER BY column_name;

-- 3. Check if refund reasons were inserted
SELECT 
    code,
    description,
    is_active,
    display_order
FROM paypal_refund_reasons
ORDER BY display_order
LIMIT 5;

-- 4. Test the refund eligibility function
SELECT 
    id,
    paypal_capture_id,
    amount,
    total_refunded,
    is_fully_refunded
FROM payment_transactions
WHERE payment_method = 'paypal'
    AND status = 'completed'
    AND paypal_capture_id IS NOT NULL
LIMIT 3;

-- 5. Check RLS policies for refund tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('paypal_refunds', 'paypal_refund_reasons')
ORDER BY tablename, policyname;

-- 6. Test a sample query that the frontend will run
SELECT 
    pt.id,
    pt.paypal_capture_id,
    pt.paypal_order_id,
    pt.amount,
    pt.currency,
    pt.status,
    pt.created_at,
    pt.total_refunded,
    pt.refund_count,
    pt.is_fully_refunded,
    pt.quote_id,
    pt.user_id,
    q.product_name
FROM payment_transactions pt
LEFT JOIN quotes q ON pt.quote_id = q.id
WHERE pt.payment_method = 'paypal'
    AND pt.status = 'completed'
    AND pt.paypal_capture_id IS NOT NULL
ORDER BY pt.created_at DESC
LIMIT 5;