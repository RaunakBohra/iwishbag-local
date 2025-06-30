-- Add status transitions logging table
CREATE TABLE IF NOT EXISTS public.status_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    trigger TEXT NOT NULL CHECK (trigger IN ('payment_received', 'quote_sent', 'order_shipped', 'quote_expired', 'manual', 'auto_calculation')),
    metadata JSONB DEFAULT '{}',
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_status_transitions_quote_id ON public.status_transitions(quote_id);
CREATE INDEX IF NOT EXISTS idx_status_transitions_changed_at ON public.status_transitions(changed_at);
CREATE INDEX IF NOT EXISTS idx_status_transitions_trigger ON public.status_transitions(trigger);

-- Enable RLS
ALTER TABLE public.status_transitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all status transitions" ON public.status_transitions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert status transitions" ON public.status_transitions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can view their own quote status transitions" ON public.status_transitions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.quotes 
            WHERE id = status_transitions.quote_id AND user_id = auth.uid()
        )
    );

-- Function to automatically log status changes
CREATE OR REPLACE FUNCTION public.log_quote_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.status_transitions (
            quote_id,
            from_status,
            to_status,
            trigger,
            changed_by,
            changed_at
        ) VALUES (
            NEW.id,
            COALESCE(OLD.status, 'unknown'),
            NEW.status,
            'manual',
            auth.uid(),
            now()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically log status changes
DROP TRIGGER IF EXISTS trigger_log_quote_status_change ON public.quotes;
CREATE TRIGGER trigger_log_quote_status_change
    AFTER UPDATE ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.log_quote_status_change(); 