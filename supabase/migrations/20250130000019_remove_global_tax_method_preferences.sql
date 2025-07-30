-- Remove global_tax_method_preferences table and related objects
-- This tax preference configuration system is not actively used in the codebase

-- Drop the table (this will automatically drop any indexes and policies)
DROP TABLE IF EXISTS public.global_tax_method_preferences CASCADE;

-- Note: The table was designed for hierarchical tax calculation preferences
-- but is currently unused. The application uses direct HSN-based tax calculations instead.