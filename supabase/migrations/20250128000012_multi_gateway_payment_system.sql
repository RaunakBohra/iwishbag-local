-- Multi-Gateway Payment System Architecture
-- Designed for scalability, reliability, and regulatory compliance

-- Payment Gateway Providers Configuration
CREATE TABLE payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- 'stripe', 'payu', 'razorpay', 'paypal', etc.
    display_name TEXT NOT NULL,
    provider_type TEXT NOT NULL CHECK (provider_type IN ('card', 'wallet', 'bank', 'crypto', 'bnpl')),
    is_active BOOLEAN DEFAULT true,
    is_test_mode BOOLEAN DEFAULT false,
    
    -- Geographic and currency support
    supported_countries TEXT[] DEFAULT '{}', -- ['US', 'IN', 'NP']
    supported_currencies TEXT[] DEFAULT '{}', -- ['USD', 'INR', 'NPR']
    
    -- Business rules
    min_amount DECIMAL(10,2) DEFAULT 0.01,
    max_amount DECIMAL(10,2) DEFAULT 999999.99,
    processing_time_minutes INTEGER DEFAULT 5, -- Expected processing time
    
    -- Configuration (encrypted sensitive data)
    config JSONB NOT NULL DEFAULT '{}', -- API keys, endpoints, etc.
    fee_structure JSONB NOT NULL DEFAULT '{}', -- Fee calculation rules
    
    -- Reliability metrics
    success_rate DECIMAL(5,2) DEFAULT 100.00, -- Track success rates
    avg_processing_time INTEGER DEFAULT 300, -- seconds
    last_health_check TIMESTAMPTZ,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Smart Routing Rules for Gateway Selection
CREATE TABLE payment_routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 100, -- Lower = higher priority
    is_active BOOLEAN DEFAULT true,
    
    -- Routing conditions (ALL must match)
    conditions JSONB NOT NULL DEFAULT '{}', -- Complex routing logic
    -- Example: {
    --   "amount_range": {"min": 0, "max": 1000},
    --   "currencies": ["USD", "INR"],
    --   "countries": ["US", "IN"],
    --   "payment_method": "card",
    --   "time_of_day": {"start": "09:00", "end": "17:00"},
    --   "customer_tier": ["premium", "regular"],
    --   "order_value_range": {"min": 100, "max": 5000}
    -- }
    
    -- Gateway preferences (ordered by preference)
    gateway_preferences UUID[] NOT NULL, -- Array of gateway IDs
    fallback_strategy TEXT DEFAULT 'next_available' CHECK (
        fallback_strategy IN ('next_available', 'lowest_fee', 'highest_success_rate', 'fastest')
    ),
    
    -- Load balancing
    load_balancing_type TEXT DEFAULT 'round_robin' CHECK (
        load_balancing_type IN ('round_robin', 'weighted', 'least_connections', 'random')
    ),
    weights JSONB DEFAULT '{}', -- For weighted load balancing
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Sessions - Core transaction tracking
CREATE TABLE payment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token TEXT UNIQUE NOT NULL, -- Public facing token
    
    -- Business context
    quote_id UUID REFERENCES quotes(id),
    user_id UUID REFERENCES auth.users(id),
    customer_email TEXT,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL,
    payment_method TEXT, -- 'card', 'wallet', 'bank_transfer', etc.
    
    -- Gateway routing
    selected_gateway_id UUID REFERENCES payment_gateways(id),
    routing_rule_id UUID REFERENCES payment_routing_rules(id),
    fallback_attempts INTEGER DEFAULT 0,
    
    -- Session state
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN (
        'created', 'gateway_selected', 'initiated', 'processing', 
        'requires_action', 'succeeded', 'failed', 'cancelled', 'expired'
    )),
    
    -- External references
    gateway_session_id TEXT, -- Gateway's internal ID
    gateway_payment_id TEXT, -- Gateway's payment ID
    
    -- Timing
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
    completed_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Transactions - Individual payment attempts
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES payment_sessions(id),
    gateway_id UUID NOT NULL REFERENCES payment_gateways(id),
    
    -- Transaction details
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL,
    gateway_fee DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL, -- amount - gateway_fee
    
    -- Transaction state
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'disputed'
    )),
    
    -- Gateway response
    gateway_transaction_id TEXT, -- Gateway's transaction ID
    gateway_response JSONB DEFAULT '{}', -- Full gateway response
    gateway_status TEXT, -- Gateway's status
    gateway_error_code TEXT,
    gateway_error_message TEXT,
    
    -- Processing details
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    processing_duration_ms INTEGER,
    
    -- Retry logic
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Events - Audit trail and webhooks
CREATE TABLE payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES payment_sessions(id),
    transaction_id UUID REFERENCES payment_transactions(id),
    gateway_id UUID REFERENCES payment_gateways(id),
    
    -- Event details
    event_type TEXT NOT NULL, -- 'session_created', 'gateway_selected', 'payment_initiated', etc.
    event_source TEXT NOT NULL CHECK (event_source IN ('system', 'gateway_webhook', 'user_action', 'admin_action')),
    
    -- Event data
    event_data JSONB DEFAULT '{}',
    previous_status TEXT,
    new_status TEXT,
    
    -- Context
    user_agent TEXT,
    ip_address INET,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gateway Health Monitoring
CREATE TABLE gateway_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_id UUID NOT NULL REFERENCES payment_gateways(id),
    
    -- Metrics window
    metric_date DATE NOT NULL,
    hour_of_day INTEGER CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
    
    -- Performance metrics
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    
    -- Financial metrics
    total_volume DECIMAL(15,2) DEFAULT 0,
    total_fees DECIMAL(15,2) DEFAULT 0,
    
    -- Error analysis
    error_breakdown JSONB DEFAULT '{}', -- Group errors by type
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(gateway_id, metric_date, hour_of_day)
);

-- Refunds and Chargebacks
CREATE TABLE payment_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES payment_transactions(id),
    
    -- Refund details
    refund_amount DECIMAL(10,2) NOT NULL,
    refund_reason TEXT NOT NULL,
    refund_type TEXT DEFAULT 'partial' CHECK (refund_type IN ('full', 'partial')),
    
    -- Processing
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    gateway_refund_id TEXT,
    gateway_response JSONB DEFAULT '{}',
    
    -- Timing
    processed_at TIMESTAMPTZ,
    
    -- Audit
    initiated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gateway Fee Calculation Cache
CREATE TABLE gateway_fee_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_id UUID NOT NULL REFERENCES payment_gateways(id),
    
    -- Cache key components
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    country TEXT NOT NULL,
    
    -- Cached fee calculation
    calculated_fee DECIMAL(10,2) NOT NULL,
    fee_breakdown JSONB DEFAULT '{}',
    
    -- Cache metadata
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(gateway_id, amount, currency, payment_method, country)
);

-- Indexes for performance
CREATE INDEX idx_payment_sessions_user_id ON payment_sessions(user_id);
CREATE INDEX idx_payment_sessions_quote_id ON payment_sessions(quote_id);
CREATE INDEX idx_payment_sessions_status ON payment_sessions(status);
CREATE INDEX idx_payment_sessions_expires_at ON payment_sessions(expires_at);

CREATE INDEX idx_payment_transactions_session_id ON payment_transactions(session_id);
CREATE INDEX idx_payment_transactions_gateway_id ON payment_transactions(gateway_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at);

CREATE INDEX idx_payment_events_session_id ON payment_events(session_id);
CREATE INDEX idx_payment_events_event_type ON payment_events(event_type);
CREATE INDEX idx_payment_events_created_at ON payment_events(created_at);

CREATE INDEX idx_gateway_health_metrics_gateway_date ON gateway_health_metrics(gateway_id, metric_date);
CREATE INDEX idx_gateway_fee_cache_lookup ON gateway_fee_cache(gateway_id, amount, currency, payment_method, country);
CREATE INDEX idx_gateway_fee_cache_expires ON gateway_fee_cache(expires_at);

-- RLS Policies
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_fee_cache ENABLE ROW LEVEL SECURITY;

-- Admin-only access to gateway configuration
CREATE POLICY "Admins can manage payment gateways" ON payment_gateways
    FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage routing rules" ON payment_routing_rules
    FOR ALL USING (is_admin());

-- Users can view their own payment sessions
CREATE POLICY "Users can view own payment sessions" ON payment_sessions
    FOR SELECT USING (auth.uid() = user_id OR is_admin());

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions" ON payment_transactions
    FOR SELECT USING (is_admin());

-- Users can view transactions for their sessions
CREATE POLICY "Users can view own transactions" ON payment_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM payment_sessions ps 
            WHERE ps.id = payment_transactions.session_id 
            AND ps.user_id = auth.uid()
        ) OR is_admin()
    );

-- Admin-only access to health metrics and events
CREATE POLICY "Admins can view payment events" ON payment_events
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can view health metrics" ON gateway_health_metrics
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage refunds" ON payment_refunds
    FOR ALL USING (is_admin());

-- Fee cache is read-only for performance
CREATE POLICY "System can manage fee cache" ON gateway_fee_cache
    FOR ALL USING (is_admin());

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_payment_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_gateways_timestamp
    BEFORE UPDATE ON payment_gateways
    FOR EACH ROW EXECUTE FUNCTION update_payment_timestamps();

CREATE TRIGGER update_payment_sessions_timestamp
    BEFORE UPDATE ON payment_sessions
    FOR EACH ROW EXECUTE FUNCTION update_payment_timestamps();

CREATE TRIGGER update_payment_transactions_timestamp
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_payment_timestamps();

CREATE TRIGGER update_payment_refunds_timestamp
    BEFORE UPDATE ON payment_refunds
    FOR EACH ROW EXECUTE FUNCTION update_payment_timestamps();