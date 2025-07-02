-- Add a priority_auto column to quotes to track if priority is auto-assigned or manually set
ALTER TABLE quotes
ADD COLUMN priority_auto BOOLEAN DEFAULT TRUE;

-- (Optional) Add a comment for clarity
COMMENT ON COLUMN quotes.priority_auto IS 'True if priority is auto-assigned based on thresholds, false if manually set.'; 