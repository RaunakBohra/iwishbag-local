-- Payment Gateway Integration Migration
-- 20250102000000_payment_gateways.sql

-- Payment gateway configurations
CREATE TABLE IF NOT EXISTS "public"."payment_gateways" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "code" text unique not null,
    "is_active" boolean default true,
    "supported_countries" text[] default '{}',
    "supported_currencies" text[] default '{}',
    "fee_percent" numeric(5,2) default 0,
    "fee_fixed" numeric(10,2) default 0,
    "config" jsonb default '{}',
    "webhook_url" text,
    "test_mode" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    PRIMARY KEY ("id")
);

-- Payment transactions
CREATE TABLE IF NOT EXISTS "public"."payment_transactions" (
    "id" uuid not null default gen_random_uuid(),
    "quote_id" uuid references "public"."quotes"("id") on delete cascade,
    "gateway_code" text not null,
    "transaction_id" text,
    "gateway_transaction_id" text,
    "amount" numeric(10,2) not null,
    "currency" text not null,
    "status" text not null default 'pending',
    "gateway_response" jsonb default '{}',
    "error_message" text,
    "refunded_amount" numeric(10,2) default 0,
    "refund_status" text default 'none',
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    PRIMARY KEY ("id")
);

-- Payment refunds
CREATE TABLE IF NOT EXISTS "public"."payment_refunds" (
    "id" uuid not null default gen_random_uuid(),
    "transaction_id" uuid references "public"."payment_transactions"("id") on delete cascade,
    "refund_type" text not null default 'original_method', -- 'original_method' or 'store_credit'
    "amount" numeric(10,2) not null,
    "currency" text not null,
    "reason" text,
    "gateway_refund_id" text,
    "status" text not null default 'pending',
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    PRIMARY KEY ("id")
);

-- Store credit for users
CREATE TABLE IF NOT EXISTS "public"."store_credits" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid references "public"."profiles"("id") on delete cascade,
    "amount" numeric(10,2) not null,
    "currency" text not null default 'USD',
    "source" text not null, -- 'refund', 'bonus', 'manual'
    "reference_id" uuid, -- payment_transaction_id or manual entry
    "expires_at" timestamp with time zone,
    "is_active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    PRIMARY KEY ("id")
);

-- Payment gateway webhooks
CREATE TABLE IF NOT EXISTS "public"."payment_webhooks" (
    "id" uuid not null default gen_random_uuid(),
    "gateway_code" text not null,
    "event_type" text not null,
    "payload" jsonb not null,
    "processed" boolean default false,
    "error_message" text,
    "created_at" timestamp with time zone not null default now(),
    PRIMARY KEY ("id")
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_quote_id" ON "public"."payment_transactions"("quote_id");
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_gateway_code" ON "public"."payment_transactions"("gateway_code");
CREATE INDEX IF NOT EXISTS "idx_payment_transactions_status" ON "public"."payment_transactions"("status");
CREATE INDEX IF NOT EXISTS "idx_payment_refunds_transaction_id" ON "public"."payment_refunds"("transaction_id");
CREATE INDEX IF NOT EXISTS "idx_store_credits_user_id" ON "public"."store_credits"("user_id");
CREATE INDEX IF NOT EXISTS "idx_store_credits_active" ON "public"."store_credits"("is_active") WHERE "is_active" = true;
CREATE INDEX IF NOT EXISTS "idx_payment_webhooks_gateway_code" ON "public"."payment_webhooks"("gateway_code");
CREATE INDEX IF NOT EXISTS "idx_payment_webhooks_processed" ON "public"."payment_webhooks"("processed") WHERE "processed" = false;

-- Enable RLS
ALTER TABLE "public"."payment_gateways" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payment_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payment_refunds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."store_credits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payment_webhooks" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_gateways (admin only)
CREATE POLICY "admin_select_payment_gateways" ON "public"."payment_gateways"
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "admin_insert_payment_gateways" ON "public"."payment_gateways"
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "admin_update_payment_gateways" ON "public"."payment_gateways"
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for payment_transactions
CREATE POLICY "users_select_own_transactions" ON "public"."payment_transactions"
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM "public"."quotes" WHERE id = quote_id
        )
    );

CREATE POLICY "admin_select_all_transactions" ON "public"."payment_transactions"
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "admin_insert_transactions" ON "public"."payment_transactions"
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "admin_update_transactions" ON "public"."payment_transactions"
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for payment_refunds
CREATE POLICY "users_select_own_refunds" ON "public"."payment_refunds"
    FOR SELECT USING (
        auth.uid()::uuid IN (
            SELECT q.user_id FROM "public"."quotes" q
            JOIN "public"."payment_transactions" pt ON q.id = pt.quote_id
            WHERE pt.id::uuid = transaction_id::uuid
        )
    );

CREATE POLICY "admin_select_all_refunds" ON "public"."payment_refunds"
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "admin_insert_refunds" ON "public"."payment_refunds"
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "admin_update_refunds" ON "public"."payment_refunds"
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for store_credits
CREATE POLICY "users_select_own_credits" ON "public"."store_credits"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_select_all_credits" ON "public"."store_credits"
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "admin_insert_credits" ON "public"."store_credits"
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "admin_update_credits" ON "public"."store_credits"
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for payment_webhooks (admin only)
CREATE POLICY "admin_select_webhooks" ON "public"."payment_webhooks"
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "admin_insert_webhooks" ON "public"."payment_webhooks"
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "admin_update_webhooks" ON "public"."payment_webhooks"
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- Insert default payment gateways
INSERT INTO "public"."payment_gateways" (name, code, supported_countries, supported_currencies, fee_percent, fee_fixed, config, test_mode) VALUES
('Stripe', 'stripe', ARRAY['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'SG', 'AE', 'SA', 'EG', 'TR'], ARRAY['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'AED', 'SAR', 'EGP', 'TRY'], 2.9, 0.30, '{"publishable_key": "", "secret_key": ""}', true),
('PayU', 'payu', ARRAY['IN'], ARRAY['INR'], 2.5, 0, '{"merchant_key": "", "salt_key": "", "merchant_id": ""}', true),
('eSewa', 'esewa', ARRAY['NP'], ARRAY['NPR'], 1.5, 0, '{"merchant_id": "", "merchant_key": ""}', true),
('Khalti', 'khalti', ARRAY['NP'], ARRAY['NPR'], 1.5, 0, '{"public_key": "", "secret_key": ""}', true),
('Fonepay', 'fonepay', ARRAY['NP'], ARRAY['NPR'], 1.5, 0, '{"merchant_id": "", "merchant_key": ""}', true),
('Airwallex', 'airwallex', ARRAY['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'SG', 'AE', 'SA', 'EG', 'TR'], ARRAY['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'AED', 'SAR', 'EGP', 'TRY'], 1.8, 0.30, '{"api_key": "", "client_id": ""}', true)
ON CONFLICT (code) DO NOTHING;

-- Update existing quotes table to include payment method
ALTER TABLE "public"."quotes" 
ADD COLUMN IF NOT EXISTS "payment_method" text DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS "payment_transaction_id" uuid REFERENCES "public"."payment_transactions"("id");

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_payment_gateways_updated_at BEFORE UPDATE ON "public"."payment_gateways" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON "public"."payment_transactions" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 