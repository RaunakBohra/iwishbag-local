import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

import { UnifiedQuoteCard } from '../../UnifiedQuoteCard';
import { UnifiedQuoteActions } from '../../UnifiedQuoteActions';
import { UnifiedQuoteBreakdown } from '../../UnifiedQuoteBreakdown';
import { UnifiedQuoteList } from '../../UnifiedQuoteList';
import { QuoteThemeProvider } from '@/contexts/QuoteThemeContext';
import type { UnifiedQuote } from '@/types/unified-quote';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

vi.mock('@/hooks/useAdminRole', () => ({
  useAdminRole: () => ({
    data: true, // Admin user for these tests
    isLoading: false,
  }),
}));

// Mock React Query with manual cache control
const createMockQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { 
      retry: false,
      staleTime: 0, // Always consider data stale for testing
      cacheTime: 1000 * 60 * 5, // 5 minutes cache
    },
    mutations: { retry: false },
  },
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: () => Date.now(),
  },
});

// Mock gtag for analytics
Object.defineProperty(window, 'gtag', {
  value: vi.fn(),
});

// Test data for data flow scenarios
const baseQuote: UnifiedQuote = {
  id: 'data-flow-quote',
  display_id: 'QT-DF001',
  user_id: 'test-user-id',
  status: 'pending',
  created_at: '2024-01-15T10:00:00Z',
  expires_at: '2024-02-15T10:00:00Z',
  final_total_usd: 299.99,
  item_price: 249.99,
  sales_tax_price: 20.00,
  merchant_shipping_price: 15.00,
  international_shipping: 25.00,
  customs_and_ecs: 12.50,
  domestic_shipping: 7.50,
  handling_charge: 5.00,
  insurance_amount: 2.50,
  payment_gateway_fee: 3.75,
  vat: 0.00,
  discount: 10.00,
  destination_country: 'IN',
  origin_country: 'US',
  website: 'amazon.com',
  customer_data: {
    info: {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      phone: '+9876543210'
    }
  },
  shipping_address: {
    formatted: '456 Tech Plaza, Mumbai, Maharashtra 400001, India'
  },
  items: [{
    id: 'item-dataflow',
    name: 'Wireless Headphones',
    description: 'Premium noise-cancelling headphones',
    quantity: 1,
    price: 249.99,
    product_url: 'https://amazon.com/wireless-headphones',
    image_url: 'https://example.com/headphones.jpg'
  }],
  notes: 'Please ensure original packaging',
  admin_notes: 'High-value customer',
  priority: 'medium',
  in_cart: false,
  attachments: []
};

// Helper function to render components with providers and cache control
const renderWithProviders = (component: React.ReactNode, queryClient?: QueryClient) => {
  const client = queryClient || createMockQueryClient();
  
  return {
    ...render(
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <QuoteThemeProvider>
            {component}
          </QuoteThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    ),
    queryClient: client
  };
};

describe('Unified Components Data Flow Integration Tests', () => {
  let mockDataOperations: {
    fetchQuotes: ReturnType<typeof vi.fn>;
    updateQuote: ReturnType<typeof vi.fn>;
    deleteQuote: ReturnType<typeof vi.fn>;
    bulkUpdateQuotes: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();

    // Mock data operations that simulate API calls
    mockDataOperations = {
      fetchQuotes: vi.fn().mockResolvedValue({
        data: [baseQuote],
        total: 1
      }),
      updateQuote: vi.fn().mockResolvedValue({
        success: true,
        quote: baseQuote
      }),
      deleteQuote: vi.fn().mockResolvedValue({
        success: true
      }),
      bulkUpdateQuotes: vi.fn().mockResolvedValue({
        success: true,
        updated: 1
      })
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('React Query Cache Management', () => {
    it('should maintain cache consistency across component updates', async () => {
      const queryClient = createMockQueryClient();
      const user = userEvent.setup();

      // Pre-populate cache with quote data
      queryClient.setQueryData(['quotes', 'data-flow-quote'], baseQuote);

      const mockOnAction = vi.fn().mockImplementation(async (action, quote) => {
        // Simulate successful status update
        const updatedQuote = { ...quote, status: 'sent' };
        
        // Update cache to simulate real API behavior
        queryClient.setQueryData(['quotes', quote.id], updatedQuote);
        queryClient.invalidateQueries({ queryKey: ['quotes'] });
        
        return { success: true, quote: updatedQuote };
      });

      // Render multiple components that depend on the same data
      const { rerender } = renderWithProviders(
        <div>
          <UnifiedQuoteCard
            quote={baseQuote}
            viewMode="admin"
            onAction={mockOnAction}
          />
          <UnifiedQuoteBreakdown
            quote={baseQuote}
            viewMode="admin"
          />
          <UnifiedQuoteActions
            quote={baseQuote}
            viewMode="admin"
            onAction={mockOnAction}
          />
        </div>,
        queryClient
      );

      // Verify initial state
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('Send Quote')).toBeInTheDocument();

      // Trigger status update action
      const sendButton = screen.getByText('Send Quote');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockOnAction).toHaveBeenCalledWith('send', baseQuote);
      });

      // Verify cache was updated and components reflect the change
      const cachedData = queryClient.getQueryData(['quotes', 'data-flow-quote']);
      expect(cachedData).toEqual(expect.objectContaining({ status: 'sent' }));

      // Re-render components with updated data from cache
      const updatedQuote = { ...baseQuote, status: 'sent' };
      rerender(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <QuoteThemeProvider>
              <div>
                <UnifiedQuoteCard
                  quote={updatedQuote}
                  viewMode="admin"
                  onAction={mockOnAction}
                />
                <UnifiedQuoteBreakdown
                  quote={updatedQuote}
                  viewMode="admin"
                />
                <UnifiedQuoteActions
                  quote={updatedQuote}
                  viewMode="admin"
                  onAction={mockOnAction}
                />
              </div>
            </QuoteThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>
      );

      // All components should now show updated status
      expect(screen.getByText('sent')).toBeInTheDocument();
      expect(screen.queryByText('Send Quote')).not.toBeInTheDocument();
    });

    it('should handle cache invalidation properly across component hierarchy', async () => {
      const queryClient = createMockQueryClient();
      const user = userEvent.setup();

      // Create multiple quotes in cache
      const quotes = [
        { ...baseQuote, id: 'quote-1', display_id: 'QT-001' },
        { ...baseQuote, id: 'quote-2', display_id: 'QT-002' },
        { ...baseQuote, id: 'quote-3', display_id: 'QT-003' }
      ];

      queryClient.setQueryData(['quotes'], quotes);
      queries.forEach(quote => {
        queryClient.setQueryData(['quotes', quote.id], quote);
      });

      const mockOnAction = vi.fn().mockImplementation(async (action, quote) => {
        if (action === 'delete') {
          // Remove from individual cache
          queryClient.removeQueries({ queryKey: ['quotes', quote.id] });
          // Invalidate list cache
          queryClient.invalidateQueries({ queryKey: ['quotes'] });
          
          const updatedQuotes = quotes.filter(q => q.id !== quote.id);
          queryClient.setQueryData(['quotes'], updatedQuotes);
          
          return { success: true };
        }
        return { success: true };
      });

      renderWithProviders(
        <div>
          <UnifiedQuoteList
            quotes={quotes}
            viewMode="admin"
            onItemAction={mockOnAction}
            enableSelection={true}
          />
          <UnifiedQuoteCard
            quote={quotes[0]}
            viewMode="admin"
            onAction={mockOnAction}
          />
        </div>,
        queryClient
      );

      // Should show all 3 quotes initially
      expect(screen.getByText('QT-001')).toBeInTheDocument();
      expect(screen.getByText('QT-002')).toBeInTheDocument();
      expect(screen.getByText('QT-003')).toBeInTheDocument();

      // Delete first quote
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockOnAction).toHaveBeenCalledWith('delete', quotes[0]);
      });

      // Cache should be properly invalidated
      const remainingQuotes = queryClient.getQueryData(['quotes']);
      expect(remainingQuotes).toHaveLength(2);
      expect(queryClient.getQueryData(['quotes', 'quote-1'])).toBeUndefined();
    });
  });

  describe('Cross-Component State Synchronization', () => {
    it('should synchronize selection state across multiple components', async () => {
      const user = userEvent.setup();
      const mockOnSelectionChange = vi.fn();

      const quotes = [
        { ...baseQuote, id: 'sel-1', display_id: 'QT-S01' },
        { ...baseQuote, id: 'sel-2', display_id: 'QT-S02' },
        { ...baseQuote, id: 'sel-3', display_id: 'QT-S03' }
      ];

      // Create a parent component that manages selection state
      const SelectionTestParent = () => {
        const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

        const handleSelectionChange = (ids: string[]) => {
          setSelectedIds(ids);
          mockOnSelectionChange(ids);
        };

        const handleCardSelect = (id: string, selected: boolean) => {
          if (selected) {
            setSelectedIds([...selectedIds, id]);
          } else {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
          }
        };

        return (
          <div>
            <UnifiedQuoteList
              quotes={quotes}
              viewMode="admin"
              enableSelection={true}
              selectedIds={selectedIds}
              onSelectionChange={handleSelectionChange}
            />
            {quotes.map(quote => (
              <UnifiedQuoteCard
                key={quote.id}
                quote={quote}
                viewMode="admin"
                isSelected={selectedIds.includes(quote.id)}
                onSelect={handleCardSelect}
              />
            ))}
            <div data-testid="selection-summary">
              Selected: {selectedIds.length}
            </div>
          </div>
        );
      };

      renderWithProviders(<SelectionTestParent />);

      // Should start with no selections
      expect(screen.getByTestId('selection-summary')).toHaveTextContent('Selected: 0');

      // Select all in list component
      const selectAllButton = screen.getByText('Select All');
      await user.click(selectAllButton);

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalledWith(['sel-1', 'sel-2', 'sel-3']);
        expect(screen.getByTestId('selection-summary')).toHaveTextContent('Selected: 3');
      });

      // Individual cards should reflect selection
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked();
      });

      // Deselect one item using individual card
      const firstCheckbox = checkboxes[1]; // First actual quote checkbox (not select all)
      await user.click(firstCheckbox);

      await waitFor(() => {
        expect(screen.getByTestId('selection-summary')).toHaveTextContent('Selected: 2');
      });
    });

    it('should propagate quote updates across all dependent components', async () => {
      const user = userEvent.setup();
      const queryClient = createMockQueryClient();

      // Set up a parent component that renders multiple dependent components
      const QuoteDetailsView = ({ quoteId }: { quoteId: string }) => {
        const [quote, setQuote] = React.useState(baseQuote);

        const handleQuoteUpdate = async (action: string, updatedQuote: any) => {
          // Simulate different update scenarios
          let newQuote = { ...updatedQuote };
          
          switch (action) {
            case 'updatePriority':
              newQuote.priority = 'high';
              break;
            case 'addNote':
              newQuote.admin_notes = 'Updated by admin';
              break;
            case 'recalculate':
              newQuote.final_total_usd = 399.99;
              newQuote.handling_charge = 15.00;
              break;
          }

          setQuote(newQuote);
          
          // Update cache to simulate real-world behavior
          queryClient.setQueryData(['quotes', quoteId], newQuote);
          
          return { success: true, quote: newQuote };
        };

        return (
          <div>
            <UnifiedQuoteCard
              quote={quote}
              viewMode="admin"
              layout="detail"
              onAction={handleQuoteUpdate}
            />
            <UnifiedQuoteBreakdown
              quote={quote}
              viewMode="admin"
              enableRealTimeUpdates={true}
              onAmountChange={(amount) => {
                // Verify breakdown reflects current quote data
                expect(amount).toBe(quote.final_total_usd);
              }}
            />
            <UnifiedQuoteActions
              quote={quote}
              viewMode="admin"
              onAction={handleQuoteUpdate}
            />
            <div data-testid="quote-total">${quote.final_total_usd}</div>
            <div data-testid="quote-priority">{quote.priority}</div>
            <div data-testid="admin-notes">{quote.admin_notes || 'No notes'}</div>
          </div>
        );
      };

      renderWithProviders(<QuoteDetailsView quoteId="data-flow-quote" />, queryClient);

      // Verify initial state across all components
      expect(screen.getByTestId('quote-total')).toHaveTextContent('$299.99');
      expect(screen.getByTestId('quote-priority')).toHaveTextContent('medium');
      expect(screen.getByTestId('admin-notes')).toHaveTextContent('High-value customer');

      // Trigger priority update
      const priorityButton = screen.getByText('Set High Priority');
      await user.click(priorityButton);

      await waitFor(() => {
        expect(screen.getByTestId('quote-priority')).toHaveTextContent('high');
      });

      // Add admin note
      const addNoteButton = screen.getByText('Add Note');
      await user.click(addNoteButton);

      await waitFor(() => {
        expect(screen.getByTestId('admin-notes')).toHaveTextContent('Updated by admin');
      });

      // Trigger recalculation
      const recalculateButton = screen.getByText('Recalculate');
      await user.click(recalculateButton);

      await waitFor(() => {
        expect(screen.getByTestId('quote-total')).toHaveTextContent('$399.99');
        // Breakdown should also update to reflect new total
        expect(screen.getByText('$399.99')).toBeInTheDocument();
      });
    });
  });

  describe('Optimistic Updates with Rollback', () => {
    it('should handle optimistic updates and rollback on failure', async () => {
      const user = userEvent.setup();
      const queryClient = createMockQueryClient();

      // Set initial quote in cache
      queryClient.setQueryData(['quotes', 'rollback-test'], baseQuote);

      const mockFailingAction = vi.fn()
        .mockResolvedValueOnce({ success: true }) // First call succeeds
        .mockRejectedValueOnce(new Error('Network error')); // Second call fails

      const OptimisticUpdateTest = () => {
        const [quote, setQuote] = React.useState(baseQuote);
        const [isUpdating, setIsUpdating] = React.useState(false);

        const handleOptimisticUpdate = async (action: string, targetQuote: any) => {
          setIsUpdating(true);
          
          // Optimistic update
          const optimisticQuote = { ...targetQuote, status: 'sent' };
          setQuote(optimisticQuote);
          
          try {
            const result = await mockFailingAction(action, targetQuote);
            // Success - keep optimistic update
            setIsUpdating(false);
            return result;
          } catch (error) {
            // Failure - rollback optimistic update
            setQuote(targetQuote); // Revert to original
            setIsUpdating(false);
            throw error;
          }
        };

        return (
          <div>
            <UnifiedQuoteCard
              quote={quote}
              viewMode="admin"
              onAction={handleOptimisticUpdate}
            />
            <UnifiedQuoteActions
              quote={quote}
              viewMode="admin"
              onAction={handleOptimisticUpdate}
              enableOptimisticUpdates={true}
            />
            <div data-testid="quote-status">{quote.status}</div>
            <div data-testid="updating">{isUpdating ? 'Updating...' : 'Ready'}</div>
          </div>
        );
      };

      renderWithProviders(<OptimisticUpdateTest />, queryClient);

      // Initial state
      expect(screen.getByTestId('quote-status')).toHaveTextContent('pending');
      expect(screen.getByTestId('updating')).toHaveTextContent('Ready');

      // First update (should succeed)
      const sendButton = screen.getByText('Send Quote');
      await user.click(sendButton);

      // Should show optimistic update immediately
      expect(screen.getByTestId('quote-status')).toHaveTextContent('sent');
      expect(screen.getByTestId('updating')).toHaveTextContent('Updating...');

      await waitFor(() => {
        expect(screen.getByTestId('updating')).toHaveTextContent('Ready');
        expect(screen.getByTestId('quote-status')).toHaveTextContent('sent');
      });

      // Reset quote for second test
      act(() => {
        setQuote({ ...baseQuote, status: 'pending' });
      });

      // Second update (should fail and rollback)
      const sendButton2 = screen.getByText('Send Quote');
      await user.click(sendButton2);

      // Should show optimistic update initially
      expect(screen.getByTestId('quote-status')).toHaveTextContent('sent');

      // Should rollback after failure
      await waitFor(() => {
        expect(screen.getByTestId('quote-status')).toHaveTextContent('pending');
        expect(screen.getByTestId('updating')).toHaveTextContent('Ready');
        expect(screen.getByText(/Action failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Data Synchronization', () => {
    it('should handle real-time updates from external sources', async () => {
      const queryClient = createMockQueryClient();
      
      // Simulate real-time update mechanism (like WebSocket)
      const simulateRealtimeUpdate = (updatedQuote: UnifiedQuote) => {
        // Update cache as if data came from external source
        queryClient.setQueryData(['quotes', updatedQuote.id], updatedQuote);
        queryClient.invalidateQueries({ queryKey: ['quotes'] });
      };

      const RealtimeTestComponent = () => {
        const [quote, setQuote] = React.useState(baseQuote);

        // Simulate subscribing to real-time updates
        React.useEffect(() => {
          const interval = setInterval(() => {
            // Check cache for updates
            const cachedQuote = queryClient.getQueryData(['quotes', baseQuote.id]) as UnifiedQuote;
            if (cachedQuote && cachedQuote !== quote) {
              setQuote(cachedQuote);
            }
          }, 100);

          return () => clearInterval(interval);
        }, [quote]);

        return (
          <div>
            <UnifiedQuoteCard
              quote={quote}
              viewMode="admin"
            />
            <UnifiedQuoteBreakdown
              quote={quote}
              viewMode="admin"
              enableRealTimeUpdates={true}
            />
            <div data-testid="last-updated">{quote.updated_at || 'Never'}</div>
          </div>
        );
      };

      renderWithProviders(<RealtimeTestComponent />, queryClient);

      // Initial state
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByTestId('last-updated')).toHaveTextContent('Never');

      // Simulate external update (e.g., from admin dashboard)
      const updatedQuote = {
        ...baseQuote,
        status: 'approved',
        updated_at: '2024-01-15T11:00:00Z',
        final_total_usd: 349.99
      };

      act(() => {
        simulateRealtimeUpdate(updatedQuote);
      });

      // Component should reflect the real-time update
      await waitFor(() => {
        expect(screen.getByText('approved')).toBeInTheDocument();
        expect(screen.getByText('$349.99')).toBeInTheDocument();
        expect(screen.getByTestId('last-updated')).toHaveTextContent('2024-01-15T11:00:00Z');
      });
    });
  });

  describe('Error Boundary Integration', () => {
    it('should handle component errors without breaking entire data flow', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create a quote that will cause an error in one component
      const corruptedQuote = {
        ...baseQuote,
        final_total_usd: null, // This will cause breakdown component to error
        items: null // This will cause card component issues
      } as any;

      const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        const [hasError, setHasError] = React.useState(false);

        React.useEffect(() => {
          const handleError = () => setHasError(true);
          window.addEventListener('error', handleError);
          return () => window.removeEventListener('error', handleError);
        }, []);

        if (hasError) {
          return <div data-testid="error-boundary">Something went wrong</div>;
        }

        return <>{children}</>;
      };

      const ErrorTestComponent = () => {
        return (
          <div>
            <ErrorBoundary>
              <UnifiedQuoteCard quote={corruptedQuote} viewMode="admin" />
            </ErrorBoundary>
            <ErrorBoundary>
              <UnifiedQuoteBreakdown quote={corruptedQuote} viewMode="admin" />
            </ErrorBoundary>
            <ErrorBoundary>
              <UnifiedQuoteActions quote={baseQuote} viewMode="admin" />
            </ErrorBoundary>
            <div data-testid="working-component">This should still work</div>
          </div>
        );
      };

      renderWithProviders(<ErrorTestComponent />);

      // Some components should error, but others should continue working
      await waitFor(() => {
        expect(screen.getByTestId('working-component')).toBeInTheDocument();
        // At least one component should show error state
        expect(screen.getByText('Invalid quote data')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should properly cleanup resources and prevent memory leaks', async () => {
      const queryClient = createMockQueryClient();
      
      // Track query cache size
      const getQueryCacheSize = () => queryClient.getQueryCache().getAll().length;
      
      const initialCacheSize = getQueryCacheSize();

      const MemoryTestComponent = ({ quotes }: { quotes: UnifiedQuote[] }) => {
        React.useEffect(() => {
          // Simulate heavy data operations
          quotes.forEach(quote => {
            queryClient.setQueryData(['quotes', quote.id], quote);
          });

          return () => {
            // Cleanup - remove specific queries on unmount
            quotes.forEach(quote => {
              queryClient.removeQueries({ queryKey: ['quotes', quote.id] });
            });
          };
        }, [quotes]);

        return (
          <UnifiedQuoteList
            quotes={quotes}
            viewMode="admin"
            enableVirtualScrolling={true}
            enableSmartCaching={true}
          />
        );
      };

      // Create large dataset
      const largeQuoteSet = Array.from({ length: 100 }, (_, i) => ({
        ...baseQuote,
        id: `memory-test-${i}`,
        display_id: `QT-MEM${i.toString().padStart(3, '0')}`
      }));

      const { unmount } = renderWithProviders(
        <MemoryTestComponent quotes={largeQuoteSet} />,
        queryClient
      );

      // Cache should contain our test data
      expect(getQueryCacheSize()).toBeGreaterThan(initialCacheSize);

      // Unmount component
      unmount();

      // Cache should be cleaned up
      await waitFor(() => {
        expect(getQueryCacheSize()).toBe(initialCacheSize);
      });
    });
  });
});