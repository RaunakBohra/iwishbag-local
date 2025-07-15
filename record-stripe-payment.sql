-- Record the successful Stripe payment in the database
-- This script creates the necessary records for your Stripe payment

-- First, check if the payment is already recorded
SELECT * FROM payment_transactions 
WHERE gateway_response->>'id' = 'pi_3RlBRmQj80XSacOA1djAv9ND'
   OR id::text = 'pi_3RlBRmQj80XSacOA1djAv9ND';

-- If not found above, insert the payment transaction
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
    '130ec316-970f-429f-8cb8-ff9adf751248'::uuid,  -- Your user ID
    '974397df-e02b-48f3-a091-b5edd44fd35c'::uuid,  -- Quote ID
    1063.81,  -- Amount in USD
    'USD',
    'completed',
    'stripe',
    '{
        "id": "pi_3RlBRmQj80XSacOA1djAv9ND",
        "object": "payment_intent",
        "amount": 106381,
        "currency": "usd",
        "status": "succeeded",
        "created": 1752595874,
        "metadata": {
            "quote_ids": "974397df-e02b-48f3-a091-b5edd44fd35c",
            "user_id": "130ec316-970f-429f-8cb8-ff9adf751248"
        },
        "payment_method": "pm_1RlBSQQj80XSacOACXQu6t5h",
        "latest_charge": "ch_3RlBRmQj80XSacOA1URA7D0G",
        "receipt_email": "iwbtracking@gmail.com"
    }'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING
RETURNING *;

-- Insert into payment_ledger using the function
SELECT create_payment_with_ledger_entry(
    p_quote_id := '974397df-e02b-48f3-a091-b5edd44fd35c'::uuid,
    p_amount := 1063.81,
    p_currency := 'USD',
    p_payment_method := 'stripe',
    p_payment_type := 'customer_payment',
    p_reference_number := 'pi_3RlBRmQj80XSacOA1djAv9ND',
    p_gateway_code := 'stripe',
    p_gateway_transaction_id := 'pi_3RlBRmQj80XSacOA1djAv9ND',
    p_notes := 'Stripe payment completed successfully',
    p_user_id := '130ec316-970f-429f-8cb8-ff9adf751248'::uuid
);

-- Update the quote to paid status
UPDATE quotes 
SET 
    status = 'paid',
    payment_status = 'paid',
    payment_method = 'stripe',
    payment_completed_at = NOW(),
    updated_at = NOW()
WHERE id = '974397df-e02b-48f3-a091-b5edd44fd35c'
  AND status != 'paid';  -- Only update if not already paid

-- Check the final state
SELECT 
    id,
    status,
    payment_status,
    payment_method,
    final_total,
    final_currency,
    payment_completed_at
FROM quotes 
WHERE id = '974397df-e02b-48f3-a091-b5edd44fd35c';

-- Check payment_ledger
SELECT 
    id,
    quote_id,
    amount,
    currency,
    payment_method,
    gateway_code,
    gateway_transaction_id,
    status,
    created_at
FROM payment_ledger 
WHERE quote_id = '974397df-e02b-48f3-a091-b5edd44fd35c'
ORDER BY created_at DESC;