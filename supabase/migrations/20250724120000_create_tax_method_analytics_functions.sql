-- TAX METHOD ANALYTICS RPC FUNCTIONS
-- Supporting advanced analytics for TaxMethodSelectionPanel component
-- 
-- These functions provide comprehensive analysis of tax calculation method
-- performance, historical trends, and optimization recommendations.

-- Function: Analyze tax method performance for a specific route
CREATE OR REPLACE FUNCTION analyze_tax_method_performance(
  p_origin_country TEXT,
  p_destination_country TEXT,
  p_time_range_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  total_quotes INTEGER;
  method_stats JSONB;
BEGIN
  -- Initialize result structure
  result := '{}'::JSONB;
  
  -- Get total quotes for the route in time range
  SELECT COUNT(*)
  INTO total_quotes
  FROM quotes
  WHERE origin_country = p_origin_country
    AND destination_country = p_destination_country
    AND created_at >= NOW() - INTERVAL '1 day' * p_time_range_days;
  
  result := jsonb_set(result, '{total_quotes}', to_jsonb(total_quotes));
  
  -- Analyze each calculation method
  WITH method_analysis AS (
    SELECT 
      COALESCE(calculation_method_preference, 'auto') as method,
      COUNT(*) as usage_count,
      AVG(CASE WHEN status IN ('approved', 'paid', 'ordered', 'shipped', 'completed') THEN 1.0 ELSE 0.0 END) as success_rate,
      AVG(CASE WHEN status = 'approved' THEN 1.0 ELSE 0.0 END) as approval_rate,
      AVG(CASE 
        WHEN operational_data ? 'admin_overrides' 
        THEN jsonb_array_length(operational_data->'admin_overrides') 
        ELSE 0 
      END) as avg_overrides,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_total) as median_total,
      STDDEV(final_total) as cost_variance
    FROM quotes
    WHERE origin_country = p_origin_country
      AND destination_country = p_destination_country
      AND created_at >= NOW() - INTERVAL '1 day' * p_time_range_days
    GROUP BY COALESCE(calculation_method_preference, 'auto')
  )
  SELECT jsonb_object_agg(
    method,
    jsonb_build_object(
      'usage_count', usage_count,
      'success_rate', ROUND(success_rate::NUMERIC, 3),
      'approval_rate', ROUND(approval_rate::NUMERIC, 3),
      'override_rate', ROUND((avg_overrides / GREATEST(usage_count, 1))::NUMERIC, 3),
      'accuracy', ROUND((success_rate * 0.7 + approval_rate * 0.3)::NUMERIC, 3),
      'cost_diff', ROUND(((median_total - (SELECT AVG(final_total) FROM quotes WHERE origin_country = p_origin_country AND destination_country = p_destination_country AND created_at >= NOW() - INTERVAL '1 day' * p_time_range_days)) / GREATEST((SELECT AVG(final_total) FROM quotes WHERE origin_country = p_origin_country AND destination_country = p_destination_country AND created_at >= NOW() - INTERVAL '1 day' * p_time_range_days), 1) * 100)::NUMERIC, 2)
    )
  )
  INTO method_stats
  FROM method_analysis;
  
  -- Add method stats to result
  result := result || COALESCE(method_stats, '{}'::JSONB);
  
  -- Calculate overall metrics
  WITH overall_metrics AS (
    SELECT 
      AVG(CASE WHEN status IN ('approved', 'paid', 'ordered', 'shipped', 'completed') THEN 1.0 ELSE 0.0 END) as average_accuracy,
      jsonb_object_agg(
        COALESCE(calculation_method_preference, 'auto'),
        COUNT(*)
      ) as method_distribution,
      SUM(CASE 
        WHEN calculation_method_preference = 'hsn_only' AND final_total < (SELECT AVG(final_total) FROM quotes WHERE origin_country = p_origin_country AND destination_country = p_destination_country AND created_at >= NOW() - INTERVAL '1 day' * p_time_range_days)
        THEN (SELECT AVG(final_total) FROM quotes WHERE origin_country = p_origin_country AND destination_country = p_destination_country AND created_at >= NOW() - INTERVAL '1 day' * p_time_range_days) - final_total
        ELSE 0
      END) as cost_savings_potential
    FROM quotes
    WHERE origin_country = p_origin_country
      AND destination_country = p_destination_country
      AND created_at >= NOW() - INTERVAL '1 day' * p_time_range_days
  )
  SELECT 
    jsonb_set(
      jsonb_set(
        jsonb_set(result, '{average_accuracy}', to_jsonb(ROUND(average_accuracy::NUMERIC, 3))),
        '{method_distribution}', method_distribution
      ),
      '{cost_savings_potential}', to_jsonb(ROUND(cost_savings_potential::NUMERIC, 2))
    )
  INTO result
  FROM overall_metrics;
  
  RETURN COALESCE(result, '{}'::JSONB);
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return empty result on error
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'total_quotes', 0,
      'average_accuracy', 0,
      'method_distribution', '{}',
      'cost_savings_potential', 0
    );
END;
$$;

-- Function: Bulk update tax calculation methods for multiple quotes
CREATE OR REPLACE FUNCTION bulk_update_tax_methods(
  p_quote_ids TEXT[],
  p_admin_id TEXT,
  p_calculation_method TEXT,
  p_change_reason TEXT DEFAULT 'Bulk update via admin panel'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
  failed_count INTEGER := 0;
  quote_id TEXT;
  result JSONB;
BEGIN
  -- Validate admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id::TEXT = p_admin_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions - admin role required',
      'updated', 0,
      'failed', array_length(p_quote_ids, 1)
    );
  END IF;
  
  -- Process each quote
  FOREACH quote_id IN ARRAY p_quote_ids
  LOOP
    BEGIN
      -- Update the quote
      UPDATE quotes 
      SET 
        calculation_method_preference = p_calculation_method,
        updated_at = NOW()
      WHERE id = quote_id::UUID;
      
      -- Log the change
      INSERT INTO admin_activity_log (
        admin_id,
        action_type,
        target_type,
        target_id,
        action_details,
        created_at
      ) VALUES (
        p_admin_id::UUID,
        'bulk_tax_method_update',
        'quote',
        quote_id::UUID,
        jsonb_build_object(
          'calculation_method', p_calculation_method,
          'change_reason', p_change_reason,
          'bulk_operation', true,
          'total_quotes', array_length(p_quote_ids, 1)
        ),
        NOW()
      );
      
      updated_count := updated_count + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        failed_count := failed_count + 1;
        -- Log the failure
        INSERT INTO admin_activity_log (
          admin_id,
          action_type,
          target_type,
          target_id,
          action_details,
          created_at
        ) VALUES (
          p_admin_id::UUID,
          'bulk_tax_method_update_failed',
          'quote',
          quote_id::UUID,
          jsonb_build_object(
            'error', SQLERRM,
            'calculation_method', p_calculation_method,
            'bulk_operation', true
          ),
          NOW()
        );
    END;
  END LOOP;
  
  -- Return summary
  result := jsonb_build_object(
    'success', failed_count = 0,
    'updated', updated_count,
    'failed', failed_count,
    'total_processed', array_length(p_quote_ids, 1),
    'method_applied', p_calculation_method,
    'timestamp', NOW()
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'updated', updated_count,
      'failed', failed_count + (array_length(p_quote_ids, 1) - updated_count - failed_count)
    );
END;
$$;

-- Function: Get tax method optimization recommendations
CREATE OR REPLACE FUNCTION get_tax_method_recommendations(
  p_origin_country TEXT,
  p_destination_country TEXT,
  p_analysis_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  hsn_availability BOOLEAN;
  route_data_quality NUMERIC;
  recommended_method TEXT;
  confidence_score NUMERIC;
BEGIN
  -- Check HSN data availability
  SELECT EXISTS(
    SELECT 1 FROM hsn_master 
    WHERE is_active = true 
    LIMIT 1
  ) INTO hsn_availability;
  
  -- Check route data quality
  SELECT COALESCE(
    (SELECT 
      CASE 
        WHEN customs_percent IS NOT NULL AND vat_percent IS NOT NULL THEN 1.0
        WHEN customs_percent IS NOT NULL OR vat_percent IS NOT NULL THEN 0.7
        ELSE 0.4
      END
    FROM shipping_routes 
    WHERE origin_country = p_origin_country 
      AND destination_country = p_destination_country 
      AND is_active = true
    LIMIT 1),
    (SELECT 
      CASE 
        WHEN customs_percent IS NOT NULL AND vat_percent IS NOT NULL THEN 0.8
        WHEN customs_percent IS NOT NULL OR vat_percent IS NOT NULL THEN 0.5
        ELSE 0.3
      END
    FROM country_settings 
    WHERE code = p_destination_country 
      AND is_supported = true
    LIMIT 1),
    0.2
  ) INTO route_data_quality;
  
  -- Determine recommended method based on data availability and performance
  IF hsn_availability AND route_data_quality > 0.8 THEN
    recommended_method := 'auto';
    confidence_score := 0.95;
  ELSIF hsn_availability THEN
    recommended_method := 'hsn_only';
    confidence_score := 0.85;
  ELSIF route_data_quality > 0.6 THEN
    recommended_method := 'legacy_fallback';
    confidence_score := route_data_quality;
  ELSE
    recommended_method := 'admin_choice';
    confidence_score := 0.7;
  END IF;
  
  -- Build comprehensive recommendation
  result := jsonb_build_object(
    'recommended_method', recommended_method,
    'confidence_score', ROUND(confidence_score::NUMERIC, 3),
    'hsn_availability', hsn_availability,
    'route_data_quality', ROUND(route_data_quality::NUMERIC, 3),
    'analysis_period_days', p_analysis_days,
    'generated_at', NOW(),
    'route', p_origin_country || ' → ' || p_destination_country,
    'recommendations', jsonb_build_array(
      CASE 
        WHEN recommended_method = 'auto' THEN 
          'Use Auto method for best balance of accuracy and reliability'
        WHEN recommended_method = 'hsn_only' THEN 
          'HSN per-item calculation available - use for maximum accuracy'
        WHEN recommended_method = 'legacy_fallback' THEN 
          'Route data available - legacy calculation recommended'
        ELSE 
          'Limited data available - manual admin selection required'
      END,
      CASE 
        WHEN hsn_availability AND route_data_quality < 0.6 THEN
          'Consider configuring shipping routes for better fallback options'
        WHEN NOT hsn_availability THEN
          'Consider adding HSN codes to items for per-item accuracy'
        ELSE
          'Data configuration looks good for this route'
      END
    )
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'recommended_method', 'admin_choice',
      'confidence_score', 0.5,
      'generated_at', NOW()
    );
END;
$$;

-- Function: Get effective tax calculation method for a quote
CREATE OR REPLACE FUNCTION get_effective_tax_method(quote_id_param UUID)
RETURNS TABLE(
  effective_method TEXT,
  method_source TEXT,
  confidence_score NUMERIC,
  data_availability JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  quote_method TEXT;
  quote_origin TEXT;
  quote_destination TEXT;
  hsn_available BOOLEAN;
  route_available BOOLEAN;
BEGIN
  -- Get quote details
  SELECT 
    COALESCE(calculation_method_preference, 'auto'),
    origin_country,
    destination_country
  INTO quote_method, quote_origin, quote_destination
  FROM quotes
  WHERE id = quote_id_param;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      'auto'::TEXT,
      'default'::TEXT,
      0.5::NUMERIC,
      '{}'::JSONB;
    RETURN;
  END IF;
  
  -- Check data availability
  SELECT EXISTS(
    SELECT 1 FROM hsn_master WHERE is_active = true LIMIT 1
  ) INTO hsn_available;
  
  SELECT EXISTS(
    SELECT 1 FROM shipping_routes 
    WHERE origin_country = quote_origin 
      AND destination_country = quote_destination 
      AND is_active = true
  ) INTO route_available;
  
  -- Return effective method based on preference and availability
  RETURN QUERY SELECT 
    CASE 
      WHEN quote_method = 'auto' THEN
        CASE 
          WHEN hsn_available AND route_available THEN 'auto'
          WHEN hsn_available THEN 'hsn_only'
          WHEN route_available THEN 'legacy_fallback'
          ELSE 'admin_choice'
        END
      ELSE quote_method
    END::TEXT as effective_method,
    CASE 
      WHEN quote_method = 'auto' THEN 'intelligent_selection'
      WHEN quote_method IN ('hsn_only', 'legacy_fallback', 'admin_choice') THEN 'admin_preference'
      ELSE 'system_default'
    END::TEXT as method_source,
    CASE 
      WHEN hsn_available AND route_available THEN 0.95
      WHEN hsn_available OR route_available THEN 0.8
      ELSE 0.6
    END::NUMERIC as confidence_score,
    jsonb_build_object(
      'hsn_available', hsn_available,
      'route_available', route_available,
      'quote_preference', quote_method,
      'route', quote_origin || ' → ' || quote_destination
    ) as data_availability;
END;
$$;

-- Grant permissions to authenticated users (admin role required for most functions)
GRANT EXECUTE ON FUNCTION analyze_tax_method_performance(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_tax_methods(TEXT[], TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tax_method_recommendations(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_effective_tax_method(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION analyze_tax_method_performance IS 'Analyzes historical performance of tax calculation methods for route optimization';
COMMENT ON FUNCTION bulk_update_tax_methods IS 'Updates calculation method for multiple quotes with admin audit logging';
COMMENT ON FUNCTION get_tax_method_recommendations IS 'Provides intelligent recommendations for tax calculation method selection';
COMMENT ON FUNCTION get_effective_tax_method IS 'Determines the actual tax method that will be used for a quote based on preferences and data availability';