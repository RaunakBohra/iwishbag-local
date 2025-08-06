import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles,
  Tag,
  CheckCircle,
  Gift,
  ArrowRight,
  Info,
  Zap
} from 'lucide-react';
import { DiscountService, type ApplicableDiscount } from '@/services/DiscountService';
import { currencyService } from '@/services/CurrencyService';

interface SmartSavingsWidgetProps {
  customerId?: string;
  orderTotal: number;
  countryCode: string;
  originCurrency?: string;
  className?: string;
  onDiscountApplied?: (discount: any) => void;
}

export const SmartSavingsWidget: React.FC<SmartSavingsWidgetProps> = ({
  customerId,
  orderTotal,
  countryCode,
  originCurrency = 'USD',
  className,
  onDiscountApplied
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [isLoadingAutoDiscounts, setIsLoadingAutoDiscounts] = useState(false);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<ApplicableDiscount | null>(null);
  const [autoDiscounts, setAutoDiscounts] = useState<ApplicableDiscount[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  
  const discountService = DiscountService.getInstance();

  // Format currency based on origin currency
  const formatAmount = (amount: number, currency?: string) => {
    try {
      const targetCurrency = currency || originCurrency || 'USD';
      return currencyService.formatAmount(amount, targetCurrency);
    } catch (error) {
      console.warn(`Currency formatting error for ${currency || originCurrency}:`, error);
      return `$${amount.toFixed(2)}`;
    }
  };

  // Convert USD amounts to origin currency if needed
  const convertToOriginCurrency = async (usdAmount: number): Promise<number> => {
    if (originCurrency === 'USD') return usdAmount;
    
    try {
      return await currencyService.convertAmount(usdAmount, 'USD', originCurrency);
    } catch (error) {
      console.warn('Currency conversion error:', error);
      return usdAmount;
    }
  };

  // Check for auto-applicable discounts
  useEffect(() => {
    checkAutoDiscounts();
  }, [orderTotal, countryCode, customerId]);

  const checkAutoDiscounts = async () => {
    if (!customerId || orderTotal <= 0) return;
    
    setIsLoadingAutoDiscounts(true);
    try {
      // Get automatic discounts from real DiscountService
      const applicableDiscounts = await discountService.getApplicableDiscounts(
        customerId,
        orderTotal,
        0, // handlingFee - we'll get this from parent later
        undefined, // paymentMethod
        countryCode
      );

      // Also get country-specific automatic benefits
      const countryDiscounts = await discountService.getAutomaticCountryBenefits(
        countryCode,
        orderTotal
      );

      // Combine all automatic discounts
      const allAutoDiscounts = [...applicableDiscounts, ...countryDiscounts];
      
      // Filter for display (only automatic, non-code discounts)
      const displayableDiscounts = allAutoDiscounts.filter(discount => 
        discount.discount_source !== 'code' && 
        ['membership', 'campaign', 'volume', 'first_time'].includes(discount.discount_source)
      );

      setAutoDiscounts(displayableDiscounts);
      
      // Calculate total automatic savings - convert USD to origin currency if needed
      let totalAutoSavings = 0;
      for (const discount of displayableDiscounts) {
        let discountAmount = 0;
        
        if (discount.discount_amount > 0) {
          discountAmount = discount.discount_amount;
        } else if (discount.discount_type === 'percentage') {
          discountAmount = orderTotal * (discount.discount_value / 100);
        } else {
          discountAmount = Math.min(discount.discount_value, orderTotal);
        }
        
        // Convert from USD to origin currency if needed
        if (originCurrency !== 'USD') {
          discountAmount = await convertToOriginCurrency(discountAmount);
        }
        
        totalAutoSavings += discountAmount;
      }
      
      const appliedDiscountAmount = appliedDiscount 
        ? (originCurrency !== 'USD' ? await convertToOriginCurrency(appliedDiscount.discount_amount) : appliedDiscount.discount_amount)
        : 0;
        
      setTotalSavings(totalAutoSavings + appliedDiscountAmount);
    } catch (error) {
      console.error('Error checking auto discounts:', error);
      setMessage({ 
        type: 'error', 
        text: 'Unable to load available discounts. Please try again later.' 
      });
    } finally {
      setIsLoadingAutoDiscounts(false);
    }
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) return;
    
    setIsApplying(true);
    setMessage(null);

    try {
      // Validate promo code using real DiscountService
      const validation = await discountService.validateDiscountCode(
        promoCode,
        customerId,
        countryCode,
        orderTotal,
        undefined, // sessionId
        undefined, // ipAddress
        typeof window !== 'undefined' ? window.navigator.userAgent : undefined
      );
      
      if (validation.valid && validation.discount) {
        // Get discount calculation
        const discountData = validation.discount;
        const discountType = discountData.discount_type;
        
        if (discountType) {
          let discountAmount = 0;
          
          // Calculate discount amount based on type
          if (discountType.type === 'percentage') {
            discountAmount = orderTotal * (discountType.value / 100);
            // Apply max discount cap if exists
            if (discountType.conditions?.max_discount) {
              // Convert max discount cap to origin currency if needed
              let maxDiscountCap = discountType.conditions.max_discount;
              if (originCurrency !== 'USD') {
                maxDiscountCap = await convertToOriginCurrency(maxDiscountCap);
              }
              discountAmount = Math.min(discountAmount, maxDiscountCap);
            }
          } else {
            // Fixed amount discount - convert from USD to origin currency if needed
            let fixedAmount = discountType.value;
            if (originCurrency !== 'USD') {
              fixedAmount = await convertToOriginCurrency(fixedAmount);
            }
            discountAmount = Math.min(fixedAmount, orderTotal);
          }
          
          const appliedDiscountData: ApplicableDiscount = {
            discount_source: 'code',
            discount_type: discountType.type as 'percentage' | 'fixed_amount',
            discount_value: discountType.value,
            discount_amount: discountAmount,
            applies_to: 'total',
            is_stackable: discountType.conditions?.stacking_allowed !== false,
            description: discountType.name || `Promo Code: ${promoCode}`,
            discount_code_id: discountData.id
          };
          
          setAppliedCode(promoCode);
          setAppliedDiscount(appliedDiscountData);
          setTotalSavings(prev => prev + discountAmount);
          setMessage({ 
            type: 'success', 
            text: `${discountType.name || 'Discount'} applied successfully!` 
          });
          setShowPromoInput(false);
          setPromoCode('');
          
          // Notify parent component
          onDiscountApplied?.(appliedDiscountData);
        }
      } else {
        // Use enhanced error if available, otherwise fall back to basic error
        const errorMessage = validation.enhancedError?.userMessage || 
                           validation.error || 
                           'Invalid promo code';
        
        setMessage({ type: 'error', text: errorMessage });
      }
    } catch (error) {
      console.error('Error validating promo code:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to validate promo code. Please try again.' 
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemovePromoCode = () => {
    if (appliedDiscount) {
      setTotalSavings(prev => prev - appliedDiscount.discount_amount);
    }
    setAppliedCode(null);
    setAppliedDiscount(null);
    setPromoCode('');
    setMessage(null);
  };

  return (
    <Card className={`border-2 border-dashed border-teal-200 bg-gradient-to-br from-teal-50 to-blue-50 ${className}`}>
      <CardContent className="p-4">
        {/* Header with Sparkle Effect */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-r from-teal-500 to-blue-500 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Smart Savings</h3>
          </div>
          {totalSavings > 0 && (
            <Badge className="bg-green-100 text-green-800 border-green-300 px-2 py-1">
              <span className="text-sm font-medium">-{formatAmount(totalSavings, originCurrency)} saved</span>
            </Badge>
          )}
        </div>

        {/* Loading Auto Discounts */}
        {isLoadingAutoDiscounts && (
          <div className="flex items-center justify-center py-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Checking available discounts...</span>
          </div>
        )}

        {/* Auto-Applied Discounts */}
        {!isLoadingAutoDiscounts && autoDiscounts.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Zap className="w-3 h-3 text-yellow-500" />
              <span>Auto-applied for you:</span>
            </div>
            {autoDiscounts.map((discount, index) => {
              // Calculate display amount in origin currency
              let discountAmount = discount.discount_amount > 0 
                ? discount.discount_amount 
                : discount.discount_type === 'percentage'
                  ? (orderTotal * (discount.discount_value / 100))
                  : Math.min(discount.discount_value, orderTotal);
              
              return (
                <div key={`${discount.discount_source}-${index}`} className="flex items-center justify-between bg-white/60 rounded-lg p-2 border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span className="text-sm font-medium text-gray-800">
                      {discount.description || `${discount.discount_source} discount`}
                    </span>
                    <span className="text-xs text-gray-500">
                      • {discount.discount_type === 'percentage' 
                          ? `${discount.discount_value}%` 
                          : `${formatAmount(discount.discount_value, 'USD')} (USD)`} off
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-green-700">
                    -{formatAmount(discountAmount, originCurrency)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Applied Promo Code */}
        {appliedCode && appliedDiscount && (
          <div className="bg-white/80 rounded-lg p-3 border border-blue-200 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-800">Code: {appliedCode}</span>
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                  Applied
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-green-700">
                  -{formatAmount(appliedDiscount.discount_amount, originCurrency)}
                </span>
                <Button
                  onClick={handleRemovePromoCode}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                >
                  ×
                </Button>
              </div>
            </div>
            {appliedDiscount.description && (
              <div className="text-xs text-gray-600 mt-1">
                {appliedDiscount.description}
              </div>
            )}
          </div>
        )}

        {/* Promo Code Input */}
        {!appliedCode && (
          <>
            {!showPromoInput ? (
              <Button
                onClick={() => setShowPromoInput(true)}
                variant="outline"
                className="w-full h-10 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
              >
                <Gift className="w-4 h-4 mr-2" />
                Have a promo code?
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter promo code"
                    className="flex-1 h-10 text-sm border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleApplyPromoCode()}
                  />
                  <Button
                    onClick={handleApplyPromoCode}
                    disabled={isApplying || !promoCode.trim()}
                    className="px-4 h-10"
                  >
                    {isApplying ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <Button
                  onClick={() => setShowPromoInput(false)}
                  variant="ghost"
                  size="sm"
                  className="w-full text-gray-500 h-8"
                >
                  Cancel
                </Button>
              </div>
            )}
          </>
        )}

        {/* Message Display */}
        {message && (
          <div className={`mt-3 p-2 rounded-lg flex items-center gap-2 text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : message.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            <Info className="w-3 h-3 flex-shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Summary */}
        {totalSavings > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total Savings:</span>
              <span className="text-lg font-bold text-green-700">{formatAmount(totalSavings, originCurrency)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};