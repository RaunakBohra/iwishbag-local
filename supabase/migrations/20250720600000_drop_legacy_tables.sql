-- ============================================================================
-- DROP LEGACY TABLES - Clean slate for unified system
-- Since building from scratch with no existing data, remove old structure
-- ============================================================================

-- Drop all dependent objects first to avoid cascade errors
DROP VIEW IF EXISTS payment_summary_view CASCADE;
DROP VIEW IF EXISTS quote_summary_view CASCADE;
DROP VIEW IF EXISTS admin_dashboard_view CASCADE;

-- Drop helper functions that reference old tables
DROP FUNCTION IF EXISTS get_quote_items(quotes_unified) CASCADE;
DROP FUNCTION IF EXISTS validate_quotes_unified() CASCADE;

-- Drop old tables in correct order (child tables first)
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;

-- Update any remaining references to use quotes_unified
-- Note: Most components will need to be updated to use UnifiedDataEngine

-- Rename quotes_unified to quotes for simpler component migration
ALTER TABLE quotes_unified RENAME TO quotes;

-- Update indexes to match new table name
ALTER INDEX quotes_unified_pkey RENAME TO quotes_pkey;
ALTER INDEX idx_quotes_unified_user_id RENAME TO idx_quotes_user_id;
ALTER INDEX idx_quotes_unified_status RENAME TO idx_quotes_status;
ALTER INDEX idx_quotes_unified_destination_country RENAME TO idx_quotes_destination_country;
ALTER INDEX idx_quotes_unified_created_at RENAME TO idx_quotes_created_at;
ALTER INDEX idx_quotes_unified_display_id RENAME TO idx_quotes_display_id;
ALTER INDEX idx_quotes_unified_share_token RENAME TO idx_quotes_share_token;
ALTER INDEX idx_quotes_unified_items_gin RENAME TO idx_quotes_items_gin;
ALTER INDEX idx_quotes_unified_calculation_data_gin RENAME TO idx_quotes_calculation_data_gin;
ALTER INDEX idx_quotes_unified_operational_data_gin RENAME TO idx_quotes_operational_data_gin;
ALTER INDEX idx_quotes_unified_smart_suggestions_gin RENAME TO idx_quotes_smart_suggestions_gin;
ALTER INDEX quotes_unified_display_id_key RENAME TO quotes_display_id_key;

-- Update constraint names
ALTER TABLE quotes RENAME CONSTRAINT quotes_unified_base_total_check TO quotes_base_total_check;
ALTER TABLE quotes RENAME CONSTRAINT quotes_unified_final_total_check TO quotes_final_total_check;
ALTER TABLE quotes RENAME CONSTRAINT quotes_unified_items_not_empty TO quotes_items_not_empty;
ALTER TABLE quotes RENAME CONSTRAINT quotes_unified_weight_confidence_check TO quotes_weight_confidence_check;
ALTER TABLE quotes RENAME CONSTRAINT quotes_unified_optimization_score_check TO quotes_optimization_score_check;
ALTER TABLE quotes RENAME CONSTRAINT quotes_unified_valid_status TO quotes_valid_status;
ALTER TABLE quotes RENAME CONSTRAINT quotes_unified_user_id_fkey TO quotes_user_id_fkey;

-- Update trigger name
DROP TRIGGER IF EXISTS quotes_unified_updated_at ON quotes;
CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_quotes_unified_updated_at();

-- Update comments
COMMENT ON TABLE quotes IS 'Unified quotes table - JSONB-based smart structure (25 columns vs old 94 columns)';
COMMENT ON COLUMN quotes.items IS 'JSONB array of quote items with smart metadata (replaces old quote_items table)';
COMMENT ON COLUMN quotes.calculation_data IS 'All financial calculations, exchange rates, and smart optimizations';
COMMENT ON COLUMN quotes.customer_data IS 'Customer information and shipping address';
COMMENT ON COLUMN quotes.operational_data IS 'Customs, shipping options, payment details, timeline, and admin data';
COMMENT ON COLUMN quotes.smart_suggestions IS 'AI-powered suggestions for optimization';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '🗑️  Legacy tables dropped: quotes (82 cols) + quote_items (12 cols)';
  RAISE NOTICE '✅ Unified table renamed: quotes_unified → quotes';
  RAISE NOTICE '🎯 Clean slate ready: 25 columns with JSONB smart structures';
  RAISE NOTICE '🚀 All components should now use UnifiedDataEngine';
END $$;