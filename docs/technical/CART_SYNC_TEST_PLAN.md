# Cart Synchronization Test Plan

## Overview
This document outlines the test cases to verify that the cart synchronization issues between CartDrawer and Cart page have been resolved.

## Issues Fixed

### 1. **Total Calculation Inconsistency**
- **Problem**: CartDrawer showed `cartTotal` (all items) while Cart page showed `selectedItemsTotal` (selected items only)
- **Fix**: Both components now use `selectedItemsTotal` for consistent calculations
- **Impact**: Totals now match between drawer and page

### 2. **Selection State Management**
- **Problem**: Auto-selection logic was inconsistent between components
- **Fix**: Both components use `selectedCartItemCount` for selection state
- **Impact**: Selection state is now synchronized

### 3. **State Loading Timing**
- **Problem**: Different loading triggers caused state mismatches
- **Fix**: Added auto-sync effect and improved loading logic
- **Impact**: State updates are now consistent

## Test Cases

### Test Case 1: Basic Cart Operations
**Objective**: Verify basic cart functionality works correctly

**Steps**:
1. Open the application
2. Navigate to `/quote` and create a quote
3. Accept the quote to add it to cart
4. Open CartDrawer (click cart icon in header)
5. Navigate to `/cart` page
6. Compare totals between drawer and page

**Expected Results**:
- ✅ CartDrawer shows correct item count
- ✅ Cart page shows same item count
- ✅ Totals match between drawer and page
- ✅ Selection state is consistent

### Test Case 2: Item Selection Synchronization
**Objective**: Verify item selection works across both components

**Steps**:
1. Add multiple items to cart
2. Open CartDrawer
3. Select/deselect items in drawer
4. Navigate to Cart page
5. Verify selection state matches
6. Select/deselect items in Cart page
7. Open CartDrawer again
8. Verify selection state matches

**Expected Results**:
- ✅ Selection state persists between components
- ✅ "Select All" works correctly in both components
- ✅ Individual item selection works in both components
- ✅ Selection counts match between components

### Test Case 3: Quantity Updates
**Objective**: Verify quantity changes sync properly

**Steps**:
1. Add items to cart
2. Open CartDrawer
3. Change quantity of an item
4. Navigate to Cart page
5. Verify quantity change is reflected
6. Change quantity in Cart page
7. Open CartDrawer
8. Verify quantity change is reflected

**Expected Results**:
- ✅ Quantity changes sync between components
- ✅ Totals update correctly after quantity changes
- ✅ Weight calculations update correctly

### Test Case 4: Move Between Cart and Saved
**Objective**: Verify moving items between cart and saved works

**Steps**:
1. Add items to cart
2. Open CartDrawer
3. Move an item to "Saved"
4. Navigate to Cart page
5. Verify item appears in "Saved" tab
6. Move item back to cart from Cart page
7. Open CartDrawer
8. Verify item appears in cart

**Expected Results**:
- ✅ Items move correctly between cart and saved
- ✅ Item counts update correctly
- ✅ Selection state clears when items are moved
- ✅ Totals recalculate correctly

### Test Case 5: Bulk Operations
**Objective**: Verify bulk operations work correctly

**Steps**:
1. Add multiple items to cart
2. Open CartDrawer
3. Select multiple items
4. Perform bulk save operation
5. Navigate to Cart page
6. Verify items moved to saved
7. Select multiple saved items
8. Perform bulk move to cart
9. Open CartDrawer
10. Verify items moved back to cart

**Expected Results**:
- ✅ Bulk operations work in both components
- ✅ Selection state updates correctly after bulk operations
- ✅ Item counts update correctly
- ✅ Totals recalculate correctly

### Test Case 6: Checkout Flow
**Objective**: Verify checkout works with selected items

**Steps**:
1. Add multiple items to cart
2. Open CartDrawer
3. Select some (not all) items
4. Click "Checkout" in drawer
5. Verify only selected items are in checkout
6. Navigate to Cart page
7. Select different items
8. Click "Proceed to Checkout"
9. Verify only selected items are in checkout

**Expected Results**:
- ✅ Only selected items are included in checkout
- ✅ Checkout totals match selected items total
- ✅ URL parameters contain correct quote IDs

### Test Case 7: Auto-Selection Behavior
**Objective**: Verify auto-selection works correctly

**Steps**:
1. Clear all cart items
2. Add new items to cart
3. Open CartDrawer
4. Verify all items are auto-selected
5. Navigate to Cart page
6. Verify all items are auto-selected
7. Deselect some items
8. Refresh page
9. Verify auto-selection works again

**Expected Results**:
- ✅ Auto-selection works when cart is empty and items are added
- ✅ Auto-selection works when page is refreshed
- ✅ Auto-selection doesn't interfere with manual selection

### Test Case 8: Error Handling
**Objective**: Verify error handling works correctly

**Steps**:
1. Simulate network error (disconnect internet)
2. Try to update cart items
3. Verify error messages are shown
4. Reconnect internet
5. Verify sync resumes automatically
6. Check that no data is lost

**Expected Results**:
- ✅ Error messages are displayed appropriately
- ✅ Cart state is preserved during errors
- ✅ Sync resumes automatically when connection is restored
- ✅ No data corruption occurs

### Test Case 9: Performance and Responsiveness
**Objective**: Verify performance is acceptable

**Steps**:
1. Add many items to cart (10+ items)
2. Open CartDrawer
3. Verify drawer opens quickly
4. Navigate to Cart page
5. Verify page loads quickly
6. Perform various operations
7. Verify UI remains responsive

**Expected Results**:
- ✅ Components load quickly (< 2 seconds)
- ✅ UI remains responsive during operations
- ✅ No memory leaks occur
- ✅ Smooth animations and transitions

### Test Case 10: Cross-Browser Compatibility
**Objective**: Verify functionality works across browsers

**Steps**:
1. Test in Chrome
2. Test in Firefox
3. Test in Safari
4. Test in Edge
5. Verify all functionality works consistently

**Expected Results**:
- ✅ All functionality works in all browsers
- ✅ No browser-specific bugs
- ✅ Consistent behavior across browsers

## Test Execution

### Manual Testing
1. Run through each test case manually
2. Document any issues found
3. Verify fixes work correctly
4. Test edge cases and error conditions

### Automated Testing
Use the provided test script (`test-cart-sync.js`) to run automated tests:

```javascript
// In browser console
testCartSync.runAllTests();
```

### Test Environment
- **URL**: `http://localhost:8083`
- **User**: Authenticated user with cart items
- **Browser**: Chrome (latest)
- **Network**: Stable internet connection

## Success Criteria

All test cases must pass with the following criteria:
- ✅ No synchronization issues between CartDrawer and Cart page
- ✅ Totals match between components
- ✅ Selection state is consistent
- ✅ All operations work correctly
- ✅ Performance is acceptable
- ✅ Error handling works properly

## Known Issues (if any)

Document any remaining issues or limitations here.

## Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Basic Cart Operations | ⏳ Pending | |
| Item Selection Sync | ⏳ Pending | |
| Quantity Updates | ⏳ Pending | |
| Move Between Cart/Saved | ⏳ Pending | |
| Bulk Operations | ⏳ Pending | |
| Checkout Flow | ⏳ Pending | |
| Auto-Selection | ⏳ Pending | |
| Error Handling | ⏳ Pending | |
| Performance | ⏳ Pending | |
| Cross-Browser | ⏳ Pending | |

## Conclusion

After implementing the fixes, the cart synchronization issues should be resolved. The key improvements are:

1. **Consistent Total Calculations**: Both components now use `selectedItemsTotal`
2. **Improved Selection State**: Better management of selection state
3. **Auto-Sync**: Automatic synchronization between components
4. **Better Error Handling**: Robust error handling and recovery

Run through all test cases to verify the fixes work correctly. 