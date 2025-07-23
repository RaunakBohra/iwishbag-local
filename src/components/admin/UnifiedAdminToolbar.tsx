/**
 * Unified Admin Toolbar - Modern Industry Standard Layout
 * Combines analytics + search + filters in single horizontal line
 * Inspired by Shopify, Amazon Seller Central, and modern SaaS platforms
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Search, RotateCcw, ChevronDown, MapPin, Download } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
  profiles?: { preferred_display_currency?: string } | null;
};

export interface SearchFilters {
  searchText: string;
  countries: string[];
}

export interface CountryOption {
  code: string;
  name: string;
  flag?: string;
  count?: number;
}

interface UnifiedAdminToolbarProps {
  quotes: QuoteWithItems[];
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  onExport?: () => void;
  availableCountries?: CountryOption[];
  isLoading?: boolean;
  className?: string;
}

export const UnifiedAdminToolbar = ({
  quotes = [],
  filters,
  onFiltersChange,
  onSearch,
  onReset,
  onExport,
  availableCountries = [],
  _isLoading = false,
  className = '',
}: UnifiedAdminToolbarProps) => {
  // Calculate status counts
  const statusCounts = {
    pending: quotes.filter((q) => q.status === 'pending').length,
    sent: quotes.filter((q) => q.status === 'sent').length,
    approved: quotes.filter((q) => q.status === 'approved').length,
    paid: quotes.filter((q) => ['paid', 'ordered', 'shipped', 'completed'].includes(q.status))
      .length,
    rejected: quotes.filter((q) => ['rejected', 'cancelled'].includes(q.status)).length,
  };

  const totalQuotes = quotes.length;
  const hasActiveFilters = filters.searchText.length > 0 || filters.countries.length > 0;

  const handleSearchTextChange = (value: string) => {
    onFiltersChange({ ...filters, searchText: value });
  };

  const handleCountryToggle = (countryCode: string) => {
    const newCountries = filters.countries.includes(countryCode)
      ? filters.countries.filter((c) => c !== countryCode)
      : [...filters.countries, countryCode];
    onFiltersChange({ ...filters, countries: newCountries });
  };

  const getStatusBadgeColor = (status: string, count: number) => {
    if (count === 0) return 'bg-gray-100 text-gray-400 border-gray-200';

    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
      case 'approved':
        return 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200';
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 mb-6 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        {/* Left: Status Analytics as Inline Badges */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-medium text-gray-700 mr-2">{totalQuotes} quotes</span>

          {/* Status Badges - Always Visible */}
          <Badge
            variant="outline"
            className={`text-xs font-medium cursor-default ${getStatusBadgeColor('pending', statusCounts.pending)}`}
          >
            Pending {statusCounts.pending}
          </Badge>

          <Badge
            variant="outline"
            className={`text-xs font-medium cursor-default ${getStatusBadgeColor('sent', statusCounts.sent)}`}
          >
            Sent {statusCounts.sent}
          </Badge>

          <Badge
            variant="outline"
            className={`text-xs font-medium cursor-default ${getStatusBadgeColor('approved', statusCounts.approved)}`}
          >
            Approved {statusCounts.approved}
          </Badge>

          <Badge
            variant="outline"
            className={`text-xs font-medium cursor-default ${getStatusBadgeColor('paid', statusCounts.paid)}`}
          >
            Completed {statusCounts.paid}
          </Badge>

          <Badge
            variant="outline"
            className={`text-xs font-medium cursor-default ${getStatusBadgeColor('rejected', statusCounts.rejected)}`}
          >
            Rejected {statusCounts.rejected}
          </Badge>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search quotes, customers, items..."
              value={filters.searchText}
              onChange={(e) => handleSearchTextChange(e.target.value)}
              className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearch();
                }
              }}
            />
          </div>
        </div>

        {/* Right: Filters & Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Country Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Country
                {filters.countries.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {filters.countries.length}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <DropdownMenuLabel>Filter by Country</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableCountries.map((country) => (
                <DropdownMenuCheckboxItem
                  key={country.code}
                  checked={filters.countries.includes(country.code)}
                  onCheckedChange={() => handleCountryToggle(country.code)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{country.name}</span>
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

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}

          {/* Action Buttons */}
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
