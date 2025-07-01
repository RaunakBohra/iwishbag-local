# Dual Currency Display Requirement

## Overview
Admin quotes and orders must display cost breakdowns in **both currencies**:
1. **Purchase Currency** - The currency of the original purchase/country
2. **User's Preferred Currency** - The currency the user has set as their preference

## Why This Matters
- Admins need to see costs in both currencies to understand the full financial picture
- Purchase currency shows the actual costs incurred
- User's preferred currency helps admins understand what the customer sees and expects
- This dual-currency view is essential for pricing decisions and customer communication

## Implementation Requirements

### Database Queries
When fetching quotes or orders for admin display, **ALWAYS** include the user's profile information:

```typescript
// ✅ CORRECT - Include user profile for currency display
.select('*, quote_items(*), profiles!quotes_user_id_fkey(preferred_display_currency)')

// ❌ WRONG - Missing user profile information
.select('*, quote_items(*)')
```

### Type Definitions
Always include the profiles field in type definitions:

```typescript
type QuoteWithItems = Tables<'quotes'> & { 
  quote_items: Tables<'quote_items'>[];
  profiles?: { preferred_display_currency?: string } | null; // REQUIRED
};
```

### Hooks That Must Follow This Pattern
1. `useQuoteQueries.ts` - Individual quote details
2. `useQuoteManagement.ts` - Quotes list
3. `useOrderManagement.ts` - Orders list
4. Any new hooks that fetch quotes/orders for admin display

### Components That Use This Data
- `AdminQuoteDetailPage.tsx` - Quote breakdown in detail view
- `AdminQuoteListItem.tsx` - Quote list items
- `AdminOrderListItem.tsx` - Order list items
- `QuoteCalculatedCosts.tsx` - Cost breakdown display

## How It Works
1. The `QuoteCalculatedCosts` component uses the `useAdminCurrencyDisplay` hook
2. This hook calls `formatMultiCurrency` with the user's preferred currency from `quote.profiles?.preferred_display_currency`
3. The `MultiCurrencyDisplay` component shows both currencies side by side
4. Purchase currency shows actual costs incurred
5. User's preferred currency shows what the customer sees and expects

## Testing Checklist
When working with admin quotes/orders, verify:
- [ ] Quote detail page shows breakdown in both currencies
- [ ] Quote list items show totals in both currencies
- [ ] Order list items show totals in both currencies
- [ ] Currency conversion is working correctly
- [ ] No TypeScript errors related to missing profile fields

## Common Issues
- **400 Bad Request errors** - Usually caused by missing foreign key relationships when joining profiles
- **Only purchase currency showing** - Missing `profiles!quotes_user_id_fkey(preferred_display_currency)` in select
- **TypeScript errors** - Missing `profiles` field in type definitions

## Migration Notes
This requirement was implemented in response to a bug where admin quotes only showed purchase currency. The fix involved updating query hooks to include user profile information for proper dual-currency display.

**Date:** January 2025
**Issue:** Admin quote breakdowns only showing in purchase currency
**Solution:** Added profile joins to quote/order queries 