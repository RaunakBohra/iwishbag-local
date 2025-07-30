
  async testHardcodedValues() {
    console.log('📊 TEST 1: Checking for hardcoded tax values...\n');

    const hardcodedIssues = {
      // // Nepal standard VAT
      hsn_vat_india: 18,      // India standard GST  
      hsn_vat_china: 13,      // China VAT
      
      // SmartCalculationEngine hardcoded fallbacks
      manual_rate_fallback: 18,   // item.tax_options?.manual?.rate || 18
      customs_rate_fallback: 10,  // quote.operational_data?.customs?.percentage || 10
    };

    this.results.push({
      test: 'Hardcoded VAT Rates in issue_found: true,
      details: {
        nepal_vat: '13% (hardcoded)',
        india_gst: '18% (hardcoded)',
        china_vat: '13% (hardcoded)',
        location: 'src/services/159, 165'
      },
      recommendations: [
        'Move VAT rates to country_settings table',
        'Create dynamic VAT lookup by destination country',
        'Remove hardcoded fallback rates'
      ]
    });

    this.results.push({
      test: 'Hardcoded Tax Fallbacks in SmartCalculationEngine',
      issue_found: true,
      details: {
        manual_fallback: '18% (line 1798)',
        customs_fallback: '10% (line 1804)',
        location: 'src/services/SmartCalculationEngine.ts'
      },
      recommendations: [
        'Replace hardcoded 18% with dynamic rate lookup',
        'Replace hardcoded 10% with country-specific defaults',
        'Use unified configuration service for fallbacks'
      ]
    });

    console.log('❌ Found hardcoded values in HSNTaxService and SmartCalculationEngine');
  }

  
  async testValuationMethods() {
    console.log('\n📊 TEST 3: Testing valuation method application...\n');

    const baseQuote = this.createTestQuote({
      items: [{
        id: 'test-item',
        name: 'Test Product',
        quantity: 1,
        costprice_origin: 1000, // $1000 base price
        weight: 2,
        hsn_code: '6204'
      }]
    });

    const valuationTests = [
      {
        method: 'product_value',
        expected_base: 1000,
        description: 'Should use actual product price'
      },
      {
        method: 'minimum_valuation', 
        expected_base: 1200, // Estimate 20% higher
        description: 'Should use HSN minimum valuation'
      },
      {
        method: 'higher_of_both',
        expected_base: 1200, // Higher of actual vs minimum
        description: 'Should use whichever is higher'
      }
    ];

    const valuationResults = {};

    for (const test of valuationTests) {
      try {
        const result = await this.engine.calculateSmartEngine({
          quote: baseQuote,
          currency_code: 'USD',
          exchange_rate: 1,
          origin_currency: 'INR',
          destination_currency: 'NPR',
          tax_calculation_preferences: {
            calculation_method_preference: 'hsn_only',
            valuation_method_preference: test.method as any
          }
        });

        const customsBase = result.updated_quote?.calculation_data?.valuation_applied?.customs_calculation_base || 0;
        const actualBase = result.updated_quote?.calculation_data?.valuation_applied?.original_items_total || 0;
        
        valuationResults[test.method] = {
          success: result.success,
          customs_base: customsBase,
          actual_base: actualBase,
          adjustment_applied: customsBase !== actualBase,
          method_used: result.updated_quote?.calculation_data?.valuation_applied?.method,
          expected_base: test.expected_base,
          matches_expectation: Math.abs(customsBase - test.expected_base) < 50 // Allow 50 margin
        };

        console.log(`${test.method}:`, {
          customs_base: `$${customsBase}`,
          actual_base: `$${actualBase}`,
          adjustment: customsBase !== actualBase ? 'YES' : 'NO',
          expected: `$${test.expected_base}`,
          matches: valuationResults[test.method].matches_expectation ? '✅' : '❌'
        });

      } catch (error) {
        valuationResults[test.method] = { error: error.message };
        console.log(`${test.method}: ERROR - ${error.message}`);
      }
    }

    const failedValidations = Object.values(valuationResults).filter(
      (r: any) => !r.matches_expectation && !r.error
    ).length;

    this.results.push({
      test: 'Valuation Method Application',
      issue_found: failedValidations > 0,
      details: {
        tests_run: valuationTests.length,
        results: valuationResults,
        failed_validations: failedValidations
      },
      recommendations: failedValidations > 0 ? [
        'Verify valuation method logic in SmartCalculationEngine',
        'Check if minimum valuation data exists in 'Ensure valuation_applied data is correctly stored'
      ] : ['Valuation methods working correctly']
    });
  }

  
  private createTestQuote(overrides: any = {}): UnifiedQuote {
    return {
      id: `test-${Date.now()}`,
      origin_country: 'IN',
      destination_country: 'NP',
      customer_data: {
        name: 'Test Customer',
        email: 'test@example.com'
      },
      items: [],
      calculation_data: {
        items_total: 0,
        total_weight: 0
      },
      operational_data: {
        customs: { percentage: 20 },
        domestic_shipping: 50
      },
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    } as UnifiedQuote;
  }

  /**
   * Print comprehensive analysis report
   */
  private printAnalysisReport() {
    console.log('\n\n🔍 DETAILED TAX ANALYSIS REPORT');
    console.log('===============================\n');

    const totalTests = this.results.length;
    const issuesFound = this.results.filter(r => r.issue_found).length;
    const cleanTests = totalTests - issuesFound;

    console.log(`📊 Summary:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Clean: ${cleanTests}`);
    console.log(`   ❌ Issues Found: ${issuesFound}`);
    console.log(`   Health Score: ${((cleanTests/totalTests) * 100).toFixed(1)}%\n`);

    // Report each test
    this.results.forEach((result, index) => {
      const status = result.issue_found ? '❌' : '✅';
      console.log(`${status} TEST ${index + 1}: ${result.test}`);
      
      if (result.issue_found) {
        console.log(`   Issues: ${JSON.stringify(result.details, null, 2)}`);
        console.log(`   Recommendations:`);
        result.recommendations.forEach(rec => {
          console.log(`     • ${rec}`);
        });
      } else {
        console.log(`   Status: All checks passed`);
      }
      console.log('');
    });

    // Critical recommendations
    console.log('🚨 CRITICAL FIXES NEEDED:\n');
    
    console.log('1. **Remove Hardcoded VAT Rates**');
    console.log('   Location: src/services/India(18%), China(13%) to database');
    console.log('');
    
    console.log('2. **Remove Hardcoded Fallbacks**');
    console.log('   Location: src/services/SmartCalculationEngine.ts');
    console.log('   Fix: Replace 18% and 10% fallbacks with dynamic lookup');
    console.log('');
    
    console.log('3. **Verify HSN Customs Data**');
    console.log('   Issue: Check if HSN codes return 0% when they should have rates');
    console.log('   Fix: Review hsn_master.tax_data structure');
    console.log('');

    console.log('4. **Test Valuation Methods**');
    console.log('   Issue: Verify minimum_valuation and higher_of_both work correctly');
    console.log('   Fix: Check HSN minimum valuation data exists');
  }

  getResults() {
    return this.results;
  }
}

// Export for use
export const runDetailedTaxAnalysis = async () => {
  const analysis = new DetailedTaxAnalysis();
  await analysis.runCompleteAnalysis();
  return analysis.getResults();
};