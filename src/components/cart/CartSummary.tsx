/**
 * CartSummary - Real-time Cart Summary with Currency Conversion
 * 
 * Features:
 * - Real-time currency conversion
 * - Smart shipping estimation
 * - Tax calculation preview
 * - Discount application
 * - Performance optimized
 */

import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Package, Percent, AlertCircle, Shield } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cartDesignTokens, animations } from '@/styles/cart-design-system';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

import { useCart, useCartCurrency } from '@/hooks/useCart';
import { SimpleCartSyncIndicator } from '@/components/cart/SimpleCartSyncIndicator';
import { CouponCodeInput } from '@/components/quotes-v2/CouponCodeInput';
import { currencyService } from '@/services/CurrencyService';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface CartSummaryProps {
  onCheckout?: () => void;
  showShippingEstimate?: boolean;
  showTaxEstimate?: boolean;
  compact?: boolean;
  className?: string;
}

interface SummaryCalculations {
  subtotal: number;
  subtotalFormatted: string;
  estimatedShipping: number;
  estimatedShippingFormatted: string;
  estimatedTax: number;
  estimatedTaxFormatted: string;
  discount: number;
  discountFormatted: string;
  total: number;
  totalFormatted: string;
  currency: string;
}

export const CartSummary = memo<CartSummaryProps>(({
  onCheckout,
  showShippingEstimate = false,
  showTaxEstimate = false,
  compact = false,
  className = ''
}) => {
  const { items, getTotalValue, isLoading } = useCart();
  const { displayCurrency } = useCartCurrency();
  const { user } = useAuth();
  
  // Get sync status from original cart
  const { syncStatus } = useCart();
  
  const [calculations, setCalculations] = useState<SummaryCalculations | null>(null);
  const [calculationLoading, setCalculationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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


  // Handle coupon application
  const handleDiscountApplied = useCallback((discount: {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    discountAmount: number;
    appliesTo: 'total' | 'shipping' | 'handling';
    discountCodeId?: string;
  }) => {
    console.log('[CART SUMMARY] Coupon applied:', discount);
    
    // Check if coupon already applied
    const existingCoupon = appliedCoupons.find(c => c.code === discount.code);
    if (existingCoupon) {
      toast({
        title: "Coupon Already Applied",
        description: `${discount.code} is already applied to your cart.`,
        variant: "destructive"
      });
      return;
    }

    // Add to applied coupons
    const newAppliedCoupons = [...appliedCoupons, discount];
    setAppliedCoupons(newAppliedCoupons);
    
    // Calculate total discount from all coupons
    const newTotalDiscount = newAppliedCoupons.reduce((sum, coupon) => sum + coupon.discountAmount, 0);
    setTotalDiscount(newTotalDiscount);
    
    console.log('[CART SUMMARY] Updated coupons:', { 
      coupons: newAppliedCoupons.map(c => ({ code: c.code, amount: c.discountAmount })),
      totalDiscount: newTotalDiscount
    });
  }, [appliedCoupons]);

  // Handle coupon removal
  const handleDiscountRemoved = useCallback((codeToRemove?: string) => {
    if (!codeToRemove && appliedCoupons.length > 0) {
      // Remove the last applied coupon if no specific code provided
      codeToRemove = appliedCoupons[appliedCoupons.length - 1].code;
    }
    
    if (!codeToRemove) return;
    
    console.log('[CART SUMMARY] Removing coupon:', codeToRemove);
    
    const newAppliedCoupons = appliedCoupons.filter(c => c.code !== codeToRemove);
    setAppliedCoupons(newAppliedCoupons);
    
    // Recalculate total discount
    const newTotalDiscount = newAppliedCoupons.reduce((sum, coupon) => sum + coupon.discountAmount, 0);
    setTotalDiscount(newTotalDiscount);
    
    console.log('[CART SUMMARY] Updated coupons after removal:', { 
      coupons: newAppliedCoupons.map(c => ({ code: c.code, amount: c.discountAmount })),
      totalDiscount: newTotalDiscount
    });
  }, [appliedCoupons]);

  // Calculate summary totals
  const calculateSummary = useMemo(() => async (): Promise<SummaryCalculations> => {
    console.log('[CART SUMMARY] Starting calculation...', {
      itemsCount: items.length,
      displayCurrency,
      items: items.map(item => ({
        id: item.quote.id,
        display_id: item.quote.display_id,
        total_quote_origincurrency: item.quote.total_quote_origincurrency,
        final_total_origin: item.quote.final_total_origin,
        customer_currency: item.quote.customer_currency
      }))
    });
    
    // Base subtotal in display currency
    console.log('[CART SUMMARY] Getting total value...');
    const subtotal = await getTotalValue(displayCurrency);
    console.log(`[CART SUMMARY] Subtotal: ${subtotal} ${displayCurrency}`);
    
    const subtotalFormatted = currencyService.formatAmount(subtotal, displayCurrency);
    console.log(`[CART SUMMARY] Subtotal formatted: ${subtotalFormatted}`);

    // No shipping or tax calculations needed
    const estimatedShipping = 0;
    const estimatedShippingFormatted = currencyService.formatAmount(0, displayCurrency);
    
    const estimatedTax = 0;
    const estimatedTaxFormatted = currencyService.formatAmount(0, displayCurrency);


    // Use actual discount from applied coupons
    const discount = totalDiscount;
    const discountFormatted = currencyService.formatAmount(discount, displayCurrency);

    // Total including discount
    const total = subtotal - discount;
    console.log(`[CART SUMMARY] Final total: ${subtotal} - ${discount} = ${total} ${displayCurrency}`);
    
    const totalFormatted = currencyService.formatAmount(total, displayCurrency);

    const result = {
      subtotal,
      subtotalFormatted,
      estimatedShipping,
      estimatedShippingFormatted,
      estimatedTax,
      estimatedTaxFormatted,
      discount,
      discountFormatted,
      total,
      totalFormatted,
      currency: displayCurrency
    };

    console.log('[CART SUMMARY] Calculation complete:', result);
    return result;
  }, [items, displayCurrency, getTotalValue, totalDiscount]);

  // Recalculate when items or currency changes
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
          logger.error('Cart summary calculation failed', { error: err });
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


  // Loading state
  if (isLoading || calculationLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Cart Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Separator />
          <div className="flex justify-between">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Empty cart state
  if (items.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">Your cart is empty</h3>
          <p className="text-gray-400 text-sm">
            Add some quotes to see your summary here
          </p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Main summary display
  if (!calculations) return null;

  const { 
    subtotalFormatted, 
    insuranceFormatted,
    discountFormatted,
    totalFormatted,
    discount
  } = calculations;

  return (
    <Card className={`${className} ${cartDesignTokens.components.card.elevated} sticky top-4`}>
      <CardHeader className={`${cartDesignTokens.spacing.component.comfortable} pb-4`}>
        <CardTitle className={cartDesignTokens.typography.title.medium}>
          Order Summary
          <span className={`${cartDesignTokens.typography.body.small} ${cartDesignTokens.colors.text.muted} ml-2`}>
            ({items.length} {items.length === 1 ? 'item' : 'items'})
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className={`${cartDesignTokens.spacing.stack.normal} ${cartDesignTokens.spacing.component.comfortable} pt-0`}>
        {/* Subtotal */}
        <div className={cartDesignTokens.layout.flex.spaceBetween}>
          <span className={cartDesignTokens.typography.body.medium}>Subtotal</span>
          <span className={cartDesignTokens.typography.price.secondary}>{subtotalFormatted}</span>
        </div>


        {/* Coupon Input - Clean Design */}
        {calculations && (
          <div className="py-2 border-t border-gray-100">
            <CouponCodeInput
              customerId={user?.id}
              quoteTotal={calculations.subtotal}
              currency={displayCurrency}
              countryCode={items.length > 0 ? items[0].quote.destination_country : undefined}
              componentBreakdown={{
                shipping_cost: calculations.estimatedShipping,
                handling_fee: 0,
                insurance_amount: 0,
              }}
              onDiscountApplied={handleDiscountApplied}
              onDiscountRemoved={handleDiscountRemoved}
              appliedCodes={appliedCoupons.map(c => c.code)}
              disabled={calculationLoading || isLoading}
              hideQuoteTotal={true}
            />
          </div>
        )}

        {/* Discount */}
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

        {/* Total Section - International Standard */}
        <Separator className="my-4" />
        <div className={cartDesignTokens.layout.flex.spaceBetween}>
          <span className={cartDesignTokens.typography.title.small}>Total</span>
          <span className={cartDesignTokens.typography.price.primary}>
            {totalFormatted}
          </span>
        </div>


        {/* Checkout Button - International Standard */}
        {onCheckout && onCheckout.toString() !== '() => {}' && (
          <div className="pt-2">
            <Button 
              onClick={onCheckout}
              className={`w-full ${cartDesignTokens.components.button.primary} ${animations.transition.all} h-12 text-base`}
              size="lg"
            >
              <Package className="w-5 h-5 mr-2" />
              Proceed to Checkout
            </Button>
          </div>
        )}

        {/* Additional Info */}
        {!compact && !onCheckout && (
          <div className="pt-3 text-center">
            <p className={`${cartDesignTokens.typography.body.small} ${cartDesignTokens.colors.text.muted}`}>
              Final shipping and taxes calculated at checkout
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

CartSummary.displayName = 'CartSummary';

// Compact version for sidebar/mobile
export const CompactCartSummary = memo<Omit<CartSummaryProps, 'compact'>>(
  (props) => <CartSummary {...props} compact={true} />
);

CompactCartSummary.displayName = 'CompactCartSummary';

export default CartSummary;