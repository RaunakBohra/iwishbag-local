import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Package,
  MapPin,
  Clock,
  User,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  MessageCircle,
  Loader2,
  AlertTriangle,
  Truck,
  FileText,
  CreditCard,
  ShoppingCart,
  Eye,
  CheckCircle2,
  Shield,
  Lock,
  Monitor,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/stores/cartStore';
import { useQuoteDisplayCurrency } from '@/hooks/useQuoteDisplayCurrency';
import type { UnifiedQuote } from '@/types/unified-quote';

// Clean, minimal quote detail page following Amazon/Stripe design principles
interface UnifiedQuotePageProps {
  mode?: 'view' | 'edit';
}

const UnifiedQuotePage: React.FC<UnifiedQuotePageProps> = ({ mode = 'view' }) => {
  const { id: quoteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: isAdmin } = useAdminRole();
  const queryClient = useQueryClient();
  const { addItem: addToCart } = useCartStore();

  // Simple state management
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Determine view mode
  const viewMode = isAdmin ? 'admin' : user ? 'customer' : 'guest';

  // Fetch quote data with optimized caching - must be declared before useEffects that reference it
  const {
    data: quote,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: async () => {
      if (!quoteId) throw new Error('No quote ID provided');

      const { data, error } = await supabase.from('quotes').select('*').eq('id', quoteId).single();

      if (error) throw error;
      return data as UnifiedQuote;
    },
    enabled: !!quoteId,
    staleTime: 5 * 60 * 1000, // 5 minutes - quote data is relatively stable
    gcTime: 15 * 60 * 1000, // 15 minutes - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on window focus for better UX
    refetchOnMount: false, // Use cached data if available and not stale
    retry: 2, // Retry failed requests twice
  });

  // Get currency display formatting for user's preferred currency
  const { formatPrice, formatPriceWithUSD, displayCurrency, isLoadingCurrency } = useQuoteDisplayCurrency(quote || {} as UnifiedQuote);

  // Performance monitoring - now quote is defined
  React.useEffect(() => {
    if (quote && !isLoading) {
      // Mark when quote details are fully loaded
      performance.mark('quote-detail-loaded');

      // Measure time from navigation start
      if (performance.getEntriesByName('quote-detail-start').length > 0) {
        performance.measure('quote-detail-load-time', 'quote-detail-start', 'quote-detail-loaded');
        const measure = performance.getEntriesByName('quote-detail-load-time')[0];

        // Log performance metrics (only in development)
        if (import.meta.env.DEV) {
          console.log(`📊 Quote detail loaded in ${measure.duration.toFixed(2)}ms`);
        }
      }
    }
  }, [quote, isLoading]);

  // Mark component mount for performance tracking
  React.useEffect(() => {
    performance.mark('quote-detail-start');

    return () => {
      // Cleanup performance entries on unmount
      performance.clearMarks('quote-detail-start');
      performance.clearMarks('quote-detail-loaded');
      performance.clearMeasures('quote-detail-load-time');
    };
  }, []);

  // Prefetch related data for better perceived performance
  React.useEffect(() => {
    if (quote && user) {
      // Prefetch quotes list when user might navigate back
      queryClient.prefetchQuery({
        queryKey: ['quotes', user.id],
        queryFn: async () => {
          const { data } = await supabase
            .from('quotes')
            .select('id, display_id, status, created_at, final_total_usd')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);
          return data || [];
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
      });
    }
  }, [quote, user, queryClient]);

  // Optimized action handler with optimistic updates
  const handleAction = async (action: 'approve' | 'reject') => {
    if (!quote) {
      console.error('No quote data available');
      toast.error('Quote data not available. Please refresh the page.');
      return;
    }

    if (!user) {
      console.error('User not authenticated');
      toast.error('Please log in to perform this action.');
      return;
    }

    console.log('Attempting to', action, 'quote:', quote.id, 'Current status:', quote.status);

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    setActionLoading(action);

    // Optimistic update - immediately update UI
    queryClient.setQueryData(['quote', quoteId], (oldData: UnifiedQuote | undefined) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
    });

    try {
      // Perform actual database update with user context
      const { error } = await supabase
        .from('quotes')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quote.id)
        .eq('user_id', user.id); // Ensure user owns this quote

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      toast.success(`Quote ${action}d successfully!`);

      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
    } catch (error) {
      console.error(`Failed to ${action} quote:`, error);
      
      // More specific error messages
      if (error.code === 'PGRST116') {
        toast.error('You do not have permission to modify this quote.');
      } else if (error.code === 'PGRST301') {
        toast.error('Quote not found or access denied.');
      } else {
        toast.error(`Failed to ${action} quote. Please try again.`);
      }

      // Revert optimistic update on error
      queryClient.setQueryData(['quote', quoteId], quote);
    } finally {
      setActionLoading(null);
    }
  };

  // Stripe-style status badge
  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'text-amber-600 bg-amber-50 border-amber-200',
      sent: 'text-blue-600 bg-blue-50 border-blue-200',
      approved: 'text-green-600 bg-green-50 border-green-200',
      rejected: 'text-red-600 bg-red-50 border-red-200',
      paid: 'text-purple-600 bg-purple-50 border-purple-200',
      ordered: 'text-orange-600 bg-orange-50 border-orange-200',
      shipped: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      completed: 'text-green-600 bg-green-50 border-green-200',
    };
    return colors[status] || colors['pending'];
  };

  // Loading state - skeleton loader for better perceived performance
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header skeleton */}
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="lg:grid lg:grid-cols-3 lg:gap-8 lg:space-y-0 space-y-4">
            {/* Left column skeleton */}
            <div className="lg:col-span-2 space-y-4">
              {/* Product card skeleton */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Price card skeleton */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="h-6 w-1/3 bg-gray-200 rounded animate-pulse mb-4"></div>
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping card skeleton */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column skeleton */}
            <div className="lg:col-span-1 space-y-4">
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state - clean and helpful
  if (error || !quote) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Quote Not Found</h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error
              ? error.message
              : "This quote doesn't exist or you don't have permission to view it."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
            <Button onClick={() => navigate('/dashboard/quotes')}>Back to Quotes</Button>
          </div>
        </div>
      </div>
    );
  }

  // Get first item for display - items are stored as JSONB array
  const firstItem = Array.isArray(quote.items) ? quote.items[0] : null;
  const canTakeAction = viewMode === 'customer' && ['sent'].includes(quote.status);

  // Debug logging for action availability
  if (import.meta.env.DEV) {
    console.log('Action Debug:', {
      viewMode,
      isAdmin,
      user: !!user,
      quoteStatus: quote.status,
      canTakeAction,
      quoteId: quote.id,
      userId: user?.id,
      quoteUserId: quote.user_id
    });
  }

  // Get customer information from various sources
  const customerInfo = {
    name:
      quote.customer_data?.info?.name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      'Customer',
    email: quote.customer_data?.info?.email || user?.email || 'Not provided',
    phone: quote.customer_data?.info?.phone || user?.user_metadata?.phone || 'Not provided',
    avatar: quote.customer_data?.profile?.avatar_url || user?.user_metadata?.avatar_url,
  };

  // Get shipping address information
  const shippingAddress = quote.customer_data?.shipping_address || {
    line1: 'Address not provided',
    city: '',
    state: '',
    country: quote.destination_country,
  };

  // Format address for display
  const formattedAddress = [
    shippingAddress.line1,
    shippingAddress.line2,
    [shippingAddress.city, shippingAddress.state].filter(Boolean).join(', '),
    shippingAddress.postal,
    shippingAddress.country,
  ]
    .filter(Boolean)
    .join(', ');

  // Get calculation breakdown - MATCH ADMIN COMPACTCALCULATIONBREAKDOWN EXACTLY
  const breakdown = quote.calculation_data?.breakdown || {};
  const operationalData = quote.operational_data || {};

  // Use exact same field mapping as admin CompactCalculationBreakdown with USD amounts
  const pricingUSD = {
    itemsTotal: Number(breakdown.items_total || 0),
    purchaseTax: Number(breakdown.purchase_tax || 0),
    internationalShipping: Number(breakdown.shipping || 0),
    customs: Number(breakdown.customs || 0),
    destinationTax: Number(breakdown.destination_tax || 0),
    serviceHandling: Number(breakdown.handling || 0),
    insurance: Number(breakdown.insurance || 0),
    paymentFees: Number(breakdown.fees || 0),
    domesticShipping: operationalData.domestic_shipping || 0,
    discount: Number(breakdown.discount || 0),
    finalTotal: quote.final_total_usd || 0,
    // Calculate total taxes using same logic as admin
    totalTaxes:
      Number(breakdown.purchase_tax || 0) +
      Number(breakdown.destination_tax || 0) +
      // Fallback to legacy taxes field if new fields don't exist
      (!breakdown.purchase_tax && !breakdown.destination_tax ? Number(breakdown.taxes || 0) : 0),
    // Calculate total fees using same logic as admin
    totalFees:
      Number(breakdown.fees || 0) +
      Number(breakdown.handling || 0) +
      Number(breakdown.insurance || 0),
  };

  // Get tracking information
  const trackingInfo = {
    iwishTrackingId: quote.iwish_tracking_id,
    trackingStatus: quote.tracking_status || 'pending',
    estimatedDelivery: quote.estimated_delivery_date,
    carrier: quote.shipping_carrier,
    externalTracking: quote.tracking_number,
  };

  // Get delivery estimate from shipping options or operational data
  const deliveryEstimate = operationalData.shipping?.selected_option
    ? operationalData.shipping.available_options?.find(
        (opt) => opt.id === operationalData.shipping.selected_option,
      )?.days || '7-14 business days'
    : '7-14 business days';

  // Status-based layout configuration
  const getQuoteStatusConfig = (status: string) => {
    const configs = {
      pending: {
        title: 'Quote Under Review',
        subtitle: "We're preparing your custom quote",
        primaryAction: null, // No action for customer
        showPricing: false,
        phase: 'preparation',
      },
      sent: {
        title: 'Quote Ready for Review',
        subtitle: 'Please review and approve your quote to proceed',
        primaryAction: 'Approve Quote',
        showPricing: true,
        phase: 'review',
      },
      approved: {
        title: 'Quote Approved - Ready for Payment',
        subtitle: 'Complete your payment to place the order',
        primaryAction: 'Proceed to Payment',
        showPricing: true,
        phase: 'payment',
      },
      paid: {
        title: 'Payment Confirmed - Order Placed',
        subtitle: 'Your order is being processed',
        primaryAction: 'Track Order',
        showPricing: true,
        phase: 'processing',
      },
      shipped: {
        title: 'Order Shipped',
        subtitle: 'Your order is on the way',
        primaryAction: 'Track Package',
        showPricing: true,
        phase: 'shipping',
      },
      rejected: {
        title: 'Quote Declined',
        subtitle: 'Request a new quote or contact support',
        primaryAction: 'Request New Quote',
        showPricing: true,
        phase: 'declined',
      },
    };
    return configs[status] || configs['pending'];
  };

  const statusConfig = getQuoteStatusConfig(quote.status);

  return (
    <div className="min-h-screen bg-white">
      {/* Stripe-style minimal header */}
      <div className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard/quotes')}
                className="text-gray-600 hover:text-gray-900 -ml-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quotes
              </Button>
              <div className="w-px h-6 bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">
                Quote {quote.display_id || quote.id.slice(0, 8)}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={cn('font-medium', getStatusColor(quote.status))}>
                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
              </Badge>
              <Button variant="outline" size="sm" className="text-sm">
                <FileText className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Quote details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quote summary */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{statusConfig.title}</h2>
                  <p className="text-gray-600 mt-1">
                    Created on{' '}
                    {new Date(quote.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatPrice(pricingUSD.finalTotal)}
                  </div>
                  <div className="text-sm text-gray-500">Total amount</div>
                  {pricingUSD.discount > 0 && (
                    <div className="text-sm text-green-600 mt-1">
                      (Saved {formatPrice(pricingUSD.discount)})
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar - Stripe style */}
              <div className="mb-8">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Quote progress</span>
                  <span>
                    {['pending'].includes(quote.status)
                      ? '1'
                      : ['sent'].includes(quote.status)
                        ? '2'
                        : ['approved'].includes(quote.status)
                          ? '3'
                          : '4'}{' '}
                    of 4 steps completed
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: ['pending'].includes(quote.status)
                        ? '25%'
                        : ['sent'].includes(quote.status)
                          ? '50%'
                          : ['approved'].includes(quote.status)
                            ? '75%'
                            : '100%',
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Submitted</span>
                  <span>Prepared</span>
                  <span>Approved</span>
                  <span>Paid</span>
                </div>
              </div>

              {/* Product card */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {firstItem?.image ? (
                      <img
                        src={firstItem.image}
                        alt={firstItem.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-2">
                      {firstItem?.name || 'Product Name Not Available'}
                    </h3>
                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-2">
                      <span>Qty: {firstItem?.quantity || 1}</span>
                      <span>Weight: {firstItem?.weight_kg || 'TBD'} kg</span>
                      <span>From: {quote.origin_country}</span>
                    </div>
                    {firstItem?.options && (
                      <div className="text-xs text-gray-500 mb-2">Options: {firstItem.options}</div>
                    )}
                    {firstItem?.url ? (
                      <Button variant="link" className="p-0 h-auto text-blue-600 text-sm" asChild>
                        <a href={firstItem.url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4 mr-1" />
                          View original product →
                        </a>
                      </Button>
                    ) : (
                      <div className="text-xs text-gray-400">
                        Original product link not available
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      $
                      {typeof firstItem?.price_usd === 'number'
                        ? firstItem.price_usd.toFixed(2)
                        : '0.00'}
                    </div>
                    <div className="text-sm text-gray-500">Product cost</div>
                    {firstItem?.smart_data?.weight_confidence && (
                      <div className="text-xs text-gray-400 mt-1">
                        Weight confidence:{' '}
                        {Math.round(firstItem.smart_data.weight_confidence * 100)}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing breakdown */}
            {statusConfig.showPricing && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Pricing breakdown</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    className="text-blue-600"
                  >
                    {showBreakdown ? 'Hide' : 'Show'} details
                    {showBreakdown ? (
                      <ChevronUp className="h-4 w-4 ml-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </Button>
                </div>

                <div className="border border-gray-200 rounded-lg">
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Product cost</span>
                      <span className="font-medium">{formatPrice(pricingUSD.itemsTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">International shipping</span>
                      <span className="font-medium">
                        {formatPrice(pricingUSD.internationalShipping)}
                      </span>
                    </div>
                    {/* Combined customs & duties (includes customs + taxes + gateway fees) */}
                    {pricingUSD.customs + pricingUSD.totalTaxes + pricingUSD.paymentFees > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Customs & duties</span>
                        <span className="font-medium">
                          {formatPrice(pricingUSD.customs + pricingUSD.totalTaxes + pricingUSD.paymentFees)}
                        </span>
                      </div>
                    )}
                    {/* Show service fees (handling + insurance) if they exist */}
                    {pricingUSD.serviceHandling + pricingUSD.insurance > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service fees</span>
                        <span className="font-medium">
                          {formatPrice(pricingUSD.serviceHandling + pricingUSD.insurance)}
                        </span>
                      </div>
                    )}

                    {showBreakdown && (
                      <div className="pt-4 border-t space-y-3">
                        {pricingUSD.domesticShipping > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Domestic shipping</span>
                            <span className="font-medium">
                              {formatPrice(pricingUSD.domesticShipping)}
                            </span>
                          </div>
                        )}
                        {pricingUSD.serviceHandling > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Handling charge</span>
                            <span className="font-medium">
                              {formatPrice(pricingUSD.serviceHandling)}
                            </span>
                          </div>
                        )}
                        {pricingUSD.insurance > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Package protection</span>
                            <span className="font-medium">{formatPrice(pricingUSD.insurance)}</span>
                          </div>
                        )}
                        {pricingUSD.paymentFees > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Payment gateway fee</span>
                            <span className="font-medium">{formatPrice(pricingUSD.paymentFees)}</span>
                          </div>
                        )}
                        {pricingUSD.discount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600">Discount applied</span>
                            <span className="font-medium text-green-600">
                              -{formatPrice(pricingUSD.discount)}
                            </span>
                          </div>
                        )}
                        <div className="text-sm text-gray-500 space-y-1">
                          <p>• International shipping includes air freight and handling</p>
                          <p>
                            • Customs duties calculated at current rates for{' '}
                            {quote.destination_country}
                          </p>
                          <p>• Service fee covers processing and customer support</p>
                          {trackingInfo.iwishTrackingId && (
                            <p>• Track your order with ID: {trackingInfo.iwishTrackingId}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatPriceWithUSD(pricingUSD.finalTotal)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Quote valid for 30 days</p>
                    {pricingUSD.discount > 0 && (
                      <p className="text-sm text-green-600 mt-1">
                        🎉 You saved {formatPrice(pricingUSD.discount)} with this quote!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Shipping information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping information</h3>
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                      Delivery address
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="font-medium text-gray-900">{customerInfo.name}</div>
                      <div>{formattedAddress}</div>
                      {customerInfo.email !== 'Not provided' && (
                        <div className="text-xs text-blue-600 mt-2">📧 {customerInfo.email}</div>
                      )}
                      {customerInfo.phone !== 'Not provided' && (
                        <div className="text-xs text-blue-600">📞 {customerInfo.phone}</div>
                      )}
                      {shippingAddress.locked && (
                        <div className="text-xs text-amber-600 mt-1">
                          🔒 Address locked after payment
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      Estimated delivery
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="font-medium text-blue-600">
                        {trackingInfo.estimatedDelivery
                          ? new Date(trackingInfo.estimatedDelivery).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : `${deliveryEstimate} after payment`}
                      </div>
                      <div>Express international shipping</div>
                      {trackingInfo.carrier && (
                        <div className="text-xs text-gray-500">Via {trackingInfo.carrier}</div>
                      )}
                      {trackingInfo.iwishTrackingId && (
                        <div className="text-xs font-medium text-purple-600 mt-2">
                          🚚 iwishBag Tracking: {trackingInfo.iwishTrackingId}
                        </div>
                      )}
                      {trackingInfo.externalTracking && (
                        <div className="text-xs text-gray-500">
                          External Tracking: {trackingInfo.externalTracking}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Action card */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quote actions</h3>

              {canTakeAction && (
                <div className="space-y-3">
                  <Button
                    onClick={() => handleAction('approve')}
                    disabled={!!actionLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                    size="lg"
                  >
                    {actionLoading === 'approve' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve quote
                  </Button>

                  <Button
                    onClick={() => handleAction('reject')}
                    disabled={!!actionLoading}
                    variant="outline"
                    className="w-full border-gray-300 hover:bg-gray-50"
                  >
                    {actionLoading === 'reject' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Decline
                  </Button>
                </div>
              )}

              {/* Debug info in development */}
              {import.meta.env.DEV && (
                <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
                  <div><strong>Debug Info:</strong></div>
                  <div>View Mode: {viewMode}</div>
                  <div>Quote Status: {quote.status}</div>
                  <div>Can Take Action: {canTakeAction ? 'Yes' : 'No'}</div>
                  <div>User ID: {user?.id}</div>
                  <div>Quote User ID: {quote.user_id}</div>
                </div>
              )}

              {!canTakeAction && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">{statusConfig.subtitle}</p>
                  {statusConfig.primaryAction && (
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      size="lg"
                      disabled={!!actionLoading}
                      onClick={async () => {
                        switch (quote.status) {
                          case 'approved':
                            // Add quote to cart first, then navigate to cart
                            try {
                              setActionLoading('payment');
                              
                              // Convert quote to cart item format and add to cart
                              const cartItem = {
                                id: quote.id,
                                quoteId: quote.id,
                                displayId: quote.display_id || quote.id.slice(0, 8),
                                status: quote.status,
                                finalTotal: quote.final_total_usd || 0,
                                items: quote.items || [],
                                originCountry: quote.origin_country,
                                destinationCountry: quote.destination_country,
                                createdAt: quote.created_at,
                                selected: true, // Auto-select when adding to cart
                              };
                              
                              // Add to cart store (this will also update the database)
                              await addToCart(cartItem);
                              
                              // Navigate to cart page
                              navigate('/cart');
                              toast.success('Quote added to cart! Complete your checkout.');
                              
                            } catch (error) {
                              console.error('Failed to add quote to cart:', error);
                              toast.error('Failed to add quote to cart. Please try again.');
                            } finally {
                              setActionLoading(null);
                            }
                            break;
                          case 'paid':
                          case 'shipped':
                            // Navigate to tracking page
                            if (quote.iwish_tracking_id) {
                              navigate(`/track/${quote.iwish_tracking_id}`);
                            } else {
                              navigate(`/track?quote=${quote.id}`);
                            }
                            break;
                          case 'rejected':
                            // Navigate to new quote request
                            navigate('/request-quote');
                            break;
                          default:
                            toast.info('This action will be available soon!');
                        }
                      }}
                    >
                      {actionLoading === 'payment' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Adding to Cart...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {statusConfig.primaryAction}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const subject = `Question about Quote ${quote.display_id || quote.id.slice(0, 8)}`;
                    const body = `Hi iwishBag Support,

I have a question about my quote:

Quote ID: ${quote.display_id || quote.id}
Status: ${quote.status}
Total: {formatPrice(pricingUSD.finalTotal)}
Customer: ${customerInfo.name}
Email: ${customerInfo.email}

My question:
[Please describe your question here]

Thank you for your assistance!`;

                    const mailtoUrl = `mailto:support@iwishbag.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.location.href = mailtoUrl;
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Ask a question
                </Button>
              </div>
            </div>

            {/* Payment security - Stripe style */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Lock className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Secure payments</h4>
                  <p className="text-sm text-gray-600">Your payment is protected</p>
                </div>
              </div>

              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>SSL encrypted transactions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>PCI DSS compliant</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Money-back guarantee</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>24/7 fraud monitoring</span>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Need help?</h4>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    // Open WhatsApp chat with pre-filled message
                    const message = `Hi iwishBag Support! I need help with my quote:

Quote ID: ${quote.display_id || quote.id}
Status: ${quote.status}
Customer: ${customerInfo.name}

Please assist me with my quote inquiry.`;

                    const whatsappUrl = `https://wa.me/918000000000?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat support
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    const subject = `Support Request - Quote ${quote.display_id || quote.id.slice(0, 8)}`;
                    const body = `Hi iwishBag Support,

I need assistance with my quote:

Quote Details:
- Quote ID: ${quote.display_id || quote.id}
- Status: ${quote.status}
- Total Amount: {formatPrice(pricingUSD.finalTotal)}
- Origin: ${quote.origin_country}
- Destination: ${quote.destination_country}

Customer Information:
- Name: ${customerInfo.name}
- Email: ${customerInfo.email}
- Phone: ${customerInfo.phone}

Issue Description:
[Please describe your issue or question here]

Thank you for your prompt assistance!

Best regards,
${customerInfo.name}`;

                    const mailtoUrl = `mailto:support@iwishbag.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.location.href = mailtoUrl;
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email us
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    // Show call options with quote context
                    const message = `📞 Call iwishBag Support

International: +91-800-IWISHBAG
US/Canada: +1-800-494-7422
India: +91-800-494-7422

Please mention your Quote ID: ${quote.display_id || quote.id.slice(0, 8)}

Our support team is available 24/7 to assist you with your quote and shipping needs.`;

                    toast.info(message, {
                      duration: 8000,
                      action: {
                        label: 'Call Now',
                        onClick: () => {
                          window.location.href = 'tel:+918004947422';
                        },
                      },
                    });
                  }}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call support
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="font-medium text-gray-700">Response time</div>
                    <div className="text-green-600">&lt; 2 hours</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Availability</div>
                    <div className="text-blue-600">24/7</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Languages</div>
                    <div>English, Hindi</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Satisfaction</div>
                    <div className="text-yellow-600">4.9/5 ⭐</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quote timeline */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Quote timeline</h4>

              <div className="space-y-4">
                {operationalData.timeline
                  ?.slice(-3)
                  .reverse()
                  .map((entry, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full mt-2',
                          entry.status === quote.status
                            ? 'bg-blue-600'
                            : ['approved', 'paid', 'shipped', 'completed'].includes(entry.status)
                              ? 'bg-green-600'
                              : 'bg-gray-400',
                        )}
                      ></div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm capitalize">
                          {entry.status.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(entry.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {entry.notes && (
                          <div className="text-xs text-gray-600 mt-1">{entry.notes}</div>
                        )}
                      </div>
                    </div>
                  )) || (
                  // Fallback timeline if no operational data
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          Quote {quote.status}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(quote.updated_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">Quote created</div>
                        <div className="text-xs text-gray-500">
                          {new Date(quote.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment methods preview */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Payment methods</h4>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 border border-gray-200 rounded">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Credit / Debit cards</span>
                </div>
                <div className="flex items-center gap-3 p-2 border border-gray-200 rounded">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Bank transfer</span>
                </div>
                <div className="flex items-center gap-3 p-2 border border-gray-200 rounded">
                  <Monitor className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Digital wallets</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedQuotePage;
export { UnifiedQuotePage };
