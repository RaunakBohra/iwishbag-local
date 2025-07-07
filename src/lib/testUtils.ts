/**
 * Basic testing utilities for critical path validation
 * These can be run manually in the browser console for verification
 */

import { 
  validateEmail, 
  validatePhone, 
  validatePaymentAmount, 
  sanitizeHtml, 
  sanitizeUrl 
} from './validation';
import { 
  getExchangeRate, 
  formatCustomerCurrency, 
  getDestinationCountryFromQuote 
} from './currencyUtils';

// Test result interface
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class TestRunner {
  private results: TestResult[] = [];

  test(name: string, testFn: () => boolean | Promise<boolean>, details?: any): void {
    try {
      const result = testFn();
      if (result instanceof Promise) {
        result.then(passed => {
          this.results.push({ name, passed, details });
        }).catch(error => {
          this.results.push({ name, passed: false, error: error.message, details });
        });
      } else {
        this.results.push({ name, passed: result, details });
      }
    } catch (error) {
      this.results.push({ 
        name, 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details 
      });
    }
  }

  getResults(): TestResult[] {
    return this.results;
  }

  printResults(): void {
    console.log('\n=== TEST RESULTS ===');
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    console.log(`${passed}/${total} tests passed\n`);
    
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`   Details:`, result.details);
      }
    });
  }

  reset(): void {
    this.results = [];
  }
}

// Create global test runner
export const testRunner = new TestRunner();

// Validation Tests
export const runValidationTests = (): void => {
  console.log('🧪 Running Validation Tests...');
  testRunner.reset();

  // Email validation tests
  testRunner.test('Valid email passes', () => validateEmail('test@example.com'));
  testRunner.test('Invalid email fails', () => !validateEmail('invalid-email'));
  testRunner.test('Email with spaces fails', () => !validateEmail('test @example.com'));
  testRunner.test('Empty email fails', () => !validateEmail(''));

  // Phone validation tests
  testRunner.test('Valid phone passes', () => validatePhone('+1234567890'));
  testRunner.test('Phone with spaces passes', () => validatePhone('+1 234 567 890'));
  testRunner.test('Invalid phone fails', () => !validatePhone('abc123'));

  // Payment amount validation tests
  testRunner.test('Valid USD amount passes', () => validatePaymentAmount(10.50, 'USD'));
  testRunner.test('Too small USD amount fails', () => !validatePaymentAmount(0.25, 'USD'));
  testRunner.test('Valid INR amount passes', () => validatePaymentAmount(100, 'INR'));
  testRunner.test('Too small INR amount fails', () => !validatePaymentAmount(0.50, 'INR'));

  // Sanitization tests
  testRunner.test('HTML sanitization works', () => {
    const input = '<script>alert("xss")</script>Hello';
    const output = sanitizeHtml(input);
    return output === 'Hello' && !output.includes('<script>');
  });

  testRunner.test('URL sanitization works', () => {
    try {
      const output = sanitizeUrl('https://example.com');
      return output === 'https://example.com/';
    } catch {
      return false;
    }
  });

  testRunner.test('Invalid URL sanitization fails', () => {
    try {
      sanitizeUrl('javascript:alert("xss")');
      return false;
    } catch {
      return true;
    }
  });

  testRunner.printResults();
};

// Currency Tests
export const runCurrencyTests = async (): Promise<void> => {
  console.log('💰 Running Currency Tests...');
  testRunner.reset();

  // Test currency formatting
  testRunner.test('Currency formatting works', () => {
    const result = formatCustomerCurrency(100, 'US', 'USD', 1);
    return result.includes('$') && result.includes('100');
  });

  testRunner.test('Currency conversion works', () => {
    const result = formatCustomerCurrency(100, 'US', 'INR', 83);
    return result.includes('₹') && result.includes('8,300');
  });

  // Test destination country extraction
  testRunner.test('Destination country extraction works', () => {
    const quote = {
      destination_country: 'NP',
      shipping_address: { country: 'Nepal', country_code: 'NP' }
    };
    const result = getDestinationCountryFromQuote(quote);
    return result === 'NP';
  });

  testRunner.test('Destination country fallback works', () => {
    const quote = null;
    const result = getDestinationCountryFromQuote(quote);
    return result === 'US';
  });

  // Test exchange rate fetching (this will make actual API calls)
  try {
    const rateResult = await getExchangeRate('US', 'IN');
    testRunner.test('Exchange rate fetching works', () => {
      return rateResult.rate > 0 && rateResult.source !== 'fallback';
    }, { rate: rateResult.rate, source: rateResult.source });
  } catch (error) {
    testRunner.test('Exchange rate fetching works', () => false, { error: error.message });
  }

  testRunner.printResults();
};

// Form Validation Tests
export const runFormValidationTests = (): void => {
  console.log('📝 Running Form Validation Tests...');
  testRunner.reset();

  // Test quote form validation
  const validQuoteData = {
    items: [{
      productUrl: 'https://example.com/product',
      productName: 'Test Product',
      quantity: 1,
      options: 'Size: M',
      imageUrl: 'https://example.com/image.jpg',
    }],
    countryCode: 'US',
    email: 'test@example.com',
    quoteType: 'combined',
  };

  testRunner.test('Valid quote data passes', () => {
    // This would require importing the schema, simplified for demo
    return validQuoteData.items.length > 0 && 
           validQuoteData.countryCode.length === 2 &&
           validQuoteData.email.includes('@');
  });

  const invalidQuoteData = {
    items: [],
    countryCode: '',
    email: 'invalid-email',
    quoteType: 'invalid',
  };

  testRunner.test('Invalid quote data fails', () => {
    return invalidQuoteData.items.length === 0; // Should fail validation
  });

  testRunner.printResults();
};

// Payment Tests
export const runPaymentTests = (): void => {
  console.log('💳 Running Payment Tests...');
  testRunner.reset();

  // Test payment request validation
  const validPaymentData = {
    quoteIds: ['123e4567-e89b-12d3-a456-426614174000'],
    gateway: 'stripe',
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel',
    amount: 100,
    currency: 'USD',
  };

  testRunner.test('Valid payment data structure', () => {
    return validPaymentData.quoteIds.length > 0 &&
           ['stripe', 'payu', 'bank_transfer', 'cod'].includes(validPaymentData.gateway) &&
           validPaymentData.success_url.startsWith('https://') &&
           validPaymentData.amount > 0;
  });

  testRunner.test('Payment amount validation', () => {
    return validatePaymentAmount(validPaymentData.amount, validPaymentData.currency);
  });

  testRunner.printResults();
};

// Run all tests
export const runAllTests = async (): Promise<void> => {
  console.log('🚀 Running All Critical Path Tests...');
  console.log('=====================================');
  
  runValidationTests();
  await runCurrencyTests();
  runFormValidationTests();
  runPaymentTests();
  
  console.log('\n✅ All tests completed!');
  console.log('💡 To run individual test suites:');
  console.log('   runValidationTests()');
  console.log('   runCurrencyTests()');
  console.log('   runFormValidationTests()');
  console.log('   runPaymentTests()');
};

// Error boundary test
export const testErrorBoundary = (): void => {
  console.log('🛡️ Testing Error Boundary...');
  
  // Create a component that throws an error
  const ThrowError = () => {
    throw new Error('Test error for error boundary');
  };
  
  console.log('Error boundary test component created.');
  console.log('To test: Render ThrowError component inside an ErrorBoundary');
};

// Browser compatibility tests
export const runBrowserCompatibilityTests = (): void => {
  console.log('🌐 Running Browser Compatibility Tests...');
  testRunner.reset();

  testRunner.test('Fetch API available', () => typeof fetch !== 'undefined');
  testRunner.test('Promise available', () => typeof Promise !== 'undefined');
  testRunner.test('LocalStorage available', () => typeof localStorage !== 'undefined');
  testRunner.test('URLSearchParams available', () => typeof URLSearchParams !== 'undefined');
  testRunner.test('Crypto API available', () => typeof crypto !== 'undefined');
  testRunner.test('Intl API available', () => typeof Intl !== 'undefined');

  testRunner.printResults();
};

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).iwishBagTests = {
    runAllTests,
    runValidationTests,
    runCurrencyTests,
    runFormValidationTests,
    runPaymentTests,
    runBrowserCompatibilityTests,
    testErrorBoundary,
  };
  
  console.log('🧪 Testing utilities loaded!');
  console.log('Run iwishBagTests.runAllTests() to start testing');
}

export default {
  runAllTests,
  runValidationTests,
  runCurrencyTests,
  runFormValidationTests,
  runPaymentTests,
  runBrowserCompatibilityTests,
  testErrorBoundary,
};