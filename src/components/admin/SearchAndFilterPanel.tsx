import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import * as Sentry from '@sentry/react';
import { validateSearchText, logSuspiciousSearchAttempt } from '@/lib/searchInputValidation';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp,
  MapPin,
  X
} from 'lucide-react';

// Types for search and filter state
export interface SearchFilters {
  searchText: string;
  countries: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface SearchAndFilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  availableCountries?: CountryOption[];
  isLoading?: boolean;
  resultsCount?: number;
  className?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export interface StatusOption {
  value: string;
  label: string;
  color?: string;
  count?: number;
}

export interface CountryOption {
  code: string;
  name: string;
  flag?: string;
  count?: number;
}

// Default options for Storybook and fallbacks
export const DEFAULT_STATUS_OPTIONS: StatusOption[] = [
  { value: 'pending', label: 'Pending', color: 'orange', count: 12 },
  { value: 'sent', label: 'Sent', color: 'blue', count: 8 },
  { value: 'approved', label: 'Approved', color: 'green', count: 15 },
  { value: 'rejected', label: 'Rejected', color: 'red', count: 3 },
  { value: 'paid', label: 'Paid', color: 'purple', count: 7 },
  { value: 'shipped', label: 'Shipped', color: 'indigo', count: 4 },
  { value: 'completed', label: 'Completed', color: 'emerald', count: 9 },
  { value: 'expired', label: 'Expired', color: 'gray', count: 2 }
];

export const DEFAULT_COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳', count: 25 },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', count: 18 },
  { code: 'US', name: 'United States', flag: '🇺🇸', count: 12 },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', count: 8 },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', count: 6 },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', count: 4 }
];

export function SearchAndFilterPanel({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
  availableCountries = DEFAULT_COUNTRY_OPTIONS,
  isLoading = false,
  resultsCount,
  className = '',
  collapsed = false,
  onCollapsedChange
}: SearchAndFilterPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  const handleCollapsedChange = (isOpen: boolean) => {
    const newCollapsed = !isOpen;
    setIsCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
  };

  const handleSearchTextChange = (value: string) => {
    // SECURITY: Validate and sanitize search input
    const validationResult = validateSearchText(value);
    
    if (!validationResult.isValid) {
      // Log suspicious attempts for security monitoring
      logSuspiciousSearchAttempt(value);
      
      // Capture security event in Sentry
      Sentry.addBreadcrumb({
        message: 'Invalid search input detected',
        level: 'warning',
        data: {
          originalInput: value.substring(0, 50), // Truncate for privacy
          errors: validationResult.errors,
        }
      });
      
      // Use sanitized value instead of original
      value = validationResult.sanitizedValue;
    }
    
    onFiltersChange({
      ...filters,
      searchText: validationResult.sanitizedValue
    });
  };


  const handleCountryToggle = (country: string) => {
    const newCountries = filters.countries.includes(country)
      ? filters.countries.filter(c => c !== country)
      : [...filters.countries, country];
    
    onFiltersChange({
      ...filters,
      countries: newCountries
    });
  };

  const removeCountryFilter = (country: string) => {
    handleCountryToggle(country);
  };

  const hasActiveFilters = filters.searchText || filters.countries.length > 0;
  const activeFilterCount = filters.countries.length + (filters.searchText ? 1 : 0);

  const getCountryName = (code: string) => {
    const country = availableCountries.find(c => c.code === code);
    return country ? `${country.flag} ${country.name}` : code;
  };

  // Enhanced search handler with Sentry monitoring
  const handleSearchWithMonitoring = () => {
    const transaction = Sentry.startTransaction({
      name: 'Advanced Search Operation',
      op: 'search.filter.execute',
    });

    Sentry.withScope((scope) => {
      scope.setTag('component', 'SearchAndFilterPanel');
      scope.setContext('search_params', {
        searchText: filters.searchText,
        countryCount: filters.countries.length,
        hasActiveFilters: hasActiveFilters,
      });
      scope.setLevel('info');

      try {
        onSearch();
        transaction.setStatus('ok');
      } catch (error) {
        scope.setLevel('error');
        Sentry.captureException(error);
        transaction.setStatus('internal_error');
      } finally {
        transaction.finish();
      }
    });
  };

  return (
    <Card className={`w-full ${className}`}>
      <Collapsible open={!isCollapsed} onOpenChange={handleCollapsedChange}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600" />
                Search & Filter
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {resultsCount !== undefined && (
                  <span className="text-sm text-gray-600">
                    {resultsCount} results
                  </span>
                )}
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Search Text Input */}
            <div className="space-y-2">
              <Label htmlFor="search-text">Search Quotes</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search-text"
                  placeholder="Search by quote ID, customer name, items..."
                  value={filters.searchText}
                  onChange={(e) => handleSearchTextChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-wrap gap-3">
              {/* Country Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Country
                    {filters.countries.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {filters.countries.length}
                      </Badge>
                    )}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64">
                  <DropdownMenuLabel>Filter by Destination Country</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableCountries.map((country) => (
                    <DropdownMenuCheckboxItem
                      key={country.code}
                      checked={filters.countries.includes(country.code)}
                      onCheckedChange={() => handleCountryToggle(country.code)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{country.flag} {country.name}</span>
                        {country.count !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {country.count}
                          </Badge>
                        )}
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Active Filters:</Label>
                <div className="flex flex-wrap gap-2">
                  {filters.searchText && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Search className="h-3 w-3" />
                      "{filters.searchText}"
                      <button
                        onClick={() => handleSearchTextChange('')}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {filters.countries.map((country) => (
                    <Badge key={country} variant="outline" className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {getCountryName(country)}
                      <button
                        onClick={() => removeCountryFilter(country)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleSearchWithMonitoring}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={onReset}
                disabled={!hasActiveFilters || isLoading}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}