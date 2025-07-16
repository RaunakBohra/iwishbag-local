-- Check recent Airwallex payment transactions
SELECT 
    transaction_id,
    quote_ids,
    amount,
    currency,
    status,
    gateway_response,
    created_at
FROM payment_transactions
WHERE gateway = 'airwallex'
ORDER BY created_at DESC
LIMIT 5;

-- Check webhook logs for Airwallex
SELECT 
    request_id,
    event_type,
    status,
    error_message,
    payload_size,
    created_at
FROM webhook_logs
WHERE webhook_type = 'airwallex'
ORDER BY created_at DESC
LIMIT 5;

-- Check quotes that might have been updated
SELECT 
    id,
    display_id,
    status,
    payment_method,
    payment_status,
    final_total,
    paid_at,
    updated_at
FROM quotes
WHERE payment_method = 'airwallex'
   OR updated_at > NOW() - INTERVAL '10 minutes'
ORDER BY updated_at DESC
LIMIT 10;