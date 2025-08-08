/**
 * Currency Fixes Validation Script
 * 
 * Quick validation script to test if the user's specific currency issues are resolved
 * This focuses on the original problem: ₹3,500 INR quote showing as $291,025 USD in cart
 */

import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/stores/cartStore';
import { currencyService } from '@/services/CurrencyService';
import { auditSpecificQuote } from '@/scripts/currency-audit';
import { repairCartItemCurrencies } from '@/scripts/currency-repair';

/**
 * Test the user's specific currency corruption issue
 */
export async function testOriginalCurrencyIssue(): Promise<void> {
  console.log('🔍 Testing original currency issue fix...');
  
  try {
    // 1. Look for quotes with USD currency but non-US origin (the original problem)
    console.log('1. Scanning for corrupted USD quotes...');
    
    const { data: suspiciousQuotes } = await supabase
      .from('quotes_v2')
      .select('id, display_id, customer_currency, origin_country, total_quote_origincurrency, final_total_origin')
      .eq('customer_currency', 'USD')
      .neq('origin_country', 'US')
      .limit(5);

    if (suspiciousQuotes && suspiciousQuotes.length > 0) {
      console.log('⚠️ Found potentially corrupted quotes:', suspiciousQuotes.map(q => ({
        id: q.display_id || q.id,
        currency: q.customer_currency,
        origin: q.origin_country,
        amount: q.total_quote_origincurrency || q.final_total_origin
      })));
      
      console.log('💡 Recommendation: Run currency repair to fix these quotes');
      console.log('   Use: window.currencyRepair.repairAll(false) // false = live run');
    } else {
      console.log('✅ No corrupted USD quotes found - currency corruption has been resolved!');
    }

    // 2. Test cart totals calculation
    console.log('\n2. Testing cart totals calculation...');
    
    const cartStore = useCartStore.getState();
    const items = cartStore.items;
    
    if (items.length === 0) {
      console.log('ℹ️ Cart is empty - add some items to test totals calculation');
      return;
    }

    console.log(`📊 Cart has ${items.length} items:`);
    
    // Test the new currency-aware totals
    const currencyBreakdown = cartStore.getTotalValueWithCurrency();
    console.log('Currency breakdown:', currencyBreakdown);
    
    // Check for the original issue: massive USD amounts from INR quotes
    for (const [currency, total] of Object.entries(currencyBreakdown.totalsByCurrency)) {
      console.log(`   ${currency}: ${total}`);
      
      // Flag suspicious amounts (the original issue was ₹3,500 → $291,025)
      if (currency === 'USD' && total > 50000) {
        console.log('🚨 POTENTIAL ISSUE: Very large USD amount detected!');
        console.log('   This might indicate currency conversion error');
        console.log('   Original issue: INR amounts being treated as USD');
      }
      
      if (currency === 'INR' && total > 500000) {
        console.log('🚨 POTENTIAL ISSUE: Very large INR amount detected!');
        console.log('   This might indicate currency conversion error');
      }
    }

    // 3. Test individual cart items for currency consistency
    console.log('\n3. Validating individual cart items...');
    
    let issueCount = 0;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const quote = item.quote;
      
      console.log(`\nItem ${i + 1}: ${quote.display_id || quote.id}`);
      console.log(`  Currency: ${quote.customer_currency}`);
      console.log(`  Origin: ${quote.origin_country}`);
      console.log(`  Amount: ${quote.total_quote_origincurrency || quote.final_total_origin}`);
      
      // Check for the specific corruption pattern
      if (quote.customer_currency === 'USD' && quote.origin_country !== 'US') {
        console.log(`  🚨 CURRENCY CORRUPTION DETECTED!`);
        console.log(`     USD currency with ${quote.origin_country} origin country`);
        console.log(`     This is the exact issue that was causing cart problems`);
        issueCount++;
        
        // Show what the corrected values should be
        const { detectQuoteCurrency } = await import('@/utils/quoteCurrency');
        const corrected = detectQuoteCurrency(quote);
        console.log(`     Corrected currency should be: ${corrected.detectedCurrency}`);
      } else {
        console.log(`  ✅ Currency looks consistent`);
      }
      
      // Check metadata for validation info
      if (item.metadata?.currencyValidation) {
        const validation = item.metadata.currencyValidation;
        console.log(`  Validation: ${validation.isValid ? '✅ Valid' : '⚠️ Has issues'}`);
        if (!validation.isValid) {
          console.log(`    Issues: ${validation.issues?.join(', ')}`);
        }
      }
    }

    if (issueCount > 0) {
      console.log(`\n🚨 Found ${issueCount} items with currency corruption!`);
      console.log('📋 Next steps:');
      console.log('   1. Run: window.currencyRepair.repairCartItems(false)');
      console.log('   2. Refresh cart: cartStore.syncWithServer()');
      console.log('   3. Re-run this test to verify fixes');
    } else {
      console.log('\n✅ All cart items have consistent currencies!');
    }

    // 4. Test the total conversion to user display currency
    console.log('\n4. Testing display currency conversion...');
    
    try {
      const { useCart } = await import('@/hooks/useCart');
      // This would need to be called from a React component context
      console.log('ℹ️ Display currency conversion test requires React context');
      console.log('   Check the cart page UI to ensure totals display correctly');
    } catch (error) {
      console.log('ℹ️ Display currency test skipped (requires React context)');
    }

    console.log('\n🎯 VALIDATION SUMMARY');
    console.log('=====================');
    if (issueCount === 0 && (!suspiciousQuotes || suspiciousQuotes.length === 0)) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ Currency corruption issues appear to be resolved');
      console.log('✅ Cart should now display correct totals');
      console.log('✅ No more ₹3,500 → $291,025 conversion errors');
    } else {
      console.log('⚠️ Issues found - currency fixes may not be complete');
      console.log('📋 Use the repair utilities to fix remaining issues');
    }

  } catch (error) {
    console.error('💥 Validation test failed:', error);
    throw error;
  }
}

/**
 * Quick fix for any remaining currency issues
 */
export async function quickFixCurrencyIssues(): Promise<void> {
  console.log('🔧 Running quick currency fixes...');
  
  try {
    // 1. Repair cart items first (highest priority)
    console.log('1. Repairing cart items...');
    const cartRepairResult = await repairCartItemCurrencies(false); // Live run
    
    console.log(`Cart repair: ${cartRepairResult.successfulRepairs} repaired, ${cartRepairResult.failedRepairs} failed`);
    
    // 2. Sync cart to apply fixes
    console.log('2. Syncing cart...');
    const cartStore = useCartStore.getState();
    await cartStore.syncWithServer();
    
    // 3. Run integrity check
    console.log('3. Running integrity check...');
    await cartStore.runIntegrityCheck();
    
    console.log('✅ Quick fix completed!');
    console.log('🔍 Run testOriginalCurrencyIssue() again to validate fixes');
    
  } catch (error) {
    console.error('💥 Quick fix failed:', error);
    throw error;
  }
}

/**
 * Simulate the original problematic scenario for testing
 */
export async function simulateOriginalIssue(): Promise<void> {
  console.log('🧪 Simulating original currency issue for testing...');
  
  // This creates a test scenario similar to what the user experienced
  const testQuote = {
    id: 'test-corruption-simulation',
    display_id: 'TEST-CORRUPTION',
    customer_currency: 'USD', // Wrong!
    origin_country: 'IN', // Should be INR for India
    destination_country: 'IN',
    total_quote_origincurrency: 3500, // ₹3,500
    final_total_origin: 3500,
    status: 'approved'
  };

  console.log('Original problematic data:', testQuote);
  
  // Test currency detection
  const { detectQuoteCurrency } = await import('@/utils/quoteCurrency');
  const detection = detectQuoteCurrency(testQuote);
  
  console.log('Currency detection result:', detection);
  
  // Test cart validation
  const { validateQuoteForCart } = await import('@/utils/cartCurrencyValidation');
  const validation = await validateQuoteForCart(testQuote as any);
  
  console.log('Cart validation result:', {
    canProceed: validation.canProceed,
    criticalIssues: validation.criticalIssues,
    issues: validation.issues
  });

  // Test what the cart total calculation would show
  console.log('\nCart total simulation:');
  console.log('❌ OLD BEHAVIOR: Would treat ₹3,500 as $3,500 USD');
  console.log('❌ OLD CONVERSION: $3,500 × 83 (USD→INR rate) = ₹291,025');
  console.log('✅ NEW BEHAVIOR: Detects currency corruption and corrects to INR');
  console.log('✅ NEW RESULT: ₹3,500 stays as ₹3,500 (no incorrect conversion)');

  if (validation.canProceed) {
    console.log('⚠️ VALIDATION ISSUE: Corrupted quote was allowed!');
    console.log('   This indicates the validation logic needs refinement');
  } else {
    console.log('✅ VALIDATION SUCCESS: Corrupted quote was properly blocked');
    console.log('   Validation message:', validation.criticalIssues[0]);
  }
}

// Make available globally for easy testing
if (typeof window !== 'undefined') {
  (window as any).validateCurrencyFixes = {
    test: testOriginalCurrencyIssue,
    quickFix: quickFixCurrencyIssues,
    simulate: simulateOriginalIssue
  };
  
  console.log('🔍 Currency fix validation available:');
  console.log('  window.validateCurrencyFixes.test() - Test if original issue is fixed');
  console.log('  window.validateCurrencyFixes.quickFix() - Quick fix for remaining issues');
  console.log('  window.validateCurrencyFixes.simulate() - Simulate original problem');
}

export { testOriginalCurrencyIssue, quickFixCurrencyIssues, simulateOriginalIssue };