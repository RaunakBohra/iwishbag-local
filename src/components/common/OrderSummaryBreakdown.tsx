/**
 * OrderSummaryBreakdown - Reusable Order Summary Component
 * 
 * Features:
 * - Standardized breakdown display across cart, checkout, and quote pages
 * - Insurance option with real-time updates
 * - Proper currency formatting with conversion
 * - Loading states and error handling
 * - Responsive design
 */

import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Truck, 
  Calculator, 
  Shield, 
  Percent, 
  AlertCircle 
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

import { currencyService } from '@/services/CurrencyService';
import type { CartItem } from '@/types/cart';

interface OrderSummaryItem {
  id: string;
  name: string;
  quantity?: number;
  price: number;
  currency: string;
  description?: string;
}

interface OrderSummaryData {
  items: OrderSummaryItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  serviceFees: number;
  insurance: number;
  discount: number;
  total: number;
  currency: string;
  savings?: number;
}

interface OrderSummaryBreakdownProps {
  data: OrderSummaryData;
  cartItems?: CartItem[];
  loading?: boolean;
  error?: string | null;
  showInsurance?: boolean;
  showShipping?: boolean;
  showTax?: boolean;
  showServiceFees?: boolean;
  showItemDetails?: boolean;
  compact?: boolean;
  title?: string;
  onInsuranceToggle?: (enabled: boolean) => Promise<void>;
  insuranceLoading?: boolean;
  className?: string;
}

export const OrderSummaryBreakdown: React.FC<OrderSummaryBreakdownProps> = ({
  data,
  cartItems,
  loading = false,
  error = null,
  showInsurance = true,
  showShipping = true,
  showTax = true,
  showServiceFees = true,
  showItemDetails = true,
  compact = false,
  title = "Order Summary",
  onInsuranceToggle,
  insuranceLoading = false,
  className = ''
}) => {
  const [includeInsurance, setIncludeInsurance] = useState(data.insurance > 0);

  // Handle insurance toggle
  const handleInsuranceToggle = async (enabled: boolean) => {
    if (onInsuranceToggle) {
      await onInsuranceToggle(enabled);
    }
    setIncludeInsurance(enabled);
  };

  // Format currency amounts
  const formatAmount = (amount: number, currency: string = data.currency) => {
    return currencyService.formatAmount(amount, currency);
  };

  // Loading state
  if (loading) {
    return (
      <Card className={`${className} sticky top-4`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Separator />
            <Skeleton className="h-5 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={`${className} sticky top-4`}>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} sticky top-4`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {title}
          </span>
          {data.items.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {data.items.length} {data.items.length === 1 ? 'item' : 'items'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Individual Items - only show if requested and not compact */}
        {showItemDetails && !compact && cartItems && cartItems.length > 0 && (
          <div className="space-y-3 mb-4">
            {cartItems.map((item) => (
              <div key={item.quote.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    Quote #{item.quote.display_id || item.quote.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-gray-600">
                    {item.quote.items?.length || 0} items • {item.quote.origin_country} → {item.quote.destination_country}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-medium">
                    {formatAmount(item.quote.final_total_origincurrency || item.quote.total_quote_origincurrency || 0)}
                  </span>
                </div>
              </div>
            ))}
            <Separator />
          </div>
        )}

        {/* Summary Breakdown */}
        <div className="space-y-3">
          {/* Subtotal */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {showItemDetails ? 'Items Subtotal' : 'Subtotal'}
            </span>
            <span className="font-medium">{formatAmount(data.subtotal)}</span>
          </div>

          {/* Shipping */}
          {showShipping && data.shipping > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Truck className="w-3 h-3" />
                Shipping & Handling
              </span>
              <span className="font-medium">
                {formatAmount(data.shipping)}
              </span>
            </div>
          )}

          {/* Tax */}
          {showTax && data.tax > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Calculator className="w-3 h-3" />
                Taxes & Duties
              </span>
              <span className="font-medium">
                {formatAmount(data.tax)}
              </span>
            </div>
          )}

          {/* Service Fees */}
          {showServiceFees && data.serviceFees > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Service Fees
              </span>
              <span className="font-medium">
                {formatAmount(data.serviceFees)}
              </span>
            </div>
          )}

          {/* Insurance Option */}
          {showInsurance && (
            <div className="border border-gray-200 rounded-lg p-3 space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="order-summary-insurance"
                  checked={includeInsurance}
                  onCheckedChange={handleInsuranceToggle}
                  disabled={insuranceLoading}
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <Label 
                  htmlFor="order-summary-insurance"
                  className="text-sm text-gray-700 flex items-center gap-1 cursor-pointer flex-1"
                >
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Package Protection</span>
                  <span className="text-xs text-gray-500">(1.5% of order value)</span>
                </Label>
              </div>
              
              {includeInsurance && data.insurance > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Insurance Coverage</span>
                  <span className="font-medium text-blue-600">
                    {formatAmount(data.insurance)}
                  </span>
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                Protects against loss, damage, or theft during shipping
              </div>
              
              {insuranceLoading && (
                <div className="flex items-center text-xs text-gray-500">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                  Updating insurance coverage...
                </div>
              )}
            </div>
          )}

          {/* Discount/Savings */}
          {data.discount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Percent className="w-3 h-3" />
                Discount
              </span>
              <span className="font-medium text-green-600">
                -{formatAmount(data.discount)}
              </span>
            </div>
          )}

          {data.savings && data.savings > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 text-green-600">Savings</span>
              <span className="font-medium text-green-600">
                -{formatAmount(data.savings)}
              </span>
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="text-base font-semibold">Total</span>
          <span className="text-xl font-bold text-green-600">
            {formatAmount(data.total)}
          </span>
        </div>

        {/* Additional Info for non-compact view */}
        {!compact && (
          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <AlertCircle className="w-3 h-3" />
              <span>Final amounts calculated at checkout</span>
            </div>
            
            {showShipping && (
              <div className="text-xs text-gray-500">
                Shipping rates vary by destination and weight
              </div>
            )}
            
            {showInsurance && (
              <div className="text-xs text-gray-500">
                Insurance covers loss, theft, and damage during transit
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Compact version for sidebar/mobile use
export const CompactOrderSummaryBreakdown: React.FC<Omit<OrderSummaryBreakdownProps, 'compact'>> = (props) => (
  <OrderSummaryBreakdown {...props} compact={true} />
);

export default OrderSummaryBreakdown;