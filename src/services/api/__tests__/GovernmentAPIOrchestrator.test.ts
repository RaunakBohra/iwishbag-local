/**
 * Government API Orchestrator Tests
 * Tests for unified government API integration system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GovernmentAPIOrchestrator,
  UnifiedTaxQuery,
  BatchTaxQuery,
} from '../GovernmentAPIOrchestrator';
import { indiaGSTService } from '../IndiaGSTService';
import { nepalVATService } from '../NepalVATService';
import { usTaxJarService } from '../USTaxJarService';

// Mock individual services
vi.mock('../IndiaGSTService');
vi.mock('../NepalVATService');
vi.mock('../USTaxJarService');

const mockIndiaService = indiaGSTService as any;
const mockNepalService = nepalVATService as any;
const mockUSService = usTaxJarService as any;

describe('GovernmentAPIOrchestrator', () => {
  let orchestrator: GovernmentAPIOrchestrator;

  beforeEach(() => {
    orchestrator = GovernmentAPIOrchestrator.getInstance();
    vi.clearAllMocks();

    // Setup default successful responses
    mockIndiaService.getGSTRate.mockResolvedValue({
      success: true,
      data: {
        hsn_code: '8517',
        gst_rate: 18,
        cess_rate: 0,
        exemption_status: 'taxable',
        last_updated: '2024-01-01T00:00:00Z',
      },
    });

    mockNepalService.getVATRate.mockResolvedValue({
      success: true,
      data: {
        hsn_code: '6109',
        vat_rate: 13,
        customs_duty: 12,
        minimum_valuation: { amount: 10, currency: 'USD' },
        source: 'local_database',
        last_updated: '2024-01-01T00:00:00Z',
      },
    });

    mockUSService.calculateSalesTax.mockResolvedValue({
      success: true,
      data: {
        total_sales_tax: 8.88,
        state_tax_rate: 6.25,
        county_tax_rate: 1.0,
        city_tax_rate: 1.5,
        combined_rate: 8.75,
        state: 'CA',
        county: 'Los Angeles',
        city: 'Los Angeles',
        zip: '90210',
        last_updated: '2024-01-01T00:00:00Z',
      },
    });

    mockUSService.convertHSNToTaxJarCode.mockReturnValue('30070');
  });

  afterEach(() => {
    orchestrator.clearAllCaches();
  });

  describe('getTaxRate', () => {
    describe('India GST integration', () => {
      it('should get India GST rate successfully', async () => {
        const query: UnifiedTaxQuery = {
          destinationCountry: 'IN',
          originCountry: 'US',
          hsnCode: '8517',
          amount: 999,
          businessType: 'b2c',
        };

        const result = await orchestrator.getTaxRate(query);

        expect(result.success).toBe(true);
        expect(result.country).toBe('IN');
        expect(result.source).toBe('government_api');
        expect(result.taxes.primary_rate).toBe(18);
        expect(result.taxes.total_tax_amount).toBeCloseTo(179.82);
        expect(mockIndiaService.getGSTRate).toHaveBeenCalledWith({
          hsn_code: '8517',
          supply_type: 'interstate',
          business_type: 'b2c',
        });
      });

      it('should handle intrastate supply type correctly', async () => {
        const query: UnifiedTaxQuery = {
          destinationCountry: 'IN',
          originCountry: 'IN',
          hsnCode: '8517',
          amount: 999,
        };

        await orchestrator.getTaxRate(query);

        expect(mockIndiaService.getGSTRate).toHaveBeenCalledWith({
          hsn_code: '8517',
          supply_type: 'intrastate',
          business_type: 'b2c',
        });
      });

      it('should handle GST with CESS', async () => {
        mockIndiaService.getGSTRate.mockResolvedValue({
          success: true,
          data: {
            hsn_code: '8517',
            gst_rate: 18,
            cess_rate: 2,
            exemption_status: 'taxable',
            last_updated: '2024-01-01T00:00:00Z',
          },
        });

        const query: UnifiedTaxQuery = {
          destinationCountry: 'IN',
          hsnCode: '8517',
          amount: 1000,
        };

        const result = await orchestrator.getTaxRate(query);

        expect(result.taxes.primary_rate).toBe(18);
        expect(result.taxes.secondary_rate).toBe(2);
        expect(result.taxes.total_tax_rate).toBe(20);
        expect(result.taxes.total_tax_amount).toBe(200);
      });
    });

    describe('Nepal VAT integration', () => {
      it('should get Nepal VAT rate successfully', async () => {
        const query: UnifiedTaxQuery = {
          destinationCountry: 'NP',
          originCountry: 'IN',
          hsnCode: '6109',
          amount: 25,
          checkMinimumValuation: true,
        };

        const result = await orchestrator.getTaxRate(query);

        expect(result.success).toBe(true);
        expect(result.country).toBe('NP');
        expect(result.source).toBe('local_database');
        expect(result.taxes.primary_rate).toBe(13);
        expect(result.taxes.secondary_rate).toBe(12);
        expect(result.countrySpecific.minimum_valuation?.applies).toBe(false);
        expect(mockNepalService.getVATRate).toHaveBeenCalledWith({
          hsn_code: '6109',
          import_value_usd: 25,
          product_category: undefined,
          check_minimum_valuation: true,
        });
      });

      it('should apply minimum valuation when appropriate', async () => {
        const query: UnifiedTaxQuery = {
          destinationCountry: 'NP',
          hsnCode: '6109',
          amount: 5, // Less than minimum valuation of $10
          checkMinimumValuation: true,
        };

        const result = await orchestrator.getTaxRate(query);

        expect(result.warnings).toContain(
          'Minimum valuation of $10 applied (higher than actual value $5)',
        );
        expect(result.countrySpecific.minimum_valuation?.applies).toBe(true);
      });

      it('should handle Nepal VAT from government API source', async () => {
        mockNepalService.getVATRate.mockResolvedValue({
          success: true,
          data: {
            hsn_code: '6109',
            vat_rate: 13,
            customs_duty: 12,
            source: 'api',
            last_updated: '2024-01-01T00:00:00Z',
          },
        });

        const query: UnifiedTaxQuery = {
          destinationCountry: 'NP',
          hsnCode: '6109',
          amount: 25,
        };

        const result = await orchestrator.getTaxRate(query);

        expect(result.source).toBe('government_api');
      });
    });

    describe('US TaxJar integration', () => {
      it('should get US sales tax rate successfully', async () => {
        const query: UnifiedTaxQuery = {
          destinationCountry: 'US',
          hsnCode: '8517',
          amount: 999,
          stateProvince: 'CA',
          zipCode: '90210',
          city: 'Los Angeles',
        };

        const result = await orchestrator.getTaxRate(query);

        expect(result.success).toBe(true);
        expect(result.country).toBe('US');
        expect(result.source).toBe('government_api');
        expect(result.taxes.primary_rate).toBe(8.75);
        expect(result.countrySpecific.state_tax_rate).toBe(6.25);
        expect(result.countrySpecific.county_tax_rate).toBe(1.0);
        expect(mockUSService.calculateSalesTax).toHaveBeenCalledWith({
          to_country: 'US',
          to_state: 'CA',
          to_zip: '90210',
          to_city: 'Los Angeles',
          amount: 999,
          shipping: 0,
          product_tax_code: '30070',
        });
      });

      it('should require state and zip code for US calculations', async () => {
        const query: UnifiedTaxQuery = {
          destinationCountry: 'US',
          hsnCode: '8517',
          amount: 999,
        };

        await expect(orchestrator.getTaxRate(query)).rejects.toThrow(
          'US tax calculation requires state and zip code',
        );
      });

      it('should include shipping amount in US calculations', async () => {
        const query: UnifiedTaxQuery = {
          destinationCountry: 'US',
          hsnCode: '8517',
          amount: 999,
          shippingAmount: 50,
          stateProvince: 'CA',
          zipCode: '90210',
        };

        await orchestrator.getTaxRate(query);

        expect(mockUSService.calculateSalesTax).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 999,
            shipping: 50,
          }),
        );
      });
    });

    describe('error handling and fallbacks', () => {
      it('should return fallback data when India GST API fails', async () => {
        mockIndiaService.getGSTRate.mockRejectedValue(new Error('API Error'));

        const query: UnifiedTaxQuery = {
          destinationCountry: 'IN',
          hsnCode: '8517',
          amount: 999,
        };

        const result = await orchestrator.getTaxRate(query);

        expect(result.success).toBe(true);
        expect(result.source).toBe('fallback');
        expect(result.taxes.primary_rate).toBe(18); // Standard GST rate
        expect(result.warnings).toContain('Using fallback tax rates - API unavailable');
        expect(result.confidence_score).toBe(0.3);
      });

      it('should return fallback data when Nepal VAT service fails', async () => {
        mockNepalService.getVATRate.mockRejectedValue(new Error('Service Error'));

        const query: UnifiedTaxQuery = {
          destinationCountry: 'NP',
          hsnCode: '6109',
          amount: 25,
        };

        const result = await orchestrator.getTaxRate(query);

        expect(result.success).toBe(true);
        expect(result.source).toBe('fallback');
        expect(result.taxes.primary_rate).toBe(13); // Standard VAT rate
      });

      it('should return fallback data when US TaxJar API fails', async () => {
        mockUSService.calculateSalesTax.mockRejectedValue(new Error('TaxJar Error'));

        const query: UnifiedTaxQuery = {
          destinationCountry: 'US',
          hsnCode: '8517',
          amount: 999,
          stateProvince: 'CA',
          zipCode: '90210',
        };

        const result = await orchestrator.getTaxRate(query);

        expect(result.success).toBe(true);
        expect(result.source).toBe('fallback');
        expect(result.taxes.primary_rate).toBe(8.88); // Average US sales tax
      });

      it('should throw error for unsupported countries', async () => {
        const query: UnifiedTaxQuery = {
          destinationCountry: 'XX' as any,
          hsnCode: '8517',
          amount: 999,
        };

        const result = await orchestrator.getTaxRate(query);

        expect(result.source).toBe('fallback');
        expect(result.warnings).toContain('Using fallback tax rates - API unavailable');
      });
    });

    describe('confidence scoring', () => {
      it('should assign high confidence to government API responses', async () => {
        const query: UnifiedTaxQuery = {
          destinationCountry: 'IN',
          hsnCode: '8517',
          amount: 999,
        };

        const result = await orchestrator.getTaxRate(query);

        expect(result.confidence_score).toBeGreaterThan(0.8);
      });

      it('should assign medium confidence to local database responses', async () => {
        const query: UnifiedTaxQuery = {
          destinationCountry: 'NP',
          hsnCode: '6109',
          amount: 25,
        };

        const result = await orchestrator.getTaxRate(query);

        expect(result.confidence_score).toBeGreaterThan(0.6);
        expect(result.confidence_score).toBeLessThan(0.9);
      });

      it('should assign low confidence to fallback responses', async () => {
        mockIndiaService.getGSTRate.mockRejectedValue(new Error('API Error'));

        const query: UnifiedTaxQuery = {
          destinationCountry: 'IN',
          hsnCode: '8517',
          amount: 999,
        };

        const result = await orchestrator.getTaxRate(query);

        expect(result.confidence_score).toBe(0.3);
      });

      it('should reduce confidence when warnings are present', async () => {
        const query: UnifiedTaxQuery = {
          destinationCountry: 'NP',
          hsnCode: '6109',
          amount: 5, // Will trigger minimum valuation warning
          checkMinimumValuation: true,
        };

        const result = await orchestrator.getTaxRate(query);

        expect(result.warnings).toHaveLength(1);
        expect(result.confidence_score).toBeLessThan(0.8);
      });
    });
  });

  describe('batchGetTaxRates', () => {
    it('should process batch queries efficiently', async () => {
      const queries: BatchTaxQuery[] = [
        {
          item_id: 'item1',
          destinationCountry: 'IN',
          hsnCode: '8517',
          amount: 999,
        },
        {
          item_id: 'item2',
          destinationCountry: 'NP',
          hsnCode: '6109',
          amount: 25,
        },
        {
          item_id: 'item3',
          destinationCountry: 'US',
          hsnCode: '8471',
          amount: 500,
          stateProvince: 'CA',
          zipCode: '90210',
        },
      ];

      const result = await orchestrator.batchGetTaxRates(queries);

      expect(result.success).toBe(true);
      expect(result.total_items).toBe(3);
      expect(result.successful_items).toBe(3);
      expect(result.failed_items).toBe(0);
      expect(result.results.size).toBe(3);
      expect(result.summary.total_tax_amount).toBeGreaterThan(0);
      expect(result.summary.api_calls_made).toBeGreaterThan(0);
    });

    it('should handle mixed success and failure in batch processing', async () => {
      mockIndiaService.getGSTRate.mockRejectedValue(new Error('India API Error'));

      const queries: BatchTaxQuery[] = [
        {
          item_id: 'item1',
          destinationCountry: 'IN',
          hsnCode: '8517',
          amount: 999,
        },
        {
          item_id: 'item2',
          destinationCountry: 'NP',
          hsnCode: '6109',
          amount: 25,
        },
      ];

      const result = await orchestrator.batchGetTaxRates(queries);

      expect(result.success).toBe(true); // Should succeed with fallbacks
      expect(result.total_items).toBe(2);
      expect(result.successful_items).toBe(2);
      expect(result.failed_items).toBe(0);

      // Check that fallback was used for India
      const indiaResult = result.results.get('item1');
      expect(indiaResult?.source).toBe('fallback');
    });

    it('should group queries by country for efficient processing', async () => {
      const queries: BatchTaxQuery[] = [
        { item_id: 'item1', destinationCountry: 'IN', hsnCode: '8517', amount: 999 },
        { item_id: 'item2', destinationCountry: 'IN', hsnCode: '8471', amount: 500 },
        { item_id: 'item3', destinationCountry: 'NP', hsnCode: '6109', amount: 25 },
      ];

      await orchestrator.batchGetTaxRates(queries);

      // Should call India service twice and Nepal service once
      expect(mockIndiaService.getGSTRate).toHaveBeenCalledTimes(2);
      expect(mockNepalService.getVATRate).toHaveBeenCalledTimes(1);
    });

    it('should calculate accurate summary statistics', async () => {
      const queries: BatchTaxQuery[] = [
        { item_id: 'item1', destinationCountry: 'IN', hsnCode: '8517', amount: 1000 },
        { item_id: 'item2', destinationCountry: 'IN', hsnCode: '8517', amount: 500 },
      ];

      const result = await orchestrator.batchGetTaxRates(queries);

      expect(result.summary.total_tax_amount).toBeCloseTo(270); // 18% of 1500
      expect(result.summary.average_tax_rate).toBeCloseTo(18);
      expect(result.summary.processing_time_ms).toBeGreaterThan(0);
    });
  });

  describe('getSystemStatus', () => {
    beforeEach(() => {
      mockIndiaService.getServiceStats.mockReturnValue({
        requestCount: 100,
        cacheSize: 50,
        hasValidAPIKey: true,
        rateLimitStatus: 'OK',
      });

      mockNepalService.getServiceStats.mockReturnValue({
        localDataEntries: 1000,
        cacheSize: 200,
        categoriesSupported: 6,
        minimumValuationRules: 50,
      });

      mockUSService.getServiceStats.mockReturnValue({
        requestCount: 75,
        cacheSize: 25,
        hasValidAPIKey: true,
        rateLimitStatus: 'OK',
        supportedStates: 50,
      });
    });

    it('should return healthy status when all services are online', async () => {
      const status = await orchestrator.getSystemStatus();

      expect(status.overall_status).toBe('healthy');
      expect(status.services.india_gst.status).toBe('online');
      expect(status.services.nepal_vat.status).toBe('online');
      expect(status.services.us_taxjar.status).toBe('online');
      expect(status.orchestrator_stats.totalRequests).toBeGreaterThanOrEqual(0);
    });

    it('should return degraded status when some services fail', async () => {
      mockIndiaService.getServiceStats.mockImplementation(() => {
        throw new Error('Service error');
      });

      const status = await orchestrator.getSystemStatus();

      expect(status.overall_status).toBe('degraded');
      expect(status.services.india_gst.status).toBe('error');
      expect(status.services.nepal_vat.status).toBe('online');
      expect(status.services.us_taxjar.status).toBe('online');
    });

    it('should return down status when all services fail', async () => {
      mockIndiaService.getServiceStats.mockImplementation(() => {
        throw new Error('Service error');
      });
      mockNepalService.getServiceStats.mockImplementation(() => {
        throw new Error('Service error');
      });
      mockUSService.getServiceStats.mockImplementation(() => {
        throw new Error('Service error');
      });

      const status = await orchestrator.getSystemStatus();

      expect(status.overall_status).toBe('down');
      expect(status.services.india_gst.status).toBe('error');
      expect(status.services.nepal_vat.status).toBe('error');
      expect(status.services.us_taxjar.status).toBe('error');
    });
  });

  describe('caching and performance', () => {
    it('should set appropriate cache expiry for different countries', async () => {
      const indiaQuery: UnifiedTaxQuery = {
        destinationCountry: 'IN',
        hsnCode: '8517',
        amount: 999,
      };

      const result = await orchestrator.getTaxRate(indiaQuery);

      expect(result.cache_expiry).toBeDefined();
      const expiryTime = new Date(result.cache_expiry).getTime();
      const now = Date.now();
      const timeDiff = expiryTime - now;

      // India should have 6 hour cache (21600000 ms)
      expect(timeDiff).toBeGreaterThan(5.5 * 60 * 60 * 1000);
      expect(timeDiff).toBeLessThan(6.5 * 60 * 60 * 1000);
    });

    it('should clear all service caches', () => {
      orchestrator.clearAllCaches();

      expect(mockIndiaService.clearCache).toHaveBeenCalled();
      expect(mockNepalService.clearCache).toHaveBeenCalled();
      expect(mockUSService.clearCache).toHaveBeenCalled();
    });
  });
});
