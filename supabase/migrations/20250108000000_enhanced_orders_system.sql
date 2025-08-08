-- Enhanced Multi-Warehouse Order Management System
-- Complete database foundation for automated order processing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core enhanced orders table with multi-warehouse and automation support
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  quote_id uuid REFERENCES quotes_v2(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Payment & Status with COD support
  payment_method text NOT NULL CHECK (payment_method IN ('cod', 'bank_transfer', 'stripe', 'paypal', 'payu', 'esewa', 'khalti', 'fonepay')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'verified', 'completed', 'cod_pending', 'failed', 'refunded', 'partial')),
  payment_verification_date timestamptz, -- For bank transfers (24hr verification)
  overall_status text NOT NULL DEFAULT 'payment_pending',
  
  -- Multi-warehouse support
  primary_warehouse text CHECK (primary_warehouse IN ('india_warehouse', 'china_warehouse', 'us_warehouse', 'myus_3pl', 'other_3pl')),
  consolidation_preference text DEFAULT 'wait_for_all' CHECK (consolidation_preference IN ('ship_as_ready', 'wait_for_all', 'partial_groups')),
  max_consolidation_wait_days integer DEFAULT 14,
  
  -- Customer delivery preferences
  delivery_preference text DEFAULT 'warehouse_consolidation' CHECK (delivery_preference IN ('direct_delivery', 'warehouse_consolidation')),
  quality_check_requested boolean DEFAULT true,
  photo_documentation_required boolean DEFAULT false,
  
  -- Financial tracking with variance
  original_quote_total decimal(12,2) NOT NULL DEFAULT 0,
  current_order_total decimal(12,2) NOT NULL DEFAULT 0,
  variance_amount decimal(12,2) DEFAULT 0,
  currency_fluctuation_amount decimal(12,2) DEFAULT 0,
  total_paid decimal(12,2) DEFAULT 0,
  total_refunded decimal(12,2) DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  
  -- Item counters for quick reference
  total_items integer DEFAULT 0,
  active_items integer DEFAULT 0,
  cancelled_items integer DEFAULT 0,
  refunded_items integer DEFAULT 0,
  revision_pending_items integer DEFAULT 0,
  shipped_items integer DEFAULT 0,
  delivered_items integer DEFAULT 0,
  
  -- Automation tracking
  seller_order_automation jsonb DEFAULT '{}', -- Brightdata + AI automation data
  tracking_automation jsonb DEFAULT '{}',     -- Email scraping automation data
  automation_enabled boolean DEFAULT true,
  
  -- Metadata
  admin_notes text,
  customer_notes text,
  original_quote_data jsonb, -- Store original calculation for reference
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  payment_completed_at timestamptz,
  first_shipment_date timestamptz,
  last_delivery_date timestamptz,
  
  -- Constraints
  CONSTRAINT valid_totals CHECK (original_quote_total >= 0 AND current_order_total >= 0),
  CONSTRAINT valid_payments CHECK (total_paid >= 0 AND total_refunded >= 0),
  CONSTRAINT valid_item_counts CHECK (
    total_items >= 0 AND active_items >= 0 AND cancelled_items >= 0 AND
    refunded_items >= 0 AND revision_pending_items >= 0 AND
    shipped_items >= 0 AND delivered_items >= 0
  )
);

-- Enhanced order items with seller automation
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  quote_item_id uuid REFERENCES quote_items_v2(id) ON DELETE SET NULL,
  
  -- Product details from quote
  product_name text NOT NULL,
  product_url text,
  seller_platform text NOT NULL CHECK (seller_platform IN ('amazon', 'flipkart', 'ebay', 'b&h', 'other')),
  seller_account_type text CHECK (seller_account_type IN ('personal', 'business')),
  origin_country char(2) NOT NULL,
  destination_country char(2) NOT NULL,
  
  -- Pricing with variance tracking
  original_price decimal(10,2) NOT NULL DEFAULT 0,
  current_price decimal(10,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  
  -- Weight tracking with variance
  original_weight decimal(10,3),
  current_weight decimal(10,3),
  actual_weight decimal(10,3), -- Measured at warehouse
  
  -- Item status management
  item_status text DEFAULT 'pending_order_placement' CHECK (item_status IN (
    'pending_order_placement', 'seller_order_placed', 'revision_pending', 'revision_approved',
    'revision_rejected', 'quality_check_pending', 'quality_check_passed', 'quality_check_failed',
    'shipped', 'delivered', 'cancelled', 'refunded', 'returned', 'exchanged'
  )),
  
  -- Seller order automation
  seller_order_id text,
  seller_order_date timestamptz,
  seller_tracking_id text,
  
  -- Automation tracking
  brightdata_session_id text,
  order_automation_status text DEFAULT 'pending' CHECK (order_automation_status IN ('pending', 'in_progress', 'completed', 'failed', 'manual_required')),
  automation_error_log jsonb DEFAULT '[]',
  automation_retry_count integer DEFAULT 0,
  
  -- Price variance with auto-approval logic
  auto_approval_threshold_amount decimal(10,2) DEFAULT 25.00,
  auto_approval_threshold_percentage decimal(5,2) DEFAULT 5.00,
  requires_customer_approval boolean DEFAULT false,
  variance_auto_approved boolean DEFAULT false,
  price_variance decimal(10,2) DEFAULT 0,
  weight_variance decimal(10,3) DEFAULT 0,
  total_variance decimal(10,2) DEFAULT 0,
  
  -- Quality control details
  quality_check_requested boolean DEFAULT true,
  quality_check_priority text DEFAULT 'standard' CHECK (quality_check_priority IN ('minimal', 'standard', 'thorough', 'electronics')),
  quality_check_status text DEFAULT 'pending' CHECK (quality_check_status IN ('pending', 'in_progress', 'passed', 'failed', 'skipped')),
  quality_notes text,
  quality_photos jsonb DEFAULT '[]',
  quality_inspector_id uuid REFERENCES auth.users(id),
  quality_checked_at timestamptz,
  
  -- Multi-warehouse assignment
  assigned_warehouse text CHECK (assigned_warehouse IN ('india_warehouse', 'china_warehouse', 'us_warehouse', 'myus_3pl', 'other_3pl')),
  warehouse_arrival_date timestamptz,
  warehouse_dispatch_date timestamptz,
  consolidation_group_id text,
  
  -- Refund/cancellation tracking
  refund_amount decimal(10,2) DEFAULT 0,
  cancellation_reason text,
  refund_processed_at timestamptz,
  
  -- Customer communication
  customer_notified_of_issues boolean DEFAULT false,
  last_customer_notification timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_prices CHECK (original_price >= 0 AND current_price >= 0),
  CONSTRAINT valid_weights CHECK (
    (original_weight IS NULL OR original_weight >= 0) AND
    (current_weight IS NULL OR current_weight >= 0) AND
    (actual_weight IS NULL OR actual_weight >= 0)
  ),
  CONSTRAINT valid_refund CHECK (refund_amount >= 0 AND refund_amount <= (current_price * quantity))
);

-- Customer delivery preferences per order
CREATE TABLE IF NOT EXISTS customer_delivery_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Delivery method choice with reasoning
  delivery_method text NOT NULL CHECK (delivery_method IN ('direct_delivery', 'warehouse_consolidation')),
  delivery_reason text, -- Customer's reason for choice
  consolidation_preference text CHECK (consolidation_preference IN ('ship_as_ready', 'wait_for_all', 'partial_groups')),
  max_wait_days integer DEFAULT 14 CHECK (max_wait_days > 0 AND max_wait_days <= 30),
  
  -- Quality preferences
  quality_check_level text DEFAULT 'standard' CHECK (quality_check_level IN ('minimal', 'standard', 'thorough')),
  photo_documentation_required boolean DEFAULT false,
  functionality_test_required boolean DEFAULT false, -- For electronics
  
  -- Cost vs speed preference
  priority text DEFAULT 'balanced' CHECK (priority IN ('fastest', 'cheapest', 'balanced', 'quality_first')),
  
  -- Communication preferences
  notification_frequency text DEFAULT 'major_updates' CHECK (notification_frequency IN ('all_updates', 'major_updates', 'minimal')),
  preferred_communication text DEFAULT 'email' CHECK (preferred_communication IN ('email', 'sms', 'both')),
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  
  -- Ensure one preference per order
  UNIQUE(order_id)
);

-- Automation tracking for seller orders and tracking scraping
CREATE TABLE IF NOT EXISTS seller_order_automation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  
  -- Brightdata automation details
  automation_type text NOT NULL CHECK (automation_type IN ('order_placement', 'tracking_scrape', 'status_check', 'inventory_check')),
  brightdata_session_id text,
  automation_status text DEFAULT 'queued' CHECK (automation_status IN ('queued', 'running', 'completed', 'failed', 'retry', 'manual_required')),
  
  -- Automation configuration
  seller_platform text NOT NULL,
  seller_account_type text,
  automation_config jsonb DEFAULT '{}',
  
  -- Results and error handling
  success boolean DEFAULT false,
  error_message text,
  scraped_data jsonb DEFAULT '{}',
  api_response jsonb DEFAULT '{}',
  
  -- Retry logic
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  next_retry_at timestamptz,
  retry_delay_minutes integer DEFAULT 30,
  
  -- Performance tracking
  execution_time_seconds integer,
  data_quality_score decimal(3,2), -- 0.00 to 1.00 for scraped data quality
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  started_at timestamptz,
  completed_at timestamptz,
  
  -- Admin oversight
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
  
  -- Multi-warehouse support
  origin_warehouse text NOT NULL CHECK (origin_warehouse IN ('india_warehouse', 'china_warehouse', 'us_warehouse', 'myus_3pl', 'other_3pl')),
  warehouse_location jsonb, -- Detailed warehouse address and contact info
  consolidation_group text, -- Group identifier for consolidated items
  shipment_type text NOT NULL CHECK (shipment_type IN ('direct_delivery', 'warehouse_consolidation', 'partial_shipment', 'replacement_shipment')),
  
  -- 3PL integration
  third_party_service text CHECK (third_party_service IN ('myus', 'shipito', 'borderlinx', 'other')),
  third_party_account_id text,
  third_party_tracking_id text,
  
  -- Seller information (for direct deliveries)
  seller_platform text CHECK (seller_platform IN ('amazon', 'flipkart', 'ebay', 'b&h', 'other')),
  seller_name text,
  seller_order_id text,
  seller_tracking_id text,
  
  -- 3-Tier Tracking System
  international_tracking_id text, -- Our warehouse → customs tracking
  local_delivery_tracking_id text, -- Customs → customer delivery
  
  -- Current status & location tracking
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
  
  -- Logistics details
  shipping_carrier text,
  service_type text CHECK (service_type IN ('standard', 'express', 'economy', 'priority')),
  
  -- Weight and dimension management
  estimated_weight_kg decimal(10,3),
  actual_weight_kg decimal(10,3),
  dimensional_weight_kg decimal(10,3),
  billable_weight_kg decimal(10,3),
  weight_variance_approved boolean DEFAULT false,
  
  -- Package dimensions
  length_cm decimal(8,2),
  width_cm decimal(8,2),
  height_cm decimal(8,2),
  
  -- Quality control integration
  quality_check_status text DEFAULT 'pending' CHECK (quality_check_status IN ('pending', 'in_progress', 'passed', 'failed', 'damaged', 'skipped')),
  quality_check_date timestamptz,
  quality_notes text,
  quality_photos jsonb DEFAULT '[]',
  inspector_id uuid REFERENCES auth.users(id),
  
  -- Customer delivery preferences impact
  customer_delivery_preference text,
  estimated_delivery_date timestamptz,
  customer_max_wait_date timestamptz,
  delivery_instructions text,
  
  -- Timeline tracking (all stages)
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
  
  -- Cost tracking with variance
  estimated_shipping_cost decimal(10,2),
  actual_shipping_cost decimal(10,2),
  customs_duty decimal(10,2),
  additional_fees decimal(10,2),
  insurance_cost decimal(10,2),
  
  -- Exception handling
  exception_status text CHECK (exception_status IN ('customs_hold', 'damaged_in_transit', 'delivery_failed', 'address_issue', 'customer_not_available')),
  exception_notes text,
  escalation_required boolean DEFAULT false,
  escalated_at timestamptz,
  escalated_to uuid REFERENCES auth.users(id),
  
  -- Customer communication
  customer_notified boolean DEFAULT false,
  last_notification_sent timestamptz,
  notification_count integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_weights CHECK (
    (estimated_weight_kg IS NULL OR estimated_weight_kg >= 0) AND
    (actual_weight_kg IS NULL OR actual_weight_kg >= 0) AND
    (dimensional_weight_kg IS NULL OR dimensional_weight_kg >= 0) AND
    (billable_weight_kg IS NULL OR billable_weight_kg >= 0)
  ),
  CONSTRAINT valid_costs CHECK (
    (estimated_shipping_cost IS NULL OR estimated_shipping_cost >= 0) AND
    (actual_shipping_cost IS NULL OR actual_shipping_cost >= 0) AND
    (customs_duty IS NULL OR customs_duty >= 0)
  )
);

-- Link items to shipments (many-to-one relationship)
CREATE TABLE IF NOT EXISTS shipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES order_shipments(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  quantity_in_shipment integer NOT NULL DEFAULT 1 CHECK (quantity_in_shipment > 0),
  
  -- Item condition tracking in this specific shipment
  received_condition text DEFAULT 'good' CHECK (received_condition IN ('good', 'damaged', 'missing', 'defective', 'wrong_item')),
  quality_notes text,
  condition_photos jsonb DEFAULT '[]',
  
  -- Weight allocation for this shipment
  item_weight_in_shipment decimal(10,3),
  
  -- Value allocation
  item_value_in_shipment decimal(10,2),
  customs_declared_value decimal(10,2),
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(shipment_id, order_item_id) -- Prevent duplicate entries
);

-- Comprehensive tracking events for all 3 tiers
CREATE TABLE IF NOT EXISTS shipment_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES order_shipments(id) ON DELETE CASCADE,
  
  -- Tracking classification
  tracking_tier text NOT NULL CHECK (tracking_tier IN ('seller', 'international', 'local')),
  event_type text NOT NULL CHECK (event_type IN (
    'order_placed', 'shipped', 'in_transit', 'arrived', 'departed', 'customs',
    'cleared', 'delivered', 'attempted', 'exception', 'returned', 'cancelled'
  )),
  event_status text NOT NULL CHECK (event_status IN ('info', 'warning', 'error', 'success', 'pending')),
  
  -- Event details
  location text,
  description text NOT NULL,
  external_tracking_id text,
  carrier text,
  
  -- Geographic information
  country_code char(2),
  city text,
  postal_code text,
  
  -- Metadata and integration
  event_timestamp timestamptz DEFAULT NOW(),
  system_generated boolean DEFAULT false,
  admin_user_id uuid REFERENCES auth.users(id),
  
  -- External system integration
  webhook_data jsonb DEFAULT '{}',
  api_response jsonb DEFAULT '{}',
  data_source text CHECK (data_source IN ('manual', 'webhook', 'api_scrape', 'email_parse', 'brightdata')),
  
  -- Customer communication
  customer_visible boolean DEFAULT true,
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamptz,
  
  -- Timestamps
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
  
  -- Exception details
  title text NOT NULL,
  description text NOT NULL,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  photos jsonb DEFAULT '[]',
  supporting_documents jsonb DEFAULT '[]',
  
  -- Detection and reporting
  detected_by text CHECK (detected_by IN ('automation', 'quality_check', 'customer_report', 'admin_review', 'seller_notification')),
  detected_at timestamptz DEFAULT NOW(),
  reported_by uuid REFERENCES auth.users(id),
  
  -- Resolution options and customer choice
  available_resolutions jsonb NOT NULL DEFAULT '[]', -- ['refund', 'replacement', 'alternative_source', 'store_credit', 'partial_refund_keep']
  recommended_resolution text,
  customer_choice text,
  customer_choice_reason text,
  customer_response_deadline timestamptz DEFAULT (NOW() + INTERVAL '48 hours'),
  
  -- Alternative sourcing
  alternative_sellers_found jsonb DEFAULT '[]',
  alternative_selected boolean DEFAULT false,
  alternative_price_difference decimal(10,2),
  
  -- Resolution tracking
  resolution_status text DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'in_progress', 'resolved', 'escalated', 'closed')),
  resolution_method text,
  resolution_amount decimal(10,2), -- Refund/credit amount
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  
  -- Customer satisfaction
  customer_satisfaction_rating integer CHECK (customer_satisfaction_rating >= 1 AND customer_satisfaction_rating <= 5),
  customer_feedback text,
  
  -- Admin oversight
  requires_admin_approval boolean DEFAULT false,
  admin_approved boolean DEFAULT false,
  admin_approval_notes text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  
  -- Financial impact
  cost_to_business decimal(10,2) DEFAULT 0,
  impact_category text CHECK (impact_category IN ('no_cost', 'low_cost', 'medium_cost', 'high_cost')),
  
  -- Follow-up and prevention
  prevention_notes text,
  process_improvement_required boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Item revision history with detailed tracking
CREATE TABLE IF NOT EXISTS item_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  revision_number integer DEFAULT 1,
  
  -- Change details with comprehensive tracking
  change_type text NOT NULL CHECK (change_type IN ('price_increase', 'price_decrease', 'weight_increase', 'weight_decrease', 'both_increase', 'both_decrease', 'mixed_changes', 'cancellation', 'specification_change')),
  change_reason text, -- Why the change occurred
  
  -- Price changes
  original_price decimal(10,2),
  new_price decimal(10,2),
  price_change_amount decimal(10,2) GENERATED ALWAYS AS (new_price - original_price) STORED,
  price_change_percentage decimal(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN original_price > 0 THEN ((new_price - original_price) / original_price * 100)
      ELSE 0 
    END
  ) STORED,
  
  -- Weight changes
  original_weight decimal(10,3),
  new_weight decimal(10,3),
  weight_change_amount decimal(10,3) GENERATED ALWAYS AS (new_weight - original_weight) STORED,
  weight_change_percentage decimal(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN original_weight > 0 THEN ((new_weight - original_weight) / original_weight * 100)
      ELSE 0 
    END
  ) STORED,
  
  -- Total financial impact (includes shipping, customs, etc.)
  total_cost_impact decimal(10,2) NOT NULL DEFAULT 0,
  shipping_cost_impact decimal(10,2) DEFAULT 0,
  customs_duty_impact decimal(10,2) DEFAULT 0,
  
  -- Auto-approval logic
  auto_approval_eligible boolean DEFAULT false,
  auto_approved boolean DEFAULT false,
  auto_approval_reason text,
  
  -- Customer approval workflow
  customer_approval_status text DEFAULT 'pending' CHECK (customer_approval_status IN ('pending', 'approved', 'rejected', 'expired', 'auto_approved')),
  customer_approval_deadline timestamptz DEFAULT (NOW() + INTERVAL '48 hours'),
  customer_response_notes text,
  customer_responded_at timestamptz,
  
  -- Admin tracking
  admin_notes text,
  admin_user_id uuid REFERENCES auth.users(id),
  requires_management_approval boolean DEFAULT false,
  management_approved boolean DEFAULT false,
  
  -- Recalculation data
  recalculation_used_quote_data jsonb, -- Store the calculation inputs used
  recalculation_result jsonb, -- Store the detailed calculation results
  
  -- Communication tracking
  customer_notified boolean DEFAULT false,
  notification_sent_at timestamptz,
  reminder_count integer DEFAULT 0,
  last_reminder_sent timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  approved_at timestamptz,
  rejected_at timestamptz
);

-- Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(overall_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_quote_id ON orders(quote_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(item_status);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_platform ON order_items(seller_platform);
CREATE INDEX IF NOT EXISTS idx_order_items_warehouse ON order_items(assigned_warehouse);
CREATE INDEX IF NOT EXISTS idx_order_items_automation_status ON order_items(order_automation_status);
CREATE INDEX IF NOT EXISTS idx_order_items_revision_pending ON order_items(requires_customer_approval) WHERE requires_customer_approval = true;

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

-- Create updated_at triggers for timestamp management
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to relevant tables
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
CREATE TRIGGER update_order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

-- Create function to automatically update order counters when item statuses change
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

-- Log successful migration
SELECT 'Enhanced multi-warehouse order system created successfully' as result;