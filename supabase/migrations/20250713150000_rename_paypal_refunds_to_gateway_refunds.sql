-- Rename paypal_refunds table to gateway_refunds for multi-gateway support
-- This migration makes the refund tracking system work for all payment gateways

-- First check if paypal_refunds exists, if not create gateway_refunds directly
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'paypal_refunds'
  ) THEN
    -- Step 1: Rename the table
    ALTER TABLE paypal_refunds RENAME TO gateway_refunds;
  ELSE
    -- Create gateway_refunds table if it doesn't exist
    CREATE TABLE IF NOT EXISTS gateway_refunds (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gateway_refund_id TEXT UNIQUE NOT NULL,
      gateway_transaction_id TEXT NOT NULL,
      payment_transaction_id UUID REFERENCES payment_transactions(id),
      quote_id UUID REFERENCES quotes(id),
      user_id UUID REFERENCES profiles(id),
      refund_amount DECIMAL(10,2) NOT NULL,
      original_amount DECIMAL(10,2) NOT NULL,
      currency TEXT NOT NULL,
      refund_type TEXT NOT NULL DEFAULT 'FULL' CHECK (refund_type IN ('FULL', 'PARTIAL')),
      reason_code TEXT,
      reason_description TEXT,
      admin_notes TEXT,
      customer_note TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
      gateway_status TEXT,
      gateway_code TEXT NOT NULL,
      processed_by UUID REFERENCES profiles(id),
      gateway_response JSONB,
      error_details JSONB,
      refund_date TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  END IF;
END $$;

-- Step 2: Rename PayPal-specific columns to be gateway-agnostic (if they exist)
DO $$
BEGIN
  -- Rename refund_id if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gateway_refunds' AND column_name = 'refund_id') THEN
    ALTER TABLE gateway_refunds RENAME COLUMN refund_id TO gateway_refund_id;
  END IF;
  
  -- Rename original_transaction_id if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gateway_refunds' AND column_name = 'original_transaction_id') THEN
    ALTER TABLE gateway_refunds RENAME COLUMN original_transaction_id TO gateway_transaction_id;
  END IF;
  
  -- Rename paypal_status if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gateway_refunds' AND column_name = 'paypal_status') THEN
    ALTER TABLE gateway_refunds RENAME COLUMN paypal_status TO gateway_status;
  END IF;
  
  -- Rename paypal_response if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gateway_refunds' AND column_name = 'paypal_response') THEN
    ALTER TABLE gateway_refunds RENAME COLUMN paypal_response TO gateway_response;
  END IF;
END $$;

-- Step 3: Add gateway identification column
ALTER TABLE gateway_refunds 
  ADD COLUMN IF NOT EXISTS gateway_code TEXT;

-- Update existing records to mark them as PayPal refunds
UPDATE gateway_refunds 
SET gateway_code = 'paypal' 
WHERE gateway_code IS NULL;

-- Add NOT NULL constraint after updating existing records
ALTER TABLE gateway_refunds 
  ALTER COLUMN gateway_code SET NOT NULL;

-- Add check constraint for supported gateways
ALTER TABLE gateway_refunds
  ADD CONSTRAINT gateway_refunds_gateway_code_check 
  CHECK (gateway_code IN ('paypal', 'payu', 'stripe', 'razorpay', 'bank_transfer', 'manual'));

-- Step 4: Update indexes with new names
DROP INDEX IF EXISTS idx_paypal_refunds_refund_id;
DROP INDEX IF EXISTS idx_paypal_refunds_original_transaction;
DROP INDEX IF EXISTS idx_paypal_refunds_payment_transaction;
DROP INDEX IF EXISTS idx_paypal_refunds_quote;
DROP INDEX IF EXISTS idx_paypal_refunds_user;
DROP INDEX IF EXISTS idx_paypal_refunds_status;
DROP INDEX IF EXISTS idx_paypal_refunds_created;

CREATE INDEX idx_gateway_refunds_refund_id ON gateway_refunds(gateway_refund_id);
CREATE INDEX idx_gateway_refunds_transaction ON gateway_refunds(gateway_transaction_id);
CREATE INDEX idx_gateway_refunds_payment_transaction ON gateway_refunds(payment_transaction_id);
CREATE INDEX idx_gateway_refunds_quote ON gateway_refunds(quote_id);
CREATE INDEX idx_gateway_refunds_user ON gateway_refunds(user_id);
CREATE INDEX idx_gateway_refunds_status ON gateway_refunds(status);
CREATE INDEX idx_gateway_refunds_gateway ON gateway_refunds(gateway_code);
CREATE INDEX idx_gateway_refunds_created ON gateway_refunds(created_at DESC);

-- Step 5: Rename the refund reasons table
ALTER TABLE IF EXISTS paypal_refund_reasons RENAME TO gateway_refund_reasons;

-- Add gateway_code to refund reasons to allow gateway-specific reasons
ALTER TABLE gateway_refund_reasons
  ADD COLUMN IF NOT EXISTS gateway_code TEXT;

-- Update existing reasons to be PayPal-specific
UPDATE gateway_refund_reasons
SET gateway_code = 'paypal'
WHERE gateway_code IS NULL;

-- Add some common refund reasons for all gateways
INSERT INTO gateway_refund_reasons (code, description, customer_friendly_description, gateway_code, display_order)
VALUES 
  ('CUSTOMER_REQUEST', 'Customer requested refund', 'Refund requested by customer', NULL, 1),
  ('ORDER_CANCELLED', 'Order cancelled', 'Order was cancelled', NULL, 2),
  ('ITEM_NOT_AS_DESCRIBED', 'Item not as described', 'Product did not match description', NULL, 3),
  ('DAMAGED_PRODUCT', 'Product damaged', 'Product arrived damaged', NULL, 4),
  ('WRONG_ITEM', 'Wrong item sent', 'Incorrect product delivered', NULL, 5),
  ('DUPLICATE_PAYMENT', 'Duplicate payment', 'Payment was made twice', NULL, 6),
  ('PRICING_ERROR', 'Pricing error', 'Incorrect price charged', NULL, 7),
  ('OTHER', 'Other reason', 'Other reason', NULL, 999)
ON CONFLICT (code) DO NOTHING;

-- Step 6: Update triggers and functions
-- Update the trigger function name
ALTER FUNCTION IF EXISTS update_paypal_refunds_updated_at() 
  RENAME TO update_gateway_refunds_updated_at;

-- Recreate the trigger with the new function name
DROP TRIGGER IF EXISTS update_paypal_refunds_updated_at ON gateway_refunds;
CREATE TRIGGER update_gateway_refunds_updated_at
  BEFORE UPDATE ON gateway_refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_gateway_refunds_updated_at();

-- Step 7: Update RLS policies
-- Drop old policies
DROP POLICY IF EXISTS "Users can view own PayPal refunds" ON gateway_refunds;
DROP POLICY IF EXISTS "Admins can view all PayPal refunds" ON gateway_refunds;
DROP POLICY IF EXISTS "Admins can create PayPal refunds" ON gateway_refunds;
DROP POLICY IF EXISTS "Admins can update PayPal refunds" ON gateway_refunds;
DROP POLICY IF EXISTS "Service role has full access to PayPal refunds" ON gateway_refunds;

-- Create new policies with generic names
CREATE POLICY "Users can view own gateway refunds"
  ON gateway_refunds FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Admins can view all gateway refunds"
  ON gateway_refunds FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can create gateway refunds"
  ON gateway_refunds FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update gateway refunds"
  ON gateway_refunds FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Service role has full access to gateway refunds"
  ON gateway_refunds FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 8: Update the payment transaction refund tracking function to work with new table name
CREATE OR REPLACE FUNCTION update_payment_refund_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update the payment transaction with refund totals
    UPDATE payment_transactions
    SET 
      total_refunded = COALESCE((
        SELECT SUM(refund_amount)
        FROM gateway_refunds
        WHERE payment_transaction_id = NEW.payment_transaction_id
        AND status = 'completed'
      ), 0),
      refund_count = COALESCE((
        SELECT COUNT(*)
        FROM gateway_refunds
        WHERE payment_transaction_id = NEW.payment_transaction_id
        AND status = 'completed'
      ), 0),
      is_fully_refunded = COALESCE((
        SELECT SUM(refund_amount) >= payment_transactions.amount
        FROM gateway_refunds
        WHERE payment_transaction_id = NEW.payment_transaction_id
        AND status = 'completed'
        GROUP BY payment_transaction_id
      ), false),
      last_refund_at = CASE
        WHEN NEW.status = 'completed' THEN NEW.completed_at
        ELSE last_refund_at
      END
    WHERE id = NEW.payment_transaction_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger with the new table name
DROP TRIGGER IF EXISTS update_payment_refund_totals_trigger ON gateway_refunds;
CREATE TRIGGER update_payment_refund_totals_trigger
  AFTER INSERT OR UPDATE ON gateway_refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_refund_totals();

-- Step 9: Add a helper view for easy refund querying
CREATE OR REPLACE VIEW gateway_refunds_summary AS
SELECT 
  gr.*,
  pt.payment_method,
  pt.gateway_reference,
  q.display_id as order_id,
  q.product_name,
  q.final_total as order_total,
  p.full_name as customer_name,
  p.email as customer_email,
  admin.full_name as processed_by_name
FROM gateway_refunds gr
LEFT JOIN payment_transactions pt ON gr.payment_transaction_id = pt.id
LEFT JOIN quotes q ON gr.quote_id = q.id
LEFT JOIN profiles p ON gr.user_id = p.id
LEFT JOIN profiles admin ON gr.processed_by = admin.id;

-- Grant appropriate permissions
GRANT SELECT ON gateway_refunds_summary TO authenticated;

-- Add comment to document the table
COMMENT ON TABLE gateway_refunds IS 'Unified refund tracking table for all payment gateways (PayPal, PayU, Stripe, etc.)';
COMMENT ON COLUMN gateway_refunds.gateway_code IS 'Payment gateway identifier: paypal, payu, stripe, razorpay, bank_transfer, manual';
COMMENT ON COLUMN gateway_refunds.gateway_refund_id IS 'Unique refund identifier from the payment gateway';
COMMENT ON COLUMN gateway_refunds.gateway_transaction_id IS 'Original transaction ID from the payment gateway';
COMMENT ON COLUMN gateway_refunds.gateway_response IS 'Complete response data from the payment gateway stored as JSONB';