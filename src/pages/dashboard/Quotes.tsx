import React, { useState, useMemo } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { Link } from 'react-router-dom';
import {
  Package,
  Search,
  Filter,
  ArrowLeft,
  Plus,
  Calendar,
  Globe,
  DollarSign,
  ShoppingCart,
  Eye,
} from 'lucide-react';
import { useDashboardState } from '@/hooks/useDashboardState';
import { useAllCountries } from '@/hooks/useAllCountries';
import { useQuoteCurrency } from '@/hooks/useCurrency';
import { useQuoteState } from '@/hooks/useQuoteState';
import { useCartStore } from '@/stores/cartStore';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { getQuoteRouteCountries } from '@/lib/route-specific-customs';
import { ShippingRouteDisplay } from '@/components/shared/ShippingRouteDisplay';
import { userActivityService, ACTIVITY_TYPES } from '@/services/UserActivityService';

// AddToCartButton component
const AddToCartButton = ({ quoteId, className = '' }: { quoteId: string; className?: string }) => {
  const { addToCart } = useQuoteState(quoteId);

  const handleAddToCart = async () => {
    // Track add to cart activity
    await userActivityService.trackQuoteActivity(ACTIVITY_TYPES.PRODUCT_ADD_TO_CART, quoteId, {
      action: 'add_to_cart',
      source: 'quotes_page',
    });

    await addToCart();
  };

  return (
    <Button
      size="sm"
      className={`flex items-center gap-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 ${className}`}
      onClick={handleAddToCart}
    >
      <ShoppingCart className="h-3 w-3" />
      Add to Cart
    </Button>
  );
};

interface DeliveryEstimate {
  label: string;
  days: string;
  origin: string;
  destination: string;
}

interface Country {
  code: string;
  name: string;
}

// QuoteCard component with proper currency conversion
const QuoteCard = ({
  quote,
  deliveryEstimate,
  countries,
  isQuoteInCart,
}: {
  quote: Tables<'quotes'> & { quote_items?: Tables<'quote_items'>[] };
  deliveryEstimate: DeliveryEstimate | undefined;
  countries: Country[] | undefined;
  isQuoteInCart: (quoteId: string) => boolean;
}) => {
  const { formatAmount } = useQuoteCurrency(quote);
  const { getStatusConfig } = useStatusManagement();

  const numberOfItems = Array.isArray(quote.quote_items) ? quote.quote_items.length : 1;
  const firstItem =
    Array.isArray(quote.quote_items) && quote.quote_items.length > 0 ? quote.quote_items[0] : null;

  // Get origin country name for fallback display
  const originCountry = quote.origin_country || quote.destination_country || 'US';
  const originCountryName = Array.isArray(countries) 
    ? countries.find((c) => c.code === originCountry)?.name || originCountry
    : originCountry;
  const fallbackName = `${originCountryName} Quote`;

  // Check if quote can be added to cart based on status configuration
  const statusConfig = getStatusConfig(quote.status, 'quote');
  const canAddToCart = statusConfig?.allowCartActions ?? quote.status === 'approved'; // fallback to hardcoded

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md hover:border-gray-200 transition-all duration-200">
      {/* Mobile Layout */}
      <div className="block sm:hidden">
        {/* Header with Product Name and Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {quote.product_name || firstItem?.product_name || fallbackName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={quote.status} category="quote" />
              {isQuoteInCart(quote.id) && (
                <Badge variant="secondary" className="text-xs">
                  In Cart
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="text-lg font-bold text-green-600">
            {formatAmount(quote.final_total_usd)}
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
            {deliveryEstimate?.origin && deliveryEstimate?.destination ? (
              <ShippingRouteDisplay
                origin={deliveryEstimate.origin}
                destination={deliveryEstimate.destination}
                className="truncate"
                showIcon={false}
              />
            ) : (
              <span className="truncate">—</span>
            )}
          </div>
        </div>

        {/* Delivery Estimate */}
        {deliveryEstimate && (
          <div className="mb-4 p-3 bg-teal-50 rounded-lg border border-teal-100">
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="h-3 w-3 text-teal-500" />
              <span className="text-teal-700 font-medium">
                Delivery: {deliveryEstimate.label} ({deliveryEstimate.days.replace('d', ' days')})
              </span>
            </div>
          </div>
        )}

        {/* Expiry Date */}
        {quote.expires_at && (
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 border border-red-100 text-red-700 font-medium">
              <Calendar className="h-3 w-3 text-red-400" />
              Expires:{' '}
              {new Date(quote.expires_at).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
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
          {canAddToCart && !isQuoteInCart(quote.id) && (
            <AddToCartButton quoteId={quote.id} className="flex-1" />
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-6 flex-1 min-w-0">
          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {quote.product_name || firstItem?.product_name || fallbackName}
              </h3>
              <div className="flex items-center gap-2">
                <StatusBadge status={quote.status} category="quote" />
                {isQuoteInCart(quote.id) && (
                  <Badge variant="secondary" className="text-xs">
                    In Cart
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3 text-gray-400" />
                {numberOfItems} item{numberOfItems !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-gray-400" />
                {new Date(quote.created_at).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3 text-gray-400" />
                {deliveryEstimate?.origin && deliveryEstimate?.destination ? (
                  <ShippingRouteDisplay
                    origin={deliveryEstimate.origin}
                    destination={deliveryEstimate.destination}
                    showIcon={false}
                  />
                ) : (
                  <span>—</span>
                )}
              </span>
            </div>
          </div>

          {/* Price and Actions */}
          <div className="flex items-center gap-3 ml-4">
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">
                {formatAmount(quote.final_total_usd)}
              </div>
            </div>
            <StatusBadge status={quote.status} category="quote" />
            <Link to={`/dashboard/quotes/${quote.id}`}>
              <Button variant="outline" size="sm" className="h-9">
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            </Link>
            {canAddToCart && !isQuoteInCart(quote.id) && <AddToCartButton quoteId={quote.id} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Quotes() {
  const {
    quotes,
    isLoading,
    filteredQuotes,
    searchTerm,
    setSearchTerm,
    handleSearchChange,
    isSearching,
  } = useDashboardState();

  const { data: countries } = useAllCountries();
  const { quoteStatuses } = useStatusManagement();
  // formatAmount will be handled per quote with useQuoteCurrency
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deliveryEstimates, setDeliveryEstimates] = useState<Record<string, DeliveryEstimate>>({});

  // Subscribe to cart store to make quotes list reactive to cart changes
  const cartItems = useCartStore((state) => state.items);

  // Helper function to check if a quote is in cart
  const isQuoteInCart = (quoteId: string) => {
    return cartItems.some((item) => item.quoteId === quoteId);
  };

  // Filter quotes by status
  const statusFilteredQuotes = useMemo(() => {
    if (statusFilter === 'all') return filteredQuotes;
    return filteredQuotes.filter((quote) => quote.status === statusFilter);
  }, [filteredQuotes, statusFilter]);

  // Calculate delivery estimates when quotes change
  React.useEffect(() => {
    const calculateDeliveryEstimates = async () => {
      const estimates: Record<string, DeliveryEstimate> = {};

      for (const quote of statusFilteredQuotes) {
        try {
          // Get shipping route data
          let shippingRoute: Tables<'shipping_routes'> | null = null;
          if (quote.shipping_route_id) {
            const { data } = await supabase
              .from('shipping_routes')
              .select('*')
              .eq('id', quote.shipping_route_id)
              .maybeSingle();
            shippingRoute = data;
          }

          // Fallback if no shipping route
          if (!shippingRoute) {
            shippingRoute = {
              id: 'fallback',
              origin_country: quote.destination_country || 'US',
              destination_country: 'US',
              processing_days: 2,
              customs_clearance_days: 3,
              delivery_options: [
                {
                  id: 'default',
                  name: 'Standard Delivery',
                  min_days: 7,
                  max_days: 14,
                  cost: 0,
                },
              ],
            };
          }

          // Get delivery options
          let options = shippingRoute.delivery_options || [];
          const enabledOptions = Array.isArray(quote.enabled_delivery_options)
            ? quote.enabled_delivery_options
            : [];
          if (enabledOptions.length > 0) {
            options = options.filter((opt) => enabledOptions.includes(opt.id));
          }

          const option = options[0] || {
            id: 'default',
            name: 'Standard Delivery',
            min_days: 7,
            max_days: 14,
            cost: 0,
          };

          // Calculate window
          let startDate: Date = new Date();
          // @ts-expect-error - payment_date might exist on extended quote type
          if (typeof quote.payment_date === 'string' && quote.payment_date) {
            // @ts-expect-error - payment_date property access on extended quote type
            startDate = new Date(quote.payment_date);
          } else if (typeof quote.created_at === 'string' && quote.created_at) {
            startDate = new Date(quote.created_at);
          }

          const minDays =
            (shippingRoute.processing_days || 0) +
            (shippingRoute.customs_clearance_days || 0) +
            (option.min_days || 0);
          const maxDays =
            (shippingRoute.processing_days || 0) +
            (shippingRoute.customs_clearance_days || 0) +
            (option.max_days || 0);

          const minDate = new Date(startDate);
          minDate.setDate(minDate.getDate() + minDays);
          const maxDate = new Date(startDate);
          maxDate.setDate(maxDate.getDate() + maxDays);

          const formatDate = (d: Date) =>
            d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          // Get proper route display using the shared utilities
          const shippingAddress = quote.shipping_address
            ? typeof quote.shipping_address === 'string'
              ? JSON.parse(quote.shipping_address)
              : quote.shipping_address
            : null;
          const fetchRouteById = async (routeId: string) => {
            const { data } = await supabase
              .from('shipping_routes')
              .select('origin_country, destination_country')
              .eq('id', routeId)
              .maybeSingle();
            return data;
          };

          const { origin, destination } = await getQuoteRouteCountries(
            quote,
            shippingAddress,
            countries,
            fetchRouteById,
            null,
            null,
          );

          estimates[quote.id] = {
            label: `${formatDate(minDate)}-${formatDate(maxDate)}`,
            days: `${minDays}-${maxDays}d`,
            origin,
            destination,
          };
        } catch (error) {
          console.error('Error calculating delivery estimate for quote:', quote.id, error);
        }
      }

      setDeliveryEstimates(estimates);
    };

    if (statusFilteredQuotes.length > 0) {
      calculateDeliveryEstimates();
    }
  }, [statusFilteredQuotes, countries]);

  const getDisplayStatus = (status: string) => {
    // For quotes, we now use only the status field
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
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Dashboard</span>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Quotes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your quote requests and manage your orders
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search quotes by product name or quote ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white"
            disabled={isSearching}
          />
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {(quoteStatuses || [])
                .filter((status) => status.isActive && status.showInCustomerView)
                .sort((a, b) => a.order - b.order)
                .map((status) => (
                  <SelectItem key={status.name} value={status.name}>
                    {status.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Link to="/quote">
            <Button className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 shadow-lg">
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">New Quote</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Quotes List */}
      <div className="space-y-3 sm:space-y-4">
        {statusFilteredQuotes.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No quotes found</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? "Try adjusting your search or filters to find what you're looking for"
                : 'Get started by requesting your first quote to see it here'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link to="/quote">
                <Button className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 shadow-lg">
                  Request Your First Quote
                </Button>
              </Link>
            )}
          </div>
        ) : (
          statusFilteredQuotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              deliveryEstimate={deliveryEstimates[quote.id]}
              countries={countries}
              isQuoteInCart={isQuoteInCart}
            />
          ))
        )}
      </div>
    </div>
  );
}
