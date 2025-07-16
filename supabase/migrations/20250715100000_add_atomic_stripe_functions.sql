-- Migration: Add atomic functions for Stripe webhook processing
-- Ensures data consistency and integrity for payment operations

-- Function to atomically process successful Stripe payments
CREATE OR REPLACE FUNCTION process_stripe_payment_success(
  p_payment_intent_id TEXT,
  p_user_id TEXT,
  p_quote_ids TEXT[],
  p_amount DECIMAL,
  p_currency TEXT,
  p_gateway_response JSONB,
  p_customer_details JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_quote_id TEXT;
  v_result JSONB;
  v_transaction_id TEXT;
  v_existing_quote RECORD;
  v_update_data JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Create payment transaction record
    INSERT INTO payment_transactions (
      user_id,
      quote_id,
      amount,
      currency,
      status,
      payment_method,
      gateway_response,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_quote_ids[1], -- Primary quote
      p_amount,
      p_currency,
      'completed',
      'stripe',
      p_gateway_response,
      NOW(),
      NOW()
    ) RETURNING id INTO v_transaction_id;

    -- Update all quotes atomically
    FOREACH v_quote_id IN ARRAY p_quote_ids
    LOOP
      -- Get existing quote data
      SELECT customer_name, email INTO v_existing_quote
      FROM quotes
      WHERE id = v_quote_id;

      -- Prepare update data
      v_update_data := jsonb_build_object(
        'status', 'paid',
        'payment_status', 'paid',
        'payment_method', 'stripe',
        'paid_at', NOW(),
        'updated_at', NOW()
      );

      -- Add customer details if available and not already set
      IF p_customer_details IS NOT NULL THEN
        IF v_existing_quote.customer_name IS NULL AND p_customer_details->>'name' IS NOT NULL THEN
          v_update_data := v_update_data || jsonb_build_object('customer_name', p_customer_details->>'name');
        END IF;
        
        IF v_existing_quote.email IS NULL AND p_customer_details->>'email' IS NOT NULL THEN
          v_update_data := v_update_data || jsonb_build_object('email', p_customer_details->>'email');
        END IF;
      END IF;

      -- Update quote
      UPDATE quotes
      SET 
        status = (v_update_data->>'status'),
        payment_status = (v_update_data->>'payment_status'),
        payment_method = (v_update_data->>'payment_method'),
        paid_at = (v_update_data->>'paid_at')::TIMESTAMPTZ,
        updated_at = (v_update_data->>'updated_at')::TIMESTAMPTZ,
        customer_name = COALESCE((v_update_data->>'customer_name'), customer_name),
        email = COALESCE((v_update_data->>'email'), email)
      WHERE id = v_quote_id
      AND status != 'paid'; -- Only update if not already paid
    END LOOP;

    -- Create payment ledger entry
    INSERT INTO payment_ledger (
      quote_id,
      amount,
      currency,
      payment_type,
      payment_method,
      reference_number,
      gateway_code,
      gateway_transaction_id,
      notes,
      created_by,
      created_at
    ) VALUES (
      p_quote_ids[1],
      p_amount,
      p_currency,
      'customer_payment',
      'stripe',
      p_payment_intent_id,
      'stripe',
      p_payment_intent_id,
      'Stripe payment via webhook - ' || COALESCE(p_gateway_response->>'description', ''),
      p_user_id,
      NOW()
    );

    -- Build result
    v_result := jsonb_build_object(
      'success', true,
      'transaction_id', v_transaction_id,
      'payment_intent_id', p_payment_intent_id,
      'affected_quotes', p_quote_ids,
      'processed_at', NOW()
    );

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    -- Rollback will happen automatically
    RAISE EXCEPTION 'Payment processing failed: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to atomically process failed Stripe payments
CREATE OR REPLACE FUNCTION process_stripe_payment_failure(
  p_payment_intent_id TEXT,
  p_user_id TEXT,
  p_quote_ids TEXT[],
  p_amount DECIMAL,
  p_currency TEXT,
  p_gateway_response JSONB,
  p_failure_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_transaction_id TEXT;
BEGIN
  -- Start transaction
  BEGIN
    -- Create payment transaction record for failed payment
    INSERT INTO payment_transactions (
      user_id,
      quote_id,
      amount,
      currency,
      status,
      payment_method,
      gateway_response,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_quote_ids[1],
      p_amount,
      p_currency,
      'failed',
      'stripe',
      p_gateway_response,
      NOW(),
      NOW()
    ) RETURNING id INTO v_transaction_id;

    -- Log failure reason if provided
    IF p_failure_reason IS NOT NULL THEN
      INSERT INTO payment_error_logs (
        transaction_id,
        error_type,
        error_message,
        created_at
      ) VALUES (
        v_transaction_id,
        'payment_failure',
        p_failure_reason,
        NOW()
      );
    END IF;

    -- Build result
    v_result := jsonb_build_object(
      'success', true,
      'transaction_id', v_transaction_id,
      'payment_intent_id', p_payment_intent_id,
      'failure_reason', p_failure_reason,
      'processed_at', NOW()
    );

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Payment failure processing failed: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to atomically process successful charges
CREATE OR REPLACE FUNCTION process_stripe_charge_succeeded(
  p_charge_id TEXT,
  p_payment_intent_id TEXT,
  p_charge_details JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_existing_response JSONB;
  v_updated_response JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- Get existing payment transaction
    SELECT gateway_response INTO v_existing_response
    FROM payment_transactions
    WHERE gateway_response->>'id' = p_payment_intent_id;

    IF v_existing_response IS NULL THEN
      RAISE EXCEPTION 'Payment transaction not found for payment intent: %', p_payment_intent_id;
    END IF;

    -- Update gateway response with charge details
    v_updated_response := v_existing_response || jsonb_build_object('charge_details', p_charge_details);

    -- Update payment transaction
    UPDATE payment_transactions
    SET 
      gateway_response = v_updated_response,
      updated_at = NOW()
    WHERE gateway_response->>'id' = p_payment_intent_id;

    -- Build result
    v_result := jsonb_build_object(
      'success', true,
      'charge_id', p_charge_id,
      'payment_intent_id', p_payment_intent_id,
      'processed_at', NOW()
    );

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Charge processing failed: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to atomically process refunds
CREATE OR REPLACE FUNCTION process_stripe_refund(
  p_charge_id TEXT,
  p_payment_intent_id TEXT,
  p_refund_amount DECIMAL,
  p_currency TEXT,
  p_is_full_refund BOOLEAN,
  p_refund_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_transaction RECORD;
  v_refund_type TEXT;
BEGIN
  -- Start transaction
  BEGIN
    -- Get original transaction
    SELECT quote_id, user_id INTO v_transaction
    FROM payment_transactions
    WHERE gateway_response->>'id' = p_payment_intent_id;

    IF v_transaction IS NULL THEN
      RAISE EXCEPTION 'Payment transaction not found for payment intent: %', p_payment_intent_id;
    END IF;

    -- Determine refund type
    v_refund_type := CASE WHEN p_is_full_refund THEN 'refund' ELSE 'partial_refund' END;

    -- Create refund ledger entry
    INSERT INTO payment_ledger (
      quote_id,
      amount,
      currency,
      payment_type,
      payment_method,
      reference_number,
      gateway_code,
      gateway_transaction_id,
      notes,
      created_by,
      created_at
    ) VALUES (
      v_transaction.quote_id,
      p_refund_amount,
      p_currency,
      v_refund_type,
      'stripe',
      p_charge_id || '_refund',
      'stripe',
      p_charge_id,
      'Stripe refund via webhook - ' || COALESCE(p_refund_reason, ''),
      v_transaction.user_id,
      NOW()
    );

    -- Build result
    v_result := jsonb_build_object(
      'success', true,
      'charge_id', p_charge_id,
      'payment_intent_id', p_payment_intent_id,
      'refund_amount', p_refund_amount,
      'refund_type', v_refund_type,
      'processed_at', NOW()
    );

    RETURN v_result;

  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Refund processing failed: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for the new functions
-- These functions use SECURITY DEFINER so they run with elevated privileges
-- but we still need to ensure they can only be called by the webhook system

-- Grant execute permissions to the service role
GRANT EXECUTE ON FUNCTION process_stripe_payment_success TO service_role;
GRANT EXECUTE ON FUNCTION process_stripe_payment_failure TO service_role;
GRANT EXECUTE ON FUNCTION process_stripe_charge_succeeded TO service_role;
GRANT EXECUTE ON FUNCTION process_stripe_refund TO service_role;

-- Create index for faster webhook processing
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_response_id 
ON payment_transactions USING GIN ((gateway_response->>'id'));

-- Create index for payment ledger queries
CREATE INDEX IF NOT EXISTS idx_payment_ledger_gateway_transaction_id 
ON payment_ledger (gateway_transaction_id);

COMMENT ON FUNCTION process_stripe_payment_success IS 'Atomically processes successful Stripe payments with full data consistency';
COMMENT ON FUNCTION process_stripe_payment_failure IS 'Atomically processes failed Stripe payments with error logging';
COMMENT ON FUNCTION process_stripe_charge_succeeded IS 'Atomically processes successful Stripe charges with billing details';
COMMENT ON FUNCTION process_stripe_refund IS 'Atomically processes Stripe refunds with ledger entries';