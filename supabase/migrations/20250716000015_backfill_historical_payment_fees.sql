-- Backfill historical payment_transactions with fee data
-- This migration extracts fee information from gateway_response JSONB and calculates fees where possible

-- Create a function to extract and update historical fee data
CREATE OR REPLACE FUNCTION backfill_payment_transaction_fees()
RETURNS TABLE (
  updated_count INTEGER,
  paypal_count INTEGER,
  payu_count INTEGER,
  calculated_count INTEGER,
  error_count INTEGER
) AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_paypal_count INTEGER := 0;
  v_payu_count INTEGER := 0;
  v_calculated_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_transaction RECORD;
  v_fee_amount NUMERIC(10,2);
  v_net_amount NUMERIC(10,2);
  v_fee_percentage NUMERIC(5,3);
  v_fee_data RECORD;
BEGIN
  -- Process all transactions that don't have fee data
  FOR v_transaction IN 
    SELECT 
      id,
      payment_method,
      amount,
      currency,
      gateway_response,
      gateway_code,
      quote_id,
      created_at
    FROM payment_transactions
    WHERE gateway_fee_amount IS NULL 
      OR gateway_fee_amount = 0
      OR net_amount IS NULL
    ORDER BY created_at DESC
  LOOP
    BEGIN
      v_fee_amount := NULL;
      v_net_amount := NULL;
      v_fee_percentage := NULL;
      
      -- Extract PayPal fees from gateway response
      IF v_transaction.payment_method = 'paypal' 
         AND v_transaction.gateway_response IS NOT NULL THEN
        
        -- Try multiple paths where PayPal might store fee data
        v_fee_amount := COALESCE(
          -- Path 1: capture_details.seller_receivable_breakdown
          (v_transaction.gateway_response->'capture_details'->'seller_receivable_breakdown'->'paypal_fee'->>'value')::NUMERIC(10,2),
          -- Path 2: Direct seller_receivable_breakdown
          (v_transaction.gateway_response->'seller_receivable_breakdown'->'paypal_fee'->>'value')::NUMERIC(10,2),
          -- Path 3: sellerReceivableBreakdown (camelCase)
          (v_transaction.gateway_response->'sellerReceivableBreakdown'->'paypal_fee'->>'value')::NUMERIC(10,2),
          -- Path 4: Inside fullResponse
          (v_transaction.gateway_response->'fullResponse'->'purchase_units'->0->'payments'->'captures'->0->'seller_receivable_breakdown'->'paypal_fee'->>'value')::NUMERIC(10,2),
          -- Path 5: Direct in captures array
          (v_transaction.gateway_response->'purchase_units'->0->'payments'->'captures'->0->'seller_receivable_breakdown'->'paypal_fee'->>'value')::NUMERIC(10,2)
        );
        
        v_net_amount := COALESCE(
          (v_transaction.gateway_response->'capture_details'->'seller_receivable_breakdown'->'net_amount'->>'value')::NUMERIC(10,2),
          (v_transaction.gateway_response->'seller_receivable_breakdown'->'net_amount'->>'value')::NUMERIC(10,2),
          (v_transaction.gateway_response->'sellerReceivableBreakdown'->'net_amount'->>'value')::NUMERIC(10,2),
          (v_transaction.gateway_response->'fullResponse'->'purchase_units'->0->'payments'->'captures'->0->'seller_receivable_breakdown'->'net_amount'->>'value')::NUMERIC(10,2),
          (v_transaction.gateway_response->'purchase_units'->0->'payments'->'captures'->0->'seller_receivable_breakdown'->'net_amount'->>'value')::NUMERIC(10,2)
        );
        
        IF v_fee_amount IS NOT NULL THEN
          v_paypal_count := v_paypal_count + 1;
        END IF;
        
      -- Extract PayU fees (if stored in response)
      ELSIF v_transaction.payment_method = 'payu' 
            AND v_transaction.gateway_response IS NOT NULL THEN
        
        -- PayU typically doesn't include fee in webhook, but check common paths
        v_fee_amount := COALESCE(
          (v_transaction.gateway_response->>'transaction_fee')::NUMERIC(10,2),
          (v_transaction.gateway_response->>'gateway_fee')::NUMERIC(10,2),
          (v_transaction.gateway_response->'additional_charges'->>'transaction_fee')::NUMERIC(10,2)
        );
        
        IF v_fee_amount IS NOT NULL THEN
          v_payu_count := v_payu_count + 1;
        END IF;
      END IF;
      
      -- If no fee found in response, calculate using fee configuration
      IF v_fee_amount IS NULL AND v_transaction.amount > 0 THEN
        -- Use the calculate_gateway_fee function
        SELECT * INTO v_fee_data
        FROM calculate_gateway_fee(
          v_transaction.gateway_code,
          v_transaction.amount,
          v_transaction.currency,
          CASE 
            WHEN v_transaction.quote_id IS NOT NULL THEN
              (SELECT destination_country FROM quotes WHERE id = v_transaction.quote_id)
            ELSE NULL
          END
        );
        
        IF v_fee_data.fee_amount IS NOT NULL THEN
          v_fee_amount := v_fee_data.fee_amount;
          v_net_amount := v_fee_data.net_amount;
          v_fee_percentage := v_fee_data.fee_percentage;
          v_calculated_count := v_calculated_count + 1;
        END IF;
      END IF;
      
      -- Calculate derived values if missing
      IF v_fee_amount IS NOT NULL THEN
        -- Calculate net amount if not extracted
        IF v_net_amount IS NULL THEN
          v_net_amount := v_transaction.amount - v_fee_amount;
        END IF;
        
        -- Calculate fee percentage
        IF v_fee_percentage IS NULL AND v_transaction.amount > 0 THEN
          v_fee_percentage := ROUND((v_fee_amount / v_transaction.amount * 100)::NUMERIC(5,3), 3);
        END IF;
        
        -- Update the transaction
        UPDATE payment_transactions
        SET 
          gateway_fee_amount = v_fee_amount,
          gateway_fee_currency = v_transaction.currency,
          net_amount = v_net_amount,
          fee_percentage = v_fee_percentage,
          updated_at = NOW()
        WHERE id = v_transaction.id;
        
        v_updated_count := v_updated_count + 1;
        
        -- Also ensure payment_ledger has the fee entry
        IF NOT EXISTS (
          SELECT 1 FROM payment_ledger 
          WHERE payment_transaction_id = v_transaction.id 
            AND payment_type = 'gateway_fee'
        ) AND v_fee_amount > 0 THEN
          
          INSERT INTO payment_ledger (
            payment_transaction_id,
            quote_id,
            payment_type,
            payment_method,
            amount,
            currency,
            status,
            description,
            reference_type,
            reference_id,
            created_at,
            processed_at
          ) VALUES (
            v_transaction.id,
            v_transaction.quote_id,
            'gateway_fee',
            v_transaction.payment_method,
            -v_fee_amount, -- Negative as it's a deduction
            v_transaction.currency,
            'completed',
            v_transaction.payment_method || ' transaction fee',
            'payment_transaction',
            v_transaction.id,
            v_transaction.created_at,
            v_transaction.created_at
          );
        END IF;
        
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error and continue
        RAISE NOTICE 'Error processing transaction %: %', v_transaction.id, SQLERRM;
        v_error_count := v_error_count + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT 
    v_updated_count,
    v_paypal_count,
    v_payu_count,
    v_calculated_count,
    v_error_count;
END;
$$ LANGUAGE plpgsql;

-- Execute the backfill
DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result FROM backfill_payment_transaction_fees();
  
  RAISE NOTICE 'Backfill completed:';
  RAISE NOTICE '  Total updated: %', v_result.updated_count;
  RAISE NOTICE '  PayPal extracted: %', v_result.paypal_count;
  RAISE NOTICE '  PayU extracted: %', v_result.payu_count;
  RAISE NOTICE '  Calculated from config: %', v_result.calculated_count;
  RAISE NOTICE '  Errors: %', v_result.error_count;
END;
$$;

-- Create an index to help identify transactions needing fee updates
CREATE INDEX IF NOT EXISTS idx_payment_transactions_missing_fees
ON payment_transactions(created_at DESC)
WHERE gateway_fee_amount IS NULL OR gateway_fee_amount = 0;

-- Add a comment about the backfill
COMMENT ON FUNCTION backfill_payment_transaction_fees IS 'Backfills historical payment transaction records with fee data extracted from gateway responses or calculated from fee configurations. Safe to run multiple times.';

-- Optional: Drop the function after use (uncomment if desired)
-- DROP FUNCTION backfill_payment_transaction_fees();