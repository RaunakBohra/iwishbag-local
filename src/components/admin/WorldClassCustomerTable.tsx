// ============================================================================
// WORLD-CLASS CUSTOMER TABLE - Professional E-commerce Admin Interface
// Based on Shopify Polaris & Amazon Seller Central design patterns 2025
// Features: Sortable columns, bulk actions, health indicators, advanced search
// ============================================================================

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Users,
  MapPin,
  Calendar,
  Star,
  DollarSign,
  ShoppingCart,
  MoreHorizontal,
  Eye,
  Edit,
  Mail,
  Phone,
  Activity,
  ExternalLink,
  Settings,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Download,
  UserPlus,
  Trash2,
  MessageSquare,
  Tag,
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Customer, CustomerAnalytics } from './CustomerTable';
import { CustomerCodToggle } from './CustomerCodToggle';
import { AdvancedCustomerFilters, FilterCondition } from './AdvancedCustomerFilters';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface WorldClassCustomerTableProps {
  customers: Customer[];
  customerAnalytics?: CustomerAnalytics[];
  isLoading?: boolean;
  onUpdateCod: (userId: string, codEnabled: boolean) => void;
  onUpdateNotes: (userId: string, notes: string) => void;
  onUpdateName: (userId: string, name: string) => void;
  isUpdating?: boolean;
  onExport: () => void;
  onFiltersChange?: (conditions: FilterCondition[], searchQuery: string) => void;
  onAddCustomer?: () => void;
  onBulkEmail?: (customerIds: string[]) => void;
  onBulkTag?: (customerIds: string[]) => void;
  onBulkExport?: (customerIds: string[]) => void;
  onEditCustomer?: (customerId: string) => void;
  onSendEmail?: (customerId: string, email: string) => void;
  onViewMessages?: (customerId: string) => void;
  onViewOrders?: (customerId: string) => void;
}

type SortField =
  | 'name'
  | 'email'
  | 'location'
  | 'joinDate'
  | 'totalSpent'
  | 'orders'
  | 'lastActivity'
  | 'status';
type SortDirection = 'asc' | 'desc';

export const WorldClassCustomerTable: React.FC<WorldClassCustomerTableProps> = ({
  customers,
  customerAnalytics = [],
  isLoading = false,
  onUpdateCod,
  onUpdateNotes,
  onUpdateName,
  isUpdating = false,
  onExport,
  onFiltersChange,
  onAddCustomer,
  onBulkEmail,
  onBulkTag,
  onBulkExport,
  onEditCustomer,
  onSendEmail,
  onViewMessages,
  onViewOrders,
}) => {
  const navigate = useNavigate();
  // Table state
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('joinDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Utility functions
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const getCustomerAvatarUrl = (customer: Customer) => {
    return customer.avatar_url;
  };

  const getCustomerInitials = (customer: Customer) => {
    const name = customer.full_name || customer.email || 'User';
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays}d ago`;
    if (diffDays <= 30) return format(date, 'MMM d');
    return format(date, 'MMM d, yyyy');
  };

  const getCustomerHealthScore = (customer: Customer, analytics?: CustomerAnalytics) => {
    const daysSinceJoin = Math.ceil(
      (new Date().getTime() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    const orderCount = analytics?.orderCount || 0;
    const totalSpent = analytics?.totalSpent || 0;
    const lastActivityDays = analytics
      ? Math.ceil((new Date().getTime() - analytics.lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : daysSinceJoin;

    // Calculate health score (0-100)
    let score = 50; // Base score

    // Boost for orders and spending
    score += Math.min(orderCount * 10, 30); // Up to +30 for orders
    score += Math.min(totalSpent / 100, 20); // Up to +20 for spending

    // Penalty for inactivity
    if (lastActivityDays > 90) score -= 30;
    else if (lastActivityDays > 30) score -= 15;
    else if (lastActivityDays <= 7) score += 10;

    // VIP bonus
    if (customer.internal_notes?.includes('VIP')) score += 20;

    return Math.max(0, Math.min(100, score));
  };

  const getHealthIndicator = (score: number) => {
    if (score >= 80)
      return { color: 'bg-green-500', label: 'Excellent', textColor: 'text-green-700' };
    if (score >= 60) return { color: 'bg-blue-500', label: 'Good', textColor: 'text-blue-700' };
    if (score >= 40) return { color: 'bg-yellow-500', label: 'Fair', textColor: 'text-yellow-700' };
    return { color: 'bg-red-500', label: 'At Risk', textColor: 'text-red-700' };
  };

  const getCustomerStatus = (customer: Customer) => {
    if (customer.internal_notes?.includes('VIP')) {
      return {
        label: 'VIP',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: Star,
      };
    }
    if (customer.cod_enabled) {
      return {
        label: 'Active',
        className: 'bg-green-100 text-green-800 border-green-300',
        icon: Activity,
      };
    }
    return {
      label: 'Inactive',
      className: 'bg-gray-100 text-gray-800 border-gray-300',
      icon: Clock,
    };
  };

  // Apply filter conditions
  const applyFilterConditions = (customer: Customer, analytics?: CustomerAnalytics): boolean => {
    if (filterConditions.length === 0) return true;

    // Process conditions with AND/OR logic
    let result = true;
    let currentLogic: 'AND' | 'OR' = 'AND';

    for (const condition of filterConditions) {
      const conditionResult = evaluateCondition(customer, analytics, condition);

      if (currentLogic === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      // Set logic for next condition
      if (condition.logic) {
        currentLogic = condition.logic;
      }
    }

    return result;
  };

  // Evaluate individual filter condition
  const evaluateCondition = (
    customer: Customer,
    analytics: CustomerAnalytics | undefined,
    condition: FilterCondition,
  ): boolean => {
    const { field, operator, value } = condition;
    let fieldValue: any;

    // Get field value
    switch (field) {
      case 'name':
        fieldValue = customer.full_name || '';
        break;
      case 'email':
        fieldValue = customer.email;
        break;
      case 'status':
        if (customer.internal_notes?.includes('VIP')) fieldValue = 'vip';
        else if (customer.cod_enabled) fieldValue = 'active';
        else fieldValue = 'inactive';
        break;
      case 'location':
        fieldValue = customer.user_addresses[0]?.country || '';
        break;
      case 'joinDate':
        const daysSinceJoin = Math.ceil(
          (new Date().getTime() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24),
        );
        fieldValue = daysSinceJoin;
        break;
      case 'totalSpent':
        fieldValue = analytics?.totalSpent || 0;
        break;
      case 'orderCount':
        fieldValue = analytics?.orderCount || 0;
        break;
      case 'lastActivity':
        const lastActivityDays = analytics
          ? Math.ceil(
              (new Date().getTime() - analytics.lastActivity.getTime()) / (1000 * 60 * 60 * 24),
            )
          : Infinity;
        fieldValue = lastActivityDays;
        break;
      case 'healthScore':
        fieldValue = getCustomerHealthScore(customer, analytics);
        break;
      default:
        return true;
    }

    // Apply operator
    switch (operator) {
      case 'contains':
        return fieldValue.toString().toLowerCase().includes(value.toString().toLowerCase());
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'starts_with':
        return fieldValue.toString().toLowerCase().startsWith(value.toString().toLowerCase());
      case 'ends_with':
        return fieldValue.toString().toLowerCase().endsWith(value.toString().toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'in':
        return Array.isArray(value) ? value.includes(fieldValue) : false;
      case 'not_in':
        return Array.isArray(value) ? !value.includes(fieldValue) : true;
      case 'is_empty':
        return !fieldValue || fieldValue === '';
      case 'is_not_empty':
        return fieldValue && fieldValue !== '';
      default:
        return true;
    }
  };

  // Sorting and filtering
  const sortedAndFilteredCustomers = useMemo(() => {
    const filtered = customers.filter((customer) => {
      const analytics = customerAnalytics.find((ca) => ca.customerId === customer.id);

      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        customer.full_name?.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.user_addresses.some(
          (addr) =>
            addr.city?.toLowerCase().includes(searchLower) ||
            addr.country?.toLowerCase().includes(searchLower),
        );

      // Advanced filter conditions
      const matchesConditions = applyFilterConditions(customer, analytics);

      return matchesSearch && matchesConditions;
    });

    // Sorting
    return filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      const aAnalytics = customerAnalytics.find((ca) => ca.customerId === a.id);
      const bAnalytics = customerAnalytics.find((ca) => ca.customerId === b.id);

      switch (sortField) {
        case 'name':
          aValue = a.full_name || '';
          bValue = b.full_name || '';
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'location':
          aValue = a.user_addresses[0]?.country || '';
          bValue = b.user_addresses[0]?.country || '';
          break;
        case 'joinDate':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'totalSpent':
          aValue = aAnalytics?.totalSpent || 0;
          bValue = bAnalytics?.totalSpent || 0;
          break;
        case 'orders':
          aValue = aAnalytics?.orderCount || 0;
          bValue = bAnalytics?.orderCount || 0;
          break;
        case 'lastActivity':
          aValue = aAnalytics?.lastActivity.getTime() || new Date(a.created_at).getTime();
          bValue = bAnalytics?.lastActivity.getTime() || new Date(b.created_at).getTime();
          break;
        case 'status':
          aValue = getCustomerHealthScore(a, aAnalytics);
          bValue = getCustomerHealthScore(b, bAnalytics);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [
    customers,
    customerAnalytics,
    searchQuery,
    filterConditions,
    sortField,
    sortDirection,
    applyFilterConditions,
  ]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedCustomers.length === sortedAndFilteredCustomers.length) {
      setSelectedCustomers([]);
      setShowBulkActions(false);
    } else {
      setSelectedCustomers(sortedAndFilteredCustomers.map((c) => c.id));
      setShowBulkActions(true);
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    const newSelection = selectedCustomers.includes(customerId)
      ? selectedCustomers.filter((id) => id !== customerId)
      : [...selectedCustomers, customerId];

    setSelectedCustomers(newSelection);
    setShowBulkActions(newSelection.length > 0);
  };

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-600" />
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="p-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 py-4 border-b border-gray-100">
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Table Header with Search and Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {sortedAndFilteredCustomers.length} Customer
              {sortedAndFilteredCustomers.length !== 1 ? 's' : ''}
            </h2>
            {selectedCustomers.length > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                {selectedCustomers.length} selected
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAddCustomer?.()}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Advanced Customer Filters */}
        <AdvancedCustomerFilters
          onFiltersChange={(conditions, search) => {
            setFilterConditions(conditions);
            setSearchQuery(search);
          }}
          totalCustomers={customers.length}
          filteredCount={sortedAndFilteredCustomers.length}
          isLoading={isLoading}
        />

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedCustomers.length} customer{selectedCustomers.length !== 1 ? 's' : ''}{' '}
              selected
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="text-blue-700 border-blue-300"
                onClick={() => onBulkEmail?.(selectedCustomers)}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-blue-700 border-blue-300"
                onClick={() => onBulkTag?.(selectedCustomers)}
              >
                <Tag className="w-4 h-4 mr-2" />
                Tag
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-blue-700 border-blue-300"
                onClick={() => onBulkExport?.(selectedCustomers)}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCustomers([]);
                  setShowBulkActions(false);
                }}
                className="text-gray-600 border-gray-300"
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Professional Data Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 border-b border-gray-200">
              <TableHead className="w-12 px-6">
                <Checkbox
                  checked={
                    selectedCustomers.length === sortedAndFilteredCustomers.length &&
                    sortedAndFilteredCustomers.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead
                className="px-6 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">Customer</span>
                  {getSortIcon('name')}
                </div>
              </TableHead>
              <TableHead
                className="px-6 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('location')}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">Location</span>
                  {getSortIcon('location')}
                </div>
              </TableHead>
              <TableHead
                className="px-6 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('orders')}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">Orders</span>
                  {getSortIcon('orders')}
                </div>
              </TableHead>
              <TableHead
                className="px-6 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalSpent')}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">Total Spent</span>
                  {getSortIcon('totalSpent')}
                </div>
              </TableHead>
              <TableHead
                className="px-6 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('lastActivity')}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">Last Activity</span>
                  {getSortIcon('lastActivity')}
                </div>
              </TableHead>
              <TableHead
                className="px-6 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">Health</span>
                  {getSortIcon('status')}
                </div>
              </TableHead>
              <TableHead className="w-12 px-6">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredCustomers.map((customer) => {
              const analytics = customerAnalytics.find((ca) => ca.customerId === customer.id);
              const healthScore = getCustomerHealthScore(customer, analytics);
              const healthIndicator = getHealthIndicator(healthScore);
              const status = getCustomerStatus(customer);
              const isSelected = selectedCustomers.includes(customer.id);
              const primaryAddress = customer.user_addresses?.[0];

              return (
                <TableRow
                  key={customer.id}
                  className={cn(
                    'border-b border-gray-100 hover:bg-gray-50 transition-colors',
                    isSelected && 'bg-blue-50 border-blue-200',
                  )}
                >
                  <TableCell className="px-6">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectCustomer(customer.id)}
                    />
                  </TableCell>

                  <TableCell className="px-6">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        {getCustomerAvatarUrl(customer) && (
                          <AvatarImage
                            src={getCustomerAvatarUrl(customer)!}
                            alt={customer.full_name || customer.email}
                            className="object-cover"
                          />
                        )}
                        <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">
                          {getCustomerInitials(customer)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div
                          className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer transition-colors"
                          onClick={() => navigate(`/admin/customers/${customer.id}`)}
                        >
                          {customer.full_name || 'Unnamed Customer'}
                        </div>
                        <div className="text-sm text-gray-600">{customer.email}</div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="px-6">
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {primaryAddress
                          ? `${primaryAddress.city}, ${primaryAddress.country}`
                          : 'No address'}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="px-6">
                    <div className="flex items-center space-x-1">
                      <ShoppingCart className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {analytics?.orderCount || 0}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="px-6">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {formatCurrency(analytics?.totalSpent || 0)}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="px-6">
                    <span className="text-sm text-gray-600">
                      {analytics
                        ? formatDate(analytics.lastActivity.toISOString())
                        : formatDate(customer.created_at)}
                    </span>
                  </TableCell>

                  <TableCell className="px-6">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <div className={cn('w-2 h-2 rounded-full', healthIndicator.color)} />
                        <span className={cn('text-xs font-medium', healthIndicator.textColor)}>
                          {healthScore}%
                        </span>
                      </div>
                      <Badge variant="outline" className={cn('text-xs', status.className)}>
                        {status.label}
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell className="px-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => navigate(`/admin/customers/${customer.id}`)}
                          className="cursor-pointer"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onEditCustomer?.(customer.id)}
                          className="cursor-pointer"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Customer
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onSendEmail?.(customer.id, customer.email)}
                          className="cursor-pointer"
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onViewMessages?.(customer.id)}
                          className="cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          View Messages
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onViewOrders?.(customer.id)}
                          className="cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Orders
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Empty State */}
      {sortedAndFilteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || filterConditions.length > 0
              ? 'Try adjusting your filters to see more results.'
              : 'Customers will appear here when users sign up.'}
          </p>
          {searchQuery || filterConditions.length > 0 ? (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setFilterConditions([]);
                onFiltersChange && onFiltersChange([], '');
              }}
            >
              Clear Filters
            </Button>
          ) : (
            <Button onClick={() => onAddCustomer?.()}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add First Customer
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
