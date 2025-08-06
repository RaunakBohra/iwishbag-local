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
import { DiscountService } from '@/services/DiscountService';
import { currencyService } from '@/services/CurrencyService';

interface SmartSavingsWidgetProps {
  customerId?: string;
  orderTotal: number;
  countryCode: string;
  originCurrency?: string;
  className?: string;
  onDiscountApplied?: (discount: any) => void;
}

interface AutoDiscount {
  id: string;
  name: string;
  amount: number;
  description: string;
  type: 'percentage' | 'fixed';
  isApplied: boolean;
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
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [autoDiscounts, setAutoDiscounts] = useState<AutoDiscount[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);

  // Format currency based on origin currency
  const formatAmount = (amount: number) => {
    try {
      return currencyService.formatAmount(amount, originCurrency || 'USD');
    } catch (error) {
      return `$${amount.toFixed(2)}`;
    }
  };

  // Check for auto-applicable discounts
  useEffect(() => {
    checkAutoDiscounts();
  }, [orderTotal, countryCode, customerId]);

  const checkAutoDiscounts = async () => {
    try {
      // Simulate checking for auto-applicable discounts
      const mockAutoDiscounts: AutoDiscount[] = [];

      // First-time customer discount
      if (!customerId || customerId.includes('new')) {
        mockAutoDiscounts.push({
          id: 'new-customer',
          name: 'Welcome Discount',
          amount: orderTotal * 0.05, // 5%
          description: 'New customer special',
          type: 'percentage',
          isApplied: true
        });
      }

      // Country-specific discounts
      if (countryCode === 'NP') {
        mockAutoDiscounts.push({
          id: 'nepal-special',
          name: 'Nepal Special',
          amount: orderTotal * 0.01, // 1% off shipping
          description: '1% off shipping',
          type: 'percentage',
          isApplied: true
        });
      }

      // Order value discounts
      if (orderTotal > 100) {
        mockAutoDiscounts.push({
          id: 'bulk-order',
          name: 'Bulk Order Discount',
          amount: 10, // $10 off
          description: 'Orders over $100',
          type: 'fixed',
          isApplied: true
        });
      }

      setAutoDiscounts(mockAutoDiscounts);
      const totalAutoSavings = mockAutoDiscounts
        .filter(d => d.isApplied)
        .reduce((sum, d) => sum + d.amount, 0);
      setTotalSavings(totalAutoSavings);
    } catch (error) {
      console.error('Error checking auto discounts:', error);
    }
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) return;
    
    setIsApplying(true);
    setMessage(null);

    try {
      // Simulate promo code validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful application
      if (promoCode.toUpperCase() === 'SAVE10') {
        const discount = {
          id: 'promo-save10',
          name: 'SAVE10',
          amount: 10,
          description: '$10 off your order',
          type: 'fixed' as const,
          isApplied: true
        };
        
        setAppliedCode(promoCode);
        setTotalSavings(prev => prev + discount.amount);
        setMessage({ type: 'success', text: 'Promo code applied successfully!' });
        setShowPromoInput(false);
        onDiscountApplied?.(discount);
      } else {
        setMessage({ type: 'error', text: 'Invalid promo code. Try SAVE10 for $10 off.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to apply promo code. Please try again.' });
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemovePromoCode = () => {
    setAppliedCode(null);
    setPromoCode('');
    setMessage(null);
    setTotalSavings(prev => prev - 10); // Remove the $10 discount
  };

  return (
    <Card className={`border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 ${className}`}>
      <CardContent className="p-4">
        {/* Header with Sparkle Effect */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Smart Savings</h3>
          </div>
          {totalSavings > 0 && (
            <Badge className="bg-green-100 text-green-800 border-green-300 px-2 py-1">
              <span className="text-sm font-medium">-{formatAmount(totalSavings)} saved</span>
            </Badge>
          )}
        </div>

        {/* Auto-Applied Discounts */}
        {autoDiscounts.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Zap className="w-3 h-3 text-yellow-500" />
              <span>Auto-applied for you:</span>
            </div>
            {autoDiscounts.map((discount) => (
              <div key={discount.id} className="flex items-center justify-between bg-white/60 rounded-lg p-2 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span className="text-sm font-medium text-gray-800">{discount.name}</span>
                  <span className="text-xs text-gray-500">• {discount.description}</span>
                </div>
                <span className="text-sm font-semibold text-green-700">
                  -{formatAmount(discount.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Applied Promo Code */}
        {appliedCode && (
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
                <span className="text-sm font-semibold text-green-700">-$10.00</span>
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
                    className="flex-1 h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              <span className="text-lg font-bold text-green-700">{formatAmount(totalSavings)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};