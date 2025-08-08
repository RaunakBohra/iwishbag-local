-- =====================================================
-- Create Pricing Audit System
-- =====================================================
-- Comprehensive audit logging for all pricing changes
-- Tracks user actions, changes, and maintains compliance
-- Created: 2025-08-08

-- =====================================================
-- 1. PRICING CHANGE LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pricing_change_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Service and pricing context
    service_id uuid REFERENCES addon_services(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL CHECK (change_type IN (
        'country', 'regional', 'continental', 'global', 'bulk'
    )),
    
    -- Target identification
    identifier TEXT NOT NULL, -- country code, region key, continent name, or 'global'
    identifier_name TEXT, -- Human-readable name for the identifier
    
    -- Change details
    old_rate DECIMAL(10,6),
    new_rate DECIMAL(10,6) NOT NULL,
    old_min_amount DECIMAL(10,2),
    new_min_amount DECIMAL(10,2),
    old_max_amount DECIMAL(10,2),
    new_max_amount DECIMAL(10,2),
    
    -- Audit metadata
    changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    change_reason TEXT NOT NULL,
    change_method TEXT NOT NULL DEFAULT 'manual' CHECK (change_method IN (
        'manual', 'bulk', 'csv_import', 'api', 'scheduled'
    )),
    
    -- Additional context
    affected_countries INTEGER DEFAULT 1,
    batch_id uuid, -- For grouping bulk operations
    session_id TEXT, -- User session identifier
    ip_address TEXT,
    user_agent TEXT,
    
    -- Timestamps
    effective_from TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Indexing
    UNIQUE(id)
);

-- =====================================================
-- 2. PRICING APPROVAL SYSTEM (Future Enhancement)
-- =====================================================

CREATE TABLE IF NOT EXISTS pricing_change_approvals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    change_log_id uuid REFERENCES pricing_change_log(id) ON DELETE CASCADE,
    
    -- Approval workflow
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'auto_approved'
    )),
    
    -- Approval metadata
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approval_reason TEXT,
    approval_threshold_met BOOLEAN DEFAULT false,
    
    -- Business rules
    requires_approval BOOLEAN DEFAULT false,
    impact_level TEXT CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    estimated_revenue_impact DECIMAL(12,2),
    
    -- Timestamps
    submitted_at TIMESTAMPTZ DEFAULT now(),
    approved_at TIMESTAMPTZ,
    
    UNIQUE(id)
);

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary query patterns
CREATE INDEX IF NOT EXISTS idx_pricing_change_log_service_id ON pricing_change_log(service_id);
CREATE INDEX IF NOT EXISTS idx_pricing_change_log_change_type ON pricing_change_log(change_type);
CREATE INDEX IF NOT EXISTS idx_pricing_change_log_identifier ON pricing_change_log(identifier);
CREATE INDEX IF NOT EXISTS idx_pricing_change_log_changed_by ON pricing_change_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_pricing_change_log_created_at ON pricing_change_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_change_log_batch_id ON pricing_change_log(batch_id) WHERE batch_id IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pricing_change_log_service_type_date ON pricing_change_log(service_id, change_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_change_log_user_date ON pricing_change_log(changed_by, created_at DESC);

-- Approval system indexes
CREATE INDEX IF NOT EXISTS idx_pricing_approvals_status ON pricing_change_approvals(status);
CREATE INDEX IF NOT EXISTS idx_pricing_approvals_change_log ON pricing_change_approvals(change_log_id);

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE pricing_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_change_approvals ENABLE ROW LEVEL SECURITY;

-- Admin users can see everything
CREATE POLICY "Admins can view all pricing change logs" ON pricing_change_log
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert pricing change logs" ON pricing_change_log
    FOR INSERT WITH CHECK (is_admin());

-- Users can see their own changes
CREATE POLICY "Users can view own pricing changes" ON pricing_change_log
    FOR SELECT USING (changed_by = auth.uid());

-- Approval system policies
CREATE POLICY "Admins can manage approvals" ON pricing_change_approvals
    FOR ALL USING (is_admin());

-- =====================================================
-- 5. AUDIT FUNCTIONS
-- =====================================================

-- Function to log pricing changes
CREATE OR REPLACE FUNCTION log_pricing_change(
    p_service_id uuid,
    p_change_type text,
    p_identifier text,
    p_identifier_name text,
    p_old_rate decimal,
    p_new_rate decimal,
    p_old_min_amount decimal DEFAULT NULL,
    p_new_min_amount decimal DEFAULT NULL,
    p_old_max_amount decimal DEFAULT NULL,
    p_new_max_amount decimal DEFAULT NULL,
    p_change_reason text DEFAULT 'Manual update',
    p_change_method text DEFAULT 'manual',
    p_affected_countries integer DEFAULT 1,
    p_batch_id uuid DEFAULT NULL,
    p_session_id text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO pricing_change_log (
        service_id,
        change_type,
        identifier,
        identifier_name,
        old_rate,
        new_rate,
        old_min_amount,
        new_min_amount,
        old_max_amount,
        new_max_amount,
        changed_by,
        change_reason,
        change_method,
        affected_countries,
        batch_id,
        session_id,
        ip_address,
        user_agent
    ) VALUES (
        p_service_id,
        p_change_type,
        p_identifier,
        p_identifier_name,
        p_old_rate,
        p_new_rate,
        p_old_min_amount,
        p_new_min_amount,
        p_old_max_amount,
        p_new_max_amount,
        auth.uid(),
        p_change_reason,
        p_change_method,
        p_affected_countries,
        p_batch_id,
        p_session_id,
        current_setting('request.headers', true)::json->>'x-forwarded-for',
        current_setting('request.headers', true)::json->>'user-agent'
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pricing change history
CREATE OR REPLACE FUNCTION get_pricing_change_history(
    p_service_id uuid DEFAULT NULL,
    p_identifier text DEFAULT NULL,
    p_days_back integer DEFAULT 30,
    p_limit integer DEFAULT 100
) RETURNS TABLE (
    id uuid,
    service_name text,
    change_type text,
    identifier text,
    identifier_name text,
    old_rate decimal,
    new_rate decimal,
    change_reason text,
    change_method text,
    user_email text,
    affected_countries integer,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pcl.id,
        ads.service_name,
        pcl.change_type,
        pcl.identifier,
        pcl.identifier_name,
        pcl.old_rate,
        pcl.new_rate,
        pcl.change_reason,
        pcl.change_method,
        COALESCE(au.email, 'System') as user_email,
        pcl.affected_countries,
        pcl.created_at
    FROM pricing_change_log pcl
    LEFT JOIN addon_services ads ON pcl.service_id = ads.id
    LEFT JOIN auth.users au ON pcl.changed_by = au.id
    WHERE 
        (p_service_id IS NULL OR pcl.service_id = p_service_id)
        AND (p_identifier IS NULL OR pcl.identifier = p_identifier)
        AND pcl.created_at >= now() - (p_days_back || ' days')::interval
    ORDER BY pcl.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pricing statistics
CREATE OR REPLACE FUNCTION get_pricing_audit_stats(
    p_days_back integer DEFAULT 7
) RETURNS TABLE (
    total_changes integer,
    changes_by_method jsonb,
    changes_by_type jsonb,
    most_active_users jsonb,
    most_changed_services jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::integer as total_changes,
        
        jsonb_object_agg(
            pcl.change_method, 
            method_counts.count
        ) as changes_by_method,
        
        jsonb_object_agg(
            pcl.change_type, 
            type_counts.count
        ) as changes_by_type,
        
        (SELECT jsonb_object_agg(user_email, change_count)
         FROM (
             SELECT COALESCE(au.email, 'System') as user_email, COUNT(*) as change_count
             FROM pricing_change_log pcl2
             LEFT JOIN auth.users au ON pcl2.changed_by = au.id
             WHERE pcl2.created_at >= now() - (p_days_back || ' days')::interval
             GROUP BY au.email
             ORDER BY change_count DESC
             LIMIT 5
         ) user_stats) as most_active_users,
         
        (SELECT jsonb_object_agg(service_name, change_count)
         FROM (
             SELECT ads.service_name, COUNT(*) as change_count
             FROM pricing_change_log pcl3
             LEFT JOIN addon_services ads ON pcl3.service_id = ads.id
             WHERE pcl3.created_at >= now() - (p_days_back || ' days')::interval
             GROUP BY ads.service_name
             ORDER BY change_count DESC
             LIMIT 5
         ) service_stats) as most_changed_services
         
    FROM pricing_change_log pcl
    LEFT JOIN (
        SELECT change_method, COUNT(*) as count
        FROM pricing_change_log
        WHERE created_at >= now() - (p_days_back || ' days')::interval
        GROUP BY change_method
    ) method_counts ON pcl.change_method = method_counts.change_method
    LEFT JOIN (
        SELECT change_type, COUNT(*) as count
        FROM pricing_change_log
        WHERE created_at >= now() - (p_days_back || ' days')::interval
        GROUP BY change_type
    ) type_counts ON pcl.change_type = type_counts.change_type
    WHERE pcl.created_at >= now() - (p_days_back || ' days')::interval
    GROUP BY total_changes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. TRIGGERS FOR AUTOMATIC LOGGING
-- =====================================================

-- Trigger function for country pricing overrides
CREATE OR REPLACE FUNCTION trigger_log_country_pricing_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if the rate actually changed
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.rate != NEW.rate) THEN
        PERFORM log_pricing_change(
            NEW.service_id,
            'country',
            NEW.country_code,
            (SELECT name FROM country_settings WHERE code = NEW.country_code),
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.rate ELSE NULL END,
            NEW.rate,
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.min_amount ELSE NULL END,
            NEW.min_amount,
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.max_amount ELSE NULL END,
            NEW.max_amount,
            COALESCE(NEW.reason, 'Automatic trigger'),
            'manual'
        );
    END IF;
    
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_country_pricing_audit ON country_pricing_overrides;
CREATE TRIGGER trigger_country_pricing_audit
    AFTER INSERT OR UPDATE ON country_pricing_overrides
    FOR EACH ROW EXECUTE FUNCTION trigger_log_country_pricing_change();

-- =====================================================
-- 7. COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE pricing_change_log IS 'Comprehensive audit log for all pricing changes across the system';
COMMENT ON TABLE pricing_change_approvals IS 'Approval workflow for pricing changes requiring authorization';

COMMENT ON FUNCTION log_pricing_change IS 'Core function to log pricing changes with full context and metadata';
COMMENT ON FUNCTION get_pricing_change_history IS 'Retrieve pricing change history with filtering and pagination';
COMMENT ON FUNCTION get_pricing_audit_stats IS 'Generate audit statistics and analytics for reporting';

-- =====================================================
-- AUDIT SYSTEM COMPLETE
-- =====================================================