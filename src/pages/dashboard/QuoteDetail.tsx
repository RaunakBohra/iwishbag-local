import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuoteDisplayCurrency } from '@/hooks/useQuoteDisplayCurrency';
import { useAllCountries } from '@/hooks/useAllCountries';
import { useQuoteState } from '@/hooks/useQuoteState';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useCartStore } from '@/stores/cartStore';
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
  Gift,
  Star,
  Zap,
  Target,
  TrendingUp,
  User,
  Building,
  Phone
} from 'lucide-react';
import { ShippingAddress } from '@/types/address';
import { QuoteStepper } from '@/components/dashboard/QuoteStepper';
import type { QuoteStep } from '@/components/dashboard/QuoteStepper';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { QuoteMessaging } from '@/components/messaging/QuoteMessaging';
import { CustomerRejectQuoteDialog } from '@/components/dashboard/CustomerRejectQuoteDialog';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { QuoteExpirationTimer } from '@/components/dashboard/QuoteExpirationTimer';
import { RenewQuoteButton } from '@/components/RenewQuoteButton';
import { StickyActionBar } from '@/components/dashboard/StickyActionBar';
import { useIsMobile } from '@/hooks/use-mobile';
import { ShareQuoteButton } from '@/components/admin/ShareQuoteButton';

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  // Will get formatAmount from useQuoteDisplayCurrency when quote is loaded
  const { data: countries } = useAllCountries();
  const { data: isAdmin, isLoading: isAdminLoading } = useAdminRole();
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isMobileHelpOpen, setMobileHelpOpen] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [isRejectDialogOpen, setRejectDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  // Use the existing quote state hook for approve/reject functionality
  const { approveQuote, rejectQuote, addToCart, isUpdating } = useQuoteState(id || '');
  
  // Subscribe to cart store to make quote detail reactive to cart changes
  const cartItems = useCartStore((state) => state.items);
  
  // Helper function to check if this quote is in cart
  const isQuoteInCart = (quoteId: string) => {
    return cartItems.some(item => item.quoteId === quoteId);
  };

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
    return countries?.find(c => c.code === quote?.destination_country)?.name || quote?.destination_country;
  }, [countries, quote?.destination_country]);

  // Currency formatting is now handled by useQuoteDisplayCurrency hook



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

  // Get quote-specific currency formatting (must be called before any conditional returns)
  const { formatAmount } = useQuoteDisplayCurrency({ quote });

  // Parse shipping address from JSONB
  const shippingAddress = quote?.shipping_address as unknown as ShippingAddress | null;

  // Mapping function for quote state (inlined from QuoteBreakdown)
  const getQuoteUIState = (quote: any) => {
    const { status, in_cart } = quote;
    
    let step: 'review' | 'approve' | 'cart' | 'checkout' | 'rejected' = 'review';
    let summaryStatus: 'pending' | 'approved' | 'rejected' | 'in_cart' = 'pending';
    
    if (status === 'pending') {
      step = 'review';
      summaryStatus = 'pending';
    } else if (status === 'sent') {
      step = 'approve';
      summaryStatus = 'pending';
    } else if (status === 'approved' && !in_cart) {
      step = 'approve';
      summaryStatus = 'approved';
    } else if (status === 'approved' && in_cart) {
      step = 'cart';
      summaryStatus = 'in_cart';
    } else if (status === 'rejected') {
      step = 'rejected';
      summaryStatus = 'rejected';
    } else if (status === 'paid' || status === 'ordered' || status === 'shipped' || status === 'completed') {
      step = 'checkout';
      summaryStatus = 'approved';
    }
    
    return { step, rejected: step === 'rejected' };
  };

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
      shippingDays: number;
    };
  } | null>(null);

  React.useEffect(() => {
    async function fetchDeliveryWindow() {
      if (!quote?.shipping_route_id) {
        // Fallback calculation
        const created = new Date(quote?.created_at || '');
        const minDate = new Date(created.getTime() + (10 * 24 * 60 * 60 * 1000)); // 10 days
        const maxDate = new Date(created.getTime() + (18 * 24 * 60 * 60 * 1000)); // 18 days
        
        setDeliveryWindow({
          label: `${minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          days: '10-18 days',
          timeline: {
            minDate,
            maxDate,
            totalMinDays: 10,
            totalMaxDays: 18,
            processingDays: 2,
            customsDays: 3,
            shippingDays: 5
          }
        });
        return;
      }

      try {
        const { data: route, error } = await supabase
          .from('shipping_routes')
          .select('*')
          .eq('id', quote.shipping_route_id)
          .single();

        if (error || !route) {
          console.error('Error fetching shipping route:', error);
          return;
        }

        const created = new Date(quote.created_at);
        const processingDays = route.processing_days || 2;
        const customsDays = route.customs_clearance_days || 3;
        const shippingDays = 5; // Default shipping days
        
        const totalMinDays = processingDays + customsDays + shippingDays;
        const totalMaxDays = totalMinDays + 3; // Add buffer
        
        const minDate = new Date(created.getTime() + (totalMinDays * 24 * 60 * 60 * 1000));
        const maxDate = new Date(created.getTime() + (totalMaxDays * 24 * 60 * 60 * 1000));
        
        const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        setDeliveryWindow({
          label: `${formatDate(minDate)} - ${formatDate(maxDate)}`,
          days: `${totalMinDays}-${totalMaxDays} days`,
          timeline: {
            minDate,
            maxDate,
            totalMinDays,
            totalMaxDays,
            processingDays,
            customsDays,
            shippingDays
          }
        });
      } catch (error) {
        console.error('Error calculating delivery window:', error);
        // Fallback calculation
        const created = new Date(quote?.created_at || '');
        const minDate = new Date(created.getTime() + (10 * 24 * 60 * 60 * 1000));
        const maxDate = new Date(created.getTime() + (18 * 24 * 60 * 60 * 1000));
        
        const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        setDeliveryWindow({
          label: `${formatDate(minDate)} - ${formatDate(maxDate)}`,
          days: '10-18 days',
          timeline: {
            minDate,
            maxDate,
            totalMinDays: 10,
            totalMaxDays: 18,
            processingDays: 2,
            customsDays: 3,
            shippingDays: 5
          }
        });
      }
    }

    if (quote) {
      fetchDeliveryWindow();
    }
  }, [quote]);

  const formatDateRange = (minDate: Date, maxDate: Date) => {
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${formatDate(minDate)} - ${formatDate(maxDate)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-64" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Quote Not Found</h2>
            <p className="text-gray-600 mb-4">The quote you're looking for doesn't exist or you don't have permission to view it.</p>
            <Link to="/dashboard/quotes">
              <Button>Back to Quotes</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = quote.user_id === user?.id;

  const handleApprove = async () => {
    try {
      await approveQuote();
    } catch (error) {
      console.error('Error approving quote:', error);
    }
  };

  const handleReject = async () => {
    setRejectDialogOpen(true);
  };

  const handleAddToCart = async () => {
    try {
      await addToCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleMessageSupport = () => {
    setShowMessages(true);
    setHelpOpen(false);
    setMobileHelpOpen(false);
  };

  const handleFAQ = () => {
    window.open('/faq', '_blank');
    setHelpOpen(false);
    setMobileHelpOpen(false);
  };

  const handleRequestChanges = () => {
    // Implement request changes functionality
    console.log('Request changes clicked');
    setHelpOpen(false);
    setMobileHelpOpen(false);
  };

  const handleCancelQuote = () => {
    setRejectDialogOpen(true);
    setHelpOpen(false);
    setMobileHelpOpen(false);
  };

  const handleOpenBreakdown = () => {
    setIsBreakdownOpen(true);
  };

  const handleCloseBreakdown = () => {
    setIsBreakdownOpen(false);
  };

  const renderBreakdownRow = (label: string, amount: number | null, isDiscount = false, icon?: React.ReactNode) => {
    if (!amount || amount === 0) return null;
    const sign = isDiscount ? '-' : '+';
    return (
      <div className="flex justify-between items-center py-1">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className={`container px-4 sm:px-6 py-4 sm:py-6 lg:py-8 animate-in fade-in duration-500 ${isMobile ? 'pb-24' : ''}`}>
        {/* Header */}
        <div className="mb-6 sm:mb-8 animate-in slide-in-from-top duration-700">
          <Link 
            to="/dashboard/quotes" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-all duration-200 hover:scale-105 group"
          >
            <div className="p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm group-hover:shadow-md transition-all duration-200 mr-3">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="font-medium">Back to Quotes</span>
          </Link>
          
          {/* Mobile-optimized header layout */}
          <div className="space-y-4">
            {/* Quote ID and Status Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-600 to-gray-700 shadow-lg">
                  <Receipt className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">
                    Quote #{quote.display_id || quote.id.slice(0, 8)}
                  </h1>
                  <p className="text-gray-500 text-sm sm:text-base">
                    Created on {new Date(quote.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex justify-center sm:justify-start gap-2">
                <StatusBadge status={quote.status} category="quote" showIcon className="text-sm" />
                {quote && <ShareQuoteButton quote={quote} variant="button" size="sm" />}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Status Stepper */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6">
              <QuoteStepper currentStep={getQuoteUIState(quote).step} rejected={getQuoteUIState(quote).step === 'rejected'} />
            </div>

            {/* Product Hero Card */}
            <Card className="overflow-hidden animate-in slide-in-from-left duration-700 delay-100 hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/50 dark:to-slate-950/50">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-slate-600 to-gray-700">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {Array.isArray(quote.quote_items) && quote.quote_items.length > 1 ? (
                  <>
                    {/* Horizontally scrollable product cards */}
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                      {quote.quote_items.map((item) => (
                        <div key={item.id} className="flex flex-col items-center min-w-[140px] max-w-[160px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-sm hover:shadow-md transition-all duration-200">
                          <div className="text-sm font-medium text-center truncate w-full">
                            {item.product_url ? (
                              <a href={item.product_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{item.product_name}</a>
                            ) : (
                              item.product_name
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded-full inline-block">Qty: {item.quantity}</div>
                          {/* Product Notes Blue Box */}
                          {item.options && (() => {
                            try {
                              const options = JSON.parse(item.options);
                              return options.notes ? (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 inline-block">
                                  <span className="font-medium text-blue-800">Notes:</span> {options.notes}
                                </div>
                              ) : null;
                            } catch {
                              // If not JSON, treat as plain text notes
                              return (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 inline-block">
                                  <span className="font-medium text-blue-800">Notes:</span> {item.options}
                                </div>
                              );
                            }
                          })()}
                        </div>
                      ))}
                    </div>
                    {/* Summary section: 2 rows, first row split in half, second row split in quarters */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50 flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-gray-600" />
                          <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Cost of Goods</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatAmount(quote.item_price)}</span>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50 flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-2">
                          <Receipt className="h-4 w-4 text-gray-600" />
                          <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Quote Total</span>
                          <button 
                            onClick={handleOpenBreakdown}
                            className="cursor-pointer hover:scale-110 transition-transform duration-200"
                          >
                            <Info className="h-3 w-3 text-gray-500 hover:text-gray-700" />
                          </button>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatAmount(quote.final_total)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                      <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Weight className="h-4 w-4 text-gray-600" />
                          <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Weight</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{quote.item_weight || 0} kg</span>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="h-4 w-4 text-gray-600" />
                          <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Country</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{countryName}</span>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-gray-600" />
                          <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Items</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{quote.quote_items.reduce((sum, item) => sum + (item.quantity || 0), 0)}</span>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-gray-600" />
                          <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Delivery</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{deliveryWindow ? `${deliveryWindow.label} (${deliveryWindow.days})` : '—'}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Product Image - Only show if image exists */}
                    {quote.image_url && (
                      <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-gray-100 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-2xl flex items-center justify-center flex-shrink-0 hover:scale-105 transition-transform duration-200 shadow-lg">
                        <img src={quote.image_url} alt={quote.product_name} className="w-full h-full object-cover rounded-2xl" />
                      </div>
                    )}
                    {/* Product Info + Status + Price */}
                    <div className="flex-1 min-w-0 flex flex-col gap-4 justify-between">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent truncate">
                            {quote.quote_items && quote.quote_items[0] && quote.quote_items[0].product_url ? (
                              <a href={quote.quote_items[0].product_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{quote.product_name || 'Product Name'}</a>
                            ) : (
                              quote.product_name || 'Product Name'
                            )}
                          </h3>
                        </div>
                        {/* Product Notes Blue Box for single product */}
                        {quote.quote_items && quote.quote_items[0] && quote.quote_items[0].options && (() => {
                          try {
                            const options = JSON.parse(quote.quote_items[0].options);
                            return options.notes ? (
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 inline-block">
                                <span className="font-medium text-blue-800">Notes:</span> {options.notes}
                              </div>
                            ) : null;
                          } catch {
                            // If not JSON, treat as plain text notes
                            return (
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 inline-block">
                                <span className="font-medium text-blue-800">Notes:</span> {quote.quote_items[0].options}
                              </div>
                            );
                          }
                        })()}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="h-4 w-4 text-gray-600" />
                              <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Cost of Goods</span>
                            </div>
                            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatAmount(quote.item_price)}</span>
                          </div>
                          <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
                            <div className="flex items-center gap-2 mb-2">
                              <Receipt className="h-4 w-4 text-gray-600" />
                              <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Quote Total</span>
                              <button 
                                onClick={handleOpenBreakdown}
                                className="cursor-pointer hover:scale-110 transition-transform duration-200"
                              >
                                <Info className="h-3 w-3 text-gray-500 hover:text-gray-700" />
                              </button>
                            </div>
                            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatAmount(quote.final_total)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-xl p-3 border border-gray-200/50 dark:border-gray-600/50 hover:shadow-md transition-all duration-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Globe className="h-3 w-3 text-gray-600" />
                            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Country</span>
                          </div>
                          <div className="font-bold text-gray-900 dark:text-gray-100">{countryName}</div>
                        </div>
                        <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-xl p-3 border border-gray-200/50 dark:border-gray-600/50 hover:shadow-md transition-all duration-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Weight className="h-3 w-3 text-gray-600" />
                            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Weight</span>
                          </div>
                          <div className="font-bold text-gray-900 dark:text-gray-100">{quote.item_weight || 0} kg</div>
                        </div>
                        <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-xl p-3 border border-gray-200/50 dark:border-gray-600/50 hover:shadow-md transition-all duration-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="h-3 w-3 text-gray-600" />
                            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Quantity</span>
                          </div>
                          <div className="font-bold text-gray-900 dark:text-gray-100">{Array.isArray(quote.quote_items) ? quote.quote_items.reduce((sum, item) => sum + (item.quantity || 0), 0) : (quote.quantity || 1)}</div>
                        </div>
                        <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-xl p-3 border border-gray-200/50 dark:border-gray-600/50 hover:shadow-md transition-all duration-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-3 w-3 text-gray-600" />
                            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Delivery</span>
                          </div>
                          <div className="font-bold text-gray-900 dark:text-gray-100">{deliveryWindow ? `${deliveryWindow.label} (${deliveryWindow.days})` : '—'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Need Help Section */}
            <div className="flex justify-center py-4 sm:py-6">
              <div className="md:block hidden">
                <Popover open={isHelpOpen} onOpenChange={setHelpOpen}>
                  <PopoverTrigger asChild>
                                    <button className="text-base font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300 bg-gradient-to-r from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 border border-gray-200/50 dark:border-gray-600/50 shadow-sm hover:shadow-md px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105" type="button">
                  <HelpCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" /> Need Help?
                </button>
                  </PopoverTrigger>
                  <PopoverContent align="center" className="w-64 p-3 backdrop-blur-xl bg-white/95 border border-white/30 shadow-2xl rounded-2xl">
                    <div className="space-y-2">
                      <button className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 text-sm transition-all duration-300 text-gray-700 hover:scale-105" onClick={handleMessageSupport}>
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                          <MessageCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        Message Support
                      </button>
                      {quote.status !== 'rejected' && (
                        <button className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 text-sm transition-all duration-300 text-red-600 hover:scale-105" onClick={handleCancelQuote}>
                          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
                            <XCircle className="w-4 h-4 text-red-600" />
                          </div>
                          Cancel Quote
                        </button>
                      )}
                      <button className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 text-sm transition-all duration-300 text-gray-700 hover:scale-105" onClick={handleFAQ}>
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                          <BookOpen className="w-4 h-4 text-green-600" />
                        </div>
                        FAQ
                      </button>
                      <button className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 text-sm transition-all duration-300 text-gray-700 hover:scale-105" onClick={handleRequestChanges}>
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                          <Edit2 className="w-4 h-4 text-purple-600" />
                        </div>
                        Request Changes
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="md:hidden block w-full">
                <button
                  className="w-full text-sm sm:text-base font-medium flex items-center gap-2 justify-center py-3 text-red-600 dark:text-red-400 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 border border-red-200/50 dark:border-red-700/50 shadow-sm hover:shadow-md rounded-xl transition-all duration-200 hover:scale-105"
                  type="button"
                  onClick={() => setMobileHelpOpen(true)}
                >
                  <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" /> Need Help?
                </button>
                <Dialog open={isMobileHelpOpen} onOpenChange={setMobileHelpOpen}>
                  <DialogContent className="sm:max-w-[350px] backdrop-blur-xl bg-white/95 border border-white/30 shadow-2xl rounded-2xl">
                    <div className="space-y-2">
                      <button 
                        className="flex items-center gap-3 w-full px-4 py-4 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 text-sm transition-all duration-300 text-gray-700 hover:scale-105" 
                        onClick={handleMessageSupport}
                      >
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                          <MessageCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        Message Support
                      </button>
                      {quote.status !== 'rejected' && (
                        <button 
                          className="flex items-center gap-3 w-full px-4 py-4 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 text-sm transition-all duration-300 text-red-600 hover:scale-105" 
                          onClick={handleCancelQuote}
                        >
                          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
                            <XCircle className="w-4 h-4 text-red-600" />
                          </div>
                          Cancel Quote
                        </button>
                      )}
                      <button 
                        className="flex items-center gap-3 w-full px-4 py-4 rounded-xl hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 text-sm transition-all duration-300 text-gray-700 hover:scale-105" 
                        onClick={handleFAQ}
                      >
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                          <BookOpen className="w-4 h-4 text-green-600" />
                        </div>
                        FAQ
                      </button>
                      <button 
                        className="flex items-center gap-3 w-full px-4 py-4 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 text-sm transition-all duration-300 text-gray-700 hover:scale-105" 
                        onClick={handleRequestChanges}
                      >
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                          <Edit2 className="w-4 h-4 text-purple-600" />
                        </div>
                        Request Changes
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Messages section - only shown when Message Support is clicked */}
            {showMessages && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <QuoteMessaging quoteId={quote.id} quoteUserId={quote.user_id} />
              </div>
            )}

            {/* Breakdown Modal */}
            <Dialog open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
              <DialogContent className="max-w-4xl w-[95vw] md:w-[90vw] bg-white/95 backdrop-blur-xl border border-white/30 shadow-2xl rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                      <Receipt className="h-5 w-5 text-white" />
                    </div>
                    Quote Breakdown
                  </h2>
                  <Button variant="outline" size="sm" className="gap-2 hover:scale-105 transition-transform duration-200 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200/50">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Items Section */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Items</h3>
                    <div className="space-y-3">
                      {quote.quote_items?.map((item) => (
                        <div key={item.id} className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border border-gray-200/50 dark:border-gray-600/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              {item.image_url && (
                                <img 
                                  src={item.image_url} 
                                  alt={item.product_name}
                                  className="w-12 h-12 rounded-lg object-cover shadow-sm"
                                />
                              )}
                              <div className={item.image_url ? "" : "flex-1"}>
                                <div className="font-semibold text-sm">{item.product_name}</div>
                                <div className="text-muted-foreground text-xs bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded-full inline-block">Quantity: {item.quantity}</div>
                              </div>
                            </div>
                            <span className="font-bold text-sm bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{formatAmount(item.item_price * item.quantity)}</span>
                          </div>
                          {/* Product Notes */}
                          {item.options && (() => {
                            try {
                              const options = JSON.parse(item.options);
                              return options.notes ? (
                                <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-600/50">
                                  <div className="flex items-start gap-2">
                                    <Edit2 className="h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0" />
                                    <div className="text-xs text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded-lg">
                                      <span className="font-medium">Notes:</span> {options.notes}
                                    </div>
                                  </div>
                                </div>
                              ) : null;
                            } catch {
                              return null;
                            }
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Charges & Fees Section */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Charges & Fees</h3>
                    <div className="space-y-3 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50">
                      {renderBreakdownRow("Total Item Price", quote.item_price, false, <Package className="h-4 w-4 text-blue-600" />)}
                      {renderBreakdownRow("Sales Tax", quote.sales_tax_price, false, <Percent className="h-4 w-4 text-green-600" />)}
                      {renderBreakdownRow("Merchant Shipping", quote.merchant_shipping_price, false, <Truck className="h-4 w-4 text-orange-600" />)}
                      {renderBreakdownRow("International Shipping", quote.international_shipping, false, <Truck className="h-4 w-4 text-indigo-600" />)}
                      {renderBreakdownRow("Customs & ECS", quote.customs_and_ecs, false, <Shield className="h-4 w-4 text-purple-600" />)}
                      {renderBreakdownRow("Domestic Shipping", quote.domestic_shipping, false, <Truck className="h-4 w-4 text-teal-600" />)}
                      {renderBreakdownRow("Handling Charge", quote.handling_charge, false, <Package className="h-4 w-4 text-amber-600" />)}
                      {renderBreakdownRow("Insurance", quote.insurance_amount, false, <Shield className="h-4 w-4 text-emerald-600" />)}
                      {renderBreakdownRow("Payment Gateway Fee", quote.payment_gateway_fee, false, <CreditCard className="h-4 w-4 text-rose-600" />)}
                      {renderBreakdownRow("Discount", quote.discount, true, <Gift className="h-4 w-4 text-green-600" />)}
                    </div>
                    <Separator className="bg-gradient-to-r from-blue-200 to-purple-200" />
                    <div className="space-y-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl p-4 border border-green-200/50 dark:border-green-700/50">
                      {renderBreakdownRow("Subtotal", quote.sub_total, false, <Receipt className="h-4 w-4 text-green-600" />)}
                      {renderBreakdownRow("VAT", quote.vat, false, <Percent className="h-4 w-4 text-emerald-600" />)}
                    </div>
                    <div className="bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/50 dark:to-indigo-900/50 border border-purple-300/50 dark:border-purple-600/50 rounded-xl p-6 shadow-lg">
                      <div className="flex justify-between items-center font-bold text-lg">
                        <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Total Amount</span>
                        <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent text-xl">{formatAmount(quote.final_total)}</span>
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
            {/* Actions Card - Hidden on mobile */}
            {isOwner && !isMobile && (
              <Card className="animate-in slide-in-from-right duration-700 delay-100 hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/50 dark:to-slate-950/50">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-slate-600 to-gray-700">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Expiration Timer */}
                  {(quote.status === 'sent' || quote.status === 'approved') && quote.expires_at && (
                    <div className="flex items-center justify-center p-3 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg">
                      <QuoteExpirationTimer 
                        expiresAt={quote.expires_at}
                        compact={true}
                        className="text-center text-red-700"
                      />
                    </div>
                  )}
                  
                  {quote.status === 'sent' && (
                    <>
                      <Button 
                        className="w-full hover:scale-105 transition-all duration-200 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-lg hover:shadow-xl"
                        onClick={handleApprove}
                        disabled={isUpdating}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Quote
                      </Button>
                      <Button 
                        variant="outline"
                        className="w-full hover:scale-105 transition-all duration-200 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={handleReject}
                        disabled={isUpdating}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Quote
                      </Button>
                    </>
                  )}
                  
                  {(quote.status === 'rejected' || quote.status === 'cancelled') && (
                    <Button 
                      className="w-full hover:scale-105 transition-all duration-200 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-lg hover:shadow-xl"
                      onClick={handleApprove}
                      disabled={isUpdating}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Re-Approve Quote
                    </Button>
                  )}
                  
                  {quote.status === 'approved' && !isQuoteInCart(quote.id) && (
                    <Button 
                      className="w-full hover:scale-105 transition-all duration-200 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-lg hover:shadow-xl"
                      onClick={handleAddToCart}
                      disabled={isUpdating}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  )}
                  
                  {isQuoteInCart(quote.id) && (
                    <Link to="/cart">
                      <Button className="w-full hover:scale-105 transition-all duration-200 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 shadow-lg hover:shadow-xl">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        View in Cart
                      </Button>
                    </Link>
                  )}
                  
                  {quote.status === 'expired' && quote.renewal_count < 1 && (
                    <RenewQuoteButton 
                      quoteId={quote.id}
                      onRenewed={() => {
                        // Refetch the quote data to update the UI
                        refetch();
                      }}
                      className="w-full hover:scale-105 transition-all duration-200 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl"
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Shipping Address */}
            <Card className="animate-in slide-in-from-right duration-700 delay-200 hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/50 dark:to-slate-950/50">
                <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
                  <span className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-slate-600 to-gray-700">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    Shipping Address
                  </span>
                  {isOwner && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="hover:scale-105 transition-all duration-200 bg-white/50 hover:bg-white/80"
                      onClick={() => setIsAddressDialogOpen(true)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {shippingAddress ? (
                  <div className="text-sm space-y-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <User className="h-3 w-3 text-gray-600" />
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{shippingAddress.fullName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <MapPin className="h-3 w-3 text-gray-600" />
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{shippingAddress.streetAddress}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <Building className="h-3 w-3 text-gray-600" />
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{shippingAddress.city}{shippingAddress.state ? `, ${shippingAddress.state}` : ''} {shippingAddress.postalCode}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <Globe className="h-3 w-3 text-gray-600" />
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{shippingAddress.country}</p>
                    </div>
                    {shippingAddress.phone && (
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                          <Phone className="h-3 w-3 text-gray-600" />
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">📞 {shippingAddress.phone}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <AlertCircle className="h-3 w-3 text-gray-500" />
                      </div>
                      <p className="font-medium">No shipping address set</p>
                    </div>
                    {isOwner && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full hover:scale-105 transition-all duration-200 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50"
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
          <DialogContent className="backdrop-blur-xl bg-white/95 border border-white/30 shadow-2xl rounded-2xl">
            <DialogDescription className="text-gray-600">
              Update your shipping address for this quote.
            </DialogDescription>
            <AddressEditForm
              currentAddress={shippingAddress}
              onSave={async (updatedAddress) => {
                await supabase
                  .from('quotes')
                  .update({ shipping_address: updatedAddress as any })
                  .eq('id', quote.id);
                setIsAddressDialogOpen(false);
                refetch();
              }}
              onCancel={() => setIsAddressDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Sticky Action Bar for Mobile */}
      {isMobile && quote && (
        <StickyActionBar
          quote={quote}
          isOwner={isOwner}
          isUpdating={isUpdating}
          onApprove={handleApprove}
          onReject={handleReject}
          onAddToCart={handleAddToCart}
          onRenewed={() => {
            // Refetch the quote data to update the UI
            refetch();
          }}
        />
      )}
    </div>
  );
} 