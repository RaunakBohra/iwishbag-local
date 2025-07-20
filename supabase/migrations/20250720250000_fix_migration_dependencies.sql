-- Fix migration dependencies by dropping dependent views first
-- This allows the nuclear migration to proceed

-- Drop the view that depends on final_total_local
DROP VIEW IF EXISTS payment_summary_view;

-- Drop any other dependent objects that might block the migration
DROP VIEW IF EXISTS quote_summary_view;
DROP VIEW IF EXISTS admin_dashboard_view;

-- The nuclear migration can now proceed