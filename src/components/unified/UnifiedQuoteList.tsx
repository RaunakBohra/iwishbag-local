import React, { useMemo, useCallback, memo, useState, useRef, useEffect } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Filter,
  Sort,
  Grid,
  List as ListIcon,
  RefreshCw,
  Download,
  Settings,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Loader2,
  Eye,
  MoreHorizontal,
  CheckSquare,
  Square,
  Calendar,
  DollarSign,
  Package,
  User,
  MapPin,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuoteTheme, useConversionColors } from '@/contexts/QuoteThemeContext';
import { useColorVariantTesting } from '@/hooks/useColorVariantTesting';
import { UnifiedQuoteCard } from './UnifiedQuoteCard';
import type { UnifiedQuote } from '@/types/unified-quote';

// Virtual scrolling configuration
const ITEM_HEIGHT = 120; // Height per quote item in pixels
const BUFFER_SIZE = 5; // Extra items to render outside viewport
const CACHE_SIZE = 1000; // Maximum items to keep in memory
const SEARCH_DEBOUNCE = 500; // Debounce search input

// Smart caching system
interface CacheEntry {
  data: UnifiedQuote[];
  timestamp: number;
  searchTerm: string;
  filters: FilterState;
  sortBy: SortOption;
}

class QuoteListCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 50; // Maximum cache entries
  private ttl: number = 5 * 60 * 1000; // 5 minutes TTL

  private getCacheKey(searchTerm: string, filters: FilterState, sortBy: SortOption): string {
    return JSON.stringify({ searchTerm, filters, sortBy });
  }

  get(searchTerm: string, filters: FilterState, sortBy: SortOption): UnifiedQuote[] | null {
    const key = this.getCacheKey(searchTerm, filters, sortBy);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(searchTerm: string, filters: FilterState, sortBy: SortOption, data: UnifiedQuote[]): void {
    const key = this.getCacheKey(searchTerm, filters, sortBy);

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data: [...data], // Clone to prevent mutations
      timestamp: Date.now(),
      searchTerm,
      filters,
      sortBy,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(pattern?: Partial<{ searchTerm: string; status: string; country: string }>): void {
    if (!pattern) {
      this.clear();
      return;
    }

    // Remove entries matching pattern
    for (const [key, entry] of this.cache.entries()) {
      const shouldInvalidate =
        (pattern.searchTerm && entry.searchTerm.includes(pattern.searchTerm)) ||
        (pattern.status && entry.filters.statuses.includes(pattern.status)) ||
        (pattern.country && entry.filters.countries.includes(pattern.country));

      if (shouldInvalidate) {
        this.cache.delete(key);
      }
    }
  }
}

const quoteListCache = new QuoteListCache();

// Search and filter state
interface FilterState {
  statuses: string[];
  countries: string[];
  dateRange: {
    start?: Date;
    end?: Date;
  };
  priceRange: {
    min?: number;
    max?: number;
  };
  hasFiles?: boolean;
  isGuest?: boolean;
}

interface SortOption {
  field: 'created_at' | 'final_total_usd' | 'status' | 'customer_name' | 'expires_at';
  direction: 'asc' | 'desc';
}

// Performance monitoring
interface ListPerformanceMetrics {
  renderTime: number;
  searchTime: number;
  filterTime: number;
  sortTime: number;
  cacheHitRate: number;
  visibleItems: number;
  totalItems: number;
  userType: 'admin' | 'customer' | 'guest';
  viewMode: 'grid' | 'list' | 'compact';
}

const logListPerformance = (metrics: ListPerformanceMetrics) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('📋 UnifiedQuoteList Performance:', metrics);
  }

  // Send to analytics service in production
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'list_performance', {
      component: 'UnifiedQuoteList',
      render_time: metrics.renderTime,
      search_time: metrics.searchTime,
      filter_time: metrics.filterTime,
      sort_time: metrics.sortTime,
      cache_hit_rate: metrics.cacheHitRate,
      visible_items: metrics.visibleItems,
      total_items: metrics.totalItems,
      user_type: metrics.userType,
      view_mode: metrics.viewMode,
    });
  }
};

// Search optimization with fuzzy matching
const createSearchIndex = (quotes: UnifiedQuote[]) => {
  return quotes.map((quote, index) => ({
    index,
    searchText: [
      quote.display_id,
      quote.id,
      quote.customer_data?.info?.name,
      quote.customer_data?.info?.email,
      quote.email,
      quote.items?.map((item) => item.name).join(' '),
      quote.destination_country,
      quote.status,
      quote.website,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  }));
};

const fuzzySearch = (
  searchIndex: ReturnType<typeof createSearchIndex>,
  searchTerm: string,
): number[] => {
  if (!searchTerm.trim()) return searchIndex.map((item) => item.index);

  const terms = searchTerm.toLowerCase().split(' ').filter(Boolean);

  return searchIndex
    .map((item) => ({
      ...item,
      score: terms.reduce((score, term) => {
        if (item.searchText.includes(term)) {
          // Exact match gets higher score
          const exactMatches = (item.searchText.match(new RegExp(term, 'g')) || []).length;
          return score + exactMatches * 2;
        }

        // Fuzzy match for typos (simple Levenshtein distance)
        const words = item.searchText.split(' ');
        const fuzzyMatches = words.filter((word) => {
          if (word.length < 3 || term.length < 3) return false;
          const maxDistance = Math.floor(Math.min(word.length, term.length) / 3);
          return levenshteinDistance(word, term) <= maxDistance;
        }).length;

        return score + fuzzyMatches;
      }, 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.index);
};

// Simple Levenshtein distance implementation
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator,
      );
    }
  }

  return matrix[str2.length][str1.length];
};

// List item component for virtual scrolling
interface QuoteListItemProps extends ListChildComponentProps {
  data: {
    quotes: UnifiedQuote[];
    viewMode: 'admin' | 'customer' | 'guest';
    layout: 'grid' | 'list' | 'compact';
    selectedItems: Set<string>;
    onItemSelect: (id: string, selected: boolean) => void;
    onItemAction: (action: string, quote: UnifiedQuote) => void;
  };
}

const QuoteListItem = memo(({ index, style, data }: QuoteListItemProps) => {
  const { quotes, viewMode, layout, selectedItems, onItemSelect, onItemAction } = data;
  const quote = quotes[index];

  if (!quote) {
    return (
      <div style={style} className="flex items-center justify-center p-4">
        <div className="animate-pulse bg-gray-200 rounded-lg w-full h-20"></div>
      </div>
    );
  }

  return (
    <div style={style} className="px-4 py-2">
      <UnifiedQuoteCard
        quote={quote}
        viewMode={viewMode}
        layout={layout}
        isSelected={selectedItems.has(quote.id)}
        onSelect={onItemSelect}
        onAction={onItemAction}
      />
    </div>
  );
});

QuoteListItem.displayName = 'QuoteListItem';

interface UnifiedQuoteListProps {
  // Data
  quotes: UnifiedQuote[];
  loading?: boolean;
  error?: string;

  // User context
  viewMode: 'admin' | 'customer' | 'guest';

  // Display options
  layout: 'grid' | 'list' | 'compact';
  enableSearch?: boolean;
  enableFilters?: boolean;
  enableSorting?: boolean;
  enableSelection?: boolean;
  enableVirtualScrolling?: boolean;

  // Pagination
  pageSize?: number;
  totalCount?: number;
  hasNextPage?: boolean;
  onLoadMore?: () => void;

  // Event handlers
  onItemAction?: (action: string, quote: UnifiedQuote, optimistic?: boolean) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  onSearch?: (searchTerm: string) => void;
  onFilter?: (filters: FilterState) => void;
  onSort?: (sortBy: SortOption) => void;
  onRefresh?: () => void;

  // Performance & Behavior
  enableSmartCaching?: boolean;
  searchPlaceholder?: string;
  emptyStateMessage?: string;
  performanceMode?: 'fast' | 'detailed';

  // Styling
  className?: string;
  height?: number;

  // Cultural theming
  culturalTheme?: 'india' | 'nepal' | 'international';
}

/**
 * UnifiedQuoteList - High-performance quote list with virtual scrolling
 * Context-aware with smart caching, search optimization, and analytics
 */
export const UnifiedQuoteList = memo<UnifiedQuoteListProps>(
  ({
    quotes,
    loading = false,
    error,
    viewMode,
    layout = 'list',
    enableSearch = true,
    enableFilters = true,
    enableSorting = true,
    enableSelection = false,
    enableVirtualScrolling = true,
    pageSize = 50,
    totalCount,
    hasNextPage = false,
    onLoadMore,
    onItemAction,
    onSelectionChange,
    onSearch,
    onFilter,
    onSort,
    onRefresh,
    enableSmartCaching = true,
    searchPlaceholder = 'Search quotes...',
    emptyStateMessage = 'No quotes found',
    performanceMode = 'detailed',
    className,
    height = 600,
    culturalTheme = 'international',
  }) => {
    const startTime = performance.now();

    // Theme and color context
    const { colors, userType } = useQuoteTheme();
    const conversionColors = useConversionColors();
    const { variant, trackConversion } = useColorVariantTesting();

    // Component state
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [filters, setFilters] = useState<FilterState>({
      statuses: [],
      countries: [],
      dateRange: {},
      priceRange: {},
    });
    const [sortBy, setSortBy] = useState<SortOption>({
      field: 'created_at',
      direction: 'desc',
    });
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = useState(false);
    const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0 });

    // Refs
    const listRef = useRef<List>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout>();

    // Debounce search input
    useEffect(() => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
      }, SEARCH_DEBOUNCE);

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    }, [searchTerm]);

    // Process and filter quotes
    const processedQuotes = useMemo(() => {
      const processingStartTime = performance.now();

      // Check cache first
      if (enableSmartCaching) {
        const cached = quoteListCache.get(debouncedSearchTerm, filters, sortBy);
        if (cached) {
          setCacheStats((prev) => ({ ...prev, hits: prev.hits + 1 }));
          return cached;
        }
        setCacheStats((prev) => ({ ...prev, misses: prev.misses + 1 }));
      }

      let result = [...quotes];

      // Search filtering
      if (debouncedSearchTerm.trim()) {
        const searchStartTime = performance.now();
        const searchIndex = createSearchIndex(result);
        const matchingIndices = fuzzySearch(searchIndex, debouncedSearchTerm);
        result = matchingIndices.map((index) => result[index]);

        if (performanceMode === 'detailed') {
          console.log(
            `Search took ${performance.now() - searchStartTime}ms for "${debouncedSearchTerm}"`,
          );
        }
      }

      // Apply filters
      if (filters.statuses.length > 0) {
        result = result.filter((quote) => filters.statuses.includes(quote.status));
      }

      if (filters.countries.length > 0) {
        result = result.filter(
          (quote) =>
            quote.destination_country && filters.countries.includes(quote.destination_country),
        );
      }

      if (filters.dateRange.start || filters.dateRange.end) {
        result = result.filter((quote) => {
          const quoteDate = new Date(quote.created_at);
          return (
            (!filters.dateRange.start || quoteDate >= filters.dateRange.start) &&
            (!filters.dateRange.end || quoteDate <= filters.dateRange.end)
          );
        });
      }

      if (filters.priceRange.min !== undefined || filters.priceRange.max !== undefined) {
        result = result.filter((quote) => {
          const price = quote.final_total_usd || 0;
          return (
            (filters.priceRange.min === undefined || price >= filters.priceRange.min) &&
            (filters.priceRange.max === undefined || price <= filters.priceRange.max)
          );
        });
      }

      if (filters.hasFiles !== undefined) {
        result = result.filter((quote) => {
          const hasFiles = quote.attachments && quote.attachments.length > 0;
          return filters.hasFiles ? hasFiles : !hasFiles;
        });
      }

      if (filters.isGuest !== undefined) {
        result = result.filter((quote) => {
          const isGuest = !quote.user_id;
          return filters.isGuest ? isGuest : !isGuest;
        });
      }

      // Sorting
      result.sort((a, b) => {
        let comparison = 0;

        switch (sortBy.field) {
          case 'created_at':
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
          case 'final_total_usd':
            comparison = (a.final_total_usd || 0) - (b.final_total_usd || 0);
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
          case 'customer_name':
            const nameA = a.customer_data?.info?.name || a.customer_name || '';
            const nameB = b.customer_data?.info?.name || b.customer_name || '';
            comparison = nameA.localeCompare(nameB);
            break;
          case 'expires_at':
            const dateA = a.expires_at ? new Date(a.expires_at).getTime() : 0;
            const dateB = b.expires_at ? new Date(b.expires_at).getTime() : 0;
            comparison = dateA - dateB;
            break;
        }

        return sortBy.direction === 'desc' ? -comparison : comparison;
      });

      // Cache the result
      if (enableSmartCaching) {
        quoteListCache.set(debouncedSearchTerm, filters, sortBy, result);
      }

      const processingTime = performance.now() - processingStartTime;
      if (performanceMode === 'detailed') {
        console.log(`Quote processing took ${processingTime}ms for ${result.length} items`);
      }

      return result;
    }, [quotes, debouncedSearchTerm, filters, sortBy, enableSmartCaching, performanceMode]);

    // Event handlers
    const handleSearch = useCallback(
      (value: string) => {
        setSearchTerm(value);
        onSearch?.(value);
        trackConversion('quote_search', 1);
      },
      [onSearch, trackConversion],
    );

    const handleItemSelect = useCallback(
      (id: string, selected: boolean) => {
        setSelectedItems((prev) => {
          const newSelection = new Set(prev);
          if (selected) {
            newSelection.add(id);
          } else {
            newSelection.delete(id);
          }

          onSelectionChange?.(Array.from(newSelection));
          return newSelection;
        });
      },
      [onSelectionChange],
    );

    const handleSelectAll = useCallback(() => {
      const allIds = processedQuotes.map((quote) => quote.id);
      const newSelection =
        selectedItems.size === allIds.length ? new Set<string>() : new Set(allIds);
      setSelectedItems(newSelection);
      onSelectionChange?.(Array.from(newSelection));
    }, [processedQuotes, selectedItems.size, onSelectionChange]);

    const handleItemAction = useCallback(
      (action: string, quote: UnifiedQuote, optimistic?: boolean) => {
        onItemAction?.(action, quote, optimistic);

        // Invalidate cache for certain actions
        if (enableSmartCaching && ['approve', 'reject', 'send', 'delete'].includes(action)) {
          quoteListCache.invalidate({ status: quote.status });
        }
      },
      [onItemAction, enableSmartCaching],
    );

    const handleSort = useCallback(
      (field: SortOption['field']) => {
        const newSortBy: SortOption = {
          field,
          direction: sortBy.field === field && sortBy.direction === 'asc' ? 'desc' : 'asc',
        };
        setSortBy(newSortBy);
        onSort?.(newSortBy);
      },
      [sortBy, onSort],
    );

    const handleRefresh = useCallback(() => {
      if (enableSmartCaching) {
        quoteListCache.clear();
      }
      onRefresh?.();
      trackConversion('quote_list_refresh', 1);
    }, [enableSmartCaching, onRefresh, trackConversion]);

    // Performance monitoring
    useEffect(() => {
      if (performanceMode === 'detailed') {
        const renderTime = performance.now() - startTime;
        const cacheHitRate =
          cacheStats.hits + cacheStats.misses > 0
            ? cacheStats.hits / (cacheStats.hits + cacheStats.misses)
            : 0;

        logListPerformance({
          renderTime,
          searchTime: 0, // Could be tracked separately
          filterTime: 0, // Could be tracked separately
          sortTime: 0, // Could be tracked separately
          cacheHitRate,
          visibleItems: Math.min(Math.ceil(height / ITEM_HEIGHT), processedQuotes.length),
          totalItems: processedQuotes.length,
          userType,
          viewMode: layout,
        });
      }
    }, [startTime, performanceMode, cacheStats, height, processedQuotes.length, userType, layout]);

    // Error state
    if (error) {
      return (
        <Card className={cn('quote-list quote-list--error', className)}>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Quotes</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    // Loading state
    if (loading && processedQuotes.length === 0) {
      return (
        <Card className={cn('quote-list quote-list--loading', className)}>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading quotes...</p>
          </CardContent>
        </Card>
      );
    }

    // Virtual list data for react-window
    const listData = {
      quotes: processedQuotes,
      viewMode,
      layout,
      selectedItems,
      onItemSelect: handleItemSelect,
      onItemAction: handleItemAction,
    };

    return (
      <Card
        className={cn(
          'quote-list transition-all duration-200',
          `quote-list--${viewMode}`,
          `quote-list--${layout}`,
          `color-variant-${variant}`,
          className,
        )}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {layout === 'grid' ? <Grid className="h-5 w-5" /> : <ListIcon className="h-5 w-5" />}
              Quotes
              <Badge variant="secondary" className="ml-2">
                {processedQuotes.length}
                {totalCount && totalCount !== processedQuotes.length && ` of ${totalCount}`}
              </Badge>
            </CardTitle>

            <div className="flex items-center gap-2">
              {enableSmartCaching && performanceMode === 'detailed' && (
                <Badge variant="outline" className="text-xs">
                  Cache:{' '}
                  {Math.round(
                    (cacheStats.hits / Math.max(cacheStats.hits + cacheStats.misses, 1)) * 100,
                  )}
                  %
                </Badge>
              )}

              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>

              <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search and controls */}
          <div className="space-y-4">
            {enableSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-10"
                />
              </div>
            )}

            {/* Selection controls */}
            {enableSelection && processedQuotes.length > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="flex items-center gap-2"
                >
                  {selectedItems.size === processedQuotes.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {selectedItems.size === 0
                    ? 'Select All'
                    : selectedItems.size === processedQuotes.length
                      ? 'Deselect All'
                      : `${selectedItems.size} Selected`}
                </Button>

                {selectedItems.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export Selected
                    </Button>
                    <Button size="sm" variant="outline">
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      Bulk Actions
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Sort controls */}
            {enableSorting && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Sort by:</span>
                {[
                  {
                    field: 'created_at' as const,
                    label: 'Date',
                    icon: <Calendar className="h-3 w-3" />,
                  },
                  {
                    field: 'final_total_usd' as const,
                    label: 'Amount',
                    icon: <DollarSign className="h-3 w-3" />,
                  },
                  {
                    field: 'status' as const,
                    label: 'Status',
                    icon: <Clock className="h-3 w-3" />,
                  },
                  {
                    field: 'customer_name' as const,
                    label: 'Customer',
                    icon: <User className="h-3 w-3" />,
                  },
                ].map(({ field, label, icon }) => (
                  <Button
                    key={field}
                    variant={sortBy.field === field ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleSort(field)}
                    className="flex items-center gap-1"
                  >
                    {icon}
                    {label}
                    {sortBy.field === field &&
                      (sortBy.direction === 'asc' ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      ))}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {processedQuotes.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quotes Found</h3>
              <p className="text-gray-600">{emptyStateMessage}</p>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => handleSearch('')}
                >
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="relative">
              {enableVirtualScrolling ? (
                <List
                  ref={listRef}
                  height={height}
                  itemCount={processedQuotes.length}
                  itemSize={ITEM_HEIGHT}
                  itemData={listData}
                  overscanCount={BUFFER_SIZE}
                  className="quote-list__virtual-container"
                >
                  {QuoteListItem}
                </List>
              ) : (
                <div className="space-y-2 p-4 max-h-96 overflow-y-auto">
                  {processedQuotes.map((quote) => (
                    <UnifiedQuoteCard
                      key={quote.id}
                      quote={quote}
                      viewMode={viewMode}
                      layout={layout}
                      isSelected={selectedItems.has(quote.id)}
                      onSelect={handleItemSelect}
                      onAction={handleItemAction}
                    />
                  ))}
                </div>
              )}

              {/* Load more */}
              {hasNextPage && (
                <div className="p-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={onLoadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-2" />
                    )}
                    Load More Quotes
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  },
);

UnifiedQuoteList.displayName = 'UnifiedQuoteList';

export default UnifiedQuoteList;
