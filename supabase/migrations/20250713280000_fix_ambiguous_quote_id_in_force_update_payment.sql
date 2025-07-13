-- Fix ambiguous quote_id reference in force_update_payment function
-- The issue: WHERE quote_id = quote_id is ambiguous (parameter vs column)

DROP FUNCTION IF EXISTS force_update_payment(UUID, DECIMAL, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION force_update_payment(
  p_quote_id UUID,  -- Renamed parameter to avoid ambiguity
  new_amount_paid DECIMAL,
  new_payment_status TEXT,
  payment_method TEXT DEFAULT 'bank_transfer',
  reference_number TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_quote RECORD;
  current_user_id UUID;
  payment_record_id UUID;
  payment_ledger_id UUID;
  existing_records_total DECIMAL;
  existing_ledger_total DECIMAL;
  new_record_amount DECIMAL;
  quote_info RECORD;
  exchange_rate DECIMAL := 1;
  base_amount DECIMAL;
  balance_before DECIMAL;
  balance_after DECIMAL;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Log the attempt
  RAISE NOTICE 'Starting payment update - User: %, Quote: %, Amount: %, Status: %', 
    current_user_id, p_quote_id, new_amount_paid, new_payment_status;
  
  -- Get quote details
  SELECT * INTO quote_info FROM quotes WHERE id = p_quote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', p_quote_id;
  END IF;

  -- Get exchange rate for the quote currency
  SELECT rate_from_usd INTO exchange_rate
  FROM country_settings
  WHERE currency = quote_info.final_currency;
  
  IF exchange_rate IS NULL THEN
    exchange_rate := 1;
  END IF;

  -- Calculate existing payment records total (USD) - FIXED: use p_quote_id
  SELECT COALESCE(SUM(amount), 0) INTO existing_records_total
  FROM payment_records 
  WHERE quote_id = p_quote_id;
  
  -- Calculate existing payment ledger total (USD equivalent) - FIXED: use p_quote_id
  SELECT COALESCE(SUM(base_amount), 0) INTO existing_ledger_total
  FROM payment_ledger 
  WHERE quote_id = p_quote_id 
  AND payment_type IN ('customer_payment', 'credit_applied') 
  AND status = 'completed';
  
  RAISE NOTICE 'Existing payment records total: %, Existing ledger total: %', 
    existing_records_total, existing_ledger_total;
  
  -- Convert new amount to USD for consistency
  base_amount := new_amount_paid / exchange_rate;
  
  -- Calculate how much we need to add as a new payment record
  new_record_amount := base_amount - existing_records_total;
  
  RAISE NOTICE 'New payment record amount needed (USD): %', new_record_amount;
  
  -- Calculate balance before (from payment ledger)
  balance_before := existing_ledger_total;
  balance_after := balance_before + new_record_amount;
  
  -- If we need to add a positive amount, create both payment_record and payment_ledger entries
  IF new_record_amount > 0 THEN
    -- Create payment record for backward compatibility
    INSERT INTO payment_records (
      quote_id,
      amount,
      payment_method,
      reference_number,
      notes,
      recorded_by,
      created_at,
      updated_at
    ) VALUES (
      p_quote_id,
      new_record_amount,
      COALESCE(payment_method, 'bank_transfer'),
      COALESCE(reference_number, 'Manual verification'),
      COALESCE(notes, 'Payment verified from proof upload'),
      current_user_id,
      NOW(),
      NOW()
    ) RETURNING id INTO payment_record_id;
    
    RAISE NOTICE 'Created payment record: % for amount: %', payment_record_id, new_record_amount;
    
    -- Create payment ledger entry (amounts in original currency)
    INSERT INTO payment_ledger (
      quote_id,
      payment_date,
      payment_type,
      payment_method,
      gateway_code,
      amount,
      currency,
      exchange_rate,
      base_amount,
      balance_before,
      balance_after,
      reference_number,
      status,
      notes,
      created_by
    ) VALUES (
      p_quote_id,
      NOW(),
      'customer_payment',
      COALESCE(payment_method, 'bank_transfer'),
      CASE 
        WHEN payment_method = 'bank_transfer' THEN 'bank_transfer'
        WHEN payment_method ILIKE '%payu%' THEN 'payu'
        WHEN payment_method ILIKE '%stripe%' THEN 'stripe'
        ELSE 'manual'
      END,
      new_amount_paid - (existing_records_total * exchange_rate), -- Amount in original currency
      quote_info.final_currency,
      exchange_rate,
      new_record_amount, -- Base amount in USD
      balance_before,
      balance_after,
      COALESCE(reference_number, 'Manual verification'),
      'completed',
      COALESCE(notes, 'Payment verified from proof upload'),
      current_user_id
    ) RETURNING id INTO payment_ledger_id;
    
    RAISE NOTICE 'Created payment ledger entry: % for base amount: %', payment_ledger_id, new_record_amount;
    
  ELSIF new_record_amount < 0 THEN
    -- If the new amount is less than existing records, we need to remove some records
    -- For simplicity, let's clear all records and create new ones with the exact amount
    DELETE FROM payment_records WHERE quote_id = p_quote_id;
    DELETE FROM payment_ledger WHERE quote_id = p_quote_id AND payment_type = 'customer_payment';
    
    IF new_amount_paid > 0 THEN
      -- Create new payment record
      INSERT INTO payment_records (
        quote_id,
        amount,
        payment_method,
        reference_number,
        notes,
        recorded_by,
        created_at,
        updated_at
      ) VALUES (
        p_quote_id,
        base_amount,
        COALESCE(payment_method, 'bank_transfer'),
        COALESCE(reference_number, 'Manual verification - adjusted'),
        COALESCE(notes, 'Payment amount adjusted during verification'),
        current_user_id,
        NOW(),
        NOW()
      ) RETURNING id INTO payment_record_id;
      
      -- Create new payment ledger entry
      INSERT INTO payment_ledger (
        quote_id,
        payment_date,
        payment_type,
        payment_method,
        gateway_code,
        amount,
        currency,
        exchange_rate,
        base_amount,
        balance_before,
        balance_after,
        reference_number,
        status,
        notes,
        created_by
      ) VALUES (
        p_quote_id,
        NOW(),
        'customer_payment',
        COALESCE(payment_method, 'bank_transfer'),
        CASE 
          WHEN payment_method = 'bank_transfer' THEN 'bank_transfer'
          WHEN payment_method ILIKE '%payu%' THEN 'payu'
          WHEN payment_method ILIKE '%stripe%' THEN 'stripe'
          ELSE 'manual'
        END,
        new_amount_paid,
        quote_info.final_currency,
        exchange_rate,
        base_amount,
        0, -- Balance before (reset)
        base_amount, -- Balance after
        COALESCE(reference_number, 'Manual verification - adjusted'),
        'completed',
        COALESCE(notes, 'Payment amount adjusted during verification'),
        current_user_id
      ) RETURNING id INTO payment_ledger_id;
      
      RAISE NOTICE 'Cleared and recreated payment records. Payment record: %, Ledger: %', 
        payment_record_id, payment_ledger_id;
    END IF;
    
  ELSE
    RAISE NOTICE 'No payment record changes needed - amount unchanged';
  END IF;
  
  -- Now trigger the quotes table update to recalculate amount_paid
  -- We do this by updating any field to trigger the payment status update
  UPDATE quotes
  SET updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- Get the updated record (amount_paid will be recalculated by trigger)
  SELECT * INTO updated_quote FROM quotes WHERE id = p_quote_id;
  
  RAISE NOTICE 'Update complete - Final amount_paid: %, Final payment_status: %', 
    updated_quote.amount_paid, updated_quote.payment_status;
  
  -- Return the updated quote as JSON
  RETURN jsonb_build_object(
    'success', true,
    'quote_id', updated_quote.id,
    'amount_paid', updated_quote.amount_paid,
    'payment_status', updated_quote.payment_status,
    'updated_at', updated_quote.updated_at,
    'payment_record_id', payment_record_id,
    'payment_ledger_id', payment_ledger_id,
    'new_record_amount', new_record_amount
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in force_update_payment: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION force_update_payment TO authenticated;

-- Add comment
COMMENT ON FUNCTION force_update_payment IS 'Enhanced payment update function with fixed ambiguous quote_id references';