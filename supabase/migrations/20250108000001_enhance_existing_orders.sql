-- Enhance existing orders system with multi-warehouse and automation features
-- This migration extends the existing tables rather than recreating them

-- ============================================================================
-- ENHANCE EXISTING ORDERS TABLE
-- ============================================================================

-- Add multi-warehouse and automation fields to existing orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES quotes_v2(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS overall_status text,
ADD COLUMN IF NOT EXISTS primary_warehouse text CHECK (primary_warehouse IN ('india_warehouse', 'china_warehouse', 'us_warehouse', 'myus_3pl', 'other_3pl')),
ADD COLUMN IF NOT EXISTS consolidation_preference text DEFAULT 'wait_for_all' CHECK (consolidation_preference IN ('ship_as_ready', 'wait_for_all', 'partial_groups')),
ADD COLUMN IF NOT EXISTS max_consolidation_wait_days integer DEFAULT 14,
ADD COLUMN IF NOT EXISTS delivery_preference text DEFAULT 'warehouse_consolidation' CHECK (delivery_preference IN ('direct_delivery', 'warehouse_consolidation')),
ADD COLUMN IF NOT EXISTS quality_check_requested boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS photo_documentation_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS original_quote_total decimal(12,2),
ADD COLUMN IF NOT EXISTS current_order_total decimal(12,2),
ADD COLUMN IF NOT EXISTS variance_amount decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency_fluctuation_amount decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_refunded decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_items integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_items integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancelled_items integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS refunded_items integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS revision_pending_items integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipped_items integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivered_items integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_order_automation jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tracking_automation jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS automation_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS original_quote_data jsonb,
ADD COLUMN IF NOT EXISTS payment_verification_date timestamptz,
ADD COLUMN IF NOT EXISTS payment_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS first_shipment_date timestamptz,
ADD COLUMN IF NOT EXISTS last_delivery_date timestamptz;

-- Update existing orders to have customer_id from user_id and set default statuses
UPDATE orders 
SET 
  customer_id = user_id,
  overall_status = status,
  original_quote_total = total_amount,
  current_order_total = total_amount,
  total_items = 1
WHERE customer_id IS NULL;

-- Expand payment method check constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method IN ('cod', 'bank_transfer', 'stripe', 'paypal', 'payu', 'esewa', 'khalti', 'fonepay'));

-- Expand payment status check constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check 
CHECK (payment_status IN ('pending', 'processing', 'verified', 'completed', 'cod_pending', 'failed', 'refunded', 'partial'));

-- ============================================================================
-- ENHANCE EXISTING ORDER_ITEMS TABLE  
-- ============================================================================

-- Add comprehensive fields to existing order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS quote_item_id uuid REFERENCES quote_items_v2(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS product_name text,
ADD COLUMN IF NOT EXISTS product_url text,
ADD COLUMN IF NOT EXISTS seller_platform text CHECK (seller_platform IN ('amazon', 'flipkart', 'ebay', 'b&h', 'other')),
ADD COLUMN IF NOT EXISTS seller_account_type text CHECK (seller_account_type IN ('personal', 'business')),
ADD COLUMN IF NOT EXISTS origin_country char(2),
ADD COLUMN IF NOT EXISTS destination_country char(2),
ADD COLUMN IF NOT EXISTS original_price decimal(10,2),
ADD COLUMN IF NOT EXISTS current_price decimal(10,2),
ADD COLUMN IF NOT EXISTS original_weight decimal(10,3),
ADD COLUMN IF NOT EXISTS current_weight decimal(10,3),
ADD COLUMN IF NOT EXISTS actual_weight decimal(10,3),
ADD COLUMN IF NOT EXISTS item_status text DEFAULT 'pending_order_placement' CHECK (item_status IN (
  'pending_order_placement', 'seller_order_placed', 'revision_pending', 'revision_approved',
  'revision_rejected', 'quality_check_pending', 'quality_check_passed', 'quality_check_failed',
  'shipped', 'delivered', 'cancelled', 'refunded', 'returned', 'exchanged'
)),
ADD COLUMN IF NOT EXISTS seller_order_id text,
ADD COLUMN IF NOT EXISTS seller_order_date timestamptz,
ADD COLUMN IF NOT EXISTS seller_tracking_id text,
ADD COLUMN IF NOT EXISTS brightdata_session_id text,
ADD COLUMN IF NOT EXISTS order_automation_status text DEFAULT 'pending' CHECK (order_automation_status IN ('pending', 'in_progress', 'completed', 'failed', 'manual_required')),
ADD COLUMN IF NOT EXISTS automation_error_log jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS automation_retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_approval_threshold_amount decimal(10,2) DEFAULT 25.00,
ADD COLUMN IF NOT EXISTS auto_approval_threshold_percentage decimal(5,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS requires_customer_approval boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS variance_auto_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS price_variance decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS weight_variance decimal(10,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_variance decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_check_requested boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS quality_check_priority text DEFAULT 'standard' CHECK (quality_check_priority IN ('minimal', 'standard', 'thorough', 'electronics')),
ADD COLUMN IF NOT EXISTS quality_check_status text DEFAULT 'pending' CHECK (quality_check_status IN ('pending', 'in_progress', 'passed', 'failed', 'skipped')),
ADD COLUMN IF NOT EXISTS quality_notes text,
ADD COLUMN IF NOT EXISTS quality_photos jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS quality_inspector_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS quality_checked_at timestamptz,
ADD COLUMN IF NOT EXISTS assigned_warehouse text CHECK (assigned_warehouse IN ('india_warehouse', 'china_warehouse', 'us_warehouse', 'myus_3pl', 'other_3pl')),
ADD COLUMN IF NOT EXISTS warehouse_arrival_date timestamptz,
ADD COLUMN IF NOT EXISTS warehouse_dispatch_date timestamptz,
ADD COLUMN IF NOT EXISTS consolidation_group_id text,
ADD COLUMN IF NOT EXISTS refund_amount decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS refund_processed_at timestamptz,
ADD COLUMN IF NOT EXISTS customer_notified_of_issues boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_customer_notification timestamptz;

-- Update existing order_items with default values where possible
UPDATE order_items 
SET 
  original_price = unit_price,
  current_price = unit_price,
  item_status = 'delivered' -- Assume existing items are delivered
WHERE original_price IS NULL;

-- ============================================================================  
-- CREATE NEW TABLES THAT DON'T EXIST YET
-- ============================================================================

-- Customer delivery preferences per order
CREATE TABLE IF NOT EXISTS customer_delivery_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Delivery method choice with reasoning
  delivery_method text NOT NULL CHECK (delivery_method IN ('direct_delivery', 'warehouse_consolidation')),
  delivery_reason text,
  consolidation_preference text CHECK (consolidation_preference IN ('ship_as_ready', 'wait_for_all', 'partial_groups')),
  max_wait_days integer DEFAULT 14 CHECK (max_wait_days > 0 AND max_wait_days <= 30),
  
  -- Quality preferences
  quality_check_level text DEFAULT 'standard' CHECK (quality_check_level IN ('minimal', 'standard', 'thorough')),
  photo_documentation_required boolean DEFAULT false,
  functionality_test_required boolean DEFAULT false,
  
  -- Cost vs speed preference
  priority text DEFAULT 'balanced' CHECK (priority IN ('fastest', 'cheapest', 'balanced', 'quality_first')),
  
  -- Communication preferences
  notification_frequency text DEFAULT 'major_updates' CHECK (notification_frequency IN ('all_updates', 'major_updates', 'minimal')),
  preferred_communication text DEFAULT 'email' CHECK (preferred_communication IN ('email', 'sms', 'both')),
  
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(order_id)
);

-- Automation tracking for seller orders
CREATE TABLE IF NOT EXISTS seller_order_automation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  
  automation_type text NOT NULL CHECK (automation_type IN ('order_placement', 'tracking_scrape', 'status_check', 'inventory_check')),
  brightdata_session_id text,
  automation_status text DEFAULT 'queued' CHECK (automation_status IN ('queued', 'running', 'completed', 'failed', 'retry', 'manual_required')),
  
  seller_platform text NOT NULL,
  seller_account_type text,
  automation_config jsonb DEFAULT '{}',
  
  success boolean DEFAULT false,
  error_message text,
  scraped_data jsonb DEFAULT '{}',
  api_response jsonb DEFAULT '{}',
  
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  next_retry_at timestamptz,
  retry_delay_minutes integer DEFAULT 30,
  
  execution_time_seconds integer,
  data_quality_score decimal(3,2),
  
  created_at timestamptz DEFAULT NOW(),
  started_at timestamptz,
  completed_at timestamptz,
  
  requires_manual_review boolean DEFAULT false,
  manual_review_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz
);

-- Enhanced multi-warehouse shipment management
CREATE TABLE IF NOT EXISTS order_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  shipment_number text UNIQUE NOT NULL,
  
  origin_warehouse text NOT NULL CHECK (origin_warehouse IN ('india_warehouse', 'china_warehouse', 'us_warehouse', 'myus_3pl', 'other_3pl')),
  warehouse_location jsonb,
  consolidation_group text,
  shipment_type text NOT NULL CHECK (shipment_type IN ('direct_delivery', 'warehouse_consolidation', 'partial_shipment', 'replacement_shipment')),
  
  third_party_service text CHECK (third_party_service IN ('myus', 'shipito', 'borderlinx', 'other')),
  third_party_account_id text,
  third_party_tracking_id text,
  
  seller_platform text CHECK (seller_platform IN ('amazon', 'flipkart', 'ebay', 'b&h', 'other')),
  seller_name text,
  seller_order_id text,
  seller_tracking_id text,
  
  international_tracking_id text,
  local_delivery_tracking_id text,
  
  current_status text DEFAULT 'seller_preparing' CHECK (current_status IN (
    'seller_preparing', 'seller_shipped', 'in_transit_to_warehouse', 'arrived_at_warehouse',
    'quality_check_pending', 'quality_check_passed', 'quality_check_failed',
    'consolidation_pending', 'ready_for_dispatch', 'dispatched_internationally',
    'in_transit_international', 'at_customs', 'customs_cleared', 'customs_hold',
    'local_facility', 'out_for_delivery', 'delivery_attempted', 'delivered',
    'returned_to_sender', 'exception', 'cancelled'
  )),
  current_location text,
  current_tier text DEFAULT 'seller' CHECK (current_tier IN ('seller', 'international', 'local')),
  
  shipping_carrier text,
  service_type text CHECK (service_type IN ('standard', 'express', 'economy', 'priority')),
  
  estimated_weight_kg decimal(10,3),
  actual_weight_kg decimal(10,3),
  dimensional_weight_kg decimal(10,3),
  billable_weight_kg decimal(10,3),
  weight_variance_approved boolean DEFAULT false,
  
  length_cm decimal(8,2),
  width_cm decimal(8,2),
  height_cm decimal(8,2),
  
  quality_check_status text DEFAULT 'pending' CHECK (quality_check_status IN ('pending', 'in_progress', 'passed', 'failed', 'damaged', 'skipped')),
  quality_check_date timestamptz,
  quality_notes text,
  quality_photos jsonb DEFAULT '[]',
  inspector_id uuid REFERENCES auth.users(id),
  
  customer_delivery_preference text,
  estimated_delivery_date timestamptz,
  customer_max_wait_date timestamptz,
  delivery_instructions text,
  
  seller_ship_date timestamptz,
  warehouse_arrival_date timestamptz,
  quality_check_completed_date timestamptz,
  warehouse_dispatch_date timestamptz,
  customs_entry_date timestamptz,
  customs_clearance_date timestamptz,
  local_facility_date timestamptz,
  out_for_delivery_date timestamptz,
  delivery_attempted_date timestamptz,
  customer_delivery_date timestamptz,
  
  estimated_shipping_cost decimal(10,2),
  actual_shipping_cost decimal(10,2),
  customs_duty decimal(10,2),
  additional_fees decimal(10,2),
  insurance_cost decimal(10,2),
  
  exception_status text CHECK (exception_status IN ('customs_hold', 'damaged_in_transit', 'delivery_failed', 'address_issue', 'customer_not_available')),
  exception_notes text,
  escalation_required boolean DEFAULT false,
  escalated_at timestamptz,
  escalated_to uuid REFERENCES auth.users(id),
  
  customer_notified boolean DEFAULT false,
  last_notification_sent timestamptz,
  notification_count integer DEFAULT 0,
  
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Link items to shipments
CREATE TABLE IF NOT EXISTS shipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES order_shipments(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  quantity_in_shipment integer NOT NULL DEFAULT 1 CHECK (quantity_in_shipment > 0),
  
  received_condition text DEFAULT 'good' CHECK (received_condition IN ('good', 'damaged', 'missing', 'defective', 'wrong_item')),
  quality_notes text,
  condition_photos jsonb DEFAULT '[]',
  
  item_weight_in_shipment decimal(10,3),
  item_value_in_shipment decimal(10,2),
  customs_declared_value decimal(10,2),
  
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(shipment_id, order_item_id)
);

-- Tracking events for all 3 tiers
CREATE TABLE IF NOT EXISTS shipment_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES order_shipments(id) ON DELETE CASCADE,
  
  tracking_tier text NOT NULL CHECK (tracking_tier IN ('seller', 'international', 'local')),
  event_type text NOT NULL CHECK (event_type IN (
    'order_placed', 'shipped', 'in_transit', 'arrived', 'departed', 'customs',
    'cleared', 'delivered', 'attempted', 'exception', 'returned', 'cancelled'
  )),
  event_status text NOT NULL CHECK (event_status IN ('info', 'warning', 'error', 'success', 'pending')),
  
  location text,
  description text NOT NULL,
  external_tracking_id text,
  carrier text,
  
  country_code char(2),
  city text,
  postal_code text,
  
  event_timestamp timestamptz DEFAULT NOW(),
  system_generated boolean DEFAULT false,
  admin_user_id uuid REFERENCES auth.users(id),
  
  webhook_data jsonb DEFAULT '{}',
  api_response jsonb DEFAULT '{}',
  data_source text CHECK (data_source IN ('manual', 'webhook', 'api_scrape', 'email_parse', 'brightdata')),
  
  customer_visible boolean DEFAULT true,
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamptz,
  
  created_at timestamptz DEFAULT NOW()
);

-- Exception handling and customer choice system
CREATE TABLE IF NOT EXISTS order_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  shipment_id uuid REFERENCES order_shipments(id) ON DELETE SET NULL,
  exception_type text NOT NULL CHECK (exception_type IN (
    'seller_cancelled', 'seller_out_of_stock', 'wrong_item_sent', 'damaged_in_transit',
    'quality_check_failed', 'customs_issue', 'delivery_failed', 'price_variance',
    'weight_variance', 'customer_complaint', 'automation_failed'
  )),
  
  title text NOT NULL,
  description text NOT NULL,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  photos jsonb DEFAULT '[]',
  supporting_documents jsonb DEFAULT '[]',
  
  detected_by text CHECK (detected_by IN ('automation', 'quality_check', 'customer_report', 'admin_review', 'seller_notification')),
  detected_at timestamptz DEFAULT NOW(),
  reported_by uuid REFERENCES auth.users(id),
  
  available_resolutions jsonb NOT NULL DEFAULT '[]',
  recommended_resolution text,
  customer_choice text,
  customer_choice_reason text,
  customer_response_deadline timestamptz DEFAULT (NOW() + INTERVAL '48 hours'),
  
  alternative_sellers_found jsonb DEFAULT '[]',
  alternative_selected boolean DEFAULT false,
  alternative_price_difference decimal(10,2),
  
  resolution_status text DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'in_progress', 'resolved', 'escalated', 'closed')),
  resolution_method text,
  resolution_amount decimal(10,2),
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  
  customer_satisfaction_rating integer CHECK (customer_satisfaction_rating >= 1 AND customer_satisfaction_rating <= 5),
  customer_feedback text,
  
  requires_admin_approval boolean DEFAULT false,
  admin_approved boolean DEFAULT false,
  admin_approval_notes text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  
  cost_to_business decimal(10,2) DEFAULT 0,
  impact_category text CHECK (impact_category IN ('no_cost', 'low_cost', 'medium_cost', 'high_cost')),
  
  prevention_notes text,
  process_improvement_required boolean DEFAULT false,
  
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Item revision history
CREATE TABLE IF NOT EXISTS item_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  revision_number integer DEFAULT 1,
  
  change_type text NOT NULL CHECK (change_type IN ('price_increase', 'price_decrease', 'weight_increase', 'weight_decrease', 'both_increase', 'both_decrease', 'mixed_changes', 'cancellation', 'specification_change')),
  change_reason text,
  
  original_price decimal(10,2),
  new_price decimal(10,2),
  price_change_amount decimal(10,2) GENERATED ALWAYS AS (new_price - original_price) STORED,
  price_change_percentage decimal(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN original_price > 0 THEN ((new_price - original_price) / original_price * 100)
      ELSE 0 
    END
  ) STORED,
  
  original_weight decimal(10,3),
  new_weight decimal(10,3),
  weight_change_amount decimal(10,3) GENERATED ALWAYS AS (new_weight - original_weight) STORED,
  weight_change_percentage decimal(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN original_weight > 0 THEN ((new_weight - original_weight) / original_weight * 100)
      ELSE 0 
    END
  ) STORED,
  
  total_cost_impact decimal(10,2) NOT NULL DEFAULT 0,
  shipping_cost_impact decimal(10,2) DEFAULT 0,
  customs_duty_impact decimal(10,2) DEFAULT 0,
  
  auto_approval_eligible boolean DEFAULT false,
  auto_approved boolean DEFAULT false,
  auto_approval_reason text,
  
  customer_approval_status text DEFAULT 'pending' CHECK (customer_approval_status IN ('pending', 'approved', 'rejected', 'expired', 'auto_approved')),
  customer_approval_deadline timestamptz DEFAULT (NOW() + INTERVAL '48 hours'),
  customer_response_notes text,
  customer_responded_at timestamptz,
  
  admin_notes text,
  admin_user_id uuid REFERENCES auth.users(id),
  requires_management_approval boolean DEFAULT false,
  management_approved boolean DEFAULT false,
  
  recalculation_used_quote_data jsonb,
  recalculation_result jsonb,
  
  customer_notified boolean DEFAULT false,
  notification_sent_at timestamptz,
  reminder_count integer DEFAULT 0,
  last_reminder_sent timestamptz,
  
  created_at timestamptz DEFAULT NOW(),
  approved_at timestamptz,
  rejected_at timestamptz
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- New indexes for enhanced fields
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_overall_status ON orders(overall_status);
CREATE INDEX IF NOT EXISTS idx_orders_quote_id ON orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_orders_primary_warehouse ON orders(primary_warehouse);

CREATE INDEX IF NOT EXISTS idx_order_items_item_status ON order_items(item_status);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_platform ON order_items(seller_platform);
CREATE INDEX IF NOT EXISTS idx_order_items_assigned_warehouse ON order_items(assigned_warehouse);
CREATE INDEX IF NOT EXISTS idx_order_items_automation_status ON order_items(order_automation_status);
CREATE INDEX IF NOT EXISTS idx_order_items_revision_pending ON order_items(requires_customer_approval) WHERE requires_customer_approval = true;
CREATE INDEX IF NOT EXISTS idx_order_items_quote_item_id ON order_items(quote_item_id);

CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON order_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON order_shipments(current_status);
CREATE INDEX IF NOT EXISTS idx_shipments_warehouse ON order_shipments(origin_warehouse);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_international ON order_shipments(international_tracking_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_local ON order_shipments(local_delivery_tracking_id);

CREATE INDEX IF NOT EXISTS idx_automation_status ON seller_order_automation(automation_status);
CREATE INDEX IF NOT EXISTS idx_automation_type ON seller_order_automation(automation_type);
CREATE INDEX IF NOT EXISTS idx_automation_retry ON seller_order_automation(next_retry_at) WHERE next_retry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tracking_events_shipment ON shipment_tracking_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_timestamp ON shipment_tracking_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_events_tier ON shipment_tracking_events(tracking_tier);

CREATE INDEX IF NOT EXISTS idx_exceptions_status ON order_exceptions(resolution_status);
CREATE INDEX IF NOT EXISTS idx_exceptions_type ON order_exceptions(exception_type);
CREATE INDEX IF NOT EXISTS idx_exceptions_pending ON order_exceptions(customer_response_deadline) WHERE resolution_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_revisions_order_item ON item_revisions(order_item_id);
CREATE INDEX IF NOT EXISTS idx_revisions_approval_status ON item_revisions(customer_approval_status);
CREATE INDEX IF NOT EXISTS idx_revisions_deadline ON item_revisions(customer_approval_deadline) WHERE customer_approval_status = 'pending';

-- ============================================================================
-- CREATE TRIGGERS FOR AUTOMATION
-- ============================================================================

-- Trigger to update order item counters
CREATE OR REPLACE FUNCTION update_order_item_counters()
RETURNS TRIGGER AS $$
DECLARE
  order_record orders%ROWTYPE;
BEGIN
  -- Get current order record
  SELECT * INTO order_record FROM orders WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  -- Recalculate all counters
  UPDATE orders SET
    active_items = (SELECT COUNT(*) FROM order_items WHERE order_id = order_record.id AND item_status IN ('seller_order_placed', 'quality_check_passed', 'shipped')),
    cancelled_items = (SELECT COUNT(*) FROM order_items WHERE order_id = order_record.id AND item_status = 'cancelled'),
    refunded_items = (SELECT COUNT(*) FROM order_items WHERE order_id = order_record.id AND item_status = 'refunded'),
    revision_pending_items = (SELECT COUNT(*) FROM order_items WHERE order_id = order_record.id AND item_status = 'revision_pending'),
    shipped_items = (SELECT COUNT(*) FROM order_items WHERE order_id = order_record.id AND item_status = 'shipped'),
    delivered_items = (SELECT COUNT(*) FROM order_items WHERE order_id = order_record.id AND item_status = 'delivered')
  WHERE id = order_record.id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply counter update trigger
DROP TRIGGER IF EXISTS update_order_counters ON order_items;
CREATE TRIGGER update_order_counters
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_item_counters();

-- Triggers for updated_at timestamps on new tables
DROP TRIGGER IF EXISTS update_shipments_updated_at ON order_shipments;
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON order_shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exceptions_updated_at ON order_exceptions;
CREATE TRIGGER update_exceptions_updated_at
  BEFORE UPDATE ON order_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ADD RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE customer_delivery_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_order_automation ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_revisions ENABLE ROW LEVEL SECURITY;

-- Customer delivery preferences policies
CREATE POLICY "Users can manage their delivery preferences" ON customer_delivery_preferences
  FOR ALL TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Admins can manage all delivery preferences" ON customer_delivery_preferences
  FOR ALL TO authenticated
  USING (is_admin());

-- Automation policies (admin only)
CREATE POLICY "Admins can manage automation" ON seller_order_automation
  FOR ALL TO authenticated
  USING (is_admin());

-- Shipment policies
CREATE POLICY "Users can view their shipments" ON order_shipments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_shipments.order_id 
      AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all shipments" ON order_shipments
  FOR ALL TO authenticated
  USING (is_admin());

-- Shipment items policies
CREATE POLICY "Users can view their shipment items" ON shipment_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM order_shipments s
      JOIN orders o ON s.order_id = o.id
      WHERE s.id = shipment_items.shipment_id 
      AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all shipment items" ON shipment_items
  FOR ALL TO authenticated
  USING (is_admin());

-- Tracking events policies
CREATE POLICY "Users can view their tracking events" ON shipment_tracking_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM order_shipments s
      JOIN orders o ON s.order_id = o.id
      WHERE s.id = shipment_tracking_events.shipment_id 
      AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all tracking events" ON shipment_tracking_events
  FOR ALL TO authenticated
  USING (is_admin());

-- Exception policies
CREATE POLICY "Users can view their exceptions" ON order_exceptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.id = order_exceptions.order_item_id 
      AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their exception responses" ON order_exceptions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.id = order_exceptions.order_item_id 
      AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all exceptions" ON order_exceptions
  FOR ALL TO authenticated
  USING (is_admin());

-- Item revisions policies
CREATE POLICY "Users can view their revisions" ON item_revisions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.id = item_revisions.order_item_id 
      AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "Users can respond to their revisions" ON item_revisions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.id = item_revisions.order_item_id 
      AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all revisions" ON item_revisions
  FOR ALL TO authenticated
  USING (is_admin());

-- Log successful enhancement
SELECT 'Enhanced orders system successfully upgraded' as result;