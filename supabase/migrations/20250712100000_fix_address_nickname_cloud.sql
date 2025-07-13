-- Fix address nickname column if missing in cloud
DO $$ 
BEGIN
    -- Check if nickname column exists in user_addresses table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_addresses' 
        AND column_name = 'nickname'
    ) THEN
        -- Add nickname column if it doesn't exist
        ALTER TABLE public.user_addresses 
        ADD COLUMN nickname TEXT;
        
        RAISE NOTICE 'Added nickname column to user_addresses table';
    ELSE
        RAISE NOTICE 'Nickname column already exists in user_addresses table';
    END IF;
END $$;