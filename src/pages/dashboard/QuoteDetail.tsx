import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCurrency } from '@/hooks/useUserCurrency';
import { useAllCountries } from '@/hooks/useAllCountries';
import { useQuoteState } from '@/hooks/useQuoteState';
import { useAdminRole } from '@/hooks/useAdminRole';
import { QuoteBreakdown } from '@/components/dashboard/QuoteBreakdown';
import { DeliveryTimeline } from '@/components/dashboard/DeliveryTimeline';
import { AddressEditForm } from '@/components/forms/AddressEditForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  MapPin, 
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  MessageCircle,
  Edit,
  Eye,
  EyeOff,
  Globe,
  Weight,
  ShoppingCart,
  AlertCircle,
  XCircle,
  HelpCircle,
  Sparkles,
  Info,
  Receipt,
  BookOpen,
  Edit2,
  Percent,
  Shield,
  CreditCard,
  Gift
} from 'lucide-react';
import { formatAmountForDisplay } from '@/lib/currencyUtils';
import { ShippingAddress } from '@/types/address';
import { QuoteStepper } from '@/components/dashboard/QuoteStepper';
import type { QuoteStep } from '@/components/dashboard/QuoteStepper';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { QuoteMessaging } from '@/components/messaging/QuoteMessaging';
import { CustomerRejectQuoteDialog } from '@/components/dashboard/CustomerRejectQuoteDialog';

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { userCurrency, formatAmount } = useUserCurrency();
  const { data: countries } = useAllCountries();
  const { data: isAdmin, isLoading: isAdminLoading } = useAdminRole();
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isMobileHelpOpen, setMobileHelpOpen] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [isRejectDialogOpen, setRejectDialogOpen] = useState(false);

  // Use the existing quote state hook for approve/reject functionality
  const { approveQuote, rejectQuote, addToCart, isUpdating } = useQuoteState(id || '');

  const { data: quote, isLoading, error, refetch } = useQuery({
    queryKey: ['quote-detail', id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Refresh quote data when page becomes visible (e.g., when returning from cart)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && id && user) {
        refetch();
      }
    };

    const handleFocus = () => {
      if (id && user) {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetch, id, user]);

  // Get country name for display
  const countryName = useMemo(() => {
    return countries?.find(c => c.code === quote?.country_code)?.name || quote?.country_code;
  }, [countries, quote?.country_code]);

  // Get exchange rate for user's currency
  const exchangeRate = useMemo(() => {
    if (userCurrency === 'USD') return 1;
    const country = countries?.find(c => c.currency === userCurrency);
    return country?.rate_from_usd || 1;
  }, [countries, userCurrency]);

  // Format amounts in user's preferred currency
  const formatUserCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'N/A';
    return formatAmountForDisplay(amount, userCurrency, exchangeRate);
  };

  // Get status configuration
  const getStatusConfig = (status: string, approvalStatus?: string) => {
    const configs = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending Review' },
      sent: { color: 'bg-blue-100 text-blue-800', icon: Package, label: 'Quote Sent' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejected' },
      paid: { color: 'bg-purple-100 text-purple-800', icon: DollarSign, label: 'Paid' },
      ordered: { color: 'bg-indigo-100 text-indigo-800', icon: ShoppingCart, label: 'Ordered' },
      shipped: { color: 'bg-orange-100 text-orange-800', icon: Truck, label: 'Shipped' },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Delivered' },
    };

    const statusKey = approvalStatus === 'approved' ? 'approved' : status;
    return configs[statusKey as keyof typeof configs] || configs.pending;
  };

  // Calculate delivery timeline
  const getDeliveryTimeline = () => {
    const created = new Date(quote?.created_at || '');
    const estimatedDelivery = new Date(created.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days
    
    return {
      created: created.toLocaleDateString(),
      estimatedDelivery: estimatedDelivery.toLocaleDateString(),
      daysRemaining: Math.ceil((estimatedDelivery.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    };
  };

  // Parse shipping address from JSONB
  const shippingAddress = quote?.shipping_address as unknown as ShippingAddress | null;

  // Mapping function for quote state (inlined from QuoteBreakdown)
  function getQuoteUIState(quote) {
    const { status, approval_status, in_cart } = quote;
    let step: QuoteStep = 'review';
    if (status === 'pending' && approval_status === 'pending') {
      step = 'review';
    } else if ((status === 'calculated' || status === 'sent') && approval_status === 'pending') {
      step = 'review';
    } else if (status === 'accepted' && approval_status === 'approved' && !in_cart) {
      step = 'approve';
    } else if ((status === 'accepted' || status === 'paid' || status === 'ordered' || status === 'shipped' || status === 'completed') && approval_status === 'approved' && in_cart) {
      step = 'cart';
    } else if (status === 'cancelled' || approval_status === 'rejected') {
      step = 'rejected';
    } else if (status === 'paid' || status === 'ordered' || status === 'shipped' || status === 'completed') {
      step = 'checkout';
    }
    return { step, rejected: step === 'rejected' };
  }

  // --- Delivery Window Calculation ---
  const [deliveryWindow, setDeliveryWindow] = React.useState<{ 
    label: string; 
    days: string;
    timeline: {
      minDate: Date;
      maxDate: Date;
      totalMinDays: number;
      totalMaxDays: number;
      processingDays: number;
      customsDays: number;
      deliveryMinDays: number;
      deliveryMaxDays: number;
    } | null;
    shippingRoute: any;
    selectedOption: any;
  } | null>(null);
  React.useEffect(() => {
    async function fetchDeliveryWindow() {
      if (!quote) return;
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
      const option = options[0];
      if (!option) return;
      // Calculate window
      let startDate: Date = new Date();
      // payment_date is not typed on quote, so use (quote as any)
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
      setDeliveryWindow({
        label: `${formatDate(minDate)}-${formatDate(maxDate)}`,
        days: `${minDays}-${maxDays} days`,
        timeline: {
          minDate,
          maxDate,
          totalMinDays: minDays,
          totalMaxDays: maxDays,
          processingDays: shippingRoute.processing_days || 0,
          customsDays: shippingRoute.customs_clearance_days || 0,
          deliveryMinDays: option.min_days || 0,
          deliveryMaxDays: option.max_days || 0
        },
        shippingRoute,
        selectedOption: option
      });
    }
    fetchDeliveryWindow();
  }, [quote]);

  // Format date range helper
  const formatDateRange = (minDate: Date, maxDate: Date) => {
    const minMonth = minDate.toLocaleDateString('en-US', { month: 'short' });
    const minDay = minDate.getDate();
    const maxMonth = maxDate.toLocaleDateString('en-US', { month: 'short' });
    const maxDay = maxDate.getDate();
    
    if (minMonth === maxMonth) {
      return `${minMonth} ${minDay}-${maxDay}`;
    } else {
      return `${minMonth} ${minDay} - ${maxMonth} ${maxDay}`;
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8 animate-in fade-in duration-500">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="container py-8 animate-in fade-in duration-500">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Quote Not Found</h2>
          <p className="text-gray-500 mb-4">The quote you're looking for doesn't exist or you don't have permission to view it.</p>
          <Link to="/dashboard/quotes">
            <Button>Back to Quotes</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(quote.status, quote.approval_status);
  const StatusIcon = statusConfig.icon;
  const timeline = getDeliveryTimeline();
  const isOwner = user?.id === quote.user_id;

  // Handler functions for quote actions
  const handleApprove = async () => {
    try {
      await approveQuote();
      // The useQuoteState hook will handle query invalidation and show success toast
    } catch (error) {
      console.error('Error approving quote:', error);
    }
  };

  const handleReject = async () => {
    try {
      await rejectQuote('', 'Rejected by user');
      // The useQuoteState hook will handle query invalidation and show success toast
    } catch (error) {
      console.error('Error rejecting quote:', error);
    }
  };

  const handleAddToCart = async () => {
    try {
      await addToCart();
      // The useQuoteState hook will handle query invalidation and show success toast
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  // Help functionality handlers
  const handleMessageSupport = () => {
    setHelpOpen(false);
    setMobileHelpOpen(false);
    setShowMessages(true);
  };

  const handleFAQ = () => {
    setHelpOpen(false);
    setMobileHelpOpen(false);
    // Open FAQ modal or link
    window.open('/faq', '_blank');
  };

  const handleRequestChanges = () => {
    setHelpOpen(false);
    setMobileHelpOpen(false);
    // Open request changes form/modal
    // e.g., setShowRequestChanges(true)
  };

  const handleCancelQuote = () => {
    setHelpOpen(false);
    setMobileHelpOpen(false);
    setRejectDialogOpen(true);
  };

  // Breakdown modal handlers
  const handleOpenBreakdown = () => {
    setIsBreakdownOpen(true);
  };

  const handleCloseBreakdown = () => {
    setIsBreakdownOpen(false);
  };

  // Helper function to render breakdown rows
  const renderBreakdownRow = (label: string, amount: number | null, isDiscount = false, icon?: React.ReactNode) => {
    if (amount === null || amount === undefined || amount === 0) return null;

    const sign = isDiscount ? '-' : '';
    const colorClass = isDiscount ? 'text-green-600' : '';

    return (
      <div className={`flex justify-between items-center py-1.5 sm:py-2 ${colorClass}`}>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {icon && <span className="text-gray-400">{icon}</span>}
          <div className="flex items-center gap-1">
            <span className="text-xs sm:text-sm">{label}</span>
          </div>
        </div>
        <span className="font-medium text-xs sm:text-sm">{sign}{formatAmount(amount)}</span>
      </div>
    );
  };

  return (
    <div className="container py-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8 animate-in slide-in-from-top duration-700">
        <Link to="/dashboard/quotes" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quotes
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">Quote #{quote.display_id || quote.id.slice(0, 8)}</h1>
              <Badge className={`flex items-center gap-1 ${statusConfig.color} animate-in zoom-in duration-500`}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-gray-500">Created on {new Date(quote.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Stepper */}
          <QuoteStepper currentStep={getQuoteUIState(quote).step} rejected={getQuoteUIState(quote).step === 'rejected'} />
          {/* Product Hero Card */}
          <Card className="overflow-hidden animate-in slide-in-from-left duration-700 delay-100 hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(quote.quote_items) && quote.quote_items.length > 1 ? (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {quote.quote_items.map((item) => (
                      <div key={item.id} className="flex flex-col items-center min-w-[120px] max-w-[140px] bg-muted rounded-lg p-3 border border-border">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Package className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        <div className="text-sm font-medium text-center truncate w-full">
                          {item.product_url ? (
                            <a href={item.product_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{item.product_name}</a>
                          ) : (
                            item.product_name
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Qty: {item.quantity}</div>
                      </div>
                    ))}
                  </div>
                  {/* Cost Info Grouped - new order: country, cost, quote, weight, items */}
                  <div className="flex flex-wrap gap-6 mt-2 items-center">
                    <div className="flex flex-col items-start">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Country</span>
                      <span className="text-lg font-semibold">{countryName}</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Cost of Goods</span>
                      <span className="text-lg font-semibold">{formatAmount(quote.item_price)}</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Receipt className="h-3 w-3" /> Quote Total
                        <button 
                          onClick={handleOpenBreakdown}
                          className="ml-1 cursor-pointer"
                        >
                          <Info className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </span>
                      <span className="text-lg font-semibold">{formatAmount(quote.final_total)}</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Weight className="h-3 w-3" /> Weight</span>
                      <span className="text-lg font-semibold">{quote.item_weight || 0} kg</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Items</span>
                      <span className="text-lg font-semibold">{quote.quote_items.reduce((sum, item) => sum + (item.quantity || 0), 0)}</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Delivery Estimate</span>
                      <span className="text-lg font-semibold">{deliveryWindow ? `${deliveryWindow.label} (${deliveryWindow.days})` : '—'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Product Image */}
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 hover:scale-105 transition-transform duration-200">
                    {quote.image_url ? (
                      <img src={quote.image_url} alt={quote.product_name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  {/* Product Info + Status + Price */}
                  <div className="flex-1 min-w-0 flex flex-col gap-2 justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold truncate">
                          {quote.product_name || 'Product Name'}
                        </h3>
                        <Badge className={`flex items-center gap-1 ${statusConfig.color} animate-in zoom-in duration-500`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Cost of Goods</span>
                          <span className="text-lg font-semibold">{formatAmount(quote.item_price)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Receipt className="h-3 w-3" /> Quote Total
                            <button 
                              onClick={handleOpenBreakdown}
                              className="ml-1 cursor-pointer"
                            >
                              <Info className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                          </span>
                          <span className="text-lg font-semibold">{formatAmount(quote.final_total)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mt-2">
                      <div className="hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                        <span className="text-gray-500">Purchase Country:</span>
                        <div className="font-medium flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {countryName}
                        </div>
                      </div>
                      <div className="hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                        <span className="text-gray-500">Weight:</span>
                        <div className="font-medium flex items-center gap-1">
                          <Weight className="h-3 w-3" />
                          {quote.item_weight || 0} kg
                        </div>
                      </div>
                      <div className="hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                        <span className="text-gray-500">Quantity:</span>
                        <div className="font-medium">{Array.isArray(quote.quote_items) ? quote.quote_items.reduce((sum, item) => sum + (item.quantity || 0), 0) : (quote.quantity || 1)}</div>
                      </div>
                      <div className="hover:bg-gray-50 p-2 rounded transition-colors duration-200">
                        <span className="text-gray-500">Delivery Estimate:</span>
                        <div className="font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {deliveryWindow ? `${deliveryWindow.label} (${deliveryWindow.days})` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Need Help Section */}
          <div className="flex justify-center py-3 sm:py-4 border-t border-b border-border">
            <div className="md:block hidden">
              <Popover open={isHelpOpen} onOpenChange={setHelpOpen}>
                <PopoverTrigger asChild>
                  <button className="text-base font-medium flex items-center gap-1 text-red-600 dark:text-red-400 bg-transparent border-none shadow-none px-0 py-0 hover:bg-transparent hover:text-red-500 focus:outline-none focus:ring-0" type="button">
                    <HelpCircle className="w-5 h-5 text-red-600 dark:text-red-400" /> Need Help?
                  </button>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-56 p-2 backdrop-blur-xl bg-white/95 border border-white/30 shadow-2xl">
                  <button className="flex items-center gap-2 w-full px-2 py-2 rounded hover:bg-white/20 text-sm transition-colors duration-300 text-gray-700" onClick={handleMessageSupport}>
                    <MessageCircle className="w-4 h-4" /> Message Support
                  </button>
                  {quote.approval_status !== 'rejected' && (
                    <button className="flex items-center gap-2 w-full px-2 py-2 rounded hover:bg-white/20 text-sm transition-colors duration-300 text-red-600" onClick={handleCancelQuote}>
                      <XCircle className="w-4 h-4" /> Cancel Quote
                    </button>
                  )}
                  <button className="flex items-center gap-2 w-full px-2 py-2 rounded hover:bg-white/20 text-sm transition-colors duration-300 text-gray-700" onClick={handleFAQ}>
                    <BookOpen className="w-4 h-4" /> FAQ
                  </button>
                  <button className="flex items-center gap-2 w-full px-2 py-2 rounded hover:bg-white/20 text-sm transition-colors duration-300 text-gray-700" onClick={handleRequestChanges}>
                    <Edit2 className="w-4 h-4" /> Request Changes
                  </button>
                </PopoverContent>
              </Popover>
            </div>
            <div className="md:hidden block w-full">
              <button
                className="w-full text-sm sm:text-base font-medium flex items-center gap-1 justify-center py-2 text-red-600 dark:text-red-400 bg-transparent border-none shadow-none hover:bg-transparent hover:text-red-500 focus:outline-none focus:ring-0"
                type="button"
                onClick={() => setMobileHelpOpen(true)}
              >
                <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" /> Need Help?
              </button>
              <Dialog open={isMobileHelpOpen} onOpenChange={setMobileHelpOpen}>
                <DialogContent className="sm:max-w-[300px] backdrop-blur-xl bg-white/95 border border-white/30 shadow-2xl">
                  <div className="flex flex-col divide-y divide-white/20">
                    <button 
                      className="flex items-center gap-2 w-full px-3 py-3 text-sm hover:bg-white/20 active:bg-white/30 transition-colors duration-300 text-gray-700" 
                      onClick={handleMessageSupport}
                    >
                      <MessageCircle className="w-4 h-4" /> Message Support
                    </button>
                    {quote.approval_status !== 'rejected' && (
                      <button 
                        className="flex items-center gap-2 w-full px-3 py-3 text-sm hover:bg-white/20 active:bg-white/30 transition-colors duration-300 text-red-600" 
                        onClick={handleCancelQuote}
                      >
                        <XCircle className="w-4 h-4" /> Cancel Quote
                      </button>
                    )}
                    <button 
                      className="flex items-center gap-2 w-full px-3 py-3 text-sm hover:bg-white/20 active:bg-white/30 transition-colors duration-300 text-gray-700" 
                      onClick={handleFAQ}
                    >
                      <BookOpen className="w-4 h-4" /> FAQ
                    </button>
                    <button 
                      className="flex items-center gap-2 w-full px-3 py-3 text-sm hover:bg-white/20 active:bg-white/30 transition-colors duration-300 text-gray-700" 
                      onClick={handleRequestChanges}
                    >
                      <Edit2 className="w-4 h-4" /> Request Changes
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Messages section - only shown when Message Support is clicked */}
          {showMessages && (
            <div className="space-y-4">
              <QuoteMessaging quoteId={quote.id} quoteUserId={quote.user_id} />
            </div>
          )}

          {/* Breakdown Modal */}
          <Dialog open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
            <DialogContent className="max-w-4xl w-[95vw] md:w-[90vw] bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Quote Breakdown
                </h2>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Items Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-base">Items</h3>
                  <div className="space-y-3">
                    {quote.quote_items?.map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-muted border border-border rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          {item.image_url && (
                            <img 
                              src={item.image_url} 
                              alt={item.product_name}
                              className="w-10 h-10 rounded-md object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium text-sm">{item.product_name}</div>
                            <div className="text-muted-foreground text-xs">Quantity: {item.quantity}</div>
                          </div>
                        </div>
                        <span className="font-medium text-sm">{formatAmount(item.item_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Charges & Fees Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-base">Charges & Fees</h3>
                  <div className="space-y-2">
                    {renderBreakdownRow("Total Item Price", quote.item_price, false, <Package className="h-4 w-4" />)}
                    {renderBreakdownRow("Sales Tax", quote.sales_tax_price, false, <Percent className="h-4 w-4" />)}
                    {renderBreakdownRow("Merchant Shipping", quote.merchant_shipping_price, false, <Truck className="h-4 w-4" />)}
                    {renderBreakdownRow("International Shipping", quote.international_shipping, false, <Truck className="h-4 w-4" />)}
                    {renderBreakdownRow("Customs & ECS", quote.customs_and_ecs, false, <Shield className="h-4 w-4" />)}
                    {renderBreakdownRow("Domestic Shipping", quote.domestic_shipping, false, <Truck className="h-4 w-4" />)}
                    {renderBreakdownRow("Handling Charge", quote.handling_charge, false, <Package className="h-4 w-4" />)}
                    {renderBreakdownRow("Insurance", quote.insurance_amount, false, <Shield className="h-4 w-4" />)}
                    {renderBreakdownRow("Payment Gateway Fee", quote.payment_gateway_fee, false, <CreditCard className="h-4 w-4" />)}
                    {renderBreakdownRow("Discount", quote.discount, true, <Gift className="h-4 w-4" />)}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {renderBreakdownRow("Subtotal", quote.sub_total, false, <Receipt className="h-4 w-4" />)}
                    {renderBreakdownRow("VAT", quote.vat, false, <Percent className="h-4 w-4" />)}
                  </div>
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <div className="flex justify-between items-center font-semibold text-base">
                      <span>Total Amount</span>
                      <span className="text-foreground">{formatAmount(quote.final_total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Reject Quote Dialog */}
          <CustomerRejectQuoteDialog
            isOpen={isRejectDialogOpen}
            onOpenChange={(open) => {
              // Only allow closing if not submitting
              if (!isUpdating) {
                setRejectDialogOpen(open);
              }
            }}
            onConfirm={async (reasonId, details) => {
              try {
                await rejectQuote(reasonId || details || '', 'Rejected by user');
                setRejectDialogOpen(false);
              } catch (error) {
                // Keep dialog open on error
                console.error('Error rejecting quote:', error);
              }
            }}
            isPending={isUpdating}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions Card */}
          {isOwner && (
            <Card className="animate-in slide-in-from-right duration-700 delay-100 hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quote.approval_status === 'pending' && (
                  <>
                    <Button 
                      className="w-full hover:scale-105 transition-transform duration-200"
                      onClick={handleApprove}
                      disabled={isUpdating}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Quote
                    </Button>
                  </>
                )}
                
                {(quote.approval_status === 'rejected' || quote.status === 'cancelled') && (
                  <Button 
                    className="w-full hover:scale-105 transition-transform duration-200"
                    onClick={handleApprove}
                    disabled={isUpdating}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Re-Approve Quote
                  </Button>
                )}
                
                {quote.approval_status === 'approved' && !quote.in_cart && (
                  <Button 
                    className="w-full hover:scale-105 transition-transform duration-200"
                    onClick={handleAddToCart}
                    disabled={isUpdating}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                )}
                
                {quote.in_cart && (
                  <Link to="/cart">
                    <Button className="w-full hover:scale-105 transition-transform duration-200">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      View in Cart
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shipping Address */}
          <Card className="animate-in slide-in-from-right duration-700 delay-200 hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </span>
                {isOwner && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="hover:scale-105 transition-transform duration-200"
                    onClick={() => setIsAddressDialogOpen(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shippingAddress ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">{shippingAddress.fullName}</p>
                  <p>{shippingAddress.streetAddress}</p>
                  <p>{shippingAddress.city}{shippingAddress.state ? `, ${shippingAddress.state}` : ''} {shippingAddress.postalCode}</p>
                  <p>{shippingAddress.country}</p>
                  {shippingAddress.phone && <p className="text-gray-500">📞 {shippingAddress.phone}</p>}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  <p>No shipping address set</p>
                  {isOwner && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 w-full"
                      onClick={() => setIsAddressDialogOpen(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Add Address
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Address Edit Dialog */}
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent>
          <DialogDescription>
            Update your shipping address for this quote.
          </DialogDescription>
          <AddressEditForm
            currentAddress={shippingAddress}
            onSave={() => {
              setIsAddressDialogOpen(false);
              window.location.reload();
            }}
            onCancel={() => setIsAddressDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 