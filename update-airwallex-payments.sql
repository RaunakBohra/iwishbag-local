-- Update the two Airwallex payments that were successful but not processed due to webhook URL issue

-- Payment 1: $13.38 USD
UPDATE quotes
SET 
    status = 'paid',
    payment_status = 'paid',
    payment_method = 'airwallex',
    paid_at = '2025-07-16T12:09:44+0000'::timestamp,
    in_cart = false,
    payment_details = jsonb_build_object(
        'gateway', 'airwallex',
        'payment_intent_id', 'int_hkdmd24mdh99nak5e43',
        'payment_attempt_id', 'att_hkdmd24mdh99natrucd_ak5e43',
        'amount', 13.38,
        'currency', 'USD',
        'settled_at', '2025-07-16T12:09:44+0000',
        'authorization_code', '682138'
    )
WHERE id = '4909a6a2-31c2-4ed7-b4a6-45517975a39e'
AND status != 'paid'; -- Safety check

-- Payment 2: $1,063.81 USD
UPDATE quotes
SET 
    status = 'paid',
    payment_status = 'paid',
    payment_method = 'airwallex',
    paid_at = '2025-07-16T12:14:47+0000'::timestamp,
    in_cart = false,
    payment_details = jsonb_build_object(
        'gateway', 'airwallex',
        'payment_intent_id', 'int_hkdmbm89rh99ollawy1',
        'payment_attempt_id', 'att_hkdmbm89rh99olpy7bz_llawy1',
        'amount', 1063.81,
        'currency', 'USD',
        'capture_requested_at', '2025-07-16T12:14:47+0000',
        'authorization_code', '677395'
    )
WHERE id = '974397df-e02b-48f3-a091-b5edd44fd35c'
AND status != 'paid'; -- Safety check

-- Also create payment transaction records
INSERT INTO payment_transactions (
    transaction_id,
    quote_ids,
    user_id,
    gateway,
    amount,
    currency,
    status,
    gateway_response,
    created_at
)
VALUES 
-- Payment 1
(
    'airwallex_int_hkdmd24mdh99nak5e43',
    ARRAY['4909a6a2-31c2-4ed7-b4a6-45517975a39e'],
    (SELECT user_id FROM quotes WHERE id = '4909a6a2-31c2-4ed7-b4a6-45517975a39e'),
    'airwallex',
    13.38,
    'USD',
    'completed',
    jsonb_build_object(
        'payment_intent_id', 'int_hkdmd24mdh99nak5e43',
        'payment_attempt_id', 'att_hkdmd24mdh99natrucd_ak5e43',
        'status', 'SETTLED',
        'authorization_code', '682138'
    ),
    '2025-07-16T12:09:44+0000'::timestamp
),
-- Payment 2
(
    'airwallex_int_hkdmbm89rh99ollawy1',
    ARRAY['974397df-e02b-48f3-a091-b5edd44fd35c'],
    (SELECT user_id FROM quotes WHERE id = '974397df-e02b-48f3-a091-b5edd44fd35c'),
    'airwallex',
    1063.81,
    'USD',
    'processing',
    jsonb_build_object(
        'payment_intent_id', 'int_hkdmbm89rh99ollawy1',
        'payment_attempt_id', 'att_hkdmbm89rh99olpy7bz_llawy1',
        'status', 'CAPTURE_REQUESTED',
        'authorization_code', '677395'
    ),
    '2025-07-16T12:14:47+0000'::timestamp
)
ON CONFLICT (transaction_id) DO NOTHING;

-- Payment 3: $1.00 USD (test payment)
UPDATE quotes
SET 
    status = 'paid',
    payment_status = 'paid',
    payment_method = 'airwallex',
    paid_at = '2025-07-16T12:16:54+0000'::timestamp,
    in_cart = false,
    payment_details = jsonb_build_object(
        'gateway', 'airwallex',
        'payment_intent_id', 'int_hkdmbm89rh99onoeony',
        'payment_attempt_id', 'att_hkdmd24mdh99ont6x94_noeony',
        'amount', 1.00,
        'currency', 'USD',
        'capture_requested_at', '2025-07-16T12:16:54+0000',
        'authorization_code', '979858'
    )
WHERE id = 'e4a78eab-0246-4949-b77f-f991604182f6'
AND status != 'paid'; -- Safety check

-- Add payment transaction for Payment 3
INSERT INTO payment_transactions (
    transaction_id,
    quote_ids,
    user_id,
    gateway,
    amount,
    currency,
    status,
    gateway_response,
    created_at
)
VALUES 
(
    'airwallex_int_hkdmbm89rh99onoeony',
    ARRAY['e4a78eab-0246-4949-b77f-f991604182f6'],
    (SELECT user_id FROM quotes WHERE id = 'e4a78eab-0246-4949-b77f-f991604182f6'),
    'airwallex',
    1.00,
    'USD',
    'processing',
    jsonb_build_object(
        'payment_intent_id', 'int_hkdmbm89rh99onoeony',
        'payment_attempt_id', 'att_hkdmd24mdh99ont6x94_noeony',
        'status', 'CAPTURE_REQUESTED',
        'authorization_code', '979858'
    ),
    '2025-07-16T12:16:54+0000'::timestamp
)
ON CONFLICT (transaction_id) DO NOTHING;

-- Verify the updates
SELECT 
    id,
    display_id,
    status,
    payment_status,
    payment_method,
    final_total,
    currency,
    paid_at,
    payment_details
FROM quotes
WHERE id IN (
    '4909a6a2-31c2-4ed7-b4a6-45517975a39e',
    '974397df-e02b-48f3-a091-b5edd44fd35c',
    'e4a78eab-0246-4949-b77f-f991604182f6'
);