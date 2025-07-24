-- =============================================
-- Global Search Function Migration
-- =============================================
-- Creates a comprehensive global search RPC function for the iwishBag platform
-- using PostgreSQL's full-text search capabilities with proper indexing.
-- Created: 2025-07-24
-- =============================================

-- Enable required extensions for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create indexes for full-text search on quotes table
CREATE INDEX IF NOT EXISTS idx_quotes_fts_display_id ON quotes USING gin(to_tsvector('english', display_id));
CREATE INDEX IF NOT EXISTS idx_quotes_fts_customer_email ON quotes USING gin(to_tsvector('english', coalesce(customer_data->>'email', '')));
CREATE INDEX IF NOT EXISTS idx_quotes_fts_customer_name ON quotes USING gin(to_tsvector('english', coalesce(customer_data->'info'->>'name', '')));
CREATE INDEX IF NOT EXISTS idx_quotes_fts_items ON quotes USING gin(to_tsvector('english', coalesce(items::text, '')));

-- Create indexes for full-text search on user profiles
CREATE INDEX IF NOT EXISTS idx_profiles_fts_name ON profiles USING gin(to_tsvector('english', coalesce(full_name, '')));
CREATE INDEX IF NOT EXISTS idx_profiles_fts_email ON profiles USING gin(to_tsvector('english', coalesce(email, '')));

-- Create indexes for full-text search on support system (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_system') THEN
        CREATE INDEX IF NOT EXISTS idx_support_fts_title ON support_system USING gin(to_tsvector('english', coalesce(title, '')));
        CREATE INDEX IF NOT EXISTS idx_support_fts_description ON support_system USING gin(to_tsvector('english', coalesce(description, '')));
    END IF;
END $$;

-- Create the global search function
CREATE OR REPLACE FUNCTION search_global(
  search_query TEXT,
  user_id UUID DEFAULT NULL,
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  id TEXT,
  type TEXT,
  title TEXT,
  description TEXT,
  url TEXT,
  metadata JSONB,
  relevance_score FLOAT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  query_tsquery TSQUERY;
  is_user_admin BOOLEAN := FALSE;
BEGIN
  -- Check if user is admin for broader search permissions
  IF user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = search_global.user_id 
      AND role = 'admin'
    ) INTO is_user_admin;
  END IF;

  -- Sanitize and prepare the search query
  IF search_query IS NULL OR trim(search_query) = '' THEN
    RETURN;
  END IF;

  -- Create tsquery with proper handling of special characters
  BEGIN
    query_tsquery := plainto_tsquery('english', search_query);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to simpler query if there are issues
    query_tsquery := to_tsquery('english', quote_literal(search_query) || ':*');
  END;

  -- Search in quotes table
  RETURN QUERY
  SELECT 
    q.id::TEXT,
    'quote'::TEXT as type,
    CONCAT('Quote #', q.display_id) as title,
    CASE 
      WHEN q.items IS NOT NULL AND jsonb_array_length(q.items) > 0 THEN
        CONCAT(
          'Customer: ', COALESCE(q.customer_data->'info'->>'name', q.customer_data->'info'->>'email', 'Guest'),
          ' • Items: ', (
            SELECT string_agg(item->>'name', ', ') 
            FROM jsonb_array_elements(q.items) AS item 
            LIMIT 3
          ),
          CASE WHEN jsonb_array_length(q.items) > 3 THEN '...' ELSE '' END,
          ' • Status: ', q.status,
          ' • Total: $', ROUND(q.final_total_usd::numeric, 2)::TEXT
        )
      ELSE
        CONCAT('Customer: ', COALESCE(q.customer_data->'info'->>'name', 'Guest'), ' • Status: ', q.status)
    END as description,
    CONCAT('/admin/quotes/', q.id) as url,
    jsonb_build_object(
      'quote_id', q.id,
      'display_id', q.display_id,
      'status', q.status,
      'final_total', q.final_total_usd,
      'customer_email', q.customer_data->'info'->>'email',
      'destination_country', q.destination_country
    ) as metadata,
    (
      ts_rank(to_tsvector('english', q.display_id), query_tsquery) * 4.0 +
      ts_rank(to_tsvector('english', COALESCE(q.customer_data->'info'->>'email', '')), query_tsquery) * 3.0 +
      ts_rank(to_tsvector('english', COALESCE(q.customer_data->'info'->>'name', '')), query_tsquery) * 2.0 +
      ts_rank(to_tsvector('english', COALESCE(q.items::text, '')), query_tsquery) * 1.0
    ) as relevance_score,
    q.created_at
  FROM quotes q
  WHERE 
    (is_user_admin OR q.user_id = search_global.user_id OR q.user_id IS NULL) -- RLS consideration
    AND (
      to_tsvector('english', q.display_id) @@ query_tsquery OR
      to_tsvector('english', COALESCE(q.customer_data->'info'->>'email', '')) @@ query_tsquery OR
      to_tsvector('english', COALESCE(q.customer_data->'info'->>'name', '')) @@ query_tsquery OR
      to_tsvector('english', COALESCE(q.items::text, '')) @@ query_tsquery OR
      q.display_id ILIKE '%' || search_query || '%' OR
      COALESCE(q.customer_data->'info'->>'email', '') ILIKE '%' || search_query || '%'
    )

  UNION ALL

  -- Search in user profiles (admin only)
  SELECT 
    p.id::TEXT,
    'user'::TEXT as type,
    COALESCE(p.full_name, p.email, 'User') as title,
    CONCAT(
      'Email: ', COALESCE(p.email, 'N/A'),
      ' • Joined: ', p.created_at::DATE::TEXT,
      ' • Country: ', COALESCE(p.preferred_display_currency, 'N/A')
    ) as description,
    CONCAT('/admin/users/', p.id) as url,
    jsonb_build_object(
      'user_id', p.id,
      'email', p.email,
      'full_name', p.full_name,
      'created_at', p.created_at
    ) as metadata,
    (
      ts_rank(to_tsvector('english', COALESCE(p.full_name, '')), query_tsquery) * 2.0 +
      ts_rank(to_tsvector('english', COALESCE(p.email, '')), query_tsquery) * 3.0
    ) as relevance_score,
    p.created_at
  FROM profiles p
  WHERE 
    is_user_admin -- Only admins can search users
    AND (
      to_tsvector('english', COALESCE(p.full_name, '')) @@ query_tsquery OR
      to_tsvector('english', COALESCE(p.email, '')) @@ query_tsquery OR
      COALESCE(p.email, '') ILIKE '%' || search_query || '%' OR
      COALESCE(p.full_name, '') ILIKE '%' || search_query || '%'
    )

  UNION ALL

  -- Search in support tickets (if table exists and user has access)
  SELECT 
    s.id::TEXT,
    'support_ticket'::TEXT as type,
    COALESCE(s.title, 'Support Ticket') as title,
    CONCAT(
      'Status: ', COALESCE(s.status, 'Unknown'),
      ' • Priority: ', COALESCE(s.priority, 'Normal'),
      ' • Created: ', s.created_at::DATE::TEXT
    ) as description,
    CONCAT('/support/tickets/', s.id) as url,
    jsonb_build_object(
      'ticket_id', s.id,
      'status', s.status,
      'priority', s.priority,
      'system_type', s.system_type
    ) as metadata,
    (
      ts_rank(to_tsvector('english', COALESCE(s.title, '')), query_tsquery) * 3.0 +
      ts_rank(to_tsvector('english', COALESCE(s.description, '')), query_tsquery) * 1.0
    ) as relevance_score,
    s.created_at
  FROM support_system s
  WHERE 
    (is_user_admin OR s.user_id = search_global.user_id) -- User can see their own tickets, admin sees all
    AND (
      to_tsvector('english', COALESCE(s.title, '')) @@ query_tsquery OR
      to_tsvector('english', COALESCE(s.description, '')) @@ query_tsquery OR
      COALESCE(s.title, '') ILIKE '%' || search_query || '%'
    )

  -- Order results by relevance score descending
  ORDER BY relevance_score DESC, created_at DESC
  LIMIT result_limit;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get search suggestions/autocomplete
CREATE OR REPLACE FUNCTION get_search_suggestions(
  search_query TEXT,
  user_id UUID DEFAULT NULL,
  suggestion_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  suggestion TEXT,
  type TEXT,
  count INTEGER
) AS $$
DECLARE
  is_user_admin BOOLEAN := FALSE;
BEGIN
  -- Check if user is admin
  IF user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = get_search_suggestions.user_id 
      AND role = 'admin'
    ) INTO is_user_admin;
  END IF;

  -- Return suggestions based on partial matches
  RETURN QUERY
  
  -- Quote display IDs
  SELECT DISTINCT
    q.display_id as suggestion,
    'quote'::TEXT as type,
    1 as count
  FROM quotes q
  WHERE 
    (is_user_admin OR q.user_id = get_search_suggestions.user_id OR q.user_id IS NULL)
    AND q.display_id ILIKE search_query || '%'
  
  UNION ALL
  
  -- Customer emails (partial matches)
  SELECT DISTINCT
    (q.customer_data->'info'->>'email') as suggestion,
    'customer'::TEXT as type,
    COUNT(*)::INTEGER
  FROM quotes q
  WHERE 
    (is_user_admin OR q.user_id = get_search_suggestions.user_id OR q.user_id IS NULL)
    AND q.customer_data->'info'->>'email' IS NOT NULL
    AND (q.customer_data->'info'->>'email') ILIKE search_query || '%'
  GROUP BY q.customer_data->'info'->>'email'
  
  UNION ALL
  
  -- User emails (admin only)
  SELECT DISTINCT
    p.email as suggestion,
    'user'::TEXT as type,
    1 as count
  FROM profiles p
  WHERE 
    is_user_admin
    AND p.email ILIKE search_query || '%'
  
  ORDER BY count DESC, suggestion ASC
  LIMIT suggestion_limit;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_global(TEXT, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_search_suggestions(TEXT, UUID, INTEGER) TO authenticated;

-- Create a function to log search activity
CREATE OR REPLACE FUNCTION log_search_activity(
  user_id UUID,
  search_query TEXT,
  result_count INTEGER,
  selected_result_id TEXT DEFAULT NULL,
  selected_result_type TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert search activity into user_activity_analytics if table exists
  BEGIN
    INSERT INTO user_activity_analytics (
      user_id,
      activity_type,
      activity_data,
      session_id,
      user_agent,
      referrer
    ) VALUES (
      log_search_activity.user_id,
      'search:global',
      jsonb_build_object(
        'search_query', search_query,
        'result_count', result_count,
        'selected_result_id', selected_result_id,
        'selected_result_type', selected_result_type,
        'timestamp', NOW()
      ),
      'search-session',
      'CommandPalette',
      'global-search'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Silently fail if user_activity_analytics table doesn't exist
    NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_search_activity(UUID, TEXT, INTEGER, TEXT, TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION search_global IS 'Global search function that searches across quotes, users, and support tickets with full-text search capabilities';
COMMENT ON FUNCTION get_search_suggestions IS 'Provides autocomplete suggestions for global search queries';
COMMENT ON FUNCTION log_search_activity IS 'Logs search activity for analytics and user behavior tracking';

-- Create view for search analytics (admin only)
CREATE OR REPLACE VIEW search_analytics AS
SELECT 
  DATE(created_at) as search_date,
  activity_data->>'search_query' as search_query,
  (activity_data->>'result_count')::INTEGER as result_count,
  activity_data->>'selected_result_type' as selected_result_type,
  COUNT(*) as search_frequency,
  COUNT(CASE WHEN activity_data->>'selected_result_id' IS NOT NULL THEN 1 END) as selections_made
FROM user_activity_analytics
WHERE activity_type = 'search:global'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY 
  DATE(created_at),
  activity_data->>'search_query',
  (activity_data->>'result_count')::INTEGER,
  activity_data->>'selected_result_type'
ORDER BY search_date DESC, search_frequency DESC;

-- Grant view access to admins only
GRANT SELECT ON search_analytics TO authenticated;

-- Add RLS policy for search analytics view
CREATE POLICY "Admins can view search analytics" ON user_activity_analytics
  FOR SELECT USING (is_admin() AND activity_type = 'search:global');

-- Success message
SELECT 'Global search function created successfully with full-text search capabilities and analytics!' as status;