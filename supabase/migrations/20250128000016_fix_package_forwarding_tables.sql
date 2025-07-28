-- ============================================================================
-- Fix Package Forwarding Tables
-- ============================================================================
-- This migration fixes two critical issues:
-- 1. Adds missing columns to storage_fees table
-- 2. Adds missing INSERT policy for consolidation_groups table

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO STORAGE_FEES TABLE
-- ============================================================================

-- Add fee_type column to categorize different types of fees
ALTER TABLE storage_fees 
ADD COLUMN IF NOT EXISTS fee_type text DEFAULT 'storage'
CHECK (fee_type IN ('storage', 'handling', 'late', 'other'));

-- Add notes column for additional information
ALTER TABLE storage_fees 
ADD COLUMN IF NOT EXISTS notes text;

-- Add updated_at column for consistency
ALTER TABLE storage_fees 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_storage_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_storage_fees_updated_at
BEFORE UPDATE ON storage_fees
FOR EACH ROW
EXECUTE FUNCTION update_storage_fees_updated_at();

-- ============================================================================
-- 2. ADD MISSING RLS POLICIES FOR CONSOLIDATION_GROUPS
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE consolidation_groups ENABLE ROW LEVEL SECURITY;

-- Add INSERT policy - Users can create their own consolidation groups
CREATE POLICY "Users can create own consolidation groups" 
ON public.consolidation_groups 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add DELETE policy for completeness - Users can delete their own pending groups
CREATE POLICY "Users can delete own pending consolidation groups" 
ON public.consolidation_groups 
FOR DELETE 
USING (
  auth.uid() = user_id 
  AND status = 'pending'
);

-- Admin policies for full access
CREATE POLICY "Admins can insert consolidation groups" 
ON public.consolidation_groups 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete any consolidation groups" 
ON public.consolidation_groups 
FOR DELETE 
USING (public.is_admin());

-- ============================================================================
-- 3. ADD MISSING RLS POLICIES FOR STORAGE_FEES
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE storage_fees ENABLE ROW LEVEL SECURITY;

-- Add INSERT policy - System/Admins can create storage fees
CREATE POLICY "Admins can insert storage fees" 
ON public.storage_fees 
FOR INSERT 
WITH CHECK (public.is_admin());

-- Add UPDATE policy - Users can update their own unpaid fees
CREATE POLICY "Users can update own unpaid storage fees" 
ON public.storage_fees 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND is_paid = false
)
WITH CHECK (
  auth.uid() = user_id
);

-- Add DELETE policy - Admins only
CREATE POLICY "Admins can delete storage fees" 
ON public.storage_fees 
FOR DELETE 
USING (public.is_admin());

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for fee_type queries
CREATE INDEX IF NOT EXISTS idx_storage_fees_fee_type 
ON storage_fees(fee_type);

-- Index for unpaid fees queries
CREATE INDEX IF NOT EXISTS idx_storage_fees_unpaid 
ON storage_fees(user_id, is_paid) 
WHERE is_paid = false;

-- Index for consolidation groups by status
CREATE INDEX IF NOT EXISTS idx_consolidation_groups_status 
ON consolidation_groups(user_id, status);

-- ============================================================================
-- 5. UPDATE EXISTING DATA (if any)
-- ============================================================================

-- Set default fee_type for existing records
UPDATE storage_fees 
SET fee_type = 'storage' 
WHERE fee_type IS NULL;

-- ============================================================================
-- 6. GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Ensure authenticated users can work with these tables
GRANT SELECT, INSERT, UPDATE ON consolidation_groups TO authenticated;
GRANT SELECT ON storage_fees TO authenticated;
GRANT UPDATE ON storage_fees TO authenticated;

-- Comments for documentation
COMMENT ON COLUMN storage_fees.fee_type IS 'Type of fee: storage, handling, late, or other';
COMMENT ON COLUMN storage_fees.notes IS 'Additional notes or details about the fee';
COMMENT ON POLICY "Users can create own consolidation groups" ON consolidation_groups IS 'Allows users to create consolidation groups for their own packages';
COMMENT ON POLICY "Users can view own storage fees" ON storage_fees IS 'Allows users to view their own storage fees';