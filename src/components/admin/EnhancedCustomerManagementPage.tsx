import { useState, useMemo } from 'react';
import { useCustomerManagement } from '@/hooks/useCustomerManagement';
import { CustomerMetrics } from './CustomerMetrics';
import { CustomerQuickFilters } from './CustomerQuickFilters';
import { CompactCustomerListItem } from './CompactCustomerListItem';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Loader2,
  Users,
  Search,
  Download,
  Filter,
  UserPlus,
  BarChart3,
  Package
} from 'lucide-react';
import { CustomerStats } from './CustomerStats';
import { CustomerActivityTimeline } from './CustomerActivityTimeline';
import { H1, H2, Body, BodySmall } from '@/components/ui/typography';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const EnhancedCustomerManagementPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  const { toast } = useToast();

  const { customers, isLoading, updateCodMutation, updateNotesMutation, updateProfileMutation } =
    useCustomerManagement();

  // Apply quick filters to customers
  const applyQuickFilter = (filter: string) => {
    setQuickFilter(filter);
    
    // Reset other filters when using quick filters
    setStatusFilter('all');
    setCountryFilter('all');
    setDateFilter('all');
    setSearchQuery('');
  };

  // Enhanced filtering with quick filter support
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];

    return customers.filter((customer) => {
      // Apply quick filters first
      if (quickFilter !== 'all') {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        
        switch (quickFilter) {
          case 'active':
            if (!customer.cod_enabled) return false;
            break;
          case 'inactive':
            if (customer.cod_enabled) return false;
            break;
          case 'vip':
            if (!customer.internal_notes?.includes('VIP')) return false;
            break;
          case 'new_this_week':
            if (new Date(customer.created_at) < weekAgo) return false;
            break;
          case 'new_this_month':
            if (new Date(customer.created_at) < monthAgo) return false;
            break;
          case 'with_addresses':
            if (!customer.user_addresses || customer.user_addresses.length === 0) return false;
            break;
          case 'recent_activity':
            if (new Date(customer.created_at) < weekAgo) return false;
            break;
        }
      }

      // Search filter
      const matchesSearch =
        (customer.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && !customer.cod_enabled) return false;
        if (statusFilter === 'inactive' && customer.cod_enabled) return false;
        if (statusFilter === 'vip' && !customer.internal_notes?.includes('VIP')) return false;
      }

      // Country filter
      if (countryFilter !== 'all') {
        const customerCountry = customer.user_addresses[0]?.country;
        if (customerCountry !== countryFilter) return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const customerDate = new Date(customer.created_at);
        const now = new Date();
        const startDate = new Date();

        switch (dateFilter) {
          case '7d':
            startDate.setDate(now.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(now.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(now.getDate() - 90);
            break;
        }

        if (customerDate < startDate) return false;
      }

      return true;
    });
  }, [customers, quickFilter, searchQuery, statusFilter, countryFilter, dateFilter]);

  // Get customer analytics
  const { data: customerAnalytics } = useQuery({
    queryKey: ['customer-analytics'],
    queryFn: async () => {
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('*')
        .not('final_total', 'is', null);

      if (error) throw error;

      // Calculate customer metrics
      const customerMetrics =
        customers?.map((customer) => {
          const customerQuotes = quotes?.filter((q) => q.user_id === customer.id) || [];
          const totalSpent = customerQuotes.reduce((sum, q) => sum + (q.final_total || 0), 0);
          const orderCount = customerQuotes.filter((q) =>
            ['paid', 'ordered', 'shipped', 'completed'].includes(q.status),
          ).length;
          const quoteCount = customerQuotes.length;
          const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

          return {
            customerId: customer.id,
            totalSpent,
            orderCount,
            quoteCount,
            avgOrderValue,
            lastActivity:
              customerQuotes.length > 0
                ? new Date(Math.max(...customerQuotes.map((q) => new Date(q.created_at).getTime())))
                : new Date(customer.created_at),
          };
        }) || [];

      return customerMetrics;
    },
    enabled: !!customers,
  });

  // Handler for COD updates
  const handleUpdateCod = (userId: string, codEnabled: boolean) => {
    updateCodMutation.mutate({ userId, codEnabled });
  };

  // Export functionality
  const exportCustomers = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'ID,Name,Email,Location,Join Date,Total Spent,Orders,Avg Order Value,Status\n' +
      filteredCustomers
        .map((customer) => {
          const analytics = customerAnalytics?.find((a) => a.customerId === customer.id);
          const status = customer.internal_notes?.includes('VIP')
            ? 'VIP'
            : customer.cod_enabled
              ? 'Active'
              : 'Inactive';
          return `${customer.id},"${customer.full_name || 'N/A'}","${customer.email}","${customer.user_addresses[0]?.city || 'N/A'}, ${customer.user_addresses[0]?.country || 'N/A'}","${new Date(customer.created_at).toLocaleDateString()}","${analytics?.totalSpent || 0}","${analytics?.orderCount || 0}","${analytics?.avgOrderValue || 0}","${status}"`;
        })
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'customers_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Successful',
      description: `${filteredCustomers.length} customers exported to CSV`,
    });
  };

  // Get unique countries for filter
  const uniqueCountries = useMemo(() => {
    if (!customers) return [];
    const countries = new Set<string>();
    customers.forEach((customer) => {
      customer.user_addresses.forEach((address) => {
        if (address.country) countries.add(address.country);
      });
    });
    return Array.from(countries).sort();
  }, [customers]);

  // Handle customer selection
  const handleSelectCustomer = (customerId: string, selected: boolean) => {
    if (selected) {
      setSelectedCustomers([...selectedCustomers, customerId]);
    } else {
      setSelectedCustomers(selectedCustomers.filter(id => id !== customerId));
    }
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/40">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
          </div>
          <CustomerMetrics customers={[]} customerAnalytics={[]} isLoading={true} />
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <Body className="text-gray-600">Loading customers...</Body>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/40">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <H1 className="text-gray-900">Customer Management</H1>
                <BodySmall className="text-gray-600">Manage your customer base and relationships</BodySmall>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
              <Button 
                onClick={exportCustomers} 
                variant="outline" 
                size="sm" 
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Metrics Dashboard */}
        <CustomerMetrics 
          customers={customers || []} 
          customerAnalytics={customerAnalytics || []} 
          isLoading={isLoading} 
        />

        {/* Main Content Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <H2 className="text-gray-900">Customers</H2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
            </div>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
              />
            </div>

            {/* Quick Filters */}
            <CustomerQuickFilters
              activeFilter={quickFilter}
              onFilterChange={applyQuickFilter}
              customers={customers || []}
            />
          </div>

          {/* Advanced Filters (Collapsible) */}
          <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <CollapsibleContent>
              <div className="px-6 pb-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] border-gray-300">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger className="w-[180px] border-gray-300">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {uniqueCountries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[180px] border-gray-300">
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Content */}
          <div className="p-6">
            {filteredCustomers && filteredCustomers.length > 0 ? (
              <div className="space-y-3">
                {filteredCustomers.map((customer) => (
                  <CompactCustomerListItem
                    key={customer.id}
                    customer={customer}
                    analytics={customerAnalytics?.find(a => a.customerId === customer.id)}
                    isSelected={selectedCustomers.includes(customer.id)}
                    onSelect={handleSelectCustomer}
                    onUpdateCod={handleUpdateCod}
                    onUpdateNotes={updateNotesMutation.mutate}
                    onUpdateName={(userId, name) =>
                      updateProfileMutation.mutate({ userId, fullName: name })
                    }
                    isUpdating={
                      updateCodMutation.isPending ||
                      updateNotesMutation.isPending ||
                      updateProfileMutation.isPending
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <H2 className="text-gray-900 mb-2">No customers found</H2>
                <Body className="text-gray-600 mb-6">
                  {searchQuery ||
                  statusFilter !== 'all' ||
                  countryFilter !== 'all' ||
                  dateFilter !== 'all' ||
                  quickFilter !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'Customers will appear here when users sign up.'}
                </Body>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};