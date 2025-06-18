-- Add category field to quote_items table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_items') THEN
        -- First ensure the column exists with the correct type
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'quote_items' 
                      AND column_name = 'category') THEN
            ALTER TABLE "public"."quote_items" ADD COLUMN "category" text;
        END IF;

        -- Drop existing constraint if it exists
        ALTER TABLE "public"."quote_items" DROP CONSTRAINT IF EXISTS "quote_items_category_check";

        -- Add the check constraint
        ALTER TABLE "public"."quote_items" ADD CONSTRAINT "quote_items_category_check" 
            CHECK (category IS NULL OR category IN ('electronics', 'clothing', 'home', 'other'));
    END IF;
END $$;

-- Add an index for better query performance
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_items') THEN
        IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'quote_items' AND indexname = 'quote_items_category_idx') THEN
            CREATE INDEX "quote_items_category_idx" ON "public"."quote_items" ("category");
        END IF;
    END IF;
END $$; 