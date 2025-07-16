-- Debug PayU Payment Issues (Corrected for actual schema)
-- Run this after attempting a PayU payment to see what's happening

-- 1. Check recent payment transactions with PayU
SELECT 
    id,
    quote_id,
    amount,
    currency,
    status,
    payment_method,
    created_at,
    gateway_response->>'txnid' as txnid,
    gateway_response->>'mihpayid' as mihpayid,
    gateway_response->>'status' as gateway_status,
    gateway_response->>'error' as error_message,
    gateway_response->>'mode' as payment_mode
FROM payment_transactions
WHERE gateway_response->>'gateway_code' = 'payu'
   OR gateway_response->>'key' IS NOT NULL  -- PayU responses have 'key' field
   OR payment_method = 'payu'
   AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check recent quotes that might be PayU payments
SELECT 
    id,
    display_id,
    status,
    payment_status,
    payment_method,
    final_total,
    paid_at,
    updated_at,
    payment_details->>'gateway' as payment_gateway,
    payment_details->>'transaction_id' as transaction_id
FROM quotes
WHERE (payment_method = 'payu' 
   OR payment_details->>'gateway' = 'payu'
   OR status = 'paid')
   AND updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC
LIMIT 20;

-- 3. Check webhook logs
SELECT 
    request_id,
    webhook_type,
    status,
    error_message,
    created_at,
    event_type,
    payment_id
FROM webhook_logs
WHERE webhook_type = 'payu'
   OR request_id LIKE 'payu_%'
   AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;

-- 4. Check for any duplicate payments by transaction ID
SELECT 
    gateway_response->>'txnid' as txnid,
    COUNT(*) as count,
    array_agg(id) as payment_ids,
    array_agg(status) as statuses,
    array_agg(created_at ORDER BY created_at) as created_times
FROM payment_transactions
WHERE gateway_response->>'txnid' IS NOT NULL
   AND created_at > NOW() - INTERVAL '2 hours'
GROUP BY gateway_response->>'txnid'
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 5. Check all recent payment gateway activity
SELECT 
    code,
    name,
    test_mode,
    config->>'merchant_key' IS NOT NULL as has_merchant_key,
    config->>'salt_key' IS NOT NULL as has_salt_key
FROM payment_gateways
WHERE code = 'payu';