-- Add payment tracking fields to quotes table
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS amount_paid decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS overpayment_amount decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_notes text;

-- Add constraint for payment_status
ALTER TABLE quotes
ADD CONSTRAINT valid_payment_status CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overpaid'));

-- Create payment_records table for tracking individual payments
CREATE TABLE IF NOT EXISTS payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  payment_method text,
  reference_number text,
  notes text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_records_quote_id ON payment_records(quote_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_created_at ON payment_records(created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_payment_status ON quotes(payment_status);

-- RLS policies for payment_records
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- Admin can view all payment records
CREATE POLICY "Admin can view all payment records" ON payment_records
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can create payment records
CREATE POLICY "Admin can create payment records" ON payment_records
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Customers can view their own payment records
CREATE POLICY "Customers can view own payment records" ON payment_records
  FOR SELECT
  TO authenticated
  USING (
    quote_id IN (
      SELECT id FROM quotes
      WHERE quotes.user_id = auth.uid()
    )
  );

-- Update function to automatically calculate payment_status
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total paid from payment_records
  NEW.amount_paid := COALESCE((
    SELECT SUM(amount)
    FROM payment_records
    WHERE quote_id = NEW.id
  ), 0);
  
  -- Determine payment status
  IF NEW.amount_paid = 0 THEN
    NEW.payment_status := 'unpaid';
  ELSIF NEW.amount_paid < NEW.final_total THEN
    NEW.payment_status := 'partial';
  ELSIF NEW.amount_paid = NEW.final_total THEN
    NEW.payment_status := 'paid';
  ELSE
    NEW.payment_status := 'overpaid';
    NEW.overpayment_amount := NEW.amount_paid - NEW.final_total;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update payment status when payment records change
CREATE OR REPLACE FUNCTION trigger_update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the related quote's payment status
  UPDATE quotes
  SET updated_at = now()
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_status_on_payment_record
AFTER INSERT OR UPDATE OR DELETE ON payment_records
FOR EACH ROW
EXECUTE FUNCTION trigger_update_payment_status();

-- Add trigger to update payment_status when amount_paid changes
CREATE TRIGGER update_payment_status_on_quote
BEFORE UPDATE OF amount_paid ON quotes
FOR EACH ROW
EXECUTE FUNCTION update_payment_status();

-- Grant permissions
GRANT ALL ON payment_records TO authenticated;
GRANT ALL ON payment_records TO service_role;