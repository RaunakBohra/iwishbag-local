import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { OptimizedIcon, CheckCircle, Package, Truck, Clock, ChevronDown, X } from '@/components/ui/OptimizedIcon';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { QuoteStatusBadge } from '@/components/ui/QuoteStatusBadge';
import { 
  MobileStickyBar, 
  MobileProductSummary, 
  MobileBreakdown, 
  MobileTrustSignals, 
  MobileProgress
} from './ShopifyMobileOptimizations';
import { MobileQuoteOptions } from './MobileQuoteOptions';
import { CustomerBreakdown } from './CustomerBreakdown';
import { EnhancedAddonServicesSelector } from '@/components/quote/EnhancedAddonServicesSelector';
import { getBreakdownSourceCurrency } from '@/utils/currencyMigration';
import { getOriginCurrency, getDestinationCurrency } from '@/utils/originCurrency';
import { useCart } from '@/hooks/useCart';
import { useCartItem, ensureInitialized } from '@/stores/cartStore';

interface ShopifyStyleQuoteViewProps {
  viewMode: 'customer' | 'shared';
}

const QuoteProgress = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { label: 'Requested', step: 1 },
    { label: 'Calculated', step: 2 },
    { label: 'Awaiting Approval', step: 3 },
    { label: 'In Cart', step: 4 },
    { label: 'Checkout', step: 5 }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <div key={step.step} className="flex flex-col items-center">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step.step <= currentStep 
                  ? 'bg-green-500 text-white' 
                  : step.step === currentStep + 1 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step.step <= currentStep ? (
                <OptimizedIcon name="CheckCircle" className="w-4 h-4" />
              ) : (
                step.step
              )}
            </div>
            <span className={`text-xs mt-2 font-medium ${
              step.step <= currentStep ? 'text-green-600' : 'text-gray-500'
            }`}>
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <div className={`h-0.5 w-full mt-1 ${
                step.step < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
      <Progress value={(currentStep / steps.length) * 100} className="h-1" />
    </div>
  );
};

const ShopifyStyleQuoteView: React.FC<ShopifyStyleQuoteViewProps> = ({
  viewMode
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id: quoteId, shareToken } = useParams<{ id: string; shareToken: string }>();
  const { addItem, syncWithServer } = useCart();
  
  const queryClient = useQueryClient();
  
  // Use React Query for quote data with cache invalidation
  const { data: quote, isLoading: loading, refetch: refetchQuote } = useQuery({
    queryKey: ['quote', quoteId || shareToken],
    queryFn: async () => {
      let query = supabase.from('quotes_v2').select('*');
      
      if (quoteId) {
        query = query.eq('id', quoteId);
      } else if (shareToken) {
        query = query.eq('share_token', shareToken);
      }

      const { data, error } = await query.single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!(quoteId || shareToken),
    staleTime: 0, // Always refetch for real-time updates
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch current user profile for currency preferences
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_display_currency, country')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Determine display currency: Priority 1: User profile preference, Priority 2: Destination currency
  const getDisplayCurrency = useCallback(() => {
    // For authenticated users, check profile preference first
    if (user?.id && userProfile?.preferred_display_currency) {
      return userProfile.preferred_display_currency;
    }
    // Fall back to destination country currency (customer's country)
    if (quote?.destination_country) {
      return getDestinationCurrency(quote.destination_country);
    }
    return 'USD';
  }, [user?.id, userProfile?.preferred_display_currency, quote?.destination_country]);

  const displayCurrency = getDisplayCurrency();

  // Currency conversion function
  const convertCurrency = useCallback(async (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    try {
      const { currencyService } = await import('@/services/CurrencyService');
      return await currencyService.convertAmount(amount, fromCurrency, toCurrency);
    } catch (error) {
      console.warn(`Currency conversion failed ${fromCurrency}->${toCurrency}:`, error);
      return amount; // Return original amount if conversion fails
    }
  }, []);

  // Enhanced formatCurrency function that handles currency conversion
  const formatDisplayCurrency = useCallback(async (amount: number, sourceCurrency?: string) => {
    // Use actual breakdown source currency for accurate conversion
    const fromCurrency = sourceCurrency || getBreakdownSourceCurrency(quote);
    
    if (fromCurrency === displayCurrency) {
      return formatCurrency(amount, displayCurrency);
    }
    
    try {
      const convertedAmount = await convertCurrency(amount, fromCurrency, displayCurrency);
      return formatCurrency(convertedAmount, displayCurrency);
    } catch (error) {
      console.warn('Currency formatting failed, using original:', error);
      return formatCurrency(amount, fromCurrency);
    }
  }, [quote, displayCurrency, convertCurrency]);

  // State to hold converted amounts for display
  const [convertedAmounts, setConvertedAmounts] = useState<{
    total: string;
    totalNumeric: number;
    itemsConverted: boolean;
  }>({
    total: '',
    totalNumeric: 0,
    itemsConverted: false
  });
  
  // State to receive shared total from CustomerBreakdown
  const [sharedTotal, setSharedTotal] = useState<{
    formatted: string;
    numeric: number;
    currency: string;
  } | null>(null);

  // Memoized callback to prevent infinite re-renders
  const handleTotalCalculated = useCallback((formattedTotal: string, numericTotal: number, currency: string) => {
    // Only update if the values have actually changed
    setSharedTotal(prev => {
      if (prev?.formatted === formattedTotal && prev?.numeric === numericTotal && prev?.currency === currency) {
        return prev; // No change, return previous state
      }
      // Reduce console spam - only log when there's an actual change
      console.log('[ShopifyStyleQuoteView] Total updated:', {
        formattedTotal,
        numericTotal,
        currency
      });
      return {
        formatted: formattedTotal,
        numeric: numericTotal,
        currency: currency
      };
    });
  }, []); // Empty dependency array since this should be stable

  // Helper function to format individual item quote price in display currency
  const formatItemQuotePrice = useCallback(async (item: any, items: any[]) => {
    try {
      const itemsCost = items.reduce((sum, i) => sum + (i.costprice_origin * i.quantity), 0);
      const itemProportion = (item.costprice_origin * item.quantity) / itemsCost;
      
      // Use the appropriate total based on origin currency system - CLEAR: This is in origin country currency
      const totalOriginCurrency = quote.total_quote_origincurrency || quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount;
      const itemQuotePrice = totalOriginCurrency * itemProportion;
      
      // Get source currency for conversion
      const sourceCurrency = getBreakdownSourceCurrency(quote);
      
      if (sourceCurrency === displayCurrency) {
        return formatCurrency(itemQuotePrice, displayCurrency);
      }
      
      const convertedPrice = await convertCurrency(itemQuotePrice, sourceCurrency, displayCurrency);
      return formatCurrency(convertedPrice, displayCurrency);
    } catch (error) {
      console.warn('Failed to convert item quote price:', error);
      const itemsCost = items.reduce((sum, i) => sum + (i.costprice_origin * i.quantity), 0);
      const itemProportion = (item.costprice_origin * item.quantity) / itemsCost;
      const totalOriginCurrency = quote.total_quote_origincurrency || quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount;
      const itemQuotePrice = totalOriginCurrency * itemProportion;
      return formatCurrency(itemQuotePrice, getBreakdownSourceCurrency(quote));
    }
  }, [quote, displayCurrency, convertCurrency]);

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [questionType, setQuestionType] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [mobileBreakdownExpanded, setMobileBreakdownExpanded] = useState(false);
  const [quoteOptions, setQuoteOptions] = useState({
    shipping: 'express',
    adjustedTotal: 0,
    shippingAdjustment: 0
  });
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDetails, setRejectDetails] = useState('');
  const [shippingOptionsExpanded, setShippingOptionsExpanded] = useState(false);
  
  // Addon services state
  const [addonSelections, setAddonSelections] = useState([]);
  const [addonTotalCost, setAddonTotalCost] = useState(0);

  // Handle addon services selection changes
  const handleAddonServicesChange = useCallback((selections, totalCost) => {
    console.log('[ShopifyStyleQuoteView] Addon services updated:', { selections, totalCost });
    setAddonSelections(selections);
    setAddonTotalCost(totalCost);
  }, []);
  
  // Cart functionality - reactive to cart state changes
  const cartItem = useCartItem(quote?.id || '');
  
  // Only consider database in_cart flag if quote belongs to current user
  const userOwnsQuote = quote?.customer_id === user?.id || quote?.customer_email === user?.email;
  const databaseInCartFlag = userOwnsQuote ? (quote?.in_cart || false) : false;
  const isInCart = Boolean(cartItem) || databaseInCartFlag;
  

  // Ensure cart is initialized
  useEffect(() => {
    ensureInitialized().catch(console.error);
  }, []);

  // Convert currency amounts when quote or display currency changes
  useEffect(() => {
    if (!quote) return;
    
    const convertAmounts = async () => {
      try {
        // Use origin currency system - CLEAR: Always use origin country to determine source currency
        const originCurrency = quote.origin_country ? getOriginCurrency(quote.origin_country) : 'USD';
        const totalOriginCurrency = quote.total_quote_origincurrency || quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount || 0;
        
        console.log(`[ShopifyStyleQuoteView] Converting quote ${quote.id}:`, {
          originCurrency,
          displayCurrency: displayCurrency || originCurrency,
          totalOriginCurrency,
          origin_country: quote.origin_country,
          total_quote_origincurrency: quote.total_quote_origincurrency,
          total_origin_currency: quote.total_origin_currency
        });
        
        // Use origin currency as display currency if none provided
        const targetCurrency = displayCurrency || originCurrency;
        
        if (originCurrency === targetCurrency) {
          setConvertedAmounts({
            total: formatCurrency(totalOriginCurrency, targetCurrency),
            totalNumeric: totalOriginCurrency,
            itemsConverted: true
          });
          return;
        }

        const convertedTotal = await convertCurrency(totalOriginCurrency, originCurrency, targetCurrency);
        setConvertedAmounts({
          total: formatCurrency(convertedTotal, targetCurrency),
          totalNumeric: convertedTotal,
          itemsConverted: true
        });
      } catch (error) {
        console.warn('Failed to convert currency amounts:', error);
        // Fallback to original currency
        const fallbackTotal = quote.total_quote_origincurrency || quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount;
        const fallbackCurrency = getBreakdownSourceCurrency(quote);
        setConvertedAmounts({
          total: formatCurrency(fallbackTotal, fallbackCurrency),
          totalNumeric: fallbackTotal,
          itemsConverted: false
        });
      }
    };

    convertAmounts();
  }, [quote, displayCurrency, convertCurrency]);


  // React Query handles data fetching automatically

  // Quote refresh function for components that need to trigger updates
  const refreshQuote = useCallback(() => {
    console.log('🔄 Refreshing quote data...');
    refetchQuote();
  }, [refetchQuote]);





  const handleApprove = async () => {
    try {
      // Use adjusted total if options have been changed - CLEAR: This is in origin currency
      const baseTotalOriginCurrency = quoteOptions.adjustedTotal || quote.total_quote_origincurrency || quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount;
      const finalTotalWithAddons = baseTotalOriginCurrency + addonTotalCost; // Include addon services

      console.log('[ShopifyStyleQuoteView] Approving quote with addons:', {
        baseTotal: baseTotalOriginCurrency,
        addonCost: addonTotalCost,
        finalTotal: finalTotalWithAddons,
        selectedAddons: addonSelections.filter(s => s.is_selected)
      });

      // Apply addon services to the quote first
      if (addonSelections.length > 0) {
        const { addonServicesService } = await import('@/services/AddonServicesService');
        const applyResult = await addonServicesService.applyAddonServices(
          quote.id,
          'quote',
          addonSelections,
          user?.id
        );

        if (!applyResult.success) {
          console.error('Failed to apply addon services:', applyResult.error);
          toast({
            title: 'Error applying add-on services',
            description: applyResult.error || 'Please try again',
            variant: 'destructive'
          });
          return;
        }
      }

      // Update quote status to approved with selected options and addon services
      await supabase
        .from('quotes_v2')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          final_total_origincurrency: finalTotalWithAddons,
          // Store selected options and addon services in applied_discounts JSONB field
          applied_discounts: {
            shipping: quoteOptions.shipping,
            finalTotal: finalTotalWithAddons,
            baseTotal: baseTotalOriginCurrency,
            addonServices: {
              totalCost: addonTotalCost,
              selections: addonSelections.filter(s => s.is_selected),
              currency: displayCurrency
            },
            adjustments: {
              shippingAdjustment: quoteOptions.shippingAdjustment
            }
          }
        })
        .eq('id', quote.id);
      
      // Invalidate queries to refresh quote data and show new button state
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      
      toast({
        title: "Quote Approved",
        description: "Quote has been approved! You can now add it to your cart.",
      });
      
    } catch (error) {
      console.error('Error approving quote:', error);
      
      toast({
        title: "Error",
        description: "Failed to approve quote. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    try {
      // Update quote status to rejected with reason
      await supabase
        .from('quotes_v2')
        .update({ 
          status: 'rejected',
          // Store rejection info in admin_notes as JSONB doesn't exist for rejection fields
          admin_notes: `Rejection Reason: ${rejectReason}\n\nDetails: ${rejectDetails}\n\nRejected at: ${new Date().toISOString()}`
        })
        .eq('id', quote.id);

      // Also create a support ticket for follow-up
      await supabase
        .from('support_system')
        .insert({
          user_id: user?.id,
          quote_id: quote.id,
          system_type: 'ticket',
          ticket_data: {
            subject: `Quote Rejected - #${quote.quote_number || quote.id.slice(0, 8)}`,
            description: `Quote rejected. Reason: ${rejectReason}\n\nDetails: ${rejectDetails}`,
            category: 'quote_rejection',
            priority: 'medium',
            status: 'open',
            rejection_reason: rejectReason,
            rejection_details: rejectDetails
          }
        });

      toast({
        title: "Quote Rejected",
        description: "We've received your feedback and will follow up soon.",
      });

      setRejectModalOpen(false);
      setRejectReason('');
      setRejectDetails('');
      
      // Refresh quote data to show updated status
      refreshQuote();
      
    } catch (error) {
      console.error('Error rejecting quote:', error);
      
      toast({
        title: "Error",
        description: "Failed to reject quote. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddToCart = async () => {
    try {
      if (!quote || !user) return;

      // Add to cart using the cart store
      await addItem(quote);
      
      toast({
        title: "Added to Cart",
        description: "Quote has been added to your cart.",
      });

    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add to cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitQuestion = async () => {
    try {
      // Create a support ticket
      const { error } = await supabase
        .from('support_system')
        .insert({
          user_id: user?.id,
          quote_id: quote.id,
          system_type: 'ticket',
          ticket_data: {
            subject: `Question about Quote #${quote.quote_number || quote.id.slice(0, 8)}`,
            description: questionText,
            category: questionType,
            priority: 'medium',
            status: 'open'
          }
        });

      if (error) throw error;

      toast({
        title: "Question Submitted",
        description: "We'll get back to you within 24 hours",
      });

      setQuestionModalOpen(false);
      setQuestionText('');
      setQuestionType('');
      
    } catch (error) {
      console.error('Error submitting question:', error);
      toast({
        title: "Error",
        description: "Failed to submit question",
        variant: "destructive"
      });
    }
  };

  const getDaysUntilExpiry = () => {
    if (!quote?.expires_at) return null;
    const expiry = new Date(quote.expires_at);
    const now = new Date();
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your quote...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <OptimizedIcon name="Package" className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Quote Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The quote you're looking for doesn't exist or has expired.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items = quote.items || [];
  const breakdown = quote.calculation_data?.breakdown || {};
  const daysLeft = getDaysUntilExpiry();
  const currentStep = quote.status === 'approved' ? 4 : 3;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-8">
        {/* Back Button */}
        {viewMode === 'customer' && (
          <Button 
            variant="ghost" 
            className="mb-6 p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/dashboard/quotes')}
          >
            <OptimizedIcon name="ArrowLeft" className="w-4 h-4 mr-2" />
            Back to Quotes
          </Button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <h1 className="text-3xl font-bold">Your Quote is Ready</h1>
            <QuoteStatusBadge status={quote.status} />
          </div>
          <p className="text-muted-foreground">
            {quote.status === 'approved' ? 'Your quote has been approved! Add it to cart to continue.' :
             quote.status === 'rejected' ? 'This quote was rejected. You can approve it or ask questions below.' :
             'Review your quote and take an action below'}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="hidden md:block">
          <QuoteProgress currentStep={currentStep} />
        </div>
        <MobileProgress currentStep={currentStep} />

        {/* Expiry Warning - Only show for non-approved quotes */}
        {daysLeft && daysLeft <= 7 && quote.status !== 'approved' && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <OptimizedIcon name="Clock" className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">
                    {daysLeft <= 1 ? 'Quote expires today!' : `Quote expires in ${daysLeft} days`}
                  </p>
                  <p className="text-sm text-orange-700">
                    Approve now to secure these prices
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile Components */}
        <MobileProductSummary 
          items={items} 
          quote={quote} 
          formatCurrency={formatCurrency}
          displayCurrency={displayCurrency}
        />
        
        <div className="md:hidden">
          <MobileQuoteOptions
            quote={quote}
            breakdown={breakdown}
            quoteOptions={quoteOptions}
            onOptionsChange={setQuoteOptions}
            formatCurrency={formatCurrency}
            onQuoteUpdate={refreshQuote}
            displayCurrency={displayCurrency}
          />
        </div>
        
        <MobileBreakdown 
          quote={quote}
          breakdown={breakdown}
          expanded={mobileBreakdownExpanded}
          onToggle={() => setMobileBreakdownExpanded(!mobileBreakdownExpanded)}
          formatCurrency={formatCurrency}
          quoteOptions={quoteOptions}
          onOptionsChange={setQuoteOptions}
          displayCurrency={displayCurrency}
        />
        
        <MobileTrustSignals />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Product Details & Options */}
          <div className="lg:col-span-2 hidden md:block">

            {/* Your Order - Enhanced as Main Product Display */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Your Order</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Visual Header with Item Images and Stats */}
                <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                  <div className="flex items-start gap-4 mb-4">
                    {/* Compact Item Images */}
                    <div className="flex gap-2">
                      {items.slice(0, 3).map((item: any, index: number) => (
                        <div key={index} className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                          {item.images?.[0] ? (
                            <img 
                              src={item.images[0]} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <OptimizedIcon name="Package" className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                      ))}
                      {items.length > 3 && (
                        <div className="w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">+{items.length - 3}</span>
                        </div>
                      )}
                    </div>

                    {/* Summary Stats */}
                    <div className="flex-1">
                      <div className="mb-2">
                        <h3 className="font-semibold text-lg mb-1">
                          {items.length > 1 ? (
                            <>
                              <span>{items[0]?.name}</span>
                              <span className="text-gray-600"> + {items.length - 1} more</span>
                            </>
                          ) : (
                            // Single item - make name clickable
                            items[0]?.url ? (
                              <a 
                                href={items[0].url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {items[0]?.name}
                              </a>
                            ) : (
                              <span>{items[0]?.name}</span>
                            )
                          )}
                        </h3>
                        <div className="text-sm text-muted-foreground">
                          {items.length} item{items.length !== 1 ? 's' : ''} • {items.reduce((sum, item) => sum + (item.weight || 0), 0).toFixed(2)}kg total
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          <span className="text-sm font-medium">All items verified</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="space-y-1">
                          <div>
                            <span className="font-medium">
                              Item costs: {formatCurrency(items.reduce((sum, item) => sum + (item.costprice_origin * item.quantity), 0), getOriginCurrency(quote.origin_country))}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              (in {getOriginCurrency(quote.origin_country)})
                            </span>
                          </div>
                          <div className="text-blue-700 font-semibold">
                            Total quote: {convertedAmounts.total || formatCurrency(quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount, displayCurrency)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Estimate */}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-muted-foreground">
                        <OptimizedIcon name="Truck" className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Estimated delivery</span>
                      </div>
                      <span className="font-semibold text-blue-700">
                        {(() => {
                          // Get selected shipping option from route calculations
                          const routeCalculations = quote.calculation_data?.route_calculations;
                          const deliveryOption = routeCalculations?.delivery_option_used;
                          
                          if (deliveryOption?.delivery_days) {
                            const [minDays, maxDays] = deliveryOption.delivery_days.split('-').map(d => parseInt(d.trim()));
                            const minDate = new Date(Date.now() + minDays * 24 * 60 * 60 * 1000);
                            const maxDate = new Date(Date.now() + maxDays * 24 * 60 * 60 * 1000);
                            
                            return `${minDate.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })} - ${maxDate.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })} (${deliveryOption.delivery_days} days)`;
                          }
                          return 'To be confirmed';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Individual Item Details - Only show for multiple items */}
                {items.length > 1 && (
                <div className="space-y-3">
                  {items.map((item: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                        {item.images?.[0] ? (
                          <img 
                            src={item.images[0]} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {item.url ? (
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {item.name}
                          </a>
                        ) : (
                          <p className="font-medium text-sm">{item.name}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>Qty: {item.quantity}</span>
                          <span>•</span>
                          <span>{item.weight || 0}kg</span>
                          <span>•</span>
                          <span className="font-medium text-gray-700">
                            {formatCurrency(item.costprice_origin, getOriginCurrency(quote.origin_country))} each
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-gray-900">
                            Total: {formatCurrency(item.costprice_origin * item.quantity, getOriginCurrency(quote.origin_country))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                )}

              </CardContent>
            </Card>

            {/* Shipping Options - Collapsible */}
            <Card className="mb-6">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setShippingOptionsExpanded(!shippingOptionsExpanded)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <OptimizedIcon name="Truck" className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-lg">Choose Your Shipping Speed</CardTitle>
                  </div>
                  <OptimizedIcon name="ChevronDown" className={`w-5 h-5 text-gray-400 transition-transform ${shippingOptionsExpanded ? 'rotate-180' : ''}`} />
                </div>
                <p className="text-sm text-muted-foreground text-left">
                  Select your preferred shipping option. Faster shipping costs more but gets your items quicker.
                </p>
              </CardHeader>
              {shippingOptionsExpanded && (
                <CardContent>
                <div className="grid gap-3">
                  {/* Standard Shipping */}
                  <div 
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-gray-50 transition-all ${
                      quoteOptions.shipping === 'standard' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                    onClick={() => setQuoteOptions(prev => ({ 
                      ...prev, 
                      shipping: 'standard',
                      shippingAdjustment: 0,
                      adjustedTotal: (quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount)
                    }))}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        checked={quoteOptions.shipping === 'standard'}
                        onChange={() => setQuoteOptions(prev => ({ 
                          ...prev, 
                          shipping: 'standard',
                          shippingAdjustment: 0,
                          adjustedTotal: (quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount)
                        }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-medium">Standard Shipping</div>
                          <div className="text-sm text-muted-foreground">7-14 business days</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">Included</div>
                      <div className="text-xs text-muted-foreground">No additional cost</div>
                    </div>
                  </div>

                  {/* Express Shipping */}
                  <div 
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-gray-50 transition-all ${
                      quoteOptions.shipping === 'express' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                    onClick={() => setQuoteOptions(prev => ({ 
                      ...prev, 
                      shipping: 'express',
                      shippingAdjustment: 25,
                      adjustedTotal: (quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount) + 25
                    }))}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        checked={quoteOptions.shipping === 'express'}
                        onChange={() => setQuoteOptions(prev => ({ 
                          ...prev, 
                          shipping: 'express',
                          shippingAdjustment: 25,
                          adjustedTotal: (quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount) + 25
                        }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-orange-600" />
                        <div>
                          <div className="font-medium">Express Shipping</div>
                          <div className="text-sm text-muted-foreground">3-7 business days</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">+{formatCurrency(25, displayCurrency)}</div>
                      <div className="text-xs text-muted-foreground">Additional cost</div>
                    </div>
                  </div>

                  {/* Priority Shipping */}
                  <div 
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-gray-50 transition-all ${
                      quoteOptions.shipping === 'priority' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                    onClick={() => setQuoteOptions(prev => ({ 
                      ...prev, 
                      shipping: 'priority',
                      shippingAdjustment: 45,
                      adjustedTotal: (quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount) + 45
                    }))}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        checked={quoteOptions.shipping === 'priority'}
                        onChange={() => setQuoteOptions(prev => ({ 
                          ...prev, 
                          shipping: 'priority',
                          shippingAdjustment: 45,
                          adjustedTotal: (quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount) + 45
                        }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-3">
                        <Truck className="w-5 h-5 text-red-600" />
                        <div>
                          <div className="font-medium">Priority Shipping</div>
                          <div className="text-sm text-muted-foreground">1-3 business days</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">+{formatCurrency(45, displayCurrency)}</div>
                      <div className="text-xs text-muted-foreground">Fastest option</div>
                    </div>
                  </div>
                </div>

                {/* Shipping Info */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 mb-1">Delivery Timeline</p>
                      <p className="text-blue-800">
                        Business days are Monday-Friday, excluding holidays. Express and Priority options include tracking.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              )}
            </Card>

            {/* Pricing Breakdown */}
            <CustomerBreakdown 
              quote={quote}
              formatCurrency={formatCurrency}
              displayCurrency={displayCurrency}
              onTotalCalculated={handleTotalCalculated}
            />


            {/* Enhanced Addon Services Selector - Only show for pending/rejected quotes */}
            {(quote.status === 'pending' || quote.status === 'rejected') && quote.total_quote_origincurrency && (
              <EnhancedAddonServicesSelector
                quoteId={quote.id}
                orderValue={quote.total_quote_origincurrency}
                currency={displayCurrency}
                customerCountry={quote.destination_country}
                customerTier={user ? 'regular' : 'new'}
                onSelectionChange={handleAddonServicesChange}
                showRecommendations={true}
                showBundles={true}
                compact={false}
                className="mb-6"
              />
            )}
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="hidden md:block">
            {/* Quote Summary */}
            <Card className="mb-6 sticky top-6">
              <CardContent className="p-6">
                {/* Quote Info */}
                <div className="space-y-3 mb-6">
                  {/* Base Quote Total */}
                  <div className="text-lg font-semibold text-gray-900">
                    Quote total: {(() => {
                      if (quoteOptions.adjustedTotal > 0) {
                        return formatCurrency(quoteOptions.adjustedTotal, displayCurrency);
                      }
                      if (sharedTotal?.formatted) {
                        return sharedTotal.formatted;
                      }
                      if (convertedAmounts.total) {
                        return convertedAmounts.total;
                      }
                      const total = quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount || 0;
                      const currency = displayCurrency || getBreakdownSourceCurrency(quote);
                      return formatCurrency(total, currency);
                    })()}
                  </div>

                  {/* Addon Services Cost */}
                  {addonTotalCost > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Add-on services:</span>
                      <span className="font-medium text-blue-600">
                        +{formatCurrency(addonTotalCost, displayCurrency)}
                      </span>
                    </div>
                  )}

                  {/* Total with Add-ons */}
                  {addonTotalCost > 0 && (
                    <div className="pt-2 border-t">
                      <div className="text-xl font-bold text-green-600">
                        Total amount: {(() => {
                          const baseTotal = quoteOptions.adjustedTotal > 0 
                            ? quoteOptions.adjustedTotal
                            : quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount || 0;
                          return formatCurrency(baseTotal + addonTotalCost, displayCurrency);
                        })()}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-600">
                    Valid until {quote.expires_at ? 
                      new Date(quote.expires_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'No expiry'
                    }{daysLeft && ` (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)`}
                  </div>
                </div>

                <Separator className="mb-6" />

                {/* Actions - Dynamic buttons based on quote status and cart state */}
                <div className="space-y-3">
                    {/* Primary Action Button */}
                    {quote.status === 'approved' ? (
                      // For approved quotes: Show Add to Cart / Added to Cart
                      <Button 
                        className="w-full h-12 text-base font-medium"
                        onClick={async () => {
                          if (isInCart) {
                            navigate('/cart');
                          } else {
                            await handleAddToCart();
                          }
                        }}
                        variant={isInCart ? 'outline' : 'default'}
                      >
                        {isInCart ? (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Added to Cart - View Cart
                          </>
                        ) : (
                          <>
                            <Package className="w-5 h-5 mr-2" />
                            Add to Cart
                          </>
                        )}
                      </Button>
                    ) : (
                      // For pending/rejected quotes: Show Approve button
                      <Button 
                        className="w-full h-12 text-base font-medium"
                        onClick={handleApprove}
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Approve Quote
                      </Button>
                    )}

                    {/* Secondary Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Reject button - only show for pending quotes, not for rejected quotes */}
                      {quote.status === 'pending' && (
                        <Button 
                          variant="destructive" 
                          className="h-12"
                          onClick={() => setRejectModalOpen(true)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject Quote
                        </Button>
                      )}
                      
                      {/* Ask Question button - always visible, full width when reject not shown */}
                      <Button 
                        variant="outline" 
                        className={quote.status === 'pending' ? 'h-12' : 'col-span-2 h-12'}
                        onClick={() => setQuestionModalOpen(true)}
                      >
                        <OptimizedIcon name="MessageCircle" className="w-4 h-4 mr-2" />
                        Ask Question
                      </Button>
                    </div>

                  </div>

                  <Separator />

                  {/* Trust Signals */}
                  <div className="text-center text-xs text-muted-foreground">
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <a href="/terms-conditions#shipping" className="text-blue-600 hover:underline">Shipping Terms</a>
                      <span>•</span>
                      <a href="/help" className="text-blue-600 hover:underline">FAQ</a>
                    </div>
                  </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

      {/* Approve Modal */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <div className="text-2xl font-bold text-green-900 mb-1">
                {convertedAmounts.total || formatCurrency(quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount, getBreakdownSourceCurrency(quote))}
              </div>
              <div className="text-sm text-green-700">
                Quote #{quote.quote_number || quote.id.slice(0, 8)}
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <p className="font-medium">By approving this quote:</p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  You confirm all details and pricing
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  Quote will be added to your cart
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                  You can review everything before checkout
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setApproveModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleApprove} className="flex-1">
                <CreditCard className="w-4 h-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reject Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Help us improve by letting us know why you're rejecting this quote. We'll use this feedback to provide better quotes in the future.
            </p>
            
            <div>
              <label className="block text-sm font-medium mb-2">Main reason for rejection</label>
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the main reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price_too_high">Price is too high</SelectItem>
                  <SelectItem value="shipping_too_slow">Shipping is too slow</SelectItem>
                  <SelectItem value="shipping_too_expensive">Shipping costs too much</SelectItem>
                  <SelectItem value="dont_need_anymore">Don't need the items anymore</SelectItem>
                  <SelectItem value="found_better_deal">Found a better deal elsewhere</SelectItem>
                  <SelectItem value="missing_items">Some items are missing</SelectItem>
                  <SelectItem value="incorrect_calculation">Quote calculation seems incorrect</SelectItem>
                  <SelectItem value="payment_issues">Payment method issues</SelectItem>
                  <SelectItem value="other">Other reason</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Additional details (optional)</label>
              <Textarea 
                placeholder="Any additional feedback to help us serve you better..."
                value={rejectDetails}
                onChange={(e) => setRejectDetails(e.target.value)}
                rows={3}
              />
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Rejecting this quote will mark it as declined and create a support ticket for our team to review. You can always request a new quote with different requirements.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setRejectModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleReject} 
                disabled={!rejectReason}
                className="flex-1"
              >
                Reject Quote
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Modal */}
      <Dialog open={questionModalOpen} onOpenChange={setQuestionModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Modifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Let us know what you'd like to change and we'll get back to you within 24 hours.
            </p>
            
            <div>
              <label className="block text-sm font-medium mb-2">What would you like to modify?</label>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pricing">Pricing concerns</SelectItem>
                  <SelectItem value="shipping">Shipping options</SelectItem>
                  <SelectItem value="products">Product modifications</SelectItem>
                  <SelectItem value="delivery">Delivery timeline</SelectItem>
                  <SelectItem value="insurance">Insurance coverage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Please explain in detail</label>
              <Textarea 
                placeholder="The more details you provide, the better we can help..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setQuestionModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitQuestion} 
                disabled={!questionType || !questionText.trim()}
                className="flex-1"
              >
                <OptimizedIcon name="MessageCircle" className="w-4 h-4 mr-2" />
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Mobile Sticky Bar */}
      <MobileStickyBar 
        quote={quote}
        onApprove={() => {
          if (quote.status === 'approved' && isInCart) {
            navigate('/cart');
          } else {
            handleApprove();
          }
        }}
        onRequestChanges={() => setQuestionModalOpen(true)}
        onReject={() => setRejectModalOpen(true)}
        formatCurrency={formatCurrency}
        adjustedTotal={quoteOptions.adjustedTotal}
        displayCurrency={displayCurrency}
        convertedTotal={convertedAmounts.total}
      />

    </div>
  );
};

export default ShopifyStyleQuoteView;