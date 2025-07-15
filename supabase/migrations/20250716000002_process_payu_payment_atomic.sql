-- Create atomic function for processing PayU payments
-- This function ensures all payment processing operations are atomic
CREATE OR REPLACE FUNCTION process_payu_payment_atomic(
  p_transaction_id TEXT,
  p_gateway_transaction_id TEXT,
  p_amount DECIMAL(10,2),
  p_currency TEXT,
  p_status TEXT,
  p_gateway_response JSONB,
  p_quote_id UUID,
  p_customer_email TEXT,
  p_customer_name TEXT,
  p_payment_method TEXT,
  p_notes TEXT
) RETURNS TABLE (
  success BOOLEAN,
  payment_transaction_id UUID,
  quote_updated BOOLEAN,
  payment_ledger_entry_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_payment_tx_id UUID;
  v_quote_record quotes%ROWTYPE;
  v_ledger_entry_id UUID;
  v_user_id UUID;
  v_amount_in_usd DECIMAL(10,2);
  v_exchange_rate DECIMAL(10,4);
BEGIN
  -- Start transaction
  BEGIN
    -- Get exchange rate for INR to USD conversion
    SELECT rate_from_usd INTO v_exchange_rate
    FROM country_settings
    WHERE code = 'IN';
    
    -- Fallback exchange rate if not found
    IF v_exchange_rate IS NULL THEN
      v_exchange_rate := 83.0;
    END IF;
    
    -- Convert amount to USD for consistent storage
    v_amount_in_usd := p_amount / v_exchange_rate;
    
    -- Find or create payment transaction
    SELECT id INTO v_payment_tx_id
    FROM payment_transactions
    WHERE transaction_id = p_transaction_id
       OR gateway_transaction_id = p_gateway_transaction_id;
    
    IF v_payment_tx_id IS NULL THEN
      -- Get user_id from quote if creating new transaction
      SELECT user_id INTO v_user_id
      FROM quotes
      WHERE id = p_quote_id;
      
      -- Create new payment transaction
      INSERT INTO payment_transactions (
        user_id,
        transaction_id,
        gateway_transaction_id,
        amount,
        currency,
        status,
        gateway_code,
        gateway_response,
        created_at,
        updated_at
      ) VALUES (
        v_user_id,
        p_transaction_id,
        p_gateway_transaction_id,
        v_amount_in_usd,
        'USD', -- Store in USD for consistency
        p_status,
        'payu',
        p_gateway_response,
        NOW(),
        NOW()
      ) RETURNING id INTO v_payment_tx_id;
    ELSE
      -- Update existing payment transaction
      UPDATE payment_transactions
      SET 
        status = p_status,
        gateway_transaction_id = COALESCE(p_gateway_transaction_id, gateway_transaction_id),
        gateway_response = COALESCE(gateway_response, '{}'::jsonb) || p_gateway_response,
        updated_at = NOW()
      WHERE id = v_payment_tx_id;
    END IF;
    
    -- Update quote if payment is successful
    IF p_status = 'completed' AND p_quote_id IS NOT NULL THEN
      -- Get quote record
      SELECT * INTO v_quote_record
      FROM quotes
      WHERE id = p_quote_id;
      
      IF FOUND THEN
        v_user_id := v_quote_record.user_id;
        
        -- Update quote status
        UPDATE quotes
        SET 
          status = 'paid',
          payment_method = p_payment_method,
          payment_status = 'paid',
          paid_at = NOW(),
          payment_details = jsonb_build_object(
            'payu_transaction_id', p_transaction_id,
            'payu_mihpayid', p_gateway_transaction_id,
            'payu_customer_email', p_customer_email,
            'payu_customer_name', p_customer_name,
            'original_amount_inr', p_amount,
            'amount_usd', v_amount_in_usd,
            'exchange_rate', v_exchange_rate
          ),
          updated_at = NOW()
        WHERE id = p_quote_id;
        
        -- Insert payment ledger entry
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
          v_payment_tx_id,
          'customer_payment',
          v_amount_in_usd,
          'USD',
          p_payment_method,
          'payu',
          p_gateway_transaction_id,
          p_transaction_id,
          'completed',
          NOW(),
          v_amount_in_usd,
          0, -- Would need proper balance calculation
          v_amount_in_usd, -- Would need proper balance calculation
          p_notes,
          v_user_id,
          jsonb_build_object(
            'transaction_id', p_transaction_id,
            'gateway_transaction_id', p_gateway_transaction_id,
            'customer_email', p_customer_email,
            'customer_name', p_customer_name,
            'original_amount_inr', p_amount,
            'exchange_rate', v_exchange_rate
          ),
          NOW(),
          NOW()
        ) RETURNING id INTO v_ledger_entry_id;
      END IF;
    END IF;
    
    -- Return success
    RETURN QUERY SELECT 
      TRUE,
      v_payment_tx_id,
      (p_status = 'completed' AND p_quote_id IS NOT NULL),
      v_ledger_entry_id,
      NULL::TEXT;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RETURN QUERY SELECT 
        FALSE,
        NULL::UUID,
        FALSE,
        NULL::UUID,
        SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_payu_payment_atomic TO service_role;
GRANT EXECUTE ON FUNCTION process_payu_payment_atomic TO authenticated;

-- Add comment
COMMENT ON FUNCTION process_payu_payment_atomic IS 'Atomically processes PayU payment completion including payment transaction creation/update, quote updates, and payment ledger entries';