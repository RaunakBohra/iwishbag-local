-- Complete Stripe Setup Script
-- Run this in your Supabase SQL Editor

-- 1. First, let's check your current Stripe configuration
SELECT 
    code,
    name,
    config,
    test_mode,
    enabled
FROM payment_gateways 
WHERE code = 'stripe';

-- 2. Update Stripe configuration with webhook secret
-- IMPORTANT: Replace 'whsec_YOUR_ACTUAL_SECRET' with your actual webhook signing secret from Stripe
UPDATE payment_gateways
SET 
    config = jsonb_build_object(
        'environment', 'test',
        'test_secret_key', COALESCE(config->>'test_secret_key', 'sk_test_YOUR_KEY'),
        'test_publishable_key', COALESCE(config->>'test_publishable_key', 'pk_test_YOUR_KEY'),
        'webhook_secret', 'whsec_YOUR_ACTUAL_SECRET', -- <-- REPLACE THIS
        'api_version', '2023-10-16',
        'live_secret_key', COALESCE(config->>'live_secret_key', ''),
        'live_publishable_key', COALESCE(config->>'live_publishable_key', '')
    ),
    enabled = true,
    updated_at = NOW()
WHERE code = 'stripe';

-- 3. Create a function to manually record Stripe payments (for missed webhooks)
CREATE OR REPLACE FUNCTION record_stripe_payment(
    p_payment_intent_id TEXT,
    p_amount DECIMAL,
    p_currency TEXT,
    p_quote_id UUID,
    p_user_id UUID,
    p_status TEXT DEFAULT 'succeeded'
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Insert into payment_transactions
    INSERT INTO payment_transactions (
        user_id,
        quote_id,
        amount,
        currency,
        status,
        payment_method,
        gateway_response,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_quote_id,
        p_amount,
        p_currency,
        CASE WHEN p_status = 'succeeded' THEN 'completed' ELSE p_status END,
        'stripe',
        jsonb_build_object(
            'id', p_payment_intent_id,
            'status', p_status,
            'amount', p_amount * 100, -- Convert to cents
            'currency', LOWER(p_currency)
        ),
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Update quote status
    UPDATE quotes 
    SET 
        status = 'paid',
        payment_status = 'paid',
        payment_method = 'stripe',
        payment_completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_quote_id
    AND status != 'paid';

    -- Create payment ledger entry
    v_result := create_payment_with_ledger_entry(
        p_quote_id := p_quote_id,
        p_amount := p_amount,
        p_currency := p_currency,
        p_payment_method := 'stripe',
        p_payment_type := 'customer_payment',
        p_reference_number := p_payment_intent_id,
        p_gateway_code := 'stripe',
        p_gateway_transaction_id := p_payment_intent_id,
        p_notes := 'Stripe payment recorded manually',
        p_user_id := p_user_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_intent_id', p_payment_intent_id,
        'quote_updated', true,
        'ledger_result', v_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Record your recent successful payments that missed the webhook
-- Payment 1: pi_3RlBRmQj80XSacOA1djAv9ND
SELECT record_stripe_payment(
    'pi_3RlBRmQj80XSacOA1djAv9ND',
    1063.81,
    'USD',
    '974397df-e02b-48f3-a091-b5edd44fd35c'::uuid,
    '130ec316-970f-429f-8cb8-ff9adf751248'::uuid
);

-- Payment 2: pi_3RlBsgQj80XSacOA0l9xvdRM
SELECT record_stripe_payment(
    'pi_3RlBsgQj80XSacOA0l9xvdRM',
    258.28,
    'USD',
    'ee10aee9-25f6-415b-ae2f-996d3c8a48b1'::uuid,
    '130ec316-970f-429f-8cb8-ff9adf751248'::uuid
);

-- 5. Verify the payments were recorded
SELECT 
    pt.id,
    pt.quote_id,
    pt.amount,
    pt.currency,
    pt.status,
    pt.payment_method,
    pt.gateway_response->>'id' as stripe_payment_id,
    pt.created_at,
    q.status as quote_status,
    q.payment_status
FROM payment_transactions pt
JOIN quotes q ON pt.quote_id = q.id
WHERE pt.payment_method = 'stripe'
ORDER BY pt.created_at DESC;

-- 6. Check payment ledger entries
SELECT 
    pl.id,
    pl.quote_id,
    pl.amount,
    pl.currency,
    pl.payment_method,
    pl.gateway_transaction_id,
    pl.status,
    pl.created_at
FROM payment_ledger pl
WHERE pl.gateway_code = 'stripe'
ORDER BY pl.created_at DESC;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION record_stripe_payment TO authenticated;
GRANT EXECUTE ON FUNCTION record_stripe_payment TO service_role;