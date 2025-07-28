-- Add supplier pickup support to package returns
-- ================================================

-- Add new columns to package_returns table
ALTER TABLE package_returns
ADD COLUMN IF NOT EXISTS return_method VARCHAR(50) DEFAULT 'customer_ship',
ADD COLUMN IF NOT EXISTS pickup_scheduled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pickup_date DATE,
ADD COLUMN IF NOT EXISTS pickup_time_slot VARCHAR(50),
ADD COLUMN IF NOT EXISTS pickup_address JSONB,
ADD COLUMN IF NOT EXISTS pickup_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS pickup_contact_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS pickup_instructions TEXT,
ADD COLUMN IF NOT EXISTS pickup_confirmation_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS pickup_completed_at TIMESTAMPTZ;

-- Add check constraint for return methods
ALTER TABLE package_returns
DROP CONSTRAINT IF EXISTS package_returns_return_method_check;

ALTER TABLE package_returns
ADD CONSTRAINT package_returns_return_method_check 
CHECK (return_method IN ('customer_ship', 'supplier_pickup', 'drop_off'));

-- Create pickup time slots table
CREATE TABLE IF NOT EXISTS pickup_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pickup time slots
INSERT INTO pickup_time_slots (slot_name, start_time, end_time) VALUES
  ('Morning (9 AM - 12 PM)', '09:00:00', '12:00:00'),
  ('Afternoon (12 PM - 3 PM)', '12:00:00', '15:00:00'),
  ('Late Afternoon (3 PM - 6 PM)', '15:00:00', '18:00:00'),
  ('Evening (6 PM - 8 PM)', '18:00:00', '20:00:00')
ON CONFLICT DO NOTHING;

-- Create supplier pickup requests table
CREATE TABLE IF NOT EXISTS supplier_pickup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_return_id UUID NOT NULL REFERENCES package_returns(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES profiles(id),
  supplier_name VARCHAR(255),
  pickup_date DATE NOT NULL,
  pickup_time_slot VARCHAR(50) NOT NULL,
  pickup_address JSONB NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50) NOT NULL,
  special_instructions TEXT,
  status VARCHAR(50) DEFAULT 'scheduled',
  confirmation_number VARCHAR(100),
  scheduled_by UUID REFERENCES profiles(id),
  completed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT supplier_pickup_status_check 
  CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_package_returns_return_method ON package_returns(return_method);
CREATE INDEX IF NOT EXISTS idx_package_returns_pickup_date ON package_returns(pickup_date);
CREATE INDEX IF NOT EXISTS idx_supplier_pickup_requests_status ON supplier_pickup_requests(status);
CREATE INDEX IF NOT EXISTS idx_supplier_pickup_requests_pickup_date ON supplier_pickup_requests(pickup_date);

-- Update RLS policies
ALTER TABLE pickup_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_pickup_requests ENABLE ROW LEVEL SECURITY;

-- Pickup time slots policies (read-only for all authenticated users)
CREATE POLICY "Anyone can view pickup time slots"
  ON pickup_time_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage pickup time slots"
  ON pickup_time_slots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'moderator')
    )
  );

-- Supplier pickup requests policies
CREATE POLICY "Users can view their own pickup requests"
  ON supplier_pickup_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM package_returns pr
      WHERE pr.id = supplier_pickup_requests.package_return_id
      AND pr.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Only admins can create/update pickup requests"
  ON supplier_pickup_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Only admins can update pickup requests"
  ON supplier_pickup_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'moderator')
    )
  );

-- Function to schedule supplier pickup
CREATE OR REPLACE FUNCTION schedule_supplier_pickup(
  p_return_id UUID,
  p_pickup_date DATE,
  p_pickup_time_slot VARCHAR,
  p_pickup_address JSONB,
  p_contact_name VARCHAR,
  p_contact_phone VARCHAR,
  p_supplier_name VARCHAR DEFAULT NULL,
  p_instructions TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_confirmation_number VARCHAR;
  v_pickup_request_id UUID;
BEGIN
  -- Generate confirmation number
  v_confirmation_number := 'SPU-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || 
                          LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  
  -- Update package return
  UPDATE package_returns
  SET 
    return_method = 'supplier_pickup',
    pickup_scheduled = TRUE,
    pickup_date = p_pickup_date,
    pickup_time_slot = p_pickup_time_slot,
    pickup_address = p_pickup_address,
    pickup_contact_name = p_contact_name,
    pickup_contact_phone = p_contact_phone,
    pickup_instructions = p_instructions,
    pickup_confirmation_number = v_confirmation_number,
    status = CASE 
      WHEN status = 'approved' THEN 'pickup_scheduled'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_return_id;
  
  -- Create pickup request record
  INSERT INTO supplier_pickup_requests (
    package_return_id,
    supplier_name,
    pickup_date,
    pickup_time_slot,
    pickup_address,
    contact_name,
    contact_phone,
    special_instructions,
    confirmation_number,
    scheduled_by
  ) VALUES (
    p_return_id,
    p_supplier_name,
    p_pickup_date,
    p_pickup_time_slot,
    p_pickup_address,
    p_contact_name,
    p_contact_phone,
    p_instructions,
    v_confirmation_number,
    auth.uid()
  ) RETURNING id INTO v_pickup_request_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'confirmation_number', v_confirmation_number,
    'pickup_request_id', v_pickup_request_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete supplier pickup
CREATE OR REPLACE FUNCTION complete_supplier_pickup(
  p_return_id UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
BEGIN
  -- Update package return
  UPDATE package_returns
  SET 
    status = 'received',
    received_at = NOW(),
    pickup_completed_at = NOW(),
    admin_notes = COALESCE(admin_notes || E'\n', '') || 
                  'Pickup completed at ' || NOW()::TEXT || 
                  COALESCE('. Notes: ' || p_notes, ''),
    updated_at = NOW()
  WHERE id = p_return_id
  AND return_method = 'supplier_pickup';
  
  -- Update pickup request
  UPDATE supplier_pickup_requests
  SET 
    status = 'completed',
    completed_by = auth.uid(),
    completed_at = NOW(),
    updated_at = NOW()
  WHERE package_return_id = p_return_id
  AND status IN ('scheduled', 'confirmed', 'in_progress');
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Pickup marked as completed'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update return status enum to include pickup states
COMMENT ON COLUMN package_returns.status IS 'Status can be: pending, approved, rejected, pickup_scheduled, label_sent, in_transit, received, inspecting, completed';