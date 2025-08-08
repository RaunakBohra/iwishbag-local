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

import React, { memo, useMemo, useState, useEffect } from 'react';
import { ShoppingCart, Package, Percent, AlertCircle, Shield } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  showInsuranceOption?: boolean;
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
  insurance: number;
  insuranceFormatted: string;
  insuranceRate: number;
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
  showInsuranceOption = true,
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

  // Handle insurance toggle with database persistence
  const handleInsuranceToggle = async (enabled: boolean) => {
    if (!user?.id || items.length === 0) {
      setIncludeInsurance(enabled);
      return;
    }

    setInsuranceLoading(true);
    try {
      console.log(`[CART SUMMARY] Updating insurance for ${items.length} quotes:`, enabled);

      // Update insurance for all cart items
      const promises = items.map(async (item) => {
        const { data, error } = await supabase.rpc('update_quote_insurance', {
          p_quote_id: item.quote.id,
          p_insurance_enabled: enabled,
          p_customer_id: user.id
        });

        if (error) {
          console.error(`Failed to update insurance for quote ${item.quote.id}:`, error);
          throw error;
        }

        console.log(`[CART SUMMARY] Insurance updated for quote ${item.quote.id}:`, data);
        return data;
      });

      await Promise.all(promises);
      
      setIncludeInsurance(enabled);
      
      toast({
        title: enabled ? "Insurance Added" : "Insurance Removed",
        description: enabled 
          ? "Package protection has been added to all items in your cart"
          : "Package protection has been removed from your cart",
      });

    } catch (error) {
      console.error('[CART SUMMARY] Failed to update insurance:', error);
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

    // Calculate insurance from quote data or use default rate
    const insuranceRate = items.length > 0 ? getInsuranceRateFromQuotes() : 0.015; // Default 1.5%
    const insurance = includeInsurance ? subtotal * insuranceRate : 0;
    console.log(`[CART SUMMARY] Insurance (${insuranceRate * 100}%): ${insurance} ${displayCurrency} (included: ${includeInsurance})`);
    
    const insuranceFormatted = currencyService.formatAmount(insurance, displayCurrency);

    // Helper function to get insurance rate from quote calculation data
    function getInsuranceRateFromQuotes(): number {
      try {
        // Get insurance rate from the first quote's calculation data
        const firstQuote = items[0]?.quote;
        if (firstQuote?.calculation_data) {
          const calcData = typeof firstQuote.calculation_data === 'string' 
            ? JSON.parse(firstQuote.calculation_data)
            : firstQuote.calculation_data;
          
          const insurancePercentage = calcData?.applied_rates?.insurance_percentage;
          if (insurancePercentage && insurancePercentage > 0) {
            console.log(`[CART SUMMARY] Using insurance rate from quote: ${insurancePercentage}%`);
            return insurancePercentage / 100; // Convert percentage to decimal
          }
        }
        
        console.log('[CART SUMMARY] Using default insurance rate: 1.5%');
        return 0.015; // Default 1.5%
      } catch (error) {
        console.log('[CART SUMMARY] Failed to parse insurance rate, using default:', error);
        return 0.015; // Fallback
      }
    }

    // Use actual discount from applied coupons
    const discount = totalDiscount;
    const discountFormatted = currencyService.formatAmount(discount, displayCurrency);

    // Total including insurance and discount
    const total = subtotal + insurance - discount;
    console.log(`[CART SUMMARY] Final total: ${subtotal} + ${insurance} - ${discount} = ${total} ${displayCurrency}`);
    
    const totalFormatted = currencyService.formatAmount(total, displayCurrency);

    const result = {
      subtotal,
      subtotalFormatted,
      estimatedShipping,
      estimatedShippingFormatted,
      estimatedTax,
      estimatedTaxFormatted,
      insurance,
      insuranceFormatted,
      insuranceRate,
      discount,
      discountFormatted,
      total,
      totalFormatted,
      currency: displayCurrency
    };

    console.log('[CART SUMMARY] Calculation complete:', result);
    return result;
  }, [items, displayCurrency, getTotalValue, includeInsurance, totalDiscount]);

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

  // Load initial insurance state from database when cart items change
  useEffect(() => {
    const loadInsuranceState = async () => {
      if (!user?.id || items.length === 0) {
        setIncludeInsurance(false);
        return;
      }

      try {
        // Check if any cart items have insurance enabled
        const promises = items.map(async (item) => {
          const { data, error } = await supabase
            .from('quotes_v2')
            .select('insurance_required')
            .eq('id', item.quote.id)
            .single();

          if (error) {
            console.warn(`Failed to check insurance for quote ${item.quote.id}:`, error);
            return false;
          }

          return data?.insurance_required || false;
        });

        const insuranceStates = await Promise.all(promises);
        
        // Set insurance to true if any item has it enabled
        const anyInsuranceEnabled = insuranceStates.some(Boolean);
        setIncludeInsurance(anyInsuranceEnabled);

        console.log(`[CART SUMMARY] Initial insurance state loaded: ${anyInsuranceEnabled} (from ${insuranceStates.length} quotes)`);

      } catch (error) {
        console.error('[CART SUMMARY] Failed to load insurance state:', error);
        logger.error('Failed to load cart insurance state:', error);
      }
    };

    loadInsuranceState();
  }, [items, user?.id]);

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
    <Card className={`${className} sticky top-4`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Cart Summary
          </span>
          <div className="flex items-center gap-2">
            <SimpleCartSyncIndicator 
              syncStatus={syncStatus} 
              showLabel={false} 
            />
            <Badge variant="secondary" className="text-xs">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>
        </CardTitle>
        
        {/* Cart status info for non-compact view */}
        {!compact && (
          <div className="text-xs text-gray-500 mt-1 space-y-1">
            {!user && (
              <div>Sign in to sync cart across devices</div>
            )}
            {syncStatus !== 'synced' && syncStatus !== 'offline' && (
              <div className="text-orange-600">
                Cart is {syncStatus}
              </div>
            )}
            <SimpleCartSyncIndicator 
              syncStatus={syncStatus} 
              showLabel={false} 
              className="inline-flex"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Subtotal</span>
          <span className="font-medium">{subtotalFormatted}</span>
        </div>


        {/* Insurance Option */}
        {showInsuranceOption && calculations && (
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="include-insurance"
                checked={includeInsurance}
                onCheckedChange={(checked) => handleInsuranceToggle(checked === true)}
                disabled={insuranceLoading}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label 
                htmlFor="include-insurance"
                className="text-sm text-gray-700 flex items-center gap-1 cursor-pointer"
              >
                <Shield className="w-3 h-3" />
                Package Insurance ({(calculations.insuranceRate * 100).toFixed(1)}%)
              </Label>
            </div>
            
            {includeInsurance && (
              <div className="flex justify-between items-center ml-6">
                <span className="text-sm text-gray-500">Insurance Coverage</span>
                <span className="font-medium text-blue-600">
                  {calculations.insuranceFormatted}
                </span>
              </div>
            )}

            {insuranceLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 ml-6">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                Updating insurance coverage...
              </div>
            )}
          </div>
        )}

        {/* Discount */}
        {discount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Percent className="w-3 h-3" />
              Discount
            </span>
            <span className="font-medium text-green-600">
              -{discountFormatted}
            </span>
          </div>
        )}

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="text-base font-semibold">Total</span>
          <span className="text-xl font-bold text-green-600">
            {totalFormatted}
          </span>
        </div>

        {/* Disclaimers for compact view */}
        {compact && (showShippingEstimate || showTaxEstimate || showInsuranceOption) && (
          <p className="text-xs text-gray-500 mt-2">
            * Shipping, tax, and insurance are estimates
          </p>
        )}

        {/* Checkout Button */}
        {onCheckout && (
          <Button 
            onClick={onCheckout}
            className="w-full mt-4"
            size={compact ? 'sm' : 'default'}
          >
            <Package className="w-4 h-4 mr-2" />
            Proceed to Checkout
          </Button>
        )}

        {/* Additional Info for non-compact view */}
        {!compact && (
          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <AlertCircle className="w-3 h-3" />
              <span>Shipping, tax, and insurance calculated at checkout</span>
            </div>
            
            {showShippingEstimate && (
              <div className="text-xs text-gray-500">
                Shipping rates vary by destination and weight
              </div>
            )}
            
            {showInsuranceOption && (
              <div className="text-xs text-gray-500">
                Insurance covers loss, theft, and damage during transit
              </div>
            )}
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