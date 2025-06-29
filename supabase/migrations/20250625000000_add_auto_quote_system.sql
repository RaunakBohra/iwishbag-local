-- Migration: Add Auto Quote System
-- Date: 2025-06-25
-- Description: Adds comprehensive auto quote functionality with rules engine

-- Add quote_type to existing quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_type TEXT DEFAULT 'manual' CHECK (quote_type IN ('manual', 'auto'));
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS applied_rules JSONB DEFAULT '[]';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS scraped_data JSONB DEFAULT '{}';

-- Auto quote settings table
CREATE TABLE IF NOT EXISTS auto_quote_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website_domain TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  confidence_threshold NUMERIC(3,2) DEFAULT 0.7,
  markup_percentage NUMERIC(5,2) DEFAULT 0,
  weight_estimation_method TEXT DEFAULT 'scraped',
  price_validation TEXT DEFAULT 'exact',
  auto_approval_limit NUMERIC(10,2) DEFAULT 0,
  requires_admin_review BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Website scraping rules
CREATE TABLE IF NOT EXISTS website_scraping_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_domain TEXT NOT NULL UNIQUE,
  selectors JSONB NOT NULL,
  price_extraction JSONB NOT NULL,
  weight_extraction JSONB NOT NULL,
  validation_rules JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customs rules engine
CREATE TABLE IF NOT EXISTS customs_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  advanced JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pricing rules engine
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  advanced JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Weight rules engine
CREATE TABLE IF NOT EXISTS weight_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  advanced JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto quote analytics
CREATE TABLE IF NOT EXISTS auto_quote_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id),
  rule_performance JSONB NOT NULL,
  processing_time NUMERIC(5,2),
  success_rate NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_quote_type ON quotes(quote_type);
CREATE INDEX IF NOT EXISTS idx_quotes_confidence ON quotes(confidence_score);
CREATE INDEX IF NOT EXISTS idx_customs_rules_priority ON customs_rules(priority);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_priority ON pricing_rules(priority);
CREATE INDEX IF NOT EXISTS idx_weight_rules_priority ON weight_rules(priority);
CREATE INDEX IF NOT EXISTS idx_auto_quote_settings_domain ON auto_quote_settings(website_domain);
CREATE INDEX IF NOT EXISTS idx_website_scraping_rules_domain ON website_scraping_rules(website_domain);

-- Add RLS policies for auto quote tables
ALTER TABLE auto_quote_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_scraping_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE customs_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_quote_analytics ENABLE ROW LEVEL SECURITY;

-- Admin policies for auto quote settings
CREATE POLICY "Admin can manage auto quote settings" ON auto_quote_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage website scraping rules" ON website_scraping_rules
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage customs rules" ON customs_rules
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage pricing rules" ON pricing_rules
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage weight rules" ON weight_rules
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can view auto quote analytics" ON auto_quote_analytics
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Insert default auto quote settings for common websites
INSERT INTO auto_quote_settings (name, website_domain, is_active, confidence_threshold, markup_percentage, auto_approval_limit) VALUES
  ('Amazon US', 'amazon.com', true, 0.8, 5.0, 500.00),
  ('eBay', 'ebay.com', true, 0.7, 8.0, 300.00),
  ('Walmart', 'walmart.com', true, 0.75, 6.0, 400.00),
  ('Target', 'target.com', true, 0.75, 6.0, 400.00);

-- Insert default website scraping rules
INSERT INTO website_scraping_rules (website_domain, selectors, price_extraction, weight_extraction, validation_rules) VALUES
  ('amazon.com', 
   '{"price": "#priceblock_ourprice, .a-price-whole, [data-a-color=\"price\"] .a-offscreen", "title": "#productTitle", "weight": ".product-weight, .a-text-bold:contains(\"Weight\")", "images": ".product-image img, #landingImage", "availability": "#availability"}',
   '{"method": "text", "currencySymbol": "$", "decimalSeparator": ".", "thousandsSeparator": ","}',
   '{"method": "text", "unitConversion": {"ounces": 0.0283495, "lbs": 0.453592}, "patterns": ["(\\d+(?:\\.\\d+)?)\\s*(ounces?|lbs?)"]}',
   '{"minPrice": 1, "maxPrice": 10000, "minWeight": 0.01, "maxWeight": 100}'
  ),
  ('ebay.com',
   '{"price": ".x-price-primary .ux-textspans, [data-testid=\"x-price-primary\"]", "title": ".x-item-title__mainTitle h1", "weight": ".x-item-condition__text", "images": ".ux-image-carousel-item img"}',
   '{"method": "text", "currencySymbol": "$", "decimalSeparator": ".", "thousandsSeparator": ","}',
   '{"method": "estimated", "fallbackWeight": 0.5}',
   '{"minPrice": 1, "maxPrice": 5000, "minWeight": 0.01, "maxWeight": 50}'
  );

-- Insert default customs rules
INSERT INTO customs_rules (name, priority, conditions, actions) VALUES
  ('Electronics under 1kg', 1, 
   '{"weightRange": {"min": 0, "max": 1}, "categories": ["electronics"], "priceRange": {"min": 0, "max": 1000}}',
   '{"customsCategory": "electronics_light", "dutyPercentage": 12.5, "requiresDocumentation": false}'
  ),
  ('Electronics over 1kg', 2,
   '{"weightRange": {"min": 1, "max": 999999}, "categories": ["electronics"]}',
   '{"customsCategory": "electronics_heavy", "dutyPercentage": 18.5, "requiresDocumentation": true}'
  ),
  ('Clothing luxury', 3,
   '{"categories": ["clothing", "fashion"], "priceRange": {"min": 200, "max": 999999}}',
   '{"customsCategory": "clothing_luxury", "dutyPercentage": 25.0, "fixedDuty": 10}'
  ),
  ('General items', 10,
   '{}',
   '{"customsCategory": "general", "dutyPercentage": 0}'
  );

-- Insert default pricing rules
INSERT INTO pricing_rules (name, priority, conditions, actions) VALUES
  ('High-value electronics markup', 1,
   '{"categories": ["electronics"], "priceRange": {"min": 500, "max": 999999}}',
   '{"markupType": "percentage", "markupValue": 8.5, "minimumMarkup": 25, "maximumMarkup": 200}'
  ),
  ('Clothing tiered pricing', 2,
   '{"categories": ["clothing"]}',
   '{"markupType": "tiered", "tieredMarkup": {"tiers": [{"minPrice": 0, "maxPrice": 50, "markup": 15}, {"minPrice": 50, "maxPrice": 200, "markup": 12}, {"minPrice": 200, "maxPrice": 999999, "markup": 10}]}}'
  ),
  ('Default markup', 10,
   '{}',
   '{"markupType": "percentage", "markupValue": 5.0}'
  );

-- Insert default weight rules
INSERT INTO weight_rules (name, priority, conditions, actions) VALUES
  ('Smartphone weight estimation', 1,
   '{"categories": ["electronics"], "keywords": ["phone", "smartphone", "iPhone"], "priceRange": {"min": 200, "max": 1500}}',
   '{"weightType": "fixed", "weightValue": 0.187, "confidence": 0.95}'
  ),
  ('Clothing weight by price', 2,
   '{"categories": ["clothing"]}',
   '{"weightType": "calculated", "weightCalculation": {"baseWeight": 0.1, "priceMultiplier": 0.02}, "confidence": 0.7}'
  ),
  ('Default weight estimation', 10,
   '{}',
   '{"weightType": "fixed", "weightValue": 0.5, "confidence": 0.5}'
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_auto_quote_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_auto_quote_settings_updated_at
  BEFORE UPDATE ON auto_quote_settings
  FOR EACH ROW EXECUTE FUNCTION update_auto_quote_updated_at();

CREATE TRIGGER update_website_scraping_rules_updated_at
  BEFORE UPDATE ON website_scraping_rules
  FOR EACH ROW EXECUTE FUNCTION update_auto_quote_updated_at();

CREATE TRIGGER update_customs_rules_updated_at
  BEFORE UPDATE ON customs_rules
  FOR EACH ROW EXECUTE FUNCTION update_auto_quote_updated_at();

CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_auto_quote_updated_at();

CREATE TRIGGER update_weight_rules_updated_at
  BEFORE UPDATE ON weight_rules
  FOR EACH ROW EXECUTE FUNCTION update_auto_quote_updated_at(); 