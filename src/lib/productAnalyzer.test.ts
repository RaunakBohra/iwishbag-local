// This is a demonstration file showing how the product analyzer works
// In a real implementation, you would use actual testing frameworks like Jest or Vitest

import { productAnalyzer } from './productAnalyzer';

// Example usage and testing scenarios
export const testProductAnalyzer = async () => {
  console.log('Testing Product Analyzer...\n');

  // Test 1: Amazon product URL
  try {
    console.log('Test 1: Amazon Product URL');
    const amazonResult = await productAnalyzer.analyzeProduct(
      'https://www.amazon.com/dp/B08N5WRWNW',
      'Echo Dot (4th Gen)'
    );
    console.log('Amazon Result:', amazonResult);
  } catch (error) {
    console.log('Amazon Test Failed:', error.message);
  }

  // Test 2: eBay product URL
  try {
    console.log('\nTest 2: eBay Product URL');
    const ebayResult = await productAnalyzer.analyzeProduct(
      'https://www.ebay.com/itm/123456789',
      'iPhone 13 Pro'
    );
    console.log('eBay Result:', ebayResult);
  } catch (error) {
    console.log('eBay Test Failed:', error.message);
  }

  // Test 3: Walmart product URL
  try {
    console.log('\nTest 3: Walmart Product URL');
    const walmartResult = await productAnalyzer.analyzeProduct(
      'https://www.walmart.com/ip/123456789',
      'Samsung TV'
    );
    console.log('Walmart Result:', walmartResult);
  } catch (error) {
    console.log('Walmart Test Failed:', error.message);
  }

  // Test 4: AliExpress product URL
  try {
    console.log('\nTest 4: AliExpress Product URL');
    const aliexpressResult = await productAnalyzer.analyzeProduct(
      'https://www.aliexpress.com/item/123456789.html',
      'Wireless Earbuds'
    );
    console.log('AliExpress Result:', aliexpressResult);
  } catch (error) {
    console.log('AliExpress Test Failed:', error.message);
  }

  // Test 5: Unsupported platform
  try {
    console.log('\nTest 5: Unsupported Platform');
    const unsupportedResult = await productAnalyzer.analyzeProduct(
      'https://www.unsupported-site.com/product/123',
      'Test Product'
    );
    console.log('Unsupported Result:', unsupportedResult);
  } catch (error) {
    console.log('Unsupported Test Failed (Expected):', error.message);
  }

  // Test 6: Invalid URL
  try {
    console.log('\nTest 6: Invalid URL');
    const invalidResult = await productAnalyzer.analyzeProduct(
      'not-a-valid-url',
      'Test Product'
    );
    console.log('Invalid Result:', invalidResult);
  } catch (error) {
    console.log('Invalid Test Failed (Expected):', error.message);
  }

  console.log('\nProduct Analyzer Testing Complete!');
};

// Example of how the analyzer would be used in the quote automation process
export const demonstrateQuoteAutomation = async () => {
  console.log('\n=== Quote Automation Demonstration ===\n');

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

  console.log('Customer Quote Submitted:', customerQuote);

  // Process each item
  for (const item of customerQuote.items) {
    console.log(`\nProcessing Item: ${item.product_name}`);
    
    try {
      const analysis = await productAnalyzer.analyzeProduct(
        item.product_url,
        item.product_name
      );
      
      console.log('Analysis Result:', {
        name: analysis.name,
        price: `$${analysis.price}`,
        weight: `${analysis.weight}kg`,
        category: analysis.category,
        currency: analysis.currency,
        availability: analysis.availability
      });

      // In a real system, this would update the database
      console.log('✅ Item processed successfully');
      
    } catch (error) {
      console.log('❌ Item processing failed:', error.message);
      console.log('📝 Creating manual analysis task...');
      
      // In a real system, this would create a manual analysis task
      console.log('✅ Manual analysis task created');
    }
  }

  console.log('\n=== Quote Automation Complete ===');
};

// Run the tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - you could call these functions from the console
  (window as any).testProductAnalyzer = testProductAnalyzer;
  (window as any).demonstrateQuoteAutomation = demonstrateQuoteAutomation;
} 