import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS,
  type TicketStatus,
  type TicketPriority,
  type TicketCategory,
} from '@/types/ticket';

interface InlineFiltersProps {
  searchInput: string;
  onSearchChange: (value: string) => void;
  statusFilter: TicketStatus | 'all';
  onStatusChange: (value: TicketStatus | 'all') => void;
  priorityFilter: TicketPriority | 'all';
  onPriorityChange: (value: TicketPriority | 'all') => void;
  categoryFilter: TicketCategory | 'all';
  onCategoryChange: (value: TicketCategory | 'all') => void;
  totalTickets: number;
  filteredCount: number;
}

export const InlineFilters = ({
  searchInput,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  categoryFilter,
  onCategoryChange,
  totalTickets,
  filteredCount,
}: InlineFiltersProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || searchInput;
  const activeFilterCount = [statusFilter, priorityFilter, categoryFilter].filter(f => f !== 'all').length;

  const clearAllFilters = () => {
    onSearchChange('');
    onStatusChange('all');
    onPriorityChange('all');
    onCategoryChange('all');
  };

  return (
    <div className="border-b bg-white">
      {/* Main Toolbar */}
      <div className="flex items-center gap-3 p-4 flex-wrap sm:flex-nowrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search tickets, customers, or tracking IDs..."
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[120px] sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(TICKET_STATUS_LABELS).map(([status, label]) => (
              <SelectItem key={status} value={status}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Advanced Filters Popover */}
        <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="relative flex-shrink-0">
              <Filter className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">More Filters</span>
              <span className="sm:hidden">Filters</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Additional Filters</h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {/* Priority Filter */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Priority</label>
                  <Select value={priorityFilter} onValueChange={onPriorityChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      {Object.entries(TICKET_PRIORITY_LABELS).map(([priority, label]) => (
                        <SelectItem key={priority} value={priority}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Category</label>
                  <Select value={categoryFilter} onValueChange={onCategoryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Object.entries(TICKET_CATEGORY_LABELS).map(([category, label]) => (
                        <SelectItem key={category} value={category}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Results Count */}
        <div className="text-sm text-gray-500 whitespace-nowrap">
          {filteredCount === totalTickets ? (
            <span>{totalTickets} tickets</span>
          ) : (
            <span>{filteredCount} of {totalTickets} tickets</span>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 px-4 pb-3">
          <span className="text-xs text-gray-500">Active filters:</span>
          {statusFilter !== 'all' && (
            <Button
              variant="secondary"
              size="sm"
              className="h-6 text-xs"
              onClick={() => onStatusChange('all')}
            >
              Status: {TICKET_STATUS_LABELS[statusFilter as TicketStatus]}
              <X className="h-3 w-3 ml-1" />
            </Button>
          )}
          {priorityFilter !== 'all' && (
            <Button
              variant="secondary"
              size="sm"
              className="h-6 text-xs"
              onClick={() => onPriorityChange('all')}
            >
              Priority: {TICKET_PRIORITY_LABELS[priorityFilter as TicketPriority]}
              <X className="h-3 w-3 ml-1" />
            </Button>
          )}
          {categoryFilter !== 'all' && (
            <Button
              variant="secondary"
              size="sm"
              className="h-6 text-xs"
              onClick={() => onCategoryChange('all')}
            >
              Category: {TICKET_CATEGORY_LABELS[categoryFilter as TicketCategory]}
              <X className="h-3 w-3 ml-1" />
            </Button>
          )}
          {searchInput && (
            <Button
              variant="secondary"
              size="sm"
              className="h-6 text-xs"
              onClick={() => onSearchChange('')}
            >
              Search: "{searchInput}"
              <X className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};