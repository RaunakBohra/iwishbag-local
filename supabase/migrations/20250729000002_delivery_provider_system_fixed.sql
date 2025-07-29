-- Multi-Provider Delivery System Architecture (Fixed for quotes table)

-- Unified delivery orders table
CREATE TABLE IF NOT EXISTS delivery_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  
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

-- Create indexes
CREATE INDEX idx_delivery_orders_quote_id ON delivery_orders(quote_id);
CREATE INDEX idx_delivery_orders_tracking ON delivery_orders(tracking_number);
CREATE INDEX idx_delivery_orders_provider ON delivery_orders(provider_code, provider_order_id);
CREATE INDEX idx_delivery_orders_status ON delivery_orders(status);

-- Triggers
CREATE TRIGGER update_delivery_orders_updated_at
  BEFORE UPDATE ON delivery_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;

-- Delivery orders - follow quote access
CREATE POLICY "Delivery orders follow quote access"
  ON delivery_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = delivery_orders.quote_id
      AND (quotes.customer_id = auth.uid() OR is_admin())
    )
  );

-- Add delivery provider fields to quotes table
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS delivery_provider TEXT,
ADD COLUMN IF NOT EXISTS delivery_tracking_number TEXT,
ADD COLUMN IF NOT EXISTS delivery_provider_order_id TEXT,
ADD COLUMN IF NOT EXISTS delivery_estimated_date DATE,
ADD COLUMN IF NOT EXISTS delivery_actual_date DATE;

-- NCM specific fields for Nepal deliveries
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS ncm_from_branch TEXT,
ADD COLUMN IF NOT EXISTS ncm_to_branch TEXT,
ADD COLUMN IF NOT EXISTS ncm_delivery_instruction TEXT;

-- Function to update quote status when delivery status changes
CREATE OR REPLACE FUNCTION sync_delivery_status_to_quote()
RETURNS TRIGGER AS $$
BEGIN
  -- Map delivery status to quote status
  UPDATE quotes
  SET status = CASE NEW.status
    WHEN 'delivered' THEN 'delivered'
    WHEN 'in_transit' THEN 'in_transit'
    WHEN 'out_for_delivery' THEN 'in_transit'
    WHEN 'picked_up' THEN 'shipped'
    WHEN 'pickup_scheduled' THEN 'preparing'
    WHEN 'returned' THEN 'returned'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'failed' THEN 'failed'
    ELSE quotes.status
  END,
  delivery_actual_date = CASE 
    WHEN NEW.status = 'delivered' THEN NEW.actual_delivery::DATE
    ELSE delivery_actual_date
  END,
  updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.quote_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_delivery_status_trigger
  AFTER INSERT OR UPDATE OF status ON delivery_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.* IS NULL)
  EXECUTE FUNCTION sync_delivery_status_to_quote();