-- Final Stripe Setup - Add Webhook Secret and Record Missed Payments

-- 1. Update Stripe webhook secret
-- REPLACE 'whsec_YOUR_WEBHOOK_SECRET' with your actual webhook signing secret from Stripe
UPDATE payment_gateways
SET config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{webhook_secret}',
    '"whsec_YOUR_WEBHOOK_SECRET"'::jsonb
),
updated_at = NOW()
WHERE code = 'stripe';

-- 2. Verify configuration
SELECT 
    code,
    name,
    config->>'test_secret_key' as has_test_key,
    config->>'webhook_secret' as webhook_secret,
    test_mode,
    enabled
FROM payment_gateways 
WHERE code = 'stripe';

-- 3. Record your missed payments manually
-- Payment 1: $1,063.81
INSERT INTO payment_transactions (
    user_id,
    quote_id,
    amount,
    currency,
    status,
    payment_method,
    gateway_response,
    created_at
) VALUES (
    '130ec316-970f-429f-8cb8-ff9adf751248'::uuid,
    '974397df-e02b-48f3-a091-b5edd44fd35c'::uuid,
    1063.81,
    'USD',
    'completed',
    'stripe',
    '{"id": "pi_3RlBRmQj80XSacOA1djAv9ND", "status": "succeeded"}'::jsonb,
    NOW()
) ON CONFLICT DO NOTHING;

-- Payment 2: $258.28
INSERT INTO payment_transactions (
    user_id,
    quote_id,
    amount,
    currency,
    status,
    payment_method,
    gateway_response,
    created_at
) VALUES (
    '130ec316-970f-429f-8cb8-ff9adf751248'::uuid,
    'ee10aee9-25f6-415b-ae2f-996d3c8a48b1'::uuid,
    258.28,
    'USD',
    'completed',
    'stripe',
    '{"id": "pi_3RlBsgQj80XSacOA0l9xvdRM", "status": "succeeded"}'::jsonb,
    NOW()
) ON CONFLICT DO NOTHING;

-- 4. Update quote statuses
UPDATE quotes 
SET 
    status = 'paid',
    payment_status = 'paid',
    payment_method = 'stripe',
    payment_completed_at = NOW()
WHERE id IN (
    '974397df-e02b-48f3-a091-b5edd44fd35c'::uuid,
    'ee10aee9-25f6-415b-ae2f-996d3c8a48b1'::uuid
) AND status != 'paid';

-- 5. Create payment ledger entries using the function
SELECT create_payment_with_ledger_entry(
    p_quote_id := '974397df-e02b-48f3-a091-b5edd44fd35c'::uuid,
    p_amount := 1063.81,
    p_currency := 'USD',
    p_payment_method := 'stripe',
    p_payment_type := 'customer_payment',
    p_reference_number := 'pi_3RlBRmQj80XSacOA1djAv9ND',
    p_gateway_code := 'stripe',
    p_gateway_transaction_id := 'pi_3RlBRmQj80XSacOA1djAv9ND',
    p_notes := 'Stripe payment - recorded manually',
    p_user_id := '130ec316-970f-429f-8cb8-ff9adf751248'::uuid
);

SELECT create_payment_with_ledger_entry(
    p_quote_id := 'ee10aee9-25f6-415b-ae2f-996d3c8a48b1'::uuid,
    p_amount := 258.28,
    p_currency := 'USD',
    p_payment_method := 'stripe',
    p_payment_type := 'customer_payment',
    p_reference_number := 'pi_3RlBsgQj80XSacOA0l9xvdRM',
    p_gateway_code := 'stripe',
    p_gateway_transaction_id := 'pi_3RlBsgQj80XSacOA0l9xvdRM',
    p_notes := 'Stripe payment - recorded manually',
    p_user_id := '130ec316-970f-429f-8cb8-ff9adf751248'::uuid
);

-- 6. Verify everything worked
SELECT 
    pt.id,
    pt.quote_id,
    pt.amount,
    pt.currency,
    pt.status,
    pt.gateway_response->>'id' as payment_intent_id,
    q.status as quote_status,
    q.payment_status
FROM payment_transactions pt
JOIN quotes q ON pt.quote_id = q.id
WHERE pt.payment_method = 'stripe'
ORDER BY pt.created_at DESC;