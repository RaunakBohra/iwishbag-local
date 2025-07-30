-- Remove credit note system tables and functions
-- This system was never implemented in the application

-- First, update our recent migration's function to remove credit note references
-- Since we already modified credit_note_applications table in the previous migration,
-- we need to handle this carefully

-- Drop functions that use credit notes
DROP FUNCTION IF EXISTS public.apply_credit_note(uuid, uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.create_credit_note(uuid, text, uuid, numeric, text, text, text, date, numeric, text[], text[], text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.generate_credit_note_number() CASCADE;
DROP FUNCTION IF EXISTS public.get_available_credit_notes(numeric, uuid) CASCADE;

-- Drop views if any exist
DROP VIEW IF EXISTS public.credit_note_summary CASCADE;
DROP VIEW IF EXISTS public.available_credit_notes CASCADE;

-- Drop the tables in correct order (dependencies first)
DROP TABLE IF EXISTS public.credit_note_applications CASCADE;
DROP TABLE IF EXISTS public.credit_note_history CASCADE;
DROP TABLE IF EXISTS public.credit_notes CASCADE;

-- Drop any indexes that might remain
DROP INDEX IF EXISTS public.idx_credit_note_applications_note;
DROP INDEX IF EXISTS public.idx_credit_note_applications_quote;
DROP INDEX IF EXISTS public.idx_credit_note_applications_status;
DROP INDEX IF EXISTS public.idx_credit_note_history_action;
DROP INDEX IF EXISTS public.idx_credit_note_history_note;
DROP INDEX IF EXISTS public.idx_credit_notes_customer;
DROP INDEX IF EXISTS public.idx_credit_notes_status;
DROP INDEX IF EXISTS public.idx_credit_notes_valid_dates;

-- Remove any RLS policies
DROP POLICY IF EXISTS "Users can apply their credit notes" ON public.credit_note_applications;
DROP POLICY IF EXISTS "Users can view their credit note applications" ON public.credit_note_applications;
DROP POLICY IF EXISTS "Admins can manage credit note applications" ON public.credit_note_applications;
DROP POLICY IF EXISTS "Users can view their credit notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Admins can manage credit notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Admins can view credit note history" ON public.credit_note_history;