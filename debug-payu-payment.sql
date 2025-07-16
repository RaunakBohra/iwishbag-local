-- Debug PayU Payment Issues
-- Run this after attempting a PayU payment to see what's happening

-- 1. Check recent PayU webhook events (last 30 minutes)
SELECT 
    id,
    transaction_id,
    mihpayid,
    status,
    processed_at,
    event_data->>'amount' as amount,
    event_data->>'email' as email,
    event_data->>'status' as payment_status,
    event_data->>'error' as error_message
FROM payu_webhook_events
WHERE processed_at > NOW() - INTERVAL '30 minutes'
ORDER BY processed_at DESC;

-- 2. Check recent payment transactions
SELECT 
    id,
    payu_txnid,
    amount,
    status,
    payment_method,
    customer_email,
    error_message,
    created_at,
    gateway_response->>'mihpayid' as mihpayid,
    gateway_response->>'status' as gateway_status
FROM payment_transactions
WHERE gateway_code = 'payu'
AND created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC;

-- 3. Check recent quotes with PayU payments
SELECT 
    id,
    display_id,
    status,
    payment_status,
    payment_gateway_code,
    payment_transaction_id,
    final_total,
    paid_at,
    updated_at
FROM quotes
WHERE payment_gateway_code = 'payu'
AND updated_at > NOW() - INTERVAL '30 minutes'
ORDER BY updated_at DESC;

-- 4. Check webhook logs for PayU
SELECT 
    request_id,
    webhook_type,
    status,
    error_message,
    created_at
FROM webhook_logs
WHERE webhook_type = 'payu'
AND created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC;

-- 5. Check for duplicate transaction IDs
SELECT 
    payu_txnid,
    COUNT(*) as count,
    array_agg(id) as payment_ids,
    array_agg(status) as statuses,
    array_agg(created_at) as created_times
FROM payment_transactions
WHERE gateway_code = 'payu'
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY payu_txnid
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;