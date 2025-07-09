-- Migration: Remove Unused Auto Quote System Tables
-- Date: 2025-07-10
-- Description: Removes unused auto quote tables while keeping customs_rules which is still in use

-- Drop triggers first (only for tables we're removing)
DROP TRIGGER IF EXISTS update_auto_quote_settings_updated_at ON auto_quote_settings;
DROP TRIGGER IF EXISTS update_website_scraping_rules_updated_at ON website_scraping_rules;
DROP TRIGGER IF EXISTS update_pricing_rules_updated_at ON pricing_rules;
DROP TRIGGER IF EXISTS update_weight_rules_updated_at ON weight_rules;
DROP TRIGGER IF EXISTS update_customs_rules_updated_at ON customs_rules;

-- Drop the update function if no other tables use it
DROP FUNCTION IF EXISTS update_auto_quote_updated_at();

-- Drop indexes (only for tables we're removing)
DROP INDEX IF EXISTS idx_quotes_quote_type;
DROP INDEX IF EXISTS idx_quotes_confidence;
DROP INDEX IF EXISTS idx_pricing_rules_priority;
DROP INDEX IF EXISTS idx_weight_rules_priority;
DROP INDEX IF EXISTS idx_auto_quote_settings_domain;
DROP INDEX IF EXISTS idx_website_scraping_rules_domain;

-- Drop unused tables (keeping customs_rules as it's still in use)
DROP TABLE IF EXISTS auto_quote_analytics CASCADE;
DROP TABLE IF EXISTS weight_rules CASCADE;
DROP TABLE IF EXISTS pricing_rules CASCADE;
DROP TABLE IF EXISTS website_scraping_rules CASCADE;
DROP TABLE IF EXISTS auto_quote_settings CASCADE;

-- Remove columns from quotes table that were added for auto quote functionality
ALTER TABLE quotes DROP COLUMN IF EXISTS quote_type;
ALTER TABLE quotes DROP COLUMN IF EXISTS confidence_score;
ALTER TABLE quotes DROP COLUMN IF EXISTS applied_rules;
ALTER TABLE quotes DROP COLUMN IF EXISTS scraped_data;