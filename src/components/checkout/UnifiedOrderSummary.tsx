/**
 * UnifiedOrderSummary - Combined order items and summary for checkout
 * 
 * Features:
 * - Combines item list and order totals in one component
 * - Shopify/Amazon-style unified layout
 * - Mobile-friendly collapse/expand
 * - Integrated coupon and insurance sections
 * - Consistent with cart design system
 * - Better visual balance on checkout page
 */

import React, { useState, memo, useMemo, useEffect, useCallback } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Package, 
  Percent, 
  Shield,
  ShoppingBag,
  Loader2
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useCart, useCartCurrency } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { currencyService } from '@/services/CurrencyService';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cartDesignTokens } from '@/styles/cart-design-system';

// Import existing components we'll integrate
import { CouponCodeInput } from '@/components/quotes-v2/CouponCodeInput';
import { CompactPackageProtection } from '@/components/cart/CompactPackageProtection';

interface UnifiedOrderSummaryProps {
  onPlaceOrder?: () => void;
  isProcessingOrder?: boolean;
  showPlaceOrderButton?: boolean;
  canPlaceOrder?: boolean;
  className?: string;
}

interface SummaryCalculations {
  subtotal: number;
  subtotalFormatted: string;
  insurance: number;
  insuranceFormatted: string;
  insuranceRate: number;
  discount: number;
  discountFormatted: string;
  total: number;
  totalFormatted: string;
  currency: string;
}

export const UnifiedOrderSummary = memo<UnifiedOrderSummaryProps>(({
  onPlaceOrder,
  isProcessingOrder = false,
  showPlaceOrderButton = false,
  canPlaceOrder = true,
  className = ''
}) => {
  const { items, getTotalValue, isLoading } = useCart();
  const { displayCurrency } = useCartCurrency();
  const { user } = useAuth();

  // State management
  const [showItemDetails, setShowItemDetails] = useState(true); // Show by default on desktop
  const [calculations, setCalculations] = useState<SummaryCalculations | null>(null);
  const [calculationLoading, setCalculationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeInsurance, setIncludeInsurance] = useState(false);
  const [insuranceLoading, setInsuranceLoading] = useState(false);

  // Coupon state management
  const [appliedCoupons, setAppliedCoupons] = useState<Array<{
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    discountAmount: number;
    appliesTo: 'total' | 'shipping' | 'handling';
    discountCodeId?: string;
  }>>([]);
  const [totalDiscount, setTotalDiscount] = useState(0);

  // Handle insurance toggle
  const handleInsuranceToggle = async (enabled: boolean) => {
    if (!user?.id || items.length === 0) {
      setIncludeInsurance(enabled);
      return;
    }

    setInsuranceLoading(true);
    try {
      const promises = items.map(async (item) => {
        const { data, error } = await supabase.rpc('update_quote_insurance', {
          p_quote_id: item.quote.id,
          p_insurance_enabled: enabled,
          p_customer_id: user.id
        });

        if (error) throw error;
        return data;
      });

      await Promise.all(promises);
      setIncludeInsurance(enabled);
      
      toast({
        title: enabled ? "Insurance Added" : "Insurance Removed",
        description: enabled 
          ? "Package protection added to all items"
          : "Package protection removed from cart",
      });

    } catch (error) {
      logger.error('Failed to update cart insurance:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update insurance. Please try again.",
        variant: "destructive"
      });
    } finally {
      setInsuranceLoading(false);
    }
  };

  // Handle coupon application
  const handleDiscountApplied = useCallback((discount: {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    discountAmount: number;
    appliesTo: 'total' | 'shipping' | 'handling';
    discountCodeId?: string;
  }) => {
    const existingCoupon = appliedCoupons.find(c => c.code === discount.code);
    if (existingCoupon) {
      toast({
        title: "Coupon Already Applied",
        description: `${discount.code} is already applied.`,
        variant: "destructive"
      });
      return;
    }

    const newAppliedCoupons = [...appliedCoupons, discount];
    setAppliedCoupons(newAppliedCoupons);
    
    const newTotalDiscount = newAppliedCoupons.reduce((sum, coupon) => sum + coupon.discountAmount, 0);
    setTotalDiscount(newTotalDiscount);
  }, [appliedCoupons]);

  // Handle coupon removal
  const handleDiscountRemoved = useCallback((codeToRemove?: string) => {
    if (!codeToRemove && appliedCoupons.length > 0) {
      codeToRemove = appliedCoupons[appliedCoupons.length - 1].code;
    }
    
    if (!codeToRemove) return;
    
    const newAppliedCoupons = appliedCoupons.filter(c => c.code !== codeToRemove);
    setAppliedCoupons(newAppliedCoupons);
    
    const newTotalDiscount = newAppliedCoupons.reduce((sum, coupon) => sum + coupon.discountAmount, 0);
    setTotalDiscount(newTotalDiscount);
  }, [appliedCoupons]);

  // Calculate summary totals
  const calculateSummary = useMemo(() => async (): Promise<SummaryCalculations> => {
    const subtotal = await getTotalValue(displayCurrency);
    const subtotalFormatted = currencyService.formatAmount(subtotal, displayCurrency);

    // Get insurance rate from quote data
    const getInsuranceRateFromQuotes = (): number => {
      try {
        const firstQuote = items[0]?.quote;
        if (firstQuote?.calculation_data) {
          const calcData = typeof firstQuote.calculation_data === 'string' 
            ? JSON.parse(firstQuote.calculation_data)
            : firstQuote.calculation_data;
          
          const insurancePercentage = calcData?.applied_rates?.insurance_percentage;
          if (insurancePercentage && insurancePercentage > 0) {
            return insurancePercentage / 100;
          }
        }
        return 0.015; // Default 1.5%
      } catch (error) {
        return 0.015;
      }
    };

    const insuranceRate = items.length > 0 ? getInsuranceRateFromQuotes() : 0.015;
    const insurance = includeInsurance ? subtotal * insuranceRate : 0;
    const insuranceFormatted = currencyService.formatAmount(insurance, displayCurrency);

    const discount = totalDiscount;
    const discountFormatted = currencyService.formatAmount(discount, displayCurrency);

    const total = subtotal + insurance - discount;
    const totalFormatted = currencyService.formatAmount(total, displayCurrency);

    return {
      subtotal,
      subtotalFormatted,
      insurance,
      insuranceFormatted,
      insuranceRate,
      discount,
      discountFormatted,
      total,
      totalFormatted,
      currency: displayCurrency
    };
  }, [items, displayCurrency, getTotalValue, includeInsurance, totalDiscount]);

  // Recalculate when dependencies change
  useEffect(() => {
    let isMounted = true;

    const updateCalculations = async () => {
      if (items.length === 0) {
        setCalculations(null);
        return;
      }

      setCalculationLoading(true);
      setError(null);

      try {
        const calc = await calculateSummary();
        if (isMounted) {
          setCalculations(calc);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Calculation failed';
          setError(errorMessage);
          logger.error('Unified order summary calculation failed', { error: err });
        }
      } finally {
        if (isMounted) {
          setCalculationLoading(false);
        }
      }
    };

    updateCalculations();

    return () => {
      isMounted = false;
    };
  }, [calculateSummary, items.length]);

  // Load initial insurance state
  useEffect(() => {
    const loadInsuranceState = async () => {
      if (!user?.id || items.length === 0) {
        setIncludeInsurance(false);
        return;
      }

      try {
        const promises = items.map(async (item) => {
          const { data, error } = await supabase
            .from('quotes_v2')
            .select('insurance_required')
            .eq('id', item.quote.id)
            .single();

          if (error) return false;
          return data?.insurance_required || false;
        });

        const insuranceStates = await Promise.all(promises);
        const anyInsuranceEnabled = insuranceStates.some(Boolean);
        
        // Auto-enable for high-value/international orders
        if (!anyInsuranceEnabled && calculations) {
          const shouldAutoEnable = 
            calculations.subtotal >= 100 || 
            (items.length > 0 && items[0].quote.destination_country !== items[0].quote.origin_country);
          
          if (shouldAutoEnable) {
            setIncludeInsurance(true);
            return;
          }
        }
        
        setIncludeInsurance(anyInsuranceEnabled);
      } catch (error) {
        logger.error('Failed to load cart insurance state:', error);
      }
    };

    loadInsuranceState();
  }, [items, user?.id, calculations]);

  // Auto-collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      setShowItemDetails(window.innerWidth >= 1024); // lg breakpoint
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Loading state
  if (isLoading || calculationLoading) {
    return (
      <Card className={`${className} ${cartDesignTokens.components.card.elevated} sticky top-4`}>
        <CardHeader className={cartDesignTokens.spacing.component.comfortable}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Item skeletons */}
          {[1, 2].map(i => (
            <div key={i} className="flex gap-3 p-3 border rounded-lg">
              <Skeleton className="h-16 w-16 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
          
          <Separator />
          
          {/* Summary skeletons */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
          
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Empty cart state
  if (items.length === 0) {
    return (
      <Card className={`${className} ${cartDesignTokens.components.card.elevated}`}>
        <CardContent className="py-8 text-center">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No items in order</h3>
          <p className="text-gray-400 text-sm">
            Add some quotes to see your order summary
          </p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={`${className} ${cartDesignTokens.components.card.elevated}`}>
        <CardContent className="py-6">
          <Alert>
            <Package className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!calculations) return null;

  const { 
    subtotalFormatted, 
    discountFormatted,
    totalFormatted,
    discount
  } = calculations;

  return (
    <Card className={`${className} ${cartDesignTokens.components.card.elevated} sticky top-4`}>
      <CardHeader className={cartDesignTokens.spacing.component.comfortable}>
        <div className="flex items-center justify-between">
          <CardTitle className={cartDesignTokens.typography.title.medium}>
            Order Summary
            <span className={`${cartDesignTokens.typography.body.small} ${cartDesignTokens.colors.text.muted} ml-2`}>
              ({items.length} {items.length === 1 ? 'item' : 'items'})
            </span>
          </CardTitle>
          
          {/* Mobile toggle button */}
          <button
            onClick={() => setShowItemDetails(!showItemDetails)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {showItemDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </CardHeader>

      <CardContent className={`${cartDesignTokens.spacing.stack.normal} ${cartDesignTokens.spacing.component.comfortable} pt-0`}>
        {/* Order Items Section - Collapsible on mobile */}
        {showItemDetails && (
          <div className="space-y-3 mb-6">
            {items.map((item) => (
              <div key={item.quote.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                {/* Item image placeholder */}
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-gray-400" />
                </div>
                
                {/* Item details */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                        Quote #{item.quote.display_id}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {item.quote.customer_data ? (() => {
                          try {
                            const customerData = typeof item.quote.customer_data === 'string' 
                              ? JSON.parse(item.quote.customer_data) 
                              : item.quote.customer_data;
                            return customerData?.name || 'Order items';
                          } catch {
                            return 'Order items';
                          }
                        })() : 'Order items'}
                      </p>
                      
                      {/* Item count if available */}
                      {item.quote.calculation_data && (() => {
                        try {
                          const calcData = typeof item.quote.calculation_data === 'string'
                            ? JSON.parse(item.quote.calculation_data)
                            : item.quote.calculation_data;
                          const itemCount = calcData?.items?.length || calcData?.item_count;
                          return itemCount ? (
                            <p className="text-xs text-gray-500 mt-1">
                              {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            </p>
                          ) : null;
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                    
                    {/* Item price */}
                    <div className="text-right flex-shrink-0">
                      <div className="font-medium text-gray-900 text-sm">
                        {currencyService.formatAmount(
                          item.quote.final_total_origin || item.quote.total_quote_origincurrency || 0,
                          displayCurrency
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order Summary Section */}
        <div className="space-y-4">
          {/* Subtotal */}
          <div className={cartDesignTokens.layout.flex.spaceBetween}>
            <span className={cartDesignTokens.typography.body.medium}>Subtotal</span>
            <span className={cartDesignTokens.typography.price.secondary}>{subtotalFormatted}</span>
          </div>

          {/* Package Protection */}
          {calculations && (
            <CompactPackageProtection
              orderValue={calculations.subtotal}
              currency={displayCurrency}
              insuranceRate={calculations.insuranceRate}
              isSelected={includeInsurance}
              onToggle={handleInsuranceToggle}
              isLoading={insuranceLoading}
              isInternational={items.length > 0 && items[0].quote.destination_country !== items[0].quote.origin_country}
            />
          )}

          {/* Coupon Input */}
          {calculations && (
            <div className="py-2 border-t border-gray-100">
              <CouponCodeInput
                customerId={user?.id}
                quoteTotal={calculations.subtotal + calculations.insurance}
                currency={displayCurrency}
                countryCode={items.length > 0 ? items[0].quote.destination_country : undefined}
                componentBreakdown={{
                  shipping_cost: 0,
                  handling_fee: 0,
                  insurance_amount: calculations.insurance,
                }}
                onDiscountApplied={handleDiscountApplied}
                onDiscountRemoved={handleDiscountRemoved}
                appliedCodes={appliedCoupons.map(c => c.code)}
                disabled={calculationLoading || isLoading}
                hideQuoteTotal={true}
              />
            </div>
          )}

          {/* Discount Display */}
          {discount > 0 && (
            <div className={cartDesignTokens.layout.flex.spaceBetween}>
              <span className={`${cartDesignTokens.typography.body.medium} ${cartDesignTokens.layout.flex.itemRow}`}>
                <Percent className="w-4 h-4 text-green-600" />
                Discount Applied
              </span>
              <span className={`${cartDesignTokens.typography.price.secondary} text-green-600`}>
                -{discountFormatted}
              </span>
            </div>
          )}

          {/* Total Section */}
          <Separator className="my-4" />
          <div className={cartDesignTokens.layout.flex.spaceBetween}>
            <span className={cartDesignTokens.typography.title.small}>Total</span>
            <span className={cartDesignTokens.typography.price.primary}>
              {totalFormatted}
            </span>
          </div>

          {/* Place Order Button */}
          {showPlaceOrderButton && onPlaceOrder && (
            <div className="pt-6">
              <Button 
                onClick={onPlaceOrder}
                disabled={!canPlaceOrder || isProcessingOrder}
                className={`w-full ${cartDesignTokens.components.button.primary} ${cartDesignTokens.animations.transition.all} h-12 text-base`}
                size="lg"
              >
                {isProcessingOrder ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing Order...
                  </>
                ) : (
                  <>
                    <Package className="w-5 h-5 mr-2" />
                    Place Order
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

UnifiedOrderSummary.displayName = 'UnifiedOrderSummary';

export default UnifiedOrderSummary;