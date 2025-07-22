import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { useState } from 'react';
import { 
  SearchAndFilterPanel, 
  SearchFilters, 
  DEFAULT_STATUS_OPTIONS,
  DEFAULT_COUNTRY_OPTIONS,
  StatusOption,
  CountryOption
} from './SearchAndFilterPanel';

const meta: Meta<typeof SearchAndFilterPanel> = {
  title: 'Components/SearchAndFilterPanel',
  component: SearchAndFilterPanel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'SearchAndFilterPanel provides comprehensive search and filtering capabilities for iwishBag quote management. Features full-text search, multi-select status and country filters, active filter management, and collapsible interface.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    filters: {
      description: 'Current filter state object',
    },
    onFiltersChange: { action: 'filtersChange' },
    onSearch: { action: 'search' },
    onReset: { action: 'reset' },
    availableStatuses: {
      description: 'Available status options with counts',
    },
    availableCountries: {
      description: 'Available country options with counts',
    },
    isLoading: {
      control: 'boolean',
      description: 'Whether search operation is in progress',
    },
    resultsCount: {
      control: { type: 'number', min: 0 },
      description: 'Number of search results found',
    },
    collapsed: {
      control: 'boolean',
      description: 'Whether panel starts collapsed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive wrapper component for Storybook
const InteractiveWrapper = (args: any) => {
  const [filters, setFilters] = useState<SearchFilters>(args.filters);
  const [collapsed, setCollapsed] = useState(args.collapsed || false);

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    action('filtersChange')(newFilters);
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = {
      searchText: '',
      statuses: [],
      countries: []
    };
    setFilters(resetFilters);
    action('reset')(resetFilters);
  };

  return (
    <div className="w-full max-w-4xl">
      <SearchAndFilterPanel
        {...args}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleReset}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
    </div>
  );
};

// Default empty state
export const Default: Story = {
  render: InteractiveWrapper,
  args: {
    filters: {
      searchText: '',
      statuses: [],
      countries: []
    },
    onFiltersChange: action('filtersChange'),
    onSearch: action('search'),
    onReset: action('reset'),
    isLoading: false,
    collapsed: false,
  },
};

// With active filters
export const WithActiveFilters: Story = {
  render: InteractiveWrapper,
  args: {
    filters: {
      searchText: 'wireless headphones',
      statuses: ['pending', 'approved'],
      countries: ['IN', 'NP']
    },
    resultsCount: 15,
    isLoading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Panel with active search text, status filters, and country filters applied',
      },
    },
  },
};

// Loading state
export const Loading: Story = {
  render: InteractiveWrapper,
  args: {
    filters: {
      searchText: 'gaming setup',
      statuses: ['sent'],
      countries: ['IN']
    },
    isLoading: true,
    resultsCount: 0,
  },
  parameters: {
    docs: {
      description: {
        story: 'Panel in loading state during search operation',
      },
    },
  },
};

// Collapsed state
export const Collapsed: Story = {
  render: InteractiveWrapper,
  args: {
    filters: {
      searchText: '',
      statuses: ['approved'],
      countries: []
    },
    collapsed: true,
    resultsCount: 42,
  },
  parameters: {
    docs: {
      description: {
        story: 'Panel in collapsed state showing active filter count',
      },
    },
  },
};

// Large dataset with many options
const LARGE_STATUS_OPTIONS: StatusOption[] = [
  { value: 'pending', label: 'Pending', color: 'orange', count: 45 },
  { value: 'sent', label: 'Sent', color: 'blue', count: 32 },
  { value: 'approved', label: 'Approved', color: 'green', count: 78 },
  { value: 'rejected', label: 'Rejected', color: 'red', count: 12 },
  { value: 'paid', label: 'Paid', color: 'purple', count: 34 },
  { value: 'ordered', label: 'Ordered', color: 'indigo', count: 28 },
  { value: 'shipped', label: 'Shipped', color: 'cyan', count: 19 },
  { value: 'completed', label: 'Completed', color: 'emerald', count: 56 },
  { value: 'expired', label: 'Expired', color: 'gray', count: 8 },
  { value: 'cancelled', label: 'Cancelled', color: 'red', count: 4 }
];

const LARGE_COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳', count: 125 },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', count: 87 },
  { code: 'US', name: 'United States', flag: '🇺🇸', count: 45 },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', count: 32 },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', count: 28 },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', count: 19 },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', count: 15 },
  { code: 'FR', name: 'France', flag: '🇫🇷', count: 12 },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', count: 23 },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', count: 8 }
];

export const LargeDataset: Story = {
  render: InteractiveWrapper,
  args: {
    filters: {
      searchText: '',
      statuses: [],
      countries: []
    },
    availableStatuses: LARGE_STATUS_OPTIONS,
    availableCountries: LARGE_COUNTRY_OPTIONS,
    resultsCount: 316,
  },
  parameters: {
    docs: {
      description: {
        story: 'Panel with large dataset showing many status and country options with counts',
      },
    },
  },
};

// High activity filters
export const HighActivity: Story = {
  render: InteractiveWrapper,
  args: {
    filters: {
      searchText: 'electronics smartphone laptop gaming',
      statuses: ['pending', 'sent', 'approved', 'paid'],
      countries: ['IN', 'NP', 'US', 'UK']
    },
    availableStatuses: LARGE_STATUS_OPTIONS,
    availableCountries: LARGE_COUNTRY_OPTIONS,
    resultsCount: 89,
  },
  parameters: {
    docs: {
      description: {
        story: 'Panel with many active filters showing complex search scenario',
      },
    },
  },
};

// No results state
export const NoResults: Story = {
  render: InteractiveWrapper,
  args: {
    filters: {
      searchText: 'nonexistent product xyz',
      statuses: ['expired'],
      countries: ['XX']
    },
    resultsCount: 0,
    isLoading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Panel showing search with no matching results',
      },
    },
  },
};

// Minimal options (small dataset)
const MINIMAL_STATUS_OPTIONS: StatusOption[] = [
  { value: 'pending', label: 'Pending', count: 3 },
  { value: 'approved', label: 'Approved', count: 2 },
  { value: 'completed', label: 'Completed', count: 1 }
];

const MINIMAL_COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳', count: 4 },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', count: 2 }
];

export const MinimalDataset: Story = {
  render: InteractiveWrapper,
  args: {
    filters: {
      searchText: '',
      statuses: [],
      countries: []
    },
    availableStatuses: MINIMAL_STATUS_OPTIONS,
    availableCountries: MINIMAL_COUNTRY_OPTIONS,
    resultsCount: 6,
  },
  parameters: {
    docs: {
      description: {
        story: 'Panel with minimal dataset - suitable for smaller applications',
      },
    },
  },
};

// Single filter type active
export const StatusFilterOnly: Story = {
  render: InteractiveWrapper,
  args: {
    filters: {
      searchText: '',
      statuses: ['approved', 'paid'],
      countries: []
    },
    resultsCount: 42,
  },
  parameters: {
    docs: {
      description: {
        story: 'Panel with only status filters active',
      },
    },
  },
};

export const CountryFilterOnly: Story = {
  render: InteractiveWrapper,
  args: {
    filters: {
      searchText: '',
      statuses: [],
      countries: ['IN', 'NP']
    },
    resultsCount: 67,
  },
  parameters: {
    docs: {
      description: {
        story: 'Panel with only country filters active',
      },
    },
  },
};

export const SearchTextOnly: Story = {
  render: InteractiveWrapper,
  args: {
    filters: {
      searchText: 'bluetooth headphones wireless',
      statuses: [],
      countries: []
    },
    resultsCount: 23,
  },
  parameters: {
    docs: {
      description: {
        story: 'Panel with only search text active',
      },
    },
  },
};

// Mobile responsive view
export const MobileView: Story = {
  render: InteractiveWrapper,
  args: {
    filters: {
      searchText: 'mobile search',
      statuses: ['pending'],
      countries: ['IN']
    },
    resultsCount: 18,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'Panel optimized for mobile display with responsive layout',
      },
    },
  },
};

// Dark theme
export const DarkTheme: Story = {
  render: InteractiveWrapper,
  args: {
    filters: {
      searchText: 'dark mode test',
      statuses: ['approved', 'shipped'],
      countries: ['US', 'UK']
    },
    resultsCount: 31,
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Panel in dark theme with active filters',
      },
    },
  },
};

// Real-world usage simulation
export const RealWorldUsage: Story = {
  render: () => {
    const [filters, setFilters] = useState<SearchFilters>({
      searchText: '',
      statuses: [],
      countries: []
    });
    const [resultsCount, setResultsCount] = useState(156);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = () => {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        // Mock results based on active filters
        let mockCount = 156;
        if (filters.searchText) mockCount = Math.floor(mockCount * 0.3);
        if (filters.statuses.length > 0) mockCount = Math.floor(mockCount * 0.6);
        if (filters.countries.length > 0) mockCount = Math.floor(mockCount * 0.8);
        
        setResultsCount(mockCount);
        setIsLoading(false);
        action('search-completed')({ filters, resultsCount: mockCount });
      }, 1500);
    };

    const handleReset = () => {
      const resetFilters: SearchFilters = {
        searchText: '',
        statuses: [],
        countries: []
      };
      setFilters(resetFilters);
      setResultsCount(156);
      action('reset-completed')(resetFilters);
    };

    return (
      <div className="w-full max-w-4xl">
        <SearchAndFilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          onSearch={handleSearch}
          onReset={handleReset}
          availableStatuses={LARGE_STATUS_OPTIONS}
          availableCountries={LARGE_COUNTRY_OPTIONS}
          isLoading={isLoading}
          resultsCount={resultsCount}
        />
        
        {/* Mock results display */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Search Results</h3>
          <div className="text-sm text-gray-600">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                Searching quotes...
              </div>
            ) : (
              <div>
                Found {resultsCount} quotes matching your criteria.
                <br />
                <em>In real application, filtered quote list would appear here.</em>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive simulation of real-world search usage with mock API integration',
      },
    },
  },
};