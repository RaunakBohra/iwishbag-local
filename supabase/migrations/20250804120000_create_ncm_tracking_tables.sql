-- NCM Order Tracking System Tables
-- Migration: 20250804120000_create_ncm_tracking_tables.sql

-- Main NCM order tracking table
CREATE TABLE IF NOT EXISTS ncm_order_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ncm_order_id INTEGER NOT NULL UNIQUE,
  iwishbag_order_id UUID NOT NULL,
  tracking_id TEXT NOT NULL UNIQUE,
  current_status TEXT NOT NULL DEFAULT 'pending',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  customer_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  pickup_branch TEXT NOT NULL,
  destination_branch TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('Pickup', 'Collect')),
  cod_amount DECIMAL(10,2),
  estimated_delivery DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key to orders table
  CONSTRAINT fk_ncm_tracking_order 
    FOREIGN KEY (iwishbag_order_id) 
    REFERENCES orders(id) 
    ON DELETE CASCADE
);

-- NCM tracking status history table
CREATE TABLE IF NOT EXISTS ncm_tracking_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ncm_order_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  iwishbag_status TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  location TEXT,
  remarks TEXT,
  updated_by TEXT DEFAULT 'NCM API',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key to tracking table
  CONSTRAINT fk_ncm_history_tracking 
    FOREIGN KEY (ncm_order_id) 
    REFERENCES ncm_order_tracking(ncm_order_id) 
    ON DELETE CASCADE,
    
  -- Unique constraint to prevent duplicate status entries
  CONSTRAINT unique_ncm_status_timestamp 
    UNIQUE (ncm_order_id, timestamp)
);

-- Customer notification preferences for NCM orders
CREATE TABLE IF NOT EXISTS ncm_notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sms_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  notification_types TEXT[] DEFAULT ARRAY['status_change', 'delivery_attempt', 'delivered'],
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key to profiles
  CONSTRAINT fk_ncm_notifications_user 
    FOREIGN KEY (user_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE,
    
  -- One preference record per user
  CONSTRAINT unique_user_notification_preference 
    UNIQUE (user_id)
);

-- NCM notification delivery log
CREATE TABLE IF NOT EXISTS ncm_notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('sms', 'email', 'push')),
  recipient TEXT NOT NULL,
  message_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key to tracking table
  CONSTRAINT fk_ncm_notification_tracking 
    FOREIGN KEY (tracking_id) 
    REFERENCES ncm_order_tracking(tracking_id) 
    ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ncm_tracking_iwishbag_order ON ncm_order_tracking(iwishbag_order_id);
CREATE INDEX IF NOT EXISTS idx_ncm_tracking_status ON ncm_order_tracking(current_status);
CREATE INDEX IF NOT EXISTS idx_ncm_tracking_updated ON ncm_order_tracking(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_ncm_tracking_customer_phone ON ncm_order_tracking(customer_phone);

CREATE INDEX IF NOT EXISTS idx_ncm_history_order ON ncm_tracking_history(ncm_order_id);
CREATE INDEX IF NOT EXISTS idx_ncm_history_timestamp ON ncm_tracking_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ncm_history_status ON ncm_tracking_history(iwishbag_status);

CREATE INDEX IF NOT EXISTS idx_ncm_notifications_user ON ncm_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_ncm_notification_log_tracking ON ncm_notification_log(tracking_id);
CREATE INDEX IF NOT EXISTS idx_ncm_notification_log_status ON ncm_notification_log(status);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ncm_tracking_updated_at 
  BEFORE UPDATE ON ncm_order_tracking 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ncm_notifications_updated_at 
  BEFORE UPDATE ON ncm_notification_preferences 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE ncm_order_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncm_tracking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncm_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncm_notification_log ENABLE ROW LEVEL SECURITY;

-- Admin users can see all tracking data
CREATE POLICY "Admins can view all NCM tracking" ON ncm_order_tracking
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can view all NCM history" ON ncm_tracking_history
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can view all NCM notifications" ON ncm_notification_preferences
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can view all NCM notification logs" ON ncm_notification_log
  FOR ALL USING (is_admin());

-- Users can view their own tracking data via orders
CREATE POLICY "Users can view own NCM tracking" ON ncm_order_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = ncm_order_tracking.iwishbag_order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Users can view their own tracking history
CREATE POLICY "Users can view own NCM history" ON ncm_tracking_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ncm_order_tracking nt
      JOIN orders o ON o.id = nt.iwishbag_order_id
      WHERE nt.ncm_order_id = ncm_tracking_history.ncm_order_id 
      AND o.user_id = auth.uid()
    )
  );

-- Users can manage their own notification preferences
CREATE POLICY "Users can manage own notification preferences" ON ncm_notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Users can view their own notification logs
CREATE POLICY "Users can view own notification logs" ON ncm_notification_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ncm_order_tracking nt
      JOIN orders o ON o.id = nt.iwishbag_order_id
      WHERE nt.tracking_id = ncm_notification_log.tracking_id 
      AND o.user_id = auth.uid()
    )
  );

-- Service role policies for background operations
CREATE POLICY "Service role can manage NCM tracking" ON ncm_order_tracking
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage NCM history" ON ncm_tracking_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage NCM notifications" ON ncm_notification_log
  FOR ALL USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE ncm_order_tracking IS 'Main tracking table for NCM (Nepal Can Move) delivery orders';
COMMENT ON TABLE ncm_tracking_history IS 'Status history and timeline for NCM orders';
COMMENT ON TABLE ncm_notification_preferences IS 'Customer notification preferences for NCM deliveries';
COMMENT ON TABLE ncm_notification_log IS 'Log of all notifications sent for NCM orders';

COMMENT ON COLUMN ncm_order_tracking.ncm_order_id IS 'NCM API order ID';
COMMENT ON COLUMN ncm_order_tracking.iwishbag_order_id IS 'iwishBag internal order ID';
COMMENT ON COLUMN ncm_order_tracking.tracking_id IS 'Customer-facing iwishBag tracking ID (IWB format)';
COMMENT ON COLUMN ncm_order_tracking.current_status IS 'Current iwishBag order status (mapped from NCM status)';
COMMENT ON COLUMN ncm_order_tracking.service_type IS 'NCM service type: Pickup (door delivery) or Collect (branch pickup)';

-- NCM Order Creation Failures Log
CREATE TABLE IF NOT EXISTS ncm_order_creation_failures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  iwishbag_order_id UUID NOT NULL,
  error_message TEXT NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  retry_count INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for efficient querying
  CONSTRAINT fk_ncm_failure_order 
    FOREIGN KEY (iwishbag_order_id) 
    REFERENCES orders(id) 
    ON DELETE CASCADE
);

-- Add NCM order tracking fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS ncm_order_id INTEGER,
ADD COLUMN IF NOT EXISTS ncm_tracking_id TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ncm_failures_order ON ncm_order_creation_failures(iwishbag_order_id);
CREATE INDEX IF NOT EXISTS idx_ncm_failures_attempted ON ncm_order_creation_failures(attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_ncm_failures_resolved ON ncm_order_creation_failures(resolved);

CREATE INDEX IF NOT EXISTS idx_orders_ncm_order_id ON orders(ncm_order_id) WHERE ncm_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_ncm_tracking_id ON orders(ncm_tracking_id) WHERE ncm_tracking_id IS NOT NULL;

-- RLS Policies for failure log
ALTER TABLE ncm_order_creation_failures ENABLE ROW LEVEL SECURITY;

-- Admin users can see all failure logs
CREATE POLICY "Admins can view all NCM creation failures" ON ncm_order_creation_failures
  FOR ALL USING (is_admin());

-- Service role policies for background operations
CREATE POLICY "Service role can manage NCM creation failures" ON ncm_order_creation_failures
  FOR ALL USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE ncm_order_creation_failures IS 'Log of failed NCM order creation attempts for monitoring and retry';
COMMENT ON COLUMN ncm_order_creation_failures.iwishbag_order_id IS 'iwishBag order ID that failed NCM order creation';
COMMENT ON COLUMN ncm_order_creation_failures.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN ncm_order_creation_failures.resolved IS 'Whether the failure has been resolved successfully';

COMMENT ON COLUMN orders.ncm_order_id IS 'NCM API order ID for Nepal deliveries';
COMMENT ON COLUMN orders.ncm_tracking_id IS 'iwishBag tracking ID for NCM orders';

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ncm_order_tracking TO authenticated, anon;
GRANT ALL ON ncm_tracking_history TO authenticated, anon;
GRANT ALL ON ncm_notification_preferences TO authenticated, anon;
GRANT ALL ON ncm_notification_log TO authenticated, anon;
GRANT ALL ON ncm_order_creation_failures TO authenticated, anon;