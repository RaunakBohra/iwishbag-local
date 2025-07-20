-- ============================================================================
-- ML WEIGHT ESTIMATOR PERSISTENT STORAGE
-- Tables for storing learned weight data and training history
-- ============================================================================

-- Create table for storing learned product weights
CREATE TABLE IF NOT EXISTS ml_product_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  normalized_name text NOT NULL, -- Lowercase, trimmed version for matching
  weight_kg numeric(8,3) NOT NULL,
  confidence numeric(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  category text,
  brand text,
  learned_from_url text,
  training_count integer DEFAULT 1,
  accuracy_score numeric(3,2), -- Average accuracy of this weight
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  
  -- Constraints
  CONSTRAINT valid_weight CHECK (weight_kg > 0 AND weight_kg <= 100),
  CONSTRAINT unique_normalized_name UNIQUE (normalized_name)
);

-- Create table for category weight statistics
CREATE TABLE IF NOT EXISTS ml_category_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE,
  min_weight numeric(8,3) NOT NULL,
  max_weight numeric(8,3) NOT NULL,
  avg_weight numeric(8,3) NOT NULL,
  sample_count integer DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_category_weights CHECK (min_weight <= avg_weight AND avg_weight <= max_weight)
);

-- Create table for ML training history
CREATE TABLE IF NOT EXISTS ml_training_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  estimated_weight numeric(8,3) NOT NULL,
  actual_weight numeric(8,3) NOT NULL,
  confidence numeric(3,2) NOT NULL,
  accuracy numeric(3,2) NOT NULL, -- (1 - abs(estimated - actual) / actual) * 100
  url text,
  category text,
  brand text,
  user_confirmed boolean DEFAULT false,
  trained_at timestamptz DEFAULT now(),
  trained_by uuid REFERENCES profiles(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ml_product_weights_normalized_name ON ml_product_weights(normalized_name);
CREATE INDEX IF NOT EXISTS idx_ml_product_weights_category ON ml_product_weights(category);
CREATE INDEX IF NOT EXISTS idx_ml_product_weights_confidence ON ml_product_weights(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_ml_category_weights_category ON ml_category_weights(category);
CREATE INDEX IF NOT EXISTS idx_ml_training_history_product ON ml_training_history(product_name);
CREATE INDEX IF NOT EXISTS idx_ml_training_history_accuracy ON ml_training_history(accuracy DESC);
CREATE INDEX IF NOT EXISTS idx_ml_training_history_trained_at ON ml_training_history(trained_at DESC);

-- Enable RLS
ALTER TABLE ml_product_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_category_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_training_history ENABLE ROW LEVEL SECURITY;

-- Create policies for ML tables
CREATE POLICY "Allow read access to ML product weights" ON ml_product_weights
  FOR SELECT USING (true); -- Read-only for all authenticated users

CREATE POLICY "Allow admins to manage ML product weights" ON ml_product_weights
  FOR ALL USING (is_admin());

CREATE POLICY "Allow read access to ML category weights" ON ml_category_weights
  FOR SELECT USING (true);

CREATE POLICY "Allow admins to manage ML category weights" ON ml_category_weights
  FOR ALL USING (is_admin());

CREATE POLICY "Allow users to view their training history" ON ml_training_history
  FOR SELECT USING (trained_by = auth.uid() OR is_admin());

CREATE POLICY "Allow authenticated users to add training data" ON ml_training_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT SELECT ON ml_product_weights TO authenticated;
GRANT SELECT ON ml_category_weights TO authenticated;
GRANT SELECT, INSERT ON ml_training_history TO authenticated;
GRANT ALL ON ml_product_weights TO service_role;
GRANT ALL ON ml_category_weights TO service_role;
GRANT ALL ON ml_training_history TO service_role;

-- Insert initial category weights
INSERT INTO ml_category_weights (category, min_weight, max_weight, avg_weight, sample_count) VALUES
  ('electronics', 0.05, 5.0, 1.0, 0),
  ('clothing', 0.1, 2.0, 0.5, 0),
  ('books', 0.1, 1.0, 0.3, 0),
  ('beauty', 0.01, 0.5, 0.1, 0),
  ('toys', 0.05, 3.0, 0.8, 0),
  ('home', 0.1, 10.0, 2.0, 0),
  ('sports', 0.1, 20.0, 2.5, 0),
  ('jewelry', 0.005, 0.2, 0.05, 0),
  ('food', 0.1, 5.0, 1.0, 0),
  ('general', 0.05, 5.0, 0.5, 0)
ON CONFLICT (category) DO NOTHING;

-- Create function to update category weights automatically
CREATE OR REPLACE FUNCTION update_category_weights()
RETURNS TRIGGER AS $$
BEGIN
  -- Update category statistics when a new product weight is added/updated
  INSERT INTO ml_category_weights (category, min_weight, max_weight, avg_weight, sample_count)
  VALUES (
    COALESCE(NEW.category, 'general'),
    NEW.weight_kg,
    NEW.weight_kg,
    NEW.weight_kg,
    1
  )
  ON CONFLICT (category) DO UPDATE SET
    min_weight = LEAST(ml_category_weights.min_weight, NEW.weight_kg),
    max_weight = GREATEST(ml_category_weights.max_weight, NEW.weight_kg),
    avg_weight = (ml_category_weights.avg_weight * ml_category_weights.sample_count + NEW.weight_kg) / (ml_category_weights.sample_count + 1),
    sample_count = ml_category_weights.sample_count + 1,
    last_updated = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update category weights
CREATE TRIGGER trigger_update_category_weights
  AFTER INSERT OR UPDATE ON ml_product_weights
  FOR EACH ROW
  EXECUTE FUNCTION update_category_weights();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_ml_product_weights_updated_at
  BEFORE UPDATE ON ml_product_weights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE ml_product_weights IS 'Stores learned product weights for ML weight estimator';
COMMENT ON TABLE ml_category_weights IS 'Stores category-based weight statistics for ML estimator';
COMMENT ON TABLE ml_training_history IS 'Tracks ML training sessions and accuracy metrics';

COMMENT ON COLUMN ml_product_weights.normalized_name IS 'Lowercase, trimmed product name for consistent matching';
COMMENT ON COLUMN ml_product_weights.training_count IS 'Number of times this product weight has been confirmed/updated';
COMMENT ON COLUMN ml_product_weights.accuracy_score IS 'Average accuracy score from training sessions';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ ML Weight Estimator storage tables created successfully';
  RAISE NOTICE '📊 Tables: ml_product_weights, ml_category_weights, ml_training_history';
  RAISE NOTICE '🔒 RLS policies configured for secure access';
  RAISE NOTICE '⚡ Automatic category weight updates enabled';
  RAISE NOTICE '📈 Ready for persistent ML learning';
END $$;