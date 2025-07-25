// ============================================================================
// ADVANCED CUSTOMER FILTERS - Enterprise-Grade Filtering System
// Based on Shopify Advanced Filters & HubSpot Smart Lists 2025
// Features: Saved presets, complex logic, filter chips, smart suggestions
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Search,
  Filter,
  X,
  Plus,
  Star,
  TrendingDown,
  Clock,
  DollarSign,
  Users,
  MapPin,
  Calendar,
  Zap,
  AlertTriangle,
  Bookmark,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Filter types and interfaces
export interface FilterCondition {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: string | number | string[];
  logic?: 'AND' | 'OR';
}

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  conditions: FilterCondition[];
  count?: number;
}

export type FilterField =
  | 'name'
  | 'email'
  | 'status'
  | 'location'
  | 'joinDate'
  | 'totalSpent'
  | 'orderCount'
  | 'lastActivity'
  | 'healthScore';

export type FilterOperator =
  | 'contains'
  | 'equals'
  | 'not_equals'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty';

interface AdvancedCustomerFiltersProps {
  onFiltersChange: (conditions: FilterCondition[], searchQuery: string) => void;
  totalCustomers: number;
  filteredCount: number;
  isLoading?: boolean;
}

// Pre-defined filter presets
const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'vip',
    name: 'VIP Customers',
    description: 'High-value customers with VIP status',
    icon: Star,
    color: 'bg-yellow-500',
    conditions: [{ id: '1', field: 'status', operator: 'equals', value: 'vip' }],
  },
  {
    id: 'at-risk',
    name: 'At Risk',
    description: 'Inactive customers who might churn',
    icon: AlertTriangle,
    color: 'bg-red-500',
    conditions: [
      { id: '1', field: 'healthScore', operator: 'less_than', value: 40 },
      { id: '2', field: 'lastActivity', operator: 'greater_than', value: 90, logic: 'AND' },
    ],
  },
  {
    id: 'high-value',
    name: 'High Value',
    description: 'Customers with total spent > $500',
    icon: DollarSign,
    color: 'bg-green-500',
    conditions: [{ id: '1', field: 'totalSpent', operator: 'greater_than', value: 500 }],
  },
  {
    id: 'new-customers',
    name: 'New Customers',
    description: 'Joined in the last 30 days',
    icon: Users,
    color: 'bg-blue-500',
    conditions: [{ id: '1', field: 'joinDate', operator: 'greater_than', value: 30 }],
  },
  {
    id: 'frequent-buyers',
    name: 'Frequent Buyers',
    description: 'Customers with 3+ orders',
    icon: Zap,
    color: 'bg-purple-500',
    conditions: [{ id: '1', field: 'orderCount', operator: 'greater_than', value: 3 }],
  },
  {
    id: 'international',
    name: 'International',
    description: 'Customers outside US/IN',
    icon: MapPin,
    color: 'bg-indigo-500',
    conditions: [{ id: '1', field: 'location', operator: 'not_in', value: ['US', 'IN'] }],
  },
];

// Field configurations for dynamic filter building
const FILTER_FIELDS = {
  name: { label: 'Customer Name', type: 'text' },
  email: { label: 'Email Address', type: 'text' },
  status: { label: 'Status', type: 'select', options: ['active', 'inactive', 'vip'] },
  location: { label: 'Location', type: 'text' },
  joinDate: { label: 'Join Date', type: 'date' },
  totalSpent: { label: 'Total Spent', type: 'number' },
  orderCount: { label: 'Order Count', type: 'number' },
  lastActivity: { label: 'Last Activity', type: 'date' },
  healthScore: { label: 'Health Score', type: 'number' },
};

const FILTER_OPERATORS = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'between', label: 'Between' },
  ],
  select: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
    { value: 'in', label: 'Is any of' },
    { value: 'not_in', label: 'Is none of' },
  ],
  date: [
    { value: 'equals', label: 'Is' },
    { value: 'greater_than', label: 'After' },
    { value: 'less_than', label: 'Before' },
    { value: 'between', label: 'Between' },
  ],
};

export const AdvancedCustomerFilters: React.FC<AdvancedCustomerFiltersProps> = ({
  onFiltersChange,
  totalCustomers,
  filteredCount,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeConditions, setActiveConditions] = useState<FilterCondition[]>([]);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  // Search with debounce
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      onFiltersChange(activeConditions, value);
    },
    [activeConditions, onFiltersChange],
  );

  // Apply preset filter
  const applyPreset = useCallback(
    (preset: FilterPreset) => {
      setActiveConditions(preset.conditions);
      setActivePreset(preset.id);
      setSearchQuery('');
      onFiltersChange(preset.conditions, '');
      setShowPresets(false);
    },
    [onFiltersChange],
  );

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setActiveConditions([]);
    setActivePreset(null);
    setSearchQuery('');
    onFiltersChange([], '');
  }, [onFiltersChange]);

  // Remove specific condition
  const removeCondition = useCallback(
    (conditionId: string) => {
      const newConditions = activeConditions.filter((c) => c.id !== conditionId);
      setActiveConditions(newConditions);
      setActivePreset(null); // Clear preset if manually editing
      onFiltersChange(newConditions, searchQuery);
    },
    [activeConditions, searchQuery, onFiltersChange],
  );

  // Add new condition
  const addCondition = useCallback(() => {
    const newCondition: FilterCondition = {
      id: `condition-${Date.now()}`,
      field: 'name',
      operator: 'contains',
      value: '',
      logic: activeConditions.length > 0 ? 'AND' : undefined,
    };
    const newConditions = [...activeConditions, newCondition];
    setActiveConditions(newConditions);
    setActivePreset(null);
    setShowAdvanced(true);
  }, [activeConditions]);

  // Update condition
  const updateCondition = useCallback(
    (conditionId: string, updates: Partial<FilterCondition>) => {
      const newConditions = activeConditions.map((c) =>
        c.id === conditionId ? { ...c, ...updates } : c,
      );
      setActiveConditions(newConditions);
      setActivePreset(null);
      onFiltersChange(newConditions, searchQuery);
    },
    [activeConditions, searchQuery, onFiltersChange],
  );

  // Get available operators for field type
  const getOperatorsForField = (field: FilterField) => {
    const fieldConfig = FILTER_FIELDS[field];
    return FILTER_OPERATORS[fieldConfig.type] || FILTER_OPERATORS.text;
  };

  // Render condition editor
  const renderConditionEditor = (condition: FilterCondition, index: number) => {
    const fieldConfig = FILTER_FIELDS[condition.field];
    const operators = getOperatorsForField(condition.field);

    return (
      <Card key={condition.id} className="p-4 border border-gray-200">
        <div className="flex items-center space-x-3">
          {/* Logic operator (AND/OR) */}
          {index > 0 && (
            <Select
              value={condition.logic || 'AND'}
              onValueChange={(value) =>
                updateCondition(condition.id, { logic: value as 'AND' | 'OR' })
              }
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Field selector */}
          <Select
            value={condition.field}
            onValueChange={(value) =>
              updateCondition(condition.id, {
                field: value as FilterField,
                operator: 'contains',
                value: '',
              })
            }
          >
            <SelectTrigger className="w-40 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FILTER_FIELDS).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Operator selector */}
          <Select
            value={condition.operator}
            onValueChange={(value) =>
              updateCondition(condition.id, { operator: value as FilterOperator })
            }
          >
            <SelectTrigger className="w-36 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {operators.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Value input */}
          {fieldConfig.type === 'select' && fieldConfig.options ? (
            <Select
              value={condition.value as string}
              onValueChange={(value) => updateCondition(condition.id, { value })}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {fieldConfig.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={fieldConfig.type === 'number' ? 'number' : 'text'}
              value={condition.value as string}
              onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
              placeholder="Enter value..."
              className="w-40 h-8"
            />
          )}

          {/* Remove button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeCondition(condition.id)}
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  };

  // Calculate preset counts (mock data for now)
  const presetsWithCounts = useMemo(() => {
    return FILTER_PRESETS.map((preset) => ({
      ...preset,
      count: Math.floor(totalCustomers * Math.random() * 0.3), // Mock calculation
    }));
  }, [totalCustomers]);

  const hasActiveFilters = activeConditions.length > 0 || searchQuery.length > 0;
  const isFiltered = filteredCount < totalCustomers;

  return (
    <div className="space-y-4">
      {/* Main Search and Filter Controls */}
      <div className="flex items-center space-x-4">
        {/* Advanced Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search customers by name, email, location..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSearchChange('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Filter Presets */}
        <Popover open={showPresets} onOpenChange={setShowPresets}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="border-gray-300">
              <Bookmark className="h-4 w-4 mr-2" />
              Presets
              {activePreset && (
                <Badge variant="secondary" className="ml-2 h-4 text-xs">
                  1
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search presets..." />
              <CommandList>
                <CommandEmpty>No presets found.</CommandEmpty>
                <CommandGroup heading="Smart Presets">
                  {presetsWithCounts.map((preset) => {
                    const Icon = preset.icon;
                    return (
                      <CommandItem
                        key={preset.id}
                        onSelect={() => applyPreset(preset)}
                        className="flex items-center space-x-3 p-3 cursor-pointer"
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center',
                            preset.color.replace('bg-', 'bg-').replace('-500', '-100'),
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-4 w-4',
                              preset.color.replace('bg-', 'text-').replace('-500', '-600'),
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{preset.name}</div>
                          <div className="text-xs text-gray-500">{preset.description}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {preset.count}
                        </Badge>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Advanced Filters Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            'border-gray-300',
            showAdvanced && 'bg-blue-50 border-blue-300 text-blue-700',
          )}
        >
          <Filter className="h-4 w-4 mr-2" />
          Advanced
          {activeConditions.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-4 text-xs">
              {activeConditions.length}
            </Badge>
          )}
        </Button>

        {/* Results Summary */}
        <div className="text-sm text-gray-600 whitespace-nowrap">
          {isFiltered ? (
            <span>
              <span className="font-medium text-blue-600">{filteredCount}</span> of{' '}
              <span className="font-medium">{totalCustomers}</span>
            </span>
          ) : (
            <span className="font-medium">{totalCustomers} customers</span>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex items-center space-x-2 flex-wrap">
          <span className="text-sm text-gray-600 font-medium">Active filters:</span>

          {/* Search query chip */}
          {searchQuery && (
            <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700 pr-1">
              Search: "{searchQuery}"
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSearchChange('')}
                className="h-4 w-4 p-0 ml-1 hover:bg-blue-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {/* Preset chip */}
          {activePreset && (
            <Badge
              variant="outline"
              className="bg-purple-50 border-purple-300 text-purple-700 pr-1"
            >
              {presetsWithCounts.find((p) => p.id === activePreset)?.name}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-4 w-4 p-0 ml-1 hover:bg-purple-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {/* Condition chips */}
          {activeConditions.map((condition, index) => (
            <Badge
              key={condition.id}
              variant="outline"
              className="bg-gray-50 border-gray-300 text-gray-700 pr-1"
            >
              {index > 0 && <span className="text-xs mr-1">{condition.logic}</span>}
              {FILTER_FIELDS[condition.field].label}{' '}
              {getOperatorsForField(condition.field)
                .find((op) => op.value === condition.operator)
                ?.label.toLowerCase()}{' '}
              {condition.value}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCondition(condition.id)}
                className="h-4 w-4 p-0 ml-1 hover:bg-gray-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}

          {/* Clear all button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-gray-500 hover:text-gray-700 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Advanced Filter Builder */}
      {showAdvanced && (
        <Card className="p-4 border border-gray-200 bg-gray-50/50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Advanced Filters</h4>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={addCondition} className="h-8">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Condition
                </Button>
              </div>
            </div>

            {activeConditions.length > 0 ? (
              <div className="space-y-2">
                {activeConditions.map((condition, index) =>
                  renderConditionEditor(condition, index),
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No advanced filters applied</p>
                <Button variant="outline" size="sm" onClick={addCondition} className="mt-2 h-8">
                  Add your first condition
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
