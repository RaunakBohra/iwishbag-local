import { useState } from 'react';
import { Search, Filter, X, Star, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  quoteFilter?: 'all' | 'with_quote' | 'without_quote';
  onQuoteChange?: (value: 'all' | 'with_quote' | 'without_quote') => void;
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
  quoteFilter,
  onQuoteChange,
  totalTickets,
  filteredCount,
}: InlineFiltersProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasActiveFilters =
    statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || (quoteFilter && quoteFilter !== 'all') || searchInput;
  const activeFilterCount = [statusFilter, priorityFilter, categoryFilter, quoteFilter].filter(
    (f) => f && f !== 'all',
  ).length;

  const clearAllFilters = () => {
    onSearchChange('');
    onStatusChange('all');
    onPriorityChange('all');
    onCategoryChange('all');
    if (onQuoteChange) onQuoteChange('all');
  };

  // Quick Filter Presets
  const quickFilters = [
    {
      id: 'urgent',
      label: 'Urgent',
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100',
      count: 3,
      onClick: () => {
        onStatusChange('all');
        onPriorityChange('urgent');
        onCategoryChange('all');
      },
    },
    {
      id: 'my-tickets',
      label: 'My Tickets',
      icon: Star,
      color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100',
      count: 7,
      onClick: () => {
        // This would filter by current user assignment in a real implementation
        onStatusChange('in_progress');
        onPriorityChange('all');
        onCategoryChange('all');
      },
    },
    {
      id: 'overdue',
      label: 'Overdue',
      icon: Clock,
      color: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100',
      count: 2,
      onClick: () => {
        onStatusChange('pending');
        onPriorityChange('all');
        onCategoryChange('all');
      },
    },
    {
      id: 'today',
      label: 'Today',
      icon: CheckCircle,
      color: 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100',
      count: 12,
      onClick: () => {
        // Filter by today's tickets
        onStatusChange('all');
        onPriorityChange('all');
        onCategoryChange('all');
      },
    },
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Quick Filter Pills */}
      <div className="px-6 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-sm font-medium text-gray-500 mr-2 whitespace-nowrap">Quick filters:</span>
          {quickFilters.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.id}
                onClick={filter.onClick}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${filter.color}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {filter.label}
                <span className="text-xs opacity-75">({filter.count})</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Enhanced Main Toolbar */}
      <div className="flex items-center gap-4 p-4 flex-wrap sm:flex-nowrap">
        {/* Enhanced Search */}
        <div className="relative flex-1 min-w-[300px] max-w-lg">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search tickets, customers, tracking IDs, or destinations..."
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-12 pr-4 py-2.5 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg bg-gray-50 focus:bg-white transition-colors"
          />
          {searchInput && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Enhanced Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[140px] border-gray-300 shadow-sm hover:border-gray-400 transition-colors">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(TICKET_STATUS_LABELS).map(([status, label]) => (
              <SelectItem key={status} value={status}>
                <div className="flex items-center gap-2">
                  {status === 'open' && <Clock className="h-3.5 w-3.5 text-blue-500" />}
                  {status === 'in_progress' && <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />}
                  {status === 'pending' && <Clock className="h-3.5 w-3.5 text-orange-500" />}
                  {status === 'resolved' && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                  {status === 'closed' && <CheckCircle className="h-3.5 w-3.5 text-gray-500" />}
                  {label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Enhanced Advanced Filters */}
        <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={`relative flex-shrink-0 border-gray-300 shadow-sm hover:border-gray-400 transition-colors ${
              hasActiveFilters ? 'border-blue-500 bg-blue-50 text-blue-700' : ''
            }`}>
              <Filter className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Advanced</span>
              <span className="sm:hidden">Filters</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 h-5 w-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
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
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs">
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

                {/* Quote Filter */}
                {quoteFilter && onQuoteChange && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Quote Status</label>
                    <Select value={quoteFilter} onValueChange={onQuoteChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All tickets" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tickets</SelectItem>
                        <SelectItem value="with_quote">With Quote/Order</SelectItem>
                        <SelectItem value="without_quote">General Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Results Count */}
        <div className="text-sm text-gray-500 whitespace-nowrap">
          {filteredCount === totalTickets ? (
            <span>{totalTickets} tickets</span>
          ) : (
            <span>
              {filteredCount} of {totalTickets} tickets
            </span>
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
