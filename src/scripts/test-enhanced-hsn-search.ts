// ============================================================================
// TEST SCRIPT: Enhanced HSN Search with Contextual Learning
// Demonstrates the new contextual learning capabilities
// ============================================================================

import { enhancedHSNSearchService } from '@/services/EnhancedHSNSearchService';

export async function testEnhancedHSNSearch() {
  console.log('=== Enhanced HSN Search Test ===\n');

  try {
    // 1. Initialize contextual learning
    console.log('1. Initializing contextual learning system...');
    const learningResult = await enhancedHSNSearchService.initializeContextualLearning();
    console.log(
      `✅ Learning initialized: ${learningResult.learned} new mappings, ${learningResult.updated} updated`,
    );

    // 2. Test product name detection with multiple strategies
    const testProducts = [
      'iPhone 15 Pro',
      'Samsung Galaxy S24',
      'Nike Air Max Shoes',
      'MacBook Pro M3',
      'Canon EOS Camera',
    ];

    for (const productName of testProducts) {
      console.log(`\n2. Testing enhanced detection for: "${productName}"`);

      const result = await enhancedHSNSearchService.getEnhancedProductSuggestions(productName);

      console.log(`   📊 Strategy breakdown:`);
      console.log(`      - Text search: ${result.strategies.text_search}`);
      console.log(`      - Brand match: ${result.strategies.brand_match}`);
      console.log(`      - Contextual: ${result.strategies.contextual}`);

      console.log(`   💡 Top suggestions (${result.suggestions.length}):`);
      result.suggestions.slice(0, 3).forEach((suggestion, index) => {
        console.log(`      ${index + 1}. ${suggestion.hsn_code} - ${suggestion.display_name}`);
        console.log(`         Confidence: ${(suggestion.confidence * 100).toFixed(1)}%`);
        console.log(`         Reason: ${suggestion.match_reason}`);
      });
    }

    // 3. Test contextual suggestions specifically
    console.log('\n3. Testing contextual suggestions for similar products...');
    const contextualResults = await enhancedHSNSearchService.getContextualSuggestions(
      'Apple Watch',
      5,
    );
    console.log(`   Found ${contextualResults.length} contextual matches:`);
    contextualResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.hsn_code} - ${result.display_name}`);
      console.log(`      Match reason: ${result.match_reason}`);
    });

    // 4. Test brand-based detection
    console.log('\n4. Testing brand-based detection...');
    const brandResults =
      await enhancedHSNSearchService.detectHSNFromProductName('Sony PlayStation 5');
    console.log(`   Found ${brandResults.length} brand-based matches:`);
    brandResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.hsn_code} - ${result.display_name}`);
      console.log(`      Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    });

    console.log('\n✅ Enhanced HSN Search test completed successfully!');

    return {
      success: true,
      learningStats: learningResult,
      testResults: {
        productsLearned: learningResult.learned,
        strategiesWorking: Object.values(result.strategies).some((count) => count > 0),
        contextualSuggestionsAvailable: contextualResults.length > 0,
      },
    };
  } catch (error) {
    console.error('❌ Enhanced HSN Search test failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Export for use in development console
if (typeof window !== 'undefined') {
  (window as any).testEnhancedHSNSearch = testEnhancedHSNSearch;
}
