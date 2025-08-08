/**
 * ProfessionalOrderSummary - Clean order summary for checkout
 * 
 * Features:
 * - Professional design following international standards
 * - No checkout button (for checkout context)
 * - Better visual hierarchy with proper spacing
 * - International standard totals display
 * - Mobile-responsive design
 */

import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Shield, Percent, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCart, useCartCurrency } from '@/hooks/useCart';
import { CouponCodeInput } from '@/components/quotes-v2/CouponCodeInput';
import { currencyService } from '@/services/CurrencyService';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface ProfessionalOrderSummaryProps {
  showInsuranceOption?: boolean;
  compact?: boolean;
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

export const ProfessionalOrderSummary = memo<ProfessionalOrderSummaryProps>(({
  showInsuranceOption = true,
  compact = false,
  className = ''
}) => {
  const { items, getTotalValue, isLoading } = useCart();
  const { displayCurrency } = useCartCurrency();
  const { user } = useAuth();
  
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
      console.log(`[ORDER SUMMARY] Updating insurance for ${items.length} quotes:`, enabled);

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

        return data;
      });

      await Promise.all(promises);
      
      setIncludeInsurance(enabled);
      
      toast({
        title: enabled ? "Insurance Added" : "Insurance Removed",
        description: enabled 
          ? "Package protection has been added to all items in your order"
          : "Package protection has been removed from your order",
      });

    } catch (error) {
      console.error('[ORDER SUMMARY] Failed to update insurance:', error);
      logger.error('Failed to update order insurance:', error);
      
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
    console.log('[ORDER SUMMARY] Coupon applied:', discount);
    
    // Check if coupon already applied
    const existingCoupon = appliedCoupons.find(c => c.code === discount.code);
    if (existingCoupon) {
      toast({
        title: "Coupon Already Applied",
        description: `${discount.code} is already applied to your order.`,
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
  }, [appliedCoupons]);

  // Handle coupon removal
  const handleDiscountRemoved = useCallback((codeToRemove?: string) => {
    if (!codeToRemove && appliedCoupons.length > 0) {
      codeToRemove = appliedCoupons[appliedCoupons.length - 1].code;
    }
    
    if (!codeToRemove) return;
    
    const newAppliedCoupons = appliedCoupons.filter(c => c.code !== codeToRemove);
    setAppliedCoupons(newAppliedCoupons);
    
    // Recalculate total discount
    const newTotalDiscount = newAppliedCoupons.reduce((sum, coupon) => sum + coupon.discountAmount, 0);
    setTotalDiscount(newTotalDiscount);
  }, [appliedCoupons]);

  // Calculate summary totals
  const calculateSummary = useMemo(() => async (): Promise<SummaryCalculations> => {
    console.log('[ORDER SUMMARY] Starting calculation...');
    
    // Base subtotal in display currency
    const subtotal = await getTotalValue(displayCurrency);
    const subtotalFormatted = currencyService.formatAmount(subtotal, displayCurrency);

    // Calculate insurance from quote data or use default rate
    const insuranceRate = items.length > 0 ? getInsuranceRateFromQuotes() : 0.015; // Default 1.5%
    const insurance = includeInsurance ? subtotal * insuranceRate : 0;
    const insuranceFormatted = currencyService.formatAmount(insurance, displayCurrency);

    // Helper function to get insurance rate from quote calculation data
    function getInsuranceRateFromQuotes(): number {
      try {
        const firstQuote = items[0]?.quote;
        if (firstQuote?.calculation_data) {
          const calcData = typeof firstQuote.calculation_data === 'string' 
            ? JSON.parse(firstQuote.calculation_data)
            : firstQuote.calculation_data;
          
          const insurancePercentage = calcData?.applied_rates?.insurance_percentage;
          if (insurancePercentage && insurancePercentage > 0) {
            return insurancePercentage / 100; // Convert percentage to decimal
          }
        }
        
        return 0.015; // Default 1.5%
      } catch (error) {
        return 0.015; // Fallback
      }
    }

    // Use actual discount from applied coupons
    const discount = totalDiscount;
    const discountFormatted = currencyService.formatAmount(discount, displayCurrency);

    // Total including insurance and discount
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
          logger.error('Order summary calculation failed', { error: err });
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

      } catch (error) {
        console.error('[ORDER SUMMARY] Failed to load insurance state:', error);
        logger.error('Failed to load order insurance state:', error);
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
            Order Summary
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
          <h3 className="text-lg font-medium text-gray-500 mb-2">No items in order</h3>
          <p className="text-gray-400 text-sm">
            Add items to see your order summary
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
    <Card className={`${className} border-gray-200`}>
      <CardHeader className="pb-4 px-4 sm:px-6">
        <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">
          Order Summary
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({items.length} {items.length === 1 ? 'item' : 'items'})
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 px-4 sm:px-6 pb-6">
        {/* Subtotal */}
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-700">Subtotal</span>
          <span className="font-medium text-gray-900">{subtotalFormatted}</span>
        </div>

        {/* Insurance Option */}
        {showInsuranceOption && calculations && (
          <div className="py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="include-insurance"
                  checked={includeInsurance}
                  onCheckedChange={(checked) => handleInsuranceToggle(checked === true)}
                  disabled={insuranceLoading}
                  className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                />
                <Label 
                  htmlFor="include-insurance"
                  className="text-sm text-gray-700 cursor-pointer flex items-center gap-2"
                >
                  <Shield className="w-4 h-4 text-gray-600" />
                  Package Protection
                </Label>
              </div>
              {includeInsurance && (
                <span className="font-medium text-gray-900">
                  {calculations.insuranceFormatted}
                </span>
              )}
            </div>
            
            {insuranceLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2 ml-10">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                Updating...
              </div>
            )}
          </div>
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

        {/* Discount */}
        {discount > 0 && (
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-700 flex items-center gap-2">
              <Percent className="w-4 h-4 text-green-600" />
              Discount Applied
            </span>
            <span className="font-medium text-green-600">
              -{discountFormatted}
            </span>
          </div>
        )}

        {/* Total Section */}
        <div className="border-t border-gray-200 pt-4 mt-6">
          <div className="flex justify-between items-center">
            <span className="text-lg sm:text-xl font-semibold text-gray-900">Total</span>
            <span className="text-xl sm:text-2xl font-bold text-gray-900">
              {totalFormatted}
            </span>
          </div>
        </div>

        {/* Professional Additional Info */}
        {!compact && (
          <div className="pt-3 text-center">
            <p className="text-xs text-gray-500">
              All taxes and fees included • Secure checkout
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

ProfessionalOrderSummary.displayName = 'ProfessionalOrderSummary';

export default ProfessionalOrderSummary;