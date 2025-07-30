# CLAUDE.md

# iwishBag E-commerce Platform Instructions

## Project Overview
International shopping platform (Amazon, Flipkart, eBay, Alibaba) → customers in India/Nepal. Quote → approval → checkout flow.

**CRITICAL**: User side vs admin side - clarify which when making changes.
**NEVER RESET DB**: `supabase db reset` destroys all data.

## Warnings and Critical Alerts
- DO NOT RESET MY DB EVER !!!!! im warning you
- donot reset database to run migration ever !
- NEVER RESET THE DB !! donot use supabase db reset --local or cloud

## Database Reset Recovery - CRITICAL SECTION
**IF a database reset accidentally happens, immediately run this recovery process:**

### 1. **Apply Consolidated Database Migration**
```bash
# Apply the single consolidated migration (replaces all previous migrations)
supabase db push --include-all
```

**NOTE**: Database is now consolidated into single baseline migration: `00000000000000_initial_complete_database.sql`

### 2. **Verify Database State**
After applying the consolidated migration, the database will have:
- Complete schema with all tables, functions, triggers
- Full seed data (countries, HSN codes, configurations)
- Package forwarding system
- MFA system (currently disabled for development)

### 2.5. **Legacy Migration Recovery (DEPRECATED)**
**DEPRECATED**: Individual migrations have been consolidated. The following commands are kept for reference only:
```bash
# Apply HSN atomic migration (DB-reset safe)
PGPASSWORD=postgres psql -h localhost -p 54322 -d postgres -U postgres -f supabase/migrations/20250725000000_hsn_system_atomic_migration.sql

# Apply comprehensive HSN seed data (23 HSN codes, 15 categories)
PGPASSWORD=postgres psql -h localhost -p 54322 -d postgres -U postgres -f supabase/migrations/20250725100000_comprehensive_hsn_seed_data.sql

# Fix user_roles updated_at column error (prevents ERROR 42703)
PGPASSWORD=postgres psql -h localhost -p 54322 -d postgres -U postgres -f supabase/migrations/20250725110000_fix_user_roles_updated_at_column.sql

# Apply HSN search optimization (creates hsn_search_optimized materialized view)
PGPASSWORD=postgres psql -h localhost -p 54322 -d postgres -U postgres -f supabase/migrations/20250724115500_enhance_hsn_search_data.sql
```

### 3. **Verify Critical Functions**
Execute in Supabase SQL Editor to verify:
```sql
-- Test core authentication functions
SELECT is_admin() as admin_check;
SELECT is_authenticated() as auth_check;
SELECT has_role('admin') as has_admin_role;

-- Test RPC functions that were causing 404 errors
SELECT * FROM get_user_permissions_new(auth.uid());
SELECT * FROM get_user_roles_new(auth.uid());

-- Test tracking system
SELECT generate_iwish_tracking_id() as sample_tracking_id;

-- Test HSN system tables (Should return 70, 8, 1 respectively)
SELECT COUNT(*) as hsn_master_count FROM hsn_master;
SELECT COUNT(*) as unified_config_count FROM unified_configuration;
SELECT COUNT(*) as admin_overrides_count FROM admin_overrides;

-- Verify HSN category coverage (Should show 23 categories)
SELECT COUNT(DISTINCT category) as category_count, 
       STRING_AGG(DISTINCT category, ', ') as categories 
FROM hsn_master;

-- Test HSN currency conversion function
SELECT get_hsn_with_currency_conversion('6204', 'NP')->'currency_conversion' as nepal_kurta_test;

-- Test HSN search optimization (should return 70 records)
SELECT COUNT(*) as hsn_search_records FROM hsn_search_optimized;

-- Test package forwarding system
SELECT COUNT(*) as warehouse_suite_addresses_count FROM warehouse_suite_addresses;
SELECT COUNT(*) as received_packages_count FROM received_packages;

-- Test search functionality
SELECT hsn_code, display_name, icon FROM hsn_search_optimized 
WHERE search_vector @@ to_tsquery('english', 'mobile | phone') LIMIT 3;
```

### 4. **Essential RPC Functions List**
These functions MUST exist for the system to work:
- `is_admin()` - Critical for RLS policies
- `is_authenticated()` - Auth state checking
- `has_role(TEXT)` - Role-based access control
- `get_user_permissions_new(UUID)` - Admin permission checking
- `get_user_roles_new(UUID)` - User role management
- `generate_iwish_tracking_id()` - Tracking system
- `update_updated_at_column()` - Timestamp triggers
- `convert_minimum_valuation_usd_to_origin()` - HSN currency conversion
- `get_hsn_with_currency_conversion()` - HSN data with conversion
- `refresh_hsn_search_cache()` - Refreshes HSN search materialized view

### 5. **Migration Files to Check**
- `20250724091000_create_missing_rpc_functions.sql` - Contains the missing RPC functions
- `20250724090000_create_user_activity_analytics.sql` - User activity tracking system
- `20250724084700_create_hsn_tax_system.sql` - HSN classification system (7 basic HSN codes)
- `20250724115500_enhance_hsn_search_data.sql` - HSN search optimization (hsn_search_optimized view)
- `20250725000000_hsn_system_atomic_migration.sql` - DB-reset safe HSN system (includes table creation)
- `20250725100000_comprehensive_hsn_seed_data.sql` - Comprehensive HSN seed data (23 codes, 15 categories)
- `20250725110000_fix_user_roles_updated_at_column.sql` - Fixes ERROR 42703 user_roles trigger issue
- `20250725200000_enhanced_hsn_system_complete.sql` - **RECOMMENDED**: All-in-one enhanced HSN system (includes everything above)

### 6. **Recovery Script Location**
- **RECOMMENDED**: Enhanced single-command recovery at `src/scripts/enhanced-database-recovery.sql`
- **Legacy**: Individual migration files (see above)
- **Backup**: Manual script at `src/scripts/ensure-database-functions.sql`
- **Legacy Complete**: Multi-step recovery at `src/scripts/complete-database-recovery.sql`

### 7. **Post-Reset Field Renames**
After any database reset, also run:
```bash
psql -h localhost -p 54322 -d postgres -U postgres -f src/scripts/post-reset-field-renames.sql
```
This ensures:
- `items[].price_usd` → `items[].costprice_origin`
- `items[].weight_kg` → `items[].weight`

## Tech Stack
- **Frontend**: React 18, TypeScript 5, Vite, Tailwind CSS, Shadcn UI
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State**: Zustand, React Query
- **Forms**: React Hook Form + Zod
- **Payment**: PayU, Stripe
- **Security**: MFA with TOTP (currently disabled for development)
- **Package Forwarding**: Virtual addresses, consolidation, warehouse management
- **ML**: Weight estimation with persistent learning
- **Principles**: DRY, reuse components, simplest solutions

## Core Systems

### Currency System
**Central service**: `CurrencyService.ts` (5-min cache)
- Source: `country_settings` table
- All storage in USD, display in user currency
- Key functions: `getCurrency()`, `formatAmount()`, `isValidPaymentAmount()`

### Quote Calculator
**Engine**: `QuoteCalculatorService.ts` (15-min cache)
- USD base → currency conversion for display
- Customs calculation: max 50%, handles basis points/percentages
- Admin: dual currency, Customer: single currency

### Order Status Flow
```
pending → sent → approved → paid → ordered → shipped → completed
                   ↓
                rejected (recoverable)
```

### Cart System
- **Zustand store** + localStorage persistence
- **Server sync**: `quotes.in_cart` flag
- **Only approved quotes** can be added

### Payment Gateway Fees
**Service**: `PaymentGatewayFeeService.ts`
- Priority: Gateway-specific → Country-specific → Defaults (2.9% + $0.30)
- Uses destination country for fee determination

### Tracking System
- **Format**: IWB{YEAR}{SEQUENCE} (e.g., IWB20251001)
- **Service**: `TrackingService.ts`
- **Status flow**: pending → preparing → shipped → delivered

### Search & Filter
- **Security**: SQL injection prevention, input validation
- **Performance**: 12 specialized indexes (60-80% speed improvement)
- **Admin only**: Advanced search capabilities

### Authentication
- **Roles**: user → moderator → admin
- **RLS functions**: `is_admin()`, `is_authenticated()`
- **Password reset**: Supabase built-in flow

### Customer Display
**Use**: `customerDisplayUtils.ts` for ALL customer displays
- Handles: registered, guest, admin-created, OAuth users
- Standard pattern: `getCustomerDisplayData(quote, customerProfile)`

### Address Management System
**Two distinct address types**:
1. **`warehouse_suite_addresses`** - Virtual US warehouse addresses
   - One per customer
   - Suite numbers (e.g., IWB10001)
   - Used for package receiving
   - Foreign key: `received_packages.warehouse_suite_address_id`

2. **`delivery_addresses`** - Customer delivery addresses
   - Multiple per customer
   - Final destination addresses
   - Used for shipping quotes & orders
   - Can set default address

## Development Commands
```bash
npm run dev              # Dev server (port 8082)
npm run build            # Production build
npm run typecheck        # TypeScript validation  
npm run test             # Unit tests
npm run e2e              # E2E tests
npm run lint             # ESLint validation
```

## Critical Rules

### DO NOT:
- ❌ Hardcode currencies, fees, or shipping costs
- ❌ Bypass core services (Currency, Calculator, Tracking, etc.)
- ❌ Skip input validation or RLS policies
- ❌ Mix currencies in calculations
- ❌ Create custom customer display logic
- ❌ Use `npm run db:reset`

### ALWAYS:
- ✅ Use core services for all operations
- ✅ Store in USD but quotes have origin country currency as well, display in user currency
- ✅ Validate status transitions
- ✅ Check RLS policies for data access
- ✅ Test both admin and customer views
- ✅ Use React Query for API calls
- ✅ Follow TypeScript strict typing

## Database Patterns
- **RLS**: User isolation with admin override
- **JSONB**: Flexible data in `calculation_data`, `customer_data`
- **Caching**: 5-15 minute durations for performance
- **Storage**: USD base currency for all amounts

## Performance Features
- **Multi-layer caching**: Currency (5min), calculations (15min), React Query
- **Database indexes**: 12 specialized for search operations
- **Code splitting**: Lazy-loaded routes
- **Error tracking**: Sentry integration

## AI Assistant Guidelines
1. **Ask first, code later** - clarify requirements
2. **Present options** - 2-3 approaches with trade-offs
3. **Confirm approach** - get approval before extensive coding
4. **Explain errors** - what's causing it + solutions to choose from
5. **Iterative refinement** - start simple, enhance based on feedback

## Architecture Patterns
- **Services**: Singleton with caching
- **Data Flow**: Database (USD) → Service → Formatter → UI (User Currency)
- **State**: Zustand (client) + React Query (server) + localStorage
- **Auth**: Supabase → RLS → Roles → Components