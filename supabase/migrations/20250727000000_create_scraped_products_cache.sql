-- Create scraped_products_cache table for caching product scraping results
CREATE TABLE IF NOT EXISTS scraped_products_cache (
  url TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  source TEXT NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_scraped_products_cache_expires_at 
  ON scraped_products_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_scraped_products_cache_source 
  ON scraped_products_cache(source);

CREATE INDEX IF NOT EXISTS idx_scraped_products_cache_cached_at 
  ON scraped_products_cache(cached_at);

-- Add trigger for updated_at
CREATE TRIGGER update_scraped_products_cache_updated_at 
  BEFORE UPDATE ON scraped_products_cache 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies (allow edge functions to read/write)
ALTER TABLE scraped_products_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access" 
  ON scraped_products_cache 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Allow authenticated users to read cache
CREATE POLICY "Authenticated users can read cache" 
  ON scraped_products_cache 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Add comment
COMMENT ON TABLE scraped_products_cache IS 'Cache for scraped product data to reduce API calls and improve performance';