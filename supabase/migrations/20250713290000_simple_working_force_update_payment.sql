-- Create a simple, working version of force_update_payment that just works
-- Focus on the core functionality without ambiguous references

DROP FUNCTION IF EXISTS force_update_payment(UUID, DECIMAL, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION force_update_payment(
  p_quote_id UUID,
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
  existing_total DECIMAL;
  needed_amount DECIMAL;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  RAISE NOTICE 'Starting payment update - Quote: %, Amount: %', p_quote_id, new_amount_paid;
  
  -- Check if quote exists
  SELECT * INTO updated_quote FROM quotes WHERE id = p_quote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', p_quote_id;
  END IF;

  -- Calculate existing payment records total
  SELECT COALESCE(SUM(pr.amount), 0) INTO existing_total
  FROM payment_records pr 
  WHERE pr.quote_id = p_quote_id;
  
  RAISE NOTICE 'Existing payments: %, New total needed: %', existing_total, new_amount_paid;
  
  -- Calculate how much we need to add
  needed_amount := new_amount_paid - existing_total;
  
  RAISE NOTICE 'Amount to add: %', needed_amount;
  
  -- If we need to add a positive amount, create a payment record
  IF needed_amount > 0 THEN
    INSERT INTO payment_records (
      quote_id,
      amount,
      payment_method,
      reference_number,
      notes,
      recorded_by
    ) VALUES (
      p_quote_id,
      needed_amount,
      COALESCE(payment_method, 'bank_transfer'),
      COALESCE(reference_number, 'Manual verification'),
      COALESCE(notes, 'Payment verified from proof upload'),
      current_user_id
    ) RETURNING id INTO payment_record_id;
    
    RAISE NOTICE 'Created payment record: % for amount: %', payment_record_id, needed_amount;
    
  ELSIF needed_amount < 0 THEN
    -- Clear all records and create new one with exact amount
    DELETE FROM payment_records WHERE quote_id = p_quote_id;
    
    IF new_amount_paid > 0 THEN
      INSERT INTO payment_records (
        quote_id,
        amount,
        payment_method,
        reference_number,
        notes,
        recorded_by
      ) VALUES (
        p_quote_id,
        new_amount_paid,
        COALESCE(payment_method, 'bank_transfer'),
        COALESCE(reference_number, 'Manual verification - adjusted'),
        COALESCE(notes, 'Payment amount adjusted during verification'),
        current_user_id
      ) RETURNING id INTO payment_record_id;
      
      RAISE NOTICE 'Recreated payment record: % for amount: %', payment_record_id, new_amount_paid;
    END IF;
    
  ELSE
    RAISE NOTICE 'No changes needed - amount unchanged';
  END IF;
  
  -- Trigger the quotes table update to recalculate amount_paid via trigger
  UPDATE quotes
  SET updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- Get the updated record
  SELECT * INTO updated_quote FROM quotes WHERE id = p_quote_id;
  
  RAISE NOTICE 'Final amount_paid: %, payment_status: %', 
    updated_quote.amount_paid, updated_quote.payment_status;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'quote_id', updated_quote.id,
    'amount_paid', updated_quote.amount_paid,
    'payment_status', updated_quote.payment_status,
    'payment_record_id', payment_record_id,
    'new_record_amount', needed_amount
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION force_update_payment TO authenticated;