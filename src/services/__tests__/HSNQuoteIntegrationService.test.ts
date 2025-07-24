/**
 * HSN Quote Integration Service Tests
 * Comprehensive test suite for real-time HSN calculations
 */

import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { HSNQuoteIntegrationService, HSNRealTimeOptions } from '../HSNQuoteIntegrationService';
import { governmentAPIOrchestrator } from '../api/GovernmentAPIOrchestrator';
import { autoProductClassifier } from '../AutoProductClassifier';
import { weightDetectionService } from '../WeightDetectionService';
import { perItemTaxCalculator } from '../PerItemTaxCalculator';
import type { UnifiedQuote, QuoteItem } from '@/types/unified-quote';

// Mock dependencies
vi.mock('../api/GovernmentAPIOrchestrator');
vi.mock('../AutoProductClassifier');
vi.mock('../WeightDetectionService');
vi.mock('../PerItemTaxCalculator');
vi.mock('../SmartCalculationEngine');

const mockGovernmentAPI = governmentAPIOrchestrator as any;
const mockClassifier = autoProductClassifier as any;
const mockWeightDetection = weightDetectionService as any;
const mockTaxCalculator = perItemTaxCalculator as any;

describe('HSNQuoteIntegrationService', () => {
  let service: HSNQuoteIntegrationService;
  let mockQuote: UnifiedQuote;
  let defaultOptions: HSNRealTimeOptions;

  beforeEach(() => {
    service = HSNQuoteIntegrationService.getInstance();

    // Reset mocks
    vi.clearAllMocks();

    // Mock quote data
    mockQuote = {
      id: 'test-quote-1',
      origin_country: 'US',
      destination_country: 'IN',
      items: [
        {
          id: 'item-1',
          name: 'iPhone 15 Pro',
          url: 'https://amazon.com/iphone-15-pro',
          costprice_origin: 999,
          quantity: 1,
          weight_kg: 0.2,
          hsn_code: '8517',
          category: 'electronics',
        },
        {
          id: 'item-2',
          name: 'Cotton T-Shirt',
          url: 'https://amazon.com/cotton-tshirt',
          costprice_origin: 25,
          quantity: 2,
          weight_kg: 0.15,
          category: 'clothing',
        },
      ],
      final_total_usd: 0,
      calculation_data: {
        breakdown: {
          items_total: 1049,
          shipping: 50,
          customs: 0,
          destination_tax: 0,
          fees: 0,
        },
      },
    } as UnifiedQuote;

    defaultOptions = {
      enableGovernmentAPIs: true,
      enableAutoClassification: true,
      enableWeightDetection: true,
      enableMinimumValuation: true,
      updateFrequency: 'immediate',
      cacheDuration: 15 * 60 * 1000,
    };

    // Setup default mocks
    mockGovernmentAPI.getTaxRate.mockResolvedValue({
      success: true,
      country: 'IN',
      source: 'government_api',
      taxes: {
        primary_rate: 18,
        primary_amount: 179.82,
        total_tax_rate: 18,
        total_tax_amount: 179.82,
      },
      countrySpecific: {
        gst_rate: 18,
        exemption_status: 'taxable',
      },
      last_updated: new Date().toISOString(),
      confidence_score: 0.95,
    });

    mockClassifier.classifyProduct.mockResolvedValue({
      success: true,
      hsnCode: '6109',
      category: 'clothing',
      confidence: 0.85,
    });

    mockWeightDetection.detectWeight.mockResolvedValue({
      success: true,
      detectedWeight: 0.15,
      confidence: 0.9,
      source: 'product_specifications',
    });

    mockTaxCalculator.calculateItemTaxes.mockResolvedValue({
      itemId: 'item-1',
      itemName: 'iPhone 15 Pro',
      costPrice: 999,
      costPriceUSD: 999,
      quantity: 1,
      valuationMethod: 'cost_price',
      valuationAmount: 999,
      hsnCode: '8517',
      category: 'electronics',
      classificationConfidence: 0.95,
      customsDuty: { rate: 10, amount: 99.9 },
      localTax: { rate: 18, amount: 179.82 },
      totalTaxAmount: 279.72,
      totalItemCostWithTax: 1278.72,
    });
  });

  afterEach(() => {
    service.clearCaches();
  });

  describe('calculateQuoteWithHSN', () => {
    it('should calculate quote with HSN-based taxes successfully', async () => {
      const result = await service.calculateQuoteWithHSN(mockQuote, defaultOptions);

      expect(result.success).toBe(true);
      expect(result.quote).toBeDefined();
      expect(result.itemBreakdowns).toHaveLength(2);
      expect(result.realTimeUpdates.hsnCodesClassified).toBeGreaterThan(0);
    });

    it('should handle government API integration', async () => {
      await service.calculateQuoteWithHSN(mockQuote, defaultOptions);

      expect(mockGovernmentAPI.getTaxRate).toHaveBeenCalledWith(
        expect.objectContaining({
          destinationCountry: 'IN',
          originCountry: 'US',
          hsnCode: '8517',
          checkMinimumValuation: true,
        }),
      );
    });

    it('should perform auto-classification when HSN codes are missing', async () => {
      const quoteWithoutHSN = {
        ...mockQuote,
        items: [
          {
            ...mockQuote.items[1],
            hsn_code: undefined,
          },
        ],
      };

      await service.calculateQuoteWithHSN(quoteWithoutHSN, defaultOptions);

      expect(mockClassifier.classifyProduct).toHaveBeenCalledWith({
        name: 'Cotton T-Shirt',
        url: 'https://amazon.com/cotton-tshirt',
        description: undefined,
        price: 25,
      });
    });

    it('should detect weights when missing', async () => {
      const quoteWithoutWeight = {
        ...mockQuote,
        items: [
          {
            ...mockQuote.items[1],
            weight_kg: 0,
          },
        ],
      };

      await service.calculateQuoteWithHSN(quoteWithoutWeight, defaultOptions);

      expect(mockWeightDetection.detectWeight).toHaveBeenCalledWith({
        productName: 'Cotton T-Shirt',
        productURL: 'https://amazon.com/cotton-tshirt',
        hsnCode: undefined,
        category: 'clothing',
      });
    });

    it('should use cached results when available', async () => {
      // First calculation
      await service.calculateQuoteWithHSN(mockQuote, defaultOptions);

      // Second calculation should use cache
      const result = await service.calculateQuoteWithHSN(mockQuote, defaultOptions);

      expect(result.success).toBe(true);
      // Government API should only be called once due to caching
      expect(mockGovernmentAPI.getTaxRate).toHaveBeenCalledTimes(1);
    });

    it('should handle API failures gracefully', async () => {
      mockGovernmentAPI.getTaxRate.mockRejectedValue(new Error('API failure'));

      const result = await service.calculateQuoteWithHSN(mockQuote, defaultOptions);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('HSN calculation failed, using fallback');
    });

    it('should apply minimum valuation rules when enabled', async () => {
      mockGovernmentAPI.getTaxRate.mockResolvedValue({
        success: true,
        country: 'NP',
        source: 'government_api',
        taxes: {
          primary_rate: 13,
          primary_amount: 1.3,
          secondary_rate: 12,
          secondary_amount: 1.2,
          total_tax_rate: 25,
          total_tax_amount: 2.5,
        },
        countrySpecific: {
          minimum_valuation: {
            amount: 10,
            currency: 'USD',
            applies: true,
          },
        },
        warnings: ['Minimum valuation of $10 applied (higher than actual value $25)'],
        last_updated: new Date().toISOString(),
        confidence_score: 0.9,
      });

      const nepalQuote = { ...mockQuote, destination_country: 'NP' };
      const result = await service.calculateQuoteWithHSN(nepalQuote, {
        ...defaultOptions,
        enableMinimumValuation: true,
      });

      expect(result.success).toBe(true);
      expect(mockGovernmentAPI.getTaxRate).toHaveBeenCalledWith(
        expect.objectContaining({
          checkMinimumValuation: true,
        }),
      );
    });
  });

  describe('calculateQuoteLiveSync', () => {
    it('should perform synchronous calculation using cached data', () => {
      const result = service.calculateQuoteLiveSync(mockQuote, defaultOptions);

      expect(result.success).toBe(true);
      expect(result.quote).toBeDefined();
      expect(result.realTimeUpdates.cacheHits).toBeGreaterThan(0);
    });

    it('should warn when no cached data is available', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = service.calculateQuoteLiveSync(mockQuote, defaultOptions);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No cached HSN data for live sync'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('performance and caching', () => {
    it('should track performance metrics', async () => {
      await service.calculateQuoteWithHSN(mockQuote, defaultOptions);

      const stats = service.getPerformanceStats();

      expect(stats.totalCalculations).toBeGreaterThan(0);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
    });

    it('should generate unique cache keys for different quotes', async () => {
      const quote1 = { ...mockQuote, id: 'quote-1' };
      const quote2 = { ...mockQuote, id: 'quote-2' };

      await service.calculateQuoteWithHSN(quote1, defaultOptions);
      await service.calculateQuoteWithHSN(quote2, defaultOptions);

      // Both should result in API calls since cache keys are different
      expect(mockGovernmentAPI.getTaxRate).toHaveBeenCalledTimes(2);
    });

    it('should clear caches properly', async () => {
      await service.calculateQuoteWithHSN(mockQuote, defaultOptions);

      service.clearCaches();

      // After clearing cache, should make API calls again
      await service.calculateQuoteWithHSN(mockQuote, defaultOptions);
      expect(mockGovernmentAPI.getTaxRate).toHaveBeenCalledTimes(2);
    });

    it('should respect cache duration settings', async () => {
      const shortCacheOptions = { ...defaultOptions, cacheDuration: 100 }; // 100ms

      await service.calculateQuoteWithHSN(mockQuote, shortCacheOptions);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      await service.calculateQuoteWithHSN(mockQuote, shortCacheOptions);

      // Should make API calls twice due to cache expiry
      expect(mockGovernmentAPI.getTaxRate).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle classification failures gracefully', async () => {
      mockClassifier.classifyProduct.mockRejectedValue(new Error('Classification failed'));

      const result = await service.calculateQuoteWithHSN(mockQuote, defaultOptions);

      expect(result.success).toBe(true); // Should still succeed with partial data
      expect(result.realTimeUpdates.hsnCodesClassified).toBe(1); // Only pre-classified items
    });

    it('should handle weight detection failures gracefully', async () => {
      mockWeightDetection.detectWeight.mockRejectedValue(new Error('Weight detection failed'));

      const result = await service.calculateQuoteWithHSN(mockQuote, defaultOptions);

      expect(result.success).toBe(true); // Should still succeed
      expect(result.realTimeUpdates.weightDetected).toBe(true); // Pre-existing weights
    });

    it('should provide fallback calculations when tax calculation fails', async () => {
      mockTaxCalculator.calculateItemTaxes.mockRejectedValue(new Error('Tax calculation failed'));

      const result = await service.calculateQuoteWithHSN(mockQuote, defaultOptions);

      expect(result.success).toBe(true);
      expect(result.itemBreakdowns).toHaveLength(2); // Should have fallback breakdowns
      expect(result.itemBreakdowns[0].customsDuty.rate).toBe(10); // Fallback rate
      expect(result.itemBreakdowns[0].localTax.rate).toBe(13); // Fallback rate
    });
  });

  describe('configuration options', () => {
    it('should respect disabled government APIs', async () => {
      const optionsWithoutAPI = { ...defaultOptions, enableGovernmentAPIs: false };

      const result = await service.calculateQuoteWithHSN(mockQuote, optionsWithoutAPI);

      expect(result.success).toBe(true);
      expect(mockGovernmentAPI.getTaxRate).toHaveBeenCalledTimes(0);
      expect(result.realTimeUpdates.apiCallsMade).toBe(0);
    });

    it('should respect disabled auto-classification', async () => {
      const optionsWithoutClassification = { ...defaultOptions, enableAutoClassification: false };

      await service.calculateQuoteWithHSN(mockQuote, optionsWithoutClassification);

      expect(mockClassifier.classifyProduct).toHaveBeenCalledTimes(0);
    });

    it('should respect disabled weight detection', async () => {
      const optionsWithoutWeight = { ...defaultOptions, enableWeightDetection: false };

      await service.calculateQuoteWithHSN(mockQuote, optionsWithoutWeight);

      expect(mockWeightDetection.detectWeight).toHaveBeenCalledTimes(0);
    });

    it('should handle different update frequencies', async () => {
      const batchOptions = { ...defaultOptions, updateFrequency: 'batch' as const };

      const result = await service.calculateQuoteWithHSN(mockQuote, batchOptions);

      expect(result.success).toBe(true);
      // Batch mode should still work but with different timing behavior
    });
  });

  describe('real-time updates', () => {
    it('should provide detailed real-time update information', async () => {
      const result = await service.calculateQuoteWithHSN(mockQuote, defaultOptions);

      expect(result.realTimeUpdates).toEqual({
        taxRatesUpdated: true,
        weightDetected: true,
        hsnCodesClassified: 2,
        apiCallsMade: expect.any(Number),
        cacheHits: expect.any(Number),
      });
    });

    it('should track API usage vs cache hits correctly', async () => {
      // First call - should use API
      const result1 = await service.calculateQuoteWithHSN(mockQuote, defaultOptions);

      // Second call - should use cache
      const result2 = await service.calculateQuoteWithHSN(mockQuote, defaultOptions);

      expect(result1.realTimeUpdates.apiCallsMade).toBeGreaterThan(0);
      expect(result2.realTimeUpdates.cacheHits).toBeGreaterThan(0);
    });
  });
});
