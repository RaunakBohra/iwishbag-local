-- 1. Get the most recent PayPal refund from gateway_refunds
SELECT 
    gr.*,
    pt.transaction_id as payment_transaction_id,
    pt.total_refunded,
    pt.refund_count,
    pt.is_fully_refunded
FROM gateway_refunds gr
LEFT JOIN payment_transactions pt ON gr.payment_transaction_id = pt.id
WHERE gr.gateway_code = 'paypal' OR gr.gateway_code LIKE '%paypal%'
ORDER BY gr.created_at DESC
LIMIT 1;

-- 2. Get the gateway_response JSON content for the latest PayPal refund
SELECT 
    id,
    refund_reference,
    gateway_code,
    amount,
    status,
    gateway_response::text as gateway_response_text,
    created_at
FROM gateway_refunds
WHERE gateway_code = 'paypal' OR gateway_code LIKE '%paypal%'
ORDER BY created_at DESC
LIMIT 1;

-- 3. Check payment_ledger for corresponding refund entry
SELECT 
    pl.*,
    gr.refund_reference
FROM payment_ledger pl
JOIN gateway_refunds gr ON pl.gateway_transaction_id = gr.refund_reference
WHERE gr.gateway_code = 'paypal' OR gr.gateway_code LIKE '%paypal%'
ORDER BY pl.created_at DESC
LIMIT 5;

-- 4. Get all PayPal refunds to see the pattern
SELECT 
    id,
    payment_transaction_id,
    refund_reference,
    gateway_code,
    amount,
    currency,
    status,
    refund_reason,
    jsonb_pretty(gateway_response) as formatted_response,
    created_at
FROM gateway_refunds
WHERE gateway_code = 'paypal' OR gateway_code LIKE '%paypal%'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check the payment_transactions table for refund updates
SELECT 
    pt.id,
    pt.transaction_id,
    pt.amount,
    pt.currency,
    pt.total_refunded,
    pt.refund_count,
    pt.is_fully_refunded,
    pt.status,
    COUNT(gr.id) as actual_refund_count,
    SUM(gr.amount) as actual_total_refunded
FROM payment_transactions pt
LEFT JOIN gateway_refunds gr ON pt.id = gr.payment_transaction_id
WHERE pt.gateway_code = 'paypal' 
    AND (pt.total_refunded > 0 OR EXISTS (
        SELECT 1 FROM gateway_refunds 
        WHERE payment_transaction_id = pt.id
    ))
GROUP BY pt.id
ORDER BY pt.updated_at DESC
LIMIT 5;
