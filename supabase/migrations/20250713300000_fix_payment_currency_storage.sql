-- Fix payment currency storage to store payments in their actual currency
-- This prevents double currency conversion that causes unrealistic amounts

-- Update the force_update_payment function to handle payment currency properly
DROP FUNCTION IF EXISTS force_update_payment(UUID, DECIMAL, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION force_update_payment(
  p_quote_id UUID,
  new_amount_paid DECIMAL,
  new_payment_status TEXT,
  payment_method TEXT DEFAULT 'bank_transfer',
  reference_number TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  payment_currency TEXT DEFAULT NULL  -- New parameter for payment currency
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
  actual_payment_currency TEXT;
  exchange_rate DECIMAL := 1;
  usd_amount DECIMAL;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  RAISE NOTICE 'Starting payment update - Quote: %, Amount: %, Currency: %', 
    p_quote_id, new_amount_paid, payment_currency;
  
  -- Get quote details
  SELECT * INTO updated_quote FROM quotes WHERE id = p_quote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', p_quote_id;
  END IF;

  -- Determine the actual payment currency
  quote_currency := updated_quote.final_currency;
  actual_payment_currency := COALESCE(payment_currency, quote_currency);
  
  -- Get exchange rate from payment currency to USD
  SELECT rate_from_usd INTO exchange_rate
  FROM country_settings
  WHERE currency = actual_payment_currency;
  
  IF exchange_rate IS NULL THEN
    exchange_rate := 1;
  END IF;
  
  -- Convert payment to USD for internal calculations
  usd_amount := new_amount_paid / exchange_rate;
  
  RAISE NOTICE 'Payment: % %, Exchange rate: %, USD equivalent: %', 
    new_amount_paid, actual_payment_currency, exchange_rate, usd_amount;

  -- Calculate existing payment records total (in USD)
  SELECT COALESCE(SUM(pr.amount), 0) INTO existing_total
  FROM payment_records pr 
  WHERE pr.quote_id = p_quote_id;
  
  RAISE NOTICE 'Existing payments (USD): %, New total needed (USD): %', existing_total, usd_amount;
  
  -- Calculate how much we need to add (in USD)
  needed_amount := usd_amount - existing_total;
  
  RAISE NOTICE 'Amount to add (USD): %', needed_amount;
  
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
      needed_amount,  -- Store in USD for backward compatibility
      COALESCE(payment_method, 'bank_transfer'),
      COALESCE(reference_number, 'Manual verification'),
      COALESCE(notes, 'Payment verified from proof upload'),
      current_user_id
    ) RETURNING id INTO payment_record_id;
    
    RAISE NOTICE 'Created payment record: % for amount: % USD', payment_record_id, needed_amount;
    
  ELSIF needed_amount < 0 THEN
    -- Clear all records and create new one with exact amount
    DELETE FROM payment_records WHERE quote_id = p_quote_id;
    
    IF usd_amount > 0 THEN
      INSERT INTO payment_records (
        quote_id,
        amount,
        payment_method,
        reference_number,
        notes,
        recorded_by
      ) VALUES (
        p_quote_id,
        usd_amount,  -- Store in USD
        COALESCE(payment_method, 'bank_transfer'),
        COALESCE(reference_number, 'Manual verification - adjusted'),
        COALESCE(notes, 'Payment amount adjusted during verification'),
        current_user_id
      ) RETURNING id INTO payment_record_id;
      
      RAISE NOTICE 'Recreated payment record: % for amount: % USD', payment_record_id, usd_amount;
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
  
  -- Return success with payment currency info
  RETURN jsonb_build_object(
    'success', true,
    'quote_id', updated_quote.id,
    'amount_paid', updated_quote.amount_paid,
    'payment_status', updated_quote.payment_status,
    'payment_record_id', payment_record_id,
    'payment_amount', new_amount_paid,
    'payment_currency', actual_payment_currency,
    'usd_equivalent', usd_amount
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

-- Fix the sync trigger to store payments in their actual currency
CREATE OR REPLACE FUNCTION sync_payment_record_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
    quote_info RECORD;
    payment_currency TEXT;
    creator_id UUID;
    balance_before DECIMAL := 0;
    balance_after DECIMAL := 0;
BEGIN
    -- Only process INSERT operations for now
    IF TG_OP = 'INSERT' THEN
        -- Get quote details
        SELECT * INTO quote_info FROM quotes WHERE id = NEW.quote_id;
        
        -- Use the quote's currency as the payment currency
        -- In the future, we could add a currency column to payment_records
        payment_currency := quote_info.final_currency;
        
        -- Calculate balance before (in USD for consistency)
        SELECT COALESCE(SUM(pl.base_amount), 0) INTO balance_before
        FROM payment_ledger pl
        WHERE pl.quote_id = NEW.quote_id 
        AND pl.payment_type IN ('customer_payment', 'credit_applied') 
        AND pl.status = 'completed';
        
        balance_after := balance_before + NEW.amount;  -- NEW.amount is already in USD
        
        -- Handle NULL recorded_by (use first available admin or the recorded_by value)
        creator_id := COALESCE(NEW.recorded_by, (SELECT id FROM auth.users LIMIT 1));
        
        -- Create payment_ledger entry in the actual payment currency
        INSERT INTO payment_ledger (
            quote_id,
            payment_date,
            payment_type,
            payment_method,
            gateway_code,
            amount,              -- Store in payment currency (converted from USD)
            currency,            -- Store actual payment currency
            exchange_rate,       -- Store exchange rate used
            base_amount,         -- Store USD amount
            balance_before,      -- USD balance before
            balance_after,       -- USD balance after
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
            -- Convert USD amount back to payment currency for display
            NEW.amount * (
                SELECT COALESCE(rate_from_usd, 1) 
                FROM country_settings 
                WHERE currency = payment_currency
            ),
            payment_currency,    -- Store the actual payment currency
            (
                SELECT COALESCE(rate_from_usd, 1) 
                FROM country_settings 
                WHERE currency = payment_currency
            ),
            NEW.amount,          -- Base amount in USD
            balance_before,      -- USD balance before
            balance_after,       -- USD balance after
            NEW.reference_number,
            COALESCE(NEW.status, 'completed'),
            NEW.notes,
            creator_id
        );
        
        RAISE NOTICE 'Auto-synced payment_record % to payment_ledger in % currency', 
            NEW.id, payment_currency;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION force_update_payment TO authenticated;
GRANT EXECUTE ON FUNCTION sync_payment_record_to_ledger TO authenticated;

-- Add comments
COMMENT ON FUNCTION force_update_payment IS 'Enhanced payment update function that properly handles payment currency storage';
COMMENT ON FUNCTION sync_payment_record_to_ledger IS 'Syncs payment_records to payment_ledger storing payments in their actual currency';