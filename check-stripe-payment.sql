-- Check recent payment transactions for Stripe
SELECT 
    id,
    quote_id,
    gateway_code,
    transaction_id,
    gateway_transaction_id,
    amount,
    currency,
    status,
    gateway_response,
    error_message,
    created_at,
    updated_at
FROM payment_transactions
WHERE gateway_code = 'stripe'
ORDER BY created_at DESC
LIMIT 5;

-- Check recent quotes with paid status
SELECT 
    id,
    status,
    final_total,
    final_currency,
    payment_status,
    payment_method,
    created_at,
    updated_at
FROM quotes
WHERE payment_method = 'stripe' 
   OR status = 'paid'
ORDER BY updated_at DESC
LIMIT 5;

-- Check payment verification logs
SELECT 
    id,
    request_id,
    transaction_id,
    gateway,
    success,
    created_at
FROM payment_verification_logs
WHERE gateway = 'stripe'
ORDER BY created_at DESC
LIMIT 5;

-- Check if payment_ledger has any Stripe entries
SELECT 
    id,
    quote_id,
    transaction_type,
    amount,
    currency,
    status,
    gateway,
    reference_id,
    created_at
FROM payment_ledger
WHERE gateway = 'stripe'
ORDER BY created_at DESC
LIMIT 5;