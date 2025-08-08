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
import { ShoppingCart, Package, Truck, Calculator, Percent, AlertCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useCart, useCartCurrency } from '@/hooks/useCart';
import { currencyService } from '@/services/CurrencyService';
import { logger } from '@/utils/logger';

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
  showShippingEstimate = true,
  showTaxEstimate = true,
  compact = false,
  className = ''
}) => {
  const { items, getTotalValue, isLoading } = useCart();
  const { displayCurrency } = useCartCurrency();
  
  const [calculations, setCalculations] = useState<SummaryCalculations | null>(null);
  const [calculationLoading, setCalculationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate summary totals
  const calculateSummary = useMemo(() => async (): Promise<SummaryCalculations> => {
    
    // Base subtotal in display currency
    const subtotal = await getTotalValue(displayCurrency);
    const subtotalFormatted = currencyService.formatAmount(subtotal, displayCurrency);

    // Estimate shipping (simplified logic - would use ShippingService in real implementation)
    const averageShippingPerKg = displayCurrency === 'USD' ? 8 : 
      displayCurrency === 'INR' ? 600 : 
      displayCurrency === 'NPR' ? 1000 : 8;

    const totalWeight = items.reduce((sum, item) => {
      try {
        const items = Array.isArray(item.quote.items) ? 
          item.quote.items : JSON.parse(item.quote.items as string);
        return sum + items.reduce((itemSum: number, quoteItem: any) => 
          itemSum + (quoteItem.weight || 0.5), 0);
      } catch {
        return sum + 0.5; // Default weight if parsing fails
      }
    }, 0);

    const estimatedShipping = Math.max(totalWeight * averageShippingPerKg, 
      displayCurrency === 'USD' ? 15 : 
      displayCurrency === 'INR' ? 1200 : 
      displayCurrency === 'NPR' ? 1800 : 15);
    
    const estimatedShippingFormatted = currencyService.formatAmount(estimatedShipping, displayCurrency);

    // Estimate tax (simplified - would use TaxCalculationService in real implementation)
    const estimatedTaxRate = 0.1; // 10% average
    const estimatedTax = subtotal * estimatedTaxRate;
    const estimatedTaxFormatted = currencyService.formatAmount(estimatedTax, displayCurrency);

    // Discount (would integrate with discount system)
    const discount = 0; // Placeholder
    const discountFormatted = currencyService.formatAmount(discount, displayCurrency);

    // Total
    const total = subtotal + estimatedShipping + estimatedTax - discount;
    const totalFormatted = currencyService.formatAmount(total, displayCurrency);

    return {
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
  }, [items, displayCurrency, getTotalValue]);

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
    estimatedShippingFormatted, 
    estimatedTaxFormatted,
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
          <Badge variant="secondary" className="text-xs">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Subtotal</span>
          <span className="font-medium">{subtotalFormatted}</span>
        </div>

        {/* Shipping Estimate */}
        {showShippingEstimate && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Truck className="w-3 h-3" />
              Estimated Shipping
            </span>
            <span className="font-medium text-orange-600">
              {estimatedShippingFormatted}
            </span>
          </div>
        )}

        {/* Tax Estimate */}
        {showTaxEstimate && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Calculator className="w-3 h-3" />
              Estimated Tax
            </span>
            <span className="font-medium text-blue-600">
              {estimatedTaxFormatted}
            </span>
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
        {compact && (showShippingEstimate || showTaxEstimate) && (
          <p className="text-xs text-gray-500 mt-2">
            * Shipping and tax are estimates
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
              <span>Shipping and tax calculated at checkout</span>
            </div>
            
            {showShippingEstimate && (
              <div className="text-xs text-gray-500">
                Shipping rates vary by destination and weight
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