import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchAndFilterPanel, SearchFilters } from '../SearchAndFilterPanel';

describe('SearchAndFilterPanel', () => {
  const mockFilters: SearchFilters = {
    searchText: '',
    statuses: [],
    countries: []
  };

  const defaultProps = {
    filters: mockFilters,
    onFiltersChange: vi.fn(),
    onSearch: vi.fn(),
    onReset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders search input and action buttons', () => {
      render(<SearchAndFilterPanel {...defaultProps} />);
      
      expect(screen.getByPlaceholderText(/search by quote id/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });

    it('renders status and country filter dropdowns', () => {
      render(<SearchAndFilterPanel {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /status/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /country/i })).toBeInTheDocument();
    });

    it('shows results count when provided', () => {
      render(<SearchAndFilterPanel {...defaultProps} resultsCount={42} />);
      
      expect(screen.getByText('42 results')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('updates search text and calls onFiltersChange', async () => {
      const onFiltersChange = vi.fn();
      
      render(<SearchAndFilterPanel {...defaultProps} onFiltersChange={onFiltersChange} />);
      
      const searchInput = screen.getByPlaceholderText(/search by quote id/i);
      
      // Use fireEvent to set value directly to avoid character-by-character behavior
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      
      // Check that the call has the complete text
      expect(onFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        searchText: 'test search'
      });
    });

    it('calls onSearch when search button is clicked', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      
      render(<SearchAndFilterPanel {...defaultProps} onSearch={onSearch} />);
      
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);
      
      expect(onSearch).toHaveBeenCalledTimes(1);
    });

    it('disables search button during loading', () => {
      render(<SearchAndFilterPanel {...defaultProps} isLoading={true} />);
      
      const searchButton = screen.getByRole('button', { name: /searching.../i });
      expect(searchButton).toBeDisabled();
    });
  });

  describe('Filter Management', () => {
    it('displays active search text filter as badge', () => {
      const filtersWithSearch = {
        ...mockFilters,
        searchText: 'wireless headphones'
      };
      
      render(<SearchAndFilterPanel {...defaultProps} filters={filtersWithSearch} />);
      
      expect(screen.getByText('"wireless headphones"')).toBeInTheDocument();
    });

    it('displays active status filters as badges', () => {
      const filtersWithStatus = {
        ...mockFilters,
        statuses: ['pending', 'approved']
      };
      
      render(<SearchAndFilterPanel {...defaultProps} filters={filtersWithStatus} />);
      
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('displays active country filters as badges', () => {
      const filtersWithCountries = {
        ...mockFilters,
        countries: ['IN', 'US']
      };
      
      render(<SearchAndFilterPanel {...defaultProps} filters={filtersWithCountries} />);
      
      expect(screen.getByText(/🇮🇳 India/)).toBeInTheDocument();
      expect(screen.getByText(/🇺🇸 United States/)).toBeInTheDocument();
    });

    it('shows active filter count in header', () => {
      const filtersWithMultiple = {
        searchText: 'test',
        statuses: ['pending'],
        countries: ['IN', 'US']
      };
      
      render(<SearchAndFilterPanel {...defaultProps} filters={filtersWithMultiple} />);
      
      // Should show badge with count: 1 (search) + 1 (status) + 2 (countries) = 4
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('calls onReset when reset button is clicked', async () => {
      const user = userEvent.setup();
      const onReset = vi.fn();
      const filtersWithData = {
        searchText: 'test',
        statuses: ['pending'],
        countries: ['IN']
      };
      
      render(<SearchAndFilterPanel {...defaultProps} filters={filtersWithData} onReset={onReset} />);
      
      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);
      
      expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('disables reset button when no filters are active', () => {
      render(<SearchAndFilterPanel {...defaultProps} />);
      
      const resetButton = screen.getByRole('button', { name: /reset/i });
      expect(resetButton).toBeDisabled();
    });

    it('enables reset button when filters are active', () => {
      const filtersWithData = {
        searchText: 'test',
        statuses: [],
        countries: []
      };
      
      render(<SearchAndFilterPanel {...defaultProps} filters={filtersWithData} />);
      
      const resetButton = screen.getByRole('button', { name: /reset/i });
      expect(resetButton).not.toBeDisabled();
    });
  });

  describe('Collapsible Functionality', () => {
    it('renders in collapsed state when collapsed prop is true', () => {
      render(<SearchAndFilterPanel {...defaultProps} collapsed={true} />);
      
      // Search input should not be visible when collapsed
      expect(screen.queryByPlaceholderText(/search by quote id/i)).not.toBeInTheDocument();
    });

    it('calls onCollapsedChange when toggled', async () => {
      const user = userEvent.setup();
      const onCollapsedChange = vi.fn();
      
      render(<SearchAndFilterPanel {...defaultProps} onCollapsedChange={onCollapsedChange} />);
      
      // Click on the collapsible trigger (title area) - should collapse (from false to true)
      const trigger = screen.getByText('Search & Filter');
      await user.click(trigger);
      
      // Component starts expanded (collapsed=false), clicking should collapse it (collapsed=true)
      expect(onCollapsedChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for form controls', () => {
      render(<SearchAndFilterPanel {...defaultProps} />);
      
      expect(screen.getByLabelText(/search quotes/i)).toBeInTheDocument();
    });

    it('has proper button roles and names', () => {
      render(<SearchAndFilterPanel {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /status/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /country/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty filter options gracefully', () => {
      render(
        <SearchAndFilterPanel 
          {...defaultProps} 
          availableStatuses={[]} 
          availableCountries={[]} 
        />
      );
      
      expect(screen.getByRole('button', { name: /status/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /country/i })).toBeInTheDocument();
    });

    it('handles large filter lists', () => {
      const manyStatuses = Array.from({ length: 20 }, (_, i) => ({
        value: `status${i}`,
        label: `Status ${i}`,
        count: i
      }));
      
      render(
        <SearchAndFilterPanel 
          {...defaultProps} 
          availableStatuses={manyStatuses}
        />
      );
      
      expect(screen.getByRole('button', { name: /status/i })).toBeInTheDocument();
    });
  });
});