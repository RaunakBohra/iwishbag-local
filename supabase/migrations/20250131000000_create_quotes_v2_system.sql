-- Create quotes_v2 table with simplified structure
CREATE TABLE IF NOT EXISTS quotes_v2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Customer info
  customer_id UUID REFERENCES auth.users(id),
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  
  -- Quote basics
  quote_number TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  
  -- Countries
  origin_country CHAR(2) NOT NULL,
  destination_country CHAR(2) NOT NULL,
  
  -- Items (simplified)
  items JSONB NOT NULL DEFAULT '[]',
  /* Item structure:
  {
    "id": "uuid",
    "name": "Product name",
    "url": "https://...",
    "quantity": 1,
    "unit_price_usd": 100.00,
    "weight_kg": 0.5,
    "category": "electronics",
    "notes": "Special instructions"
  }
  */
  
  -- Calculation inputs
  shipping_method TEXT,
  insurance_required BOOLEAN DEFAULT true,
  
  -- Calculation data (new structure)
  calculation_data JSONB,
  /* Structure:
  {
    "inputs": {
      "items_cost": 100,
      "total_weight_kg": 0.5,
      "origin_country": "US",
      "destination_country": "NP",
      "shipping_method": "standard"
    },
    "applied_rates": {
      "exchange_rate": 133.5,
      "customs_percentage": 15,
      "vat_percentage": 13,
      "local_tax_percentage": 0,
      "insurance_percentage": 1,
      "shipping_rate_per_kg": 25
    },
    "calculation_steps": {
      "items_subtotal": 100,
      "shipping_cost": 25,
      "insurance_amount": 1.25,
      "cif_value": 126.25,
      "customs_duty": 18.94,
      "taxable_value": 145.19,
      "local_taxes": 0,
      "vat_amount": 18.87,
      "total_usd": 164.06,
      "total_customer_currency": 21901.01
    },
    "calculation_timestamp": "2025-01-31T10:00:00Z",
    "calculation_version": "v2"
  }
  */
  
  -- Final amounts (for quick access)
  total_usd DECIMAL(10, 2),
  total_customer_currency DECIMAL(10, 2),
  customer_currency CHAR(3) DEFAULT 'USD',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  calculated_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  
  -- Notes
  admin_notes TEXT,
  customer_notes TEXT
);

-- Create indexes
CREATE INDEX idx_quotes_v2_customer_id ON quotes_v2(customer_id);
CREATE INDEX idx_quotes_v2_status ON quotes_v2(status);
CREATE INDEX idx_quotes_v2_created_at ON quotes_v2(created_at DESC);
CREATE INDEX idx_quotes_v2_quote_number ON quotes_v2(quote_number);

-- Create updated_at trigger
CREATE TRIGGER update_quotes_v2_updated_at
  BEFORE UPDATE ON quotes_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create quote_items_v2 table (optional, for better structure)
CREATE TABLE IF NOT EXISTS quote_items_v2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES quotes_v2(id) ON DELETE CASCADE,
  
  -- Item details
  name TEXT NOT NULL,
  url TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_usd DECIMAL(10, 2) NOT NULL,
  weight_kg DECIMAL(10, 3),
  category TEXT,
  
  -- Calculated values
  subtotal_usd DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price_usd) STORED,
  total_weight_kg DECIMAL(10, 3) GENERATED ALWAYS AS (quantity * COALESCE(weight_kg, 0)) STORED,
  
  -- Additional info
  notes TEXT,
  image_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_quote_items_v2_quote_id ON quote_items_v2(quote_id);

-- Create updated_at trigger for items
CREATE TRIGGER update_quote_items_v2_updated_at
  BEFORE UPDATE ON quote_items_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE quotes_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items_v2 ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin full access to quotes_v2" ON quotes_v2
  FOR ALL
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin full access to quote_items_v2" ON quote_items_v2
  FOR ALL
  TO authenticated
  USING (is_admin());

-- Customers can view their own quotes
CREATE POLICY "Customers can view own quotes_v2" ON quotes_v2
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can view own quote_items_v2" ON quote_items_v2
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes_v2 
      WHERE quotes_v2.id = quote_items_v2.quote_id 
      AND quotes_v2.customer_id = auth.uid()
    )
  );

-- Function to generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number_v2()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  year_prefix TEXT;
  sequence_num INTEGER;
BEGIN
  year_prefix := 'Q' || TO_CHAR(NOW(), 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 4) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM quotes_v2
  WHERE quote_number LIKE year_prefix || '%';
  
  new_number := year_prefix || LPAD(sequence_num::TEXT, 5, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON quotes_v2 TO authenticated;
GRANT ALL ON quote_items_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION generate_quote_number_v2() TO authenticated;