-- ============================================================================
-- ESSENTIAL TABLES FOR IWISHBAG CLOUD DATABASE
-- Contains the core tables needed for basic functionality
-- ============================================================================

-- Profiles table (users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    country TEXT,
    preferred_display_currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quotes V2 table
CREATE TABLE IF NOT EXISTS quotes_v2 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES profiles(id),
    customer_email TEXT,
    customer_name TEXT,
    status TEXT DEFAULT 'pending',
    total_quote_origincurrency DECIMAL(15,2),
    origin_country TEXT DEFAULT 'IN',
    destination_country TEXT,
    currency TEXT DEFAULT 'USD',
    calculation_data JSONB DEFAULT '{}',
    customer_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quote Items V2 table
CREATE TABLE IF NOT EXISTS quote_items_v2 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID REFERENCES quotes_v2(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_url TEXT,
    quantity INTEGER DEFAULT 1,
    costprice_origin DECIMAL(10,2),
    weight DECIMAL(8,2),
    dimensions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID REFERENCES quotes_v2(id),
    customer_id UUID REFERENCES profiles(id),
    status TEXT DEFAULT 'pending',
    total_amount DECIMAL(15,2),
    currency TEXT DEFAULT 'USD',
    payment_status TEXT DEFAULT 'unpaid',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    quote_item_id UUID REFERENCES quote_items_v2(id),
    product_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID REFERENCES quotes_v2(id),
    sender_type TEXT DEFAULT 'admin',
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    gateway TEXT NOT NULL,
    gateway_transaction_id TEXT,
    amount DECIMAL(15,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery Addresses table
CREATE TABLE IF NOT EXISTS delivery_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES profiles(id),
    name TEXT NOT NULL,
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    city TEXT NOT NULL,
    state TEXT,
    postal_code TEXT,
    country TEXT NOT NULL,
    phone TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipping Routes table  
CREATE TABLE IF NOT EXISTS shipping_routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    origin_country TEXT NOT NULL,
    destination_country TEXT NOT NULL,
    min_weight DECIMAL(8,2) DEFAULT 0,
    max_weight DECIMAL(8,2),
    price_per_kg DECIMAL(10,2) NOT NULL,
    fixed_fee DECIMAL(10,2) DEFAULT 0,
    exchange_rate DECIMAL(12,6),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Gateways table
CREATE TABLE IF NOT EXISTS payment_gateways (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gateway_name TEXT NOT NULL,
    gateway_code TEXT NOT NULL UNIQUE,
    supported_countries TEXT[] DEFAULT '{}',
    fixed_fee DECIMAL(10,2) DEFAULT 0,
    percentage_fee DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discount Codes table
CREATE TABLE IF NOT EXISTS discount_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT DEFAULT 'percentage',
    discount_value DECIMAL(10,2) NOT NULL,
    minimum_amount DECIMAL(10,2),
    maximum_discount DECIMAL(10,2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support System table
CREATE TABLE IF NOT EXISTS support_system (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES profiles(id),
    subject TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'normal',
    assigned_to UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add essential indexes
CREATE INDEX IF NOT EXISTS idx_quotes_v2_customer_id ON quotes_v2(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_v2_status ON quotes_v2(status);
CREATE INDEX IF NOT EXISTS idx_quote_items_v2_quote_id ON quote_items_v2(quote_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_messages_quote_id ON messages(quote_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_customer_id ON delivery_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_shipping_routes_origin_dest ON shipping_routes(origin_country, destination_country);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_v2_updated_at 
    BEFORE UPDATE ON quotes_v2 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_items_v2_updated_at 
    BEFORE UPDATE ON quote_items_v2 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at 
    BEFORE UPDATE ON order_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_addresses_updated_at 
    BEFORE UPDATE ON delivery_addresses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_routes_updated_at 
    BEFORE UPDATE ON shipping_routes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();