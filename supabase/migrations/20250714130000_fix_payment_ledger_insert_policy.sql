-- Fix payment ledger insert policy to allow authenticated users to create entries
-- for their own quotes

-- Add INSERT policy for authenticated users
CREATE POLICY "Users can insert payment ledger for own quotes" ON payment_ledger
    FOR INSERT
    WITH CHECK (
        -- User must own the quote
        EXISTS (
            SELECT 1 FROM quotes 
            WHERE quotes.id = payment_ledger.quote_id 
            AND quotes.user_id = auth.uid()
        )
        -- And created_by must be the current user or null
        AND (created_by = auth.uid() OR created_by IS NULL)
    );

-- Also create a function that can be called from client-side to record payments
-- This function runs with SECURITY DEFINER so it bypasses RLS
CREATE OR REPLACE FUNCTION record_paypal_payment_to_ledger(
    p_quote_id UUID,
    p_transaction_id UUID,
    p_amount DECIMAL,
    p_currency TEXT,
    p_order_id TEXT,
    p_capture_id TEXT DEFAULT NULL,
    p_payer_email TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_ledger_id UUID;
    v_user_id UUID;
BEGIN
    -- Get the user who owns the quote
    SELECT user_id INTO v_user_id
    FROM quotes
    WHERE id = p_quote_id;
    
    -- Check if entry already exists
    SELECT id INTO v_ledger_id
    FROM payment_ledger
    WHERE quote_id = p_quote_id
      AND payment_transaction_id = p_transaction_id
      AND gateway_code = 'paypal';
      
    IF v_ledger_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Payment ledger entry already exists',
            'ledger_id', v_ledger_id
        );
    END IF;
    
    -- Insert payment ledger entry
    INSERT INTO payment_ledger (
        quote_id,
        payment_transaction_id,
        payment_type,
        amount,
        currency,
        payment_method,
        gateway_code,
        gateway_transaction_id,
        reference_number,
        status,
        payment_date,
        notes,
        created_by
    ) VALUES (
        p_quote_id,
        p_transaction_id,
        'customer_payment',
        p_amount,
        p_currency,
        'paypal',
        'paypal',
        COALESCE(p_capture_id, p_order_id),
        p_order_id,
        'completed',
        NOW(),
        'PayPal payment - Order: ' || p_order_id || 
        CASE 
            WHEN p_capture_id IS NOT NULL THEN ', Capture: ' || p_capture_id 
            ELSE '' 
        END ||
        CASE 
            WHEN p_payer_email IS NOT NULL THEN ', Payer: ' || p_payer_email 
            ELSE '' 
        END,
        COALESCE(v_user_id, auth.uid())
    ) RETURNING id INTO v_ledger_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payment ledger entry created',
        'ledger_id', v_ledger_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Failed to create payment ledger entry',
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION record_paypal_payment_to_ledger TO authenticated;

-- Also fix any missing PayPal ledger entries retroactively
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Count missing entries
    SELECT COUNT(*) INTO v_count
    FROM payment_transactions pt
    LEFT JOIN payment_ledger pl ON (
        pl.payment_transaction_id = pt.id 
        OR (pl.quote_id = pt.quote_id AND pl.gateway_code = 'paypal')
    )
    WHERE pt.payment_method = 'paypal'
      AND pt.status = 'completed'
      AND pl.id IS NULL;
      
    -- Create missing entries
    IF v_count > 0 THEN
        INSERT INTO payment_ledger (
            quote_id,
            payment_transaction_id,
            payment_type,
            amount,
            currency,
            payment_method,
            gateway_code,
            gateway_transaction_id,
            reference_number,
            status,
            payment_date,
            notes,
            created_by
        )
        SELECT 
            pt.quote_id,
            pt.id,
            'customer_payment',
            pt.amount,
            pt.currency,
            'paypal',
            'paypal',
            COALESCE(pt.paypal_capture_id, pt.paypal_order_id, pt.gateway_transaction_id),
            COALESCE(pt.paypal_order_id, pt.transaction_id),
            'completed',
            pt.created_at,
            'PayPal payment (retroactively added) - Order: ' || COALESCE(pt.paypal_order_id, 'N/A') || 
            ', Capture: ' || COALESCE(pt.paypal_capture_id, 'N/A') ||
            ', Payer: ' || COALESCE(pt.paypal_payer_email, 'N/A'),
            pt.user_id
        FROM payment_transactions pt
        LEFT JOIN payment_ledger pl ON (
            pl.payment_transaction_id = pt.id 
            OR (pl.quote_id = pt.quote_id AND pl.gateway_code = 'paypal')
        )
        WHERE pt.payment_method = 'paypal'
          AND pt.status = 'completed'
          AND pl.id IS NULL;
          
        RAISE NOTICE 'Created % missing PayPal payment ledger entries', v_count;
    END IF;
END $$;