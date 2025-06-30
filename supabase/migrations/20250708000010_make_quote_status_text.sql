-- Migration: Make quote status fully dynamic (TEXT) and add admin-configurable statuses table
-- Step 1: Change the status column to TEXT
ALTER TABLE public.quotes ALTER COLUMN status TYPE TEXT USING status::text;

-- Step 1.5: Remove the default value from status column
ALTER TABLE public.quotes ALTER COLUMN status DROP DEFAULT;

-- Step 2: Drop the old enum type (if not used elsewhere)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_status') THEN
    DROP TYPE public.quote_status;
  END IF;
END $$;

-- Step 3: Create a table for admin-configurable statuses
CREATE TABLE IF NOT EXISTS public.quote_statuses (
  id SERIAL PRIMARY KEY,
  value TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Step 4: Seed initial statuses (customize as needed)
INSERT INTO public.quote_statuses (value, label, color, icon, is_active) VALUES
  ('pending', 'Pending', '#fbbf24', 'clock', TRUE),
  ('sent', 'Sent', '#3b82f6', 'send', TRUE),
  ('approved', 'Approved', '#22c55e', 'check-circle', TRUE),
  ('rejected', 'Rejected', '#ef4444', 'x-circle', TRUE),
  ('expired', 'Expired', '#6b7280', 'hourglass', TRUE)
ON CONFLICT (value) DO NOTHING; 