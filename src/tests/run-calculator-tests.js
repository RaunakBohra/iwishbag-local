/**
 * Browser Console Test Runner for Calculator
 * Run this in the browser console to test the calculator
 */

(async function runCalculatorTests() {
  console.log('🚀 Loading Calculator Test Suite...');
  
  try {
    // Import the test suite
    const { CalculatorTestSuite } = await import('/src/tests/comprehensive-calculator-test.ts');
    
    // Create test instance
    const tester = new CalculatorTestSuite();
    
    // Run all tests
    console.log('\n📊 Running comprehensive calculator tests...\n');
    await tester.runAllTests();
    
    // Get results
    const results = tester.getResults();
    
    // Save results to localStorage for analysis
    localStorage.setItem('calculator-test-results', JSON.stringify(results, null, 2));
    console.log('\n💾 Test results saved to localStorage (key: calculator-test-results)');
    
    // Create downloadable results file
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calculator-test-results-${new Date().toISOString()}.json`;
    
    console.log('\n📥 Click here to download test results:');
    console.log(a);
    
    // Return results for further analysis
    return results;
    
  } catch (error) {
    console.error('❌ Error running tests:', error);
    console.error('Stack trace:', error.stack);
  }
})();

// Alternative: Run specific test suites
async function runSpecificTests() {
  const { CalculatorTestSuite } = await import('/src/tests/comprehensive-calculator-test.ts');
  const tester = new CalculatorTestSuite();
  
  // Run only specific test suites
  console.log('Running specific tests...');
  
  // Test quote-level methods
  await tester.testQuoteLevelTaxMethods();
  
  // Test valuation methods
  await tester.testValuationMethods();
  
  return tester.getResults();
}

// Quick test for a single scenario
async function quickTest() {
  const { SmartCalculationEngine } = await import('/src/services/SmartCalculationEngine.ts');
  const engine = SmartCalculationEngine.getInstance();
  
  const testQuote = {
    id: 'quick-test',
    origin_country: 'IN',
    destination_country: 'NP',
    customer_data: { name: 'Test', email: 'test@test.com' },
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    calculation_data: {
      items_total: 1000,
      total_weight: 5
    },
    operational_data: {
      customs: { percentage: 20 },
      domestic_shipping: 50
    },
    items: [{
      id: 'test-item',
      name: 'Test Product',
      quantity: 1,
      costprice_origin: 1000,
      weight: 5,
      hsn_code: '6204',
      tax_method: 'hsn'
    }]
  };
  
  console.log('🧪 Running quick test...');
  console.log('Quote:', testQuote);
  
  const result = await engine.calculateSmartEngine({
    quote: testQuote,
    currency_code: 'USD',
    exchange_rate: 1,
    origin_currency: 'INR',
    destination_currency: 'NPR',
    tax_calculation_preferences: {
      calculation_method_preference: 'hsn_only',
      valuation_method_preference: 'product_value',
      force_per_item_calculation: true
    }
  });
  
  console.log('Result:', result);
  console.log('Final Total:', result.final_total_usd);
  console.log('Shipping Options:', result.shipping_options);
  console.log('Item Breakdowns:', result.updated_quote?.calculation_data?.item_breakdowns);
  
  return result;
}

// Export functions to window for easy access
window.calculatorTests = {
  runAll: () => runCalculatorTests(),
  runSpecific: runSpecificTests,
  quickTest: quickTest
};

console.log('✅ Calculator test functions loaded!');
console.log('Available commands:');
console.log('  - calculatorTests.runAll() - Run all tests');
console.log('  - calculatorTests.runSpecific() - Run specific test suites');
console.log('  - calculatorTests.quickTest() - Run a quick test');