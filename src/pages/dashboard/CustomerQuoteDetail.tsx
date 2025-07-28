import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { smartCalculationEngine } from '@/services/SmartCalculationEngine';
import { optimizedCurrencyService } from '@/services/OptimizedCurrencyService';
import { customerDisplayUtils } from '@/utils/customerDisplayUtils';
import type { Tables } from '@/integrations/supabase/types';
import type { UnifiedQuote } from '@/types/unified-quote';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Loader2, 
  ShoppingCart,
  Download,
  Share2,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Package,
  AlertCircle,
  Info,
  Shield,
  Sparkles,
  Truck,
} from 'lucide-react';

// Customer Components
import { ModernQuoteLayout } from '@/components/customer/ModernQuoteLayout';
import { ModernItemsDisplay } from '@/components/customer/ModernItemsDisplay';
import { QuoteActivityTimeline } from '@/components/customer/QuoteActivityTimeline';
import { EnhancedSmartTaxBreakdown } from '@/components/admin/tax/EnhancedSmartTaxBreakdown';
import { DiscountDisplay } from '@/components/dashboard/DiscountDisplay';
import { MembershipDashboard } from '@/components/dashboard/MembershipDashboard';
import { MembershipService } from '@/services/MembershipService';
import { useCartStore } from '@/stores/cartStore';

type Quote = Tables<'quotes'>;

interface CustomerQuoteDetailProps {
  // Props can be added later if needed
}

const CustomerQuoteDetail: React.FC<CustomerQuoteDetailProps> = () => {
  console.log('🚀🚀🚀 CUSTOMER QUOTE DETAIL COMPONENT LOADED 🚀🚀🚀');
  console.log('🔍 CustomerQuoteDetail component rendered');
  
  // Early return for testing
  if (window.location.pathname.includes('quotes')) {
    console.log('🎯 Detected quotes route, rendering test component');
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '24px',
        fontWeight: 'bold'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1>🎉 CUSTOMER QUOTE DETAIL COMPONENT IS WORKING! 🎉</h1>
          <p>Route: {window.location.pathname}</p>
          <p>Time: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    );
  }
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  console.log('📋 Route params:', { id });
  console.log('👤 User:', user);

  // State management
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [hasMembership, setHasMembership] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  // Cart store for add to cart functionality
  const addToCart = useCartStore((state) => state.addItem);

  // Fetch quote data with related information
  const {
    data: quoteData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['customer-quote', id],
    queryFn: async () => {
      console.log('🔄 Starting quote fetch for ID:', id);
      if (!id) throw new Error('No quote ID provided');

      // Ensure user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch quote with related data - try both ID and tracking ID
      let quote = null;
      let quoteError = null;

      // First try by UUID
      const { data: quoteById, error: errorById } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single();

      if (!errorById && quoteById) {
        // Verify user has access to this quote
        if (quoteById.user_id !== user.id && !quoteById.customer_data?.email?.includes(user.email || '')) {
          throw new Error('Access denied to this quote');
        }
        quote = quoteById;
      } else {
        // Try by tracking ID
        const { data: quoteByTracking, error: errorByTracking } = await supabase
          .from('quotes')
          .select('*')
          .eq('iwish_tracking_id', id)
          .single();

        if (!errorByTracking && quoteByTracking) {
          // Verify user has access to this quote
          if (quoteByTracking.user_id !== user.id && !quoteByTracking.customer_data?.email?.includes(user.email || '')) {
            throw new Error('Access denied to this quote');
          }
          quote = quoteByTracking;
        } else {
          quoteError = errorById || errorByTracking;
        }
      }

      if (!quote || quoteError) {
        console.error('Quote fetch error:', quoteError, 'ID:', id);
        throw quoteError || new Error('Quote not found');
      }

      // Fetch customer profile if available
      let customerProfile = null;
      if (quote.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', quote.user_id)
          .single();
        customerProfile = profile;
      }

      // Get destination currency
      let destinationCurrency = null;
      try {
        const currencyCode = await optimizedCurrencyService.getCurrencyForCountry(quote.destination_country);
        destinationCurrency = {
          code: currencyCode,
          symbol: optimizedCurrencyService.getCurrencySymbol(currencyCode),
          rate: 1 // This service doesn't provide rates
        };
      } catch (error) {
        console.error('Error getting currency:', error);
        // Fallback to USD if currency service fails
        destinationCurrency = { code: 'USD', symbol: '$', rate: 1 };
      }

      // Calculate real-time pricing (similar to admin side)
      let calculationResult = null;
      try {
        const initialCalculationInput = {
          quote: {
            id: quote.id,
            items: (quote.items || []).map((item: any, index: number) => ({
              id: item.id || `item-${index}`,
              name: item.name || item.product_name || '',
              url: item.url || item.product_url || '',
              image: item.image_url || '',
              customer_notes: item.customer_notes || '',
              quantity: typeof item.quantity === 'number' ? item.quantity : 1,
              costprice_origin: typeof item.costprice_origin === 'number' ? item.costprice_origin : (item.price || 0),
              weight: typeof item.weight === 'number' ? item.weight : 0,
              hsn_code: item.hsn_code || '',
              category: item.category || '',
              valuation_method: item.valuation_method || 'actual_price',
              minimum_valuation_usd: item.minimum_valuation_usd || 0,
              actual_price: item.actual_price || item.costprice_origin || item.price || 0,
              smart_data: {
                weight_confidence: item.weight ? 0.8 : 0.3,
                price_confidence: item.costprice_origin || item.price ? 0.9 : 0.5,
                category_detected: item.category || 'General',
                customs_suggestions: item.hsn_code ? [`HSN ${item.hsn_code} classification`] : ['Manual classification needed'],
                optimization_hints: [
                  ...(item.weight < 0.1 ? ['Consider weight verification'] : []),
                  ...(item.price < 1 ? ['Price seems unusually low'] : []),
                  ...(item.hsn_code ? [] : ['HSN code missing'])
                ],
                weight_source: item.weight ? 'manual' : 'estimated',
                weight_suggestions: {
                  hsn_weight: item.weight || 0,
                  hsn_min: (item.weight || 0) * 0.8,
                  hsn_max: (item.weight || 0) * 1.2,
                  hsn_packaging: (item.weight || 0) * 0.1,
                  ml_weight: item.weight || 0,
                  hsn_confidence: item.hsn_code ? 0.8 : 0.3,
                  ml_confidence: 0.6
                }
              }
            })),
            destination_country: quote.destination_country,
            origin_country: quote.origin_country,
            status: quote.status,
            calculation_data: quote.calculation_data || {},
            operational_data: quote.operational_data || {},
            customer_data: quote.customer_data || {},
          },
          preferences: {
            speed_priority: 'medium',
            cost_priority: 'medium',
            show_all_options: true,
          },
          tax_calculation_preferences: {
            calculation_method_preference: quote.calculation_data?.tax_calculation?.method || 'hsn_only',
            valuation_method_preference: 'auto',
            admin_id: 'customer-quote-detail'
          }
        };

        console.group('🛍️ CUSTOMER QUOTE DETAIL - INITIAL CALCULATION');
        console.log('📋 QUOTE LOADED FROM DATABASE:', {
          quote_id: quote.id,
          tracking_id: quote.iwish_tracking_id,
          status: quote.status,
          items_count: quote.items?.length || 0,
          has_calculation_data: !!quote.calculation_data,
          has_operational_data: !!quote.operational_data,
          route: `${quote.origin_country} → ${quote.destination_country}`,
          created_at: quote.created_at,
          updated_at: quote.updated_at,
          customer_insurance_preference: quote.customer_data?.preferences?.insurance_opted_in
        });
        
        console.log('💱 CURRENCY CONTEXT:', {
          destination_currency: destinationCurrency,
          customer_profile_available: !!customerProfile
        });
        
        console.groupEnd();

        calculationResult = await smartCalculationEngine.calculateWithShippingOptions(initialCalculationInput);
      } catch (error) {
        console.error('Error calculating quote:', error);
        // Use existing calculation data if engine fails
        calculationResult = { calculation_data: quote.calculation_data };
      }

      console.log('✅ Quote fetch completed:', {
        quote_id: quote?.id,
        tracking_id: quote?.iwish_tracking_id,
        status: quote?.status,
        has_customer_profile: !!customerProfile,
        has_calculation: !!calculationResult
      });

      return {
        quote,
        customerProfile,
        destinationCurrency,
        calculationResult,
      };
    },
    enabled: Boolean(id),
  });

  // Transform quote data for unified display (similar to admin)
  const transformedQuote = useMemo(() => {
    console.log('🔄 Transform quote memo:', { hasQuoteData: !!quoteData?.quote });
    if (!quoteData?.quote) return null;
    
    const { quote, customerProfile, calculationResult, destinationCurrency } = quoteData;
    console.log('📊 Transforming quote:', quote.id);
    
    // Parse JSON fields safely
    const items = Array.isArray(quote.items) ? quote.items : [];
    const customerData = quote.customer_data || {};
    const calculationData = calculationResult?.calculation_data || quote.calculation_data || {};
    const operationalData = quote.operational_data || {};
    
    // Use customer display utilities for proper customer info
    const customerDisplay = customerDisplayUtils.getCustomerDisplayData(quote, customerProfile);

    // Transform to UnifiedQuote format (simplified for customer view)
    const transformed: UnifiedQuote = {
      id: quote.iwish_tracking_id || quote.display_id || quote.id,
      status: quote.status,
      created_at: quote.created_at,
      updated_at: quote.updated_at,
      expires_at: quote.expires_at,
      
      // Financial data from real calculations
      subtotal: calculationData.breakdown?.subtotal || 
                calculationData.totals?.items_total ||
                items.reduce((sum: any, item: any) => sum + ((item.costprice_origin || item.price || 0) * (item.quantity || 1)), 0),
      shipping: calculationData.breakdown?.shipping || calculationData.totals?.shipping_total || 0,
      insurance: calculationData.breakdown?.insurance || calculationData.totals?.insurance || 0,
      handling: calculationData.breakdown?.handling || calculationData.totals?.handling || 0,
      customs: calculationData.breakdown?.customs || calculationData.totals?.customs_total || 0,
      sales_tax: calculationData.breakdown?.sales_tax || calculationData.totals?.sales_tax || 0,
      destination_tax: calculationData.breakdown?.destination_tax || calculationData.totals?.destination_tax || 0,
      total: calculationData.totals?.final_total || quote.final_total_usd || 0,
      
      // Tax and calculation details
      tax_method: calculationData.tax_calculation?.method || 'hsn',
      tax_rates: {
        customs: calculationData.tax_calculation?.customs_rate || 
                 calculationData.totals?.customs_rate ||
                 calculationData.breakdown?.customs_rate || 0,
        sales_tax: calculationData.tax_calculation?.sales_tax_rate || 
                   calculationData.totals?.sales_tax_rate ||
                   calculationData.breakdown?.sales_tax_rate || 0,
        destination_tax: calculationData.tax_calculation?.destination_tax_rate || 
                         calculationData.totals?.destination_tax_rate ||
                         calculationData.breakdown?.destination_tax_rate || 0,
      },
      
      // Currency info
      currency: destinationCurrency?.code || 'USD',
      currency_symbol: destinationCurrency?.symbol || '$',
      
      // Additional fields
      discount: calculationData.breakdown?.discount || calculationData.discount || 0,
      additional_due: 0, // Calculate based on payment status if needed
      
      // Customer information using proper display utilities
      customer: {
        id: quote.user_id || 'guest',
        name: customerDisplay.name,
        email: customerDisplay.email,
        phone: customerDisplay.phone || '',
        avatar: customerProfile?.avatar_url || 'https://github.com/shadcn.png',
        location: `${quote.destination_country}`,
        customer_since: customerProfile?.created_at || quote.created_at,
        total_orders: customerProfile?.metadata?.total_orders || 0,
        total_spent: customerProfile?.metadata?.total_spent || 0,
        loyalty_tier: customerProfile?.metadata?.loyalty_tier || 'Standard',
        type: customerDisplay.isGuest ? 'Guest' : (customerDisplay.isOAuth ? 'OAuth' : 'Registered')
      },
      
      // Shipping address
      shipping_address: {
        name: customerData.shipping_address?.name || customerData.name || '',
        line1: customerData.shipping_address?.line1 || '',
        line2: customerData.shipping_address?.line2 || '',
        city: customerData.shipping_address?.city || '',
        state: customerData.shipping_address?.state || '',
        postal_code: customerData.shipping_address?.postal_code || '',
        country: quote.destination_country
      },
      
      // Transform items
      items: items.map((item: any, index: number) => ({
        id: item.id || `item-${index}`,
        product_name: item.name || item.product_name || '',
        product_url: item.url || item.product_url || '',
        sku: item.sku || '',
        quantity: item.quantity || 1,
        price: item.costprice_origin || item.price || 0,
        weight: item.weight || 0,
        hsn_code: item.hsn_code || '',
        category: item.category || '',
        seller: item.seller || 'Unknown',
        image_url: item.image_url || '',
        
        // Tax calculation data
        tax_method: item.tax_method || calculationData.tax_calculation?.method || 'hsn',
        customs_value: item.customs_value || item.price,
        customs_amount: item.customs_amount || 0,
        sales_tax_amount: item.sales_tax_amount || 0,
        destination_tax_amount: item.destination_tax_amount || 0,
      })),
      
      // Shipping options from calculation
      shipping_options: calculationResult?.shipping_options || [],
      
      // Smart suggestions
      smart_suggestions: calculationResult?.smart_suggestions || [],
      
      // Additional fields needed by components
      destination_country: quote.destination_country,
      origin_country: quote.origin_country,
      shipping_method: quote.shipping_method || 'standard',
      
      // Include customer data for insurance preferences and other customer info
      customer_data: customerData,
      
      // Include raw calculation data for tax breakdown
      calculation_data: calculationData
    };

    console.log('✅ Quote transformation complete:', {
      id: transformed.id,
      status: transformed.status,
      items_count: transformed.items.length,
      total: transformed.total,
      customer_name: transformed.customer.name
    });

    return transformed;
  }, [quoteData]);

  // Check for membership
  useEffect(() => {
    const checkMembership = async () => {
      if (user?.id) {
        const membership = await MembershipService.getCustomerMembership(user.id);
        setHasMembership(!!membership && membership.status === 'active');
      }
    };
    checkMembership();
  }, [user]);

  // Handlers
  const handleAddToCart = async () => {
    if (!transformedQuote) return;
    
    try {
      setIsAddingToCart(true);
      
      // Add to cart using the store
      await addToCart({
        quoteId: transformedQuote.id,
        productName: transformedQuote.items[0]?.product_name || 'Quote',
        total: transformedQuote.total,
        currency: transformedQuote.currency,
        status: transformedQuote.status,
      });
      
      // Update quote in_cart flag in database
      await supabase
        .from('quotes')
        .update({ in_cart: true })
        .eq('id', id);
      
      toast({
        title: 'Added to Cart',
        description: 'Quote has been added to your cart.',
      });
      navigate('/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to add quote to cart. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleDownloadPDF = () => {
    toast({
      title: 'Downloading PDF',
      description: 'Your quote PDF is being generated...',
    });
    // TODO: Implement PDF download
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/quotes/${id}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: 'Link Copied',
      description: 'Quote link has been copied to clipboard.',
    });
  };

  const handleViewProduct = (url: string) => {
    window.open(url, '_blank');
  };

  console.log('🎯 Render states:', { 
    isLoading, 
    hasError: !!error, 
    hasQuoteData: !!quoteData?.quote, 
    hasTransformedQuote: !!transformedQuote 
  });

  // Loading state
  if (isLoading) {
    console.log('⏳ Rendering loading state');
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading quote details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !quoteData?.quote || !transformedQuote) {
    console.log('❌ Rendering error state:', { 
      error: error?.message, 
      hasQuoteData: !!quoteData?.quote, 
      hasTransformedQuote: !!transformedQuote 
    });
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowLeft className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error?.message === 'Access denied to this quote' 
              ? "You don't have permission to view this quote." 
              : "The quote you're looking for doesn't exist."}
          </p>
          <Button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Main render
  console.log('🎨 Rendering main content with transformedQuote:', transformedQuote?.id);
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
      {/* Debug Info */}
      <div className="fixed top-4 right-4 bg-black text-white p-2 text-xs rounded z-50">
        DEBUG: ID={id}, Loading={String(isLoading)}, HasQuote={String(!!quoteData?.quote)}, HasTransformed={String(!!transformedQuote)}
      </div>
      
      {/* Modern header */}
      <div className="bg-white/70 backdrop-blur-md shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            
            {/* Show membership badge if user has Plus */}
            {hasMembership && (
              <Badge variant="default" className="bg-gradient-to-r from-purple-600 to-purple-700">
                <Sparkles className="h-3 w-3 mr-1" />
                iwishBag Plus Member
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main content section */}
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Quote Details</h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <p>Quote ID: {transformedQuote?.id}</p>
          <p>Status: {transformedQuote?.status}</p>
          <p>Items: {transformedQuote?.items?.length || 0}</p>
          <p>Total: {transformedQuote?.currency_symbol}{transformedQuote?.total}</p>
        </div>
      </div>

      {/* Original ModernQuoteLayout - commented temporarily for debugging */}
      {false && <ModernQuoteLayout
        quote={transformedQuote}
        onAddToCart={handleAddToCart}
        onDownloadPDF={handleDownloadPDF}
        onShare={handleShare}
        isAddingToCart={isAddingToCart}
      >
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Customer Information */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{transformedQuote.customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{transformedQuote.customer.email}</p>
                </div>
                {transformedQuote.customer.phone && (
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{transformedQuote.customer.phone}</p>
                  </div>
                )}
                <Separator />
                <div>
                  <p className="text-sm text-gray-500 mb-1">Customer Type</p>
                  <Badge variant="secondary">
                    {transformedQuote.customer.type}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="font-medium">{transformedQuote.shipping_address.name}</p>
                  <p className="text-sm text-gray-600">{transformedQuote.shipping_address.line1}</p>
                  {transformedQuote.shipping_address.line2 && (
                    <p className="text-sm text-gray-600">{transformedQuote.shipping_address.line2}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    {transformedQuote.shipping_address.city}, {transformedQuote.shipping_address.state} {transformedQuote.shipping_address.postal_code}
                  </p>
                  <p className="text-sm font-medium text-gray-900 mt-2">
                    {transformedQuote.shipping_address.country}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Quote Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Items</span>
                  <span className="font-medium">{transformedQuote.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Weight</span>
                  <span className="font-medium">
                    {transformedQuote.items.reduce((sum, item) => sum + item.weight * item.quantity, 0).toFixed(2)} kg
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Route</span>
                  <span className="font-medium">
                    {transformedQuote.origin_country} → {transformedQuote.destination_country}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Created</span>
                  <span className="font-medium">
                    {new Date(transformedQuote.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Insurance Notice */}
          {transformedQuote.insurance > 0 && (
            <Alert className="border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                This quote includes insurance coverage of {transformedQuote.currency_symbol}{transformedQuote.insurance.toFixed(2)} for your package protection.
              </AlertDescription>
            </Alert>
          )}

          {/* Discount Display */}
          {transformedQuote.discount > 0 && (
            <DiscountDisplay
              quoteId={transformedQuote.id}
              customerId={user?.id}
              subtotal={transformedQuote.subtotal}
              handlingFee={transformedQuote.handling}
              paymentMethod="bank_transfer" // Default for display
              countryCode={transformedQuote.destination_country}
              currency={transformedQuote.currency}
              className="mt-6"
            />
          )}
        </TabsContent>

        <TabsContent value="items" className="space-y-6">
          <ModernItemsDisplay
            items={transformedQuote.items}
            currency={transformedQuote.currency}
            currencySymbol={transformedQuote.currency_symbol}
            onViewProduct={handleViewProduct}
          />
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="lg:col-span-1">
              <EnhancedSmartTaxBreakdown
                quote={transformedQuote}
                showEducation={true}
                compact={false}
                title="Price Breakdown"
                className="h-full"
              />
            </div>
            
            {/* Shipping Options */}
            {transformedQuote.shipping_options && transformedQuote.shipping_options.length > 0 && (
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Shipping Options
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {transformedQuote.shipping_options.slice(0, 3).map((option: any) => (
                      <div
                        key={option.id}
                        className={`p-4 rounded-lg border ${
                          option.recommended ? 'border-primary bg-primary/5' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{option.name}</p>
                            <p className="text-sm text-gray-600">{option.carrier}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Delivery: {option.days} days
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {transformedQuote.currency_symbol}{option.cost_usd.toFixed(2)}
                            </p>
                            {option.recommended && (
                              <Badge variant="default" className="mt-1">
                                Recommended
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <QuoteActivityTimeline
            activities={[]}
            quote={transformedQuote}
          />
        </TabsContent>
      </ModernQuoteLayout>}
    </div>
  );
};

export default CustomerQuoteDetail;

console.log('📁 CustomerQuoteDetail module loaded successfully');