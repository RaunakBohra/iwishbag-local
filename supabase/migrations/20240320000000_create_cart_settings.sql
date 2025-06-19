-- Create trigger_set_timestamp function
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'trigger_set_timestamp') THEN
        CREATE FUNCTION public.trigger_set_timestamp()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $function$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $function$;
    END IF;
END $$;

-- Create cart_settings table
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cart_settings') THEN
        CREATE TABLE public.cart_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            bulk_discount_threshold INTEGER NOT NULL DEFAULT 5,
            bulk_discount_percentage NUMERIC NOT NULL DEFAULT 5,
            member_discount_percentage NUMERIC NOT NULL DEFAULT 3,
            seasonal_discount_percentage NUMERIC NOT NULL DEFAULT 2,
            seasonal_discount_start_month INTEGER NOT NULL DEFAULT 11,
            seasonal_discount_end_month INTEGER NOT NULL DEFAULT 12,
            free_shipping_threshold NUMERIC NOT NULL DEFAULT 1000,
            shipping_rate_percentage NUMERIC NOT NULL DEFAULT 10,
            tax_rate_percentage NUMERIC NOT NULL DEFAULT 8,
            is_seasonal_discount_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        -- Enable RLS
        ALTER TABLE public.cart_settings ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY "Enable read access for all users" ON public.cart_settings
            FOR SELECT
            USING (true);

        CREATE POLICY "Enable write access for admins only" ON public.cart_settings
            FOR ALL
            USING (has_role(auth.uid(), 'admin'::app_role));

        -- Create trigger for updated_at
        CREATE TRIGGER set_timestamp
            BEFORE UPDATE ON public.cart_settings
            FOR EACH ROW
            EXECUTE FUNCTION public.trigger_set_timestamp();

        -- Insert default settings only if table is empty
        IF NOT EXISTS (SELECT 1 FROM public.cart_settings) THEN
            INSERT INTO public.cart_settings (
                bulk_discount_threshold,
                bulk_discount_percentage,
                member_discount_percentage,
                seasonal_discount_percentage,
                seasonal_discount_start_month,
                seasonal_discount_end_month,
                free_shipping_threshold,
                shipping_rate_percentage,
                tax_rate_percentage,
                is_seasonal_discount_active
            ) VALUES (
                5,  -- bulk_discount_threshold
                5,  -- bulk_discount_percentage
                3,  -- member_discount_percentage
                2,  -- seasonal_discount_percentage
                11, -- seasonal_discount_start_month (November)
                12, -- seasonal_discount_end_month (December)
                1000, -- free_shipping_threshold
                10, -- shipping_rate_percentage
                8,  -- tax_rate_percentage
                true -- is_seasonal_discount_active
            );
        END IF;
    END IF;
END $$; 