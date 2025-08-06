import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  Check,
  Tag,
  X
} from 'lucide-react';
import { DiscountPreviewPanel } from '@/components/quotes-v2/DiscountPreviewPanel';
import { LiveDiscountPreview } from '@/components/quotes-v2/LiveDiscountPreview';
import { DiscountEligibilityChecker } from '@/components/quotes-v2/DiscountEligibilityChecker';
import { DiscountHelpTooltips } from '@/components/quotes-v2/DiscountHelpTooltips';

interface QuoteItem {
  id: string;
  quantity: number;
  unit_price_usd: number;
}

interface DiscountSectionProps {
  // Quote data
  items: QuoteItem[];
  customerEmail: string;
  destinationCountry: string;
  calculationResult: any;
  
  // Discount state
  discountCodes: string[];
  onDiscountCodesChange: (codes: string[]) => void;
  orderDiscountType: 'percentage' | 'fixed';
  onOrderDiscountTypeChange: (type: 'percentage' | 'fixed') => void;
  orderDiscountValue: number;
  onOrderDiscountValueChange: (value: number) => void;
  orderDiscountCode: string;
  onOrderDiscountCodeChange: (code: string) => void;
  orderDiscountCodeId: string | null;
  onOrderDiscountCodeIdChange: (id: string | null) => void;
  shippingDiscountType: 'percentage' | 'fixed' | 'free';
  onShippingDiscountTypeChange: (type: 'percentage' | 'fixed' | 'free') => void;
  shippingDiscountValue: number;
  onShippingDiscountValueChange: (value: number) => void;
  
  // UI state
  isCollapsed: boolean;
  onCollapseToggle: () => void;
  
  // Currency display
  currencySymbol: string;
}

export const DiscountSection: React.FC<DiscountSectionProps> = ({
  items,
  customerEmail,
  destinationCountry,
  calculationResult,
  discountCodes,
  onDiscountCodesChange,
  orderDiscountType,
  onOrderDiscountTypeChange,
  orderDiscountValue,
  onOrderDiscountValueChange,
  orderDiscountCode,
  onOrderDiscountCodeChange,
  orderDiscountCodeId,
  onOrderDiscountCodeIdChange,
  shippingDiscountType,
  onShippingDiscountTypeChange,
  shippingDiscountValue,
  onShippingDiscountValueChange,
  isCollapsed,
  onCollapseToggle,
  currencySymbol = '$'
}) => {
  const handleDiscountApplied = (discount: any) => {
    // Add to component discount codes for V2 system
    if (!discountCodes.includes(discount.code)) {
      onDiscountCodesChange([...discountCodes, discount.code]);
    }
    
    // Only set order-level discount if it applies to 'total'
    if (discount.appliesTo === 'total') {
      onOrderDiscountTypeChange(discount.type);
      onOrderDiscountValueChange(discount.value);
      onOrderDiscountCodeChange(discount.code);
      onOrderDiscountCodeIdChange(discount.discountCodeId || null);
    } else {
      // Clear order discount values for component-specific discounts
      onOrderDiscountTypeChange('percentage');
      onOrderDiscountValueChange(0);
      onOrderDiscountCodeChange('');
      onOrderDiscountCodeIdChange(null);
    }
  };

  const handleDiscountRemoved = () => {
    // Remove all codes and reset discount state
    onDiscountCodesChange([]);
    onOrderDiscountTypeChange('percentage');
    onOrderDiscountValueChange(0);
    onOrderDiscountCodeChange('');
    onOrderDiscountCodeIdChange(null);
  };

  const handleCodeSelect = (code: string) => {
    // Auto-fill the coupon input with the selected code
    const codeInput = document.querySelector('input[placeholder*="coupon"]') as HTMLInputElement;
    if (codeInput) {
      codeInput.value = code;
      codeInput.focus();
      // Trigger the change event to activate live preview
      codeInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const removeDiscountCode = (codeToRemove: string) => {
    onDiscountCodesChange(discountCodes.filter(c => c !== codeToRemove));
    if (orderDiscountCode === codeToRemove) {
      onOrderDiscountTypeChange('percentage');
      onOrderDiscountValueChange(0);
      onOrderDiscountCodeChange('');
      onOrderDiscountCodeIdChange(null);
    }
  };

  const calculateOrderTotal = () => {
    return calculationResult?.calculation_steps?.subtotal || 
           calculationResult?.calculation_steps?.items_subtotal ||
           items.reduce((sum, item) => sum + (item.quantity * item.unit_price_usd), 0) ||
           0;
  };

  const getComponentBreakdown = () => ({
    shipping_cost: calculationResult?.calculation_steps?.shipping_cost,
    customs_duty: calculationResult?.calculation_steps?.customs_duty,
    handling_fee: calculationResult?.calculation_steps?.handling_fee,
    local_tax: calculationResult?.calculation_steps?.local_tax,
    insurance_amount: calculationResult?.calculation_steps?.insurance_amount,
  });

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onCollapseToggle}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Smart Discount System
          </div>
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          )}
        </CardTitle>
        <CardDescription>
          Automatic discounts are applied based on order details. Add coupon codes for additional savings.
        </CardDescription>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="space-y-6">
          {/* Discount Preview Panel */}
          {customerEmail && destinationCountry && calculationResult && (
            <DiscountPreviewPanel
              orderTotal={calculateOrderTotal()}
              countryCode={destinationCountry}
              customerId={customerEmail}
              itemCount={items.length}
              componentBreakdown={getComponentBreakdown()}
              appliedCodes={discountCodes}
              onCodeSelect={handleCodeSelect}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Enhanced Coupon Code Input with Live Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                    Live Preview
                  </Badge>
                  Coupon Code
                </h4>
                <DiscountHelpTooltips context="admin" showAdvanced={true} />
              </div>
              <LiveDiscountPreview
                customerId={customerEmail}
                countryCode={destinationCountry}
                quoteTotal={calculateOrderTotal()}
                componentBreakdown={getComponentBreakdown()}
                onDiscountApplied={handleDiscountApplied}
                onDiscountRemoved={handleDiscountRemoved}
                disabled={!customerEmail || !calculationResult}
              />
            </div>

            {/* Discount Eligibility Checker */}
            {customerEmail && calculationResult && (
              <div className="space-y-2">
                <h4 className="font-medium text-blue-900">Discount Opportunities</h4>
                <DiscountEligibilityChecker
                  customerId={customerEmail}
                  orderTotal={calculateOrderTotal()}
                  countryCode={destinationCountry}
                  isFirstOrder={false} // Could be determined from customer data
                  hasAccount={!!customerEmail}
                  className="border-blue-200"
                />
              </div>
            )}
          </div>

          {/* Applied Discounts Summary */}
          {discountCodes.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Applied Discount Codes
              </h4>
              <div className="flex flex-wrap gap-2">
                {discountCodes.map((code) => (
                  <Badge key={code} variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800">
                    <Tag className="w-3 h-3" />
                    {code}
                    <button
                      onClick={() => removeDiscountCode(code)}
                      className="ml-1 rounded-full hover:bg-green-200 p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Legacy Manual Discount Controls (Admin Override) */}
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Manual Discount (Admin Override) */}
            <div className="space-y-2">
              <h4 className="font-medium">Manual Discount (Admin)</h4>
              <div className="flex gap-2">
                <Select 
                  value={orderDiscountType} 
                  onValueChange={(value: 'percentage' | 'fixed') => onOrderDiscountTypeChange(value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="fixed">{currencySymbol}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={orderDiscountValue || ''}
                  onChange={(e) => onOrderDiscountValueChange(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  disabled={!!orderDiscountCode} // Disable if coupon is applied
                />
              </div>
              {orderDiscountCode && (
                <p className="text-sm text-amber-600">
                  Coupon applied - manual discount disabled
                </p>
              )}
            </div>

            {/* Order Summary Indicator */}
            <div className="space-y-2">
              <h4 className="font-medium">Current Order Status</h4>
              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Items Total:</span>
                    <span className="font-medium">{currencySymbol}{calculateOrderTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Codes:</span>
                    <span className="font-medium">{discountCodes.length}</span>
                  </div>
                  {orderDiscountValue > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Manual Discount:</span>
                      <span className="font-medium">
                        {orderDiscountType === 'percentage' 
                          ? `${orderDiscountValue}%` 
                          : `${currencySymbol}${orderDiscountValue.toFixed(2)}`
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shipping Discount */}
            <div className="space-y-2">
              <h4 className="font-medium">Shipping Discount</h4>
              <div className="flex gap-2">
                <Select 
                  value={shippingDiscountType} 
                  onValueChange={(value: 'percentage' | 'fixed' | 'free') => onShippingDiscountTypeChange(value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="fixed">{currencySymbol}</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                  </SelectContent>
                </Select>
                {shippingDiscountType !== 'free' && (
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingDiscountValue || ''}
                    onChange={(e) => onShippingDiscountValueChange(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                )}
              </div>
            </div>

            {/* Shipping Discount Summary */}
            <div className="space-y-2">
              <h4 className="font-medium">Shipping Discount Status</h4>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-sm">
                  {shippingDiscountType === 'free' ? (
                    <div className="flex items-center gap-2 text-blue-800">
                      <Check className="w-4 h-4" />
                      <span className="font-medium">Free shipping enabled</span>
                    </div>
                  ) : shippingDiscountValue > 0 ? (
                    <div className="text-blue-800">
                      <div className="font-medium">
                        {shippingDiscountType === 'percentage' 
                          ? `${shippingDiscountValue}% off shipping` 
                          : `${currencySymbol}${shippingDiscountValue.toFixed(2)} off shipping`
                        }
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-600">No shipping discount applied</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};