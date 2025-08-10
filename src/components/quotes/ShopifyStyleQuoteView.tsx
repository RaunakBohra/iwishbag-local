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
// EnhancedAddonServicesSelector removed - addon services only available in cart/checkout
import { getBreakdownSourceCurrency } from '@/utils/currencyMigration';
import { getOriginCurrency, getDestinationCurrency } from '@/utils/originCurrency';
import { useCart } from '@/hooks/useCart';
import { useCartItem, ensureInitialized } from '@/stores/cartStore';
import QuoteMessagingButton from './QuoteMessagingButton';
import { QuoteMessagingErrorBoundary } from './QuoteMessagingErrorBoundary';
import { Badge } from '@/components/ui/badge';

interface ShopifyStyleQuoteViewProps {
  viewMode: 'customer' | 'shared';
}

// Professional Breakdown Component
interface ProfessionalBreakdownProps {
  quote: any;
  formatCurrency: (amount: number, currency: string) => string;
  className?: string;
  displayCurrency?: string;
  onTotalCalculated?: (total: string, numericTotal: number, currency: string) => void;
}

const ProfessionalBreakdown: React.FC<ProfessionalBreakdownProps> = ({
  quote,
  formatCurrency,
  className = "",
  displayCurrency,
  onTotalCalculated
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [convertedAmounts, setConvertedAmounts] = useState<{ [key: string]: number }>({});

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
      return amount;
    }
  }, []);

  if (!quote || !quote.calculation_data) {
    return (
      <Card className={`${className} border-teal-200 shadow-sm`}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center text-teal-500">
            <OptimizedIcon name="FileText" className="w-5 h-5 mr-2" />
            <span className="text-sm">Breakdown not available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const calc = quote.calculation_data;
  const steps = calc.calculation_steps || {};
  const originCurrency = quote.origin_country ? getOriginCurrency(quote.origin_country) : 'USD';
  const currency = displayCurrency || originCurrency;

  // Check if quote has proportional rounding applied
  const hasProportionalRounding = quote.calculation_data?._proportional_rounding_applied || 
                                 quote.calculation_data?.calculation_steps?._rounding_metadata;

  // Convert amounts when displayCurrency changes
  useEffect(() => {
    const convertAmounts = async () => {
      if (!displayCurrency || displayCurrency === originCurrency) {
        setConvertedAmounts({});
        return;
      }

      try {
        const stepsToConvert = {
          'items_subtotal': steps.discounted_items_subtotal || steps.items_subtotal || 0,
          'shipping_total': (steps.discounted_shipping_cost || steps.shipping_cost || 0) + 
                           (steps.insurance_amount || 0) + 
                           (steps.discounted_delivery || steps.domestic_delivery || 0),
          'taxes_total': (steps.discounted_customs_duty || steps.customs_duty || 0) + 
                        (steps.discounted_tax_amount || steps.local_tax_amount || 0),
          'service_fees': (steps.discounted_handling_fee || steps.handling_fee || 0) + 
                         (steps.payment_gateway_fee || 0),
          'final_total': steps.total_origin_currency || quote.total_quote_origincurrency || quote.total_origin_currency || 0,
          'total_savings': steps.total_savings || 0,
        };

        const converted: { [key: string]: number } = {};
        
        for (const [key, amount] of Object.entries(stepsToConvert)) {
          if (amount !== 0) {
            const rawConverted = await convertCurrency(amount, originCurrency, displayCurrency);
            
            if (hasProportionalRounding) {
              converted[key] = rawConverted;
            } else {
              const { currencyService } = await import('@/services/CurrencyService');
              const formattedAmount = currencyService.formatAmount(rawConverted, displayCurrency);
              const numericValue = parseFloat(formattedAmount.replace(/[^\d.-]/g, ''));
              converted[key] = isNaN(numericValue) ? rawConverted : numericValue;
            }
          } else {
            converted[key] = 0;
          }
        }

        setConvertedAmounts(converted);
      } catch (error) {
        console.error('Failed to convert breakdown amounts:', error);
        setConvertedAmounts({});
      }
    };
    
    convertAmounts();
  }, [quote.id, quote.origin_country, displayCurrency, hasProportionalRounding, convertCurrency]);

  // Helper function to get amounts
  const getAmount = (key: string, originalAmount: number) => {
    const itemCostKeys = ['items_subtotal', 'item_discounts', 'order_discount_amount'];
    
    if (itemCostKeys.includes(key)) {
      return originalAmount; // Keep in origin currency
    }
    
    if (displayCurrency && convertedAmounts[key] !== undefined) {
      return convertedAmounts[key];
    }
    return originalAmount;
  };

  // Main category amounts for summary view
  const summaryItems = [
    {
      icon: <Package className="w-4 h-4" />,
      label: 'Items',
      amount: getAmount('items_subtotal', steps.discounted_items_subtotal || steps.items_subtotal || 0),
      currency: originCurrency, // Items always in origin currency
      showCurrencyNote: displayCurrency !== originCurrency,
      currencyNote: displayCurrency !== originCurrency ? `Shown in ${originCurrency}` : undefined
    },
    {
      icon: <Truck className="w-4 h-4" />,
      label: 'Shipping & Insurance',
      amount: getAmount('shipping_total', (steps.discounted_shipping_cost || steps.shipping_cost || 0) + 
              (steps.insurance_amount || 0) + 
              (steps.discounted_delivery || steps.domestic_delivery || 0)),
      currency: currency
    },
    {
      icon: <OptimizedIcon name="FileText" className="w-4 h-4" />,
      label: 'Customs & Duties',
      amount: getAmount('taxes_total', (steps.discounted_customs_duty || steps.customs_duty || 0) + 
              (steps.discounted_tax_amount || steps.local_tax_amount || 0)),
      currency: currency
    },
    {
      icon: <OptimizedIcon name="Settings" className="w-4 h-4" />,
      label: 'Processing',
      amount: getAmount('service_fees', (steps.discounted_handling_fee || steps.handling_fee || 0) + 
              (steps.payment_gateway_fee || 0)),
      currency: currency
    }
  ];

  const finalTotal = getAmount('final_total', steps.total_origin_currency || quote.total_quote_origincurrency || quote.total_origin_currency || 0);
  const totalSavings = getAmount('total_savings', steps.total_savings || 0);

  // Share calculated total with parent component
  const [lastSharedTotal, setLastSharedTotal] = React.useState<{total: number, currency: string} | null>(null);
  
  React.useEffect(() => {
    if (onTotalCalculated && finalTotal !== undefined) {
      if (!lastSharedTotal || lastSharedTotal.total !== finalTotal || lastSharedTotal.currency !== currency) {
        const formattedTotal = formatCurrency(finalTotal, currency);
        onTotalCalculated(formattedTotal, finalTotal, currency);
        setLastSharedTotal({ total: finalTotal, currency });
      }
    }
  }, [finalTotal, currency, onTotalCalculated, formatCurrency, lastSharedTotal]);

  return (
    <Card className={`${className} border-teal-200 shadow-sm bg-white`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <OptimizedIcon name="FileText" className="w-5 h-5 text-teal-600" />
            <h3 className="text-lg font-semibold text-slate-900">Quote Breakdown</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-teal-600 hover:text-teal-800 hover:bg-teal-50 transition-colors"
          >
            <span className="text-sm font-medium mr-2">
              {showDetails ? 'Hide Details' : 'Show Details'}
            </span>
            {showDetails ? (
              <OptimizedIcon name="ChevronUp" className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Currency Notice */}
        {displayCurrency && displayCurrency !== originCurrency && (
          <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <OptimizedIcon name="Info" className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-600">
                <span className="font-medium">Currency Note:</span> Item prices shown in {originCurrency}, 
                other amounts converted to {displayCurrency} for your convenience.
              </div>
            </div>
          </div>
        )}

        {/* Summary View - Main Categories */}
        <div className="space-y-1">
          {summaryItems.map((item, index) => (
            <div key={index} className="flex items-center justify-between py-3">
              <div className="flex items-center space-x-3">
                <div className="text-teal-500 flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-700 font-medium">
                    {item.label}
                  </span>
                  {item.showCurrencyNote && item.currencyNote && (
                    <span className="text-xs text-slate-500 mt-1">
                      {item.currencyNote}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono font-medium text-slate-900">
                  {formatCurrency(item.amount, item.currency)}
                </span>
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="flex items-center justify-between py-3 border-t border-teal-200 pt-4 mt-2">
            <div className="flex items-center space-x-3">
              <div className="text-teal-500 flex-shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-slate-900 text-lg">
                  Total
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-lg text-slate-900">
                {formatCurrency(finalTotal, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <div className="flex items-center justify-center space-x-6 text-xs text-slate-600">
            <div className="flex items-center space-x-1">
              <OptimizedIcon name="Shield" className="w-3 h-3" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3" />
              <span>All Taxes Included</span>
            </div>
            <div className="flex items-center space-x-1">
              <Truck className="w-3 h-3" />
              <span>Insured Shipping</span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown (Expandable) */}
        {showDetails && (
          <div className="mt-8 pt-6 border-t border-teal-200">
            <div className="space-y-6">
              {/* Items & Products */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 uppercase tracking-wide">
                  Items & Products
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-start text-sm">
                    <span className="text-slate-600">Items Subtotal</span>
                    <span className="font-mono font-medium ml-4 text-slate-900">
                      {formatCurrency(steps.items_subtotal || 0, originCurrency)}
                    </span>
                  </div>
                  {steps.item_discounts > 0 && (
                    <div className="flex justify-between items-start text-sm">
                      <span className="text-emerald-700">Item Discounts</span>
                      <span className="font-mono font-medium ml-4 text-emerald-700">
                        -{formatCurrency(steps.item_discounts || 0, originCurrency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping & Logistics */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 uppercase tracking-wide">
                  Shipping & Logistics
                </h4>
                <div className="space-y-2">
                  {steps.shipping_cost > 0 && (
                    <div className="flex justify-between items-start text-sm">
                      <span className="text-slate-600">International Shipping</span>
                      <span className="font-mono font-medium ml-4 text-slate-900">
                        {formatCurrency(steps.shipping_cost || 0, currency)}
                      </span>
                    </div>
                  )}
                  {steps.insurance_amount > 0 && (
                    <div className="flex justify-between items-start text-sm">
                      <span className="text-slate-600">Package Insurance</span>
                      <span className="font-mono font-medium ml-4 text-slate-900">
                        {formatCurrency(steps.insurance_amount || 0, currency)}
                      </span>
                    </div>
                  )}
                  {steps.domestic_delivery > 0 && (
                    <div className="flex justify-between items-start text-sm">
                      <span className="text-slate-600">Local Delivery</span>
                      <span className="font-mono font-medium ml-4 text-slate-900">
                        {formatCurrency(steps.domestic_delivery || 0, currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Taxes & Duties */}
              {(steps.customs_duty > 0 || steps.local_tax_amount > 0) && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3 uppercase tracking-wide">
                    Taxes & Duties
                  </h4>
                  <div className="space-y-2">
                    {steps.customs_duty > 0 && (
                      <div className="flex justify-between items-start text-sm">
                        <span className="text-slate-600">Import Duties</span>
                        <span className="font-mono font-medium ml-4 text-slate-900">
                          {formatCurrency(steps.customs_duty || 0, currency)}
                        </span>
                      </div>
                    )}
                    {steps.local_tax_amount > 0 && (
                      <div className="flex justify-between items-start text-sm">
                        <span className="text-slate-600">Local Tax</span>
                        <span className="font-mono font-medium ml-4 text-slate-900">
                          {formatCurrency(steps.local_tax_amount || 0, currency)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Service Fees */}
              {(steps.handling_fee > 0 || steps.payment_gateway_fee > 0) && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3 uppercase tracking-wide">
                    Service Fees
                  </h4>
                  <div className="space-y-2">
                    {steps.handling_fee > 0 && (
                      <div className="flex justify-between items-start text-sm">
                        <span className="text-slate-600">Handling Fee</span>
                        <span className="font-mono font-medium ml-4 text-slate-900">
                          {formatCurrency(steps.handling_fee || 0, currency)}
                        </span>
                      </div>
                    )}
                    {steps.payment_gateway_fee > 0 && (
                      <div className="flex justify-between items-start text-sm">
                        <span className="text-slate-600">Payment Processing</span>
                        <span className="font-mono font-medium ml-4 text-slate-900">
                          {formatCurrency(steps.payment_gateway_fee || 0, currency)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Total Savings */}
              {totalSavings > 0 && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                        Savings
                      </Badge>
                      <span className="text-sm font-medium text-emerald-800">
                        Total amount saved on this quote
                      </span>
                    </div>
                    <span className="text-lg font-bold text-emerald-800 font-mono">
                      -{formatCurrency(totalSavings, currency)}
                    </span>
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <div className="text-sm text-slate-600 space-y-2">
                  <div className="flex items-start space-x-2">
                    <OptimizedIcon name="Info" className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-800 mb-1">Additional Information</p>
                      <ul className="space-y-1 text-slate-600">
                        <li>• All prices include applicable taxes and duties</li>
                        <li>• Package weight: {calc.inputs?.total_weight_kg || 0}kg</li>
                        <li>• Exchange rates updated daily</li>
                        {steps.insurance_amount > 0 && (
                          <li>• Package insurance covers full value and shipping</li>
                        )}
                        {hasProportionalRounding && (
                          <li className="text-emerald-700">• ✓ Enhanced accuracy with proportional rounding</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const QuoteProgress = ({ currentStep, status }: { currentStep: number; status: string }) => {
  // Dynamic steps based on quote status
  const getSteps = (status: string) => {
    if (status === 'rejected') {
      return [
        { label: 'Requested', step: 1 },
        { label: 'Calculated', step: 2 },
        { label: 'Rejected', step: 3, isRejected: true },
        { label: 'In Cart', step: 4 },
        { label: 'Checkout', step: 5 }
      ];
    }
    
    if (status === 'under_review') {
      return [
        { label: 'Requested', step: 1 },
        { label: 'Calculated', step: 2 },
        { label: 'Under Review', step: 3, isUnderReview: true },
        { label: 'In Cart', step: 4 },
        { label: 'Checkout', step: 5 }
      ];
    }
    
    return [
      { label: 'Requested', step: 1 },
      { label: 'Calculated', step: 2 },
      { label: 'Awaiting Approval', step: 3 },
      { label: 'In Cart', step: 4 },
      { label: 'Checkout', step: 5 }
    ];
  };
  
  const steps = getSteps(status);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <div key={step.step} className="flex flex-col items-center">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step.step <= currentStep 
                  ? (step.isRejected ? 'bg-red-500 text-white' : step.isUnderReview ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white')
                  : step.step === currentStep + 1 
                    ? 'bg-teal-500 text-white' 
                    : 'bg-teal-100 text-teal-400'
              }`}
            >
              {step.step <= currentStep ? (
                <OptimizedIcon name="CheckCircle" className="w-4 h-4" />
              ) : (
                step.step
              )}
            </div>
            <span className={`text-xs mt-2 font-medium ${
              step.step <= currentStep 
                ? (step.isRejected ? 'text-red-600' : step.isUnderReview ? 'text-amber-600' : 'text-emerald-600')
                : 'text-teal-500'
            }`}>
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <div className={`h-0.5 w-full mt-1 ${
                step.step < currentStep 
                  ? (steps[index].isRejected ? 'bg-red-500' : steps[index].isUnderReview ? 'bg-amber-500' : 'bg-emerald-500')
                  : 'bg-teal-200'
              }`} />
            )}
          </div>
        ))}
      </div>
      <Progress value={(currentStep / steps.length) * 100} className="h-1" />
    </div>
  );
};

// Quote visibility tiers for progressive disclosure
const getQuoteVisibilityTier = (status: string, viewMode: 'customer' | 'shared'): 'admin-only' | 'limited' | 'full' => {
  // Admin-only statuses: customers shouldn't see these quotes at all
  const adminOnlyStatuses = ['draft', 'calculated', 'pending'];
  
  // Limited visibility: customers can see basic info but no pricing/interactions
  const limitedStatuses = [];
  
  // Full access: customers can see everything and interact
  const fullAccessStatuses = ['sent', 'approved', 'rejected', 'expired'];
  
  if (adminOnlyStatuses.includes(status)) return 'admin-only';
  if (limitedStatuses.includes(status)) return 'limited';
  if (fullAccessStatuses.includes(status)) return 'full';
  
  // Default to limited for unknown statuses as a safety measure
  return 'limited';
};

const shouldShowPricing = (tier: string): boolean => {
  return tier === 'full';
};

const shouldShowActions = (tier: string): boolean => {
  return tier === 'full';
};

const shouldShowInteractiveElements = (tier: string): boolean => {
  return tier === 'full';
};

// Status-specific header and description helper
const getStatusHeaderData = (status: string, tier: string) => {
  switch (status) {
    case 'draft':
      return {
        title: 'Quote Being Prepared',
        description: 'Here are the items you requested a quote for. Our team is working on pricing and will notify you once it\'s ready for review.'
      };
    case 'calculated':
    case 'pending':
      return {
        title: 'Quote In Progress',
        description: 'Here are the items you requested a quote for. Our team is working on pricing and will notify you once it\'s ready for review.'
      };
    case 'sent':
      return {
        title: 'Quote Ready for Review',
        description: 'Your quote is ready! Please review the pricing and details below, then approve or request changes.'
      };
    case 'approved':
      return {
        title: 'Quote Approved',
        description: 'Your quote has been approved! Add it to cart to continue with checkout.'
      };
    case 'rejected':
      return {
        title: 'Quote Rejected',
        description: 'This quote was rejected. You can review the details below and approve it or request modifications.'
      };
    case 'expired':
      return {
        title: 'Quote Expired',
        description: 'This quote has expired but can still be approved. Review the details and approve to continue.'
      };
    case 'under_review':
      return {
        title: 'Review in Progress',
        description: 'We\'re reviewing your feedback and will send you an updated quote soon. We\'ll notify you once it\'s ready for approval.'
      };
    default:
      return {
        title: 'Your Quote',
        description: 'Review your quote and take an action below.'
      };
  }
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
      let query = supabase.from('quotes_v2').select(`
        id, quote_number, customer_id, customer_email, customer_name, customer_phone,
        origin_country, destination_country, items, shipping_method, customer_currency,
        admin_notes, customer_notes, status, calculation_data,
        total_quote_origincurrency, total_origin_currency, costprice_total_origin,
        final_total_origin, final_total_origincurrency,
        share_token, expires_at, reminder_count, last_reminder_at,
        created_at, updated_at, calculated_at, approved_at, created_by, approved_by,
        validity_days, sent_at, viewed_at, email_sent, sms_sent, whatsapp_sent,
        preferred_contact, version, parent_quote_id, revision_reason, changes_summary,
        payment_terms, approval_required, max_discount_percentage, minimum_order_value,
        converted_to_order_id, original_quote_id, external_reference, source,
        ip_address, user_agent, utm_source, utm_medium, utm_campaign,
        is_latest_version, approval_required_above, max_discount_allowed, api_version,
        applied_discounts, applied_discount_codes, discount_codes, discount_amounts,
        selected_shipping_option_id, delivery_address_id,
        options_last_updated_at, options_last_updated_by, in_cart,
        insurance_required, insurance_coverage_amount, insurance_rate_percentage,
        has_documents, customer_message
      `);
      
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
      const totalOriginCurrency = quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount;
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
      const totalOriginCurrency = quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount;
      const itemQuotePrice = totalOriginCurrency * itemProportion;
      return formatCurrency(itemQuotePrice, getBreakdownSourceCurrency(quote));
    }
  }, [quote, displayCurrency, convertCurrency]);

  const [approveModalOpen, setApproveModalOpen] = useState(false);
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
  
  // Addon services removed - only available in cart/checkout pages
  
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
        const totalOriginCurrency = quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount || 0;
        
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
        const fallbackTotal = quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount;
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
      const baseTotalOriginCurrency = quoteOptions.adjustedTotal || quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount;

      console.log('[ShopifyStyleQuoteView] Approving quote:', {
        baseTotal: baseTotalOriginCurrency,
        finalTotal: baseTotalOriginCurrency
      });

      // Update quote status to approved with selected options
      await supabase
        .from('quotes_v2')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          final_total_origincurrency: baseTotalOriginCurrency,
          // Store selected options in applied_discounts JSONB field
          applied_discounts: {
            shipping: quoteOptions.shipping,
            finalTotal: baseTotalOriginCurrency,
            baseTotal: baseTotalOriginCurrency,
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

  // Ask Question flow removed in favor of unified ticket/chat

  const getDaysUntilExpiry = () => {
    if (!quote?.expires_at) return null;
    const expiry = new Date(quote.expires_at);
    const now = new Date();
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your quote...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
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
  const getCurrentStep = (status: string): number => {
    switch (status) {
      case 'approved': return 4; // In Cart
      case 'sent': return 3; // Awaiting Approval
      case 'rejected': return 3; // Rejected (can be re-approved)
      case 'expired': return 3; // Expired (can be re-approved)
      case 'under_review': return 3; // Under Review
      case 'calculated': return 2; // Calculated
      case 'pending': return 1; // Requested
      case 'draft': return 1; // Draft/Requested
      default: return 3; // Default to Awaiting Approval
    }
  };
  
  const currentStep = getCurrentStep(quote.status);
  
  // Determine visibility tier for progressive disclosure
  const visibilityTier = getQuoteVisibilityTier(quote.status, viewMode);
  
  // Note: We no longer completely hide admin-only quotes from customers
  // Instead, we show the products they requested but hide pricing/actions

  return (
    <div className="min-h-screen bg-white">
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
            <h1 className="text-3xl font-bold text-slate-900">{getStatusHeaderData(quote.status, visibilityTier).title}</h1>
            <QuoteStatusBadge status={quote.status} />
          </div>
          <p className="text-slate-600">
            {getStatusHeaderData(quote.status, visibilityTier).description}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="hidden md:block">
          <QuoteProgress currentStep={currentStep} status={quote.status} />
        </div>
        <MobileProgress currentStep={currentStep} status={quote.status} />

        {/* Status Banner for admin-only quotes */}
        {visibilityTier === 'admin-only' && (
          <Card className="mb-6 border-teal-200 bg-teal-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <OptimizedIcon name="Clock" className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="font-medium text-slate-900">
                    Quote Being Prepared
                  </p>
                  <p className="text-sm text-slate-700">
                    Our team is calculating pricing and shipping costs. You'll receive an email notification when it's ready.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expiry Warning - Only show for non-approved quotes */}
        {daysLeft && daysLeft <= 7 && quote.status !== 'approved' && visibilityTier === 'full' && (
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
        
        {/* Mobile Breakdown - Only show for full access (has pricing) */}
        {shouldShowPricing(visibilityTier) && (
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
        )}
        
        <MobileTrustSignals />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Product Details & Options */}
          <div className="lg:col-span-2 hidden md:block">

            {/* Your Order - Enhanced as Main Product Display */}
            <Card className="mb-6 border-teal-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">Your Order</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Visual Header with Item Images and Stats */}
                <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-100">
                  <div className="flex items-start gap-4 mb-4">
                    {/* Compact Item Images */}
                    <div className="flex gap-2">
                      {items.slice(0, 3).map((item: any, index: number) => (
                        <div key={index} className="w-16 h-16 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden">
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
                        <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-medium text-slate-600">+{items.length - 3}</span>
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
                                className="text-teal-600 hover:text-teal-700 hover:underline"
                              >
                                {items[0]?.name}
                              </a>
                            ) : (
                              <span className="text-slate-900">{items[0]?.name}</span>
                            )
                          )}
                        </h3>
                        <div className="text-sm text-muted-foreground">
                          {items.length} item{items.length !== 1 ? 's' : ''} • {items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0).toFixed(2)}kg total
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          <span className="text-sm font-medium">All items verified</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="space-y-1">
                          {shouldShowPricing(visibilityTier) ? (
                            <>
                              <div>
                                <span className="font-medium">
                                  Item costs: {formatCurrency(items.reduce((sum, item) => sum + (item.costprice_origin * item.quantity), 0), getOriginCurrency(quote.origin_country))}
                                </span>
                                <span className="text-xs text-gray-500 ml-2">
                                  (in {getOriginCurrency(quote.origin_country)})
                                </span>
                              </div>
                              <div className="text-slate-900 font-semibold">
                                Total quote: {convertedAmounts.total || formatCurrency(quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount, displayCurrency)}
                              </div>
                            </>
                          ) : (
                            <div className="text-amber-700 font-medium bg-amber-50 px-3 py-2 rounded-lg">
                              <div className="flex items-center gap-2">
                                <OptimizedIcon name="Clock" className="w-4 h-4" />
                                <span>Pricing being finalized - will be available soon</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Estimate */}
                  <div className="pt-3 border-t border-teal-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-slate-600">
                        <OptimizedIcon name="Truck" className="w-4 h-4 mr-2 text-teal-600" />
                        <span className="text-sm font-medium">Estimated delivery</span>
                      </div>
                      <span className="font-semibold text-slate-900">
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
                    <div key={index} className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg border border-teal-100">
                      <div className="w-12 h-12 bg-slate-100 rounded flex-shrink-0 overflow-hidden">
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
                            className="font-medium text-sm text-teal-600 hover:text-teal-700 hover:underline"
                          >
                            {item.name}
                          </a>
                        ) : (
                          <p className="font-medium text-sm text-slate-900">{item.name}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>Qty: {item.quantity}</span>
                          <span>•</span>
                          <span>{Number(item.weight) || 0}kg</span>
                          {shouldShowPricing(visibilityTier) && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-gray-700">
                                {formatCurrency(item.costprice_origin, getOriginCurrency(quote.origin_country))} each
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-gray-900">
                                Total: {formatCurrency(item.costprice_origin * item.quantity, getOriginCurrency(quote.origin_country))}
                              </span>
                            </>
                          )}
                        </div>
                        {item.customer_notes && (
                          <div className="flex items-start gap-2 mt-2 p-2 bg-teal-50 rounded-md border border-teal-200">
                            <OptimizedIcon name="MessageCircle" className="w-3 h-3 text-teal-600 mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-slate-700">
                              <span className="font-medium">Your note:</span> {item.customer_notes}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                )}

              </CardContent>
            </Card>

            {/* Shipping Options - Collapsible - Only show for full access */}
            {shouldShowInteractiveElements(visibilityTier) && (
            <Card className="mb-6 border-slate-200">
              <CardHeader 
                className="cursor-pointer hover:bg-teal-50 transition-colors"
                onClick={() => setShippingOptionsExpanded(!shippingOptionsExpanded)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <OptimizedIcon name="Truck" className="w-5 h-5 text-teal-600" />
                    <CardTitle className="text-lg text-slate-900">Choose Your Shipping Speed</CardTitle>
                  </div>
                  <OptimizedIcon name="ChevronDown" className={`w-5 h-5 text-teal-400 transition-transform ${shippingOptionsExpanded ? 'rotate-180' : ''}`} />
                </div>
                <p className="text-sm text-slate-600 text-left">
                  Select your preferred shipping option. Faster shipping costs more but gets your items quicker.
                </p>
              </CardHeader>
              {shippingOptionsExpanded && (
                <CardContent>
                <div className="grid gap-4">
                  {/* Standard Shipping */}
                  <div 
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border cursor-pointer hover:bg-teal-50 transition-all ${
                      quoteOptions.shipping === 'standard' ? 'border-teal-500 bg-teal-50' : 'border-slate-200'
                    }`}
                    onClick={() => setQuoteOptions(prev => ({ 
                      ...prev, 
                      shipping: 'standard',
                      shippingAdjustment: 0,
                      adjustedTotal: (quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount)
                    }))}
                  >
                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
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
                        className="w-4 h-4 text-teal-600 border-slate-300 focus:ring-teal-500"
                      />
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-teal-600" />
                        <div>
                          <div className="font-medium text-slate-900">Standard Shipping</div>
                          <div className="text-sm text-slate-600">7-14 business days</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right ml-7 sm:ml-0">
                      <div className="font-semibold text-emerald-600">Included</div>
                      <div className="text-xs text-slate-500">No additional cost</div>
                    </div>
                  </div>

                  {/* Express Shipping */}
                  <div 
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border cursor-pointer hover:bg-orange-50 transition-all ${
                      quoteOptions.shipping === 'express' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'
                    }`}
                    onClick={() => setQuoteOptions(prev => ({ 
                      ...prev, 
                      shipping: 'express',
                      shippingAdjustment: 25,
                      adjustedTotal: (quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount) + 25
                    }))}
                  >
                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
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
                        className="w-4 h-4 text-orange-600 border-slate-300 focus:ring-orange-500"
                      />
                      <div className="flex items-center gap-3">
                        <OptimizedIcon name="Zap" className="w-5 h-5 text-orange-600" />
                        <div>
                          <div className="font-medium text-slate-900">Express Shipping</div>
                          <div className="text-sm text-slate-600">3-7 business days</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right ml-7 sm:ml-0">
                      <div className="font-semibold text-slate-900">+{formatCurrency(25, displayCurrency)}</div>
                      <div className="text-xs text-slate-500">Additional cost</div>
                    </div>
                  </div>

                  {/* Priority Shipping */}
                  <div 
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border cursor-pointer hover:bg-orange-100 transition-all ${
                      quoteOptions.shipping === 'priority' ? 'border-orange-600 bg-orange-100' : 'border-slate-200'
                    }`}
                    onClick={() => setQuoteOptions(prev => ({ 
                      ...prev, 
                      shipping: 'priority',
                      shippingAdjustment: 45,
                      adjustedTotal: (quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount) + 45
                    }))}
                  >
                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
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
                        className="w-4 h-4 text-orange-700 border-slate-300 focus:ring-orange-500"
                      />
                      <div className="flex items-center gap-3">
                        <Truck className="w-5 h-5 text-orange-700" />
                        <div>
                          <div className="font-medium text-slate-900">Priority Shipping</div>
                          <div className="text-sm text-slate-600">1-3 business days</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right ml-7 sm:ml-0">
                      <div className="font-semibold text-slate-900">+{formatCurrency(45, displayCurrency)}</div>
                      <div className="text-xs text-slate-500">Fastest option</div>
                    </div>
                  </div>
                </div>

                {/* Shipping Info */}
                <div className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-teal-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-slate-900 mb-1">Delivery Timeline</p>
                      <p className="text-slate-700">
                        Business days are Monday-Friday, excluding holidays. Express and Priority options include tracking.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              )}
            </Card>
            )}

            {/* Professional Breakdown - Only show for full access */}
            {shouldShowPricing(visibilityTier) && (
              <ProfessionalBreakdown
                quote={quote}
                formatCurrency={formatCurrency}
                displayCurrency={displayCurrency}
                onTotalCalculated={handleTotalCalculated}
                className="mb-6"
              />
            )}

            {/* Addon Services removed from quote page - only available in cart/checkout */}
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="hidden md:block">
            {/* Quote Summary */}
            <Card className="mb-6 sticky top-6">
              <CardContent className="p-6">
                {/* Quote Info */}
                <div className="space-y-3 mb-6">
                  {shouldShowPricing(visibilityTier) ? (
                    <>
                      {/* Base Quote Total */}
                      <div className="text-lg font-semibold text-slate-900">
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

                      {/* Addon services removed from quote page - available in cart/checkout only */}
                    </>
                  ) : (
                    <div className="text-center p-4 bg-teal-50 rounded-lg border border-teal-200">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <OptimizedIcon name="Clock" className="w-5 h-5 text-teal-600" />
                        <span className="font-medium text-slate-900">
                          {visibilityTier === 'admin-only' ? 'Calculating Your Quote' : 'Quote In Progress'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">
                        {visibilityTier === 'admin-only' 
                          ? 'Our team is calculating pricing for the items you requested. You\'ll get an email notification when it\'s ready.'
                          : 'Our team is finalizing your pricing and will notify you once it\'s ready for review.'
                        }
                      </p>
                    </div>
                  )}
                  
                  <div className="text-sm text-slate-600">
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
                {shouldShowActions(visibilityTier) ? (
                <div className="space-y-4">
                    {/* Primary Action Button */}
                    {quote.status === 'approved' ? (
                      // For approved quotes: Show Add to Cart / Added to Cart
                      <Button 
                        className={`w-full h-12 text-base font-medium ${
                          isInCart 
                            ? 'border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100' 
                            : 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white'
                        }`}
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
                      // For sent/rejected/expired quotes: Show Approve button
                      <Button 
                        className="w-full h-12 text-base font-medium bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
                        onClick={handleApprove}
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        {quote.status === 'rejected' ? 'Re-approve Quote' : 'Approve Quote'}
                      </Button>
                    )}

                    {/* Secondary Actions - Improved Grid Layout */}
                    <div className="grid grid-cols-1 gap-3">
                      {/* Message About Quote - simple unified messaging */}
                      <QuoteMessagingButton
                        quote={quote}
                        variant="outline"
                        size="lg"
                        className="h-12 border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 w-full justify-center"
                        stacked={false}
                        onMessageSent={() => {
                          // Refresh quote data after sending message
                          refreshQuote();
                        }}
                      />
                      
                      {/* Reject button - only for sent and expired quotes */}
                      {(quote.status === 'sent' || quote.status === 'expired') && (
                        <Button 
                          variant="destructive" 
                          className="h-12 w-full justify-center"
                          onClick={() => setRejectModalOpen(true)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject Quote
                        </Button>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={`text-center p-4 rounded-lg border ${
                      visibilityTier === 'admin-only' 
                        ? 'bg-teal-50 border-teal-200' 
                        : 'bg-amber-50 border-amber-200'
                    }`}>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <OptimizedIcon 
                          name={visibilityTier === 'admin-only' ? 'Clock' : 'Bell'} 
                          className={`w-5 h-5 ${
                            visibilityTier === 'admin-only' ? 'text-teal-600' : 'text-amber-600'
                          }`} 
                        />
                        <span className={`font-medium ${
                          visibilityTier === 'admin-only' ? 'text-slate-900' : 'text-amber-900'
                        }`}>
                          {visibilityTier === 'admin-only' ? 'Calculating Pricing' : 'We\'ll Notify You'}
                        </span>
                      </div>
                      <p className={`text-sm ${
                        visibilityTier === 'admin-only' ? 'text-slate-700' : 'text-amber-800'
                      }`}>
                        {visibilityTier === 'admin-only' 
                          ? 'We\'re working on pricing for your requested items. You\'ll get an email when ready.'
                          : 'You\'ll receive an email notification once your quote is ready for approval.'
                        }
                      </p>
                    </div>
                    
                    {/* Message About Quote - unified messaging */}
                    <QuoteMessagingButton
                      quote={quote}
                      variant="outline"
                      size="lg"
                      className="w-full h-12 border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700"
                      onMessageSent={() => {
                        // Refresh quote data after sending message  
                        refreshQuote();
                      }}
                    />
                  </div>
                )}

                <Separator className="my-6" />

                {/* Trust Signals - Shipping Terms & FAQ */}
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-3 text-sm text-slate-600">
                    <a 
                      href="/terms-conditions#shipping" 
                      className="text-teal-600 hover:text-teal-700 hover:underline font-medium transition-colors"
                    >
                      Shipping Terms
                    </a>
                    <span className="text-slate-400">•</span>
                    <a 
                      href="/help" 
                      className="text-teal-600 hover:text-teal-700 hover:underline font-medium transition-colors"
                    >
                      FAQ
                    </a>
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
                <OptimizedIcon name="CreditCard" className="w-4 h-4 mr-2" />
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

      {/* Ask Question flow removed in favor of unified ticket/chat */}


      {/* Mobile Sticky Bar - Only show for full access */}
      {shouldShowActions(visibilityTier) && (
      <MobileStickyBar 
        quote={quote}
        onApprove={() => {
          if (quote.status === 'approved' && isInCart) {
            navigate('/cart');
          } else if (quote.status === 'approved' && !isInCart) {
            handleAddToCart();
          } else {
            handleApprove();
          }
        }}
        onReject={() => setRejectModalOpen(true)}
        formatCurrency={formatCurrency}
        adjustedTotal={quoteOptions.adjustedTotal}
        displayCurrency={displayCurrency}
        convertedTotal={convertedAmounts.total}
        isInCart={isInCart}
        onAddToCart={handleAddToCart}
        onViewCart={() => navigate('/cart')}
      />
      )}

    </div>
  );
};

export default ShopifyStyleQuoteView;