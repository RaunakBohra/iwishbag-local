import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { 
  CheckCircle, 
  Package, 
  Truck, 
  Shield, 
  CreditCard,
  ChevronUp,
  ChevronDown,
  Settings,
  Tag,
  Clock,
  Zap,
  X
} from 'lucide-react';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
// import { MobileQuoteOptions } from './MobileQuoteOptions';
import { getBreakdownSourceCurrency } from '@/utils/currencyMigration';
import { getOriginCurrency } from '@/utils/originCurrency';
import QuoteMessagingButton from './QuoteMessagingButton';

interface MobileStickyBarProps {
  quote: any;
  onApprove: () => void;
  onRequestChanges?: () => void; // Deprecated - use QuoteMessagingButton instead  
  onReject: () => void;
  formatCurrency: (amount: number, currency: string) => string;
  adjustedTotal?: number;
  displayCurrency?: string;
  convertedTotal?: string;
  isInCart?: boolean;
  onAddToCart?: () => void;
  onViewCart?: () => void;
}

export const MobileStickyBar: React.FC<MobileStickyBarProps> = ({
  quote,
  onApprove,
  onRequestChanges,
  onReject,
  formatCurrency,
  adjustedTotal,
  displayCurrency,
  convertedTotal,
  isInCart = false,
  onAddToCart,
  onViewCart
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4 z-50 md:hidden">
      <div className="space-y-4">
        {/* Price Summary */}
        <div className="text-center">
          <div className="text-2xl font-bold">
            {convertedTotal || formatCurrency(adjustedTotal || quote.total_origin_currency || quote.origin_total_amount || quote.total_quote_origincurrency, displayCurrency || getBreakdownSourceCurrency(quote))}
          </div>
          {displayCurrency && displayCurrency !== getBreakdownSourceCurrency(quote) && (
            <div className="text-sm text-muted-foreground">
              Original: {formatCurrency(quote.total_origin_currency || quote.origin_total_amount || quote.total_quote_origincurrency, getBreakdownSourceCurrency(quote))}
            </div>
          )}
          {(displayCurrency || getBreakdownSourceCurrency(quote)) !== 'USD' && (
            <div className="text-sm text-muted-foreground">
              ≈ {formatCurrency(adjustedTotal || quote.total_quote_origincurrency, 'USD')}
            </div>
          )}
        </div>

        {/* Action Buttons - Status-Based Logic */}
        <div className="space-y-3">
          {/* Primary Action Button - Matches Desktop Logic */}
          {quote.status === 'approved' ? (
            // For approved quotes: Show Add to Cart / Added to Cart
            <Button 
              className={`w-full h-12 text-base font-medium ${
                isInCart 
                  ? 'border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100' 
                  : 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white'
              }`}
              onClick={onApprove}
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
              onClick={onApprove}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {quote.status === 'rejected' ? 'Re-approve Quote' : 'Approve Quote'}
            </Button>
          )}
          
          {/* Secondary Actions */}
          <div className="grid grid-cols-1 gap-3">
            <QuoteMessagingButton 
              quote={quote}
              variant="outline" 
              size="lg"
              className="h-12 border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700"
              stacked={false}
            />
            
            {/* Reject button - only for sent and expired quotes */}
            {(quote.status === 'sent' || quote.status === 'expired') && (
              <Button 
                variant="destructive" 
                onClick={onReject}
                className="h-12 text-sm font-medium"
              >
                <X className="w-4 h-4 mr-2" />
                Reject Quote
              </Button>
            )}
          </div>
        </div>

        {/* Trust Signals */}
        <div className="border-t border-slate-200 pt-4 mt-4">
          <div className="text-center text-xs text-slate-500">
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-1">
                <span>🔒</span>
                <span>Secure checkout</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1">
                <span>⚡</span>
                <span>Instant approval</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MobileProductSummaryProps {
  items: any[];
  quote: any;
  formatCurrency: (amount: number, currency: string) => string;
  displayCurrency?: string;
}

export const MobileProductSummary: React.FC<MobileProductSummaryProps> = ({
  items,
  quote,
  formatCurrency,
  displayCurrency
}) => {
  return (
    <Card className="md:hidden mb-6">
      <CardContent className="p-4">
        {/* Hero Product */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
            {items[0]?.images?.[0] ? (
              <img 
                src={items[0].images[0]} 
                alt={items[0].name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg leading-tight mb-2">
              {items.length > 1 ? (
                <>
                  {items[0]?.product_url ? (
                    <a 
                      href={items[0].product_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {items[0]?.name}
                    </a>
                  ) : (
                    <span>{items[0]?.name}</span>
                  )}
                  <span> + {items.length - 1} more</span>
                </>
              ) : (
                items[0]?.product_url ? (
                  <a 
                    href={items[0].product_url} 
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
            </h2>
            <div className="text-sm text-muted-foreground">
              {items.length} item{items.length !== 1 ? 's' : ''} • Express shipping
            </div>
          </div>
        </div>

        {/* All Items List (for multiple items) */}
        {items.length > 1 && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">All Items:</h3>
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
                  {item.product_url ? (
                    <a 
                      href={item.product_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline block truncate"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <p className="font-medium text-sm truncate">{item.name}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>Qty: {item.quantity}</span>
                    <span>•</span>
                    <span>{item.weight || 0}kg</span>
                    <span>•</span>
                    <span>{formatCurrency(item.costprice_origin, getOriginCurrency(quote.origin_country))}</span>
                  </div>
                  {item.customer_notes && (
                    <div className="mt-2 p-2 bg-blue-100 rounded text-xs">
                      <span className="font-medium text-blue-800">Note:</span>{' '}
                      <span className="text-blue-700">{item.customer_notes}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Key Benefits */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            All verified
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
            <Truck className="w-3 h-3 mr-1" />
            12-15 days
          </Badge>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
            <Shield className="w-3 h-3 mr-1" />
            Insured
          </Badge>
        </div>

        {/* Delivery Estimate */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-muted-foreground">
              <Truck className="w-4 h-4 mr-2" />
              <span>Delivery</span>
            </div>
            <span className="font-medium">
              {(() => {
                // Use admin shipping settings for delivery estimate
                const adminShippingOptions = quote.calculation_data?.shipping_options || [];
                const defaultOption = adminShippingOptions.find((opt: any) => opt.recommended) || 
                  adminShippingOptions[0];

                const minDate = defaultOption ? new Date(Date.now() + defaultOption.min_days * 24 * 60 * 60 * 1000) : new Date();
                const maxDate = defaultOption ? new Date(Date.now() + defaultOption.max_days * 24 * 60 * 60 * 1000) : new Date();
                
                return `${minDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })} - ${maxDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}`;
              })()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface MobileBreakdownProps {
  quote: any;
  breakdown: any;
  expanded: boolean;
  onToggle: () => void;
  formatCurrency: (amount: number, currency: string) => string;
  quoteOptions?: {
    shipping: string;
    insurance: boolean;
    discountCode: string;
  };
  onOptionsChange?: (options: {
    shipping: string;
    insurance: boolean;
    discountCode: string;
  }) => void;
  displayCurrency?: string;
}

export const MobileBreakdown: React.FC<MobileBreakdownProps> = ({
  quote,
  breakdown,
  expanded,
  onToggle,
  formatCurrency,
  quoteOptions,
  onOptionsChange,
  displayCurrency
}) => {
  const [convertedAmounts, setConvertedAmounts] = useState<{
    total: number;
    itemsTotal: number;
    itemDiscounts: number;
    shippingAndInsurance: number;
    dutiesAndTaxes: number;
    serviceFees: number;
  }>({
    total: 0,
    itemsTotal: 0,
    itemDiscounts: 0,
    shippingAndInsurance: 0,
    dutiesAndTaxes: 0,
    serviceFees: 0,
  });

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

  // Convert amounts when displayCurrency or quote changes - Fixed infinite loop
  useEffect(() => {
    const convertAmounts = async () => {
      const sourceCurrency = getBreakdownSourceCurrency(quote);
      
      if (!displayCurrency || displayCurrency === sourceCurrency) {
        // No conversion needed - use origin currency amounts
        setConvertedAmounts({
          total: quote.total_origin_currency || quote.origin_total_amount || quote.total_quote_origincurrency,
          itemsTotal: breakdown.items_total || 0,
          itemDiscounts: breakdown.item_discounts || 0,
          shippingAndInsurance: (breakdown.shipping || 0) + (breakdown.insurance || 0),
          dutiesAndTaxes: (breakdown.customs || 0) + (breakdown.local_tax || 0),
          serviceFees: (breakdown.handling_fee || 0) + (breakdown.domestic_delivery || 0),
        });
        return;
      }

      try {
        const [
          convertedTotal,
          convertedItemsTotal,
          convertedItemDiscounts,
          convertedShipping,
          convertedInsurance,
          convertedCustoms,
          convertedLocalTax,
          convertedHandlingFee,
          convertedDomesticDelivery,
        ] = await Promise.all([
          convertCurrency(quote.total_origin_currency || quote.origin_total_amount || quote.total_quote_origincurrency, sourceCurrency, displayCurrency),
          convertCurrency(breakdown.items_total || 0, sourceCurrency, displayCurrency),
          convertCurrency(breakdown.item_discounts || 0, sourceCurrency, displayCurrency),
          convertCurrency(breakdown.shipping || 0, sourceCurrency, displayCurrency),
          convertCurrency(breakdown.insurance || 0, sourceCurrency, displayCurrency),
          convertCurrency(breakdown.customs || 0, sourceCurrency, displayCurrency),
          convertCurrency(breakdown.local_tax || 0, sourceCurrency, displayCurrency),
          convertCurrency(breakdown.handling_fee || 0, sourceCurrency, displayCurrency),
          convertCurrency(breakdown.domestic_delivery || 0, sourceCurrency, displayCurrency),
        ]);

        setConvertedAmounts({
          total: convertedTotal,
          itemsTotal: convertedItemsTotal,
          itemDiscounts: convertedItemDiscounts,
          shippingAndInsurance: convertedShipping + convertedInsurance,
          dutiesAndTaxes: convertedCustoms + convertedLocalTax,
          serviceFees: convertedHandlingFee + convertedDomesticDelivery,
        });
      } catch (error) {
        console.error('Failed to convert mobile breakdown amounts:', error);
        // Fallback to original amounts using origin currency system
        setConvertedAmounts({
          total: quote.total_origin_currency || quote.origin_total_amount || quote.total_quote_origincurrency,
          itemsTotal: breakdown.items_total || 0,
          itemDiscounts: breakdown.item_discounts || 0,
          shippingAndInsurance: (breakdown.shipping || 0) + (breakdown.insurance || 0),
          dutiesAndTaxes: (breakdown.customs || 0) + (breakdown.local_tax || 0),
          serviceFees: (breakdown.handling_fee || 0) + (breakdown.domestic_delivery || 0),
        });
      }
    };
    
    convertAmounts();
  }, [
    quote.id, 
    quote.total_origin_currency, 
    quote.origin_total_amount, 
    quote.total_quote_origincurrency,
    quote.calculation_data?.origin_currency,
    breakdown.items_total,
    breakdown.item_discounts, 
    breakdown.shipping,
    breakdown.insurance,
    breakdown.customs,
    breakdown.local_tax,
    breakdown.handling_fee,
    breakdown.domestic_delivery,
    displayCurrency
  ]); // Only depend on primitive values to prevent infinite loop

  return (
    <Card className="md:hidden mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Total: {formatCurrency(convertedAmounts.total, displayCurrency || getBreakdownSourceCurrency(quote))}</h3>
          <Button variant="ghost" size="sm" onClick={onToggle} className="p-1 h-auto">
            {expanded ? (
              <>
                <span className="text-sm mr-1">Hide</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span className="text-sm mr-1">Show</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>

        {getBreakdownSourceCurrency(quote) !== 'USD' && (
          <div className="text-sm text-muted-foreground text-center mb-3">
            ≈ {formatCurrency(quote.total_quote_origincurrency || quote.total_origin_currency, 'USD')}
          </div>
        )}

        {expanded && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex justify-between text-sm">
              <span>Products</span>
              <span>{formatCurrency(convertedAmounts.itemsTotal, displayCurrency || getBreakdownSourceCurrency(quote))}</span>
            </div>
            
            {convertedAmounts.itemDiscounts > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Bundle savings</span>
                <span>-{formatCurrency(convertedAmounts.itemDiscounts, displayCurrency || getBreakdownSourceCurrency(quote))}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span>Shipping & Insurance</span>
              <span>{formatCurrency(convertedAmounts.shippingAndInsurance, displayCurrency || getBreakdownSourceCurrency(quote))}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Duties & Taxes</span>
              <span>{formatCurrency(convertedAmounts.dutiesAndTaxes, displayCurrency || getBreakdownSourceCurrency(quote))}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Service fees</span>
              <span>{formatCurrency(convertedAmounts.serviceFees, displayCurrency || getBreakdownSourceCurrency(quote))}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface MobileTrustSignalsProps {}

export const MobileTrustSignals: React.FC<MobileTrustSignalsProps> = () => {
  return (
    <Card className="md:hidden mb-6">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <div className="text-sm font-medium">Free packaging</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <Shield className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-sm font-medium">Insurance included</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <Truck className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <div className="text-sm font-medium">Express shipping</div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <Package className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <div className="text-sm font-medium">SMS tracking</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface MobileProgressProps {
  currentStep: number;
  status?: string;
}

export const MobileProgress: React.FC<MobileProgressProps> = ({ currentStep, status = 'sent' }) => {
  // Dynamic steps based on quote status
  const getSteps = (status: string) => {
    if (status === 'rejected') {
      return [
        { label: 'Requested', step: 1 },
        { label: 'Calculated', step: 2 },
        { label: 'Rejected', step: 3, isRejected: true },
        { label: 'Cart', step: 4 },
        { label: 'Checkout', step: 5 }
      ];
    }
    
    if (status === 'under_review') {
      return [
        { label: 'Requested', step: 1 },
        { label: 'Calculated', step: 2 },
        { label: 'Under Review', step: 3, isUnderReview: true },
        { label: 'Cart', step: 4 },
        { label: 'Checkout', step: 5 }
      ];
    }
    
    return [
      { label: 'Requested', step: 1 },
      { label: 'Calculated', step: 2 },
      { label: 'Approval', step: 3 },
      { label: 'Cart', step: 4 },
      { label: 'Checkout', step: 5 }
    ];
  };
  
  const steps = getSteps(status);
  
  return (
    <div className="md:hidden mb-6">
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div 
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                step.step <= currentStep 
                  ? (step.isRejected ? 'bg-red-500 text-white' : step.isUnderReview ? 'bg-amber-500 text-white' : 'bg-green-500 text-white')
                  : step.step === currentStep + 1 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step.step <= currentStep ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                step.step
              )}
            </div>
            <span className={`text-xs mt-1 ${
              step.step <= currentStep 
                ? (step.isRejected ? 'text-red-600 font-medium' : step.isUnderReview ? 'text-amber-600 font-medium' : 'text-green-600 font-medium')
                : 'text-gray-500'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-1">
        <div 
          className="bg-green-500 h-1 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
};

