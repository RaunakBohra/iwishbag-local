# Claude AI Assistant Instructions for iwishBag Project

## Project Overview
This is an e-commerce platform for international shopping from Amazon, Flipkart, eBAY , Alibaba and more to customers in India and Nepal to begin with and gradually to the world. We give custoemr quotation, then tehy approve reject, checkout and all that. 

user side pages and admin side pages are different, be careful while making changes in quotes orders pages and others as well because we need to know if i want changes in user side or admin side.

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

## AI Assistant Guidelines
- **Ask First, Code Later**: Always clarify requirements before implementing
- **No Assumptions**: If something is unclear, ask specific questions
- **Brainstorm Solutions**: Present multiple approaches with pros/cons
- **Validate Understanding**: Confirm interpretation of requirements
- **Iterative Refinement**: Start with core functionality, then enhance based on feedback
- if error is shared by me, explain whats causing it and then tell me ways to fix it. ask me which solution i'd want

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
