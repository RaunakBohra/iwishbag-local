-- Fix the ambiguous quote_id reference in force_update_payment function

CREATE OR REPLACE FUNCTION force_update_payment(
  quote_id UUID,
  new_amount_paid DECIMAL,
  new_payment_status TEXT
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
  existing_records_total DECIMAL;
  new_record_amount DECIMAL;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Log the attempt
  RAISE NOTICE 'Starting payment update - User: %, Quote: %, Amount: %, Status: %', 
    current_user_id, quote_id, new_amount_paid, new_payment_status;
  
  -- Check if quote exists
  IF NOT EXISTS (SELECT 1 FROM quotes WHERE id = quote_id) THEN
    RAISE EXCEPTION 'Quote not found: %', quote_id;
  END IF;

  -- Calculate existing payment records total (fix ambiguous reference)
  SELECT COALESCE(SUM(pr.amount), 0) INTO existing_records_total
  FROM payment_records pr
  WHERE pr.quote_id = force_update_payment.quote_id;
  
  RAISE NOTICE 'Existing payment records total: %', existing_records_total;
  
  -- Calculate how much we need to add as a new payment record
  new_record_amount := new_amount_paid - existing_records_total;
  
  RAISE NOTICE 'New payment record amount needed: %', new_record_amount;
  
  -- If we need to add a positive amount, create a payment record
  IF new_record_amount > 0 THEN
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
      force_update_payment.quote_id,
      new_record_amount,
      'bank_transfer', -- Default to bank transfer for manual verifications
      'Manual verification',
      'Payment verified from proof upload',
      current_user_id,
      NOW(),
      NOW()
    ) RETURNING id INTO payment_record_id;
    
    RAISE NOTICE 'Created payment record: % for amount: %', payment_record_id, new_record_amount;
    
  ELSIF new_record_amount < 0 THEN
    -- If the new amount is less than existing records, we need to remove some records
    -- For simplicity, let's clear all records and create a new one with the exact amount
    DELETE FROM payment_records WHERE payment_records.quote_id = force_update_payment.quote_id;
    
    IF new_amount_paid > 0 THEN
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
        force_update_payment.quote_id,
        new_amount_paid,
        'bank_transfer',
        'Manual verification - adjusted',
        'Payment amount adjusted during verification',
        current_user_id,
        NOW(),
        NOW()
      ) RETURNING id INTO payment_record_id;
      
      RAISE NOTICE 'Cleared and recreated payment record: % for amount: %', payment_record_id, new_amount_paid;
    END IF;
    
  ELSE
    RAISE NOTICE 'No payment record changes needed - amount unchanged';
  END IF;
  
  -- Now trigger the quotes table update to recalculate amount_paid
  -- We do this by updating any field to trigger the payment status update
  UPDATE quotes
  SET updated_at = NOW()
  WHERE id = force_update_payment.quote_id;
  
  -- Get the updated record (amount_paid will be recalculated by trigger)
  SELECT * INTO updated_quote FROM quotes WHERE id = force_update_payment.quote_id;
  
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