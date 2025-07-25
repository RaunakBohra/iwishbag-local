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

### 1. **Apply All Migrations**
```bash
# Apply all migrations in order
supabase db push --include-all
```

### 2. **Run Essential Functions Script**
```bash
# Execute the essential functions script via psql or Supabase SQL Editor
psql -h localhost -p 54322 -d postgres -U postgres -f src/scripts/ensure-database-functions.sql
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

### 5. **Migration Files to Check**
- `20250724091000_create_missing_rpc_functions.sql` - Contains the missing RPC functions
- `20250724090000_create_user_activity_analytics.sql` - User activity tracking system
- `20250724084700_create_hsn_tax_system.sql` - HSN classification system

### 6. **Recovery Script Location**
- **Primary**: Migration file will auto-apply
- **Backup**: Manual script at `src/scripts/ensure-database-functions.sql`

## Tech Stack
- **Frontend**: React 18, TypeScript 5, Vite, Tailwind CSS, Shadcn UI
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State**: Zustand, React Query
- **Forms**: React Hook Form + Zod
- **Payment**: PayU, Stripe
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
- ✅ Store in USD, display in user currency
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