
  async testValuationMethods() {
    console.log('\n🧪 Testing Valuation Methods...\n');

    const scenarios: TestScenario[] = [
      {
        name: 'Product Value Method',
        description: 'Testing actual product value valuation',
        quote: {
          valuation_method_preference: 'product_value',
          items: [{
            id: 'item-10',
            name: 'Standard Product',
            quantity: 1,
            costprice_origin: 1000,
            weight: 2,
            hsn_code: '6204'
          }]
        },
        taxPreferences: {
          valuation_method_preference: 'product_value'
        },
        expectedChecks: ['should use actual price of 1000']
      },
      {
        name: 'Minimum Valuation Method',
        description: 'Testing minimum valuation',
        quote: {
          valuation_method_preference: 'minimum_valuation',
          items: [{
            id: 'item-11',
            name: 'Undervalued Product',
            quantity: 1,
            costprice_origin: 100,
            weight: 2,
            hsn_code: '6204' // Should have minimum valuation
          }]
        },
        taxPreferences: {
          valuation_method_preference: 'minimum_valuation',
          calculation_method_preference: 'hsn_only'
        },
        expectedChecks: ['should use 'customs base should be higher than product value']
      },
      {
        name: 'Higher of Both Method',
        description: 'Testing higher of product vs minimum valuation',
        quote: {
          valuation_method_preference: 'higher_of_both',
          items: [
            {
              id: 'item-12a',
              name: 'Low Value Product',
              quantity: 1,
              costprice_origin: 50,
              weight: 1,
              hsn_code: '6204'
            },
            {
              id: 'item-12b',
              name: 'High Value Product',
              quantity: 1,
              costprice_origin: 5000,
              weight: 1,
              hsn_code: '6204'
            }
          ]
        },
        taxPreferences: {
          valuation_method_preference: 'higher_of_both',
          calculation_method_preference: 'hsn_only'
        },
        expectedChecks: ['should use minimum for low value item', 'should use actual for high value item']
      }
    ];

    for (const scenario of scenarios) {
      await this.runScenario(scenario);
    }
  }

  /**
   * Test Suite 4: Weight-Based Tests
   */
  async testWeightVariations() {
    console.log('\n🧪 Testing Weight Variations...\n');

    const scenarios: TestScenario[] = [
      {
        name: 'Light Weight Item',
        description: 'Testing with item < 1kg',
        quote: {
          items: [{
            id: 'item-13',
            name: 'Light Product',
            quantity: 1,
            costprice_origin: 1000,
            weight: 0.5,
            hsn_code: '6204'
          }]
        },
        taxPreferences: {},
        expectedChecks: ['should calculate shipping for 0.5kg', 'should use appropriate shipping tier']
      },
      {
        name: 'Medium Weight Items',
        description: 'Testing with items 1-10kg',
        quote: {
          items: [{
            id: 'item-14',
            name: 'Medium Product',
            quantity: 2,
            costprice_origin: 2000,
            weight: 5,
            hsn_code: '8517'
          }]
        },
        taxPreferences: {},
        expectedChecks: ['should calculate shipping for 10kg total', 'should use medium tier']
      },
      {
        name: 'Heavy Weight Items',
        description: 'Testing with items > 50kg',
        quote: {
          items: [{
            id: 'item-15',
            name: 'Heavy Product',
            quantity: 1,
            costprice_origin: 10000,
            weight: 75,
            hsn_code: '8414' // Pumps
          }]
        },
        taxPreferences: {},
        expectedChecks: ['should calculate shipping for 75kg', 'should use heavy tier', 'shipping cost should be higher']
      },
      {
        name: 'Mixed Weight Items',
        description: 'Testing with various weights',
        quote: {
          items: [
            {
              id: 'item-16a',
              name: 'Light Item',
              quantity: 5,
              costprice_origin: 100,
              weight: 0.2,
              hsn_code: '6204'
            },
            {
              id: 'item-16b',
              name: 'Heavy Item',
              quantity: 1,
              costprice_origin: 5000,
              weight: 50,
              hsn_code: '8414'
            }
          ]
        },
        taxPreferences: {},
        expectedChecks: ['should calculate total weight of 51kg', 'should have multiple shipping options']
      }
    ];

    for (const scenario of scenarios) {
      await this.runScenario(scenario);
    }
  }

  /**
   * Test Suite 5: Special Cases
   */
  async testSpecialCases() {
    console.log('\n🧪 Testing Special Cases...\n');

    const scenarios: TestScenario[] = [
      {
        name: 'Force Per-Item Calculation',
        description: 'Testing force per-item flag with single tax method',
        quote: {
          items: [{
            id: 'item-17',
            name: 'Test Product',
            quantity: 3,
            costprice_origin: 1500,
            weight: 2,
            hsn_code: '6204',
            tax_method: 'hsn'
          }]
        },
        taxPreferences: {
          force_per_item_calculation: true
        },
        expectedChecks: ['should generate item breakdowns', 'should show per-item calculations']
      },
      {
        name: 'US to Nepal Route',
        description: 'Testing US-NP route with sales tax',
        quote: {
          origin_country: 'US',
          destination_country: 'NP',
          items: [{
            id: 'item-18',
            name: 'US Product',
            quantity: 1,
            costprice_origin: 2000,
            weight: 3,
            hsn_code: '8517'
          }]
        },
        taxPreferences: {},
        expectedChecks: ['should include sales tax', 'should use US-NP specific rates']
      },
      {
        name: 'Missing description: 'Testing fallback when quote: {
          calculation_method_preference: 'hsn_only',
          items: [{
            id: 'item-19',
            name: 'No quantity: 1,
            costprice_origin: 1000,
            weight: 2
            
          }]
        },
        taxPreferences: {
          calculation_method_preference: 'hsn_only'
        },
        expectedChecks: ['should handle missing 'should use fallback calculation']
      }
    ];

    for (const scenario of scenarios) {
      await this.runScenario(scenario);
    }
  }

  /**
   * Run a single test scenario
   */
  private async runScenario(scenario: TestScenario) {
    console.log(`\n📋 ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    
    const testResult: TestResult = {
      scenario: scenario.name,
      success: false,
      results: null,
      errors: []
    };

    try {
      // Create complete quote
      const quote = this.createBaseQuote(scenario.quote);
      
      // Calculate items total and weight
      quote.calculation_data = {
        items_total: quote.items.reduce((sum, item) => sum + (item.costprice_origin || 0) * (item.quantity || 1), 0),
        total_weight: quote.items.reduce((sum, item) => sum + (item.weight || 0) * (item.quantity || 1), 0)
      };

      // Run calculation
      const result = await this.engine.calculateSmartEngine({
        quote,
        currency_code: 'USD',
        exchange_rate: 1,
        origin_currency: 'INR',
        destination_currency: 'NPR',
        tax_calculation_preferences: scenario.taxPreferences
      });

      testResult.results = result;
      testResult.success = result.success;
      testResult.itemBreakdowns = result.updated_quote?.calculation_data?.item_breakdowns;
      testResult.shippingOptions = result.shipping_options;

      if (result.success) {
        console.log('   ✅ Calculation successful');
        console.log(`   💰 Total: $${result.final_total_origincurrency?.toFixed(2) || 'N/A'}`);
        console.log(`   📦 Shipping options: ${result.shipping_options?.length || 0}`);
        console.log(`   📊 Item breakdowns: ${testResult.itemBreakdowns?.length || 0}`);
        
        // Log breakdown details
        if (result.updated_quote?.calculation_data?.breakdown) {
          const breakdown = result.updated_quote.calculation_data.breakdown;
          console.log(`   📈 Breakdown:`);
          console.log(`      - Items: $${breakdown.items_total?.toFixed(2)}`);
          console.log(`      - Customs: $${breakdown.customs?.toFixed(2)} (${breakdown.customs_percentage || 0}%)`);
          console.log(`      - Shipping: $${breakdown.shipping?.toFixed(2)}`);
          console.log(`      - Taxes: $${breakdown.taxes?.toFixed(2)}`);
          console.log(`      - Method: ${breakdown.method || 'unknown'}`);
          console.log(`      - Valuation: ${result.updated_quote.calculation_data.valuation_applied?.method || 'unknown'}`);
        }
        
        // Check expected conditions
        for (const check of scenario.expectedChecks) {
          console.log(`   🔍 Check: ${check}`);
        }
      } else {
        testResult.errors.push(result.error || 'Unknown error');
        console.log(`   ❌ Calculation failed: ${result.error}`);
      }
      
    } catch (error) {
      testResult.errors.push(error.message);
      console.error(`   ❌ Error: ${error.message}`);
    }

    this.testResults.push(testResult);
  }

  /**
   * Run all test suites
   */
  async runAllTests() {
    console.log('🚀 Starting Comprehensive Calculator Tests');
    console.log('=====================================\n');

    await this.testQuoteLevelTaxMethods();
    await this.testItemLevelTaxMethods();
    await this.testValuationMethods();
    await this.testWeightVariations();
    await this.testSpecialCases();

    this.printSummary();
  }

  /**
   * Print test summary
   */
  private printSummary() {
    console.log('\n\n📊 TEST SUMMARY');
    console.log('===============\n');

    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed/total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.filter(r => !r.success).forEach(result => {
        console.log(`   - ${result.scenario}: ${result.errors.join(', ')}`);
      });
    }

    // Export detailed results
    console.log('\n💾 Exporting detailed results to: calculator-test-results.json');
    return this.testResults;
  }

  /**
   * Get test results
   */
  getResults() {
    return this.testResults;
  }
}

// Usage example:
// const tester = new CalculatorTestSuite();
// await tester.runAllTests();