# Database Schema Requirements

This document defines the complete database schema requirements to prevent schema mismatches between local and cloud environments.

## Critical Tables & Missing Table Prevention

### 1. **payment_documents** - Payment Proof Management
**Purpose**: Store and manage payment proof documents uploaded by customers

**Structure**:
```sql
CREATE TABLE payment_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    document_url TEXT NOT NULL,
    document_type TEXT NOT NULL DEFAULT 'payment_proof',
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    payment_method TEXT,
    transaction_reference TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Dependencies**:
- `quotes` table must exist
- `auth.users` table (Supabase Auth)
- `update_updated_at_column()` function for trigger
- `is_admin()` function for RLS policies

### 2. **payment_ledger** - Financial Transaction Ledger
**Purpose**: Double-entry bookkeeping for all financial transactions

### 3. **quote_documents** - Document Management for Quotes
**Purpose**: Store and manage documents attached to quotes (invoices, receipts, etc.)

**Structure**:
```sql
CREATE TABLE quote_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'receipt', 'shipping_label', 'customs_form', 'insurance_doc', 'other')),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    is_customer_visible BOOLEAN DEFAULT true NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

**Dependencies**:
- `quotes` table must exist
- `profiles` table must exist
- `update_quote_documents_updated_at()` function for trigger
- Comprehensive RLS policies for admin/customer access

### 4. **shipping_routes** - Dynamic Shipping Cost Calculation
**Purpose**: Store origin-destination shipping costs with dynamic calculation

**Structure**:
```sql
CREATE TABLE shipping_routes (
    id SERIAL PRIMARY KEY,
    origin_country VARCHAR(3) NOT NULL,
    destination_country VARCHAR(3) NOT NULL,
    base_shipping_cost DECIMAL(10,2) NOT NULL,
    cost_per_kg DECIMAL(10,2) NOT NULL,
    cost_percentage DECIMAL(5,2) DEFAULT 0,
    weight_tiers JSONB DEFAULT '[...]',
    carriers JSONB DEFAULT '[...]',
    max_weight DECIMAL(8,2),
    restricted_items TEXT[],
    requires_documentation BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(origin_country, destination_country)
);
```

**Dependencies**:
- Comprehensive RLS policies for admin/public access
- Default shipping routes for common country combinations
- Related `get_shipping_cost()` function for calculations

### 5. **quote_statuses** - Dynamic Status Configuration  
**Purpose**: Store configurable quote/order status definitions

## Required Columns per Table

### quotes Table
- `destination_country` VARCHAR(2) - Customer shipping country
- `origin_country` VARCHAR(2) - Product source country  
- `customer_name` TEXT - Customer full name
- `breakdown` JSONB - Cost breakdown details
- `payment_details` JSONB - Payment information

### user_addresses Table  
- `destination_country` VARCHAR(2) - Shipping country
- `phone` TEXT - Contact phone number
- `recipient_name` TEXT - Delivery recipient
- `nickname` TEXT - Address nickname

### payment_transactions Table
- `paypal_capture_id` TEXT - PayPal capture ID
- `paypal_payer_email` TEXT - PayPal payer email
- `paypal_payer_id` TEXT - PayPal payer ID

## Automated Schema Verification

The schema verification system runs automatically via:

1. **Migration**: `20250716120000_schema_verification_and_repair.sql`
2. **Verification Functions**:
   - `verify_quotes_schema()`
   - `verify_user_addresses_schema()`
   - `verify_payment_transactions_schema()`
   - `verify_payment_documents_table()`
   - `verify_critical_functions()`
   - `verify_critical_triggers()`

3. **Master Function**: `verify_complete_schema()`

## Component Dependencies

### Frontend Components Requiring Specific Tables:
- `OrderManagementPage.tsx` → `payment_documents`
- `PaymentStatusTracker.tsx` → `payment_transactions`, `payment_ledger`
- `QuoteManagement.tsx` → `quotes` (all required columns)
- `UserAddressForm.tsx` → `user_addresses` (all required columns)
- `DocumentUploader.tsx` → `quote_documents`
- `DocumentManager.tsx` → `quote_documents`

### Missing Import Prevention:
Components must import all required icons from `lucide-react`:
- `Package` - Used in empty states
- `AlertCircle` - Used for error states  
- `Receipt` - Used for payment related features

## Development Workflow Protection

### Database Reset Protection:
1. `npm run db:reset` → Automatically runs schema verification
2. `npm run dev:local` → Runs database start + verification
3. `./fix-database-schema.sh local` → Manual verification trigger

### Schema Sync Commands:
```bash
# Verify local schema matches requirements
npm run db:verify-schema

# Fix any schema issues
./fix-database-schema.sh local

# Reset and repair database 
npm run db:reset
```

## Error Prevention Checklist

### Before Adding New Database Features:
- [ ] Add table creation to schema verification system
- [ ] Update `verify_complete_schema()` function
- [ ] Test on fresh database reset
- [ ] Document in this file

### Before Using New Components:
- [ ] Verify all imports exist
- [ ] Check for external dependencies (icons, etc.)
- [ ] Test component in isolation

### Before Database Operations:
- [ ] Ensure tables exist via schema verification
- [ ] Use error handling for missing tables
- [ ] Provide fallback values for optional features

## Troubleshooting Guide

### "Table does not exist" Errors:
1. Run: `npm run db:verify-schema`
2. Check if table exists: `\dt table_name` in psql
3. Add to schema verification if missing

### "Import not found" Errors:
1. Check import statements in component
2. Verify package dependencies in `package.json`
3. Add missing imports to component

### Schema Mismatch Issues:
1. Compare local vs cloud schema
2. Run schema verification on both environments
3. Update migration files if needed

This document should be updated whenever new tables or critical columns are added to prevent future schema inconsistencies.