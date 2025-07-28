-- Package Forwarding System - Complete Database Schema
-- Transforms iwishBag into package forwarding service like MyUS
-- Date: 2025-01-28

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- VIRTUAL ADDRESS SYSTEM
-- ============================================================================

-- Customer virtual addresses (IWB12345 format)
CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  suite_number TEXT UNIQUE NOT NULL, -- IWB12345
  full_address TEXT NOT NULL, -- Complete warehouse address
  address_type TEXT DEFAULT 'standard' CHECK (address_type IN ('standard', 'premium')),
  assigned_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suite number sequence for auto-generation
CREATE SEQUENCE suite_number_seq START 10000;

-- ============================================================================
-- PACKAGE RECEIVING SYSTEM
-- ============================================================================

-- Received packages at warehouse
CREATE TABLE received_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_address_id UUID REFERENCES customer_addresses(id) NOT NULL,
  
  -- Package identification
  tracking_number TEXT,
  carrier TEXT CHECK (carrier IN ('ups', 'fedex', 'usps', 'dhl', 'amazon', 'other')),
  
  -- Sender information
  sender_name TEXT,
  sender_store TEXT, -- 'amazon', 'ebay', 'target', etc.
  sender_address JSONB,
  
  -- Package details
  received_date TIMESTAMPTZ DEFAULT NOW(),
  weight_kg DECIMAL(10,3) NOT NULL,
  dimensions JSONB NOT NULL, -- {length: 30, width: 20, height: 15, unit: 'cm'}
  dimensional_weight_kg DECIMAL(10,3), -- Calculated dimensional weight
  
  -- Content information
  declared_value_usd DECIMAL(10,2),
  package_description TEXT,
  contents_list JSONB DEFAULT '[]', -- Array of items if customer provides
  
  -- Photos and documentation
  photos JSONB DEFAULT '[]', -- Array of photo URLs
  condition_notes TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'received' CHECK (status IN (
    'received', 'processing', 'ready_to_ship', 
    'consolidated', 'shipped', 'delivered', 'issue'
  )),
  
  -- Storage information
  storage_location TEXT, -- A47, B23, etc.
  storage_start_date TIMESTAMPTZ DEFAULT NOW(),
  storage_fee_exempt_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Consolidation tracking
  consolidation_group_id UUID,
  
  -- Staff and audit
  received_by_staff_id UUID REFERENCES auth.users(id),
  last_scanned_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CONSOLIDATION SYSTEM
-- ============================================================================

-- Consolidation groups for multiple packages
CREATE TABLE consolidation_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Group details
  group_name TEXT, -- Customer can name it "Electronics Order"
  package_count INTEGER DEFAULT 0,
  
  -- Original package references
  original_package_ids UUID[] DEFAULT '{}',
  
  -- Consolidated package details
  consolidated_weight_kg DECIMAL(10,3),
  consolidated_dimensions JSONB,
  consolidated_photos JSONB DEFAULT '[]',
  
  -- Pricing
  consolidation_fee_usd DECIMAL(10,2) DEFAULT 0,
  storage_fees_usd DECIMAL(10,2) DEFAULT 0,
  service_fee_usd DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'consolidated', 'shipped', 'delivered'
  )),
  
  -- Shipping integration
  quote_id UUID REFERENCES quotes(id), -- Links to existing quote system
  
  -- Staff tracking
  consolidated_by_staff_id UUID REFERENCES auth.users(id),
  consolidation_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PHOTO MANAGEMENT SYSTEM
-- ============================================================================

-- Package photos with metadata
CREATE TABLE package_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES received_packages(id) ON DELETE CASCADE,
  consolidation_group_id UUID REFERENCES consolidation_groups(id) ON DELETE CASCADE,
  
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN (
    'package_front', 'package_back', 'package_label', 
    'contents', 'consolidation_before', 'consolidation_after'
  )),
  caption TEXT,
  
  -- Photo metadata
  file_size_bytes BIGINT,
  dimensions JSONB, -- {width: 1920, height: 1080}
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STORAGE FEE SYSTEM
-- ============================================================================

-- Storage fees tracking (after 30-day free period)
CREATE TABLE storage_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES received_packages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Fee calculation
  start_date DATE NOT NULL,
  end_date DATE,
  days_stored INTEGER,
  daily_rate_usd DECIMAL(5,2) DEFAULT 1.00,
  total_fee_usd DECIMAL(10,2),
  
  -- Payment tracking
  is_paid BOOLEAN DEFAULT false,
  payment_date TIMESTAMPTZ,
  quote_id UUID REFERENCES quotes(id), -- If included in shipping quote
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- WAREHOUSE MANAGEMENT SYSTEM
-- ============================================================================

-- Physical warehouse locations
CREATE TABLE warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_code TEXT UNIQUE NOT NULL, -- A47, B23, etc.
  zone TEXT NOT NULL, -- A, B, C
  shelf_number INTEGER,
  slot_number INTEGER,
  
  -- Capacity
  max_packages INTEGER DEFAULT 5,
  current_packages INTEGER DEFAULT 0,
  
  -- Physical details
  max_weight_kg DECIMAL(8,2) DEFAULT 50.0,
  max_dimensions JSONB, -- {length: 60, width: 40, height: 40}
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  maintenance_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warehouse tasks for staff workflow
CREATE TABLE warehouse_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL CHECK (task_type IN ('receiving', 'consolidation', 'shipping', 'audit')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  description TEXT NOT NULL,
  instructions TEXT,
  
  -- Associated data
  package_ids UUID[] DEFAULT '{}',
  consolidation_group_id UUID REFERENCES consolidation_groups(id),
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  due_date TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUDIT AND EVENTS SYSTEM
-- ============================================================================

-- Package events (comprehensive audit trail)
CREATE TABLE package_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES received_packages(id) ON DELETE CASCADE,
  consolidation_group_id UUID REFERENCES consolidation_groups(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL, -- 'received', 'photo_taken', 'moved', 'consolidated', 'shipped'
  event_description TEXT,
  event_data JSONB DEFAULT '{}',
  
  -- Staff tracking
  staff_id UUID REFERENCES auth.users(id),
  staff_notes TEXT,
  
  -- Location tracking
  from_location TEXT,
  to_location TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATION SYSTEM
-- ============================================================================

-- Customer notifications queue
CREATE TABLE package_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  package_id UUID REFERENCES received_packages(id) ON DELETE CASCADE,
  
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'package_received', 'photo_ready', 'storage_warning', 
    'consolidation_ready', 'shipped', 'delivered'
  )),
  
  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  
  -- Delivery tracking
  sent_at TIMESTAMPTZ,
  delivery_method TEXT[] DEFAULT '{}', -- ['email', 'sms', 'push']
  is_read BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Virtual addresses
CREATE INDEX idx_customer_addresses_user_id ON customer_addresses(user_id);
CREATE INDEX idx_customer_addresses_suite_number ON customer_addresses(suite_number);
CREATE INDEX idx_customer_addresses_status ON customer_addresses(status);

-- Received packages
CREATE INDEX idx_received_packages_customer ON received_packages(customer_address_id);
CREATE INDEX idx_received_packages_status ON received_packages(status);
CREATE INDEX idx_received_packages_storage_location ON received_packages(storage_location);
CREATE INDEX idx_received_packages_received_date ON received_packages(received_date);
CREATE INDEX idx_received_packages_consolidation_group ON received_packages(consolidation_group_id);

-- Consolidation groups
CREATE INDEX idx_consolidation_groups_user ON consolidation_groups(user_id);
CREATE INDEX idx_consolidation_groups_status ON consolidation_groups(status);
CREATE INDEX idx_consolidation_groups_quote ON consolidation_groups(quote_id);

-- Package events
CREATE INDEX idx_package_events_package ON package_events(package_id);
CREATE INDEX idx_package_events_consolidation ON package_events(consolidation_group_id);
CREATE INDEX idx_package_events_type ON package_events(event_type);
CREATE INDEX idx_package_events_created_at ON package_events(created_at);

-- Storage fees
CREATE INDEX idx_storage_fees_package ON storage_fees(package_id);
CREATE INDEX idx_storage_fees_user ON storage_fees(user_id);
CREATE INDEX idx_storage_fees_is_paid ON storage_fees(is_paid);

-- Package notifications
CREATE INDEX idx_package_notifications_user ON package_notifications(user_id);
CREATE INDEX idx_package_notifications_package ON package_notifications(package_id);
CREATE INDEX idx_package_notifications_type ON package_notifications(notification_type);
CREATE INDEX idx_package_notifications_is_read ON package_notifications(is_read);

-- Warehouse tasks
CREATE INDEX idx_warehouse_tasks_assigned_to ON warehouse_tasks(assigned_to);
CREATE INDEX idx_warehouse_tasks_status ON warehouse_tasks(status);
CREATE INDEX idx_warehouse_tasks_priority ON warehouse_tasks(priority);
CREATE INDEX idx_warehouse_tasks_due_date ON warehouse_tasks(due_date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE received_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE consolidation_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_notifications ENABLE ROW LEVEL SECURITY;

-- Customer addresses - users can only see their own
CREATE POLICY "Users can view own addresses" ON customer_addresses
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can update own addresses" ON customer_addresses
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "System can insert addresses" ON customer_addresses
  FOR INSERT WITH CHECK (is_authenticated());

-- Received packages - users can only see their packages
CREATE POLICY "Users can view own packages" ON received_packages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customer_addresses ca 
      WHERE ca.id = received_packages.customer_address_id 
      AND ca.user_id = auth.uid()
    ) OR is_admin()
  );

-- Consolidation groups - users can only see their groups
CREATE POLICY "Users can view own consolidation groups" ON consolidation_groups
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can update own consolidation groups" ON consolidation_groups
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

-- Package photos - users can view photos of their packages
CREATE POLICY "Users can view own package photos" ON package_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM received_packages rp
      JOIN customer_addresses ca ON ca.id = rp.customer_address_id
      WHERE rp.id = package_photos.package_id 
      AND ca.user_id = auth.uid()
    ) OR is_admin()
  );

-- Storage fees - users can view their own fees
CREATE POLICY "Users can view own storage fees" ON storage_fees
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

-- Package notifications - users can view their own notifications
CREATE POLICY "Users can view own notifications" ON package_notifications
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can update own notifications" ON package_notifications
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

-- Admin-only policies for warehouse management
CREATE POLICY "Admins can manage warehouse locations" ON warehouse_locations
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage warehouse tasks" ON warehouse_tasks
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can view all package events" ON package_events
  FOR SELECT USING (is_admin());

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to generate next suite number
CREATE OR REPLACE FUNCTION generate_suite_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT nextval('suite_number_seq') INTO next_num;
  RETURN 'IWB' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to update location capacity
CREATE OR REPLACE FUNCTION update_location_capacity(
  location_code TEXT,
  capacity_change INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE warehouse_locations 
  SET current_packages = current_packages + capacity_change,
      updated_at = NOW()
  WHERE location_code = update_location_capacity.location_code;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate storage fees
CREATE OR REPLACE FUNCTION calculate_storage_fees(
  package_id UUID,
  end_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL AS $$
DECLARE
  pkg RECORD;
  storage_start DATE;
  days_chargeable INTEGER;
  daily_rate DECIMAL := 1.00;
BEGIN
  SELECT * INTO pkg FROM received_packages WHERE id = package_id;
  
  IF pkg IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Storage is free for first 30 days
  storage_start := DATE(pkg.storage_fee_exempt_until);
  
  IF end_date <= storage_start THEN
    RETURN 0;
  END IF;
  
  days_chargeable := end_date - storage_start;
  RETURN days_chargeable * daily_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to get optimal storage location
CREATE OR REPLACE FUNCTION get_optimal_storage_location(
  suite_number TEXT
) RETURNS TEXT AS $$
DECLARE
  zone TEXT;
  location_code TEXT;
BEGIN
  -- Determine zone based on suite number
  IF SUBSTRING(suite_number FROM 4)::INTEGER < 20000 THEN
    zone := 'A';
  ELSIF SUBSTRING(suite_number FROM 4)::INTEGER < 30000 THEN
    zone := 'B';
  ELSE
    zone := 'C';
  END IF;
  
  -- Find available location in preferred zone
  SELECT wl.location_code INTO location_code
  FROM warehouse_locations wl
  WHERE wl.zone = get_optimal_storage_location.zone
    AND wl.is_active = true
    AND wl.current_packages < wl.max_packages
  ORDER BY wl.current_packages ASC
  LIMIT 1;
  
  -- If no space in preferred zone, find any available location
  IF location_code IS NULL THEN
    SELECT wl.location_code INTO location_code
    FROM warehouse_locations wl
    WHERE wl.is_active = true
      AND wl.current_packages < wl.max_packages
    ORDER BY wl.current_packages ASC
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(location_code, 'TEMP001');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
CREATE TRIGGER update_customer_addresses_updated_at
    BEFORE UPDATE ON customer_addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_received_packages_updated_at
    BEFORE UPDATE ON received_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consolidation_groups_updated_at
    BEFORE UPDATE ON consolidation_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouse_locations_updated_at
    BEFORE UPDATE ON warehouse_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouse_tasks_updated_at
    BEFORE UPDATE ON warehouse_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA FOR WAREHOUSE LOCATIONS
-- ============================================================================

-- Seed initial warehouse locations
INSERT INTO warehouse_locations (location_code, zone, shelf_number, slot_number, max_packages, max_weight_kg) VALUES
-- Zone A (IWB10000-IWB19999)
('A01', 'A', 1, 1, 5, 50.0),
('A02', 'A', 1, 2, 5, 50.0),
('A03', 'A', 1, 3, 5, 50.0),
('A04', 'A', 1, 4, 5, 50.0),
('A05', 'A', 1, 5, 5, 50.0),
('A06', 'A', 2, 1, 5, 50.0),
('A07', 'A', 2, 2, 5, 50.0),
('A08', 'A', 2, 3, 5, 50.0),
('A09', 'A', 2, 4, 5, 50.0),
('A10', 'A', 2, 5, 5, 50.0),

-- Zone B (IWB20000-IWB29999)
('B01', 'B', 3, 1, 5, 50.0),
('B02', 'B', 3, 2, 5, 50.0),
('B03', 'B', 3, 3, 5, 50.0),
('B04', 'B', 3, 4, 5, 50.0),
('B05', 'B', 3, 5, 5, 50.0),
('B06', 'B', 4, 1, 5, 50.0),
('B07', 'B', 4, 2, 5, 50.0),
('B08', 'B', 4, 3, 5, 50.0),
('B09', 'B', 4, 4, 5, 50.0),
('B10', 'B', 4, 5, 5, 50.0),

-- Zone C (IWB30000+)
('C01', 'C', 5, 1, 5, 50.0),
('C02', 'C', 5, 2, 5, 50.0),
('C03', 'C', 5, 3, 5, 50.0),
('C04', 'C', 5, 4, 5, 50.0),
('C05', 'C', 5, 5, 5, 50.0),
('C06', 'C', 6, 1, 5, 50.0),
('C07', 'C', 6, 2, 5, 50.0),
('C08', 'C', 6, 3, 5, 50.0),
('C09', 'C', 6, 4, 5, 50.0),
('C10', 'C', 6, 5, 5, 50.0),

-- Temporary overflow locations
('TEMP001', 'T', 0, 0, 10, 100.0),
('TEMP002', 'T', 0, 0, 10, 100.0);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
INSERT INTO system_settings (key, value, description, updated_at)
VALUES (
  'package_forwarding_enabled',
  'true',
  'Package forwarding system is enabled and operational',
  NOW()
) ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = EXCLUDED.updated_at;