/**
 * Currency Integration Validation Utilities
 * 
 * Comprehensive testing utilities to validate origin currency integration
 * across the quote calculator system.
 */

import { currencyService } from '@/services/CurrencyService';
import { SimplifiedQuoteCalculator } from '@/services/SimplifiedQuoteCalculator';

export interface CurrencyTestCase {
  name: string;
  originCountry: string;
  originCurrency: string;
  destinationCountry: string;
  destinationCurrency: string;
  testItems: Array<{
    name: string;
    costprice_origin: number;
    quantity: number;
    weight: number;
  }>;
  expectedMinValues: {
    totalOrigin: number;
    totalDestination: number;
  };
}

export const currencyTestCases: CurrencyTestCase[] = [
  {
    name: 'India to Nepal',
    originCountry: 'IN',
    originCurrency: 'INR',
    destinationCountry: 'NP',
    destinationCurrency: 'NPR',
    testItems: [
      { name: 'Test Product 1', costprice_origin: 1000, quantity: 1, weight: 0.5 },
      { name: 'Test Product 2', costprice_origin: 500, quantity: 2, weight: 0.3 }
    ],
    expectedMinValues: {
      totalOrigin: 2000, // 1000 + (500 * 2)
      totalDestination: 3200 // Approx INR to NPR conversion
    }
  },
  {
    name: 'US to India',
    originCountry: 'US',
    originCurrency: 'USD',
    destinationCountry: 'IN',
    destinationCurrency: 'INR',
    testItems: [
      { name: 'US Product', costprice_origin: 100, quantity: 1, weight: 1.0 }
    ],
    expectedMinValues: {
      totalOrigin: 100,
      totalDestination: 8000 // Approx USD to INR conversion
    }
  },
  {
    name: 'Nepal to India',
    originCountry: 'NP',
    originCurrency: 'NPR',
    destinationCountry: 'IN',
    destinationCurrency: 'INR',
    testItems: [
      { name: 'Nepal Product', costprice_origin: 1600, quantity: 1, weight: 0.8 }
    ],
    expectedMinValues: {
      totalOrigin: 1600,
      totalDestination: 1000 // Approx NPR to INR conversion
    }
  }
];

export interface ValidationResult {
  testCase: string;
  passed: boolean;
  errors: string[];
  calculations: {
    itemsTotal: number;
    finalTotal: number;
    exchangeRate: number;
    currency: string;
  };
}

/**
 * Validate currency integration across test cases
 */
export async function validateCurrencyIntegration(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  // currencyService is already imported as instance
  const calculator = new SimplifiedQuoteCalculator();

  for (const testCase of currencyTestCases) {
    const errors: string[] = [];
    let passed = true;

    try {
      // Test 1: Currency Service Exchange Rates
      const exchangeRate = await currencyService.getExchangeRate(
        testCase.originCurrency,
        testCase.destinationCurrency
      );

      if (!exchangeRate || exchangeRate <= 0) {
        errors.push(`Invalid exchange rate: ${exchangeRate}`);
        passed = false;
      }

      // Test 2: Currency Formatting
      const testAmount = 1234.56;
      const originFormatted = currencyService.formatAmount(testAmount, testCase.originCurrency);
      const destinationFormatted = currencyService.formatAmount(testAmount, testCase.destinationCurrency);

      if (!originFormatted || originFormatted === 'N/A') {
        errors.push(`Failed to format origin currency: ${testCase.originCurrency}`);
        passed = false;
      }

      if (!destinationFormatted || destinationFormatted === 'N/A') {
        errors.push(`Failed to format destination currency: ${testCase.destinationCurrency}`);
        passed = false;
      }

      // Test 3: Calculator Integration
      const calculationInput = {
        items: testCase.testItems.map(item => ({
          ...item,
          id: Math.random().toString(),
          hsnCode: '1234',
          category: 'electronics'
        })),
        origin_country: testCase.originCountry,
        origin_currency: testCase.originCurrency,
        destination_country: testCase.destinationCountry,
        destination_currency: testCase.destinationCurrency,
        origin_state: 'Default'
      };

      const result = await calculator.calculate(calculationInput);

      // Validate calculation results
      const itemsTotal = testCase.testItems.reduce(
        (sum, item) => sum + (item.costprice_origin * item.quantity), 
        0
      );

      if (!result.calculation_steps?.items_subtotal) {
        errors.push('Missing items subtotal in calculation result');
        passed = false;
      } else if (Math.abs(result.calculation_steps.items_subtotal - itemsTotal) > 0.01) {
        errors.push(
          `Items total mismatch: expected ${itemsTotal}, got ${result.calculation_steps.items_subtotal}`
        );
        passed = false;
      }

      // Validate currency fields
      if (result.inputs?.origin_currency !== testCase.originCurrency) {
        errors.push(`Origin currency mismatch: expected ${testCase.originCurrency}, got ${result.inputs?.origin_currency}`);
        passed = false;
      }

      if (!result.calculation_steps?.total_origin_currency) {
        errors.push('Missing total_origin_currency in calculation result');
        passed = false;
      }

      if (!result.calculation_steps?.total_destination_currency) {
        errors.push('Missing total_destination_currency in calculation result');
        passed = false;
      }

      results.push({
        testCase: testCase.name,
        passed,
        errors,
        calculations: {
          itemsTotal,
          finalTotal: result.calculation_steps?.total_origin_currency || 0,
          exchangeRate,
          currency: testCase.originCurrency
        }
      });

    } catch (error) {
      results.push({
        testCase: testCase.name,
        passed: false,
        errors: [`Calculation failed: ${error.message}`],
        calculations: {
          itemsTotal: 0,
          finalTotal: 0,
          exchangeRate: 0,
          currency: testCase.originCurrency
        }
      });
    }
  }

  return results;
}

/**
 * Generate validation report
 */
export function generateValidationReport(results: ValidationResult[]): string {
  const passCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const passRate = ((passCount / totalCount) * 100).toFixed(1);

  let report = `# Currency Integration Validation Report\n\n`;
  report += `**Overall Status:** ${passCount}/${totalCount} tests passed (${passRate}%)\n\n`;

  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    report += `## ${result.testCase} - ${status}\n\n`;
    
    if (result.passed) {
      report += `- Items Total: ${result.calculations.currency} ${result.calculations.itemsTotal}\n`;
      report += `- Final Total: ${result.calculations.currency} ${result.calculations.finalTotal}\n`;
      report += `- Exchange Rate: ${result.calculations.exchangeRate}\n\n`;
    } else {
      report += `**Errors:**\n`;
      result.errors.forEach(error => {
        report += `- ${error}\n`;
      });
      report += `\n`;
    }
  }

  return report;
}

/**
 * Quick validation for development
 */
export async function quickCurrencyValidation(): Promise<boolean> {
  console.log('🧪 Running currency integration validation...');
  
  const results = await validateCurrencyIntegration();
  const allPassed = results.every(r => r.passed);
  
  if (allPassed) {
    console.log('✅ All currency tests passed!');
  } else {
    console.error('❌ Some currency tests failed:');
    results.filter(r => !r.passed).forEach(result => {
      console.error(`  - ${result.testCase}: ${result.errors.join(', ')}`);
    });
  }
  
  return allPassed;
}