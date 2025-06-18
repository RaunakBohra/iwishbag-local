-- Add flexible homepage fields to footer_settings
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'footer_settings') THEN
        -- Add hero_banner_url if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'footer_settings' 
                      AND column_name = 'hero_banner_url') THEN
            ALTER TABLE public.footer_settings ADD COLUMN hero_banner_url text;
        END IF;

        -- Add hero_headline if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'footer_settings' 
                      AND column_name = 'hero_headline') THEN
            ALTER TABLE public.footer_settings ADD COLUMN hero_headline text;
        END IF;

        -- Add hero_subheadline if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'footer_settings' 
                      AND column_name = 'hero_subheadline') THEN
            ALTER TABLE public.footer_settings ADD COLUMN hero_subheadline text;
        END IF;

        -- Add hero_cta_text if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'footer_settings' 
                      AND column_name = 'hero_cta_text') THEN
            ALTER TABLE public.footer_settings ADD COLUMN hero_cta_text text;
        END IF;

        -- Add hero_cta_link if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'footer_settings' 
                      AND column_name = 'hero_cta_link') THEN
            ALTER TABLE public.footer_settings ADD COLUMN hero_cta_link text;
        END IF;

        -- Add how_it_works_steps if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'footer_settings' 
                      AND column_name = 'how_it_works_steps') THEN
            ALTER TABLE public.footer_settings ADD COLUMN how_it_works_steps jsonb;
        END IF;

        -- Add value_props if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'footer_settings' 
                      AND column_name = 'value_props') THEN
            ALTER TABLE public.footer_settings ADD COLUMN value_props jsonb;
        END IF;
    END IF;
END $$; 