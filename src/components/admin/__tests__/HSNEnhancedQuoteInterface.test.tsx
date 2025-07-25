/**
 * HSN Enhanced Quote Interface Tests
 * Integration tests for the real-time HSN quote interface
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HSNEnhancedQuoteInterface } from '../HSNEnhancedQuoteInterface';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';
import { hsnQuoteIntegrationService } from '@/services/HSNQuoteIntegrationService';
import { governmentAPIOrchestrator } from '@/services/api/GovernmentAPIOrchestrator';
import type { UnifiedQuote } from '@/types/unified-quote';

// Mock dependencies
vi.mock('@/services/UnifiedDataEngine');
vi.mock('@/services/HSNQuoteIntegrationService');
vi.mock('@/services/api/GovernmentAPIOrchestrator');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockUnifiedDataEngine = unifiedDataEngine as any;
const mockHSNService = hsnQuoteIntegrationService as any;
const mockGovernmentAPI = governmentAPIOrchestrator as any;

const createWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('HSNEnhancedQuoteInterface', () => {
  let mockQuote: UnifiedQuote;

  beforeEach(() => {
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
      final_total_usd: 1278.72,
      calculation_data: {
        breakdown: {
          items_total: 1049,
          shipping: 50,
          customs: 104.9,
          destination_tax: 188.82,
          fees: 30,
        },
        hsn_breakdown: {
          total_items: 2,
          total_customs_duty: 104.9,
          total_local_tax: 188.82,
          total_tax_amount: 293.72,
          classification_confidence: 0.9,
          minimum_valuation_applied: false,
          item_breakdowns: [],
        },
      },
      operational_data: {
        hsn_tax_calculation: true,
        last_hsn_update: '2024-01-01T00:00:00Z',
        calculation_method: 'per_item_hsn',
      },
    } as UnifiedQuote;

    // Setup mocks
    mockUnifiedDataEngine.getQuote.mockResolvedValue(mockQuote);

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
        {
          itemId: 'item-2',
          itemName: 'Cotton T-Shirt',
          costPrice: 25,
          costPriceUSD: 25,
          quantity: 2,
          valuationMethod: 'cost_price',
          valuationAmount: 50,
          hsnCode: '6109',
          category: 'clothing',
          classificationConfidence: 0.85,
          customsDuty: { rate: 12, amount: 6 },
          localTax: { rate: 12, amount: 6 },
          totalTaxAmount: 12,
          totalItemCostWithTax: 62,
        },
      ],
      realTimeUpdates: {
        taxRatesUpdated: true,
        weightDetected: false,
        hsnCodesClassified: 2,
        apiCallsMade: 2,
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

    mockHSNService.getPerformanceStats.mockReturnValue({
      totalCalculations: 100,
      averageProcessingTime: 500,
      cacheHitRate: 0.75,
      apiCallsSaved: 25,
      errorsHandled: 2,
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('component rendering', () => {
    it('should render loading state initially', () => {
      mockUnifiedDataEngine.getQuote.mockImplementation(() => new Promise(() => {}));

      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      expect(screen.getByText('Loading HSN-enhanced quote...')).toBeInTheDocument();
      expect(screen.getByRole('generic', { name: /loading/i })).toBeInTheDocument();
    });

    it('should render error state when quote loading fails', async () => {
      mockUnifiedDataEngine.getQuote.mockRejectedValue(new Error('Failed to load quote'));

      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to load quote: Failed to load quote')).toBeInTheDocument();
      });
    });

    it('should render quote not found state', async () => {
      mockUnifiedDataEngine.getQuote.mockResolvedValue(null);

      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText('Quote not found')).toBeInTheDocument();
      });
    });

    it('should render main interface when quote loads successfully', async () => {
      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText('HSN-Enhanced Quote #test-quote-1')).toBeInTheDocument();
        expect(screen.getByText('US → IN')).toBeInTheDocument();
      });
    });
  });

  describe('real-time status indicators', () => {
    it('should show real-time status badge when enabled', async () => {
      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" enableRealTime={true} />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText('Real-time ON')).toBeInTheDocument();
      });
    });

    it('should show performance indicators', async () => {
      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText('100% classified')).toBeInTheDocument();
        expect(screen.getByText('live')).toBeInTheDocument();
      });
    });

    it('should show calculation progress during processing', async () => {
      // Mock ongoing calculation
      mockHSNService.calculateQuoteWithHSN.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  quote: mockQuote,
                  itemBreakdowns: [],
                  realTimeUpdates: {
                    taxRatesUpdated: true,
                    weightDetected: false,
                    hsnCodesClassified: 1,
                    apiCallsMade: 1,
                    cacheHits: 0,
                  },
                }),
              1000,
            ),
          ),
      );

      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText('Calculating HSN-based taxes...')).toBeInTheDocument();
      });
    });
  });

  describe('tab navigation', () => {
    it('should render all tabs correctly', async () => {
      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Items & HSN' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Tax Breakdown' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'System Status' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Comparison' })).toBeInTheDocument();
      });
    });

    it('should switch between tabs correctly', async () => {
      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Items & HSN' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('tab', { name: 'Items & HSN' }));

      expect(screen.getByText('Items with HSN Classifications')).toBeInTheDocument();
      expect(
        screen.getByText('Automatic HSN code detection and per-item tax calculations'),
      ).toBeInTheDocument();
    });
  });

  describe('quote summary display', () => {
    it('should display quote summary correctly', async () => {
      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText('Quote Summary')).toBeInTheDocument();
        expect(screen.getByText('$1049.00')).toBeInTheDocument(); // Items total
        expect(screen.getByText('$1278.72')).toBeInTheDocument(); // Final total
      });
    });

    it('should show HSN classification count', async () => {
      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText('2 / 2')).toBeInTheDocument(); // HSN classifications
        expect(screen.getByText('Per-Item HSN')).toBeInTheDocument(); // Tax method
      });
    });
  });

  describe('real-time controls', () => {
    it('should render real-time controls when enabled', async () => {
      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" enableRealTime={true} />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText('Real-Time Controls')).toBeInTheDocument();
      });
    });

    it('should handle manual recalculation', async () => {
      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText('Recalculate')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Recalculate'));

      expect(mockUnifiedDataEngine.getQuote).toHaveBeenCalledTimes(2);
    });
  });

  describe('tax breakdown display', () => {
    it('should display HSN-based tax breakdown', async () => {
      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Tax Breakdown' }));
      });

      expect(screen.getByText('HSN-Based Tax Calculation')).toBeInTheDocument();
      expect(screen.getByText('$104.90')).toBeInTheDocument(); // Total customs duty
      expect(screen.getByText('$188.82')).toBeInTheDocument(); // Total local tax
    });

    it('should show government API status in tax breakdown', async () => {
      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'Tax Breakdown' }));
      });

      expect(screen.getByText('Government API Status')).toBeInTheDocument();
    });
  });

  describe('system status monitoring', () => {
    it('should display system status in dedicated tab', async () => {
      render(
        <HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" showAdvancedFeatures={true} />,
        { wrapper: createWrapper },
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('tab', { name: 'System Status' }));
      });

      expect(screen.getByText('Performance Overview')).toBeInTheDocument();
    });
  });

  describe('real-time updates', () => {
    it('should show real-time status footer', async () => {
      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" enableRealTime={true} />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
        expect(screen.getByText(/API calls: 2 \| Cache hits: 0/)).toBeInTheDocument();
        expect(screen.getByText('Live rates')).toBeInTheDocument();
      });
    });

    it('should handle disabled real-time mode', async () => {
      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" enableRealTime={false} />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.queryByText('Real-Time Controls')).not.toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle HSN calculation errors gracefully', async () => {
      mockHSNService.calculateQuoteWithHSN.mockResolvedValue({
        success: false,
        quote: mockQuote,
        itemBreakdowns: [],
        realTimeUpdates: {
          taxRatesUpdated: false,
          weightDetected: false,
          hsnCodesClassified: 0,
          apiCallsMade: 0,
          cacheHits: 0,
        },
        errors: ['HSN calculation failed, using fallback'],
      });

      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText('HSN-Enhanced Quote #test-quote-1')).toBeInTheDocument();
      });

      // Should still render the interface with fallback data
      expect(screen.getByText('Quote Summary')).toBeInTheDocument();
    });

    it('should show system degraded status when APIs are down', async () => {
      mockGovernmentAPI.getSystemStatus.mockResolvedValue({
        overall_status: 'degraded',
        services: {
          india_gst: { status: 'error', stats: {} },
          nepal_vat: { status: 'online', stats: { localDataEntries: 100 } },
          us_taxjar: { status: 'online', stats: { hasValidAPIKey: true } },
        },
        orchestrator_stats: {
          totalRequests: 50,
          apiCallsMade: 10,
          cacheHits: 30,
          fallbacksUsed: 10,
          errors: 5,
        },
      });

      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText('degraded')).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
        expect(screen.getAllByRole('tab')).toHaveLength(5);
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        const tabList = screen.getByRole('tablist');
        expect(tabList).toBeInTheDocument();
      });

      const itemsTab = screen.getByRole('tab', { name: 'Items & HSN' });
      itemsTab.focus();
      fireEvent.keyDown(itemsTab, { key: 'Enter' });

      expect(screen.getByText('Items with HSN Classifications')).toBeInTheDocument();
    });
  });

  describe('performance', () => {
    it('should not cause excessive re-renders', async () => {
      const renderSpy = vi.fn();

      const TestComponent = () => {
        renderSpy();
        return <HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />;
      };

      render(<TestComponent />, { wrapper: createWrapper });

      await waitFor(() => {
        expect(screen.getByText('HSN-Enhanced Quote #test-quote-1')).toBeInTheDocument();
      });

      // Should not render excessively
      expect(renderSpy).toHaveBeenCalledTimes(2); // Initial + after data load
    });

    it('should handle concurrent calculations efficiently', async () => {
      // Render multiple instances
      const { rerender } = render(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />, {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText('HSN-Enhanced Quote #test-quote-1')).toBeInTheDocument();
      });

      rerender(<HSNEnhancedQuoteInterface initialQuoteId="test-quote-1" />);

      // Should not trigger duplicate calculations due to React Query caching
      expect(mockHSNService.calculateQuoteWithHSN).toHaveBeenCalledTimes(1);
    });
  });
});
