-- Remove all warehouse services database tables and related functionality
-- Migration: Remove Warehouse Services
-- Date: 2025-01-30

-- Drop warehouse-related tables if they exist
DROP TABLE IF EXISTS public.warehouse_suite_addresses CASCADE;
DROP TABLE IF EXISTS public.warehouse_locations CASCADE;
DROP TABLE IF EXISTS public.warehouse_storage_benefits CASCADE;
DROP TABLE IF EXISTS public.received_packages CASCADE;
DROP TABLE IF EXISTS public.customer_addresses CASCADE;
DROP TABLE IF EXISTS public.package_notifications CASCADE;
DROP TABLE IF EXISTS public.storage_fees CASCADE;
DROP TABLE IF EXISTS public.package_photos CASCADE;

-- Remove any warehouse-related functions
DROP FUNCTION IF EXISTS public.notify_package_received() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_storage_fees() CASCADE;
DROP FUNCTION IF EXISTS public.assign_warehouse_suite() CASCADE;

-- Remove any warehouse-related triggers
DROP TRIGGER IF EXISTS package_notification_trigger ON public.received_packages;
DROP TRIGGER IF EXISTS storage_fee_calculation_trigger ON public.received_packages;

-- Remove warehouse-related views if they exist
DROP VIEW IF EXISTS public.warehouse_dashboard_view CASCADE;
DROP VIEW IF EXISTS public.package_status_view CASCADE;

-- Remove warehouse-related policies (RLS)
-- No specific policies to remove as tables are dropped

-- Clean up any warehouse-related enums if they exist
DROP TYPE IF EXISTS public.warehouse_status CASCADE;
DROP TYPE IF EXISTS public.package_status CASCADE;
DROP TYPE IF EXISTS public.address_type CASCADE;

-- Remove warehouse-related indexes (they will be removed with table drops)
-- This is just for documentation of what was removed:
-- DROP INDEX IF EXISTS idx_warehouse_suite_addresses_user_id;
-- DROP INDEX IF EXISTS idx_received_packages_status;
-- DROP INDEX IF EXISTS idx_package_notifications_user_id;

COMMENT ON SCHEMA public IS 'Removed all warehouse services functionality - warehouse tables, functions, triggers, and related code have been eliminated';