-- Add back missing tables that are still being referenced in the application
-- These tables were removed in cleanup but are still needed

-- Create rejection_reasons table
CREATE TABLE IF NOT EXISTS public.rejection_reasons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reason TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    gateway_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create manual_analysis_tasks table
CREATE TABLE IF NOT EXISTS public.manual_analysis_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rejection_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_analysis_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for rejection_reasons
CREATE POLICY "Public read access" ON public.rejection_reasons FOR SELECT USING (true);
CREATE POLICY "Admin full access" ON public.rejection_reasons FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Create policies for payment_transactions
CREATE POLICY "Users can view their own transactions" ON public.payment_transactions FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);
CREATE POLICY "Users can insert their own transactions" ON public.payment_transactions FOR INSERT WITH CHECK (
    user_id = auth.uid()
);
CREATE POLICY "Admin full access to transactions" ON public.payment_transactions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Create policies for manual_analysis_tasks
CREATE POLICY "Admin full access to analysis tasks" ON public.manual_analysis_tasks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Insert some default rejection reasons
INSERT INTO public.rejection_reasons (reason, category) VALUES
('Item not available', 'availability'),
('Price too high', 'pricing'),
('Shipping restrictions', 'shipping'),
('Customs issues', 'customs'),
('Quality concerns', 'quality'),
('Alternative found', 'preference'),
('Budget constraints', 'pricing'),
('Timing issues', 'logistics'),
('Other', 'general')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_quote_id ON public.payment_transactions(quote_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_manual_analysis_tasks_quote_id ON public.manual_analysis_tasks(quote_id);
CREATE INDEX IF NOT EXISTS idx_manual_analysis_tasks_status ON public.manual_analysis_tasks(status);
CREATE INDEX IF NOT EXISTS idx_rejection_reasons_active ON public.rejection_reasons(is_active); 