-- Remove all currency conversion logic from payment system
-- Store payments only in the currency customer actually paid in
-- This eliminates precision errors and keeps things simple

-- Drop the current force_update_payment function
DROP FUNCTION IF EXISTS force_update_payment(UUID, DECIMAL, TEXT, TEXT, TEXT, TEXT, TEXT);

-- Create a simplified force_update_payment that works purely in payment currency
CREATE OR REPLACE FUNCTION force_update_payment(
  p_quote_id UUID,
  new_amount_paid DECIMAL,
  new_payment_status TEXT,
  payment_method TEXT DEFAULT 'bank_transfer',
  reference_number TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  payment_currency TEXT DEFAULT NULL  -- Keep for API compatibility but not used for conversion
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
  quote_currency TEXT;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  RAISE NOTICE 'Starting simple payment update - Quote: %, Amount: %', 
    p_quote_id, new_amount_paid;
  
  -- Get quote details
  SELECT * INTO updated_quote FROM quotes WHERE id = p_quote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', p_quote_id;
  END IF;

  -- Use the quote's currency - no conversion needed
  quote_currency := updated_quote.final_currency;
  
  -- Calculate existing payment records total (in same currency)
  SELECT COALESCE(SUM(pr.amount), 0) INTO existing_total
  FROM payment_records pr 
  WHERE pr.quote_id = p_quote_id;
  
  RAISE NOTICE 'Existing payments: % %, New total needed: % %', 
    existing_total, quote_currency, new_amount_paid, quote_currency;
  
  -- Calculate how much we need to add (all in same currency)
  needed_amount := new_amount_paid - existing_total;
  
  RAISE NOTICE 'Amount to add: % %', needed_amount, quote_currency;
  
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
      needed_amount,  -- Store in original currency
      COALESCE(payment_method, 'bank_transfer'),
      COALESCE(reference_number, 'Manual verification'),
      COALESCE(notes, 'Payment verified from proof upload'),
      current_user_id
    ) RETURNING id INTO payment_record_id;
    
    RAISE NOTICE 'Created payment record: % for amount: % %', 
      payment_record_id, needed_amount, quote_currency;
    
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
        new_amount_paid,  -- Store exact amount in original currency
        COALESCE(payment_method, 'bank_transfer'),
        COALESCE(reference_number, 'Manual verification - adjusted'),
        COALESCE(notes, 'Payment amount adjusted during verification'),
        current_user_id
      ) RETURNING id INTO payment_record_id;
      
      RAISE NOTICE 'Recreated payment record: % for amount: % %', 
        payment_record_id, new_amount_paid, quote_currency;
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
  
  RAISE NOTICE 'Final amount_paid: % %, payment_status: %', 
    updated_quote.amount_paid, quote_currency, updated_quote.payment_status;
  
  -- Return success with currency info
  RETURN jsonb_build_object(
    'success', true,
    'quote_id', updated_quote.id,
    'amount_paid', updated_quote.amount_paid,
    'payment_status', updated_quote.payment_status,
    'payment_record_id', payment_record_id,
    'payment_amount', new_amount_paid,
    'payment_currency', quote_currency
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

-- Simplify the sync trigger to work without currency conversion
CREATE OR REPLACE FUNCTION sync_payment_record_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
    quote_info RECORD;
    creator_id UUID;
    balance_before DECIMAL := 0;
    balance_after DECIMAL := 0;
BEGIN
    -- Only process INSERT operations for now
    IF TG_OP = 'INSERT' THEN
        -- Get quote details
        SELECT * INTO quote_info FROM quotes WHERE id = NEW.quote_id;
        
        -- Calculate balance before (in same currency, no conversion)
        SELECT COALESCE(SUM(pl.amount), 0) INTO balance_before
        FROM payment_ledger pl
        WHERE pl.quote_id = NEW.quote_id 
        AND pl.payment_type IN ('customer_payment', 'credit_applied') 
        AND pl.status = 'completed'
        AND pl.currency = quote_info.final_currency;  -- Same currency only
        
        balance_after := balance_before + NEW.amount;  -- Simple addition, same currency
        
        -- Handle NULL recorded_by (use first available admin or the recorded_by value)
        creator_id := COALESCE(NEW.recorded_by, (SELECT id FROM auth.users LIMIT 1));
        
        -- Create payment_ledger entry in the original payment currency only
        INSERT INTO payment_ledger (
            quote_id,
            payment_date,
            payment_type,
            payment_method,
            gateway_code,
            amount,              -- Store in original currency
            currency,            -- Original currency
            exchange_rate,       -- Set to 1 (no conversion)
            base_amount,         -- Same as amount (no conversion)
            balance_before,      -- Balance in original currency
            balance_after,       -- Balance in original currency  
            reference_number,
            status,
            notes,
            created_by
        ) VALUES (
            NEW.quote_id,
            COALESCE(NEW.created_at, NOW()),
            CASE 
                WHEN NEW.amount < 0 THEN 'refund'
                ELSE 'customer_payment'
            END,
            COALESCE(NEW.payment_method, 'bank_transfer'),
            CASE 
                WHEN NEW.payment_method = 'bank_transfer' THEN 'bank_transfer'
                WHEN NEW.payment_method ILIKE '%payu%' THEN 'payu'
                WHEN NEW.payment_method ILIKE '%stripe%' THEN 'stripe'
                ELSE 'manual'
            END,
            NEW.amount,          -- Original amount, no conversion
            quote_info.final_currency,    -- Original currency
            1,                   -- Exchange rate = 1 (no conversion)
            NEW.amount,          -- Base amount = same as amount
            balance_before,      -- Balance before in original currency
            balance_after,       -- Balance after in original currency
            NEW.reference_number,
            COALESCE(NEW.status, 'completed'),
            NEW.notes,
            creator_id
        );
        
        RAISE NOTICE 'Auto-synced payment_record % to payment_ledger in % (no conversion)', 
            NEW.id, quote_info.final_currency;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION force_update_payment TO authenticated;
GRANT EXECUTE ON FUNCTION sync_payment_record_to_ledger TO authenticated;

-- Add comments
COMMENT ON FUNCTION force_update_payment IS 'Simplified payment update function that works purely in payment currency - no conversions';
COMMENT ON FUNCTION sync_payment_record_to_ledger IS 'Simplified sync function that stores payments in original currency only - no USD conversion';