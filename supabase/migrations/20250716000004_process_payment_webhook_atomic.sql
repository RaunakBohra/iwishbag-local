-- Create atomic function for processing payment webhooks
-- This function ensures all related database operations either fully succeed or fully fail
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
  error_message TEXT
) AS $$
DECLARE
  v_payment_tx_id UUID;
  v_order_id UUID;
  v_quotes_updated BOOLEAN := FALSE;
  v_guest_session_updated BOOLEAN := FALSE;
  v_user_id UUID;
  v_guest_session_id UUID;
  v_quote_record RECORD;
  v_existing_payment UUID;
  v_ledger_entry_id UUID;
  v_transaction_id TEXT;
  v_gateway_tx_id TEXT;
  v_amount DECIMAL(10,2);
  v_currency TEXT;
  v_customer_email TEXT;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_payment_method TEXT;
  v_gateway_response JSONB;
BEGIN
  -- Start transaction (implicit with function)
  BEGIN
    -- Extract payment data from JSONB
    v_transaction_id := p_payment_data->>'transaction_id';
    v_gateway_tx_id := p_payment_data->>'gateway_transaction_id';
    v_amount := (p_payment_data->>'amount')::DECIMAL(10,2);
    v_currency := p_payment_data->>'currency';
    v_customer_email := p_payment_data->>'customer_email';
    v_customer_name := p_payment_data->>'customer_name';
    v_customer_phone := p_payment_data->>'customer_phone';
    v_payment_method := p_payment_data->>'payment_method';
    v_gateway_response := p_payment_data->'gateway_response';
    
    -- Validate required fields
    IF v_transaction_id IS NULL OR v_amount IS NULL OR v_currency IS NULL THEN
      RETURN QUERY SELECT 
        FALSE,
        NULL::UUID,
        NULL::UUID,
        FALSE,
        FALSE,
        NULL::UUID,
        'Missing required payment data fields'::TEXT;
      RETURN;
    END IF;
    
    -- Get user_id from first quote
    IF array_length(p_quote_ids, 1) > 0 THEN
      SELECT user_id INTO v_user_id
      FROM quotes
      WHERE id = p_quote_ids[1]::UUID;
    END IF;
    
    -- Check if payment transaction already exists (idempotency)
    SELECT id INTO v_existing_payment
    FROM payment_transactions
    WHERE transaction_id = v_transaction_id
       OR gateway_transaction_id = v_gateway_tx_id;
    
    -- Create or update payment transaction
    IF v_existing_payment IS NULL THEN
      -- Create new payment transaction
      INSERT INTO payment_transactions (
        user_id,
        transaction_id,
        gateway_transaction_id,
        amount,
        currency,
        status,
        payment_method,
        gateway_code,
        gateway_response,
        created_at,
        updated_at
      ) VALUES (
        v_user_id,
        v_transaction_id,
        v_gateway_tx_id,
        v_amount,
        v_currency,
        CASE 
          WHEN p_payment_status = 'success' THEN 'completed'
          WHEN p_payment_status = 'failed' THEN 'failed'
          ELSE 'pending'
        END,
        v_payment_method,
        v_payment_method,
        v_gateway_response,
        NOW(),
        NOW()
      ) RETURNING id INTO v_payment_tx_id;
    ELSE
      -- Update existing payment transaction
      UPDATE payment_transactions
      SET 
        status = CASE 
          WHEN p_payment_status = 'success' THEN 'completed'
          WHEN p_payment_status = 'failed' THEN 'failed'
          ELSE 'pending'
        END,
        gateway_response = COALESCE(gateway_response, '{}'::jsonb) || v_gateway_response,
        updated_at = NOW()
      WHERE id = v_existing_payment;
      
      v_payment_tx_id := v_existing_payment;
    END IF;
    
    -- Create payment ledger entry for audit trail
    IF v_payment_tx_id IS NOT NULL THEN
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
        CASE WHEN array_length(p_quote_ids, 1) > 0 THEN p_quote_ids[1]::UUID ELSE NULL END,
        v_payment_tx_id,
        'customer_payment',
        v_amount,
        v_currency,
        v_payment_method,
        v_payment_method,
        v_gateway_tx_id,
        v_transaction_id,
        CASE 
          WHEN p_payment_status = 'success' THEN 'completed'
          WHEN p_payment_status = 'failed' THEN 'failed'
          ELSE 'pending'
        END,
        NOW(),
        v_amount,
        0.00, -- Balance tracking would need separate implementation
        CASE WHEN p_payment_status = 'success' THEN v_amount ELSE 0.00 END,
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
          
          -- Update quotes with guest details if session data provided
          IF p_guest_session_data IS NOT NULL THEN
            UPDATE quotes
            SET 
              customer_name = p_guest_session_data->>'guest_name',
              email = p_guest_session_data->>'guest_email',
              shipping_address = p_guest_session_data->'shipping_address',
              is_anonymous = TRUE,
              user_id = NULL,
              address_updated_at = NOW(),
              address_updated_by = NULL
            WHERE id = (p_guest_session_data->>'quote_id')::UUID;
          END IF;
          
          v_guest_session_updated := TRUE;
        ELSIF p_payment_status = 'failed' THEN
          -- Expire guest session but keep quote shareable
          UPDATE guest_checkout_sessions
          SET 
            status = 'expired',
            updated_at = NOW()
          WHERE id = v_guest_session_id;
          
          v_guest_session_updated := TRUE;
        END IF;
      END IF;
    END IF;
    
    -- Update quotes if not a failed guest payment
    IF array_length(p_quote_ids, 1) > 0 AND NOT (p_guest_session_token IS NOT NULL AND p_payment_status = 'failed') THEN
      -- Update quotes with payment details
      UPDATE quotes
      SET 
        status = CASE 
          WHEN p_payment_status = 'success' THEN 'paid'
          WHEN p_payment_status = 'failed' THEN 'failed'
          ELSE 'pending'
        END,
        payment_method = v_payment_method,
        payment_status = CASE 
          WHEN p_payment_status = 'success' THEN 'paid'
          WHEN p_payment_status = 'failed' THEN 'failed'
          ELSE 'pending'
        END,
        paid_at = CASE WHEN p_payment_status = 'success' THEN NOW() ELSE NULL END,
        in_cart = FALSE,
        payment_details = jsonb_build_object(
          'gateway', v_payment_method,
          'transaction_id', v_transaction_id,
          'gateway_transaction_id', v_gateway_tx_id,
          'status', p_payment_status,
          'amount', v_amount,
          'currency', v_currency,
          'customer_name', v_customer_name,
          'customer_email', v_customer_email,
          'customer_phone', v_customer_phone,
          'webhook_received_at', NOW()
        ),
        updated_at = NOW()
      WHERE id = ANY(p_quote_ids::UUID[]);
      
      v_quotes_updated := TRUE;
    END IF;
    
    -- Create order if payment successful and requested
    IF p_create_order AND p_payment_status = 'success' AND array_length(p_quote_ids, 1) > 0 THEN
      -- Generate order number
      INSERT INTO orders (
        order_number,
        user_id,
        quote_ids,
        total_amount,
        currency,
        status,
        payment_method,
        customer_email,
        customer_name,
        customer_phone,
        payment_transaction_id,
        created_at,
        updated_at
      ) VALUES (
        'ORD-' || extract(epoch from now())::text || '-' || substring(md5(random()::text), 1, 9),
        v_user_id,
        p_quote_ids,
        v_amount,
        v_currency,
        'confirmed',
        v_payment_method,
        v_customer_email,
        v_customer_name,
        v_customer_phone,
        v_payment_tx_id,
        NOW(),
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
        SQLERRM::TEXT;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_payment_webhook_atomic TO service_role;
GRANT EXECUTE ON FUNCTION process_payment_webhook_atomic TO authenticated;

-- Add comment
COMMENT ON FUNCTION process_payment_webhook_atomic IS 'Atomically processes payment webhook data including quotes update, guest session handling, payment transaction creation, payment ledger entries, and order creation. Ensures all operations succeed or fail together with comprehensive audit trail.';