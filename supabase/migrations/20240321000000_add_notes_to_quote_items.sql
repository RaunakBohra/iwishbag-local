-- Create quotes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes') THEN
        CREATE TABLE public.quotes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            display_id TEXT UNIQUE,
            order_display_id TEXT UNIQUE,
            user_id UUID NOT NULL,
            status TEXT NOT NULL,
            approval_status TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
        );
    END IF;
END $$;

-- Create quote_items table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_items') THEN
        CREATE TABLE public.quote_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            quote_id UUID NOT NULL,
            item_name TEXT NOT NULL,
            item_price NUMERIC NOT NULL,
            quantity INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE
        );
    END IF;
END $$;

-- Add notes column to quote_items table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_items') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'quote_items' 
                      AND column_name = 'notes') THEN
            ALTER TABLE public.quote_items ADD COLUMN notes TEXT;
        END IF;
    END IF;
END $$;

-- Add avatar_url column to profiles table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'profiles' 
                      AND column_name = 'avatar_url') THEN
            ALTER TABLE "public"."profiles" ADD COLUMN "avatar_url" text;
        END IF;
    END IF;
END $$;