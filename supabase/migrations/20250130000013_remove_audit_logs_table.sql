-- Remove unused audit_logs table
-- This generic audit logging table was never implemented in the application
-- Quote sharing audit is handled by share_audit_log table instead

-- Drop the table (this will automatically drop all constraints, indexes, and policies)
DROP TABLE IF EXISTS public.audit_logs CASCADE;