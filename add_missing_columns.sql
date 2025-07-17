-- Add missing columns to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS destination_country VARCHAR(2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS final_currency VARCHAR(3);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(100);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS priority_auto quote_priority DEFAULT 'normal';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS origin_country VARCHAR(2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(100);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shipping_route_id UUID;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shipping_delivery_days INTEGER;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customs_percentage DECIMAL(5,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS enabled_delivery_options JSONB DEFAULT '{}';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS social_handle VARCHAR(255);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_source VARCHAR(50);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS share_token VARCHAR(255);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS ordered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_notes TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS calculation_metadata JSONB DEFAULT '{}';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS display_id VARCHAR(50);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS order_display_id VARCHAR(50);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS address_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS approval_status quote_approval_status DEFAULT 'pending';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS priority quote_priority DEFAULT 'normal';

-- Add missing columns to payment_gateways table
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 999;
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS description TEXT;

-- Add missing columns to country_settings table
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS minimum_payment_amount DECIMAL(10,2) DEFAULT 10.00;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS decimal_places INTEGER DEFAULT 2;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS thousand_separator VARCHAR(1) DEFAULT ',';
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS decimal_separator VARCHAR(1) DEFAULT '.';
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS symbol_position VARCHAR(10) DEFAULT 'before';
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS symbol_space BOOLEAN DEFAULT FALSE;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS priority_thresholds JSONB DEFAULT '{}';

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_quotes_destination_country ON quotes(destination_country);
CREATE INDEX IF NOT EXISTS idx_quotes_origin_country ON quotes(origin_country);
CREATE INDEX IF NOT EXISTS idx_quotes_share_token ON quotes(share_token);
CREATE INDEX IF NOT EXISTS idx_quotes_expires_at ON quotes(expires_at);
CREATE INDEX IF NOT EXISTS idx_quotes_display_id ON quotes(display_id);
CREATE INDEX IF NOT EXISTS idx_quotes_order_display_id ON quotes(order_display_id);
CREATE INDEX IF NOT EXISTS idx_quotes_priority ON quotes(priority);
CREATE INDEX IF NOT EXISTS idx_quotes_approval_status ON quotes(approval_status);
CREATE INDEX IF NOT EXISTS idx_quotes_payment_status ON quotes(payment_status);

-- Add missing constraints
ALTER TABLE quotes ADD CONSTRAINT IF NOT EXISTS quotes_anonymous_check CHECK (
    (is_anonymous = false) OR (is_anonymous = true AND user_id IS NULL)
);

ALTER TABLE quotes ADD CONSTRAINT IF NOT EXISTS quotes_email_check CHECK (
    (is_anonymous = false AND email IS NOT NULL) OR (is_anonymous = true)
);

-- Add foreign key constraints
ALTER TABLE quotes ADD CONSTRAINT IF NOT EXISTS quotes_shipping_route_fkey 
    FOREIGN KEY (shipping_route_id) REFERENCES shipping_routes(id);

-- Update quotes table to add missing triggers
CREATE OR REPLACE FUNCTION generate_display_id() RETURNS trigger AS $$
BEGIN
    IF NEW.display_id IS NULL THEN
        NEW.display_id := 'Q' || to_char(NEW.created_at, 'YYYYMMDD') || '-' || substring(NEW.id::text from 1 for 8);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_share_token() RETURNS trigger AS $$
BEGIN
    IF NEW.share_token IS NULL THEN
        NEW.share_token := encode(gen_random_bytes(32), 'hex');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'generate_quote_display_id') THEN
        CREATE TRIGGER generate_quote_display_id
            BEFORE INSERT ON quotes
            FOR EACH ROW EXECUTE FUNCTION generate_display_id();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_share_token_trigger') THEN
        CREATE TRIGGER set_share_token_trigger
            BEFORE INSERT ON quotes
            FOR EACH ROW EXECUTE FUNCTION set_share_token();
    END IF;
END$$;