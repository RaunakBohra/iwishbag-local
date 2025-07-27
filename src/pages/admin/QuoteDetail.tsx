import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import UnifiedQuoteOrderSystem from '@/demo/UnifiedQuoteOrderSystem';
import { smartCalculationEngine } from '@/services/SmartCalculationEngine';
import { optimizedCurrencyService } from '@/services/OptimizedCurrencyService';
import { customerDisplayUtils } from '@/utils/customerDisplayUtils';
import type { Tables } from '@/integrations/supabase/types';

type Quote = Tables<'quotes'>;

// Transform database quote to UnifiedQuoteOrderSystem format
const transformQuoteToUnifiedFormat = (
  quote: Quote, 
  customerProfile: any,
  calculationResult: any,
  destinationCurrency: any
) => {
  // Parse JSON fields safely
  const items = Array.isArray(quote.items) ? quote.items : [];
  const customerData = quote.customer_data || {};
  const calculationData = calculationResult?.calculation_data || quote.calculation_data || {};
  const operationalData = quote.operational_data || {};
  
  // Use customer display utilities for proper customer info
  const customerDisplay = customerDisplayUtils.getCustomerDisplayData(quote, customerProfile);

  // Map to UnifiedQuoteOrderSystem expected format
  return {
    id: quote.iwish_tracking_id || quote.display_id || quote.id,
    status: quote.status,
    created_at: quote.created_at,
    updated_at: quote.updated_at,
    expires_at: quote.expires_at,
    
    // Financial data from real calculations
    subtotal: calculationData.breakdown?.subtotal || 
              calculationData.totals?.items_total ||
              items.reduce((sum, item) => sum + ((item.costprice_origin || item.price || 0) * (item.quantity || 1)), 0),
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
               calculationData.breakdown?.customs_rate ||
               (calculationData.breakdown?.customs && calculationData.breakdown?.subtotal 
                 ? (calculationData.breakdown.customs / calculationData.breakdown.subtotal) * 100 
                 : 0),
      sales_tax: calculationData.tax_calculation?.sales_tax_rate || 
                 calculationData.totals?.sales_tax_rate ||
                 calculationData.breakdown?.sales_tax_rate ||
                 0,
      destination_tax: calculationData.tax_calculation?.destination_tax_rate || 
                       calculationData.totals?.destination_tax_rate ||
                       calculationData.breakdown?.destination_tax_rate ||
                       (calculationData.breakdown?.destination_tax && calculationData.breakdown?.subtotal 
                         ? (calculationData.breakdown.destination_tax / calculationData.breakdown.subtotal) * 100 
                         : 0),
    },
    
    // Currency info
    currency: destinationCurrency?.code || 'USD',
    currency_symbol: destinationCurrency?.symbol || '$',
    
    // Additional fields
    discount: 0, // Can be calculated from calculation data if available
    additional_due: 0, // Calculate based on payment status
    
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
    
    // Transform items with purchase tracking data and tax info
    items: items.map((item: any, index: number) => {
      // Find item tax breakdown from calculation result
      // First check item_breakdowns (where we now store HSN data)
      let itemTaxBreakdown = calculationData.item_breakdowns?.find(
        (b: any) => b.item_id === item.id || b.item_id === `item-${index}`
      );
      
      // Fallback to hsn_tax_breakdown if available
      if (!itemTaxBreakdown && calculationResult?.hsn_tax_breakdown) {
        const hsnBreakdown = calculationResult.hsn_tax_breakdown.find(
          (b: any) => b.item_id === item.id || b.item_id === `item-${index}`
        );
        if (hsnBreakdown) {
          itemTaxBreakdown = {
            customs_value: hsnBreakdown.taxable_amount_origin_currency,
            customs: hsnBreakdown.total_customs,
            sales_tax: hsnBreakdown.sales_tax || 0,
            destination_tax: hsnBreakdown.total_local_taxes,
          };
        }
      }
      
      // Debug logging
      if (item.id === items[0]?.id) {
        console.log('🔍 [Item Tax Mapping] First item tax breakdown:', {
          item_id: item.id,
          has_item_breakdowns: !!calculationData.item_breakdowns,
          has_hsn_breakdown: !!calculationResult?.hsn_tax_breakdown,
          found_breakdown: !!itemTaxBreakdown,
          breakdown_data: itemTaxBreakdown
        });
      }
      
      return {
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
        customs_value: itemTaxBreakdown?.customs_value || item.price,
        customs_amount: itemTaxBreakdown?.customs || 0,
        sales_tax_amount: itemTaxBreakdown?.sales_tax || 0,
        destination_tax_amount: itemTaxBreakdown?.destination_tax || 0,
        
        // Purchase tracking fields (from operational_data or item level)
        actual_price: item.actual_price || operationalData.purchase_details?.[item.id]?.actual_price || null,
        actual_weight: item.actual_weight || operationalData.purchase_details?.[item.id]?.actual_weight || null,
        seller_order_id: item.seller_order_id || operationalData.purchase_details?.[item.id]?.seller_order_id || null,
        seller_tracking: item.seller_tracking || operationalData.purchase_details?.[item.id]?.seller_tracking || null,
        purchase_platform: item.purchase_platform || operationalData.purchase_details?.[item.id]?.purchase_platform || null,
        purchased_at: item.purchased_at || operationalData.purchase_details?.[item.id]?.purchased_at || null,
        receipt_url: item.receipt_url || operationalData.purchase_details?.[item.id]?.receipt_url || null,
        purchase_notes: item.purchase_notes || operationalData.purchase_details?.[item.id]?.purchase_notes || null,
      };
    }),
    
    // Payment information (from operational_data)
    payment: {
      purchase: {
        method: operationalData.purchase_payments?.method || 'Company Card',
        card_last4: operationalData.purchase_payments?.card_last4 || '4242',
        total: operationalData.purchase_payments?.total || 0,
        purchased_at: operationalData.purchase_payments?.purchased_at || null
      },
      customer: {
        method: operationalData.customer_payments?.method || 'Bank Transfer',
        reference: operationalData.customer_payments?.reference || '',
        amount: operationalData.customer_payments?.amount || quote.final_total_usd || 0,
        paid_at: operationalData.customer_payments?.paid_at || null,
        status: operationalData.customer_payments?.status || 'pending'
      }
    },
    
    // Activity timeline (from operational_data or create default)
    activities: operationalData.activities || [
      {
        id: '1',
        type: 'status_change',
        title: 'Quote Created',
        description: `New quote generated for ${items.length} items`,
        timestamp: quote.created_at,
        user: 'System',
        icon: 'FileText'
      }
    ],
    
    // Shipping options from calculation
    shipping_options: calculationResult?.shipping_options || [],
    
    // Smart suggestions
    smart_suggestions: calculationResult?.smart_suggestions || [],
    
    // Calculation metadata
    calculation_metadata: {
      method: calculationData.tax_calculation?.method || 'hsn',
      valuation_method: calculationData.tax_calculation?.valuation_method || 'actual_price',
      has_minimum_valuation: calculationData.tax_calculation?.has_minimum_valuation || false,
      domestic_shipping: calculationData.shipping?.domestic_shipping || 0,
      international_shipping: calculationData.shipping?.international_shipping || 0,
    },
    
    // Additional fields needed by the component
    destination_country: quote.destination_country,
    origin_country: quote.origin_country || 'US',
    shipping_method: quote.shipping_method || 'standard',
    
    // Smart recommendations from calculation
    recommendations: calculationResult?.smart_recommendations?.map(rec => ({
      type: rec.type || 'info',
      text: rec.title || rec.recommendation || '',
      impact: rec.impact || rec.potential_savings || '',
    })) || [],
    
    // Include customer data for insurance preferences and other customer info
    customer_data: customerData
  };
};

const AdminQuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch quote data with related information
  const {
    data: quoteData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-quote', id],
    queryFn: async () => {
      if (!id) throw new Error('No quote ID provided');

      // First check if user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check admin status
      const { data: isAdmin } = await supabase.rpc('is_admin');
      if (!isAdmin) throw new Error('Admin access required');

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
        quote = quoteById;
      } else {
        // Try by tracking ID
        const { data: quoteByTracking, error: errorByTracking } = await supabase
          .from('quotes')
          .select('*')
          .eq('iwish_tracking_id', id)
          .single();

        if (!errorByTracking && quoteByTracking) {
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

      // Calculate real-time pricing
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
            origin_country: quote.origin_country || 'US',
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
            admin_id: 'admin-quote-detail'
          }
        };

        // 🔍 INITIAL QUOTE CALCULATION DEBUG LOG
        console.group('🏪 ADMIN QUOTE DETAIL - INITIAL CALCULATION');
        console.log('📋 QUOTE LOADED FROM DATABASE:', {
          quote_id: quote.id,
          tracking_id: quote.iwish_tracking_id,
          status: quote.status,
          items_count: quote.items?.length || 0,
          has_calculation_data: !!quote.calculation_data,
          has_operational_data: !!quote.operational_data,
          route: `${quote.origin_country || 'US'} → ${quote.destination_country}`,
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

      return {
        quote,
        customerProfile,
        destinationCurrency,
        calculationResult,
      };
    },
    enabled: Boolean(id),
  });

  // Transform quote data for UnifiedQuoteOrderSystem
  const transformedQuote = useMemo(() => {
    if (!quoteData?.quote) return null;
    return transformQuoteToUnifiedFormat(
      quoteData.quote,
      quoteData.customerProfile,
      quoteData.calculationResult,
      quoteData.destinationCurrency
    );
  }, [quoteData]);

  // Handle quote updates
  const updateQuoteMutation = useMutation({
    mutationFn: async (updates: any) => {
      console.log('🔍 [MUTATION] updateQuoteMutation called with:', updates);
      if (!id) throw new Error('No quote ID provided');

      // Transform updates back to database format
      const dbUpdates: any = {};

      // Handle operational data updates (purchase tracking, etc.)
      if (updates.purchase_details || updates.payment_info || updates.activities) {
        const currentOperationalData = quoteData?.quote?.operational_data || {};
        dbUpdates.operational_data = {
          ...currentOperationalData,
          ...updates.operational_data,
          purchase_details: {
            ...currentOperationalData.purchase_details,
            ...updates.purchase_details
          },
          purchase_payments: {
            ...currentOperationalData.purchase_payments,
            ...updates.purchase_payments
          },
          customer_payments: {
            ...currentOperationalData.customer_payments,
            ...updates.customer_payments
          },
          activities: updates.activities || currentOperationalData.activities
        };
      }

      // Handle items updates
      if (updates.items) {
        console.log('🔍 [MUTATION] Items update detected:', updates.items);
        dbUpdates.items = updates.items;
      }

      // Handle status updates with activity logging
      if (updates.status && updates.status !== quoteData?.quote?.status) {
        dbUpdates.status = updates.status;
        
        // Log status change activity
        await supabase.from('quote_activity_log').insert({
          quote_id: id,
          action: 'status_change',
          details: {
            old_status: quoteData?.quote?.status,
            new_status: updates.status,
          },
        });
      }

      // Handle notes updates
      if (updates.admin_notes !== undefined) {
        dbUpdates.admin_notes = updates.admin_notes;
      }
      if (updates.internal_notes !== undefined) {
        dbUpdates.internal_notes = updates.internal_notes;
      }

      console.log('🔍 [MUTATION] Updating database with:', dbUpdates);
      const { data, error } = await supabase
        .from('quotes')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('🔍 [MUTATION] Database update failed:', error);
        throw error;
      }

      console.log('🔍 [MUTATION] Database update successful, returned data:', data);
      return data;
    },
    onSuccess: () => {
      // Refresh quote data
      queryClient.invalidateQueries({ queryKey: ['admin-quote', id] });
      toast({
        title: 'Quote Updated',
        description: 'Quote has been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Failed to update quote:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update quote. Please try again.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quote details...</p>
        </div>
      </div>
    );
  }

  if (error || !quoteData?.quote || !transformedQuote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            {error?.message === 'Admin access required' ? 'Access Denied' : 'Quote Not Found'}
          </h1>
          <p className="text-gray-600 mb-6">
            {error?.message || 'The quote you\'re looking for doesn\'t exist or you don\'t have permission to view it.'}
          </p>
          {id && (
            <p className="text-sm text-gray-500 mb-4">
              Quote ID: {id}
            </p>
          )}
          <Button
            onClick={() => navigate('/admin/quotes')}
            className="inline-flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quotes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <UnifiedQuoteOrderSystem
      quote={transformedQuote}
      onUpdate={(updates) => {
        console.log('🔍 [QUOTE-DETAIL] onUpdate called with:', updates);
        if (updates.refresh) {
          console.log('🔍 [QUOTE-DETAIL] Refresh requested, invalidating queries');
          // Refetch the quote data
          queryClient.invalidateQueries({ queryKey: ['quote', id] });
        } else {
          console.log('🔍 [QUOTE-DETAIL] Calling updateQuoteMutation with:', updates);
          updateQuoteMutation.mutate(updates);
        }
      }}
      isAdmin={true}
    />
  );
};

export default AdminQuoteDetail;