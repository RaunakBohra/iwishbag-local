-- ============================================================================
-- SLA SUMMARY FUNCTION
-- Function to calculate SLA performance statistics
-- ============================================================================

-- Function to get SLA summary statistics
CREATE OR REPLACE FUNCTION get_sla_summary()
RETURNS TABLE (
  total_tickets INTEGER,
  response_sla_met INTEGER,
  response_sla_breached INTEGER,
  resolution_sla_met INTEGER,
  resolution_sla_breached INTEGER,
  avg_response_time_hours NUMERIC,
  avg_resolution_time_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_tickets,
    
    -- Response SLA metrics
    COUNT(CASE 
      WHEN first_response_at IS NOT NULL 
      AND response_sla_deadline IS NOT NULL 
      AND first_response_at <= response_sla_deadline 
      THEN 1 
    END)::INTEGER as response_sla_met,
    
    COUNT(CASE 
      WHEN (sla_breach_flags->>'response_breach')::boolean IS TRUE 
      THEN 1 
    END)::INTEGER as response_sla_breached,
    
    -- Resolution SLA metrics  
    COUNT(CASE 
      WHEN resolved_at IS NOT NULL 
      AND resolution_sla_deadline IS NOT NULL 
      AND resolved_at <= resolution_sla_deadline 
      THEN 1 
    END)::INTEGER as resolution_sla_met,
    
    COUNT(CASE 
      WHEN (sla_breach_flags->>'resolution_breach')::boolean IS TRUE 
      THEN 1 
    END)::INTEGER as resolution_sla_breached,
    
    -- Average response time in hours
    COALESCE(AVG(
      CASE 
        WHEN first_response_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600 
      END
    ), 0)::NUMERIC as avg_response_time_hours,
    
    -- Average resolution time in hours
    COALESCE(AVG(
      CASE 
        WHEN resolved_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 
      END
    ), 0)::NUMERIC as avg_resolution_time_hours
    
  FROM support_tickets
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'; -- Last 30 days
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on function
COMMENT ON FUNCTION get_sla_summary() IS 'Returns SLA performance statistics for the last 30 days';