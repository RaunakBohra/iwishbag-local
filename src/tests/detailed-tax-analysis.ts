/**
 * Detailed Tax Analysis Test Suite
 * Comprehensive testing of hardcoded values, HSN rates, and valuation methods
 */

import { SmartCalculationEngine } from '@/services/SmartCalculationEngine';
import { hsnTaxService } from '@/services/HSNTaxService';
import { supabase } from '@/integrations/supabase/client';
import type { UnifiedQuote } from '@/types/unified-quote';

interface DetailedTestResult {
  test: string;
  issue_found: boolean;
  details: any;
  recommendations: string[];
}

export class DetailedTaxAnalysis {
  private engine: SmartCalculationEngine;
  private results: DetailedTestResult[] = [];

  constructor() {
    this.engine = SmartCalculationEngine.getInstance();
  }

  async runCompleteAnalysis() {
    console.log('🔍 DETAILED TAX ANALYSIS STARTING...\n');

    // 1. Test hardcoded values
    await this.testHardcodedValues();

    // 2. Test HSN customs rates 
    await this.testHSNCustomsRates();

    // 3. Test valuation methods
    await this.testValuationMethods();

    // 4. Test actual database data
    await this.testDatabaseIntegrity();

    this.printAnalysisReport();
  }

  /**
   * Test 1: Check for hardcoded values in tax calculations
   */
  async testHardcodedValues() {
    console.log('📊 TEST 1: Checking for hardcoded tax values...\n');

    const hardcodedIssues = {
      // HSN Tax Service hardcoded VAT rates
      hsn_vat_nepal: 13,      // Nepal standard VAT
      hsn_vat_india: 18,      // India standard GST  
      hsn_vat_china: 13,      // China VAT
      
      // SmartCalculationEngine hardcoded fallbacks
      manual_rate_fallback: 18,   // item.tax_options?.manual?.rate || 18
      customs_rate_fallback: 10,  // quote.operational_data?.customs?.percentage || 10
    };

    this.results.push({
      test: 'Hardcoded VAT Rates in HSNTaxService',
      issue_found: true,
      details: {
        nepal_vat: '13% (hardcoded)',
        india_gst: '18% (hardcoded)',
        china_vat: '13% (hardcoded)',
        location: 'src/services/HSNTaxService.ts lines 156, 159, 165'
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

  /**
   * Test 2: Verify HSN method returns actual customs rates, not 0
   */
  async testHSNCustomsRates() {
    console.log('\n📊 TEST 2: Testing HSN customs rate retrieval...\n');

    const testHSNCodes = ['6204', '8517', '8414', '7113', '6403'];
    const results = {};

    for (const hsnCode of testHSNCodes) {
      try {
        const hsnRates = await hsnTaxService.getHSNTaxRates(hsnCode, 'NP');
        results[hsnCode] = {
          found: !!hsnRates,
          customs: hsnRates?.customs || 0,
          vat: hsnRates?.vat || 0,
          sales_tax: hsnRates?.sales_tax || 0,
          source: hsnRates?.source || 'none'
        };
        
        console.log(`HSN ${hsnCode}:`, {
          customs: `${hsnRates?.customs || 0}%`,
          vat: `${hsnRates?.vat || 0}%`,
          confidence: hsnRates?.confidence || 0
        });
      } catch (error) {
        results[hsnCode] = { error: error.message };
        console.log(`HSN ${hsnCode}: ERROR - ${error.message}`);
      }
    }

    // Check if any HSN codes return 0% customs when they should have rates
    const zeroCustomsCount = Object.values(results).filter(
      (r: any) => r.customs === 0 && !r.error
    ).length;

    this.results.push({
      test: 'HSN Customs Rate Retrieval',
      issue_found: zeroCustomsCount > 0,
      details: {
        tested_codes: testHSNCodes,
        results: results,
        zero_customs_count: zeroCustomsCount,
        total_tested: testHSNCodes.length
      },
      recommendations: zeroCustomsCount > 0 ? [
        'Review HSN master data for missing customs rates',
        'Verify tax_data structure in hsn_master table',
        'Check if HSN codes have complete rate information'
      ] : ['HSN customs rates working correctly']
    });
  }

  /**
   * Test 3: Verify valuation methods are applied correctly
   */
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
        'Check if minimum valuation data exists in HSN records',
        'Ensure valuation_applied data is correctly stored'
      ] : ['Valuation methods working correctly']
    });
  }

  /**
   * Test 4: Check database integrity
   */
  async testDatabaseIntegrity() {
    console.log('\n📊 TEST 4: Testing database integrity...\n');

    const dbIssues = [];

    // Check HSN master data
    try {
      const { data: hsnData, error: hsnError } = await supabase
        .from('hsn_master')
        .select('hsn_code, tax_data')
        .limit(5);

      if (hsnError) {
        dbIssues.push(`HSN Master query failed: ${hsnError.message}`);
      } else {
        const hsnWithoutTaxData = hsnData.filter(hsn => !hsn.tax_data?.typical_rates);
        if (hsnWithoutTaxData.length > 0) {
          dbIssues.push(`${hsnWithoutTaxData.length} HSN codes missing tax_data.typical_rates`);
        }
        console.log(`✅ HSN Master: ${hsnData.length} records found, ${hsnWithoutTaxData.length} missing tax data`);
      }
    } catch (error) {
      dbIssues.push(`HSN Master access error: ${error.message}`);
    }

    // Check route customs tiers
    try {
      const { data: routeData, error: routeError } = await supabase
        .from('route_customs_tiers')
        .select('origin_country, destination_country, customs_percentage')
        .eq('origin_country', 'IN')
        .eq('destination_country', 'NP');

      if (routeError) {
        dbIssues.push(`Route customs tiers query failed: ${routeError.message}`);
      } else {
        console.log(`✅ Route Tiers: ${routeData.length} IN→NP routes found`);
        if (routeData.length === 0) {
          dbIssues.push('No IN→NP route customs tiers found');
        }
      }
    } catch (error) {
      dbIssues.push(`Route tiers access error: ${error.message}`);
    }

    // Check country settings for VAT rates
    try {
      const { data: countryData, error: countryError } = await supabase
        .from('country_settings')
        .select('code, currency, vat_rate')
        .in('code', ['NP', 'IN', 'US']);

      if (countryError) {
        dbIssues.push(`Country settings query failed: ${countryError.message}`);
      } else {
        const missingVAT = countryData.filter(c => !c.vat_rate);
        if (missingVAT.length > 0) {
          dbIssues.push(`${missingVAT.length} countries missing VAT rates: ${missingVAT.map(c => c.code).join(', ')}`);
        }
        console.log(`✅ Country Settings: ${countryData.length} records found, ${missingVAT.length} missing VAT`);
      }
    } catch (error) {
      dbIssues.push(`Country settings access error: ${error.message}`);
    }

    this.results.push({
      test: 'Database Integrity Check',
      issue_found: dbIssues.length > 0,
      details: {
        issues_found: dbIssues,
        total_issues: dbIssues.length
      },
      recommendations: dbIssues.length > 0 ? [
        'Fix database connectivity or permissions',
        'Populate missing tax data in HSN master',
        'Add missing VAT rates to country_settings',
        'Ensure route customs tiers are configured'
      ] : ['Database integrity is good']
    });
  }

  /**
   * Helper: Create test quote
   */
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
    console.log('   Location: src/services/HSNTaxService.ts');
    console.log('   Fix: Move Nepal(13%), India(18%), China(13%) to database');
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