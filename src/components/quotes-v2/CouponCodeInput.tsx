import React, { useState, useEffect } from 'react';
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
import { getDiscountService } from '@/services/unified/DiscountService';
import { toast } from '@/hooks/use-toast';

interface CouponCodeInputProps {
  customerId?: string;
  quoteTotal: number;
  countryCode?: string; // Add country code for validation
  componentBreakdown?: {
    shipping_cost?: number;
    customs_duty?: number;
    handling_fee?: number;
    local_tax?: number;
    insurance_amount?: number;
  }; // Add component breakdown for accurate discount calculation
  onDiscountApplied: (discount: {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    discountAmount: number;
    appliesTo: 'total' | 'shipping' | 'handling';
    discountCodeId?: string;
  }) => void;
  onDiscountRemoved: (code?: string) => void; // Updated to accept specific code
  currentCode?: string;
  appliedCodes?: string[]; // New prop to show multiple applied codes
  disabled?: boolean;
}

export const CouponCodeInput: React.FC<CouponCodeInputProps> = ({
  customerId,
  quoteTotal,
  countryCode,
  componentBreakdown,
  onDiscountApplied,
  onDiscountRemoved,
  currentCode,
  appliedCodes = [],
  disabled = false,
}) => {
  const [code, setCode] = useState(currentCode || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validatedDiscount, setValidatedDiscount] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Effect to set code when appliedCodes are provided (on page reload)
  useEffect(() => {
    if (appliedCodes.length > 0 && !validatedDiscount && !code) {
      // Just set the code, don't set validatedDiscount
      // This shows the applied codes without trying to render discount details
      setCode(appliedCodes[0]);
    }
  }, [appliedCodes]);

  const validateAndApplyCoupon = async () => {
    if (!code.trim()) {
      setError('Please enter a coupon code');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const validation = await getDiscountService().validateDiscountCode(
        code.trim(), 
        customerId, 
        countryCode, 
        quoteTotal
      );

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

      // Determine what the discount applies to first
      let appliesTo: 'total' | 'shipping' | 'handling' = 'total';
      if (Array.isArray(discountType.conditions?.applicable_to)) {
        // If it's an array, check if it contains component-specific discounts
        const applicableComponents = discountType.conditions.applicable_to;
        if (applicableComponents.includes('shipping') && applicableComponents.length === 1) {
          appliesTo = 'shipping';
        } else if (applicableComponents.includes('handling') && applicableComponents.length === 1) {
          appliesTo = 'handling';
        }
        // If multiple components or includes other components, treat as 'total'
      } else if (typeof discountType.conditions?.applicable_to === 'string') {
        appliesTo = discountType.conditions.applicable_to as any;
      }

      // Calculate discount amount based on the actual component value
      let discountAmount = 0;
      let componentValue = quoteTotal; // Default to total if no breakdown or not component-specific
      
      // Use component-specific amounts if available and discount is component-specific
      if (componentBreakdown && appliesTo !== 'total') {
        switch (appliesTo) {
          case 'shipping':
            componentValue = componentBreakdown.shipping_cost || 0;
            break;
          case 'handling':
            componentValue = componentBreakdown.handling_fee || 0;
            break;
          default:
            componentValue = quoteTotal;
        }
      }
      
      if (discountType.type === 'percentage') {
        discountAmount = (componentValue * discountType.value) / 100;
        // Apply max discount cap if exists
        if (discountType.conditions?.max_discount) {
          discountAmount = Math.min(discountAmount, discountType.conditions.max_discount);
        }
      } else if (discountType.type === 'fixed_amount') {
        discountAmount = Math.min(discountType.value, componentValue);
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
        appliesTo: appliesTo,
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
  
  const removeSpecificCoupon = (codeToRemove: string) => {
    onDiscountRemoved(codeToRemove);
    
    // If this was the current code in the input, clear it
    if (code === codeToRemove) {
      setCode('');
      setValidatedDiscount(null);
    }
    
    toast({
      title: "Coupon Removed",
      description: `${codeToRemove} has been removed from your quote.`,
    });
  };

  const getDiscountDescription = (discountType: any, amount: number) => {
    if (!discountType) return '';
    
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
      
      {/* Show all applied codes when reloaded */}
      {!validatedDiscount && appliedCodes.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-muted-foreground">Applied discount codes:</p>
          <div className="flex flex-wrap gap-2">
            {appliedCodes.map((appliedCode) => (
              <Badge 
                key={appliedCode} 
                variant="secondary" 
                className="flex items-center gap-1 pr-1"
              >
                <Tag className="w-3 h-3" />
                {appliedCode}
                <button
                  onClick={() => removeSpecificCoupon(appliedCode)}
                  className="ml-1 rounded-full hover:bg-gray-300 p-0.5 transition-colors"
                  disabled={disabled}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};