-- Create atomic function for processing refunds
-- This function ensures all refund-related database operations either fully succeed or fully fail
CREATE OR REPLACE FUNCTION process_refund_atomic(
  p_quote_id UUID,
  p_refund_amount DECIMAL(10,2),
  p_refund_data JSONB,
  p_gateway_response JSONB,
  p_processed_by UUID
) RETURNS TABLE (
  success BOOLEAN,
  refund_id UUID,
  payment_transaction_updated BOOLEAN,
  quote_updated BOOLEAN,
  ledger_entry_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_refund_id UUID;
  v_ledger_entry_id UUID;
  v_payment_transaction_updated BOOLEAN := FALSE;
  v_quote_updated BOOLEAN := FALSE;
  v_payment_transaction_id UUID;
  v_original_transaction RECORD;
  v_quote_data RECORD;
  v_total_refunded DECIMAL(10,2);
  v_new_amount_paid DECIMAL(10,2);
  v_new_payment_status TEXT;
  v_gateway_refund_id TEXT;
  v_gateway_transaction_id TEXT;
  v_refund_type TEXT;
  v_reason_code TEXT;
  v_reason_description TEXT;
  v_admin_notes TEXT;
  v_customer_note TEXT;
  v_gateway_status TEXT;
  v_currency TEXT;
  v_original_amount DECIMAL(10,2);
BEGIN
  -- Start transaction (implicit with function)
  BEGIN
    -- Extract refund data from JSONB
    v_gateway_refund_id := p_refund_data->>'gateway_refund_id';
    v_gateway_transaction_id := p_refund_data->>'gateway_transaction_id';
    v_refund_type := p_refund_data->>'refund_type';
    v_reason_code := p_refund_data->>'reason_code';
    v_reason_description := p_refund_data->>'reason_description';
    v_admin_notes := p_refund_data->>'admin_notes';
    v_customer_note := p_refund_data->>'customer_note';
    v_gateway_status := p_refund_data->>'gateway_status';
    v_currency := p_refund_data->>'currency';
    v_original_amount := (p_refund_data->>'original_amount')::DECIMAL(10,2);
    
    -- Validate required fields
    IF p_quote_id IS NULL OR p_refund_amount IS NULL OR p_refund_amount <= 0 THEN
      RETURN QUERY SELECT 
        FALSE,
        NULL::UUID,
        FALSE,
        FALSE,
        NULL::UUID,
        'Invalid refund amount or missing quote ID'::TEXT;
      RETURN;
    END IF;
    
    -- Get the original payment transaction
    SELECT * INTO v_original_transaction
    FROM payment_transactions
    WHERE quote_id = p_quote_id
      AND payment_method = 'payu'
      AND status = 'completed'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_original_transaction IS NULL THEN
      RETURN QUERY SELECT 
        FALSE,
        NULL::UUID,
        FALSE,
        FALSE,
        NULL::UUID,
        'No completed payment transaction found for quote'::TEXT;
      RETURN;
    END IF;
    
    v_payment_transaction_id := v_original_transaction.id;
    
    -- Check if refund amount is valid
    v_total_refunded := COALESCE(v_original_transaction.total_refunded, 0) + p_refund_amount;
    IF v_total_refunded > v_original_transaction.amount THEN
      RETURN QUERY SELECT 
        FALSE,
        NULL::UUID,
        FALSE,
        FALSE,
        NULL::UUID,
        'Refund amount exceeds original transaction amount'::TEXT;
      RETURN;
    END IF;
    
    -- Insert into gateway_refunds table
    INSERT INTO gateway_refunds (
      gateway_refund_id,
      gateway_transaction_id,
      gateway_code,
      payment_transaction_id,
      quote_id,
      refund_amount,
      original_amount,
      currency,
      refund_type,
      reason_code,
      reason_description,
      admin_notes,
      customer_note,
      status,
      gateway_status,
      gateway_response,
      refund_date,
      processed_by,
      created_at,
      updated_at
    ) VALUES (
      v_gateway_refund_id,
      v_gateway_transaction_id,
      'payu',
      v_payment_transaction_id,
      p_quote_id,
      p_refund_amount,
      COALESCE(v_original_amount, v_original_transaction.amount),
      COALESCE(v_currency, v_original_transaction.currency),
      COALESCE(v_refund_type, 'partial'),
      COALESCE(v_reason_code, 'CUSTOMER_REQUEST'),
      v_reason_description,
      v_admin_notes,
      v_customer_note,
      'processing',
      COALESCE(v_gateway_status, 'PENDING'),
      p_gateway_response,
      NOW(),
      p_processed_by,
      NOW(),
      NOW()
    ) RETURNING id INTO v_refund_id;
    
    -- Create payment ledger entry for the refund
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
      p_quote_id,
      v_payment_transaction_id,
      'refund',
      -p_refund_amount, -- Negative for refunds
      COALESCE(v_currency, v_original_transaction.currency),
      'payu',
      'payu',
      v_gateway_transaction_id,
      v_gateway_refund_id,
      'processing',
      NOW(),
      -p_refund_amount,
      COALESCE(v_original_transaction.total_refunded, 0),
      v_total_refunded,
      'PayU Refund: ' || COALESCE(v_reason_description, 'Customer request'),
      p_processed_by,
      jsonb_build_object(
        'refund_processing', true,
        'refund_amount', p_refund_amount,
        'gateway_refund_id', v_gateway_refund_id,
        'gateway_transaction_id', v_gateway_transaction_id,
        'processed_at', NOW()
      ) || COALESCE(p_gateway_response, '{}'::jsonb),
      NOW(),
      NOW()
    ) RETURNING id INTO v_ledger_entry_id;
    
    -- Update the original payment transaction
    UPDATE payment_transactions
    SET 
      total_refunded = v_total_refunded,
      refund_count = COALESCE(refund_count, 0) + 1,
      is_fully_refunded = (v_total_refunded >= amount),
      updated_at = NOW()
    WHERE id = v_payment_transaction_id;
    
    v_payment_transaction_updated := TRUE;
    
    -- Get current quote data and update amount_paid
    SELECT amount_paid, final_total INTO v_quote_data
    FROM quotes
    WHERE id = p_quote_id;
    
    IF v_quote_data IS NOT NULL THEN
      -- Calculate new amount paid after refund
      v_new_amount_paid := COALESCE(v_quote_data.amount_paid, 0) - p_refund_amount;
      
      -- Determine new payment status
      v_new_payment_status := CASE
        WHEN v_new_amount_paid <= 0 THEN 'unpaid'
        WHEN v_new_amount_paid < v_quote_data.final_total THEN 'partial'
        ELSE 'paid'
      END;
      
      -- Update quote with new payment status
      UPDATE quotes
      SET 
        amount_paid = v_new_amount_paid,
        payment_status = v_new_payment_status,
        updated_at = NOW()
      WHERE id = p_quote_id;
      
      v_quote_updated := TRUE;
    END IF;
    
    -- Return success
    RETURN QUERY SELECT 
      TRUE,
      v_refund_id,
      v_payment_transaction_updated,
      v_quote_updated,
      v_ledger_entry_id,
      NULL::TEXT;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RETURN QUERY SELECT 
        FALSE,
        NULL::UUID,
        FALSE,
        FALSE,
        NULL::UUID,
        SQLERRM::TEXT;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_refund_atomic TO service_role;
GRANT EXECUTE ON FUNCTION process_refund_atomic TO authenticated;

-- Add comment
COMMENT ON FUNCTION process_refund_atomic IS 'Atomically processes refund operations including gateway_refunds insertion, payment_ledger entry, payment_transactions update, and quotes adjustment. Ensures all operations succeed or fail together with comprehensive audit trail and financial consistency.';