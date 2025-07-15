-- Create atomic function for processing PayPal payments
-- This function ensures all payment processing operations are atomic
CREATE OR REPLACE FUNCTION process_paypal_payment_atomic(
  p_payment_transaction_id UUID,
  p_capture_id TEXT,
  p_payer_email TEXT,
  p_payer_id TEXT,
  p_amount DECIMAL(10,2),
  p_currency TEXT,
  p_order_id TEXT,
  p_gateway_response JSONB,
  p_quote_ids UUID[]
) RETURNS TABLE (
  success BOOLEAN,
  payment_transaction_id UUID,
  updated_quotes_count INTEGER,
  payment_ledger_entries_count INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_payment_tx payment_transactions%ROWTYPE;
  v_updated_quotes_count INTEGER := 0;
  v_ledger_entries_count INTEGER := 0;
  v_quote_id UUID;
  v_user_id UUID;
BEGIN
  -- Start transaction
  BEGIN
    -- Get the payment transaction record
    SELECT * INTO v_payment_tx
    FROM payment_transactions
    WHERE id = p_payment_transaction_id;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, 0, 0, 'Payment transaction not found';
      RETURN;
    END IF;
    
    v_user_id := v_payment_tx.user_id;
    
    -- Update payment transaction
    UPDATE payment_transactions
    SET 
      status = 'completed',
      paypal_capture_id = p_capture_id,
      paypal_payer_email = p_payer_email,
      paypal_payer_id = p_payer_id,
      gateway_response = COALESCE(gateway_response, '{}'::jsonb) || p_gateway_response,
      updated_at = NOW()
    WHERE id = p_payment_transaction_id;
    
    -- Update quotes if any provided
    IF array_length(p_quote_ids, 1) > 0 THEN
      UPDATE quotes
      SET 
        status = 'paid',
        payment_method = 'paypal',
        payment_status = 'paid',
        paid_at = NOW(),
        payment_details = jsonb_build_object(
          'paypal_order_id', p_order_id,
          'paypal_capture_id', p_capture_id,
          'paypal_payer_id', p_payer_id,
          'paypal_payer_email', p_payer_email,
          'transaction_id', v_payment_tx.transaction_id
        ),
        updated_at = NOW()
      WHERE id = ANY(p_quote_ids);
      
      GET DIAGNOSTICS v_updated_quotes_count = ROW_COUNT;
    END IF;
    
    -- Insert payment ledger entries for each quote
    IF array_length(p_quote_ids, 1) > 0 THEN
      FOREACH v_quote_id IN ARRAY p_quote_ids
      LOOP
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
          base_amount,
          balance_before,
          balance_after,
          notes,
          created_by,
          gateway_response,
          created_at,
          updated_at
        ) VALUES (
          v_quote_id,
          p_payment_transaction_id,
          'customer_payment',
          p_amount,
          p_currency,
          'paypal',
          'paypal',
          COALESCE(p_capture_id, p_order_id),
          p_order_id,
          'completed',
          NOW(),
          p_amount, -- Assuming same as amount for now
          0, -- Would need proper balance calculation
          p_amount, -- Would need proper balance calculation
          format('PayPal payment - Order: %s, Capture: %s, Payer: %s', 
                 p_order_id, 
                 COALESCE(p_capture_id, 'N/A'), 
                 COALESCE(p_payer_email, 'N/A')),
          v_user_id,
          jsonb_build_object(
            'order_id', p_order_id,
            'capture_id', p_capture_id,
            'payer_id', p_payer_id,
            'payer_email', p_payer_email
          ),
          NOW(),
          NOW()
        );
        
        v_ledger_entries_count := v_ledger_entries_count + 1;
      END LOOP;
    END IF;
    
    -- Return success
    RETURN QUERY SELECT TRUE, p_payment_transaction_id, v_updated_quotes_count, v_ledger_entries_count, NULL::TEXT;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RETURN QUERY SELECT FALSE, NULL::UUID, 0, 0, SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_paypal_payment_atomic TO service_role;
GRANT EXECUTE ON FUNCTION process_paypal_payment_atomic TO authenticated;

-- Add comment
COMMENT ON FUNCTION process_paypal_payment_atomic IS 'Atomically processes PayPal payment completion including payment transaction update, quote updates, and payment ledger entries';