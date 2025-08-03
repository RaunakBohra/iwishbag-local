-- Product Intelligence Support Functions
-- Phase 2: Smart suggestion services database functions

-- Function: Full-text search for product classifications
CREATE OR REPLACE FUNCTION search_product_classifications_fts(
    search_query TEXT,
    target_country VARCHAR(2),
    result_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
    id UUID,
    classification_code VARCHAR(20),
    country_code VARCHAR(2),
    product_name VARCHAR(200),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    description TEXT,
    country_data JSONB,
    typical_weight_kg DECIMAL(8,3),
    weight_variance_factor DECIMAL(4,2),
    typical_dimensions JSONB,
    volume_category VARCHAR(20),
    customs_rate DECIMAL(5,2),
    valuation_method VARCHAR(20),
    minimum_valuation_usd DECIMAL(10,2),
    confidence_score DECIMAL(3,2),
    usage_frequency INTEGER,
    search_keywords TEXT[],
    tags VARCHAR(50)[],
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id,
        pc.classification_code,
        pc.country_code,
        pc.product_name,
        pc.category,
        pc.subcategory,
        pc.description,
        pc.country_data,
        pc.typical_weight_kg,
        pc.weight_variance_factor,
        pc.typical_dimensions,
        pc.volume_category,
        pc.customs_rate,
        pc.valuation_method,
        pc.minimum_valuation_usd,
        pc.confidence_score,
        pc.usage_frequency,
        pc.search_keywords,
        pc.tags,
        pc.created_at,
        pc.updated_at,
        pc.created_by,
        pc.is_active
    FROM product_classifications pc
    WHERE pc.country_code = target_country
    AND pc.is_active = true
    AND to_tsvector('english', 
        COALESCE(pc.product_name, '') || ' ' || 
        COALESCE(pc.category, '') || ' ' || 
        COALESCE(pc.subcategory, '') || ' ' || 
        COALESCE(pc.description, '')
    ) @@ plainto_tsquery('english', search_query)
    ORDER BY 
        ts_rank(
            to_tsvector('english', 
                COALESCE(pc.product_name, '') || ' ' || 
                COALESCE(pc.category, '') || ' ' || 
                COALESCE(pc.subcategory, '') || ' ' || 
                COALESCE(pc.description, '')
            ),
            plainto_tsquery('english', search_query)
        ) DESC,
        pc.confidence_score DESC,
        pc.usage_frequency DESC
    LIMIT result_limit;
END;
$$;

-- Function: Increment classification usage frequency
CREATE OR REPLACE FUNCTION increment_classification_usage(
    classification_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE product_classifications 
    SET 
        usage_frequency = usage_frequency + 1,
        updated_at = NOW()
    WHERE id = classification_id
    AND is_active = true;
END;
$$;

-- Function: Get product suggestions by smart matching
CREATE OR REPLACE FUNCTION get_smart_product_suggestions(
    product_query TEXT,
    target_country VARCHAR(2),
    category_filter VARCHAR(100) DEFAULT NULL,
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    classification_code VARCHAR(20),
    product_name VARCHAR(200),
    category VARCHAR(100),
    customs_rate DECIMAL(5,2),
    typical_weight_kg DECIMAL(8,3),
    confidence_score DECIMAL(3,2),
    match_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    base_confidence DECIMAL(3,2) := 0.5;
BEGIN
    RETURN QUERY
    WITH ranked_suggestions AS (
        SELECT 
            pc.classification_code,
            pc.product_name,
            pc.category,
            COALESCE(pc.customs_rate, cc.default_customs_rate) as customs_rate,
            pc.typical_weight_kg,
            pc.confidence_score,
            CASE 
                WHEN pc.classification_code = UPPER(product_query) THEN 'Exact classification code match'
                WHEN product_query = ANY(pc.search_keywords) THEN 'Keyword match'
                WHEN pc.product_name ILIKE '%' || product_query || '%' THEN 'Product name match'
                WHEN pc.category ILIKE '%' || product_query || '%' THEN 'Category match'
                ELSE 'Full-text search match'
            END as match_reason,
            CASE 
                WHEN pc.classification_code = UPPER(product_query) THEN 1.0
                WHEN product_query = ANY(pc.search_keywords) THEN 0.9
                WHEN pc.product_name ILIKE '%' || product_query || '%' THEN 0.8
                WHEN pc.category ILIKE '%' || product_query || '%' THEN 0.7
                ELSE 0.6
            END as match_score
        FROM product_classifications pc
        JOIN country_configs cc ON pc.country_code = cc.country_code
        WHERE pc.country_code = target_country
        AND pc.is_active = true
        AND (category_filter IS NULL OR pc.category = category_filter)
        AND (
            pc.classification_code = UPPER(product_query) OR
            product_query = ANY(pc.search_keywords) OR
            pc.product_name ILIKE '%' || product_query || '%' OR
            pc.category ILIKE '%' || product_query || '%' OR
            pc.description ILIKE '%' || product_query || '%' OR
            to_tsvector('english', 
                COALESCE(pc.product_name, '') || ' ' || 
                COALESCE(pc.category, '') || ' ' || 
                COALESCE(pc.description, '')
            ) @@ plainto_tsquery('english', product_query)
        )
    )
    SELECT 
        rs.classification_code,
        rs.product_name,
        rs.category,
        rs.customs_rate,
        rs.typical_weight_kg,
        LEAST(rs.confidence_score * rs.match_score, 1.0) as final_confidence,
        rs.match_reason
    FROM ranked_suggestions rs
    ORDER BY 
        rs.match_score DESC,
        rs.confidence_score DESC,
        rs.typical_weight_kg DESC NULLS LAST
    LIMIT result_limit;
END;
$$;

-- Function: Get category statistics for intelligence
CREATE OR REPLACE FUNCTION get_category_intelligence_stats(
    target_country VARCHAR(2)
)
RETURNS TABLE(
    category VARCHAR(100),
    classification_count INTEGER,
    avg_customs_rate DECIMAL(5,2),
    avg_weight_kg DECIMAL(8,3),
    avg_confidence DECIMAL(3,2),
    most_used_classification VARCHAR(20),
    total_usage INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.category,
        COUNT(*)::INTEGER as classification_count,
        ROUND(AVG(COALESCE(pc.customs_rate, cc.default_customs_rate)), 2) as avg_customs_rate,
        ROUND(AVG(pc.typical_weight_kg), 3) as avg_weight_kg,
        ROUND(AVG(pc.confidence_score), 2) as avg_confidence,
        (
            SELECT pc2.classification_code 
            FROM product_classifications pc2 
            WHERE pc2.category = pc.category 
            AND pc2.country_code = target_country
            AND pc2.is_active = true
            ORDER BY pc2.usage_frequency DESC 
            LIMIT 1
        ) as most_used_classification,
        SUM(pc.usage_frequency)::INTEGER as total_usage
    FROM product_classifications pc
    JOIN country_configs cc ON pc.country_code = cc.country_code
    WHERE pc.country_code = target_country
    AND pc.is_active = true
    GROUP BY pc.category
    ORDER BY total_usage DESC, avg_confidence DESC;
END;
$$;

-- Function: Smart weight estimation
CREATE OR REPLACE FUNCTION estimate_product_weight(
    product_query TEXT,
    target_country VARCHAR(2),
    category_hint VARCHAR(100) DEFAULT NULL,
    price_usd DECIMAL(10,2) DEFAULT NULL
)
RETURNS TABLE(
    estimated_weight_kg DECIMAL(8,3),
    confidence_score DECIMAL(3,2),
    estimation_method TEXT,
    classification_used VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    best_match RECORD;
    category_avg DECIMAL(8,3);
    default_weights JSONB;
BEGIN
    -- Default weights by category
    default_weights := '{
        "Electronics": 0.5,
        "Clothing": 0.3,
        "Toys": 0.4,
        "Books": 0.2,
        "Home": 1.0,
        "Sports": 0.8,
        "Beauty": 0.2,
        "Food": 0.5
    }'::JSONB;

    -- Try to find exact product match first
    SELECT INTO best_match
        pc.typical_weight_kg,
        pc.weight_variance_factor,
        pc.classification_code,
        pc.confidence_score
    FROM product_classifications pc
    WHERE pc.country_code = target_country
    AND pc.is_active = true
    AND pc.typical_weight_kg IS NOT NULL
    AND (
        pc.product_name ILIKE '%' || product_query || '%' OR
        product_query = ANY(pc.search_keywords) OR
        to_tsvector('english', pc.product_name || ' ' || COALESCE(pc.description, '')) 
        @@ plainto_tsquery('english', product_query)
    )
    ORDER BY 
        CASE WHEN pc.product_name ILIKE '%' || product_query || '%' THEN 1 ELSE 2 END,
        pc.confidence_score DESC,
        pc.usage_frequency DESC
    LIMIT 1;

    -- If found exact match, use it
    IF best_match.typical_weight_kg IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            (best_match.typical_weight_kg * COALESCE(best_match.weight_variance_factor, 1.0))::DECIMAL(8,3),
            LEAST(best_match.confidence_score * 0.9, 0.95)::DECIMAL(3,2),
            'Product-specific estimation'::TEXT,
            best_match.classification_code::VARCHAR(20);
        RETURN;
    END IF;

    -- Try category-based estimation
    IF category_hint IS NOT NULL THEN
        SELECT INTO category_avg
            AVG(pc.typical_weight_kg)
        FROM product_classifications pc
        WHERE pc.country_code = target_country
        AND pc.category = category_hint
        AND pc.is_active = true
        AND pc.typical_weight_kg IS NOT NULL;

        IF category_avg IS NOT NULL THEN
            RETURN QUERY
            SELECT 
                category_avg::DECIMAL(8,3),
                0.7::DECIMAL(3,2),
                ('Category-based estimation for ' || category_hint)::TEXT,
                NULL::VARCHAR(20);
            RETURN;
        END IF;
    END IF;

    -- Use default weight based on category or generic default
    RETURN QUERY
    SELECT 
        COALESCE(
            (default_weights->category_hint)::TEXT::DECIMAL(8,3),
            0.5::DECIMAL(8,3)
        ),
        0.5::DECIMAL(3,2),
        'Default weight estimation'::TEXT,
        NULL::VARCHAR(20);
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION search_product_classifications_fts TO authenticated;
GRANT EXECUTE ON FUNCTION increment_classification_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_smart_product_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_intelligence_stats TO authenticated;
GRANT EXECUTE ON FUNCTION estimate_product_weight TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Product Intelligence Functions created successfully!';
    RAISE NOTICE 'Functions: search_product_classifications_fts, increment_classification_usage';
    RAISE NOTICE 'Functions: get_smart_product_suggestions, get_category_intelligence_stats';
    RAISE NOTICE 'Functions: estimate_product_weight';
    RAISE NOTICE 'All functions granted to authenticated users';
END $$;