-- ============================================================================
-- SEPARATE TAGS FROM INTERNAL NOTES
-- This migration adds a dedicated tags field to profiles table
-- and migrates existing tags from internal_notes
-- ============================================================================

-- Add tags column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tags TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.tags IS 'Comma-separated customer tags for categorization and filtering';

-- Create a function to extract tags from internal notes
-- This function identifies comma-separated values that look like tags
CREATE OR REPLACE FUNCTION extract_tags_from_notes(notes TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  tag_array TEXT[];
  cleaned_tags TEXT[];
  tag TEXT;
  common_tags TEXT[] := ARRAY['VIP', 'High Value', 'Frequent Buyer', 'New Customer', 
                              'International', 'Bulk Orders', 'COD Preferred', 
                              'Express Shipping', 'Wholesale', 'Corporate', 
                              'Influencer', 'Return Customer'];
BEGIN
  IF notes IS NULL OR notes = '' THEN
    RETURN NULL;
  END IF;
  
  -- Split by comma
  tag_array := string_to_array(notes, ',');
  
  -- Process each potential tag
  FOREACH tag IN ARRAY tag_array
  LOOP
    tag := TRIM(tag);
    -- Check if it looks like a tag (short, no sentences, matches common patterns)
    IF LENGTH(tag) < 50 AND 
       tag !~ '\.' AND -- No periods (not a sentence)
       tag !~ '\n' AND -- No newlines
       (tag = ANY(common_tags) OR -- Is a known tag
        tag ~ '^[A-Z]' OR -- Starts with capital
        tag !~ ' [a-z]+ [a-z]+ [a-z]+') -- Not a long sentence
    THEN
      cleaned_tags := array_append(cleaned_tags, tag);
    END IF;
  END LOOP;
  
  IF array_length(cleaned_tags, 1) > 0 THEN
    RETURN array_to_string(cleaned_tags, ', ');
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- Create a function to clean notes by removing tags
CREATE OR REPLACE FUNCTION clean_notes_remove_tags(notes TEXT, tags TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned_notes TEXT;
  tag_array TEXT[];
  tag TEXT;
BEGIN
  IF notes IS NULL OR notes = '' THEN
    RETURN NULL;
  END IF;
  
  cleaned_notes := notes;
  
  -- If we have tags to remove
  IF tags IS NOT NULL AND tags != '' THEN
    tag_array := string_to_array(tags, ',');
    
    -- Remove each tag from notes
    FOREACH tag IN ARRAY tag_array
    LOOP
      tag := TRIM(tag);
      -- Remove tag with comma
      cleaned_notes := REPLACE(cleaned_notes, tag || ',', '');
      cleaned_notes := REPLACE(cleaned_notes, ', ' || tag, '');
      -- Remove standalone tag
      cleaned_notes := REPLACE(cleaned_notes, tag, '');
    END LOOP;
    
    -- Clean up multiple commas and spaces
    cleaned_notes := REGEXP_REPLACE(cleaned_notes, ',\s*,', ',', 'g');
    cleaned_notes := REGEXP_REPLACE(cleaned_notes, '^\s*,\s*', '', 'g');
    cleaned_notes := REGEXP_REPLACE(cleaned_notes, '\s*,\s*$', '', 'g');
    cleaned_notes := TRIM(cleaned_notes);
    
    -- If only whitespace or commas left, return NULL
    IF cleaned_notes ~ '^[,\s]*$' THEN
      RETURN NULL;
    END IF;
  END IF;
  
  RETURN cleaned_notes;
END;
$$;

-- Migrate existing tags from internal_notes to tags field
UPDATE profiles
SET 
  tags = extract_tags_from_notes(internal_notes),
  internal_notes = clean_notes_remove_tags(internal_notes, extract_tags_from_notes(internal_notes))
WHERE internal_notes IS NOT NULL;

-- Clean up: Drop the helper functions as they're no longer needed
DROP FUNCTION IF EXISTS extract_tags_from_notes(TEXT);
DROP FUNCTION IF EXISTS clean_notes_remove_tags(TEXT, TEXT);

-- Create index on tags for faster searching
CREATE INDEX IF NOT EXISTS idx_profiles_tags ON profiles USING gin(to_tsvector('english', COALESCE(tags, '')));

-- Add RLS policy for tags (same as other profile fields)
-- The existing profile policies should already cover this, but let's ensure it's clear
COMMENT ON COLUMN profiles.tags IS 'Customer tags - covered by existing RLS policies on profiles table';