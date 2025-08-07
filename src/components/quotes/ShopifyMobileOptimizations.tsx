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
  MessageCircle,
  ChevronUp,
  ChevronDown,
  Settings,
  Tag,
  Clock,
  Zap
} from 'lucide-react';
import { MobileQuoteOptions } from './MobileQuoteOptions';

interface MobileStickyBarProps {
  quote: any;
  onApprove: () => void;
  onRequestChanges: () => void;
  onReject: () => void;
  formatCurrency: (amount: number, currency: string) => string;
  adjustedTotal?: number;
  displayCurrency?: string;
  convertedTotal?: string;
}

export const MobileStickyBar: React.FC<MobileStickyBarProps> = ({
  quote,
  onApprove,
  onRequestChanges,
  onReject,
  formatCurrency,
  adjustedTotal,
  displayCurrency,
  convertedTotal
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4 z-50 md:hidden">
      <div className="space-y-3">
        {/* Price Summary */}
        <div className="text-center">
          <div className="text-2xl font-bold">
            {convertedTotal || formatCurrency(adjustedTotal || quote.total_customer_currency || quote.total_usd, displayCurrency || quote.customer_currency)}
          </div>
          {displayCurrency && displayCurrency !== quote.customer_currency && (
            <div className="text-sm text-muted-foreground">
              Original: {formatCurrency(quote.total_customer_currency || quote.total_usd, quote.customer_currency)}
            </div>
          )}
          {(displayCurrency || quote.customer_currency) !== 'USD' && (
            <div className="text-sm text-muted-foreground">
              ≈ {formatCurrency(adjustedTotal || quote.total_usd, 'USD')}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            className="w-full h-12 text-base font-medium bg-black hover:bg-gray-800"
            onClick={onApprove}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Approve & Add to Cart
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="destructive" 
              size="sm"
              onClick={onReject}
              className="h-10"
            >
              Reject
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onRequestChanges}
              className="h-10"
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              Ask
            </Button>
          </div>
        </div>

        {/* Trust Signal */}
        <div className="text-center text-xs text-muted-foreground">
          🔒 Secure checkout • ⚡ Instant approval
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
                    <span>{formatCurrency(item.costprice_origin, quote.origin_currency || 'USD')}</span>
                  </div>
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

  // Convert amounts when displayCurrency or quote changes
  useEffect(() => {
    const convertAmounts = async () => {
      if (!displayCurrency || displayCurrency === quote.customer_currency) {
        // No conversion needed
        setConvertedAmounts({
          total: quote.total_customer_currency || quote.total_usd,
          itemsTotal: breakdown.items_total || 0,
          itemDiscounts: breakdown.item_discounts || 0,
          shippingAndInsurance: (breakdown.shipping || 0) + (breakdown.insurance || 0),
          dutiesAndTaxes: (breakdown.customs || 0) + (breakdown.local_tax || 0),
          serviceFees: (breakdown.handling_fee || 0) + (breakdown.domestic_delivery || 0),
        });
        return;
      }

      try {
        const fromCurrency = quote.customer_currency || 'USD';
        
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
          convertCurrency(quote.total_customer_currency || quote.total_usd, fromCurrency, displayCurrency),
          convertCurrency(breakdown.items_total || 0, fromCurrency, displayCurrency),
          convertCurrency(breakdown.item_discounts || 0, fromCurrency, displayCurrency),
          convertCurrency(breakdown.shipping || 0, fromCurrency, displayCurrency),
          convertCurrency(breakdown.insurance || 0, fromCurrency, displayCurrency),
          convertCurrency(breakdown.customs || 0, fromCurrency, displayCurrency),
          convertCurrency(breakdown.local_tax || 0, fromCurrency, displayCurrency),
          convertCurrency(breakdown.handling_fee || 0, fromCurrency, displayCurrency),
          convertCurrency(breakdown.domestic_delivery || 0, fromCurrency, displayCurrency),
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
        // Fallback to original amounts
        setConvertedAmounts({
          total: quote.total_customer_currency || quote.total_usd,
          itemsTotal: breakdown.items_total || 0,
          itemDiscounts: breakdown.item_discounts || 0,
          shippingAndInsurance: (breakdown.shipping || 0) + (breakdown.insurance || 0),
          dutiesAndTaxes: (breakdown.customs || 0) + (breakdown.local_tax || 0),
          serviceFees: (breakdown.handling_fee || 0) + (breakdown.domestic_delivery || 0),
        });
      }
    };
    
    convertAmounts();
  }, [quote, breakdown, displayCurrency, convertCurrency]);

  return (
    <Card className="md:hidden mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Total: {formatCurrency(convertedAmounts.total, displayCurrency || quote.customer_currency)}</h3>
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

        {quote.customer_currency !== 'USD' && (
          <div className="text-sm text-muted-foreground text-center mb-3">
            ≈ {formatCurrency(quote.total_usd, 'USD')}
          </div>
        )}

        {expanded && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex justify-between text-sm">
              <span>Products</span>
              <span>{formatCurrency(convertedAmounts.itemsTotal, displayCurrency || quote.customer_currency)}</span>
            </div>
            
            {convertedAmounts.itemDiscounts > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Bundle savings</span>
                <span>-{formatCurrency(convertedAmounts.itemDiscounts, displayCurrency || quote.customer_currency)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span>Shipping & Insurance</span>
              <span>{formatCurrency(convertedAmounts.shippingAndInsurance, displayCurrency || quote.customer_currency)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Duties & Taxes</span>
              <span>{formatCurrency(convertedAmounts.dutiesAndTaxes, displayCurrency || quote.customer_currency)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Service fees</span>
              <span>{formatCurrency(convertedAmounts.serviceFees, displayCurrency || quote.customer_currency)}</span>
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
}

export const MobileProgress: React.FC<MobileProgressProps> = ({ currentStep }) => {
  const steps = ['Requested', 'Calculated', 'Approval', 'Cart', 'Checkout'];
  
  return (
    <div className="md:hidden mb-6">
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div 
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                index + 1 <= currentStep 
                  ? 'bg-green-500 text-white' 
                  : index + 1 === currentStep + 1 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index + 1 <= currentStep ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                index + 1
              )}
            </div>
            <span className={`text-xs mt-1 ${
              index + 1 <= currentStep ? 'text-green-600 font-medium' : 'text-gray-500'
            }`}>
              {step}
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

