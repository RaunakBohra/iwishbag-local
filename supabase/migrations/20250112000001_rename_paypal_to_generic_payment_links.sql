-- Migration to convert paypal_payment_links to a generic payment_links table for all gateways

-- Step 1: Rename the table (only if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'paypal_payment_links') THEN
    ALTER TABLE paypal_payment_links RENAME TO payment_links;
  END IF;
END $$;

-- Step 2: Create payment_links table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed', 'used', 'cancelled')),
  current_uses INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 1,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id),
  user_id UUID REFERENCES profiles(id),
  quote_id UUID REFERENCES quotes(id),
  gateway_response JSONB
);

-- Step 3: Add new columns for multi-gateway support (only if they don't exist)
ALTER TABLE payment_links 
  ADD COLUMN IF NOT EXISTS gateway TEXT DEFAULT 'paypal',
  ADD COLUMN IF NOT EXISTS gateway_link_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_url TEXT,
  ADD COLUMN IF NOT EXISTS gateway_request JSONB,
  ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS original_currency TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Step 4: Migrate existing PayPal data (only if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payment_links' AND column_name = 'paypal_link_id') THEN
    UPDATE payment_links 
    SET 
      gateway = 'paypal',
      gateway_link_id = paypal_link_id,
      gateway_request = paypal_response,
      payment_url = CASE 
        WHEN paypal_response->>'href' IS NOT NULL THEN paypal_response->>'href'
        ELSE NULL
      END
    WHERE gateway IS NULL;
  END IF;
END $$;

-- Step 5: Rename paypal-specific columns to be more generic (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payment_links' AND column_name = 'paypal_response') THEN
    ALTER TABLE payment_links RENAME COLUMN paypal_response TO gateway_response;
  END IF;
END $$;

-- Step 6: Drop the old paypal_link_id column as it's now in gateway_link_id
ALTER TABLE payment_links 
  DROP COLUMN IF EXISTS paypal_link_id;

-- Step 7: Update the status check constraint to be more generic
ALTER TABLE payment_links 
  DROP CONSTRAINT IF EXISTS paypal_payment_links_status_check;

ALTER TABLE payment_links 
  DROP CONSTRAINT IF EXISTS payment_links_status_check;

ALTER TABLE payment_links 
  ADD CONSTRAINT payment_links_status_check 
  CHECK (status IN ('active', 'expired', 'completed', 'used', 'cancelled'));

-- Step 8: Add gateway constraint
ALTER TABLE payment_links 
  ADD CONSTRAINT payment_links_gateway_check 
  CHECK (gateway IN ('paypal', 'payu', 'stripe', 'esewa', 'khalti', 'fonepay', 'airwallex'));

-- Step 9: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_links_gateway ON payment_links(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_links_gateway_link_id ON payment_links(gateway_link_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_quote_id ON payment_links(quote_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_user_id ON payment_links(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON payment_links(status);
CREATE INDEX IF NOT EXISTS idx_payment_links_link_code ON payment_links(link_code);
CREATE INDEX IF NOT EXISTS idx_payment_links_expires_at ON payment_links(expires_at);

-- Step 10: Update the table comment
COMMENT ON TABLE payment_links IS 'Multi-gateway payment links for quotes and custom payments';

-- Step 11: Add column comments
COMMENT ON COLUMN payment_links.gateway IS 'Payment gateway identifier (paypal, payu, stripe, etc.)';
COMMENT ON COLUMN payment_links.gateway_link_id IS 'Gateway-specific payment link ID';
COMMENT ON COLUMN payment_links.payment_url IS 'The actual payment URL to redirect users to';
COMMENT ON COLUMN payment_links.gateway_request IS 'Request data sent to the payment gateway';
COMMENT ON COLUMN payment_links.gateway_response IS 'Response data received from the payment gateway';
COMMENT ON COLUMN payment_links.original_amount IS 'Original amount in the source currency before conversion';
COMMENT ON COLUMN payment_links.original_currency IS 'Original currency code before conversion';

-- Step 12: Update RLS policies to be more generic
DROP POLICY IF EXISTS "Users can view their PayPal payment links" ON payment_links;
DROP POLICY IF EXISTS "Admins can manage PayPal payment links" ON payment_links;
DROP POLICY IF EXISTS "Service role has full access to PayPal payment links" ON payment_links;

-- Create new generic policies
CREATE POLICY "Users can view their payment links" ON payment_links
  FOR SELECT USING (
    user_id = auth.uid() OR
    quote_id IN (SELECT id FROM quotes WHERE user_id = auth.uid()) OR
    is_public = true
  );

CREATE POLICY "Admins can manage payment links" ON payment_links
  FOR ALL USING (is_admin());

CREATE POLICY "Service role has full access to payment links" ON payment_links
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can use public payment links" ON payment_links
  FOR UPDATE USING (is_public = true)
  WITH CHECK (is_public = true);

-- Step 13: Update any views that reference the old table name
DROP VIEW IF EXISTS paypal_payment_links_summary;

CREATE OR REPLACE VIEW payment_links_summary AS
SELECT 
  id,
  gateway,
  link_code,
  title,
  amount,
  currency,
  status,
  current_uses,
  max_uses,
  created_at,
  expires_at,
  CASE 
    WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 'expired'
    WHEN current_uses >= max_uses THEN 'exhausted'
    ELSE status
  END AS effective_status,
  created_by,
  user_id,
  quote_id
FROM payment_links;

-- Step 14: Grant permissions
GRANT SELECT ON payment_links_summary TO authenticated;

-- Step 15: Create a function to generate unique link codes
CREATE OR REPLACE FUNCTION generate_payment_link_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate an 8-character code
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  -- Check if code already exists
  IF EXISTS (SELECT 1 FROM payment_links WHERE link_code = result) THEN
    -- Recursive call to generate a new code
    RETURN generate_payment_link_code();
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 16: Set default for link_code if not already set
ALTER TABLE payment_links 
  ALTER COLUMN link_code SET DEFAULT generate_payment_link_code();

-- Step 17: Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payment_links_updated_at_trigger ON payment_links;

CREATE TRIGGER update_payment_links_updated_at_trigger
  BEFORE UPDATE ON payment_links
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_links_updated_at();