-- ============================================================================
-- NUCLEAR QUOTES TABLE SIMPLIFICATION
-- Transform: quotes (82 cols) + quote_items (12 cols) → unified quotes (25 cols)
-- Reduction: 94 total columns → 25 columns = 73% reduction
-- ============================================================================

-- Create the new simplified quotes table
CREATE TABLE IF NOT EXISTS quotes_unified (
  -- Core Identity (3)
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id text UNIQUE,
  user_id uuid REFERENCES profiles(id), -- NULL for anonymous quotes
  
  -- Business State (3)
  status text NOT NULL DEFAULT 'pending',
  origin_country text NOT NULL DEFAULT 'US',
  destination_country text NOT NULL,
  
  -- Smart Product System (1)
  items jsonb NOT NULL DEFAULT '[]'::jsonb, 
  -- Structure: [{
  --   id: string,
  --   name: string,
  --   url?: string,
  --   image?: string,
  --   options?: string,
  --   quantity: number,
  --   price_usd: number,
  --   weight_kg: number,
  --   smart_data: {
  --     weight_confidence: number,
  --     price_confidence: number,
  --     category_detected?: string,
  --     customs_suggestions: string[],
  --     optimization_hints: string[]
  --   }
  -- }]
  
  -- Smart Financial System (2)
  costprice_total_usd numeric(12,2) NOT NULL DEFAULT 0,
  final_total_usd numeric(12,2) NOT NULL DEFAULT 0,
  
  -- Smart Metadata (3)
  calculation_data jsonb DEFAULT '{}'::jsonb,
  -- Structure: {
  --   breakdown: {
  --     items_total: number,
  --     shipping: number,
  --     customs: number,
  --     taxes: number,
  --     fees: number,
  --     discount: number
  --   },
  --   exchange_rate: {
  --     rate: number,
  --     source: 'shipping_route' | 'country_settings',
  --     route_id?: number,
  --     confidence: number
  --   },
  --   smart_optimizations: [{
  --     type: 'shipping' | 'customs' | 'currency',
  --     suggestion: string,
  --     potential_savings: number,
  --     confidence: number
  --   }]
  -- }
  
  customer_data jsonb DEFAULT '{}'::jsonb,
  -- Structure: {
  --   info: {
  --     name?: string,
  --     email?: string,
  --     phone?: string,
  --     social_handle?: string
  --   },
  --   shipping_address: {
  --     line1: string,
  --     line2?: string,
  --     city: string,
  --     state: string,
  --     postal: string,
  --     country: string,
  --     locked: boolean
  --   }
  -- }
  
  operational_data jsonb DEFAULT '{}'::jsonb,
  -- Structure: {
  --   customs: {
  --     category?: string,
  --     percentage: number,
  --     tier_suggestions: string[]
  --   },
  --   shipping: {
  --     method: string,
  --     route_id?: number,
  --     available_options: [{
  --       id: string,
  --       carrier: string,
  --       name: string,
  --       cost_usd: number,
  --       days: string,
  --       confidence: number,
  --       restrictions: string[],
  --       tracking: boolean
  --     }],
  --     selected_option?: string,
  --     tracking?: {
  --       carrier?: string,
  --       number?: string,
  --       location?: string,
  --       delivery_estimate?: string,
  --       updates: [{timestamp: string, status: string, location: string}]
  --     },
  --     smart_recommendations: [{
  --       option_id: string,
  --       reason: string,
  --       savings_usd: number,
  --       trade_off: string
  --     }]
  --   },
  --   payment: {
  --     method?: string,
  --     amount_paid: number,
  --     gateway_data?: object,
  --     reminders_sent: number,
  --     status: string
  --   },
  --   timeline: [{
  --     status: string,
  --     timestamp: string,
  --     user_id?: string,
  --     auto: boolean,
  --     notes?: string
  --   }],
  --   admin: {
  --     notes?: string,
  --     priority: 'low' | 'normal' | 'high',
  --     flags: string[],
  --     rejection_reason?: string,
  --     rejection_details?: string
  --   }
  -- }
  
  -- System Core (4)
  currency text NOT NULL DEFAULT 'USD',
  in_cart boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  
  -- Smart Extensions (4)
  smart_suggestions jsonb DEFAULT '[]'::jsonb,
  -- Structure: [{
  --   id: string,
  --   type: 'weight' | 'customs' | 'shipping' | 'price',
  --   message: string,
  --   action?: string,
  --   confidence: number,
  --   potential_impact: {
  --     cost_change?: number,
  --     time_change?: string,
  --     accuracy_improvement?: number
  --   }
  -- }]
  
  weight_confidence decimal DEFAULT 0.0,
  optimization_score decimal DEFAULT 0.0,
  expires_at timestamp with time zone,
  
  -- Legacy Support (5) - Will be removed after full migration
  share_token text,
  is_anonymous boolean DEFAULT false,
  internal_notes text,
  admin_notes text,
  quote_source text DEFAULT 'website'
);

-- Add essential indexes for performance
CREATE INDEX idx_quotes_unified_user_id ON quotes_unified(user_id);
CREATE INDEX idx_quotes_unified_status ON quotes_unified(status);
CREATE INDEX idx_quotes_unified_destination_country ON quotes_unified(destination_country);
CREATE INDEX idx_quotes_unified_created_at ON quotes_unified(created_at);
CREATE INDEX idx_quotes_unified_display_id ON quotes_unified(display_id);
CREATE INDEX idx_quotes_unified_share_token ON quotes_unified(share_token) WHERE share_token IS NOT NULL;

-- JSONB indexes for smart querying
CREATE INDEX idx_quotes_unified_items_gin ON quotes_unified USING gin(items);
CREATE INDEX idx_quotes_unified_calculation_data_gin ON quotes_unified USING gin(calculation_data);
CREATE INDEX idx_quotes_unified_operational_data_gin ON quotes_unified USING gin(operational_data);
CREATE INDEX idx_quotes_unified_smart_suggestions_gin ON quotes_unified USING gin(smart_suggestions);

-- Add constraints for data integrity
ALTER TABLE quotes_unified 
  ADD CONSTRAINT quotes_unified_costprice_total_check CHECK (costprice_total_usd >= 0),
  ADD CONSTRAINT quotes_unified_final_total_check CHECK (final_total_usd >= 0),
  ADD CONSTRAINT quotes_unified_items_not_empty CHECK (jsonb_array_length(items) > 0),
  ADD CONSTRAINT quotes_unified_weight_confidence_check CHECK (weight_confidence >= 0 AND weight_confidence <= 1),
  ADD CONSTRAINT quotes_unified_optimization_score_check CHECK (optimization_score >= 0 AND optimization_score <= 100),
  ADD CONSTRAINT quotes_unified_valid_status CHECK (status IN (
    'pending', 'sent', 'approved', 'rejected', 'expired', 'calculated',
    'payment_pending', 'processing', 'paid', 'ordered', 'shipped', 'completed', 'cancelled'
  ));

-- Add RLS policies matching original quotes table
ALTER TABLE quotes_unified ENABLE ROW LEVEL SECURITY;

-- Users can manage their own quotes
CREATE POLICY "Users can manage own quotes" ON quotes_unified
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Anyone can view shared quotes that haven't expired
CREATE POLICY "Anyone can view shared quotes" ON quotes_unified 
  FOR SELECT USING (
    share_token IS NOT NULL 
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Admins have full access
CREATE POLICY "Admins have full access" ON quotes_unified
  USING (has_role(auth.uid(), 'admin'));

-- Grant appropriate permissions
GRANT ALL ON quotes_unified TO authenticated;
GRANT ALL ON quotes_unified TO service_role;
GRANT SELECT ON quotes_unified TO anon;

-- Add comments for documentation
COMMENT ON TABLE quotes_unified IS 'Unified quotes table - simplified from 82 columns to 25 columns with smart JSONB structures';
COMMENT ON COLUMN quotes_unified.items IS 'Array of quote items with smart metadata (replaces quote_items table)';
COMMENT ON COLUMN quotes_unified.calculation_data IS 'All financial calculations, exchange rates, and smart optimizations';
COMMENT ON COLUMN quotes_unified.customer_data IS 'Customer information and shipping address for anonymous quotes';
COMMENT ON COLUMN quotes_unified.operational_data IS 'Customs, shipping options, payment details, timeline, and admin data';
COMMENT ON COLUMN quotes_unified.smart_suggestions IS 'AI-powered suggestions for optimization and improvements';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_quotes_unified_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_unified_updated_at
  BEFORE UPDATE ON quotes_unified
  FOR EACH ROW EXECUTE FUNCTION update_quotes_unified_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Nuclear quotes simplification completed: 94 columns → 25 columns (73%% reduction)';
  RAISE NOTICE 'Smart JSONB structures created for items, calculations, and operations';
  RAISE NOTICE 'Enhanced shipping options and smart suggestions integrated';
  RAISE NOTICE 'Ready for data migration from quotes + quote_items tables';
END $$;