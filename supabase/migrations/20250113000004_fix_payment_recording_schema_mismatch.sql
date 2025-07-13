-- Fix schema mismatches in payment recording function
-- Removes references to non-existent columns in payment_ledger and payment_transactions tables

CREATE OR REPLACE FUNCTION record_payment_with_ledger_and_triggers(
  p_quote_id UUID,
  p_amount DECIMAL,
  p_currency TEXT,
  p_payment_method TEXT,
  p_transaction_reference TEXT,
  p_notes TEXT DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL,
  p_payment_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB AS $$
DECLARE
  v_quote RECORD;
  v_ledger_entry_id UUID;
  v_payment_id UUID;
  v_result JSONB;
BEGIN
  -- Get quote details
  SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', p_quote_id;
  END IF;

  -- Create payment ledger entry (only using columns that exist)
  INSERT INTO payment_ledger (
    quote_id,
    payment_type,
    amount,
    currency,
    payment_method,
    reference_number,
    notes,
    created_by,
    payment_date,
    status,
    gateway_code
  ) VALUES (
    p_quote_id,
    'customer_payment',
    p_amount,
    p_currency,
    p_payment_method,
    p_transaction_reference,
    p_notes,
    p_recorded_by,
    p_payment_date,
    'completed',
    CASE 
      WHEN p_payment_method = 'payu' THEN 'payu'
      WHEN p_payment_method = 'stripe' THEN 'stripe'
      WHEN p_payment_method = 'esewa' THEN 'esewa'
      WHEN p_payment_method = 'bank_transfer' THEN 'bank_transfer'
      ELSE NULL
    END
  ) RETURNING id INTO v_ledger_entry_id;

  -- Create payment transaction record (store transaction_reference in gateway_response)
  INSERT INTO payment_transactions (
    quote_id,
    user_id,
    amount,
    currency,
    status,
    payment_method,
    gateway_response,
    created_at
  ) VALUES (
    p_quote_id,
    v_quote.user_id,
    p_amount,
    p_currency,
    'completed',
    p_payment_method,
    jsonb_build_object(
      'manual_payment', true,
      'recorded_by', p_recorded_by,
      'notes', p_notes,
      'payment_date', p_payment_date,
      'transaction_reference', p_transaction_reference
    ),
    NOW()
  ) RETURNING id INTO v_payment_id;

  -- Force recalculation of payment status and amount_paid
  UPDATE quotes 
  SET updated_at = NOW()
  WHERE id = p_quote_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'ledger_entry_id', v_ledger_entry_id,
    'payment_id', v_payment_id,
    'message', 'Payment recorded successfully'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;