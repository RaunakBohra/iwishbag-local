-- Fix delivery orders RLS policy
DROP POLICY IF EXISTS "Delivery orders follow quote access" ON delivery_orders;

CREATE POLICY "Delivery orders follow quote access"
  ON delivery_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = delivery_orders.quote_id
      AND (quotes.user_id = auth.uid() OR is_admin())
    )
  );

-- Fix delivery status sync trigger
DROP TRIGGER IF EXISTS sync_delivery_status_trigger ON delivery_orders;
DROP FUNCTION IF EXISTS sync_delivery_status_to_quote();

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
  EXECUTE FUNCTION sync_delivery_status_to_quote();