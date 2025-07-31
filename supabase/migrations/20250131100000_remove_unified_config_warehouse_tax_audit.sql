-- Remove unified_configuration, warehouse_tasks, and tax_calculation_audit_log tables
-- Migration: 20250131100000_remove_unified_config_warehouse_tax_audit.sql

-- Step 1: Drop triggers first
DROP TRIGGER IF EXISTS quotes_tax_method_audit_trigger ON quotes;
DROP TRIGGER IF EXISTS tax_method_audit_trigger ON quotes;

-- Step 2: Drop functions that depend on these tables
DROP FUNCTION IF EXISTS get_packages_approaching_fees(integer);
DROP FUNCTION IF EXISTS calculate_and_create_storage_fees();
DROP FUNCTION IF EXISTS trigger_tax_method_audit() CASCADE;
DROP FUNCTION IF EXISTS log_tax_method_change(uuid, uuid, text, text, text, jsonb);

-- Step 3: Drop the tables (with CASCADE to handle any remaining dependencies)
DROP TABLE IF EXISTS tax_calculation_audit_log CASCADE;
DROP TABLE IF EXISTS warehouse_tasks CASCADE; 
DROP TABLE IF EXISTS unified_configuration CASCADE;

-- Step 4: Cleanup complete - tables and related functions removed
-- Tables removed: unified_configuration, warehouse_tasks, tax_calculation_audit_log
-- Functions removed: get_packages_approaching_fees, calculate_and_create_storage_fees, trigger_tax_method_audit, log_tax_method_change