import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuoteDisplayCurrency } from '@/hooks/useQuoteDisplayCurrency';
import { useAllCountries } from '@/hooks/useAllCountries';
import { useQuoteState } from '@/hooks/useQuoteState';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useCartStore } from '@/stores/cartStore';
import { useStatusManagement } from '@/hooks/useStatusManagement';
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
  Calendar,
  ExternalLink,
  Download,
  MessageCircle,
  Globe,
  Weight,
  ShoppingCart,
  XCircle,
  HelpCircle,
  Info,
  Receipt,
  BookOpen,
  Edit2,
  CreditCard,
  AlertTriangle,
  Zap,
  Gift,
  Shield,
  Percent,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { QuoteExpirationTimer } from '@/components/dashboard/QuoteExpirationTimer';
import { useQuoteSteps } from '@/hooks/useQuoteSteps';
import { QuoteStepper } from '@/components/dashboard/QuoteStepper';
import { RenewQuoteButton } from '@/components/RenewQuoteButton';
import { CustomerRejectQuoteDialog } from '@/components/dashboard/CustomerRejectQuoteDialog';
import { ShareQuoteButton } from '@/components/admin/ShareQuoteButton';
import { ShippingRouteDisplay } from '@/components/shared/ShippingRouteDisplay';
import { QuoteMessaging } from '@/components/messaging/QuoteMessaging';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { StickyActionBar } from '@/components/dashboard/StickyActionBar';
import { GuestApprovalDialog } from '@/components/share/GuestApprovalDialog';
import { useToast } from '@/components/ui/use-toast';
import { Tables } from '@/integrations/supabase/types';
import { GuestCurrencyProvider, useGuestCurrency } from '@/contexts/GuestCurrencyContext';
import { GuestCurrencySelector } from '@/components/guest/GuestCurrencySelector';

interface UnifiedQuoteDetailProps {
  isShareToken?: boolean;
}

function QuoteDetailUnifiedContent({ isShareToken = false }: UnifiedQuoteDetailProps) {
  const { id, shareToken } = useParams<{ id: string; shareToken: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: isAdmin, isLoading: isAdminLoading } = useAdminRole();
  const { getStatusConfig } = useStatusManagement();
  const isMobile = useIsMobile();
  
  // Determine if we're in share token mode
  const isGuestMode = isShareToken || !!shareToken;
  const identifier = isGuestMode ? shareToken : id;
  
  // State for dialogs and UI
  const [showMessages, setShowMessages] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [mobileBreakdownOpen, setMobileBreakdownOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isMobileHelpOpen, setMobileHelpOpen] = useState(false);
  const [guestApprovalDialog, setGuestApprovalDialog] = useState<{
    isOpen: boolean;
    action: 'approve' | 'reject';
  }>({ isOpen: false, action: 'approve' });

  // Fetch quote data based on mode
  const { data: quote, isLoading, error, refetch } = useQuery({
    queryKey: isGuestMode ? ['share-quote', identifier] : ['quote-detail', identifier],
    queryFn: async () => {
      if (!identifier) return null;
      
      try {
        let query = supabase
          .from('quotes')
          .select(`
            *,
            quote_items (*)
          `);
        
        // Apply different filters based on mode
        if (isGuestMode) {
          query = query.eq('share_token', identifier);
        } else {
          if (!user) return null;
          query = query.eq('id', identifier);
        }
        
        const { data, error, status } = await query.maybeSingle();
        
        // Handle RLS errors for shared quotes
        if (isGuestMode && error && (status === 406 || error.code === 'PGRST301')) {
          throw new Error('This quote is not accessible. It may have expired or been accepted by another user.');
        }
        
        if (error) throw error;
        if (!data) throw new Error('Quote not found');
        
        return data;
      } catch (err) {
        console.error('Query error:', err);
        throw err;
      }
    },
    enabled: !!identifier && (isGuestMode || !!user),
    retry: isGuestMode ? 1 : 3,
  });

  // Refresh quote data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && identifier && (isGuestMode || user)) {
        refetch();
      }
    };

    const handleFocus = () => {
      if (identifier && (isGuestMode || user)) {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetch, identifier, isGuestMode, user]);

  // Hooks and utilities
  const { data: countries } = useAllCountries();
  const { approveQuote, rejectQuote, addToCart, isUpdating } = useQuoteState(quote?.id || '');
  
  // Guest currency hook (always call but only use if in guest mode)
  const { guestCurrency } = useGuestCurrency();
  
  const { formatAmount } = useQuoteDisplayCurrency({ 
    quote, 
    guestCurrency: isGuestMode ? guestCurrency : null 
  });
  
  // Subscribe to cart store to make quote detail reactive to cart changes
  const cartItems = useCartStore((state) => state.items);
  
  // Helper function to check if this quote is in cart
  const isQuoteInCart = (quoteId: string) => {
    return cartItems.some(item => item.quoteId === quoteId);
  };
  
  const quoteSteps = useQuoteSteps(quote);

  // Computed values
  const countryName = useMemo(() => {
    return countries?.find(c => c.code === quote?.destination_country)?.name || quote?.destination_country;
  }, [countries, quote?.destination_country]);

  
  const isQuoteOwner = quote?.user_id === user?.id;
  const canViewQuote = isGuestMode || isQuoteOwner || isAdmin;
  const canTakeActions = isGuestMode || isQuoteOwner;
  const isExpired = quote?.status === 'expired';
  
  
  // Check for pending actions from guest approval
  useEffect(() => {
    const checkPendingAction = async () => {
      if (user && isGuestMode && quote) {
        const pendingAction = sessionStorage.getItem('pendingQuoteAction');
        if (pendingAction) {
          const { action, quoteId, shareToken: savedToken } = JSON.parse(pendingAction);
          
          // Verify this is the same quote
          if (quoteId === quote.id && savedToken === shareToken && action === 'approve') {
            // Clear the pending action
            sessionStorage.removeItem('pendingQuoteAction');
            
            // Check if quote is already approved by guest
            if (quote.status === 'approved' && !quote.user_id) {
              // Just transfer ownership without re-approving
              try {
                const { error: updateError } = await supabase
                  .from('quotes')
                  .update({ 
                    user_id: user.id,
                    is_anonymous: false,
                    email: user.email 
                  })
                  .eq('id', quote.id);

                if (updateError) throw updateError;
                
                toast({
                  title: "Quote Linked!",
                  description: "This quote has been linked to your account.",
                });
                
                // Navigate to the user's quote page
                setTimeout(() => {
                  navigate(`/dashboard/quotes/${quote.id}`);
                }, 1000);
              } catch (error) {
                console.error('Error linking quote:', error);
                toast({
                  title: "Error",
                  description: "Failed to link quote. Please try again.",
                  variant: "destructive",
                });
              }
            } else {
              // Execute the full approve action
              try {
                // Transfer ownership to the logged-in user
                const { error: updateError } = await supabase
                  .from('quotes')
                  .update({ 
                    user_id: user.id,
                    is_anonymous: false,
                    email: user.email 
                  })
                  .eq('id', quote.id);

                if (updateError) throw updateError;

                // Approve the quote
                await approveQuote();
                
                toast({
                  title: "Quote Approved!",
                  description: "This quote has been transferred to your account and approved.",
                });
                
                // Navigate to the user's quote page
                setTimeout(() => {
                  navigate(`/dashboard/quotes/${quote.id}`);
                }, 1000);
              } catch (error) {
                console.error('Error processing pending approval:', error);
                toast({
                  title: "Error",
                  description: "Failed to approve quote. Please try again.",
                  variant: "destructive",
                });
              }
            }
          }
        }
      }
    };
    
    checkPendingAction();
  }, [user, isGuestMode, quote, shareToken, approveQuote, navigate, toast]);
  
  
  // Get quote UI state
  const getQuoteUIState = (quote: Record<string, unknown>) => {
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
  
  // Delivery window calculation
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
        const created = new Date(quote?.created_at || '');
        const minDate = new Date(created.getTime() + (10 * 24 * 60 * 60 * 1000));
        const maxDate = new Date(created.getTime() + (18 * 24 * 60 * 60 * 1000));
        
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

        // Calculate delivery window based on route
        const created = new Date(quote.created_at);
        const processingDays = 2;
        const customsDays = 3;
        const shippingDays = parseInt(route.estimated_days_min) || 5;
        const totalMinDays = processingDays + customsDays + shippingDays;
        const totalMaxDays = totalMinDays + 5;

        const minDate = new Date(created.getTime() + (totalMinDays * 24 * 60 * 60 * 1000));
        const maxDate = new Date(created.getTime() + (totalMaxDays * 24 * 60 * 60 * 1000));

        setDeliveryWindow({
          label: `${minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
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
      }
    }

    if (quote) {
      fetchDeliveryWindow();
    }
  }, [quote?.shipping_route_id, quote?.created_at]);

  // Action handlers
  const handleApprove = async () => {
    if (!user && isGuestMode) {
      setGuestApprovalDialog({ isOpen: true, action: 'approve' });
    } else if (user && isGuestMode && quote?.user_id !== user.id) {
      // Transfer ownership for logged-in users on shared quotes
      try {
        const { error: updateError } = await supabase
          .from('quotes')
          .update({ 
            user_id: user.id,
            is_anonymous: false,
            email: user.email 
          })
          .eq('id', quote?.id);

        if (updateError) throw updateError;

        await approveQuote();
        
        toast({
          title: "Quote Approved!",
          description: "This quote has been transferred to your account.",
        });
        
        queryClient.invalidateQueries({ queryKey: ['share-quote', shareToken] });
        navigate(`/dashboard/quotes/${quote?.id}`);
      } catch (error) {
        console.error('Error transferring quote:', error);
        toast({
          title: "Error",
          description: "Failed to approve quote. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      await approveQuote();
      setIsApproveDialogOpen(false);
    }
  };

  const handleReject = async (reason?: string, notes?: string) => {
    if (!user && isGuestMode) {
      setGuestApprovalDialog({ isOpen: true, action: 'reject' });
    } else {
      await rejectQuote(reason, notes);
      setIsRejectDialogOpen(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user && isGuestMode) {
      // For guest users, redirect to checkout with quote
      navigate(`/checkout?quote=${quote?.id}`);
    } else {
      await addToCart();
    }
  };

  const handleCheckout = () => {
    if (!user && isGuestMode) {
      navigate(`/checkout?quote=${quote?.id}`);
    } else {
      navigate('/checkout');
    }
  };

  const handleMessageSupport = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to message support.",
        variant: "destructive",
      });
      return;
    }
    setShowMessages(!showMessages);
    setMobileHelpOpen(false);
  };

  const handleCancelQuote = () => {
    if (!user && isGuestMode) {
      toast({
        title: "Sign in required",
        description: "Please sign in to cancel this quote.",
        variant: "destructive",
      });
      return;
    }
    setIsRejectDialogOpen(true);
    setMobileHelpOpen(false);
  };

  const handleRequestChanges = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to request changes.",
        variant: "destructive",
      });
      return;
    }
    navigate('/messages', { state: { quoteId: quote?.id, action: 'request-changes' } });
  };

  const handleFAQ = () => {
    window.open('/faq', '_blank');
  };


  const handleOpenBreakdown = () => {
    if (isMobile) {
      setMobileBreakdownOpen(true);
    } else {
      setIsBreakdownOpen(true);
    }
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

  // Loading and error states
  if (isLoading || isAdminLoading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error.message || 'Failed to load quote. Please try again.'}
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => navigate(isGuestMode ? '/' : '/dashboard')} 
          className="mt-4"
        >
          Go Back
        </Button>
      </div>
    );
  }

  if (!quote || !canViewQuote) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Alert>
          <AlertDescription>Quote not found or you don't have permission to view it.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const renderActionButtons = () => {
    const isInCart = isQuoteInCart(quote.id);
    const statusConfig = getStatusConfig(quote.status, 'quote');
    
    // Use dynamic status configuration with fallbacks
    const canApprove = statusConfig?.allowApproval ?? (quote.status === 'sent' || quote.status === 'calculated');
    const canAddToCart = (statusConfig?.allowCartActions ?? (quote.status === 'approved')) && !isInCart;
    const canCheckout = (statusConfig?.allowCartActions ?? (quote.status === 'approved')) && isInCart;

    if (!canTakeActions && !isAdmin) return null;

    return (
      <div className="space-y-3">
        {canApprove && (
          <>
            <Button 
              onClick={handleApprove}
              disabled={isUpdating}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              Approve Quote
            </Button>
            <Button 
              onClick={() => isGuestMode && !user ? setGuestApprovalDialog({ isOpen: true, action: 'reject' }) : setIsRejectDialogOpen(true)}
              disabled={isUpdating}
              variant="outline"
              className="w-full border-red-200 hover:bg-red-50 text-red-600"
            >
              <XCircle className="mr-2 h-5 w-5" />
              Reject Quote
            </Button>
          </>
        )}

        {canAddToCart && (
          <Button 
            onClick={handleAddToCart}
            disabled={isUpdating}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Add to Cart
          </Button>
        )}

        {canCheckout && (
          <Button 
            onClick={handleCheckout}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
          >
            <CreditCard className="mr-2 h-5 w-5" />
            Proceed to Checkout
          </Button>
        )}

        {isExpired && (
          <RenewQuoteButton 
            quoteId={quote.id} 
            onSuccess={() => refetch()}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto max-w-6xl px-4 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link 
            to={isGuestMode ? "/" : "/dashboard"} 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4 group"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to {isGuestMode ? "Home" : "Dashboard"}
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Quote Details
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {quote.display_id || `#${quote.id.slice(0, 8)}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={quote.status} category="quote" />
              {quote.status === 'sent' && <QuoteExpirationTimer expiresAt={quote.expires_at} />}
              {isAdmin && <ShareQuoteButton quote={quote} variant="button" size="sm" />}
              {/* Guest Currency Selector - Only for guest users */}
              {isGuestMode && !user && (
                <GuestCurrencySelector 
                  defaultCurrency={quote?.destination_country || 'US'}
                  className="border-l border-gray-200 pl-3"
                />
              )}
            </div>
          </div>
        </div>


        {/* Progress Stepper - Only for authenticated users */}
        {!isGuestMode && user && (
          <div className="mb-6 sm:mb-8">
            <QuoteStepper 
              currentStep={getQuoteUIState(quote).step} 
              rejected={getQuoteUIState(quote).step === 'rejected'}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quote Summary Card */}
            <Card className="overflow-hidden bg-white/80 backdrop-blur-sm shadow-xl border-white/20">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-3">
                  <Package className="h-6 w-6" />
                  Quote Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {quote.quote_items && quote.quote_items.length > 0 && (
                  <div className="space-y-4">
                    {/* Product details */}
                    {quote.quote_items.length > 1 ? (
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
                      </>
                    ) : (
                      quote.quote_items.map((item, index) => (
                        <div key={item.id} className="space-y-4">
                          {index > 0 && <Separator className="my-4" />}
                          <div className="flex flex-col sm:flex-row gap-4">
                            {item.image_url && (
                              <img 
                                src={item.image_url} 
                                alt={item.product_name}
                                className="w-full sm:w-24 h-24 object-cover rounded-lg shadow-sm"
                              />
                            )}
                            <div className="flex-1 space-y-2">
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                {item.product_name}
                              </h3>
                              {item.product_url && (
                                <a 
                                  href={item.product_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                >
                                  View Product <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>Qty: {item.quantity}</span>
                                <span>Price: {formatAmount(item.item_price)}</span>
                                {item.item_weight && <span>Weight: {item.item_weight} kg</span>}
                              </div>
                              {/* Product Notes for single product */}
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
                          </div>
                        </div>
                      ))
                    )}

                    {/* Combined Price and Info Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                      <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-gray-600" />
                          <span className="text-xs text-gray-600 font-medium">Cost of Goods</span>
                        </div>
                        <span className="text-xl font-bold">{formatAmount(quote.item_price)}</span>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Receipt className="h-4 w-4 text-gray-600" />
                          <span className="text-xs text-gray-600 font-medium">Quote Total</span>
                          <button 
                            onClick={handleOpenBreakdown}
                            className="cursor-pointer hover:scale-110 transition-transform duration-200"
                          >
                            <Info className="h-3 w-3 text-gray-500 hover:text-gray-700" />
                          </button>
                        </div>
                        <span className="text-xl font-bold">{formatAmount(quote.final_total)}</span>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Weight className="h-4 w-4 text-gray-600" />
                          <span className="text-xs text-gray-600 font-medium">Total Weight</span>
                        </div>
                        <span className="text-xl font-bold">{quote.item_weight || 0} kg</span>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-gray-600" />
                          <span className="text-xs text-gray-600 font-medium">Quantity</span>
                        </div>
                        <span className="text-xl font-bold">{Array.isArray(quote.quote_items) ? quote.quote_items.reduce((sum, item) => sum + (item.quantity || 0), 0) : (quote.quantity || 1)}</span>
                      </div>
                    </div>
                    
                    {/* Info Grid for single product */}
                    {quote.quote_items.length === 1 && (
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        {/* Shipping Route in Info Grid */}
                        {(() => {
                          const purchaseCountry = quote.destination_country || quote.origin_country || 'US';
                          let destinationCountry = null;
                          
                          // Extract destination country from shipping address
                          if (quote.shipping_address) {
                            try {
                              const shippingAddr = typeof quote.shipping_address === 'string' 
                                ? JSON.parse(quote.shipping_address) 
                                : quote.shipping_address;
                              
                              if (shippingAddr?.destination_country) {
                                destinationCountry = shippingAddr.destination_country;
                              } else if (shippingAddr?.countryCode) {
                                destinationCountry = shippingAddr.countryCode;
                              }
                            } catch (e) {
                              console.warn('Failed to parse shipping address:', e);
                            }
                          }
                          
                          // Show route if different countries, otherwise just show country
                          if (destinationCountry && purchaseCountry !== destinationCountry) {
                            const fromCountryName = countries?.find(c => c.code === purchaseCountry)?.name || purchaseCountry;
                            const toCountryName = countries?.find(c => c.code === destinationCountry)?.name || destinationCountry;
                            
                            return (
                              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-slate-700 rounded-xl p-3 border border-blue-200/50 dark:border-gray-600/50 hover:shadow-md transition-all duration-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <Truck className="h-3 w-3 text-blue-600" />
                                  <span className="text-xs text-blue-600 dark:text-gray-300 font-medium">Shipping Route</span>
                                </div>
                                <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                                  <ShippingRouteDisplay 
                                    origin={purchaseCountry} 
                                    destination={destinationCountry}
                                    showIcon={false}
                                  />
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-xl p-3 border border-gray-200/50 dark:border-gray-600/50 hover:shadow-md transition-all duration-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <Globe className="h-3 w-3 text-gray-600" />
                                  <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Country</span>
                                </div>
                                <div className="font-bold text-gray-900 dark:text-gray-100">{countryName}</div>
                              </div>
                            );
                          }
                        })()}
                        <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-xl p-3 border border-gray-200/50 dark:border-gray-600/50 hover:shadow-md transition-all duration-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-3 w-3 text-gray-600" />
                            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Delivery</span>
                          </div>
                          <div className="font-bold text-gray-900 dark:text-gray-100">{deliveryWindow ? `${deliveryWindow.label} (${deliveryWindow.days})` : '—'}</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Additional info for multiple products */}
                    {quote.quote_items.length > 1 && (
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        {/* Shipping Route in Info Grid - Multiple Products */}
                        {(() => {
                          const purchaseCountry = quote.destination_country || quote.origin_country || 'US';
                          let destinationCountry = null;
                          
                          // Extract destination country from shipping address
                          if (quote.shipping_address) {
                            try {
                              const shippingAddr = typeof quote.shipping_address === 'string' 
                                ? JSON.parse(quote.shipping_address) 
                                : quote.shipping_address;
                              
                              if (shippingAddr?.destination_country) {
                                destinationCountry = shippingAddr.destination_country;
                              } else if (shippingAddr?.countryCode) {
                                destinationCountry = shippingAddr.countryCode;
                              }
                            } catch (e) {
                              console.warn('Failed to parse shipping address:', e);
                            }
                          }
                          
                          // Show route if different countries, otherwise just show country
                          if (destinationCountry && purchaseCountry !== destinationCountry) {
                            const fromCountryName = countries?.find(c => c.code === purchaseCountry)?.name || purchaseCountry;
                            const toCountryName = countries?.find(c => c.code === destinationCountry)?.name || destinationCountry;
                            
                            return (
                              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-slate-700 rounded-xl p-4 border border-blue-200/50 dark:border-gray-600/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <Truck className="h-4 w-4 text-blue-600" />
                                  <span className="text-xs text-blue-600 dark:text-gray-300 font-medium">Shipping Route</span>
                                </div>
                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                  <ShippingRouteDisplay 
                                    origin={purchaseCountry} 
                                    destination={destinationCountry}
                                    showIcon={false}
                                  />
                                </span>
                              </div>
                            );
                          } else {
                            return (
                              <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <Globe className="h-4 w-4 text-gray-600" />
                                  <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Country</span>
                                </div>
                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{countryName}</span>
                              </div>
                            );
                          }
                        })()}
                        <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-700 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-gray-600" />
                            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Delivery</span>
                          </div>
                          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{deliveryWindow ? `${deliveryWindow.label} (${deliveryWindow.days})` : '—'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>


            {/* Need Help Section - Conditional for authenticated users */}
            {!isGuestMode && user && (
              <div className="flex justify-center py-4 sm:py-6">
                <div className="md:block hidden">
                  <Popover open={isHelpOpen} onOpenChange={setHelpOpen}>
                    <PopoverTrigger asChild>
                      <button className="text-base font-medium flex items-center gap-2 text-gray-700 bg-gradient-to-r from-gray-50 to-slate-100 border shadow-sm hover:shadow-md px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105" type="button">
                        <HelpCircle className="w-5 h-5 text-gray-600" /> Need Help?
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="center" className="w-64 p-3 backdrop-blur-xl bg-white/95 shadow-2xl rounded-2xl">
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
              </div>
            )}

            {/* Messages Section - Only for authenticated users */}
            {showMessages && !isGuestMode && user && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                <QuoteMessaging quoteId={quote.id} quoteUserId={quote.user_id} />
              </div>
            )}
          </div>

          {/* Sidebar - Action Buttons */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* Actions Card - Hidden on mobile */}
              {!isMobile && (
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
                    
                    {renderActionButtons()}
                  </CardContent>
                </Card>
              )}


              {/* Mobile Help Button - Only for authenticated users */}
              {!isGuestMode && user && isMobile && (
                <Dialog open={isMobileHelpOpen} onOpenChange={setMobileHelpOpen}>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setMobileHelpOpen(true)}
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Need Help?
                  </Button>
                  <DialogContent className="sm:max-w-[350px]">
                    <div className="space-y-2">
                      <button className="flex items-center gap-3 w-full px-4 py-4 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 text-sm" onClick={handleMessageSupport}>
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                          <MessageCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        Message Support
                      </button>
                      {quote.status !== 'rejected' && (
                        <button className="flex items-center gap-3 w-full px-4 py-4 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 text-sm text-red-600" onClick={handleCancelQuote}>
                          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
                            <XCircle className="w-4 h-4 text-red-600" />
                          </div>
                          Cancel Quote
                        </button>
                      )}
                      <button className="flex items-center gap-3 w-full px-4 py-4 rounded-xl hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 text-sm" onClick={handleFAQ}>
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                          <BookOpen className="w-4 h-4 text-green-600" />
                        </div>
                        FAQ
                      </button>
                      <button className="flex items-center gap-3 w-full px-4 py-4 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 text-sm" onClick={handleRequestChanges}>
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                          <Edit2 className="w-4 h-4 text-purple-600" />
                        </div>
                        Request Changes
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Sticky Action Bar - Only when actions are available */}
        {isMobile && canTakeActions && (
          <StickyActionBar
            quote={quote}
            isOwner={canTakeActions}
            isUpdating={isUpdating}
            onApprove={handleApprove}
            onReject={() => isGuestMode && !user ? setGuestApprovalDialog({ isOpen: true, action: 'reject' }) : setIsRejectDialogOpen(true)}
            onAddToCart={handleAddToCart}
            onRenewed={() => refetch()}
          />
        )}
      </div>

      {/* Dialogs */}

      {/* Guest Approval Dialog */}
      {isGuestMode && (
        <GuestApprovalDialog
          isOpen={guestApprovalDialog.isOpen}
          onOpenChange={(open) => setGuestApprovalDialog(prev => ({ ...prev, isOpen: open }))}
          action={guestApprovalDialog.action}
          quoteId={quote.id}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['share-quote', shareToken] });
            if (guestApprovalDialog.action === 'approve') {
              navigate(`/checkout?quote=${quote.id}`);
            }
          }}
        />
      )}

      {/* Reject Dialog - Only for authenticated users */}
      {!isGuestMode && user && (
        <CustomerRejectQuoteDialog
          isOpen={isRejectDialogOpen}
          onOpenChange={setIsRejectDialogOpen}
          onConfirm={handleReject}
          isPending={isUpdating}
        />
      )}

      {/* Breakdown Modal */}
      <Dialog open={isBreakdownOpen || mobileBreakdownOpen} onOpenChange={(open) => {
        if (isMobile) {
          setMobileBreakdownOpen(open);
        } else {
          setIsBreakdownOpen(open);
        }
      }}>
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
    </div>
  );
}

// Wrapper component to provide guest currency context
export default function QuoteDetailUnified({ isShareToken = false }: UnifiedQuoteDetailProps) {
  const { shareToken } = useParams<{ shareToken: string }>();

  // Always provide GuestCurrencyProvider to avoid context errors
  return (
    <GuestCurrencyProvider shareToken={shareToken}>
      <QuoteDetailUnifiedContent isShareToken={isShareToken} />
    </GuestCurrencyProvider>
  );
}