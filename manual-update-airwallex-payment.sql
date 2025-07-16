-- Manual update for the Airwallex payment that was successful
-- This is a temporary fix until the webhook processes it

-- First, check if there's a payment transaction for the payment intent
SELECT * FROM payment_transactions 
WHERE gateway_response->>'payment_intent_id' = 'int_hkdmd24mdh99nak5e43'
OR transaction_id LIKE '%int_hkdmd24mdh99nak5e43%';

-- If you need to manually update quotes to paid status:
-- 1. Find the quote IDs from the payment transaction
-- 2. Update them to paid status

-- Example (replace quote_id with actual IDs):
/*
UPDATE quotes
SET 
    status = 'paid',
    payment_status = 'paid',
    payment_method = 'airwallex',
    paid_at = NOW(),
    in_cart = false,
    payment_details = jsonb_build_object(
        'gateway', 'airwallex',
        'payment_intent_id', 'int_hkdmd24mdh99nak5e43',
        'amount', 13.38,
        'currency', 'USD',
        'settled_at', '2025-07-16T12:09:44+0000'
    )
WHERE id IN ('your-quote-id-here')
AND status != 'paid'; -- Safety check
*/

-- Check recent quotes that might be related
SELECT id, display_id, status, final_total, currency, user_id, created_at
FROM quotes
WHERE status IN ('approved', 'sent', 'processing')
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;