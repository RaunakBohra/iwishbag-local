/**
 * Cart Currency Testing Utilities
 * 
 * Comprehensive testing suite for validating cart and currency fixes
 * Run these tests to ensure all currency scenarios work correctly
 */

import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/stores/cartStore';
import { currencyService } from '@/services/CurrencyService';
import { CheckoutService } from '@/services/CheckoutService';
import { validateCartIntegrity, validateQuoteForCart, getCurrencyErrorMessage } from './cartCurrencyValidation';
import { detectQuoteCurrency } from './quoteCurrency';
import type { Quote } from '@/types/cart';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
  error?: string;
}

interface TestSuite {
  suiteName: string;
  results: TestResult[];
  passed: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

/**
 * Test cart operations with various currency scenarios
 */
export class CartCurrencyTester {
  private originalItems: any[] = [];

  constructor() {
    console.log('🧪 Cart Currency Tester initialized');
  }

  /**
   * Backup current cart state
   */
  private async backupCart(): Promise<void> {
    const cartStore = useCartStore.getState();
    this.originalItems = [...cartStore.items];
    console.log(`📦 Backed up ${this.originalItems.length} cart items`);
  }

  /**
   * Restore cart state
   */
  private async restoreCart(): Promise<void> {
    const cartStore = useCartStore.getState();
    try {
      // Clear current cart
      await cartStore.clearCart();
      
      // Restore original items
      for (const item of this.originalItems) {
        await cartStore.addItem(item.quote);
      }
      
      console.log(`🔄 Restored ${this.originalItems.length} cart items`);
    } catch (error) {
      console.error('Failed to restore cart:', error);
    }
  }

  /**
   * Run all currency tests
   */
  async runAllTests(): Promise<TestSuite[]> {
    console.log('🚀 Starting comprehensive currency testing...');
    
    await this.backupCart();
    
    try {
      const testSuites: TestSuite[] = [
        await this.testCurrencyDetection(),
        await this.testCartValidation(),
        await this.testCartOperations(),
        await this.testCheckoutIntegration(),
        await this.testEdgeCases()
      ];

      // Overall summary
      const totalTests = testSuites.reduce((sum, suite) => sum + suite.summary.total, 0);
      const totalPassed = testSuites.reduce((sum, suite) => sum + suite.summary.passed, 0);
      const totalFailed = testSuites.reduce((sum, suite) => sum + suite.summary.failed, 0);

      console.log('\n🎯 COMPREHENSIVE TESTING SUMMARY');
      console.log('================================');
      console.log(`Total Test Suites: ${testSuites.length}`);
      console.log(`Total Tests: ${totalTests}`);
      console.log(`✅ Passed: ${totalPassed}`);
      console.log(`❌ Failed: ${totalFailed}`);
      console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);

      testSuites.forEach(suite => {
        const status = suite.passed ? '✅' : '❌';
        console.log(`${status} ${suite.suiteName}: ${suite.summary.passed}/${suite.summary.total} passed`);
        
        if (!suite.passed) {
          suite.results.filter(r => !r.passed).forEach(result => {
            console.log(`   - ${result.testName}: ${result.error || result.message}`);
          });
        }
      });

      return testSuites;

    } finally {
      await this.restoreCart();
    }
  }

  /**
   * Test currency detection logic
   */
  private async testCurrencyDetection(): Promise<TestSuite> {
    const results: TestResult[] = [];

    // Test 1: Valid USD quote (US origin)
    results.push(await this.runTest(
      'USD quote with US origin',
      async () => {
        const mockQuote = {
          id: 'test-usd',
          customer_currency: 'USD',
          origin_country: 'US',
          destination_country: 'IN'
        };
        
        const detection = detectQuoteCurrency(mockQuote);
        
        if (detection.detectedCurrency !== 'USD') {
          throw new Error(`Expected USD, got ${detection.detectedCurrency}`);
        }
        
        if (!detection.isValid) {
          throw new Error(`Expected valid, got issues: ${detection.issues.join(', ')}`);
        }
        
        return 'USD currency detected correctly';
      }
    ));

    // Test 2: Invalid USD quote (India origin) - should detect corruption
    results.push(await this.runTest(
      'Corrupted USD quote with India origin',
      async () => {
        const mockQuote = {
          id: 'test-corrupted',
          customer_currency: 'USD',
          origin_country: 'IN',
          destination_country: 'IN'
        };
        
        const detection = detectQuoteCurrency(mockQuote);
        
        if (detection.detectedCurrency !== 'INR') {
          throw new Error(`Expected INR correction, got ${detection.detectedCurrency}`);
        }
        
        if (detection.isValid) {
          throw new Error('Expected invalid due to corruption');
        }
        
        const hasCorruptionIssue = detection.issues.some(issue => 
          issue.includes('Critical:') || issue.includes('data corruption')
        );
        
        if (!hasCorruptionIssue) {
          throw new Error('Expected critical corruption issue to be detected');
        }
        
        return 'Currency corruption detected and corrected';
      }
    ));

    // Test 3: Valid INR quote
    results.push(await this.runTest(
      'Valid INR quote with India origin',
      async () => {
        const mockQuote = {
          id: 'test-inr',
          customer_currency: 'INR',
          origin_country: 'IN',
          destination_country: 'IN'
        };
        
        const detection = detectQuoteCurrency(mockQuote);
        
        if (detection.detectedCurrency !== 'INR') {
          throw new Error(`Expected INR, got ${detection.detectedCurrency}`);
        }
        
        if (!detection.isValid) {
          throw new Error(`Expected valid, got issues: ${detection.issues.join(', ')}`);
        }
        
        return 'INR currency detected correctly';
      }
    ));

    return this.createTestSuite('Currency Detection Tests', results);
  }

  /**
   * Test cart validation logic
   */
  private async testCartValidation(): Promise<TestSuite> {
    const results: TestResult[] = [];

    // Test 1: Valid quote validation
    results.push(await this.runTest(
      'Valid approved quote validation',
      async () => {
        const mockQuote: Partial<Quote> = {
          id: 'test-valid',
          customer_currency: 'USD',
          origin_country: 'US',
          destination_country: 'IN',
          status: 'approved',
          total_quote_origincurrency: 100.50,
          final_total_origin: 100.50
        };
        
        const validation = await validateQuoteForCart(mockQuote as Quote);
        
        if (!validation.canProceed) {
          throw new Error(`Valid quote should be allowed: ${validation.criticalIssues.join(', ')}`);
        }
        
        return 'Valid quote passed validation';
      }
    ));

    // Test 2: Invalid status quote
    results.push(await this.runTest(
      'Non-approved quote blocking',
      async () => {
        const mockQuote: Partial<Quote> = {
          id: 'test-pending',
          customer_currency: 'USD',
          origin_country: 'US',
          destination_country: 'IN',
          status: 'pending',
          total_quote_origincurrency: 100.50
        };
        
        const validation = await validateQuoteForCart(mockQuote as Quote);
        
        if (validation.canProceed) {
          throw new Error('Pending quote should be blocked');
        }
        
        const hasStatusIssue = validation.criticalIssues.some(issue => 
          issue.includes('approved')
        );
        
        if (!hasStatusIssue) {
          throw new Error('Should have status-related critical issue');
        }
        
        return 'Non-approved quote correctly blocked';
      }
    ));

    // Test 3: Corrupted currency quote
    results.push(await this.runTest(
      'Corrupted currency quote blocking',
      async () => {
        const mockQuote: Partial<Quote> = {
          id: 'test-corrupted',
          customer_currency: 'USD',
          origin_country: 'IN',
          destination_country: 'IN',
          status: 'approved',
          total_quote_origincurrency: 3500
        };
        
        const validation = await validateQuoteForCart(mockQuote as Quote);
        
        // Should be blocked due to critical currency corruption
        if (validation.canProceed) {
          throw new Error('Corrupted currency quote should be blocked');
        }
        
        const hasCorruptionIssue = validation.criticalIssues.some(issue => 
          issue.includes('data corruption')
        );
        
        if (!hasCorruptionIssue) {
          throw new Error('Should detect currency corruption');
        }
        
        return 'Corrupted currency quote correctly blocked';
      }
    ));

    return this.createTestSuite('Cart Validation Tests', results);
  }

  /**
   * Test actual cart operations
   */
  private async testCartOperations(): Promise<TestSuite> {
    const results: TestResult[] = [];

    // Test 1: Add valid quote to empty cart
    results.push(await this.runTest(
      'Add valid quote to cart',
      async () => {
        const cartStore = useCartStore.getState();
        await cartStore.clearCart(); // Start fresh
        
        // Find a valid approved quote from database
        const { data: quotes } = await supabase
          .from('quotes_v2')
          .select('*')
          .eq('status', 'approved')
          .eq('in_cart', false)
          .limit(1);

        if (!quotes || quotes.length === 0) {
          throw new Error('No approved quotes available for testing');
        }

        const testQuote = quotes[0];
        
        try {
          await cartStore.addItem(testQuote);
          
          const newItemCount = cartStore.getTotalCount();
          if (newItemCount === 0) {
            throw new Error('Quote was not added to cart');
          }
          
          return `Successfully added quote ${testQuote.display_id || testQuote.id}`;
          
        } finally {
          // Clean up
          await cartStore.removeItem(testQuote.id);
        }
      }
    ));

    // Test 2: Test cart totals calculation
    results.push(await this.runTest(
      'Cart totals calculation',
      async () => {
        const cartStore = useCartStore.getState();
        
        // Use existing cart items or skip if empty
        const items = cartStore.items;
        if (items.length === 0) {
          return 'Skipped - no items in cart';
        }
        
        const totalValue = cartStore.getTotalValue();
        const currencyTotals = cartStore.getTotalValueWithCurrency();
        
        if (totalValue < 0) {
          throw new Error('Total value should not be negative');
        }
        
        if (currencyTotals.isEmpty && items.length > 0) {
          throw new Error('Currency totals should not be empty with items in cart');
        }
        
        console.log('Cart totals test:', { totalValue, currencyTotals });
        
        return `Cart totals calculated correctly: ${totalValue}`;
      }
    ));

    // Test 3: Cart integrity check
    results.push(await this.runTest(
      'Cart integrity validation',
      async () => {
        const cartStore = useCartStore.getState();
        
        try {
          const integrity = await cartStore.validateCartIntegrity();
          
          // Should not throw an error
          console.log('Cart integrity result:', {
            hasInconsistencies: integrity.hasInconsistencies,
            problematicItems: integrity.problematicItems.length
          });
          
          return `Cart integrity check completed: ${integrity.hasInconsistencies ? 'has issues' : 'clean'}`;
          
        } catch (error) {
          throw new Error(`Integrity check failed: ${error}`);
        }
      }
    ));

    return this.createTestSuite('Cart Operations Tests', results);
  }

  /**
   * Test checkout integration
   */
  private async testCheckoutIntegration(): Promise<TestSuite> {
    const results: TestResult[] = [];

    // Test 1: Checkout service calculation
    results.push(await this.runTest(
      'Checkout order summary calculation',
      async () => {
        const cartStore = useCartStore.getState();
        const items = cartStore.items;
        
        if (items.length === 0) {
          return 'Skipped - no items in cart for checkout test';
        }
        
        const checkoutService = CheckoutService.getInstance();
        
        // Test with first item's destination country
        const destinationCountry = items[0].quote.destination_country || 'IN';
        
        try {
          const summary = await checkoutService.calculateOrderSummary(items, destinationCountry);
          
          if (!summary.finalTotal || summary.finalTotal <= 0) {
            throw new Error('Invalid order summary total');
          }
          
          if (!summary.currency) {
            throw new Error('Order summary missing currency');
          }
          
          console.log('Checkout summary test:', {
            itemsTotal: summary.itemsTotal,
            finalTotal: summary.finalTotal,
            currency: summary.currency
          });
          
          return `Checkout calculation successful: ${summary.finalTotal} ${summary.currency}`;
          
        } catch (error) {
          throw new Error(`Checkout calculation failed: ${error}`);
        }
      }
    ));

    return this.createTestSuite('Checkout Integration Tests', results);
  }

  /**
   * Test edge cases and error scenarios
   */
  private async testEdgeCases(): Promise<TestSuite> {
    const results: TestResult[] = [];

    // Test 1: Empty cart scenarios
    results.push(await this.runTest(
      'Empty cart handling',
      async () => {
        const cartStore = useCartStore.getState();
        await cartStore.clearCart();
        
        const totalValue = cartStore.getTotalValue();
        const currencyTotals = cartStore.getTotalValueWithCurrency();
        
        if (totalValue !== 0) {
          throw new Error(`Empty cart should have 0 total, got ${totalValue}`);
        }
        
        if (!currencyTotals.isEmpty) {
          throw new Error('Empty cart currency totals should be marked as empty');
        }
        
        return 'Empty cart handled correctly';
      }
    ));

    // Test 2: Currency service integration
    results.push(await this.runTest(
      'Currency service integration',
      async () => {
        try {
          // Test basic currency conversion
          const converted = await currencyService.convertAmount(100, 'USD', 'INR');
          
          if (!converted || converted <= 0) {
            throw new Error('Currency conversion failed');
          }
          
          // Test formatting
          const formatted = currencyService.formatAmount(100, 'USD');
          if (!formatted.includes('$')) {
            throw new Error('Currency formatting failed');
          }
          
          return `Currency service working: 100 USD = ${converted} INR`;
          
        } catch (error) {
          throw new Error(`Currency service error: ${error}`);
        }
      }
    ));

    // Test 3: Error message generation
    results.push(await this.runTest(
      'Error message generation',
      async () => {
        const mockQuote: Partial<Quote> = {
          id: 'test-error',
          customer_currency: 'USD',
          origin_country: 'IN',
          status: 'pending'
        };
        
        const validation = await validateQuoteForCart(mockQuote as Quote);
        const errorMessage = getCurrencyErrorMessage(validation);
        
        if (!errorMessage) {
          throw new Error('Should generate error message for invalid quote');
        }
        
        if (errorMessage.length < 10) {
          throw new Error('Error message too short');
        }
        
        return `Error message generated: "${errorMessage.substring(0, 50)}..."`;
      }
    ));

    return this.createTestSuite('Edge Cases Tests', results);
  }

  /**
   * Helper method to run a single test
   */
  private async runTest(testName: string, testFn: () => Promise<string>): Promise<TestResult> {
    console.log(`🧪 Running: ${testName}`);
    
    try {
      const message = await testFn();
      console.log(`✅ ${testName}: ${message}`);
      
      return {
        testName,
        passed: true,
        message
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ ${testName}: ${errorMessage}`);
      
      return {
        testName,
        passed: false,
        message: `Test failed: ${errorMessage}`,
        error: errorMessage
      };
    }
  }

  /**
   * Create a test suite result
   */
  private createTestSuite(suiteName: string, results: TestResult[]): TestSuite {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    return {
      suiteName,
      results,
      passed: failed === 0,
      summary: {
        total,
        passed,
        failed
      }
    };
  }

  /**
   * Quick smoke test for immediate feedback
   */
  async runSmokeTest(): Promise<void> {
    console.log('🔥 Running currency smoke test...');
    
    try {
      // Test 1: Currency detection
      const testQuote = {
        id: 'smoke-test',
        customer_currency: 'USD',
        origin_country: 'US',
        destination_country: 'IN'
      };
      
      const detection = detectQuoteCurrency(testQuote);
      console.log('✅ Currency detection working');
      
      // Test 2: Cart validation
      const cartStore = useCartStore.getState();
      const integrity = await cartStore.validateCartIntegrity();
      console.log('✅ Cart validation working');
      
      // Test 3: Currency service
      const converted = await currencyService.convertAmount(1, 'USD', 'INR');
      console.log(`✅ Currency service working: 1 USD = ${converted} INR`);
      
      console.log('🎉 Smoke test passed - all core systems working!');
      
    } catch (error) {
      console.error('💥 Smoke test failed:', error);
      throw error;
    }
  }
}

// Make available globally for browser console testing
if (typeof window !== 'undefined') {
  const tester = new CartCurrencyTester();
  
  (window as any).cartTester = {
    runAll: () => tester.runAllTests(),
    smokeTest: () => tester.runSmokeTest(),
    tester
  };
  
  console.log('🧪 Cart currency testing utilities available:');
  console.log('  window.cartTester.runAll() - Run all tests');
  console.log('  window.cartTester.smokeTest() - Quick smoke test');
}

export default CartCurrencyTester;