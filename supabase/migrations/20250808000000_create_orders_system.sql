-- Create Orders System Tables
-- Comprehensive order management system with proper relationships

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Order status and tracking
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment', 'payment_pending', 'confirmed', 'processing', 
    'shipped', 'delivered', 'completed', 'cancelled', 'refunded'
  )),
  tracking_id text UNIQUE,
  
  -- Financial information
  total_amount decimal(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payment_method text,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'processing', 'completed', 'failed', 'refunded', 'partial'
  )),
  amount_paid decimal(12,2) DEFAULT 0,
  
  -- Delivery information
  delivery_address jsonb,
  delivery_method text,
  estimated_delivery_date timestamptz,
  actual_delivery_date timestamptz,
  
  -- Order metadata
  order_data jsonb DEFAULT '{}',
  admin_notes text,
  customer_notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  shipped_at timestamptz,
  delivered_at timestamptz,
  
  -- Constraints
  CONSTRAINT valid_amount CHECK (total_amount >= 0),
  CONSTRAINT valid_paid_amount CHECK (amount_paid >= 0 AND amount_paid <= total_amount)
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  
  -- Item details
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price decimal(12,2) NOT NULL DEFAULT 0,
  total_price decimal(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  currency text NOT NULL DEFAULT 'USD',
  
  -- Item metadata
  item_data jsonb DEFAULT '{}',
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Create order_status_history table for tracking status changes
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Status change details
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason text,
  
  -- Timestamps
  created_at timestamptz DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_id ON orders(tracking_id) WHERE tracking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_quote_id ON order_items(quote_id) WHERE quote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating updated_at
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

-- Create function to track status changes
CREATE OR REPLACE FUNCTION track_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (
      order_id,
      previous_status,
      new_status,
      changed_by,
      change_reason
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(), -- Current authenticated user
      CASE 
        WHEN NEW.admin_notes IS DISTINCT FROM OLD.admin_notes 
        THEN NEW.admin_notes 
        ELSE NULL 
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status change tracking
DROP TRIGGER IF EXISTS track_order_status_changes ON orders;
CREATE TRIGGER track_order_status_changes
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION track_order_status_change();

-- Create RLS policies for orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Orders policies
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;
CREATE POLICY "Users can insert their own orders" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
CREATE POLICY "Users can update their own orders" ON orders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL TO authenticated
  USING (is_admin());

-- Order items policies
DROP POLICY IF EXISTS "Users can view their order items" ON order_items;
CREATE POLICY "Users can view their order items" ON order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their order items" ON order_items;
CREATE POLICY "Users can manage their order items" ON order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all order items" ON order_items;
CREATE POLICY "Admins can manage all order items" ON order_items
  FOR ALL TO authenticated
  USING (is_admin());

-- Order status history policies
DROP POLICY IF EXISTS "Users can view their order history" ON order_status_history;
CREATE POLICY "Users can view their order history" ON order_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_status_history.order_id 
      AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert status history" ON order_status_history;
CREATE POLICY "System can insert status history" ON order_status_history
  FOR INSERT TO authenticated
  WITH CHECK (true); -- Allow system to track all status changes

DROP POLICY IF EXISTS "Admins can manage all order history" ON order_status_history;
CREATE POLICY "Admins can manage all order history" ON order_status_history
  FOR ALL TO authenticated
  USING (is_admin());

-- Create helpful views
CREATE OR REPLACE VIEW orders_with_details AS
SELECT 
  o.*,
  COUNT(oi.id) as item_count,
  COALESCE(SUM(oi.total_price), 0) as calculated_total,
  u.email as customer_email,
  p.full_name as customer_name,
  p.phone as customer_phone
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN auth.users u ON o.user_id = u.id
LEFT JOIN profiles p ON o.user_id = p.id
GROUP BY o.id, u.email, p.full_name, p.phone;

-- Grant necessary permissions
GRANT ALL ON orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON order_status_history TO authenticated;
GRANT SELECT ON orders_with_details TO authenticated;

-- Add helpful comments
COMMENT ON TABLE orders IS 'Main orders table containing order information and status';
COMMENT ON TABLE order_items IS 'Individual items within each order, linked to quotes';
COMMENT ON TABLE order_status_history IS 'Tracks all status changes for orders with timestamps';
COMMENT ON VIEW orders_with_details IS 'Comprehensive view of orders with calculated totals and customer details';

-- Log successful creation
SELECT 'Orders system tables created successfully' as result;