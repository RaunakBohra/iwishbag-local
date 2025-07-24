/**
 * HSN Quote Calculation Hooks Tests
 * Tests for React Query hooks providing real-time HSN calculations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useHSNQuoteCalculation,
  useHSNLiveCalculation,
  useHSNSystemStatus,
  useHSNPerformanceStats,
  useHSNOptimisticUpdates,
} from '../useHSNQuoteCalculation';
import { hsnQuoteIntegrationService } from '@/services/HSNQuoteIntegrationService';
import { governmentAPIOrchestrator } from '@/services/api/GovernmentAPIOrchestrator';
import type { UnifiedQuote } from '@/types/unified-quote';

// Mock services
vi.mock('@/services/HSNQuoteIntegrationService');
vi.mock('@/services/api/GovernmentAPIOrchestrator');

const mockHSNService = hsnQuoteIntegrationService as any;
const mockGovernmentAPI = governmentAPIOrchestrator as any;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useHSNQuoteCalculation', () => {
  let mockQuote: UnifiedQuote;
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, cacheTime: 0, staleTime: 0 },
      },
    });

    mockQuote = {
      id: 'test-quote-1',
      origin_country: 'US',
      destination_country: 'IN',
      items: [
        {
          id: 'item-1',
          name: 'iPhone 15 Pro',
          costprice_origin: 999,
          quantity: 1,
          weight_kg: 0.2,
          hsn_code: '8517',
          category: 'electronics',
        },
      ],
      final_total_usd: 0,
    } as UnifiedQuote;

    // Setup default mocks
    mockHSNService.calculateQuoteWithHSN.mockResolvedValue({
      success: true,
      quote: mockQuote,
      itemBreakdowns: [
        {
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
        },
      ],
      realTimeUpdates: {
        taxRatesUpdated: true,
        weightDetected: true,
        hsnCodesClassified: 1,
        apiCallsMade: 1,
        cacheHits: 0,
      },
    });

    mockHSNService.calculateQuoteLiveSync.mockReturnValue({
      success: true,
      quote: mockQuote,
      itemBreakdowns: [],
      realTimeUpdates: {
        taxRatesUpdated: false,
        weightDetected: false,
        hsnCodesClassified: 0,
        apiCallsMade: 0,
        cacheHits: 1,
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('useHSNQuoteCalculation', () => {
    it('should fetch HSN calculation data successfully', async () => {
      const { result } = renderHook(() => useHSNQuoteCalculation(mockQuote), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.calculation?.success).toBe(true);
      expect(result.current.quote).toEqual(mockQuote);
      expect(result.current.itemBreakdowns).toHaveLength(1);
      expect(result.current.realTimeUpdates?.hsnCodesClassified).toBe(1);
    });

    it('should handle loading state correctly', () => {
      const { result } = renderHook(() => useHSNQuoteCalculation(mockQuote), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.calculation).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      mockHSNService.calculateQuoteWithHSN.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useHSNQuoteCalculation(mockQuote), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.calculation).toBeUndefined();
    });

    it('should not fetch when quote is undefined', () => {
      const { result } = renderHook(() => useHSNQuoteCalculation(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockHSNService.calculateQuoteWithHSN).not.toHaveBeenCalled();
    });

    it('should provide live sync calculation function', async () => {
      const { result } = renderHook(() => useHSNQuoteCalculation(mockQuote), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updatedQuote = { ...mockQuote, final_total_usd: 1500 };
      const syncResult = result.current.liveSyncCalculation(updatedQuote);

      expect(syncResult).toBeDefined();
      expect(mockHSNService.calculateQuoteLiveSync).toHaveBeenCalledWith(
        updatedQuote,
        expect.any(Object),
      );
    });

    it('should handle recalculation mutation', async () => {
      const { result } = renderHook(() => useHSNQuoteCalculation(mockQuote), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.recalculate({ enableGovernmentAPIs: false });

      await waitFor(() => {
        expect(result.current.isRecalculating).toBe(false);
      });

      expect(mockHSNService.calculateQuoteWithHSN).toHaveBeenCalledWith(
        mockQuote,
        expect.objectContaining({ enableGovernmentAPIs: false }),
      );
    });

    it('should respect custom options', async () => {
      const customOptions = {
        enableGovernmentAPIs: false,
        enableAutoClassification: false,
        enableWeightDetection: false,
        enableMinimumValuation: false,
        updateFrequency: 'manual' as const,
        cacheDuration: 30 * 60 * 1000,
      };

      const { result } = renderHook(() => useHSNQuoteCalculation(mockQuote, customOptions), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockHSNService.calculateQuoteWithHSN).toHaveBeenCalledWith(mockQuote, customOptions);
    });
  });

  describe('useHSNLiveCalculation', () => {
    it('should provide debounced update function', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useHSNLiveCalculation(mockQuote), {
        wrapper: createWrapper(),
      });

      const updatedQuote = { ...mockQuote, final_total_usd: 1500 };

      // Call multiple times rapidly
      result.current.updateCalculation(updatedQuote);
      result.current.updateCalculation(updatedQuote);
      result.current.updateCalculation(updatedQuote);

      // Should not have called service yet (debounced)
      expect(mockHSNService.calculateQuoteLiveSync).not.toHaveBeenCalled();

      // Fast-forward past debounce delay
      vi.advanceTimersByTime(350);

      // Should now have called service once
      expect(mockHSNService.calculateQuoteLiveSync).toHaveBeenCalledTimes(1);
      expect(mockHSNService.calculateQuoteLiveSync).toHaveBeenCalledWith(
        updatedQuote,
        expect.any(Object),
      );

      vi.useRealTimers();
    });

    it('should update query cache immediately', () => {
      const { result } = renderHook(() => useHSNLiveCalculation(mockQuote), {
        wrapper: createWrapper(),
      });

      const updatedQuote = { ...mockQuote, final_total_usd: 1500 };
      result.current.updateCalculation(updatedQuote);

      // Should update React Query cache immediately
      expect(mockHSNService.calculateQuoteLiveSync).toHaveBeenCalled();
    });
  });

  describe('useHSNSystemStatus', () => {
    beforeEach(() => {
      mockGovernmentAPI.getSystemStatus.mockResolvedValue({
        overall_status: 'healthy',
        services: {
          india_gst: { status: 'online', stats: { requestCount: 10 } },
          nepal_vat: { status: 'online', stats: { localDataEntries: 100 } },
          us_taxjar: { status: 'online', stats: { hasValidAPIKey: true } },
        },
        orchestrator_stats: {
          totalRequests: 50,
          apiCallsMade: 20,
          cacheHits: 30,
          fallbacksUsed: 0,
          errors: 0,
        },
      });
    });

    it('should fetch system status successfully', async () => {
      const { result } = renderHook(() => useHSNSystemStatus(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.overall_status).toBe('healthy');
      expect(result.current.data?.services).toBeDefined();
      expect(mockGovernmentAPI.getSystemStatus).toHaveBeenCalled();
    });

    it('should handle system status errors', async () => {
      mockGovernmentAPI.getSystemStatus.mockRejectedValue(new Error('Status check failed'));

      const { result } = renderHook(() => useHSNSystemStatus(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useHSNPerformanceStats', () => {
    beforeEach(() => {
      mockHSNService.getPerformanceStats.mockReturnValue({
        totalCalculations: 100,
        averageProcessingTime: 500,
        cacheHitRate: 0.75,
        apiCallsSaved: 25,
        errorsHandled: 2,
      });
    });

    it('should fetch performance stats successfully', async () => {
      const { result } = renderHook(() => useHSNPerformanceStats(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.totalCalculations).toBe(100);
      expect(result.current.data?.averageProcessingTime).toBe(500);
      expect(result.current.data?.cacheHitRate).toBe(0.75);
      expect(mockHSNService.getPerformanceStats).toHaveBeenCalled();
    });

    it('should refetch stats periodically', async () => {
      vi.useFakeTimers();

      renderHook(() => useHSNPerformanceStats(), { wrapper: createWrapper() });

      // Initial call
      expect(mockHSNService.getPerformanceStats).toHaveBeenCalledTimes(1);

      // Fast-forward to trigger refetch
      vi.advanceTimersByTime(10000);

      await waitFor(() => {
        expect(mockHSNService.getPerformanceStats).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });
  });

  describe('useHSNOptimisticUpdates', () => {
    it('should provide optimistic update function', () => {
      const { result } = renderHook(() => useHSNOptimisticUpdates('test-quote-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.updateQuoteOptimistically).toBeDefined();
      expect(typeof result.current.updateQuoteOptimistically).toBe('function');
    });

    it('should handle optimistic updates with rollback', async () => {
      const { result } = renderHook(() => useHSNOptimisticUpdates('test-quote-1'), {
        wrapper: createWrapper(),
      });

      const updates = { final_total_usd: 1500 };
      const rollbackSpy = vi.fn();

      const rollback = result.current.updateQuoteOptimistically(updates, rollbackSpy);

      expect(mockHSNService.calculateQuoteLiveSync).toHaveBeenCalledWith(
        expect.objectContaining(updates),
        expect.any(Object),
      );

      // Test rollback functionality
      if (rollback) {
        rollback();
        expect(rollbackSpy).toHaveBeenCalled();
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle quote updates with real-time calculation flow', async () => {
      const { result: calculationResult } = renderHook(() => useHSNQuoteCalculation(mockQuote), {
        wrapper: createWrapper(),
      });

      const { result: liveResult } = renderHook(() => useHSNLiveCalculation(mockQuote), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(calculationResult.current.isLoading).toBe(false);
      });

      // Simulate quote update
      const updatedQuote = { ...mockQuote, final_total_usd: 1500 };
      liveResult.current.updateCalculation(updatedQuote);

      // Should trigger live sync
      expect(mockHSNService.calculateQuoteLiveSync).toHaveBeenCalledWith(
        updatedQuote,
        expect.any(Object),
      );
    });

    it('should handle cache invalidation correctly', async () => {
      const { result } = renderHook(() => useHSNQuoteCalculation(mockQuote), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Invalidate and refetch
      result.current.invalidate();

      await waitFor(() => {
        expect(mockHSNService.calculateQuoteWithHSN).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle concurrent calculations efficiently', async () => {
      const { result: result1 } = renderHook(() => useHSNQuoteCalculation(mockQuote), {
        wrapper: createWrapper(),
      });

      const { result: result2 } = renderHook(() => useHSNQuoteCalculation(mockQuote), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
      });

      // Should share the same data due to query key matching
      expect(result1.current.calculation).toEqual(result2.current.calculation);
    });
  });
});
