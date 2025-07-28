-- Customer Package Notifications System
-- Allows customers to notify warehouse about incoming packages

-- Customer package notifications table
CREATE TABLE IF NOT EXISTS customer_package_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_address_id UUID NOT NULL REFERENCES customer_addresses(id) ON DELETE CASCADE,
    tracking_number TEXT,
    carrier TEXT NOT NULL CHECK (carrier IN ('ups', 'fedex', 'usps', 'dhl', 'amazon', 'other')),
    sender_name TEXT,
    sender_store TEXT,
    expected_delivery_date DATE,
    estimated_weight_kg DECIMAL(6,2),
    estimated_value_usd DECIMAL(10,2),
    package_description TEXT,
    special_instructions TEXT,
    notification_status TEXT DEFAULT 'pending' CHECK (notification_status IN (
        'pending',
        'acknowledged', 
        'received',
        'not_received',
        'cancelled'
    )),
    warehouse_notes TEXT,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id),
    received_package_id UUID REFERENCES received_packages(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_package_notifications_user_id 
    ON customer_package_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_package_notifications_status 
    ON customer_package_notifications(notification_status);
CREATE INDEX IF NOT EXISTS idx_customer_package_notifications_tracking 
    ON customer_package_notifications(tracking_number) WHERE tracking_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_package_notifications_expected_delivery 
    ON customer_package_notifications(expected_delivery_date) WHERE expected_delivery_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_package_notifications_created_at 
    ON customer_package_notifications(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_customer_package_notifications_updated_at
    BEFORE UPDATE ON customer_package_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE customer_package_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own notifications
CREATE POLICY "Users can view own package notifications" ON customer_package_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own package notifications" ON customer_package_notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own package notifications" ON customer_package_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies for warehouse management
CREATE POLICY "Admins can view all package notifications" ON customer_package_notifications
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update all package notifications" ON customer_package_notifications
    FOR UPDATE USING (is_admin());

-- Function to get package notification statistics
CREATE OR REPLACE FUNCTION get_package_notification_statistics()
RETURNS JSON AS $$
DECLARE
    result JSON;
    avg_response_time DECIMAL;
BEGIN
    -- Calculate average response time in hours
    SELECT AVG(EXTRACT(EPOCH FROM (acknowledged_at - created_at)) / 3600)
    INTO avg_response_time
    FROM customer_package_notifications 
    WHERE acknowledged_at IS NOT NULL;
    
    SELECT json_build_object(
        'total_notifications', (
            SELECT COUNT(*) FROM customer_package_notifications
        ),
        'pending', (
            SELECT COUNT(*) FROM customer_package_notifications 
            WHERE notification_status = 'pending'
        ),
        'acknowledged', (
            SELECT COUNT(*) FROM customer_package_notifications 
            WHERE notification_status = 'acknowledged'
        ),
        'received', (
            SELECT COUNT(*) FROM customer_package_notifications 
            WHERE notification_status = 'received'
        ),
        'not_received', (
            SELECT COUNT(*) FROM customer_package_notifications 
            WHERE notification_status = 'not_received'
        ),
        'cancelled', (
            SELECT COUNT(*) FROM customer_package_notifications 
            WHERE notification_status = 'cancelled'
        ),
        'average_response_time_hours', COALESCE(avg_response_time, 0)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically mark overdue notifications
CREATE OR REPLACE FUNCTION mark_overdue_package_notifications()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE customer_package_notifications 
    SET 
        notification_status = 'not_received',
        updated_at = NOW()
    WHERE 
        notification_status IN ('pending', 'acknowledged')
        AND expected_delivery_date IS NOT NULL 
        AND expected_delivery_date < CURRENT_DATE - INTERVAL '3 days';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notification metrics for dashboard
CREATE OR REPLACE FUNCTION get_notification_response_metrics()
RETURNS TABLE(
    period TEXT,
    total_notifications BIGINT,
    avg_response_hours DECIMAL,
    acknowledgment_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_stats AS (
        SELECT 
            DATE_TRUNC('day', created_at) as period_date,
            COUNT(*) as total,
            AVG(CASE 
                WHEN acknowledged_at IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (acknowledged_at - created_at)) / 3600 
                ELSE NULL 
            END) as avg_hours,
            COUNT(CASE WHEN acknowledged_at IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL as ack_rate
        FROM customer_package_notifications
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY period_date DESC
        LIMIT 30
    )
    SELECT 
        period_date::TEXT,
        total,
        COALESCE(avg_hours, 0),
        COALESCE(ack_rate, 0)
    FROM daily_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send notification alerts (placeholder for integration)
CREATE OR REPLACE FUNCTION trigger_package_notification_alerts()
RETURNS TRIGGER AS $$
BEGIN
    -- This function can be extended to integrate with notification services
    -- For now, it just logs the activity
    
    IF TG_OP = 'INSERT' THEN
        -- New notification submitted
        INSERT INTO admin_activity_logs (
            admin_id,
            action,
            entity_type,
            entity_id,
            details,
            created_at
        ) VALUES (
            NEW.user_id,
            'package_notification_submitted',
            'customer_package_notification',
            NEW.id,
            json_build_object(
                'tracking_number', NEW.tracking_number,
                'carrier', NEW.carrier,
                'expected_delivery', NEW.expected_delivery_date
            ),
            NOW()
        );
        
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        -- Notification status changed
        IF OLD.notification_status != NEW.notification_status THEN
            INSERT INTO admin_activity_logs (
                admin_id,
                action,
                entity_type,
                entity_id,
                details,
                created_at
            ) VALUES (
                COALESCE(NEW.acknowledged_by, NEW.user_id),
                'package_notification_status_changed',
                'customer_package_notification',
                NEW.id,
                json_build_object(
                    'old_status', OLD.notification_status,
                    'new_status', NEW.notification_status,
                    'warehouse_notes', NEW.warehouse_notes
                ),
                NOW()
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for notification alerts
CREATE TRIGGER package_notification_alerts_trigger
    AFTER INSERT OR UPDATE ON customer_package_notifications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_package_notification_alerts();

-- Create a view for admin dashboard with customer details
CREATE OR REPLACE VIEW package_notifications_with_customer AS
SELECT 
    cpn.*,
    p.email,
    p.full_name,
    ca.suite_number,
    ca.full_address
FROM customer_package_notifications cpn
JOIN profiles p ON cpn.user_id = p.id
JOIN customer_addresses ca ON cpn.customer_address_id = ca.id;

-- Grant permissions for the view
GRANT SELECT ON package_notifications_with_customer TO authenticated;

-- Create RLS policy for the view
ALTER VIEW package_notifications_with_customer SET (security_invoker = true);