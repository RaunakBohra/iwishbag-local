// This is a demonstration file showing how the product analyzer works
// In a real implementation, you would use actual testing frameworks like Jest or Vitest

import { productAnalyzer } from './productAnalyzer';

// Test the Product Analyzer functionality
export async function testProductAnalyzer() {
  const results = {
    amazon: null as any,
    ebay: null as any,
    walmart: null as any,
    aliexpress: null as any,
    unsupported: null as any,
    invalid: null as any
  };

  try {
    // Test 1: Amazon Product URL
    try {
      results.amazon = await productAnalyzer.analyzeProduct('https://www.amazon.com/dp/B08N5WRWNW');
    } catch (error) {
      results.amazon = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test 2: eBay Product URL
    try {
      results.ebay = await productAnalyzer.analyzeProduct('https://www.ebay.com/itm/123456789');
    } catch (error) {
      results.ebay = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test 3: Walmart Product URL
    try {
      results.walmart = await productAnalyzer.analyzeProduct('https://www.walmart.com/ip/123456789');
    } catch (error) {
      results.walmart = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test 4: AliExpress Product URL
    try {
      results.aliexpress = await productAnalyzer.analyzeProduct('https://www.aliexpress.com/item/123456789.html');
    } catch (error) {
      results.aliexpress = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test 5: Unsupported Platform
    try {
      results.unsupported = await productAnalyzer.analyzeProduct('https://unsupported-platform.com/product/123');
    } catch (error) {
      results.unsupported = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test 6: Invalid URL
    try {
      results.invalid = await productAnalyzer.analyzeProduct('not-a-valid-url');
    } catch (error) {
      results.invalid = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    return results;
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Test failed' };
  }
}

// Example of how the analyzer would be used in the quote automation process
export const demonstrateQuoteAutomation = async () => {
  // Simulate a customer submitting a quote with product URLs
  const customerQuote = {
    id: 'quote-123',
    items: [
      {
        id: 'item-1',
        product_url: 'https://www.amazon.com/dp/B08N5WRWNW',
        product_name: 'Echo Dot (4th Gen)',
        quantity: 1
      },
      {
        id: 'item-2',
        product_url: 'https://www.ebay.com/itm/123456789',
        product_name: 'iPhone 13 Pro',
        quantity: 1
      },
      {
        id: 'item-3',
        product_name: 'Custom Product (No URL)',
        quantity: 2
      }
    ],
    country_code: 'US'
  };

  const results = [];

  // Process each item
  for (const item of customerQuote.items) {
    try {
      const analysis = await productAnalyzer.analyzeProduct(
        item.product_url,
        item.product_name
      );
      
      results.push({
        item: item.product_name,
        success: true,
        analysis: {
          name: analysis.name,
          price: `$${analysis.price}`,
          weight: `${analysis.weight}kg`,
          category: analysis.category,
          currency: analysis.currency,
          availability: analysis.availability
        }
      });
      
    } catch (error) {
      results.push({
        item: item.product_name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        manualAnalysisRequired: true
      });
    }
  }

  return results;
};

// Run the tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - you could call these functions from the console
  (window as any).testProductAnalyzer = testProductAnalyzer;
  (window as any).demonstrateQuoteAutomation = demonstrateQuoteAutomation;
} 