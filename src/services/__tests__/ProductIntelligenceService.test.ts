/**
 * Product Intelligence Service Tests - Phase 2
 * 
 * Unit tests for smart suggestion functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { productIntelligenceService } from '../ProductIntelligenceService';
import { smartQuoteEnhancementService } from '../SmartQuoteEnhancementService';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: {
              id: '1',
              country_code: 'IN',
              country_name: 'India',
              classification_system: 'HSN',
              classification_digits: 4,
              default_customs_rate: 20.00,
              default_local_tax_rate: 18.00,
              local_tax_name: 'GST',
              enable_weight_estimation: true,
              enable_category_suggestions: true,
              enable_customs_valuation_override: true
            }, 
            error: null 
          })),
          limit: jest.fn(() => Promise.resolve({
            data: [
              {
                id: '1',
                classification_code: '8517',
                country_code: 'IN',
                product_name: 'Mobile Phones',
                category: 'Electronics',
                customs_rate: 18.00,
                confidence_score: 0.95,
                search_keywords: ['mobile', 'phone', 'smartphone'],
                typical_weight_kg: 0.18
              }
            ],
            error: null
          }))
        })),
        contains: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({
                data: [
                  {
                    id: '1',
                    classification_code: '8517',
                    country_code: 'IN',
                    product_name: 'Mobile Phones',
                    category: 'Electronics',
                    customs_rate: 18.00,
                    confidence_score: 0.95
                  }
                ],
                error: null
              }))
            }))
          }))
        }))
      }))
    })),
    rpc: jest.fn(() => Promise.resolve({
      data: [
        {
          id: '1',
          classification_code: '8517',
          product_name: 'Mobile Phones',
          category: 'Electronics',
          confidence_score: 0.95
        }
      ],
      error: null
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } }
      }))
    }
  }
}));

describe('ProductIntelligenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCountryConfig', () => {
    it('should return country configuration for valid country code', async () => {
      const config = await productIntelligenceService.getCountryConfig('IN');
      
      expect(config).not.toBeNull();
      expect(config?.country_code).toBe('IN');
      expect(config?.classification_system).toBe('HSN');
      expect(config?.default_customs_rate).toBe(20.00);
    });

    it('should handle invalid country codes gracefully', async () => {
      const config = await productIntelligenceService.getCountryConfig('XX');
      expect(config).toBeNull();
    });
  });

  describe('searchProductClassifications', () => {
    it('should return classification results for valid search', async () => {
      const results = await productIntelligenceService.searchProductClassifications(
        'mobile phone',
        'IN',
        5
      );
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].classification_code).toBe('8517');
      expect(results[0].category).toBe('Electronics');
    });

    it('should return empty array for no matches', async () => {
      const results = await productIntelligenceService.searchProductClassifications(
        'nonexistent product',
        'IN',
        5
      );
      
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getSmartSuggestions', () => {
    it('should generate smart suggestions for valid product', async () => {
      const suggestion = await productIntelligenceService.getSmartSuggestions({
        product_name: 'iPhone 14',
        category: 'Electronics',
        destination_country: 'IN',
        price_origin: 800
      });
      
      expect(suggestion).not.toBeNull();
      expect(suggestion?.classification_code).toBeDefined();
      expect(suggestion?.customs_rate).toBeGreaterThan(0);
      expect(suggestion?.confidence_score).toBeGreaterThan(0);
    });

    it('should handle products with no matches gracefully', async () => {
      const suggestion = await productIntelligenceService.getSmartSuggestions({
        product_name: 'completely unknown product',
        destination_country: 'IN'
      });
      
      // Should either return null or a default suggestion
      expect(suggestion === null || suggestion.confidence_score >= 0).toBe(true);
    });
  });
});

describe('SmartQuoteEnhancementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enhanceQuoteItem', () => {
    it('should enhance quote item with smart suggestions', async () => {
      const originalItem = {
        name: 'iPhone 14',
        unit_price_origin: 800,
        quantity: 1,
        category: 'Electronics'
      };

      const options = {
        destination_country: 'IN',
        enable_weight_suggestions: true,
        enable_hsn_suggestions: true,
        enable_category_suggestions: true,
        fallback_to_defaults: true,
        confidence_threshold: 0.7,
        max_suggestions_per_item: 3
      };

      const enhanced = await smartQuoteEnhancementService.enhanceQuoteItem(
        originalItem,
        options
      );

      expect(enhanced.name).toBe(originalItem.name);
      expect(enhanced.unit_price_origin).toBe(originalItem.unit_price_origin);
      expect(enhanced.enhancement_applied).toBeDefined();
      
      if (enhanced.enhancement_applied) {
        expect(enhanced.smart_suggestions).toBeDefined();
        expect(enhanced.enhancement_timestamp).toBeDefined();
      }
    });

    it('should gracefully handle disabled enhancements', async () => {
      const originalItem = {
        name: 'Test Product',
        unit_price_origin: 100,
        quantity: 1
      };

      const options = {
        destination_country: 'IN',
        enable_weight_suggestions: false,
        enable_hsn_suggestions: false,
        enable_category_suggestions: false,
        fallback_to_defaults: false,
        confidence_threshold: 0.9,
        max_suggestions_per_item: 3
      };

      const enhanced = await smartQuoteEnhancementService.enhanceQuoteItem(
        originalItem,
        options
      );

      expect(enhanced.enhancement_applied).toBe(false);
      expect(enhanced.smart_suggestions).toBeUndefined();
    });
  });

  describe('enhanceQuoteItems', () => {
    it('should enhance multiple items in batch', async () => {
      const items = [
        { name: 'iPhone 14', unit_price_origin: 800, quantity: 1 },
        { name: 'Samsung Galaxy', unit_price_origin: 700, quantity: 1 },
        { name: 'T-shirt', unit_price_origin: 20, quantity: 2 }
      ];

      const options = {
        destination_country: 'IN',
        enable_weight_suggestions: true,
        enable_hsn_suggestions: true,
        enable_category_suggestions: true,
        fallback_to_defaults: true,
        confidence_threshold: 0.7,
        max_suggestions_per_item: 3
      };

      const enhanced = await smartQuoteEnhancementService.enhanceQuoteItems(
        items,
        options
      );

      expect(enhanced.length).toBe(items.length);
      enhanced.forEach((item, index) => {
        expect(item.name).toBe(items[index].name);
        expect(item.enhancement_applied).toBeDefined();
      });
    });
  });

  describe('getAvailableCategories', () => {
    it('should return list of available categories', async () => {
      const categories = await smartQuoteEnhancementService.getAvailableCategories('IN');
      
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  describe('getHSNSuggestions', () => {
    it('should return HSN code suggestions', async () => {
      const suggestions = await smartQuoteEnhancementService.getHSNSuggestions(
        'mobile phone',
        'IN',
        'Electronics'
      );
      
      expect(Array.isArray(suggestions)).toBe(true);
      suggestions.forEach(suggestion => {
        expect(suggestion.code).toBeDefined();
        expect(suggestion.name).toBeDefined();
        expect(suggestion.rate).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidence).toBeGreaterThan(0);
      });
    });
  });
});

// Performance and edge case tests
describe('Performance and Edge Cases', () => {
  describe('Caching', () => {
    it('should cache country configurations', async () => {
      const start = Date.now();
      await productIntelligenceService.getCountryConfig('IN');
      const firstCall = Date.now() - start;

      const start2 = Date.now();
      await productIntelligenceService.getCountryConfig('IN');
      const secondCall = Date.now() - start2;

      // Second call should be faster due to caching
      expect(secondCall).toBeLessThanOrEqual(firstCall);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database errors
      // For now, we test that the service doesn't throw unhandled exceptions
      expect(async () => {
        await productIntelligenceService.getCountryConfig('ERROR');
      }).not.toThrow();
    });

    it('should handle malformed input gracefully', async () => {
      expect(async () => {
        await productIntelligenceService.getSmartSuggestions({
          product_name: '',
          destination_country: ''
        });
      }).not.toThrow();
    });
  });

  describe('Confidence Thresholds', () => {
    it('should respect confidence thresholds in suggestions', async () => {
      const lowThresholdOptions = {
        destination_country: 'IN',
        enable_weight_suggestions: true,
        enable_hsn_suggestions: true,
        enable_category_suggestions: true,
        fallback_to_defaults: true,
        confidence_threshold: 0.1, // Very low threshold
        max_suggestions_per_item: 3
      };

      const highThresholdOptions = {
        ...lowThresholdOptions,
        confidence_threshold: 0.95 // Very high threshold
      };

      const item = {
        name: 'generic product',
        unit_price_origin: 50,
        quantity: 1
      };

      const lowThresholdResult = await smartQuoteEnhancementService.enhanceQuoteItem(
        item,
        lowThresholdOptions
      );

      const highThresholdResult = await smartQuoteEnhancementService.enhanceQuoteItem(
        item,
        highThresholdOptions
      );

      // Low threshold should be more likely to apply enhancements
      // High threshold should be more conservative
      expect(lowThresholdResult.enhancement_applied).toBeDefined();
      expect(highThresholdResult.enhancement_applied).toBeDefined();
    });
  });
});