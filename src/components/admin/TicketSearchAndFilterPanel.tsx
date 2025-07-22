import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Activity,
  AlertTriangle,
  Users,
  Calendar,
  Clock,
  X,
  Target,
  MapPin
} from 'lucide-react';
import { useUserRoles } from '@/hooks/useUserRoles';
import {
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS
} from '@/types/ticket';

// Enhanced filter interface for tickets
export interface TicketSearchFilters {
  searchText: string;
  statuses: TicketStatus[];
  priorities: TicketPriority[];
  categories: TicketCategory[];
  assignedTo: string[];
  assignmentStatus: 'all' | 'assigned' | 'unassigned' | 'mine';
  slaStatus: 'all' | 'on_track' | 'approaching_deadline' | 'overdue';
  hasOrder: boolean | null;
  countries: string[];
  dateRange?: {
    from: Date;
    to: Date;
    type: 'created' | 'updated' | 'resolved';
  };
}

export interface QuickFilter {
  id: string;
  label: string;
  icon: any;
  description: string;
  filters: Partial<TicketSearchFilters>;
  variant?: 'default' | 'urgent' | 'success' | 'warning';
}

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
  count?: number;
}

export interface AssigneeOption {
  id: string;
  name: string;
  email: string;
  role: string;
  count?: number;
}

export interface TicketSearchAndFilterPanelProps {
  filters: TicketSearchFilters;
  onFiltersChange: (filters: TicketSearchFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  availableStatuses?: FilterOption[];
  availablePriorities?: FilterOption[];
  availableCategories?: FilterOption[];
  availableAssignees?: AssigneeOption[];
  availableCountries?: FilterOption[];
  isLoading?: boolean;
  resultsCount?: number;
  className?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

// Quick action filters based on industry best practices
const getQuickFilters = (currentUserId?: string): QuickFilter[] => [
  {
    id: 'my_tickets',
    label: 'My Tickets',
    icon: Users,
    description: 'Tickets assigned to me',
    filters: { assignmentStatus: 'mine' },
    variant: 'default'
  },
  {
    id: 'urgent_open',
    label: 'Urgent & Open',
    icon: AlertTriangle,
    description: 'High priority tickets needing attention',
    filters: { 
      priorities: ['urgent', 'high'], 
      statuses: ['open', 'in_progress'] 
    },
    variant: 'urgent'
  },
  {
    id: 'overdue',
    label: 'Overdue',
    icon: Clock,
    description: 'Tickets past SLA deadline',
    filters: { slaStatus: 'overdue' },
    variant: 'urgent'
  },
  {
    id: 'needs_response',
    label: 'Needs Response',
    icon: Target,
    description: 'Open tickets awaiting first response',
    filters: { 
      statuses: ['open'],
      slaStatus: 'approaching_deadline'
    },
    variant: 'warning'
  },
  {
    id: 'unassigned',
    label: 'Unassigned',
    icon: Users,
    description: 'Tickets needing assignment',
    filters: { assignmentStatus: 'unassigned' },
    variant: 'warning'
  },
  {
    id: 'with_orders',
    label: 'With Orders',
    icon: MapPin,
    description: 'Tickets related to orders',
    filters: { hasOrder: true },
    variant: 'default'
  }
];

export function TicketSearchAndFilterPanel({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
  availableStatuses = [],
  availablePriorities = [],
  availableCategories = [],
  availableAssignees = [],
  availableCountries = [],
  isLoading = false,
  resultsCount,
  className = '',
  collapsed = false,
  onCollapsedChange
}: TicketSearchAndFilterPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const { user } = useUserRoles();

  const handleCollapsedChange = (isOpen: boolean) => {
    const newCollapsed = !isOpen;
    setIsCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
  };

  const handleSearchTextChange = (value: string) => {
    onFiltersChange({
      ...filters,
      searchText: value
    });
  };

  const handleMultiSelectToggle = <T extends string>(
    field: keyof TicketSearchFilters,
    value: T,
    currentValues: T[]
  ) => {
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    onFiltersChange({
      ...filters,
      [field]: newValues
    });
  };

  const handleAssignmentStatusChange = (status: typeof filters.assignmentStatus) => {
    onFiltersChange({
      ...filters,
      assignmentStatus: status,
      // Clear assignedTo when changing assignment status
      assignedTo: status === 'all' ? [] : filters.assignedTo
    });
  };

  const handleSLAStatusChange = (status: typeof filters.slaStatus) => {
    onFiltersChange({
      ...filters,
      slaStatus: status
    });
  };

  const handleHasOrderChange = (hasOrder: boolean | null) => {
    onFiltersChange({
      ...filters,
      hasOrder: hasOrder
    });
  };

  const applyQuickFilter = (quickFilter: QuickFilter) => {
    // Merge quick filter with current filters, replacing conflicting fields
    const newFilters = {
      ...filters,
      ...quickFilter.filters
    };
    
    onFiltersChange(newFilters);
  };

  const removeFilter = (filterType: string, value: string) => {
    switch (filterType) {
      case 'status':
        handleMultiSelectToggle('statuses', value as TicketStatus, filters.statuses);
        break;
      case 'priority':
        handleMultiSelectToggle('priorities', value as TicketPriority, filters.priorities);
        break;
      case 'category':
        handleMultiSelectToggle('categories', value as TicketCategory, filters.categories);
        break;
      case 'assignee':
        handleMultiSelectToggle('assignedTo', value, filters.assignedTo);
        break;
      case 'country':
        handleMultiSelectToggle('countries', value, filters.countries);
        break;
      case 'search':
        handleSearchTextChange('');
        break;
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.searchText) count++;
    count += filters.statuses.length;
    count += filters.priorities.length;
    count += filters.categories.length;
    count += filters.assignedTo.length;
    count += filters.countries.length;
    if (filters.assignmentStatus !== 'all') count++;
    if (filters.slaStatus !== 'all') count++;
    if (filters.hasOrder !== null) count++;
    return count;
  };

  const hasActiveFilters = getActiveFilterCount() > 0;
  const activeFilterCount = getActiveFilterCount();
  const quickFilters = getQuickFilters(user?.id);

  const getAssigneeName = (id: string) => {
    const assignee = availableAssignees.find(a => a.id === id);
    return assignee ? `${assignee.name} (${assignee.role})` : id;
  };

  const getCountryName = (code: string) => {
    const country = availableCountries.find(c => c.value === code);
    return country?.label || code;
  };

  return (
    <Card className={`w-full ${className}`}>
      <Collapsible open={!isCollapsed} onOpenChange={handleCollapsedChange}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600" />
                Search & Filter Tickets
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {resultsCount !== undefined && (
                  <span className="text-sm text-gray-600">
                    {resultsCount} tickets
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
            {/* Quick Action Filters */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Filters:</Label>
              <div className="flex flex-wrap gap-2">
                {quickFilters.map((quickFilter) => (
                  <Button
                    key={quickFilter.id}
                    variant={quickFilter.variant === 'urgent' ? 'destructive' : 
                            quickFilter.variant === 'warning' ? 'secondary' : 
                            'outline'}
                    size="sm"
                    onClick={() => applyQuickFilter(quickFilter)}
                    className="flex items-center gap-2"
                    title={quickFilter.description}
                  >
                    <quickFilter.icon className="h-4 w-4" />
                    {quickFilter.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Search Text Input */}
            <div className="space-y-2">
              <Label htmlFor="search-text">Search Tickets</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search-text"
                  placeholder="Search by subject, description, customer name, email, or tracking ID..."
                  value={filters.searchText}
                  onChange={(e) => handleSearchTextChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Basic Filter Controls Row */}
            <div className="flex flex-wrap gap-3">
              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Status
                    {filters.statuses.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {filters.statuses.length}
                      </Badge>
                    )}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableStatuses.map((status) => (
                    <DropdownMenuCheckboxItem
                      key={status.value}
                      checked={filters.statuses.includes(status.value as TicketStatus)}
                      onCheckedChange={() => handleMultiSelectToggle('statuses', status.value as TicketStatus, filters.statuses)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{status.label}</span>
                        {status.count !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {status.count}
                          </Badge>
                        )}
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Priority Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Priority
                    {filters.priorities.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {filters.priorities.length}
                      </Badge>
                    )}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availablePriorities.map((priority) => (
                    <DropdownMenuCheckboxItem
                      key={priority.value}
                      checked={filters.priorities.includes(priority.value as TicketPriority)}
                      onCheckedChange={() => handleMultiSelectToggle('priorities', priority.value as TicketPriority, filters.priorities)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{priority.label}</span>
                        {priority.count !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {priority.count}
                          </Badge>
                        )}
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Assignment Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Assignment
                    {filters.assignmentStatus !== 'all' && (
                      <Badge variant="secondary" className="ml-1">
                        1
                      </Badge>
                    )}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Assignment Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={filters.assignmentStatus === 'all'}
                    onCheckedChange={() => handleAssignmentStatusChange('all')}
                  >
                    All Tickets
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.assignmentStatus === 'mine'}
                    onCheckedChange={() => handleAssignmentStatusChange('mine')}
                  >
                    My Tickets
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.assignmentStatus === 'assigned'}
                    onCheckedChange={() => handleAssignmentStatusChange('assigned')}
                  >
                    Assigned Tickets
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.assignmentStatus === 'unassigned'}
                    onCheckedChange={() => handleAssignmentStatusChange('unassigned')}
                  >
                    Unassigned Tickets
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Advanced Filters Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Advanced
                {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>

            {/* Advanced Filters */}
            <Collapsible open={showAdvancedFilters}>
              <CollapsibleContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                  {/* Category Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Category
                        </span>
                        {filters.categories.length > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {filters.categories.length}
                          </Badge>
                        )}
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {availableCategories.map((category) => (
                        <DropdownMenuCheckboxItem
                          key={category.value}
                          checked={filters.categories.includes(category.value as TicketCategory)}
                          onCheckedChange={() => handleMultiSelectToggle('categories', category.value as TicketCategory, filters.categories)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{category.label}</span>
                            {category.count !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                {category.count}
                              </Badge>
                            )}
                          </div>
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* SLA Status Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          SLA Status
                        </span>
                        {filters.slaStatus !== 'all' && (
                          <Badge variant="secondary" className="ml-1">
                            1
                          </Badge>
                        )}
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuLabel>SLA Performance</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={filters.slaStatus === 'all'}
                        onCheckedChange={() => handleSLAStatusChange('all')}
                      >
                        All Tickets
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filters.slaStatus === 'on_track'}
                        onCheckedChange={() => handleSLAStatusChange('on_track')}
                      >
                        On Track
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filters.slaStatus === 'approaching_deadline'}
                        onCheckedChange={() => handleSLAStatusChange('approaching_deadline')}
                      >
                        Approaching Deadline
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filters.slaStatus === 'overdue'}
                        onCheckedChange={() => handleSLAStatusChange('overdue')}
                      >
                        Overdue
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Has Order Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 w-full justify-between">
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Order Status
                        </span>
                        {filters.hasOrder !== null && (
                          <Badge variant="secondary" className="ml-1">
                            1
                          </Badge>
                        )}
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuLabel>Related Orders</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={filters.hasOrder === null}
                        onCheckedChange={() => handleHasOrderChange(null)}
                      >
                        All Tickets
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filters.hasOrder === true}
                        onCheckedChange={() => handleHasOrderChange(true)}
                      >
                        With Order
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={filters.hasOrder === false}
                        onCheckedChange={() => handleHasOrderChange(false)}
                      >
                        Without Order
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Country Filter */}
                  {availableCountries.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2 w-full justify-between">
                          <span className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Country
                          </span>
                          {filters.countries.length > 0 && (
                            <Badge variant="secondary" className="ml-1">
                              {filters.countries.length}
                            </Badge>
                          )}
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-64">
                        <DropdownMenuLabel>Customer Country</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {availableCountries.map((country) => (
                          <DropdownMenuCheckboxItem
                            key={country.value}
                            checked={filters.countries.includes(country.value)}
                            onCheckedChange={() => handleMultiSelectToggle('countries', country.value, filters.countries)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{country.label}</span>
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
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

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
                        onClick={() => removeFilter('search', '')}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {filters.statuses.map((status) => (
                    <Badge key={status} variant="outline" className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {TICKET_STATUS_LABELS[status]}
                      <button
                        onClick={() => removeFilter('status', status)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}

                  {filters.priorities.map((priority) => (
                    <Badge key={priority} variant="outline" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {TICKET_PRIORITY_LABELS[priority]}
                      <button
                        onClick={() => removeFilter('priority', priority)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}

                  {filters.categories.map((category) => (
                    <Badge key={category} variant="outline" className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {TICKET_CATEGORY_LABELS[category]}
                      <button
                        onClick={() => removeFilter('category', category)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}

                  {filters.assignedTo.map((assignee) => (
                    <Badge key={assignee} variant="outline" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {getAssigneeName(assignee)}
                      <button
                        onClick={() => removeFilter('assignee', assignee)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}

                  {filters.countries.map((country) => (
                    <Badge key={country} variant="outline" className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {getCountryName(country)}
                      <button
                        onClick={() => removeFilter('country', country)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}

                  {filters.assignmentStatus !== 'all' && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {filters.assignmentStatus === 'mine' ? 'My Tickets' :
                       filters.assignmentStatus === 'assigned' ? 'Assigned' :
                       filters.assignmentStatus === 'unassigned' ? 'Unassigned' : ''}
                      <button
                        onClick={() => handleAssignmentStatusChange('all')}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}

                  {filters.slaStatus !== 'all' && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {filters.slaStatus === 'on_track' ? 'On Track' :
                       filters.slaStatus === 'approaching_deadline' ? 'Approaching Deadline' :
                       filters.slaStatus === 'overdue' ? 'Overdue' : ''}
                      <button
                        onClick={() => handleSLAStatusChange('all')}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}

                  {filters.hasOrder !== null && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {filters.hasOrder ? 'With Order' : 'Without Order'}
                      <button
                        onClick={() => handleHasOrderChange(null)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={onSearch}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                {isLoading ? 'Searching...' : 'Apply Filters'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={onReset}
                disabled={!hasActiveFilters || isLoading}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset All
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}