import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { QuoteManagementPage } from '../QuoteManagementPage';

// Mock the hooks and services
vi.mock('@/hooks/useQuoteManagement', () => ({
  useQuoteManagement: vi.fn(() => ({
    quotes: [],
    quotesLoading: false,
    isRejectDialogOpen: false,
    setRejectDialogOpen: vi.fn(),
    selectedQuoteIds: [],
    handleToggleSelectQuote: vi.fn(),
    handleToggleSelectAll: vi.fn(),
    handleBulkAction: vi.fn(),
    handleConfirmRejection: vi.fn(),
    downloadCSV: vi.fn(),
    handleQuoteCreated: vi.fn(),
    isProcessing: false,
    isUpdatingStatus: false,
    updateMultipleQuotesRejectionIsPending: false,
    activeStatusUpdate: null,
    handleDeleteQuotes: vi.fn(),
    isDeletingQuotes: false,
  }))
}));

vi.mock('@/hooks/useStatusManagement', () => ({
  useStatusManagement: vi.fn(() => ({
    getStatusConfig: vi.fn((status) => ({
      label: status.charAt(0).toUpperCase() + status.slice(1),
      color: 'blue',
      allowApproval: status === 'sent',
      allowCartActions: status === 'approved',
      showInOrdersList: ['paid', 'ordered', 'shipped', 'completed'].includes(status)
    })),
    getStatusesForQuotesList: vi.fn(() => ['pending', 'sent', 'approved', 'rejected']),
    getStatusesForOrdersList: vi.fn(() => ['paid', 'ordered', 'shipped', 'completed']),
    quoteStatuses: []
  }))
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        not: vi.fn(() => Promise.resolve({
          data: [
            { status: 'pending' },
            { status: 'sent' }, 
            { status: 'approved' },
            { destination_country: 'IN' },
            { destination_country: 'US' },
            { destination_country: 'NP' }
          ],
          error: null
        }))
      }))
    }))
  }
}));

// Mock console methods to reduce test noise
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

const createWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('QuoteManagementPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SearchAndFilterPanel component', async () => {
    render(
      <QuoteManagementPage />,
      { wrapper: createWrapper }
    );

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Search & Filter')).toBeInTheDocument();
    });

    // Check for search input
    expect(screen.getByPlaceholderText(/search by quote id/i)).toBeInTheDocument();
    
    // Check for filter buttons
    expect(screen.getByRole('button', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /country/i })).toBeInTheDocument();
    
    // Check for action buttons
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('displays search results count', async () => {
    render(
      <QuoteManagementPage />,
      { wrapper: createWrapper }
    );

    await waitFor(() => {
      // Should show "0 results" since we mocked empty quotes array
      expect(screen.getByText('0 results')).toBeInTheDocument();
    });
  });

  it('handles search text input', async () => {
    render(
      <QuoteManagementPage />,
      { wrapper: createWrapper }
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search by quote id/i);
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      
      expect(searchInput).toHaveValue('test search');
    });
  });

  it('renders empty state with proper messaging', async () => {
    render(
      <QuoteManagementPage />,
      { wrapper: createWrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('No quotes found')).toBeInTheDocument();
      expect(screen.getByText('Get started by creating your first quote.')).toBeInTheDocument();
    });
  });

  it('shows create quote button when no filters are active', async () => {
    render(
      <QuoteManagementPage />,
      { wrapper: createWrapper }
    );

    await waitFor(() => {
      const createButton = screen.getByRole('button', { name: /create quote/i });
      expect(createButton).toBeInTheDocument();
    });
  });
});