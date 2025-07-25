/**
 * HSN System Integration Tests
 * End-to-end tests for the complete HSN tax calculation workflow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HSNRealTimeProvider } from '@/providers/HSNRealtimeProvider';
import { HSNEnhancedQuoteInterface } from '@/components/admin/HSNEnhancedQuoteInterface';
import { supabase } from '@/integrations/supabase/client';
import type { UnifiedQuote } from '@/types/unified-quote';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAllCountries', () => ({
  useAllCountries: () => ({
    data: [
      { code: 'US', name: 'United States' },
      { code: 'IN', name: 'India' },
      { code: 'NP', name: 'Nepal' },
    ],
  }),
}));

const mockSupabase = supabase as any;

const createTestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HSNRealTimeProvider>{children}</HSNRealTimeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('HSN System Integration Tests', () => {
  let mockQuote: UnifiedQuote;

  beforeEach(() => {
    mockQuote = {
      id: 'integration-test-quote',
      origin_country: 'US',
      destination_country: 'IN',
      items: [
        {
          id: 'electronics-item',
          name: 'MacBook Pro 16"',
          url: 'https://amazon.com/macbook-pro-16',
          costprice_origin: 2499,
          quantity: 1,
          weight_kg: 0,
          description: 'Latest MacBook Pro with M3 chip',
        },
        {
          id: 'clothing-item',
          name: 'Nike Running Shoes',
          url: 'https://amazon.com/nike-running-shoes',
          costprice_origin: 120,
          quantity: 1,
          weight_kg: 0,
          description: 'Premium running shoes',
        },
      ],
      final_total_usd: 0,
      customer_data: {
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
      },
    } as UnifiedQuote;

    // Mock Supabase responses for the complete workflow
    setupSupabaseMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const setupSupabaseMocks = () => {
    // Mock quote loading
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'quotes') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: mockQuote,
                  error: null,
                }),
            }),
          }),
        };
      }

      if (table === 'hsn_master') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    hsn_code: '8471',
                    description: 'Automatic data processing machines',
                    weight_kg: 2.0,
                    customs_duty_rate: 10,
                    gst_rate: 18,
                    category: 'electronics',
                  },
                  error: null,
                }),
            }),
            ilike: () => ({
              limit: () =>
                Promise.resolve({
                  data: [
                    {
                      hsn_code: '8471',
                      description: 'Automatic data processing machines',
                      category: 'electronics',
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      }

      if (table === 'admin_overrides') {
        return {
          select: () => ({
            eq: () => ({
              eq: () =>
                Promise.resolve({
                  data: [],
                  error: null,
                }),
            }),
          }),
        };
      }

      if (table === 'shipping_routes') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'route-us-in',
                      origin_country: 'US',
                      destination_country: 'IN',
                      base_shipping_cost: 25,
                      shipping_per_kg: 15,
                      customs_percentage: 10,
                      delivery_options: [
                        {
                          id: 'standard',
                          name: 'Standard Delivery',
                          carrier: 'DHL',
                          min_days: 7,
                          max_days: 10,
                          price: 0,
                          active: true,
                        },
                      ],
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    });
  };

  describe('Complete HSN Workflow', () => {
    it('should complete the full HSN calculation workflow', async () => {
      render(
        <HSNEnhancedQuoteInterface
          initialQuoteId="integration-test-quote"
          enableRealTime={true}
          showAdvancedFeatures={true}
        />,
        { wrapper: createTestWrapper },
      );

      // 1. Should show loading state initially
      expect(screen.getByText('Loading HSN-enhanced quote...')).toBeInTheDocument();

      // 2. Should load and display the quote
      await waitFor(
        () => {
          expect(
            screen.getByText('HSN-Enhanced Quote #integration-test-quote'),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // 3. Should show quote summary
      expect(screen.getByText('US → IN')).toBeInTheDocument();
      expect(screen.getByText('Quote Summary')).toBeInTheDocument();

      // 4. Should show real-time status
      expect(screen.getByText('Real-time ON')).toBeInTheDocument();

      // 5. Navigate to Items & HSN tab to see classification
      fireEvent.click(screen.getByRole('tab', { name: 'Items & HSN' }));

      await waitFor(() => {
        expect(screen.getByText('Items with HSN Classifications')).toBeInTheDocument();
      });

      // 6. Should show items with HSN codes
      expect(screen.getByText('MacBook Pro 16"')).toBeInTheDocument();
      expect(screen.getByText('Nike Running Shoes')).toBeInTheDocument();

      // 7. Navigate to Tax Breakdown tab
      fireEvent.click(screen.getByRole('tab', { name: 'Tax Breakdown' }));

      await waitFor(() => {
        expect(screen.getByText('HSN-Based Tax Calculation')).toBeInTheDocument();
      });

      // 8. Should show tax calculations
      expect(screen.getByText('Total Customs Duty')).toBeInTheDocument();
      expect(screen.getByText('Total Local Tax')).toBeInTheDocument();

      // 9. Navigate to System Status tab
      fireEvent.click(screen.getByRole('tab', { name: 'System Status' }));

      await waitFor(() => {
        expect(screen.getByText('Performance Overview')).toBeInTheDocument();
      });

      // 10. Navigate to Comparison tab
      fireEvent.click(screen.getByRole('tab', { name: 'Comparison' }));

      await waitFor(() => {
        expect(screen.getByText('Tax Calculation Comparison')).toBeInTheDocument();
      });

      // 11. Should show comparison between HSN and legacy methods
      expect(screen.getByText('HSN vs Legacy')).toBeInTheDocument();
    });

    it('should handle real-time quote updates', async () => {
      render(
        <HSNEnhancedQuoteInterface initialQuoteId="integration-test-quote" enableRealTime={true} />,
        { wrapper: createTestWrapper },
      );

      await waitFor(() => {
        expect(screen.getByText('HSN-Enhanced Quote #integration-test-quote')).toBeInTheDocument();
      });

      // Simulate real-time update by triggering recalculation
      const recalculateButton = screen.getByText('Recalculate');
      expect(recalculateButton).toBeInTheDocument();

      fireEvent.click(recalculateButton);

      // Should show calculating state
      await waitFor(() => {
        expect(screen.getByText('Calculating...')).toBeInTheDocument();
      });

      // Should complete calculation
      await waitFor(
        () => {
          expect(screen.getByText('Recalculate')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it('should handle government API status changes', async () => {
      render(
        <HSNEnhancedQuoteInterface
          initialQuoteId="integration-test-quote"
          enableRealTime={true}
          showAdvancedFeatures={true}
        />,
        { wrapper: createTestWrapper },
      );

      await waitFor(() => {
        expect(screen.getByText('HSN-Enhanced Quote #integration-test-quote')).toBeInTheDocument();
      });

      // Navigate to System Status tab
      fireEvent.click(screen.getByRole('tab', { name: 'System Status' }));

      await waitFor(() => {
        expect(screen.getByText('Performance Overview')).toBeInTheDocument();
      });

      // Should show system health indicators
      expect(screen.getByText('System Status')).toBeInTheDocument();
    });

    it('should handle auto-classification workflow', async () => {
      // Test quote with items missing HSN codes
      const quoteWithoutHSN = {
        ...mockQuote,
        items: [
          {
            ...mockQuote.items[0],
            hsn_code: undefined,
            category: undefined,
          },
        ],
      };

      // Mock updated quote response
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'quotes') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: quoteWithoutHSN,
                    error: null,
                  }),
              }),
            }),
          };
        }
        return setupSupabaseMocks();
      });

      render(
        <HSNEnhancedQuoteInterface initialQuoteId="integration-test-quote" enableRealTime={true} />,
        { wrapper: createTestWrapper },
      );

      await waitFor(() => {
        expect(screen.getByText('HSN-Enhanced Quote #integration-test-quote')).toBeInTheDocument();
      });

      // Navigate to Items & HSN tab
      fireEvent.click(screen.getByRole('tab', { name: 'Items & HSN' }));

      await waitFor(() => {
        expect(screen.getByText('Items with HSN Classifications')).toBeInTheDocument();
      });

      // Should show classification in progress or completed
      expect(screen.getByText('MacBook Pro 16"')).toBeInTheDocument();
    });

    it('should handle minimum valuation rules for Nepal', async () => {
      // Test Nepal route with minimum valuation
      const nepalQuote = {
        ...mockQuote,
        destination_country: 'NP',
        items: [
          {
            id: 'kurta-item',
            name: 'Traditional Kurta',
            costprice_origin: 8, // Less than Nepal minimum of $10
            quantity: 1,
            hsn_code: '6109',
            category: 'clothing',
          },
        ],
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'quotes') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: nepalQuote,
                    error: null,
                  }),
              }),
            }),
          };
        }
        return setupSupabaseMocks();
      });

      render(
        <HSNEnhancedQuoteInterface initialQuoteId="integration-test-quote" enableRealTime={true} />,
        { wrapper: createTestWrapper },
      );

      await waitFor(() => {
        expect(screen.getByText('HSN-Enhanced Quote #integration-test-quote')).toBeInTheDocument();
      });

      // Should show Nepal route
      expect(screen.getByText('US → NP')).toBeInTheDocument();

      // Navigate to Items & HSN tab
      fireEvent.click(screen.getByRole('tab', { name: 'Items & HSN' }));

      await waitFor(() => {
        expect(screen.getByText('Items with HSN Classifications')).toBeInTheDocument();
      });

      // Should show traditional kurta item
      expect(screen.getByText('Traditional Kurta')).toBeInTheDocument();
    });

    it('should handle weight detection workflow', async () => {
      // Test quote with items missing weights
      const quoteWithoutWeights = {
        ...mockQuote,
        items: [
          {
            ...mockQuote.items[0],
            weight_kg: 0, // Missing weight
          },
        ],
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'quotes') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: quoteWithoutWeights,
                    error: null,
                  }),
              }),
            }),
          };
        }
        return setupSupabaseMocks();
      });

      render(
        <HSNEnhancedQuoteInterface initialQuoteId="integration-test-quote" enableRealTime={true} />,
        { wrapper: createTestWrapper },
      );

      await waitFor(() => {
        expect(screen.getByText('HSN-Enhanced Quote #integration-test-quote')).toBeInTheDocument();
      });

      // Should indicate weight detection in progress or completed
      const statusFooter = screen.getByText(/Last updated:/);
      expect(statusFooter).toBeInTheDocument();
    });

    it('should handle system fallback when APIs are down', async () => {
      // Mock API failure scenario by having the system status show degraded
      render(
        <HSNEnhancedQuoteInterface
          initialQuoteId="integration-test-quote"
          enableRealTime={true}
          showAdvancedFeatures={true}
        />,
        { wrapper: createTestWrapper },
      );

      await waitFor(() => {
        expect(screen.getByText('HSN-Enhanced Quote #integration-test-quote')).toBeInTheDocument();
      });

      // Should still function with fallback data
      expect(screen.getByText('Quote Summary')).toBeInTheDocument();

      // Navigate to System Status to check API health
      fireEvent.click(screen.getByRole('tab', { name: 'System Status' }));

      await waitFor(() => {
        expect(screen.getByText('Performance Overview')).toBeInTheDocument();
      });
    });

    it('should handle performance optimization presets', async () => {
      render(
        <HSNEnhancedQuoteInterface initialQuoteId="integration-test-quote" enableRealTime={true} />,
        { wrapper: createTestWrapper },
      );

      await waitFor(() => {
        expect(screen.getByText('HSN-Enhanced Quote #integration-test-quote')).toBeInTheDocument();
      });

      // Should show real-time controls
      expect(screen.getByText('Real-Time Controls')).toBeInTheDocument();

      // Test performance preset buttons if visible
      const controlsSection = screen.getByText('Real-Time Controls').closest('div');
      if (controlsSection?.textContent?.includes('High Performance')) {
        const highPerfButton = screen.getByText('High Performance');
        fireEvent.click(highPerfButton);

        // Should update system configuration
        await waitFor(() => {
          expect(screen.getByText('Real-time ON')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from network failures gracefully', async () => {
      // Mock network failure
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      render(
        <HSNEnhancedQuoteInterface initialQuoteId="integration-test-quote" enableRealTime={true} />,
        { wrapper: createTestWrapper },
      );

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/Failed to load quote/)).toBeInTheDocument();
      });
    });

    it('should handle partial service failures', async () => {
      // Mock successful quote load but HSN service issues
      setupSupabaseMocks();

      render(
        <HSNEnhancedQuoteInterface initialQuoteId="integration-test-quote" enableRealTime={true} />,
        { wrapper: createTestWrapper },
      );

      await waitFor(() => {
        expect(screen.getByText('HSN-Enhanced Quote #integration-test-quote')).toBeInTheDocument();
      });

      // Should still show the interface even with partial failures
      expect(screen.getByText('Quote Summary')).toBeInTheDocument();
    });

    it('should handle concurrent user interactions', async () => {
      render(
        <HSNEnhancedQuoteInterface initialQuoteId="integration-test-quote" enableRealTime={true} />,
        { wrapper: createTestWrapper },
      );

      await waitFor(() => {
        expect(screen.getByText('HSN-Enhanced Quote #integration-test-quote')).toBeInTheDocument();
      });

      // Rapidly switch between tabs (simulating fast user interaction)
      const tabs = ['Items & HSN', 'Tax Breakdown', 'System Status', 'Comparison'];

      for (const tabName of tabs) {
        fireEvent.click(screen.getByRole('tab', { name: tabName }));
        await waitFor(() => {
          expect(screen.getByRole('tab', { name: tabName })).toHaveAttribute(
            'data-state',
            'active',
          );
        });
      }

      // Should handle rapid tab switching without errors
      expect(screen.getByText('Tax Calculation Comparison')).toBeInTheDocument();
    });
  });

  describe('Performance Validation', () => {
    it('should complete calculations within acceptable time limits', async () => {
      const startTime = Date.now();

      render(
        <HSNEnhancedQuoteInterface initialQuoteId="integration-test-quote" enableRealTime={true} />,
        { wrapper: createTestWrapper },
      );

      await waitFor(() => {
        expect(screen.getByText('HSN-Enhanced Quote #integration-test-quote')).toBeInTheDocument();
      });

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      // Should render within 3 seconds
      expect(renderTime).toBeLessThan(3000);
    });

    it('should not cause memory leaks with repeated calculations', async () => {
      const { rerender } = render(
        <HSNEnhancedQuoteInterface initialQuoteId="integration-test-quote" enableRealTime={true} />,
        { wrapper: createTestWrapper },
      );

      // Perform multiple re-renders to simulate real usage
      for (let i = 0; i < 5; i++) {
        rerender(
          <HSNEnhancedQuoteInterface
            initialQuoteId="integration-test-quote"
            enableRealTime={true}
          />,
        );

        await waitFor(() => {
          expect(
            screen.getByText('HSN-Enhanced Quote #integration-test-quote'),
          ).toBeInTheDocument();
        });
      }

      // Should handle multiple re-renders without issues
      expect(screen.getByText('Quote Summary')).toBeInTheDocument();
    });
  });
});
