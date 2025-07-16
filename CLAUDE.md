# Claude AI Assistant Instructions for iwishBag Project

## Project Overview
This is an e-commerce platform for international shopping from Amazon, Flipkart, eBAY , Alibaba and more to customers in India and Nepal to begin with and gradually to the world. We give custoemr quotation, then tehy approve reject, checkout and all that. 

user side pages and admin side pages are different, be careful while making changes in quotes orders pages and others as well because we need to know if i want changes in user side or admin side.

###NEVER RESET THE DB !! donot use supabase db reset --local or cloud

## Key Technologies
- **Frontend**: React 18, TypeScript 5, Vite, Tailwind CSS, Shadcn UI
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: Zustand, React Query
- **Forms**: React Hook Form + Zod validation
- **Payment**: PayU integration
- **Routing**: React Router v6
- follow DRY principles to enture you reuse components when available rather than creating new ones

## Important Notes
- Always check RLS policies when modifying database queries
- Use React Query for all API calls
- Follow the existing file naming conventions
- Maintain TypeScript type safety throughout
VERY IMPORTANT - Dont overcomplicate things to find the solution, aim for simplest solution to the problems 

## Currency System - CRITICAL DOCUMENTATION
**NEVER modify the currency system without understanding this section fully**

### Current Implementation (As of July 2025)
The currency system has been **centralized and database-driven** to replace all hardcoded currency mappings:

#### 1. **CurrencyService.ts** - Central Currency Management
- **Location**: `/src/services/CurrencyService.ts`
- **Purpose**: Singleton service that fetches all currency data from `country_settings` table
- **Features**:
  - 5-minute cache to reduce database calls
  - Minimum payment amounts per currency
  - Currency formatting and validation
  - Payment gateway compatibility checks
  - Fallback to hardcoded values only for critical countries (US, IN, NP)

#### 2. **Database Schema**
- **Table**: `country_settings`
- **Key Fields**: `code`, `currency`, `symbol`, `rate_from_usd`, `minimum_payment_amount`
- **Constraint**: Removed CHECK constraint on `profiles.preferred_display_currency` to allow dynamic currencies

#### 3. **Updated Files Using CurrencyService**
- `src/lib/currencyUtils.ts` - All currency utility functions
- `src/lib/PriceFormatter.ts` - Price formatting with exchange rates
- `src/lib/validation.ts` - Payment amount validation
- `src/components/admin/ExchangeRateManager.tsx` - Exchange rate management
- `src/pages/Profile.tsx` - User currency preferences

### DO NOT:
- ❌ Create new hardcoded currency mappings
- ❌ Bypass CurrencyService for currency data
- ❌ Add CHECK constraints on currency fields
- ❌ Use old currency utility functions without CurrencyService
- ❌ Assume currencies are available - always check CurrencyService

### ALWAYS:
- ✅ Use `currencyService.getCurrency()` for currency data
- ✅ Use async versions of currency functions when possible
- ✅ Check `isSupportedByPaymentGateway()` before processing payments
- ✅ Validate minimum payment amounts using `getMinimumPaymentAmount()`
- ✅ Update `country_settings` table for new currencies
- ✅ Test currency displays after any changes

### Key Functions to Use:
```typescript
// Get currency info (async - preferred)
const currencyInfo = await currencyService.getCurrency('USD');

// Get currency symbol (sync - for display)
const symbol = currencyService.getCurrencySymbol('USD');

// Validate payment amount
const isValid = currencyService.isValidPaymentAmount(100, 'USD');

// Format currency amount
const formatted = currencyService.formatAmount(100, 'USD');
```

### Migration Notes:
- All hardcoded currency lists have been removed
- Components now load currencies dynamically from database
- Profile page fixed to prevent saving issues
- Exchange rates managed through admin interface
- Backward compatibility maintained through sync function variants

## Quote Calculator & Breakdown System - CORE DOCUMENTATION
**NEVER modify the calculator system without understanding this section fully**

### System Overview
The quote calculator is the heart of the iwishBag platform, handling cost calculations for international shopping from Amazon, Flipkart, eBay, Alibaba to customers worldwide. It provides detailed breakdowns with multi-currency support and different views for admin and customers.

### Core Architecture
```typescript
// Core Services
├── QuoteCalculatorService.ts        // Central calculation engine (singleton)
├── CurrencyService.ts               // Currency management
├── unified-shipping-calculator.ts   // Shipping cost calculations
└── PriceFormatter.ts                // Price formatting & display

// UI Components  
├── OptimizedQuoteCalculator.tsx     // Admin/testing calculator
├── QuoteCalculatedCosts.tsx         // Admin cost breakdown
├── QuoteBreakdown.tsx               // Customer quote display
└── DualCurrencyDisplay.tsx          // Multi-currency formatting

// Key Hooks
├── useOptimizedQuoteCalculation.ts  // Calculation orchestration
├── useCurrencyConversion.ts         // Currency conversion logic
└── useQuoteDisplayCurrency.ts       // Customer currency display
```

### Calculation Flow
1. **Input Validation**: Parse and validate all input parameters
2. **Currency Conversion**: Convert input values to USD (base currency)
3. **Shipping Calculation**: Route-specific or country-based fallback
4. **Tax & Duty Calculation**: Customs percentage, VAT calculations  
5. **Fee Calculation**: Payment gateway and handling charges
6. **Final Total**: Sum all costs minus discounts
7. **Currency Display**: Convert to user's preferred currency for display

### Key Calculation Logic
```typescript
// All calculations done in USD, then converted for display
const final_total = 
  total_item_price +           // Item cost
  sales_tax_price +            // Sales tax
  merchant_shipping_price +    // Merchant shipping
  international_shipping +     // International shipping
  customs_and_ecs +           // Customs duty (calculated as percentage)
  domestic_shipping +         // Domestic delivery
  handling_charge +           // Handling fee
  insurance_amount +          // Insurance
  payment_gateway_fee +       // Gateway fee
  vat -                       // VAT
  discount;                   // Discount (negative)
```

### Customs Calculation (Critical)
```typescript
// Handle edge cases in customs percentage
let customs_percentage = parseNumeric(params.customs_percentage);
if (customs_percentage > 10000) {
  customs_percentage = customs_percentage / 10000; // Handle basis points
} else if (customs_percentage > 100) {
  customs_percentage = customs_percentage / 100; // Handle percentage as whole numbers
}
customs_percentage = Math.min(customs_percentage, 50); // Cap at 50%

// Calculate customs on: item + sales tax + merchant shipping + international shipping
const customs_and_ecs = ((total_item_price + sales_tax_price + merchant_shipping_price + international_shipping) * (customs_percentage / 100));
```

### Admin vs Customer Views
- **Admin View**: Dual currency display (e.g., "$100 USD / ₹8,300 INR")
- **Customer View**: Single currency in user's preference (e.g., "₹8,300 INR")

### Database Schema (Key Tables)
```sql
-- quotes table (all amounts in USD)
- item_price, final_total, sales_tax_price, merchant_shipping_price
- international_shipping, customs_and_ecs, domestic_shipping
- handling_charge, insurance_amount, payment_gateway_fee
- discount, sub_total, vat, exchange_rate
- breakdown (JSONB), shipping_address (JSONB)

-- country_settings table
- code, currency, rate_from_usd
- customs_percent, vat_percent
- payment_gateway_fixed_fee, payment_gateway_percent_fee

-- shipping_routes table  
- origin_country, destination_country, exchange_rate
- base_shipping_cost, cost_per_kg, cost_percentage
```

### Performance Features
- **15-minute caching**: Calculations and exchange rates
- **5-minute caching**: Currency data from CurrencyService
- **Debounced calculations**: 800ms for real-time updates
- **Fallback systems**: Multiple levels of error handling

### Critical Fixes Applied
1. **Currency Conversion Fix** (Dec 2024): Fixed double conversion bug
2. **Origin Country Fix** (Jan 2025): Fixed `useQuoteDisplayCurrency` to use `quote?.origin_country` instead of `quote?.destination_country`
3. **Centralized Currency** (Jul 2025): Database-driven currency system

### DO NOT:
- ❌ Modify calculation logic without understanding the full flow
- ❌ Change currency conversion without testing both admin and customer views  
- ❌ Skip input validation or fallback handling
- ❌ Hardcode shipping costs or exchange rates
- ❌ Bypass the QuoteCalculatorService for calculations

### ALWAYS:
- ✅ Use QuoteCalculatorService.calculateQuote() for all calculations
- ✅ Test both admin (dual currency) and customer (single currency) views
- ✅ Validate inputs and handle edge cases (especially customs percentage)
- ✅ Use proper caching and performance optimizations
- ✅ Maintain USD as base currency for all database storage

## Order Management & Status System - CORE DOCUMENTATION
**NEVER modify order flow without understanding this section fully**

### Status Workflow (Quote → Order → Payment → Shipping)
```typescript
// Quote Status Flow
pending → sent → approved → paid → ordered → shipped → completed
                    ↓
                 rejected (can return to approved)
```

### Key Components
- `useQuoteManagement.ts` - Quote lifecycle management
- `useStatusTransitions.ts` - Status workflow validation  
- `QuoteManagementPage.tsx` - Admin interface
- Database: `quotes` table with status tracking

### Critical Business Rules
1. **Status Transitions**: Must follow defined workflow, validated server-side
2. **Address Locking**: Customer addresses locked after payment confirmation
3. **Currency Consistency**: All amounts stored in USD, displayed per user preference
4. **In-Cart Logic**: Only approved quotes can be added to cart (`in_cart` flag)

### DO NOT:
- ❌ Skip status transition validation
- ❌ Allow address changes after payment
- ❌ Mix currencies in calculations
- ❌ Bypass quote approval for cart addition

## Cart System - CORE DOCUMENTATION  
**NEVER modify cart logic without understanding this section fully**

### Architecture
- **State Management**: Zustand store with localStorage persistence
- **Server Sync**: Bidirectional sync with `quotes.in_cart` flag
- **User Isolation**: Cart keys include user ID for multi-user support
- **Optimistic Updates**: UI updates immediately, rollback on server errors

### Key Components
```typescript
├── stores/cartStore.ts          // Zustand cart state
├── hooks/useCart.ts             // Cart operations  
├── components/cart/Cart.tsx     // Main cart UI
└── Database: quotes.in_cart     // Server persistence
```

### Critical Cart Logic
```typescript
// Cart items are references to approved quotes
interface CartItem {
  id: string;           // Quote ID
  quoteId: string;      // Same as ID (for consistency)
  finalTotal: number;   // Quote total in USD
  quantity: number;     // Item quantity
  in_cart: boolean;     // Server sync flag
}
```

### DO NOT:
- ❌ Add non-approved quotes to cart
- ❌ Skip server synchronization
- ❌ Modify cart without user authentication
- ❌ Bypass quantity or weight validations

## Authentication & Roles - CORE DOCUMENTATION
**NEVER modify auth system without understanding this section fully**

### Role Hierarchy
```typescript
// Three-tier permission system
'user'      → Customer access (quotes, orders, profile)
'moderator' → Limited admin access (view quotes, basic updates)  
'admin'     → Full system access (all operations)
```

### Key Components
- `AuthContext.tsx` - Authentication state management
- `useUserRoles.ts` - Role-based access control
- `ProtectedRoute.tsx` - Route-level protection
- Database: `user_roles` table with role assignments

### Password Reset Feature (As of July 2025)
The password reset system uses Supabase Auth's built-in functionality:

#### Components:
- `src/pages/auth/ResetPassword.tsx` - Password reset form page
- `src/components/forms/AuthForm.tsx` - Forgot password modal
- `src/hooks/useEmailNotifications.ts` - Email templates for reset notifications

#### Flow:
1. **Request Reset**: User clicks "Forgot Password?" in AuthForm
2. **Email Sent**: Supabase sends reset link to user's email
3. **Reset Page**: User clicks link, redirected to `/auth/reset` with tokens
4. **New Password**: User enters new password with validation
5. **Confirmation**: Success message and redirect to login

#### Password Requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- At least one special character

### Critical Auth Patterns
```typescript
// Role checking pattern
const { hasRole, isAdmin, isAuthenticated } = useUserRoles();

// Route protection
<AdminProtectedRoute>
  <AdminDashboard />
</AdminProtectedRoute>

// Database RLS functions
is_admin()         // Admin role check
is_authenticated() // Auth check  
has_role(role)     // Specific role check
```

### DO NOT:
- ❌ Skip role validation for admin features
- ❌ Hardcode permissions in components
- ❌ Bypass RLS policies for data access
- ❌ Assume user roles exist (check first)
- ❌ Modify password reset flow without testing email delivery

## Payment Integration - CORE DOCUMENTATION
**NEVER modify payment system without understanding this section fully**

### Multi-Gateway Architecture
- **PayU**: Primary gateway for India/Nepal
- **Stripe**: International payments
- **Bank Transfer**: Local payment option
- **Currency-Specific**: Gateway selection based on destination country

### Key Components
```typescript
├── components/payment/PaymentStatusTracker.tsx  // Status monitoring
├── hooks/usePaymentGateways.ts                  // Gateway config
├── types/payment.ts                             // Type definitions
└── Database: payment transactions tracking
```

### Payment Flow
1. **Gateway Selection**: Based on destination country and currency
2. **Amount Validation**: Check minimum payment amounts per currency
3. **Payment Initiation**: Create payment session with gateway
4. **Status Tracking**: Real-time updates via webhooks + polling
5. **Order Confirmation**: Update quote status to 'paid' on success

### Critical Payment Logic
```typescript
// Minimum payment validation per currency
const minAmount = currencyService.getMinimumPaymentAmount(currency);
const isValidAmount = amount >= minAmount;

// Gateway selection logic
const gateway = destination_country === 'IN' || destination_country === 'NP' 
  ? 'payu' 
  : 'stripe';
```

### DO NOT:
- ❌ Skip minimum payment amount validation
- ❌ Hardcode gateway selection logic
- ❌ Bypass currency-specific validations
- ❌ Skip payment confirmation before order creation

## Database RLS Security - CORE DOCUMENTATION
**NEVER modify RLS policies without understanding this section fully**

### Security Model
- **User Data Isolation**: Users can only access their own quotes/orders/profiles
- **Admin Override**: `is_admin()` function bypasses user restrictions
- **Service Role**: Backend operations use service role (bypasses RLS)
- **Public Data**: Country settings, shipping routes (read-only access)

### Key RLS Functions
```sql
-- Admin role check
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- User data access pattern
CREATE POLICY "Users can access own quotes" ON quotes
  FOR ALL USING (user_id = auth.uid() OR is_admin());
```

### Critical RLS Patterns
- **Quotes/Orders**: User owns data OR admin access
- **Profiles**: User owns profile OR admin access  
- **Cart Items**: User owns items (via quotes relationship)
- **Documents**: User owns quote OR admin access + visibility rules

### DO NOT:
- ❌ Bypass RLS policies with service role in client code
- ❌ Hardcode user restrictions in application logic
- ❌ Skip policy testing for new features
- ❌ Create overly complex RLS policies (performance impact)

## AI Assistant Guidelines
- **Ask First, Code Later**: Always clarify requirements before implementing
- **No Assumptions**: If something is unclear, ask specific questions
- **Brainstorm Solutions**: Present multiple approaches with pros/cons
- **Validate Understanding**: Confirm interpretation of requirements
- **Iterative Refinement**: Start with core functionality, then enhance based on feedback
- if error is shared by me, explain whats causing it and then tell me ways to fix it. ask me which solution i'd want

## Data Flow Optimization Principles
- **Fix Data Flow First**: Before adding new API calls or features, check if the issue is just improper data synchronization
- **Use React Query Properly**: Ensure correct query invalidation patterns instead of adding redundant data fetches
- **Single Source of Truth**: Avoid duplicate data entry points - components should share the same database values
- **Query Key Consistency**: Components displaying the same data should use consistent query keys for proper cache management
- **Minimize API Calls**: Focus on proper cache invalidation rather than making extra database queries
- **Component Communication**: Use React Query's cache as the communication layer between components displaying the same data

## Before Starting Any Task
1. **Clarify Requirements**
   - What is the exact goal?
   - Who are the users?
   - What are the constraints?
   - What's the expected behavior?

2. **Explore Options**
   - Present 2-3 different approaches
   - Discuss trade-offs
   - Recommend the best solution with reasoning

3. **Confirm Approach**
   - Get approval before extensive coding
   - Break down complex tasks into phases
   - Set clear milestones


 

