-- Fix foreign key references for address management
-- Drop the existing foreign key constraints
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_address_updated_by_fkey;
