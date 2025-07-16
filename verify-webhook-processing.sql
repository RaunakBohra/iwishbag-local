-- Check if the webhook was received and processed
SELECT 
    request_id,
    webhook_type,
    event_type,
    event_id,
    payment_id,
    status,
    error_message,
    created_at,
    updated_at
FROM webhook_logs
WHERE webhook_type = 'airwallex'
AND created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 10;

-- Check if the quote was updated to paid
SELECT 
    id,
    display_id,
    status,
    payment_status,
    payment_method,
    final_total,
    currency,
    paid_at,
    payment_details->>'payment_intent_id' as payment_intent_id,
    updated_at
FROM quotes
WHERE id = '4909a6a2-31c2-4ed7-b4a6-45517975a39e';

-- Check payment transactions
SELECT 
    transaction_id,
    quote_ids,
    amount,
    currency,
    status,
    gateway_response->>'payment_intent_id' as payment_intent_id,
    gateway_response->>'status' as gateway_status,
    created_at
FROM payment_transactions
WHERE gateway = 'airwallex'
AND created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;