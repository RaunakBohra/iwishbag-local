import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, Filter, ArrowLeft, Plus, Calendar, Globe, DollarSign, ShoppingCart, Eye } from 'lucide-react';
import { useDashboardState } from '@/hooks/useDashboardState';
import { useAllCountries } from '@/hooks/useAllCountries';
import { useUserCurrency } from '@/hooks/useUserCurrency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatShippingRoute } from '@/lib/countryUtils';
import { getQuoteRouteCountries } from '@/lib/route-specific-customs';

export default function Quotes() {
  const {
    quotes,
    isLoading,
    searchTerm,
    handleSearchChange,
    isSearching,
  } = useDashboardState();

  const { data: countries } = useAllCountries();
  const { formatAmount } = useUserCurrency();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deliveryEstimates, setDeliveryEstimates] = useState<Record<string, any>>({});

  // Filter quotes based on status and search
  const filteredQuotes = quotes?.filter(quote => {
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending' && quote.status !== 'pending') return false;
      if (statusFilter === 'sent' && quote.status !== 'sent') return false;
      if (statusFilter === 'approved' && quote.approval_status !== 'approved') return false;
      if (statusFilter === 'rejected' && quote.status !== 'rejected') return false;
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const productMatch = quote.product_name?.toLowerCase().includes(searchLower);
      const productUrlMatch = quote.product_url?.toLowerCase().includes(searchLower);
      const quoteIdMatch = quote.display_id?.toLowerCase().includes(searchLower);
      
      // Get country name for search
      const countryName = countries?.find(c => c.code === quote.country_code)?.name;
      const countryMatch = countryName?.toLowerCase().includes(searchLower);
      
      if (!productMatch && !productUrlMatch && !quoteIdMatch && !countryMatch) return false;
    }
    
    return true;
  }) || [];

  // Calculate delivery estimates for all quotes
  useMemo(() => {
    const calculateDeliveryEstimates = async () => {
      const estimates: Record<string, any> = {};
      
      for (const quote of filteredQuotes) {
        try {
          let shippingRoute = null;
          
          // Try to fetch by shipping_route_id if present
          if (quote.shipping_route_id) {
            const { data: routeById } = await supabase
              .from('shipping_routes')
              .select('*')
              .eq('id', quote.shipping_route_id)
              .maybeSingle();
            if (routeById) shippingRoute = routeById;
          }
          
          // Fallback to origin/destination matching
          if (!shippingRoute) {
            const originCountry = quote.origin_country || 'US';
            const destinationCountry = quote.country_code;
            const { data: routeData } = await supabase
              .from('shipping_routes')
              .select('*')
              .eq('origin_country', originCountry)
              .eq('destination_country', destinationCountry)
              .eq('is_active', true)
              .maybeSingle();
            if (routeData) shippingRoute = routeData;
          }
          
          // Fallback to any route for destination
          if (!shippingRoute) {
            const { data: fallbackRoute } = await supabase
              .from('shipping_routes')
              .select('*')
              .eq('destination_country', quote.country_code)
              .eq('is_active', true)
              .maybeSingle();
            if (fallbackRoute) shippingRoute = fallbackRoute;
          }
          
          // Default route if still not found
          if (!shippingRoute) {
            shippingRoute = {
              processing_days: 2,
              customs_clearance_days: 3,
              delivery_options: [
                { id: 'default', name: 'Standard Delivery', min_days: 7, max_days: 14, cost: 0 }
              ]
            };
          }
          
          // Get delivery options
          let options = shippingRoute.delivery_options || [];
          const enabledOptions = Array.isArray(quote.enabled_delivery_options) ? quote.enabled_delivery_options : [];
          if (enabledOptions.length > 0) {
            options = options.filter((opt: any) => enabledOptions.includes(opt.id));
          }
          
          const option = options[0] || {
            id: 'default',
            name: 'Standard Delivery',
            min_days: 7,
            max_days: 14,
            cost: 0
          };
          
          // Calculate window
          let startDate: Date = new Date();
          if (typeof (quote as any).payment_date === 'string' && (quote as any).payment_date) {
            startDate = new Date((quote as any).payment_date);
          } else if (typeof quote.created_at === 'string' && quote.created_at) {
            startDate = new Date(quote.created_at);
          }
          
          const minDays = (shippingRoute.processing_days || 0) + (shippingRoute.customs_clearance_days || 0) + (option.min_days || 0);
          const maxDays = (shippingRoute.processing_days || 0) + (shippingRoute.customs_clearance_days || 0) + (option.max_days || 0);
          
          const minDate = new Date(startDate); minDate.setDate(minDate.getDate() + minDays);
          const maxDate = new Date(startDate); maxDate.setDate(maxDate.getDate() + maxDays);
          
          const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          
          // Get proper route display using the shared utilities
          const shippingAddress = quote.shipping_address ? (typeof quote.shipping_address === 'string' ? JSON.parse(quote.shipping_address) : quote.shipping_address) : null;
          const fetchRouteById = async (routeId: string) => {
            const { data } = await supabase
              .from('shipping_routes')
              .select('origin_country, destination_country')
              .eq('id', routeId)
              .maybeSingle();
            return data;
          };
          
          const { origin, destination } = await getQuoteRouteCountries(quote, shippingAddress, countries, fetchRouteById);
          const routeDisplay = formatShippingRoute(origin, destination, countries, false);
          
          estimates[quote.id] = {
            label: `${formatDate(minDate)}-${formatDate(maxDate)}`,
            days: `${minDays}-${maxDays}d`,
            routeDisplay: routeDisplay
          };
        } catch (error) {
          console.error('Error calculating delivery estimate for quote:', quote.id, error);
        }
      }
      
      setDeliveryEstimates(estimates);
    };
    
    if (filteredQuotes.length > 0) {
      calculateDeliveryEstimates();
    }
  }, [filteredQuotes, countries]);

  const getStatusColor = (status: string, approvalStatus?: string) => {
    if (approvalStatus === 'approved') return 'bg-green-100 text-green-800';
    if (status === 'rejected') return 'bg-red-100 text-red-800';
    if (status === 'sent') return 'bg-blue-100 text-blue-800';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string, approvalStatus?: string) => {
    if (approvalStatus === 'approved') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    if (status === 'sent') return 'Sent';
    if (status === 'pending') return 'Pending';
    return status;
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 sm:py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6">
        <Link to="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Dashboard</span>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">My Quotes</h1>
          <p className="text-gray-500 text-xs sm:text-sm">Manage and track your quote requests</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-2xl shadow-lg border border-gray-200/50 p-5 sm:p-6 mb-6 backdrop-blur-sm">
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
            </div>
            <Input
              placeholder="Search quotes by product name or ID..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-12 h-14 text-base bg-white/80 backdrop-blur-sm border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            />
          </div>
          
          {/* Filter Dropdown */}
          <div className="relative">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-14 text-base bg-white/80 backdrop-blur-sm border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-sm border-gray-200 rounded-xl shadow-xl">
                <SelectItem value="all" className="hover:bg-blue-50 rounded-lg mx-2 my-1">All Statuses</SelectItem>
                <SelectItem value="pending" className="hover:bg-yellow-50 rounded-lg mx-2 my-1">Pending</SelectItem>
                <SelectItem value="sent" className="hover:bg-blue-50 rounded-lg mx-2 my-1">Sent</SelectItem>
                <SelectItem value="approved" className="hover:bg-green-50 rounded-lg mx-2 my-1">Approved</SelectItem>
                <SelectItem value="rejected" className="hover:bg-red-50 rounded-lg mx-2 my-1">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Quotes List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredQuotes.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No quotes found</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters to find what you\'re looking for'
                : 'Get started by requesting your first quote to see it here'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link to="/quote">
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg">
                  Request Your First Quote
                </Button>
              </Link>
            )}
          </div>
        ) : (
          filteredQuotes.map((quote) => {
            const deliveryEstimate = deliveryEstimates[quote.id];
            const numberOfItems = Array.isArray(quote.quote_items) 
              ? quote.quote_items.length 
              : 1;
            const firstItem = Array.isArray(quote.quote_items) && quote.quote_items.length > 0 
              ? quote.quote_items[0] 
              : null;
            
            // Get origin country name for fallback display
            const originCountry = quote.origin_country || quote.country_code || 'US';
            const originCountryName = countries?.find(c => c.code === originCountry)?.name || originCountry;
            const fallbackName = `${originCountryName} Quote`;
            
            return (
              <div key={quote.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md hover:border-gray-200 transition-all duration-200">
                {/* Mobile Layout */}
                <div className="block sm:hidden">
                  {/* Header with Product Name and Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                                              <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-base truncate">
                            {firstItem?.product_name || quote.product_name || fallbackName}
                            {numberOfItems > 1 && (
                              <span className="text-xs text-gray-500 ml-1">+{numberOfItems - 1} more</span>
                            )}
                          </h3>
                        </div>
                      <p className="text-gray-500 text-xs">
                        Quote #{quote.display_id || quote.id.slice(0, 8)}
                      </p>
                    </div>
                    <Badge className={`${getStatusColor(quote.status, quote.approval_status)} text-xs px-2 py-1`}>
                      {getStatusLabel(quote.status, quote.approval_status)}
                    </Badge>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="text-lg font-bold text-green-600">
                      {formatAmount(quote.final_total)}
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span>{new Date(quote.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Globe className="h-3 w-3 text-gray-400" />
                      <span className="truncate">{deliveryEstimate?.routeDisplay || '—'}</span>
                    </div>
                  </div>

                  {/* Delivery Estimate */}
                  {deliveryEstimate && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar className="h-3 w-3 text-blue-500" />
                        <span className="text-blue-700 font-medium">
                          Delivery: {deliveryEstimate.label} ({deliveryEstimate.days.replace('d', ' days')})
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link to={`/dashboard/quotes/${quote.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full h-10 text-sm">
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </Link>
                    {quote.approval_status === 'approved' && !quote.in_cart && (
                      <Link to={`/checkout/${quote.id}`} className="flex-1">
                        <Button size="sm" className="w-full h-10 text-sm bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Add to Cart
                        </Button>
                      </Link>
                    )}
                    {quote.approval_status === 'approved' && quote.in_cart && (
                      <Link to="/dashboard/cart" className="flex-1">
                        <Button size="sm" variant="secondary" className="w-full h-10 text-sm">
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          In Cart
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:block">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      {/* Top Row: Product Name + Status + Price */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg truncate">
                              {firstItem?.product_name || quote.product_name || fallbackName}
                              {numberOfItems > 1 && (
                                <span className="text-sm text-gray-500 ml-1">+{numberOfItems - 1} more</span>
                              )}
                            </h3>
                          </div>
                          <p className="text-gray-500 text-sm">
                            Quote #{quote.display_id || quote.id.slice(0, 8)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              {formatAmount(quote.final_total)}
                            </div>
                          </div>
                          <Badge className={getStatusColor(quote.status, quote.approval_status)}>
                            {getStatusLabel(quote.status, quote.approval_status)}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Bottom Row: Created Date + Route + Delivery Estimate + Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm">
                          {/* Created Date */}
                          <div className="text-gray-500">
                            {new Date(quote.created_at).toLocaleDateString()}
                          </div>
                          
                          {/* Route */}
                          <div className="flex items-center gap-1">
                            <Globe className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">
                              {deliveryEstimate?.routeDisplay || '—'}
                            </span>
                          </div>
                          
                          {/* Delivery Estimate */}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <span className="text-gray-600">
                              Delivery: {deliveryEstimate ? deliveryEstimate.label : '—'}
                            </span>
                            {deliveryEstimate && (
                              <span className="text-sm text-gray-600">({deliveryEstimate.days.replace('d', ' days')})</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link to={`/dashboard/quotes/${quote.id}`}>
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                          </Link>
                          {quote.approval_status === 'approved' && !quote.in_cart && (
                            <Link to={`/checkout/${quote.id}`}>
                              <Button size="sm" className="flex items-center gap-1">
                                <ShoppingCart className="h-3 w-3" />
                                Add to Cart
                              </Button>
                            </Link>
                          )}
                          {quote.approval_status === 'approved' && quote.in_cart && (
                            <Link to="/dashboard/cart">
                              <Button size="sm" variant="secondary" className="flex items-center gap-1">
                                <ShoppingCart className="h-3 w-3" />
                                In Cart
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
} 