-- Fix column name mismatches in record_payment_with_ledger_and_triggers function
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

  -- Create payment ledger entry with correct column names
  INSERT INTO payment_ledger (
    quote_id,
    payment_type,        -- Fixed: was transaction_type
    amount,
    currency,
    payment_method,
    reference_number,    -- Fixed: was transaction_reference
    notes,
    created_by,
    payment_date,        -- Fixed: was transaction_date
    status,
    exchange_rate,
    base_amount,
    gateway_code
  ) VALUES (
    p_quote_id,
    'customer_payment',  -- Fixed: was 'payment'
    p_amount,
    p_currency,
    p_payment_method,
    p_transaction_reference,
    p_notes,
    p_recorded_by,
    p_payment_date,
    'completed',
    1.0,  -- Default exchange rate
    p_amount,  -- Will be converted by trigger if needed
    CASE 
      WHEN p_payment_method = 'payu' THEN 'payu'
      WHEN p_payment_method = 'stripe' THEN 'stripe'
      WHEN p_payment_method = 'esewa' THEN 'esewa'
      ELSE NULL
    END
  ) RETURNING id INTO v_ledger_entry_id;

  -- Create payment transaction record
  INSERT INTO payment_transactions (
    quote_id,
    user_id,
    amount,
    currency,
    status,
    payment_method,
    transaction_id,
    gateway_response,
    created_at
  ) VALUES (
    p_quote_id,
    v_quote.user_id,
    p_amount,
    p_currency,
    'completed',
    p_payment_method,
    p_transaction_reference,
    jsonb_build_object(
      'manual_payment', true,
      'recorded_by', p_recorded_by,
      'notes', p_notes,
      'payment_date', p_payment_date
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

-- Also fix the frontend query to use correct column names
-- We'll add a computed column for backward compatibility
ALTER TABLE payment_ledger 
ADD COLUMN IF NOT EXISTS transaction_type TEXT GENERATED ALWAYS AS (payment_type) STORED;