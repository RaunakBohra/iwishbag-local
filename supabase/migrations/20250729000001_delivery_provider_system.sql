-- Multi-Provider Delivery System Architecture

-- Provider configuration table
CREATE TABLE IF NOT EXISTS delivery_provider_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE, -- NCM, DELHIVERY, FEDEX, etc.
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL, -- courier, postal, freight
  
  -- Encrypted credentials
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb, -- API keys, secrets, etc.
  
  -- Provider settings
  settings JSONB NOT NULL DEFAULT '{
    "enabled": true,
    "testMode": false,
    "baseUrl": null,
    "webhookSecret": null,
    "rateMultiplier": 1.0
  }'::jsonb,
  
  -- Supported countries
  supported_countries TEXT[] NOT NULL DEFAULT '{}',
  
  -- Provider capabilities
  capabilities JSONB NOT NULL DEFAULT '{
    "realTimeTracking": false,
    "proofOfDelivery": false,
    "cashOnDelivery": false,
    "insurance": false,
    "reversePickup": false,
    "labelGeneration": false,
    "pickupScheduling": false,
    "webhooks": false,
    "multiPiece": false
  }'::jsonb,
  
  -- Country-specific overrides
  country_overrides JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100, -- Lower number = higher priority
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unified delivery orders table
CREATE TABLE IF NOT EXISTS delivery_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Provider information
  provider_code TEXT NOT NULL,
  provider_order_id TEXT,
  tracking_number TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  events JSONB DEFAULT '[]'::jsonb,
  
  -- Addresses
  from_address JSONB NOT NULL,
  to_address JSONB NOT NULL,
  
  -- Shipment details
  shipment_data JSONB NOT NULL, -- Original request data
  provider_response JSONB, -- Provider's response
  
  -- Delivery info
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  actual_delivery TIMESTAMP WITH TIME ZONE,
  proof JSONB, -- Signature, photo, etc.
  
  -- Costs
  delivery_charge DECIMAL(10, 2),
  cod_amount DECIMAL(10, 2),
  insurance_amount DECIMAL(10, 2),
  total_charge DECIMAL(10, 2),
  currency TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Provider webhooks table
CREATE TABLE IF NOT EXISTS delivery_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_code TEXT NOT NULL,
  webhook_id TEXT, -- Provider's webhook ID
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Rate cache table (to avoid excessive API calls)
CREATE TABLE IF NOT EXISTS delivery_rate_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_code TEXT NOT NULL,
  cache_key TEXT NOT NULL, -- Hash of from+to+weight
  from_postal TEXT NOT NULL,
  to_postal TEXT NOT NULL,
  weight DECIMAL(10, 3),
  rates JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Provider performance metrics
CREATE TABLE IF NOT EXISTS delivery_provider_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_code TEXT NOT NULL,
  country TEXT NOT NULL,
  metric_date DATE NOT NULL,
  
  -- Performance metrics
  total_shipments INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  average_delivery_days DECIMAL(5, 2),
  on_time_percentage DECIMAL(5, 2),
  
  -- Cost metrics
  average_cost DECIMAL(10, 2),
  total_revenue DECIMAL(12, 2),
  
  -- Service metrics
  api_success_rate DECIMAL(5, 2),
  average_api_response_time INTEGER, -- milliseconds
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider_code, country, metric_date)
);

-- Create indexes
CREATE INDEX idx_delivery_orders_order_id ON delivery_orders(order_id);
CREATE INDEX idx_delivery_orders_tracking ON delivery_orders(tracking_number);
CREATE INDEX idx_delivery_orders_provider ON delivery_orders(provider_code, provider_order_id);
CREATE INDEX idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX idx_delivery_webhooks_provider ON delivery_webhooks(provider_code, processed);
CREATE INDEX idx_delivery_rate_cache_lookup ON delivery_rate_cache(provider_code, cache_key, expires_at);
CREATE INDEX idx_delivery_metrics_lookup ON delivery_provider_metrics(provider_code, country, metric_date);

-- Triggers
CREATE TRIGGER update_delivery_provider_configs_updated_at
  BEFORE UPDATE ON delivery_provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_orders_updated_at
  BEFORE UPDATE ON delivery_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE delivery_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_rate_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_provider_metrics ENABLE ROW LEVEL SECURITY;

-- Provider configs - admin only
CREATE POLICY "Only admins can manage provider configs"
  ON delivery_provider_configs FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Delivery orders - follow order access
CREATE POLICY "Delivery orders follow order access"
  ON delivery_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = delivery_orders.order_id
      AND (orders.customer_id = auth.uid() OR is_admin())
    )
  );

-- Webhooks - admin only
CREATE POLICY "Only admins can access webhooks"
  ON delivery_webhooks FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Rate cache - public read, admin write
CREATE POLICY "Anyone can read rate cache"
  ON delivery_rate_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can write rate cache"
  ON delivery_rate_cache FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Metrics - public read
CREATE POLICY "Anyone can read provider metrics"
  ON delivery_provider_metrics FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial provider configurations
INSERT INTO delivery_provider_configs (code, name, provider_type, supported_countries, credentials, settings, capabilities)
VALUES 
  ('NCM', 'Nepal Can Move', 'courier', ARRAY['NP'], 
   '{"api_token": "encrypted_token_here", "email": "encrypted_email_here"}'::jsonb,
   '{"enabled": true, "testMode": true, "baseUrl": "https://demo.nepalcanmove.com"}'::jsonb,
   '{
     "realTimeTracking": true,
     "cashOnDelivery": true,
     "pickupScheduling": true
   }'::jsonb
  ),
  ('DELHIVERY', 'Delhivery', 'courier', ARRAY['IN'],
   '{"api_token": "encrypted_token_here", "client_name": "encrypted_client_here"}'::jsonb,
   '{"enabled": false, "testMode": true, "baseUrl": "https://staging-express.delhivery.com"}'::jsonb,
   '{
     "realTimeTracking": true,
     "cashOnDelivery": true,
     "insurance": true,
     "reversePickup": true,
     "labelGeneration": true,
     "pickupScheduling": true,
     "webhooks": true
   }'::jsonb
  ),
  ('FEDEX', 'FedEx', 'courier', ARRAY['US', 'CA', 'MX', 'GB', 'DE', 'FR', 'JP', 'AU'],
   '{"client_id": "encrypted_id", "client_secret": "encrypted_secret", "account_number": "encrypted_account"}'::jsonb,
   '{"enabled": false, "testMode": true, "baseUrl": "https://apis-sandbox.fedex.com"}'::jsonb,
   '{
     "realTimeTracking": true,
     "proofOfDelivery": true,
     "insurance": true,
     "labelGeneration": true,
     "pickupScheduling": true,
     "webhooks": true,
     "multiPiece": true
   }'::jsonb
  )
ON CONFLICT (code) DO UPDATE SET
  updated_at = CURRENT_TIMESTAMP;

-- Function to select best provider for a shipment
CREATE OR REPLACE FUNCTION select_delivery_provider(
  p_from_country TEXT,
  p_to_country TEXT,
  p_weight DECIMAL,
  p_requires_cod BOOLEAN DEFAULT false,
  p_preferred_provider TEXT DEFAULT NULL
)
RETURNS TABLE (
  provider_code TEXT,
  provider_name TEXT,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dpc.code,
    dpc.name,
    dpc.priority
  FROM delivery_provider_configs dpc
  WHERE 
    dpc.is_active = true
    AND dpc.settings->>'enabled' = 'true'
    AND p_to_country = ANY(dpc.supported_countries)
    AND (NOT p_requires_cod OR dpc.capabilities->>'cashOnDelivery' = 'true')
    AND (p_preferred_provider IS NULL OR dpc.code = p_preferred_provider)
  ORDER BY 
    CASE WHEN dpc.code = p_preferred_provider THEN 0 ELSE 1 END,
    dpc.priority,
    dpc.name;
END;
$$ LANGUAGE plpgsql;