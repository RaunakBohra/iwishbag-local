-- Migration: Unify Status System
-- This migration updates old status names and removes approval_status field

-- Step 1: Update old status names to match status management system
UPDATE quotes 
SET status = 'approved' 
WHERE status IN ('accepted', 'confirmed');

UPDATE quotes 
SET status = 'pending' 
WHERE status = 'draft';

-- Step 2: Check if approval_status column exists and migrate if it does
DO $$
BEGIN
    -- Check if approval_status column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'quotes' 
        AND column_name = 'approval_status'
    ) THEN
        -- Migrate approval_status values to status field
        -- Only update where approval_status is not null
        UPDATE quotes 
        SET status = approval_status 
        WHERE approval_status IS NOT NULL;
        
        -- Remove approval_status column
        ALTER TABLE quotes DROP COLUMN approval_status;
    END IF;
END $$;

-- Step 3: Add constraint to ensure status is not null
ALTER TABLE quotes ALTER COLUMN status SET NOT NULL;

-- Step 4: Add check constraint for valid status values (quote statuses)
ALTER TABLE quotes ADD CONSTRAINT valid_quote_status 
CHECK (status IN ('pending', 'sent', 'approved', 'rejected', 'expired', 'calculated'));

-- Step 5: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_status_created ON quotes(status, created_at); 