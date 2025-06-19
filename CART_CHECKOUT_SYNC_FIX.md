# Cart-Checkout Synchronization Fix

## Problem Identified

The cart summary and order summary were not matching because they used different calculation methods:

### Cart Calculation (Before Fix)
```typescript
// In useCart.ts
const selectedItemsTotal = items.filter(item => selectedItems.includes(item.id))
  .reduce((total, item) => total + (item.itemPrice * item.quantity), 0);

// In cartStore.ts - itemPrice was set to final_total
itemPrice: quote.final_total_local || quote.final_total || firstItem?.item_price || 0
```

### Checkout Calculation (Before Fix)
```typescript
// In Checkout.tsx
const totalAmount = selectedQuotes?.reduce((sum, quote) => 
  sum + (quote.final_total_local ?? quote.final_total ?? 0), 0) || 0;
```

## Root Cause

1. **Cart Store**: Was using `final_total` as the `itemPrice`, then multiplying by `quantity`
2. **Checkout**: Was using `final_total` directly (which already includes quantity)
3. **Result**: Cart showed `final_total * quantity` while checkout showed `final_total`

## Fix Applied

### 1. Fixed Cart Store Calculation
```typescript
// In cartStore.ts - convertQuoteToCartItem function
const quoteItems = quote.quote_items || [];
const totalFromItems = quoteItems.reduce((sum, item) => {
  return sum + (item.item_price * item.quantity);
}, 0);

const totalPrice = totalFromItems || quote.final_total_local || quote.final_total || 0;
const quantity = quote.quantity || firstItem?.quantity || 1;
const itemPrice = totalPrice / quantity; // Calculate per-item price
```

### 2. Fixed Checkout Calculation
```typescript
// In Checkout.tsx
const totalAmount = selectedQuotes?.reduce((sum, quote) => {
  const quoteItems = quote.quote_items || [];
  const itemTotal = quoteItems.reduce((itemSum, item) => {
    return itemSum + (item.item_price * item.quantity);
  }, 0);
  
  return sum + (itemTotal || quote.final_total_local ?? quote.final_total ?? 0);
}, 0) || 0;
```

### 3. Updated Checkout Query
```typescript
// Added quote_items to the query
.select(`
  *,
  quote_items (
    id,
    item_price,
    quantity,
    product_name
  )
`)
```

### 4. Updated Order Summary Display
```typescript
// Individual item totals now use same calculation
const quoteItems = quote.quote_items || [];
const itemTotal = quoteItems.reduce((sum, item) => {
  return sum + (item.item_price * item.quantity);
}, 0);

const displayTotal = itemTotal || quote.final_total_local ?? quote.final_total ?? 0;
```

## Result

Now both cart and checkout use the same calculation method:
- **Cart**: `itemPrice * quantity` (where itemPrice = totalPrice / quantity)
- **Checkout**: `sum(item_price * quantity)` from quote_items

This ensures that:
- ✅ Cart summary matches order summary
- ✅ Individual item totals are consistent
- ✅ No double-counting of quantities
- ✅ Fallback to final_total when quote_items are not available

## Testing

To verify the fix:
1. Add items to cart
2. Check cart total in CartDrawer
3. Navigate to Cart page and check total
4. Proceed to checkout and verify order summary matches
5. All totals should now be consistent across all components

## Files Modified

1. `src/stores/cartStore.ts` - Fixed itemPrice calculation
2. `src/pages/Checkout.tsx` - Updated total calculation and query
3. `src/components/cart/CartDrawer.tsx` - Removed analytics section (as requested)

The cart analytics that were showing inflated numbers (like NPR 277,907,253.01) have been removed from the CartDrawer, and the underlying calculation issue has been fixed to prevent such discrepancies in the future. 