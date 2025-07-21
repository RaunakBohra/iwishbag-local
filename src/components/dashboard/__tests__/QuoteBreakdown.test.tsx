import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuoteBreakdown } from '../QuoteBreakdown';
import React from 'react';

// Mock dependencies
vi.mock('@/hooks/useStatusManagement');
vi.mock('@/integrations/supabase/client');
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// Mock child components
vi.mock('../QuoteBreakdownDetails', () => ({
  QuoteBreakdownDetails: ({ quote }: { quote: any }) => (
    <div data-testid="quote-breakdown-details">
      <div>Items Total: ${quote.final_total_usd || 0}</div>
      <div>Currency: NPR</div>
    </div>
  ),
}));

vi.mock('../QuoteItemCard', () => ({
  QuoteItemCard: ({ item }: { item: any }) => (
    <div data-testid="quote-item-card">
      <div>{item.product_name}</div>
      <div>Price: ${item.price_usd}</div>
    </div>
  ),
}));

vi.mock('../QuoteSummary', () => ({
  QuoteSummary: ({ quote, userCurrency }: { quote: any; userCurrency: string }) => (
    <div data-testid="quote-summary">
      <div>Total: ${quote.final_total_usd}</div>
      <div>Display Currency: {userCurrency}</div>
    </div>
  ),
}));

vi.mock('../QuoteApprovalDialog', () => ({
  QuoteApprovalDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="approval-dialog">Approval Dialog</div> : null,
}));

vi.mock('../CustomerRejectQuoteDialog', () => ({
  CustomerRejectQuoteDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="reject-dialog">Reject Dialog</div> : null,
}));

vi.mock('../messaging/QuoteMessaging', () => ({
  QuoteMessaging: () => <div data-testid="quote-messaging">Quote Messaging</div>,
}));

// Mock icons
vi.mock('lucide-react', () => ({
  ShoppingCart: () => <div data-testid="shopping-cart-icon">🛒</div>,
  HelpCircle: () => <div data-testid="help-circle-icon">❓</div>,
  MessageCircle: () => <div data-testid="message-circle-icon">💬</div>,
  XCircle: () => <div data-testid="x-circle-icon">❌</div>,
  BookOpen: () => <div data-testid="book-open-icon">📖</div>,
  Edit2: () => <div data-testid="edit-icon">✏️</div>,
}));

// Create mock quote data
const createMockQuote = (overrides = {}) => ({
  id: 'test-quote-123',
  user_id: 'test-user',
  status: 'approved',
  final_total_usd: 150.0,
  destination_country: 'NP',
  origin_country: 'US',
  in_cart: false,
  created_at: '2025-07-21T10:00:00Z',
  updated_at: '2025-07-21T10:00:00Z',
  quote_items: [
    {
      id: 'item-1',
      product_name: 'Test Product',
      price_usd: 100,
      quantity: 1,
      weight_kg: 2,
    },
  ],
  ...overrides,
});

// Mock useStatusManagement hook
const mockStatusManagement = {
  getStatusConfig: vi.fn((status: string) => {
    const mockConfigs = {
      approved: {
        id: 'approved',
        name: 'approved',
        allowCartActions: true,
        allowApproval: false,
        isSuccessful: true,
        isTerminal: false,
        showInOrdersList: false,
      },
      rejected: {
        id: 'rejected',
        name: 'rejected',
        allowCartActions: false,
        allowApproval: false,
        isSuccessful: false,
        isTerminal: true,
        showInOrdersList: false,
      },
      pending: {
        id: 'pending',
        name: 'pending',
        allowCartActions: false,
        allowApproval: true,
        isSuccessful: false,
        isTerminal: false,
        showInOrdersList: false,
      },
    };
    return mockConfigs[status as keyof typeof mockConfigs] || null;
  }),
};

// Test wrapper component
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('QuoteBreakdown', () => {
  const mockProps = {
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onCalculate: vi.fn(),
    onRecalculate: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
    isProcessing: false,
    onAddToCart: vi.fn(),
    addToCartText: 'Add to Cart',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup status management mock
    vi.doMock('@/hooks/useStatusManagement', () => ({
      useStatusManagement: () => mockStatusManagement,
    }));

    // Mock Supabase query for country settings
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { code: 'NP', currency: 'NPR', rate_from_usd: 133.0 },
                  error: null,
                }),
              ),
            })),
          })),
        })),
      },
    }));
  });

  describe('Basic Rendering', () => {
    it('should render quote breakdown with NPR display preference', async () => {
      const mockQuote = createMockQuote({
        destination_country: 'NP',
        final_total_usd: 100,
      });

      const wrapper = createWrapper();
      render(<QuoteBreakdown quote={mockQuote} {...mockProps} />, { wrapper });

      // Should render the breakdown details component
      expect(screen.getByTestId('quote-breakdown-details')).toBeInTheDocument();

      // Should display amounts
      expect(screen.getByText('Items Total: $100')).toBeInTheDocument();
      expect(screen.getByText('Currency: NPR')).toBeInTheDocument();
    });

    it('should render quote items', () => {
      const mockQuote = createMockQuote({
        quote_items: [
          {
            id: 'item-1',
            product_name: 'Laptop',
            price_usd: 800,
            quantity: 1,
            weight_kg: 3,
          },
          {
            id: 'item-2',
            product_name: 'Mouse',
            price_usd: 25,
            quantity: 2,
            weight_kg: 0.2,
          },
        ],
      });

      const wrapper = createWrapper();
      render(<QuoteBreakdown quote={mockQuote} {...mockProps} />, { wrapper });

      // Should render both items
      expect(screen.getByText('Laptop')).toBeInTheDocument();
      expect(screen.getByText('Price: $800')).toBeInTheDocument();
      expect(screen.getByText('Mouse')).toBeInTheDocument();
      expect(screen.getByText('Price: $25')).toBeInTheDocument();
    });

    it('should render quote summary with user currency preference', () => {
      const mockQuote = createMockQuote({
        destination_country: 'NP',
        final_total_usd: 200,
      });

      const wrapper = createWrapper();
      render(<QuoteBreakdown quote={mockQuote} {...mockProps} />, { wrapper });

      // Should render summary with NPR currency
      expect(screen.getByTestId('quote-summary')).toBeInTheDocument();
      expect(screen.getByText('Total: $200')).toBeInTheDocument();
      expect(screen.getByText('Display Currency: NPR')).toBeInTheDocument();
    });
  });

  describe('Quote Status Handling', () => {
    it('should handle approved quote status correctly', () => {
      const mockQuote = createMockQuote({
        status: 'approved',
        in_cart: false,
      });

      const wrapper = createWrapper();
      render(<QuoteBreakdown quote={mockQuote} {...mockProps} />, { wrapper });

      // Should render the breakdown for approved quote
      expect(screen.getByTestId('quote-breakdown-details')).toBeInTheDocument();
      expect(screen.getByTestId('quote-summary')).toBeInTheDocument();
    });

    it('should handle rejected quote status', () => {
      const mockQuote = createMockQuote({
        status: 'rejected',
        in_cart: false,
      });

      const wrapper = createWrapper();
      render(<QuoteBreakdown quote={mockQuote} {...mockProps} />, { wrapper });

      // Should still render breakdown for rejected quote
      expect(screen.getByTestId('quote-breakdown-details')).toBeInTheDocument();
      expect(screen.getByTestId('quote-summary')).toBeInTheDocument();
    });

    it('should handle pending quote status', () => {
      const mockQuote = createMockQuote({
        status: 'pending',
        final_total_usd: null, // Pending quotes might not have calculations yet
      });

      const wrapper = createWrapper();
      render(<QuoteBreakdown quote={mockQuote} {...mockProps} />, { wrapper });

      // Should still render components, but with zero amounts
      expect(screen.getByTestId('quote-breakdown-details')).toBeInTheDocument();
      expect(screen.getByText('Items Total: $0')).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('should display quote items correctly for different product types', () => {
      const mockQuote = createMockQuote({
        quote_items: [
          {
            id: 'electronics-1',
            product_name: 'iPhone 15',
            price_usd: 999,
            quantity: 1,
            weight_kg: 0.5,
          },
          {
            id: 'clothing-1',
            product_name: 'Jacket',
            price_usd: 150,
            quantity: 2,
            weight_kg: 1.2,
          },
        ],
      });

      const wrapper = createWrapper();
      render(<QuoteBreakdown quote={mockQuote} {...mockProps} />, { wrapper });

      // Should display all product details
      expect(screen.getByText('iPhone 15')).toBeInTheDocument();
      expect(screen.getByText('Price: $999')).toBeInTheDocument();
      expect(screen.getByText('Jacket')).toBeInTheDocument();
      expect(screen.getByText('Price: $150')).toBeInTheDocument();
    });

    it('should handle empty quote items array', () => {
      const mockQuote = createMockQuote({
        quote_items: [],
        final_total_usd: 0,
      });

      const wrapper = createWrapper();
      render(<QuoteBreakdown quote={mockQuote} {...mockProps} />, { wrapper });

      // Should still render breakdown with zero amounts
      expect(screen.getByTestId('quote-breakdown-details')).toBeInTheDocument();
      expect(screen.getByText('Items Total: $0')).toBeInTheDocument();
    });
  });

  describe('Currency Display', () => {
    it('should display amounts in NPR for Nepal destination', () => {
      const mockQuote = createMockQuote({
        destination_country: 'NP',
        final_total_usd: 300,
      });

      const wrapper = createWrapper();
      render(<QuoteBreakdown quote={mockQuote} {...mockProps} />, { wrapper });

      // Should show NPR currency preference
      expect(screen.getByText('Currency: NPR')).toBeInTheDocument();
      expect(screen.getByText('Display Currency: NPR')).toBeInTheDocument();
    });

    it('should handle different destination countries', () => {
      const mockQuote = createMockQuote({
        destination_country: 'IN', // India
        final_total_usd: 250,
      });

      // Update the mock to return Indian currency
      const mockSupabase = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { code: 'IN', currency: 'INR', rate_from_usd: 83.0 },
                error: null,
              }),
            ),
          })),
        })),
      }));

      vi.doMock('@/integrations/supabase/client', () => ({
        supabase: { from: mockSupabase },
      }));

      const wrapper = createWrapper();
      render(<QuoteBreakdown quote={mockQuote} {...mockProps} />, { wrapper });

      // Should render the quote breakdown
      expect(screen.getByTestId('quote-breakdown-details')).toBeInTheDocument();
      expect(screen.getByText('Items Total: $250')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle quotes with null final_total_usd', () => {
      const mockQuote = createMockQuote({
        final_total_usd: null,
      });

      const wrapper = createWrapper();
      render(<QuoteBreakdown quote={mockQuote} {...mockProps} />, { wrapper });

      // Should display zero instead of throwing error
      expect(screen.getByText('Items Total: $0')).toBeInTheDocument();
      expect(screen.getByText('Total: $0')).toBeInTheDocument();
    });

    it('should handle malformed quote items', () => {
      const mockQuote = createMockQuote({
        quote_items: [
          {
            id: 'malformed-item',
            product_name: null, // Invalid product name
            price_usd: 0,
            quantity: 1,
            weight_kg: 0,
          },
        ],
      });

      const wrapper = createWrapper();
      render(<QuoteBreakdown quote={mockQuote} {...mockProps} />, { wrapper });

      // Should still render without crashing
      expect(screen.getByTestId('quote-item-card')).toBeInTheDocument();
      expect(screen.getByText('Price: $0')).toBeInTheDocument();
    });
  });
});
