/**
 * Check Specific Quote Debug Script
 * 
 * Debug the cart issue with quote 14fd95c9-825a-4ab3-8e08-cc4777369715
 */

import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/stores/cartStore';
import { detectQuoteCurrency, shouldBlockQuoteFromCart } from '@/utils/quoteCurrency';
import { validateQuoteForCart } from '@/utils/cartCurrencyValidation';

export async function debugSpecificQuote(quoteId = '14fd95c9-825a-4ab3-8e08-cc4777369715') {
  console.log(`🔍 Debugging quote: ${quoteId}`);
  console.log('===================================');

  try {
    // 1. Get quote from database
    console.log('1. Fetching quote from database...');
    const { data: quote, error } = await supabase
      .from('quotes_v2')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (error || !quote) {
      console.error('❌ Quote not found:', error);
      return;
    }

    console.log('✅ Quote found:', {
      id: quote.id,
      display_id: quote.display_id,
      customer_currency: quote.customer_currency,
      origin_country: quote.origin_country,
      destination_country: quote.destination_country,
      status: quote.status,
      in_cart: quote.in_cart,
      total_quote_origincurrency: quote.total_quote_origincurrency,
      final_total_origin: quote.final_total_origin
    });

    // 2. Test currency detection
    console.log('\n2. Testing currency detection...');
    const currencyDetection = detectQuoteCurrency(quote);
    console.log('Currency detection result:', currencyDetection);

    // 3. Test cart blocking
    console.log('\n3. Testing cart blocking logic...');
    const blockCheck = shouldBlockQuoteFromCart(quote);
    console.log('Block check result:', blockCheck);

    // 4. Test full cart validation
    console.log('\n4. Testing full cart validation...');
    try {
      const cartValidation = await validateQuoteForCart(quote);
      console.log('Cart validation result:', {
        isValid: cartValidation.isValid,
        canProceed: cartValidation.canProceed,
        criticalIssues: cartValidation.criticalIssues,
        issues: cartValidation.issues,
        recommendations: cartValidation.recommendations
      });
    } catch (validationError) {
      console.error('❌ Cart validation failed:', validationError);
    }

    // 5. Test adding to cart
    console.log('\n5. Testing add to cart operation...');
    const cartStore = useCartStore.getState();
    
    // Check current cart state
    console.log('Current cart items:', cartStore.items.length);
    console.log('Is in cart according to DB:', quote.in_cart);
    console.log('Is in cart according to store:', cartStore.hasItem(quoteId));

    // Try to add to cart
    try {
      console.log('Attempting to add to cart...');
      await cartStore.addItem(quote);
      console.log('✅ Successfully added to cart');
      
      // Check new state
      console.log('New cart items count:', cartStore.getTotalCount());
      console.log('Is now in cart store:', cartStore.hasItem(quoteId));
      
      // Check database update
      const { data: updatedQuote } = await supabase
        .from('quotes_v2')
        .select('in_cart')
        .eq('id', quoteId)
        .single();
      
      console.log('Database in_cart flag:', updatedQuote?.in_cart);
      
    } catch (addError) {
      console.error('❌ Failed to add to cart:', addError);
    }

    // 6. Test cart sync
    console.log('\n6. Testing cart synchronization...');
    try {
      await cartStore.syncWithServer();
      console.log('✅ Cart sync completed');
      
      // Check if item persists after sync
      console.log('Items after sync:', cartStore.getTotalCount());
      console.log('Target item still in cart:', cartStore.hasItem(quoteId));
      
    } catch (syncError) {
      console.error('❌ Cart sync failed:', syncError);
    }

    // 7. Recommendations
    console.log('\n7. Debugging Summary:');
    console.log('===================');
    
    if (quote.status !== 'approved') {
      console.log('❌ ISSUE: Quote status is not "approved" - only approved quotes can be added to cart');
    }
    
    if (!currencyDetection.isValid) {
      console.log('❌ ISSUE: Currency validation failed');
      console.log('   Issues:', currencyDetection.issues);
    }
    
    if (blockCheck.blocked) {
      console.log('❌ ISSUE: Quote is blocked from cart');
      console.log('   Reason:', blockCheck.reason);
    }
    
    if (quote.in_cart && !cartStore.hasItem(quoteId)) {
      console.log('❌ ISSUE: Database says in_cart=true but cart store doesn\'t have it');
      console.log('   This suggests a sync issue or cart initialization problem');
    }
    
    if (!quote.in_cart && cartStore.hasItem(quoteId)) {
      console.log('❌ ISSUE: Cart store has item but database says in_cart=false');
      console.log('   This suggests the database update failed');
    }

    console.log('\n📋 Next Steps:');
    if (quote.status !== 'approved') {
      console.log('1. Change quote status to "approved" to allow cart operations');
    }
    if (!currencyDetection.isValid) {
      console.log('2. Run currency repair: window.currencyRepair.repairQuote("' + quoteId + '", false)');
    }
    if (quote.in_cart && !cartStore.hasItem(quoteId)) {
      console.log('3. Run cart sync: cartStore.syncWithServer()');
    }

  } catch (error) {
    console.error('💥 Debug script failed:', error);
  }
}

export async function fixSpecificQuoteIssues(quoteId = '14fd95c9-825a-4ab3-8e08-cc4777369715') {
  console.log(`🔧 Attempting to fix issues with quote: ${quoteId}`);
  
  try {
    // 1. Run currency repair
    console.log('1. Running currency repair...');
    const { repairQuoteCurrency } = await import('@/scripts/currency-repair');
    const repairResult = await repairQuoteCurrency(quoteId, false); // Live run
    console.log('Repair result:', repairResult);

    // 2. Sync cart
    console.log('2. Syncing cart...');
    const cartStore = useCartStore.getState();
    await cartStore.syncWithServer();
    
    // 3. Check if quote is now addable
    console.log('3. Testing if quote can now be added to cart...');
    const { data: quote } = await supabase
      .from('quotes_v2')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quote) {
      const validation = await validateQuoteForCart(quote);
      console.log('Post-fix validation:', {
        canProceed: validation.canProceed,
        issues: validation.issues.length
      });
    }

    console.log('✅ Fix attempt completed');
    
  } catch (error) {
    console.error('❌ Fix attempt failed:', error);
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).debugSpecificQuote = debugSpecificQuote;
  (window as any).fixSpecificQuote = fixSpecificQuoteIssues;
  
  console.log('🔍 Quote debugging tools available:');
  console.log('  debugSpecificQuote() - Debug the problematic quote');
  console.log('  fixSpecificQuote() - Attempt to fix quote issues');
}

export default { debugSpecificQuote, fixSpecificQuoteIssues };