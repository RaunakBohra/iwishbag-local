-- Recreate rejection_reasons table
-- This table is needed for the quote rejection functionality in the admin interface

CREATE TABLE IF NOT EXISTS public.rejection_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default rejection reasons
INSERT INTO public.rejection_reasons (reason, category, is_active) VALUES
('Item not available', 'availability', true),
('Price too high', 'pricing', true),
('Shipping restrictions', 'shipping', true),
('Customs restrictions', 'customs', true),
('Quality concerns', 'quality', true),
('Customer request', 'customer', true),
('Payment issues', 'payment', true),
('Duplicate request', 'administrative', true),
('Insufficient information', 'administrative', true),
('Other', 'general', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.rejection_reasons ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Everyone can view active rejection reasons" ON public.rejection_reasons
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage rejection reasons" ON public.rejection_reasons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'moderator')
        )
    );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rejection_reasons_is_active ON public.rejection_reasons(is_active);
CREATE INDEX IF NOT EXISTS idx_rejection_reasons_category ON public.rejection_reasons(category);