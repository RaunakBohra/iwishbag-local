-- Restore customs_categories table (was dropped by mistake)
CREATE TABLE IF NOT EXISTS public.customs_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    duty_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.customs_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON public.customs_categories FOR SELECT USING (true); 