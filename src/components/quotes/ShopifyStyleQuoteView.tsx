import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  Package, 
  Truck, 
  Shield, 
  Clock, 
  Download,
  MessageCircle,
  ChevronRight,
  Star,
  Heart,
  ArrowLeft,
  Lock,
  CreditCard,
  Tag,
  Zap,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/stores/cartStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { 
  MobileStickyBar, 
  MobileProductSummary, 
  MobileBreakdown, 
  MobileTrustSignals, 
  MobileProgress
} from './ShopifyMobileOptimizations';
import { MobileQuoteOptions } from './MobileQuoteOptions';
import { CustomerBreakdown } from './CustomerBreakdown';
import { getBreakdownSourceCurrency } from '@/utils/currencyMigration';
import { getOriginCurrency } from '@/utils/originCurrency';

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
                <CheckCircle className="w-4 h-4" />
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

export const ShopifyStyleQuoteView: React.FC<ShopifyStyleQuoteViewProps> = ({
  viewMode
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCartStore();
  const { id: quoteId, shareToken } = useParams<{ id: string; shareToken: string }>();
  
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
      const { getDestinationCurrency } = require('@/utils/originCurrency');
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

  // Helper function to format individual item quote price in display currency
  const formatItemQuotePrice = useCallback(async (item: any, items: any[]) => {
    try {
      const itemsCost = items.reduce((sum, i) => sum + (i.costprice_origin * i.quantity), 0);
      const itemProportion = (item.costprice_origin * item.quantity) / itemsCost;
      
      // Use the appropriate total based on origin currency system
      const quoteTotal = quote.total_origin_currency || quote.origin_total_amount || quote.total_usd;
      const itemQuotePrice = quoteTotal * itemProportion;
      
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
      const quoteTotal = quote.total_origin_currency || quote.origin_total_amount || quote.total_usd;
      const itemQuotePrice = quoteTotal * itemProportion;
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
    insurance: true,
    discountCode: '',
    adjustedTotal: 0,
    shippingAdjustment: 0,
    insuranceAdjustment: 0,
    discountAmount: 0
  });
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDetails, setRejectDetails] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState('');
  const [couponsModalOpen, setCouponsModalOpen] = useState(false);

  // Convert currency amounts when quote or display currency changes
  useEffect(() => {
    if (!quote || !displayCurrency) return;
    
    const convertAmounts = async () => {
      try {
        // Use origin currency system
        const sourceCurrency = getBreakdownSourceCurrency(quote);
        const quoteTotal = quote.total_origin_currency || quote.origin_total_amount || quote.total_usd;
        
        console.log(`[ShopifyStyleQuoteView] Converting ${sourceCurrency} → ${displayCurrency} for quote ${quote.id}`);
        
        if (sourceCurrency === displayCurrency) {
          setConvertedAmounts({
            total: formatCurrency(quoteTotal, displayCurrency),
            totalNumeric: quoteTotal,
            itemsConverted: true
          });
          return;
        }

        const convertedTotal = await convertCurrency(quoteTotal, sourceCurrency, displayCurrency);
        setConvertedAmounts({
          total: formatCurrency(convertedTotal, displayCurrency),
          totalNumeric: convertedTotal,
          itemsConverted: true
        });
      } catch (error) {
        console.warn('Failed to convert currency amounts:', error);
        // Fallback to original currency
        const fallbackTotal = quote.total_origin_currency || quote.origin_total_amount || quote.total_usd;
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


  // Available coupons for this order - fetch real data from database
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  const fetchAvailableCoupons = async () => {
    if (!quote || !user) return [];
    
    setLoadingCoupons(true);
    try {
      const orderTotal = quote.total_origin_currency || quote.origin_total_amount || quote.total_usd;
      const handlingFee = quote.calculation_data?.calculation_steps?.handling_fee || 0;
      
      const { data, error } = await supabase.rpc('calculate_applicable_discounts', {
        p_customer_id: user.id,
        p_quote_total: orderTotal,
        p_handling_fee: handlingFee,
        p_payment_method: 'card', // Default payment method
        p_country_code: quote.destination_country
      });

      if (error) {
        console.error('❌ Failed to fetch coupons:', error);
        return [];
      }

      console.log('🎫 Raw coupon data from DB:', data);
      
      const coupons = (data || []).map((discount: any) => {
        const title = getDiscountTitle(discount.discount_code, discount.discount_type);
        const discountDisplay = discount.discount_type === 'percentage' ? `${discount.value}% off` : `$${discount.value} off`;
        
        console.log('🏷️ Processing coupon:', {
          code: discount.discount_code,
          originalType: discount.discount_type,
          generatedTitle: title,
          discountDisplay
        });
        
        return {
          code: discount.discount_code,
          name: title,
          discount: discountDisplay,
          description: getDiscountDescription(discount.discount_code),
          savings: discount.discount_amount,
          applicable_amount: discount.applicable_amount,
          priority: discount.priority,
          type: discount.discount_type
        };
      });

      setAvailableCoupons(coupons);
      return coupons;
    } catch (error) {
      console.error('❌ Error fetching coupons:', error);
      return [];
    } finally {
      setLoadingCoupons(false);
    }
  };

  const getDiscountTitle = (code: string, type: string) => {
    const titles: { [key: string]: string } = {
      'FIRST_TIME_FEES_50': 'First Time Customer Discount',
      'CUSTOMS_WAIVER_1000': 'Free Customs Duty',
      'NO_HANDLING_500': 'Free Handling',
      'BULK_HANDLING_25': 'Bulk Order Discount',
      'PREMIUM_ALL_FEES': 'Premium Order Benefits',
      'PLUS_CUSTOMS_50': 'Plus Member Savings',
      'WELCOME10': 'Welcome Offer',
      'BULK15': 'Bulk Purchase Discount',
      'TEST20': 'Limited Time Offer',
      'SAVE25': 'Save $25 Off',
      'DASHAIN2025': 'Festival Special Offer',
      'INDIA_SHIP_10': 'India Shipping Discount'
    };
    return titles[code] || `${type === 'percentage' ? 'Percentage' : 'Fixed Amount'} Discount`;
  };

  const getDiscountDescription = (code: string) => {
    const descriptions: { [key: string]: string } = {
      'FIRST_TIME_FEES_50': 'Special welcome offer for new customers',
      'CUSTOMS_WAIVER_1000': 'No customs duty on orders above $1000',
      'NO_HANDLING_500': 'No handling fee for orders over $500',
      'BULK_HANDLING_25': 'Save on handling for bulk orders (10+ items)',
      'PREMIUM_ALL_FEES': 'All fees waived for premium orders ($2000+)',
      'PLUS_CUSTOMS_50': 'Exclusive savings for Plus members',
      'WELCOME10': 'Welcome discount for new customers',
      'BULK15': 'Save on bulk orders (5+ items)',
      'TEST20': 'Limited time special offer',
      'SAVE25': 'Instant savings on your order',
      'DASHAIN2025': 'Celebrate the festival with savings',
      'INDIA_SHIP_10': 'Special discount for Indian deliveries'
    };
    return descriptions[code] || 'Special discount for your order';
  };

  // Fetch coupons when quote changes
  useEffect(() => {
    fetchAvailableCoupons();
  }, [quote, user]);


  const handleApprove = async () => {
    try {
      // Use adjusted total if options have been changed
      const finalTotal = quoteOptions.adjustedTotal || quote.total_usd;
      const finalTotalLocal = quoteOptions.adjustedTotal || quote.total_origin_currency || quote.origin_total_amount;

      // Add to cart with selected options
      const cartItem = {
        id: quote.id,
        quoteId: quote.id,
        productName: quote.items?.[0]?.name || 'Quote Items',
        finalTotal: finalTotal,
        finalTotalLocal: finalTotalLocal,
        finalCurrency: getBreakdownSourceCurrency(quote),
        quantity: 1,
        itemWeight: quote.items?.reduce((sum: number, item: any) => sum + (item.weight || 0), 0) || 0,
        imageUrl: quote.items?.[0]?.images?.[0],
        countryCode: quote.destination_country,
        purchaseCountryCode: quote.origin_country,
        destinationCountryCode: quote.destination_country,
        inCart: true,
        isSelected: false,
        selectedOptions: {
          shipping: quoteOptions.shipping,
          insurance: quoteOptions.insurance,
          discountCode: quoteOptions.discountCode,
          adjustments: {
            shippingAdjustment: quoteOptions.shippingAdjustment,
            insuranceAdjustment: quoteOptions.insuranceAdjustment,
            discountAmount: quoteOptions.discountAmount
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      addItem(cartItem);

      // Update quote status with selected options
      await supabase
        .from('quotes_v2')
        .update({ 
          status: 'approved',
          selected_options: {
            shipping: quoteOptions.shipping,
            insurance: quoteOptions.insurance,
            discountCode: quoteOptions.discountCode,
            finalTotal: finalTotal,
            adjustments: {
              shippingAdjustment: quoteOptions.shippingAdjustment,
              insuranceAdjustment: quoteOptions.insuranceAdjustment,
              discountAmount: quoteOptions.discountAmount
            }
          }
        })
        .eq('id', quote.id);

      toast({
        title: "Success!",
        description: "Quote approved and added to cart",
      });

      // Navigate to cart
      navigate('/cart');
      
    } catch (error) {
      console.error('Error approving quote:', error);
      toast({
        title: "Error",
        description: "Failed to approve quote",
        variant: "destructive"
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
          rejection_reason: rejectReason,
          rejection_details: rejectDetails,
          rejected_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      // Also create a support ticket for follow-up
      await supabase
        .from('customer_tickets')
        .insert({
          user_id: user?.id,
          quote_id: quote.id,
          subject: `Quote Rejected - #${quote.quote_number || quote.id.slice(0, 8)}`,
          message: `Quote rejected. Reason: ${rejectReason}\n\nDetails: ${rejectDetails}`,
          category: 'quote_rejection',
          priority: 'medium',
          status: 'open'
        });

      toast({
        title: "Quote Rejected",
        description: "We'll review your feedback and get back to you soon",
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
        description: "Failed to reject quote",
        variant: "destructive"
      });
    }
  };

  const handleSubmitQuestion = async () => {
    try {
      // Create a support ticket
      const { error } = await supabase
        .from('customer_tickets')
        .insert({
          user_id: user?.id,
          quote_id: quote.id,
          subject: `Question about Quote #${quote.quote_number || quote.id.slice(0, 8)}`,
          message: questionText,
          category: questionType,
          priority: 'medium',
          status: 'open'
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
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
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
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotes
          </Button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Quote is Ready</h1>
          <p className="text-muted-foreground">
            Review your quote and approve to continue to checkout
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="hidden md:block">
          <QuoteProgress currentStep={currentStep} />
        </div>
        <MobileProgress currentStep={currentStep} />

        {/* Expiry Warning */}
        {daysLeft && daysLeft <= 7 && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-600" />
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
        
        <MobileQuoteOptions
          quote={quote}
          breakdown={breakdown}
          quoteOptions={quoteOptions}
          onOptionsChange={setQuoteOptions}
          formatCurrency={formatCurrency}
          onQuoteUpdate={refreshQuote}
          displayCurrency={displayCurrency}
        />
        
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
                              <Package className="w-6 h-6 text-gray-400" />
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
                            <span>{items[0]?.name}</span>
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
                        <div className="flex items-center text-blue-600">
                          <Truck className="w-4 h-4 mr-1" />
                          <span className="text-sm font-medium">Express shipping</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">
                          Total value: {formatCurrency(items.reduce((sum, item) => sum + (item.costprice_origin * item.quantity), 0), getOriginCurrency(quote.origin_country))}
                          <span className="text-blue-700 ml-2">
                            → {convertedAmounts.total || formatCurrency(quote.total_origin_currency || quote.origin_total_amount || quote.total_usd, displayCurrency)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Estimate */}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-muted-foreground">
                        <Truck className="w-4 h-4 mr-2" />
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

                {/* Individual Item Details */}
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
                          <span className="font-medium">
                            {formatCurrency(item.costprice_origin, getOriginCurrency(quote.origin_country))}
                            {(() => {
                              // Calculate proportional quote price for this item using converted total
                              const itemsCost = items.reduce((sum, i) => sum + (i.costprice_origin * i.quantity), 0);
                              const itemProportion = (item.costprice_origin * item.quantity) / itemsCost;
                              
                              // Use converted total numeric value for accurate calculations
                              if (convertedAmounts.totalNumeric > 0) {
                                const itemQuotePrice = convertedAmounts.totalNumeric * itemProportion;
                                return (
                                  <span className="text-blue-700 ml-2">
                                    → {formatCurrency(itemQuotePrice, displayCurrency)}
                                  </span>
                                );
                              } else {
                                // Fallback to origin currency total
                                const quoteTotal = quote.total_origin_currency || quote.origin_total_amount || quote.total_usd;
                                const itemQuotePrice = quoteTotal * itemProportion;
                                return (
                                  <span className="text-blue-700 ml-2">
                                    → {formatCurrency(itemQuotePrice, getBreakdownSourceCurrency(quote))}
                                  </span>
                                );
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </CardContent>
            </Card>



            {/* Pricing Breakdown */}
            <CustomerBreakdown 
              quote={quote}
              formatCurrency={formatCurrency}
              displayCurrency={displayCurrency}
            />
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="hidden md:block">
            {/* Quote Summary */}
            <Card className="mb-6 sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Quote Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
                    <div className="text-3xl font-bold">
                      {convertedAmounts.total || formatCurrency(
                        quoteOptions.adjustedTotal || quote.total_origin_currency || quote.origin_total_amount || quote.total_usd, 
                        displayCurrency
                      )}
                    </div>
                    {displayCurrency !== getBreakdownSourceCurrency(quote) && (
                      <div className="text-sm text-muted-foreground">
                        Original: {formatCurrency(quote.total_origin_currency || quote.origin_total_amount || quote.total_usd, getBreakdownSourceCurrency(quote))}
                      </div>
                    )}
                    {displayCurrency !== 'USD' && (
                      <div className="text-sm text-muted-foreground">
                        ≈ {formatCurrency(quoteOptions.adjustedTotal || quote.total_usd, 'USD')}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Benefits */}
                  <div className="space-y-2">
                    <div className="flex items-center text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Free packaging
                    </div>
                    <div className="flex items-center text-green-600 text-sm">
                      <Shield className="w-4 h-4 mr-2" />
                      Insurance included
                    </div>
                    <div className="flex items-center text-green-600 text-sm">
                      <Truck className="w-4 h-4 mr-2" />
                      Express shipping
                    </div>
                    <div className="flex items-center text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      SMS notifications
                    </div>
                  </div>

                  <Separator />

                  {/* Expiry */}
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">Valid until</div>
                    <div className="font-medium">
                      {quote.expires_at ? 
                        new Date(quote.expires_at).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        }) : 'No expiry'
                      }
                    </div>
                    {daysLeft && (
                      <div className="text-sm text-muted-foreground">
                        ({daysLeft} day{daysLeft !== 1 ? 's' : ''} left)
                      </div>
                    )}
                  </div>


                  <Separator />

                  {/* Actions */}
                  <div className="space-y-3">
                    <Button 
                      className="w-full h-12 text-base font-medium"
                      onClick={() => setApproveModalOpen(true)}
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Approve & Add to Cart
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="destructive" 
                        className="h-12"
                        onClick={() => setRejectModalOpen(true)}
                      >
                        Reject Quote
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-12"
                        onClick={() => setQuestionModalOpen(true)}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Ask Question
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="ghost" size="sm" className="h-10">
                        <Heart className="w-4 h-4 mr-2" />
                        Save for Later
                      </Button>
                      <Button variant="ghost" size="sm" className="h-10">
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Trust Signals */}
                  <div className="text-center text-xs text-muted-foreground">
                    <div className="flex items-center justify-center mb-2">
                      <Lock className="w-3 h-3 mr-1" />
                      Secure • Trusted by 50k+ customers
                    </div>
                    <div>⚡ Instant approval</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Customer Testimonials */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center p-4">
                <div className="flex items-center justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-sm italic text-muted-foreground mb-2">
                  "Fast approval, great packaging, arrived exactly on time!"
                </p>
                <p className="text-xs font-medium">- Sarah M.</p>
              </div>
              <div className="text-center p-4">
                <div className="flex items-center justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-sm italic text-muted-foreground mb-2">
                  "Customer service helped me save $200 on shipping!"
                </p>
                <p className="text-xs font-medium">- Mike K.</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
                {convertedAmounts.total || formatCurrency(quote.total_origin_currency || quote.origin_total_amount || quote.total_usd, getBreakdownSourceCurrency(quote))}
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
                <MessageCircle className="w-4 h-4 mr-2" />
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Coupons Modal - Professional Design */}
      <Dialog open={couponsModalOpen} onOpenChange={setCouponsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Available Discount Codes
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              Select a discount code to apply to your order
            </p>
          </DialogHeader>
          
          {loadingCoupons ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 text-sm">Loading available discounts...</span>
            </div>
          ) : availableCoupons.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                <Tag className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">No discount codes available</h3>
              <p className="text-gray-600 text-sm">
                No applicable discount codes for this order
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableCoupons.map((coupon, index) => (
                <div 
                  key={coupon.code} 
                  className="group border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => handleSelectCoupon(coupon.code)}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Discount badge */}
                        <div className="flex-shrink-0">
                          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm font-medium">
                            {coupon.discount}
                          </div>
                        </div>
                        
                        {/* Coupon details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {coupon.name}
                            </h4>
                            {index === 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {coupon.description}
                          </p>
                          <div className="flex items-center space-x-4">
                            <code className="inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-gray-100 text-gray-800 border">
                              {coupon.code}
                            </code>
                            <span className="text-sm font-medium text-green-600">
                              Save {formatCurrency(coupon.savings, displayCurrency)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Apply button */}
                      <div className="flex-shrink-0 ml-4">
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCoupon(coupon.code);
                          }}
                        >
                          Apply Code
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {availableCoupons.length > 0 && (
                  <span>{availableCoupons.length} discount{availableCoupons.length !== 1 ? 's' : ''} available</span>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={() => setCouponsModalOpen(false)}
                className="text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Sticky Bar */}
      <MobileStickyBar 
        quote={quote}
        onApprove={() => setApproveModalOpen(true)}
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