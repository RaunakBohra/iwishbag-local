-- Find quotes with display ID like c6921e
SELECT 
    q.id as quote_id,
    q.order_display_id,
    q.final_total,
    q.amount_paid,
    q.payment_status,
    q.final_currency,
    q.payment_transaction_id
FROM quotes q
WHERE q.order_display_id LIKE '%c6921e%'
OR q.id::text LIKE '%c6921e%'
ORDER BY q.created_at DESC
LIMIT 5;

-- Check payment transactions for recent orders
SELECT 
    pt.id,
    pt.quote_id,
    pt.amount,
    pt.currency,
    pt.status,
    pt.payment_method,
    pt.created_at
FROM payment_transactions pt
WHERE pt.amount = 1756.94
AND pt.created_at > NOW() - INTERVAL '1 day'
ORDER BY pt.created_at DESC
LIMIT 5;

-- Check payment ledger for recent orders
SELECT 
    pl.id,
    pl.quote_id,
    pl.payment_type,
    pl.amount,
    pl.currency,
    pl.status,
    pl.created_at
FROM payment_ledger pl
WHERE pl.amount = 1756.94
AND pl.created_at > NOW() - INTERVAL '1 day'
ORDER BY pl.created_at DESC
LIMIT 5;