-- Enable PostgreSQL Trigram Extension for Advanced Search
-- Created: 2025-07-21
-- Purpose: Enable pg_trgm extension for pattern matching and fuzzy search

-- Enable the trigram extension for ILIKE pattern matching optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable the text search extension for full-text search capabilities
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Verify extensions are installed
SELECT 
    name, 
    default_version, 
    installed_version,
    comment
FROM pg_available_extensions 
WHERE name IN ('pg_trgm', 'unaccent')
ORDER BY name;

-- Create custom text search configuration for better search results
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS iwishbag_search (COPY = english);

-- Add unaccent support to remove diacritics (for international names/addresses)
ALTER TEXT SEARCH CONFIGURATION iwishbag_search
ALTER MAPPING FOR word, asciiword WITH unaccent, english_stem;