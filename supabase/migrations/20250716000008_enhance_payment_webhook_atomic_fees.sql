-- Drop existing function to modify return type
DROP FUNCTION IF EXISTS process_payment_webhook_atomic(TEXT[], TEXT, JSONB, TEXT, JSONB, BOOLEAN);

-- Create enhanced version with fee handling
CREATE OR REPLACE FUNCTION process_payment_webhook_atomic(
  p_quote_ids TEXT[],
  p_payment_status TEXT,
  p_payment_data JSONB,
  p_guest_session_token TEXT DEFAULT NULL,
  p_guest_session_data JSONB DEFAULT NULL,
  p_create_order BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  success BOOLEAN,
  payment_transaction_id UUID,
  payment_ledger_entry_id UUID,
  quotes_updated BOOLEAN,
  guest_session_updated BOOLEAN,
  order_id UUID,
  fee_ledger_entry_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_payment_tx_id UUID;
  v_ledger_entry_id UUID;
  v_fee_ledger_id UUID;
  v_order_id UUID;
  v_guest_session_id UUID;
  v_quotes_updated BOOLEAN := FALSE;
  v_guest_session_updated BOOLEAN := FALSE;
  v_user_id UUID;
  v_transaction_id TEXT;
  v_gateway_tx_id TEXT;
  v_amount DECIMAL(10,2);
  v_currency TEXT;
  v_customer_email TEXT;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_payment_method TEXT;
  v_gateway_response JSONB;
  v_gateway_fee DECIMAL(10,2) DEFAULT 0;
  v_net_amount DECIMAL(10,2);
  v_fee_percentage DECIMAL(5,3) DEFAULT 0;
  quote_record RECORD;
BEGIN
  -- Start transaction (implicit with function)
  BEGIN
    -- Extract payment data
    v_transaction_id := p_payment_data->>'transaction_id';
    v_gateway_tx_id := p_payment_data->>'gateway_transaction_id';
    v_amount := (p_payment_data->>'amount')::DECIMAL(10,2);
    v_currency := p_payment_data->>'currency';
    v_customer_email := p_payment_data->>'customer_email';
    v_customer_name := p_payment_data->>'customer_name';
    v_customer_phone := p_payment_data->>'customer_phone';
    v_payment_method := p_payment_data->>'payment_method';
    v_gateway_response := p_payment_data->'gateway_response';
    
    -- Extract fee information based on payment method
    IF v_payment_method = 'paypal' AND v_gateway_response IS NOT NULL THEN
      -- Extract PayPal fees from seller_receivable_breakdown
      v_gateway_fee := COALESCE(
        (v_gateway_response->'capture_details'->'seller_receivable_breakdown'->'paypal_fee'->>'value')::DECIMAL(10,2),
        (v_gateway_response->'seller_receivable_breakdown'->'paypal_fee'->>'value')::DECIMAL(10,2),
        0
      );
      v_net_amount := COALESCE(
        (v_gateway_response->'capture_details'->'seller_receivable_breakdown'->'net_amount'->>'value')::DECIMAL(10,2),
        (v_gateway_response->'seller_receivable_breakdown'->'net_amount'->>'value')::DECIMAL(10,2),
        v_amount - v_gateway_fee
      );
    ELSE
      -- For other payment methods, assume no fee data available yet
      v_gateway_fee := 0;
      v_net_amount := v_amount;
    END IF;
    
    -- Calculate fee percentage
    IF v_amount > 0 AND v_gateway_fee > 0 THEN
      v_fee_percentage := ROUND((v_gateway_fee / v_amount * 100)::DECIMAL(5,3), 3);
    END IF;
    
    -- Check if payment transaction already exists
    SELECT id INTO v_payment_tx_id
    FROM payment_transactions
    WHERE gateway_transaction_id = v_gateway_tx_id
      AND payment_method = v_payment_method;
    
    IF v_payment_tx_id IS NULL THEN
      -- Get user_id from first quote
      IF array_length(p_quote_ids, 1) > 0 THEN
        SELECT user_id INTO v_user_id
        FROM quotes
        WHERE id = p_quote_ids[1]::UUID;
      END IF;
      
      -- Create payment transaction with fee information
      INSERT INTO payment_transactions (
        user_id,
        quote_id,
        amount,
        currency,
        status,
        payment_method,
        transaction_id,
        gateway_transaction_id,
        gateway_response,
        gateway_fee_amount,
        gateway_fee_currency,
        net_amount,
        fee_percentage,
        created_at
      ) VALUES (
        v_user_id,
        p_quote_ids[1]::UUID,
        v_amount,
        v_currency,
        CASE 
          WHEN p_payment_status = 'success' THEN 'completed'::payment_status
          WHEN p_payment_status = 'failed' THEN 'failed'::payment_status
          ELSE 'pending'::payment_status
        END,
        v_payment_method,
        v_transaction_id,
        v_gateway_tx_id,
        v_gateway_response,
        v_gateway_fee,
        v_currency,
        v_net_amount,
        v_fee_percentage,
        NOW()
      ) RETURNING id INTO v_payment_tx_id;
    ELSE
      -- Update existing payment transaction with fee information
      UPDATE payment_transactions
      SET 
        status = CASE 
          WHEN p_payment_status = 'success' THEN 'completed'::payment_status
          WHEN p_payment_status = 'failed' THEN 'failed'::payment_status
          ELSE 'pending'::payment_status
        END,
        gateway_response = v_gateway_response,
        gateway_fee_amount = v_gateway_fee,
        gateway_fee_currency = v_currency,
        net_amount = v_net_amount,
        fee_percentage = v_fee_percentage,
        updated_at = NOW()
      WHERE id = v_payment_tx_id;
    END IF;
    
    -- Process quotes if payment successful
    IF p_payment_status = 'success' THEN
      FOR quote_record IN 
        SELECT * FROM quotes 
        WHERE id = ANY(p_quote_ids::UUID[])
      LOOP
        -- Update quote payment status
        UPDATE quotes
        SET 
          payment_status = 'paid',
          amount_paid = quote_record.final_total,
          updated_at = NOW()
        WHERE id = quote_record.id;
        
        -- Create main payment ledger entry
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
          quote_record.id,
          v_payment_tx_id,
          'customer_payment',
          v_amount,
          v_currency,
          v_payment_method,
          v_payment_method,
          v_gateway_tx_id,
          v_transaction_id,
          'completed',
          NOW(),
          v_amount,
          0.00,
          v_amount,
          'Payment webhook: ' || p_payment_status,
          v_user_id,
          jsonb_build_object(
            'webhook_processing', true,
            'payment_status', p_payment_status,
            'transaction_id', v_transaction_id,
            'gateway_transaction_id', v_gateway_tx_id,
            'customer_email', v_customer_email,
            'customer_name', v_customer_name,
            'processed_at', NOW()
          ) || COALESCE(v_gateway_response, '{}'::jsonb),
          NOW(),
          NOW()
        ) RETURNING id INTO v_ledger_entry_id;
        
        -- Create fee ledger entry if fee exists
        IF v_gateway_fee > 0 THEN
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
            quote_record.id,
            v_payment_tx_id,
            'gateway_fee',
            -v_gateway_fee, -- Negative for expense
            v_currency,
            v_payment_method,
            v_payment_method,
            v_gateway_tx_id,
            v_transaction_id || '_FEE',
            'completed',
            NOW(),
            -v_gateway_fee,
            v_amount,
            v_net_amount,
            'Payment gateway processing fee',
            v_user_id,
            jsonb_build_object(
              'fee_type', 'gateway_processing',
              'gross_amount', v_amount,
              'net_amount', v_net_amount,
              'fee_percentage', v_fee_percentage,
              'parent_transaction_id', v_payment_tx_id
            ),
            NOW(),
            NOW()
          ) RETURNING id INTO v_fee_ledger_id;
        END IF;
      END LOOP;
      
      v_quotes_updated := TRUE;
    END IF;
    
    -- Handle guest session updates if token provided
    IF p_guest_session_token IS NOT NULL THEN
      -- Get guest session
      SELECT id INTO v_guest_session_id
      FROM guest_checkout_sessions
      WHERE session_token = p_guest_session_token
        AND status = 'active';
      
      IF v_guest_session_id IS NOT NULL THEN
        IF p_payment_status = 'success' THEN
          -- Update guest session to completed
          UPDATE guest_checkout_sessions
          SET 
            status = 'completed',
            updated_at = NOW()
          WHERE id = v_guest_session_id;
          
          -- Store guest data in quotes if provided
          IF p_guest_session_data IS NOT NULL THEN
            UPDATE quotes
            SET 
              guest_checkout_data = p_guest_session_data,
              updated_at = NOW()
            WHERE id = ANY(p_quote_ids::UUID[])
              AND user_id IS NULL;
          END IF;
        ELSIF p_payment_status = 'failed' THEN
          -- Update guest session to failed
          UPDATE guest_checkout_sessions
          SET 
            status = 'failed',
            updated_at = NOW()
          WHERE id = v_guest_session_id;
        END IF;
        
        v_guest_session_updated := TRUE;
      END IF;
    END IF;
    
    -- Create order if requested and payment successful
    IF p_create_order AND p_payment_status = 'success' THEN
      -- Simple order creation (extend as needed)
      INSERT INTO orders (
        user_id,
        quote_id,
        payment_transaction_id,
        status,
        total_amount,
        currency,
        created_at
      ) VALUES (
        v_user_id,
        p_quote_ids[1]::UUID,
        v_payment_tx_id,
        'pending',
        v_amount,
        v_currency,
        NOW()
      ) RETURNING id INTO v_order_id;
    END IF;
    
    -- Return success
    RETURN QUERY SELECT 
      TRUE,
      v_payment_tx_id,
      v_ledger_entry_id,
      v_quotes_updated,
      v_guest_session_updated,
      v_order_id,
      v_fee_ledger_id,
      NULL::TEXT;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RETURN QUERY SELECT 
        FALSE,
        NULL::UUID,
        NULL::UUID,
        FALSE,
        FALSE,
        NULL::UUID,
        NULL::UUID,
        SQLERRM::TEXT;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_payment_webhook_atomic TO service_role;
GRANT EXECUTE ON FUNCTION process_payment_webhook_atomic TO authenticated;

-- Add comment
COMMENT ON FUNCTION process_payment_webhook_atomic IS 'Enhanced atomic payment webhook processing with fee extraction and recording. Creates separate ledger entries for gateway fees to maintain complete audit trail.';