import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Tag, 
  Check, 
  X, 
  Loader2,
  Percent,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { DiscountService } from '@/services/DiscountService';
import { toast } from '@/hooks/use-toast';

interface CouponCodeInputProps {
  customerId?: string;
  quoteTotal: number;
  onDiscountApplied: (discount: {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    discountAmount: number;
    appliesTo: 'total' | 'shipping' | 'handling';
    discountCodeId?: string;
  }) => void;
  onDiscountRemoved: () => void;
  currentCode?: string;
  disabled?: boolean;
}

export const CouponCodeInput: React.FC<CouponCodeInputProps> = ({
  customerId,
  quoteTotal,
  onDiscountApplied,
  onDiscountRemoved,
  currentCode,
  disabled = false,
}) => {
  const [code, setCode] = useState(currentCode || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validatedDiscount, setValidatedDiscount] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const validateAndApplyCoupon = async () => {
    if (!code.trim()) {
      setError('Please enter a coupon code');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const discountService = DiscountService.getInstance();
      const validation = await discountService.validateDiscountCode(code.trim(), customerId);

      if (!validation.valid) {
        setError(validation.error || 'Invalid coupon code');
        setValidatedDiscount(null);
        return;
      }

      const discount = validation.discount!;
      const discountType = discount.discount_type!;

      // Check minimum order requirements
      if (discountType.conditions?.min_order && quoteTotal < discountType.conditions.min_order) {
        setError(`Minimum order value of $${discountType.conditions.min_order} required`);
        return;
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (discountType.type === 'percentage') {
        discountAmount = (quoteTotal * discountType.value) / 100;
        // Apply max discount cap if exists
        if (discountType.conditions?.max_discount) {
          discountAmount = Math.min(discountAmount, discountType.conditions.max_discount);
        }
      } else if (discountType.type === 'fixed_amount') {
        discountAmount = Math.min(discountType.value, quoteTotal);
      }

      // Set validated discount
      setValidatedDiscount({
        ...discount,
        calculatedAmount: discountAmount
      });

      // Notify parent component
      onDiscountApplied({
        code: discount.code,
        type: discountType.type === 'percentage' ? 'percentage' : 'fixed',
        value: discountType.value,
        discountAmount: discountAmount,
        appliesTo: (discountType.conditions?.applicable_to || 'total') as any,
        discountCodeId: discount.id,
      });

      toast({
        title: "Coupon Applied!",
        description: `${discount.code} - ${getDiscountDescription(discountType, discountAmount)}`,
      });

    } catch (error) {
      console.error('Error validating coupon:', error);
      setError('Error validating coupon code');
    } finally {
      setIsValidating(false);
    }
  };

  const removeCoupon = () => {
    setCode('');
    setValidatedDiscount(null);
    setError(null);
    onDiscountRemoved();
    
    toast({
      title: "Coupon Removed",
      description: "The discount has been removed from your quote.",
    });
  };

  const getDiscountDescription = (discountType: any, amount: number) => {
    if (discountType.type === 'percentage') {
      let desc = `${discountType.value}% off`;
      if (discountType.conditions?.max_discount) {
        desc += ` (max $${discountType.conditions.max_discount})`;
      }
      desc += ` - Save $${amount.toFixed(2)}`;
      return desc;
    } else {
      return `$${discountType.value} off - Save $${amount.toFixed(2)}`;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isValidating && !validatedDiscount) {
      validateAndApplyCoupon();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            placeholder="Enter coupon code"
            className="pl-10"
            disabled={disabled || isValidating || !!validatedDiscount}
          />
        </div>
        
        {!validatedDiscount ? (
          <Button
            onClick={validateAndApplyCoupon}
            disabled={disabled || isValidating || !code.trim()}
            variant="outline"
          >
            {isValidating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Validating
              </>
            ) : (
              'Apply'
            )}
          </Button>
        ) : (
          <Button
            onClick={removeCoupon}
            variant="outline"
            className="text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {validatedDiscount && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">
                  {validatedDiscount.code}
                </p>
                <p className="text-sm text-green-700">
                  {getDiscountDescription(validatedDiscount.discount_type, validatedDiscount.calculatedAmount)}
                </p>
              </div>
            </div>
            {validatedDiscount.discount_type.type === 'percentage' ? (
              <Badge variant="outline" className="text-green-700 border-green-300">
                <Percent className="w-3 h-3 mr-1" />
                {validatedDiscount.discount_type.value}%
              </Badge>
            ) : (
              <Badge variant="outline" className="text-green-700 border-green-300">
                <DollarSign className="w-3 h-3 mr-1" />
                {validatedDiscount.discount_type.value}
              </Badge>
            )}
          </div>
          
          {validatedDiscount.campaign && (
            <p className="text-xs text-green-600 mt-2">
              Campaign: {validatedDiscount.campaign.name}
            </p>
          )}
        </div>
      )}

      {/* Show available conditions */}
      {!validatedDiscount && !error && quoteTotal > 0 && (
        <p className="text-xs text-gray-500">
          Quote total: ${quoteTotal.toFixed(2)}
        </p>
      )}
    </div>
  );
};