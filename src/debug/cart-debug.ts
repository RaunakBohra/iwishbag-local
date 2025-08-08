/**
 * Cart Debug Utilities
 * 
 * Run these functions in browser console to debug cart issues:
 * - cartDebug.checkCartState()
 * - cartDebug.testCartPersistence()
 * - cartDebug.checkCurrencyConversion()
 * - cartDebug.inspectDatabase()
 */

import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/stores/cartStore';
import { currencyService } from '@/services/CurrencyService';

export const cartDebug = {
  /**
   * Check current cart state
   */
  checkCartState() {
    const state = useCartStore.getState();
    
    console.group('[CART DEBUG] Current Cart State');
    console.log('Items:', state.items.length);
    console.log('Is Loading:', state.isLoading);
    console.log('Is Initialized:', state.isInitialized);
    console.log('Current User ID:', state.currentUserId);
    console.log('Sync Status:', state.syncStatus);
    
    console.group('Items Details:');
    state.items.forEach((item, index) => {
      console.log(`Item ${index + 1}:`, {
        quoteId: item.quote.id,
        displayId: item.quote.display_id,
        total_quote_origincurrency: item.quote.total_quote_origincurrency,
        final_total_origin: item.quote.final_total_origin,
        customer_currency: item.quote.customer_currency,
        status: item.quote.status,
        in_cart: item.quote.in_cart,
        metadata: item.metadata
      });
    });
    console.groupEnd();
    
    console.log('Total Value (from getTotalValue):', state.getTotalValue());
    console.groupEnd();

    return state;
  },

  /**
   * Test cart persistence across browser refresh
   */
  async testCartPersistence() {
    console.group('[CART DEBUG] Cart Persistence Test');
    
    // Check current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current User:', { id: user?.id, email: user?.email });
    
    if (!user) {
      console.error('No authenticated user found');
      console.groupEnd();
      return;
    }

    // Check database directly
    const { data: cartQuotes, error } = await supabase
      .from('quotes_v2')
      .select('id, display_id, in_cart, status, total_quote_origincurrency, final_total_origin, customer_currency, customer_id')
      .eq('customer_id', user.id)
      .eq('in_cart', true);

    console.log('Database Cart Items:', { 
      success: !error,
      error: error?.message,
      count: cartQuotes?.length || 0,
      items: cartQuotes || []
    });

    // Check if localStorage has any cart-related data
    const localStorageKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('cart') || key.includes('zustand'))) {
        localStorageKeys.push({ key, value: localStorage.getItem(key) });
      }
    }
    console.log('LocalStorage Cart Data:', localStorageKeys);

    // Force re-initialization
    console.log('Force re-initializing cart...');
    const state = useCartStore.getState();
    try {
      await state.initialize();
      console.log('Re-initialization successful');
      this.checkCartState();
    } catch (error) {
      console.error('Re-initialization failed:', error);
    }

    console.groupEnd();
  },

  /**
   * Check currency conversion flow
   */
  async checkCurrencyConversion() {
    console.group('[CART DEBUG] Currency Conversion Check');
    
    const state = useCartStore.getState();
    
    if (state.items.length === 0) {
      console.log('No items in cart to test conversion');
      console.groupEnd();
      return;
    }

    const testCurrencies = ['USD', 'INR', 'NPR'];
    
    for (const currency of testCurrencies) {
      console.group(`Testing conversion to ${currency}`);
      
      // Test individual items
      for (let i = 0; i < state.items.length; i++) {
        const item = state.items[i];
        const quote = item.quote;
        const originPrice = quote.total_quote_origincurrency || quote.final_total_origin || 0;
        const originCurrency = quote.customer_currency || 'USD';
        
        console.log(`Item ${i + 1}:`, {
          originPrice,
          originCurrency,
          quote_id: quote.id
        });

        if (originCurrency !== currency) {
          try {
            const converted = await currencyService.convertAmount(originPrice, originCurrency, currency);
            console.log(`  Converted: ${originPrice} ${originCurrency} = ${converted} ${currency}`);
          } catch (error) {
            console.error(`  Conversion failed:`, error);
          }
        } else {
          console.log(`  No conversion needed (same currency)`);
        }
      }

      // Test total conversion
      const totalUSD = state.getTotalValue();
      console.log(`Total in store: ${totalUSD} USD`);
      
      if (currency !== 'USD') {
        try {
          const convertedTotal = await currencyService.convertAmount(totalUSD, 'USD', currency);
          console.log(`Converted total: ${totalUSD} USD = ${convertedTotal} ${currency}`);
        } catch (error) {
          console.error('Total conversion failed:', error);
        }
      }

      console.groupEnd();
    }

    console.groupEnd();
  },

  /**
   * Inspect database for cart-related issues
   */
  async inspectDatabase() {
    console.group('[CART DEBUG] Database Inspection');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      console.groupEnd();
      return;
    }

    // Check all quotes for this user
    const { data: allQuotes, error: allError } = await supabase
      .from('quotes_v2')
      .select('id, display_id, status, in_cart, total_quote_origincurrency, final_total_origin, customer_currency, created_at')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('Recent Quotes:', {
      success: !allError,
      error: allError?.message,
      count: allQuotes?.length || 0,
      quotes: allQuotes || []
    });

    // Check specifically in_cart = true
    const { data: cartQuotes, error: cartError } = await supabase
      .from('quotes_v2')
      .select('*')
      .eq('customer_id', user.id)
      .eq('in_cart', true);

    console.log('In-Cart Quotes:', {
      success: !cartError,
      error: cartError?.message,
      count: cartQuotes?.length || 0,
      quotes: cartQuotes?.map(q => ({
        id: q.id,
        display_id: q.display_id,
        status: q.status,
        total_quote_origincurrency: q.total_quote_origincurrency,
        final_total_origin: q.final_total_origin,
        customer_currency: q.customer_currency,
        created_at: q.created_at,
        updated_at: q.updated_at
      })) || []
    });

    // Check for any data inconsistencies
    if (cartQuotes && cartQuotes.length > 0) {
      console.group('Data Consistency Checks:');
      cartQuotes.forEach((quote, index) => {
        const issues = [];
        
        if (!quote.total_quote_origincurrency && !quote.final_total_origin) {
          issues.push('Missing price data');
        }
        
        if (!quote.customer_currency) {
          issues.push('Missing currency data');
        }
        
        if (quote.status !== 'approved') {
          issues.push(`Unexpected status: ${quote.status}`);
        }

        console.log(`Quote ${index + 1} (${quote.display_id}):`, {
          issues: issues.length > 0 ? issues : ['No issues found'],
          hasCalculationData: !!quote.calculation_data,
          hasItems: !!quote.items
        });
      });
      console.groupEnd();
    }

    console.groupEnd();
  },

  /**
   * Clear all cart data (for testing)
   */
  async clearAllCartData() {
    console.group('[CART DEBUG] Clearing All Cart Data');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      console.groupEnd();
      return;
    }

    // Clear database
    const { error } = await supabase
      .from('quotes_v2')
      .update({ in_cart: false })
      .eq('customer_id', user.id)
      .eq('in_cart', true);

    console.log('Database clear result:', { success: !error, error: error?.message });

    // Clear store
    const state = useCartStore.getState();
    state.clearCart().catch(console.error);

    // Clear localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes('cart') || key.includes('zustand'))) {
        localStorage.removeItem(key);
        console.log(`Removed localStorage key: ${key}`);
      }
    }

    console.log('All cart data cleared');
    console.groupEnd();
  },

  /**
   * Simulate cart refresh to test persistence
   */
  async simulateRefresh() {
    console.group('[CART DEBUG] Simulating Page Refresh');
    
    // Save current state
    const beforeState = this.checkCartState();
    console.log('State before refresh simulation');
    
    // Reset store to uninitialized state (simulating fresh page load)
    const store = useCartStore;
    store.setState({
      items: [],
      isLoading: false,
      isInitialized: false,
      currentUserId: null,
      syncStatus: 'offline'
    });

    console.log('Store reset to initial state');

    // Re-initialize (simulating what happens on page load)
    try {
      await store.getState().initialize();
      console.log('Re-initialization completed');
      
      const afterState = this.checkCartState();
      console.log('State after refresh simulation');
      
      // Compare states
      console.group('Comparison:');
      console.log('Items before:', beforeState.items.length);
      console.log('Items after:', afterState.items.length);
      console.log('Items match:', beforeState.items.length === afterState.items.length);
      console.groupEnd();
      
    } catch (error) {
      console.error('Re-initialization failed:', error);
    }

    console.groupEnd();
  }
};

// Make available globally for browser console access
if (typeof window !== 'undefined') {
  (window as any).cartDebug = cartDebug;
  console.log('Cart debug utilities available at window.cartDebug');
}

export default cartDebug;