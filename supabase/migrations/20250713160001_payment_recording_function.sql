-- Function to record a payment and update quote amount_paid
CREATE OR REPLACE FUNCTION record_payment(
    p_quote_id UUID,
    p_amount DECIMAL,
    p_currency TEXT,
    p_payment_method TEXT,
    p_payment_type TEXT DEFAULT 'customer_payment',
    p_reference_number TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_payment_id UUID;
    v_user_id UUID;
    v_quote RECORD;
    v_new_amount_paid DECIMAL;
BEGIN
    -- Get user ID
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Get quote details
    SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quote not found');
    END IF;
    
    -- Create payment ledger entry
    INSERT INTO payment_ledger (
        quote_id,
        payment_date,
        payment_type,
        payment_method,
        amount,
        currency,
        status,
        reference_number,
        notes,
        created_by
    ) VALUES (
        p_quote_id,
        NOW(),
        p_payment_type,
        p_payment_method,
        p_amount,
        p_currency,
        'completed',
        p_reference_number,
        p_notes,
        v_user_id
    ) RETURNING id INTO v_payment_id;
    
    -- Update quote amount_paid
    IF p_payment_type IN ('customer_payment', 'credit_applied') THEN
        v_new_amount_paid := COALESCE(v_quote.amount_paid, 0) + p_amount;
    ELSIF p_payment_type IN ('refund', 'partial_refund') THEN
        v_new_amount_paid := COALESCE(v_quote.amount_paid, 0) - p_amount;
    ELSE
        v_new_amount_paid := COALESCE(v_quote.amount_paid, 0);
    END IF;
    
    -- Update quote
    UPDATE quotes 
    SET 
        amount_paid = v_new_amount_paid,
        payment_status = CASE
            WHEN v_new_amount_paid >= v_quote.final_total THEN 'paid'
            WHEN v_new_amount_paid > 0 THEN 'partial'
            ELSE 'unpaid'
        END,
        updated_at = NOW()
    WHERE id = p_quote_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'amount_paid', v_new_amount_paid,
        'payment_status', (SELECT payment_status FROM quotes WHERE id = p_quote_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION record_payment TO authenticated;