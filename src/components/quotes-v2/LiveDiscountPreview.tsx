import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Tag, 
  Check, 
  X, 
  Loader2,
  Percent,
  DollarSign,
  AlertCircle,
  Sparkles,
  Calculator,
  TrendingUp,
  HelpCircle
} from 'lucide-react';
import { DiscountService } from '@/services/DiscountService';
import { DiscountErrorService, DiscountError } from '@/services/DiscountErrorService';
import { EnhancedDiscountError } from './EnhancedDiscountError';
import { DiscountExplanation } from './DiscountExplanation';
import { debounce } from 'lodash';

interface LiveDiscountPreviewProps {
  customerId?: string;
  quoteTotal: number;
  countryCode?: string;
  componentBreakdown?: {
    shipping_cost?: number;
    customs_duty?: number;
    handling_fee?: number;
    local_tax?: number;
    insurance_amount?: number;
  };
  onDiscountApplied: (discount: {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    discountAmount: number;
    appliesTo: 'total' | 'shipping' | 'handling';
    discountCodeId?: string;
  }) => void;
  onDiscountRemoved: () => void;
  disabled?: boolean;
}

interface DiscountPreview {
  valid: boolean;
  code: string;
  discountType?: any;
  calculatedAmount?: number;
  appliesTo?: string;
  error?: string;
  enhancedError?: DiscountError;
  isPreview?: boolean;
}

export const LiveDiscountPreview: React.FC<LiveDiscountPreviewProps> = ({
  customerId,
  quoteTotal,
  countryCode,
  componentBreakdown,
  onDiscountApplied,
  onDiscountRemoved,
  disabled = false,
}) => {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [preview, setPreview] = useState<DiscountPreview | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Debounced validation function
  const debouncedValidation = useCallback(
    debounce(async (codeToValidate: string) => {
      if (!codeToValidate.trim() || codeToValidate.length < 3) {
        setPreview(null);
        setShowPreview(false);
        return;
      }

      setIsValidating(true);
      try {
        const validation = await DiscountService.getInstance().validateDiscountCode(
          codeToValidate.trim(),
          customerId,
          countryCode,
          quoteTotal
        );

        if (validation.valid && validation.discount) {
          const discount = validation.discount;
          const discountType = discount.discount_type!;

          // Determine what the discount applies to
          let appliesTo: 'total' | 'shipping' | 'handling' = 'total';
          if (Array.isArray(discountType.conditions?.applicable_to)) {
            const applicableComponents = discountType.conditions.applicable_to;
            if (applicableComponents.includes('shipping') && applicableComponents.length === 1) {
              appliesTo = 'shipping';
            } else if (applicableComponents.includes('handling') && applicableComponents.length === 1) {
              appliesTo = 'handling';
            }
          } else if (typeof discountType.conditions?.applicable_to === 'string') {
            appliesTo = discountType.conditions.applicable_to as any;
          }

          // Calculate discount amount
          let componentValue = quoteTotal;
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

          let discountAmount = 0;
          if (discountType.type === 'percentage') {
            discountAmount = (componentValue * discountType.value) / 100;
            if (discountType.conditions?.max_discount) {
              discountAmount = Math.min(discountAmount, discountType.conditions.max_discount);
            }
          } else if (discountType.type === 'fixed_amount') {
            discountAmount = Math.min(discountType.value, componentValue);
          }

          setPreview({
            valid: true,
            code: codeToValidate,
            discountType,
            calculatedAmount: discountAmount,
            appliesTo,
            isPreview: true
          });
          setShowPreview(true);
        } else {
          setPreview({
            valid: false,
            code: codeToValidate,
            error: validation.error || 'Invalid coupon code',
            enhancedError: validation.enhancedError,
            isPreview: true
          });
          setShowPreview(true);
        }
      } catch (error) {
        console.error('Error validating coupon:', error);
        const enhancedError = DiscountErrorService.getEnhancedError('NETWORK_ERROR', codeToValidate);
        setPreview({
          valid: false,
          code: codeToValidate,
          error: 'Error validating coupon code',
          enhancedError,
          isPreview: true
        });
        setShowPreview(true);
      } finally {
        setIsValidating(false);
      }
    }, 500),
    [customerId, countryCode, quoteTotal, componentBreakdown]
  );

  // Effect to trigger validation when code changes
  useEffect(() => {
    if (code && !appliedDiscount) {
      debouncedValidation(code);
    } else {
      setPreview(null);
      setShowPreview(false);
    }
  }, [code, debouncedValidation, appliedDiscount]);

  const applyDiscount = () => {
    if (!preview || !preview.valid || !preview.discountType) return;

    setAppliedDiscount(preview);
    setShowPreview(false);

    onDiscountApplied({
      code: preview.code,
      type: preview.discountType.type === 'percentage' ? 'percentage' : 'fixed',
      value: preview.discountType.value,
      discountAmount: preview.calculatedAmount || 0,
      appliesTo: preview.appliesTo as any,
      discountCodeId: preview.discountType.id,
    });
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setCode('');
    setPreview(null);
    setShowPreview(false);
    onDiscountRemoved();
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
    if (e.key === 'Enter' && preview?.valid) {
      applyDiscount();
    }
  };

  const convertToExplanationData = (discountType: any, code: string) => {
    if (!discountType) return null;
    
    return {
      code,
      name: discountType.name || code,
      type: discountType.type === 'percentage' ? 'percentage' as const : 
            discountType.type === 'fixed_amount' ? 'fixed_amount' as const :
            discountType.conditions?.applicable_to?.includes('shipping') ? 'shipping' as const : 'percentage' as const,
      value: discountType.value,
      appliesTo: Array.isArray(discountType.conditions?.applicable_to) 
        ? discountType.conditions.applicable_to.join(', ')
        : discountType.conditions?.applicable_to || 'total',
      minOrder: discountType.conditions?.min_order,
      maxDiscount: discountType.conditions?.max_discount,
      usageLimit: discountType.conditions?.usage_limit,
      usagePerCustomer: discountType.conditions?.usage_per_customer,
      validFrom: discountType.conditions?.valid_from,
      validUntil: discountType.conditions?.valid_until,
      countries: discountType.conditions?.countries,
      conditions: discountType.conditions
    };
  };

  return (
    <div className="space-y-3">
      {/* Input Section */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            placeholder="Enter coupon code for live preview..."
            className="pl-10"
            disabled={disabled || !!appliedDiscount}
          />
          {isValidating && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            </div>
          )}
        </div>
        
        {appliedDiscount ? (
          <Button
            onClick={removeDiscount}
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="w-4 h-4 mr-1" />
            Remove
          </Button>
        ) : preview?.valid ? (
          <Button
            onClick={applyDiscount}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="w-4 h-4 mr-1" />
            Apply
          </Button>
        ) : (
          <Button
            disabled
            variant="outline"
            className="opacity-50"
          >
            <Calculator className="w-4 h-4 mr-1" />
            Preview
          </Button>
        )}
      </div>

      {/* Live Preview */}
      {showPreview && preview && !appliedDiscount && (
        <Card className={`transition-all duration-300 ${preview.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardContent className="p-3">
            {preview.valid ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-900">
                      {preview.code} - Valid!
                    </span>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    {preview.discountType?.type === 'percentage' ? (
                      <>
                        <Percent className="w-3 h-3 mr-1" />
                        {preview.discountType.value}%
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-3 h-3 mr-1" />
                        {preview.discountType?.value}
                      </>
                    )}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-sm text-green-700">
                    {getDiscountDescription(preview.discountType, preview.calculatedAmount || 0)}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-green-800">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-sm font-medium">
                        Applies to {preview.appliesTo}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowExplanation(!showExplanation)}
                      className="text-xs text-green-700 hover:text-green-800 hover:bg-green-100 p-1 h-auto"
                    >
                      <HelpCircle className="w-3 h-3 mr-1" />
                      Learn More
                    </Button>
                  </div>
                </div>

                {preview.discountType?.conditions?.min_order && (
                  <p className="text-xs text-green-600">
                    Minimum order: ${preview.discountType.conditions.min_order}
                  </p>
                )}

                {/* Show detailed discount explanation when requested */}
                {showExplanation && preview.discountType && (
                  <div className="mt-3 border-t border-green-200 pt-3">
                    <DiscountExplanation 
                      discountData={convertToExplanationData(preview.discountType, preview.code)!}
                      compact={true}
                      className="border-0 bg-transparent p-0"
                    />
                  </div>
                )}
              </div>
            ) : (
              preview.enhancedError ? (
                <EnhancedDiscountError
                  error={preview.enhancedError}
                  onRetry={() => {
                    setPreview(null);
                    setShowPreview(false);
                    // Re-trigger validation after a short delay
                    setTimeout(() => {
                      if (code) debouncedValidation(code);
                    }, 100);
                  }}
                  onBrowseOffers={() => {
                    // Could open a modal or navigate to offers page
                    console.log('Browse offers clicked');
                  }}
                  onContactSupport={() => {
                    // Could open support chat or email
                    console.log('Contact support clicked');
                  }}
                  onContinueShopping={() => {
                    // Could close the discount section and focus on items
                    console.log('Continue shopping clicked');
                  }}
                  onSubscribe={() => {
                    // Could open newsletter signup
                    console.log('Subscribe clicked');
                  }}
                  contextualSuggestions={DiscountErrorService.getContextualSuggestions({
                    orderTotal: quoteTotal,
                    country: 'IN', // We could pass this as a prop
                    hasAccount: !!customerId,
                    isFirstOrder: false // We could determine this
                  })}
                  className="p-0"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-red-800 text-sm">
                    {preview.error}
                  </span>
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* Applied Discount Display */}
      {appliedDiscount && appliedDiscount.valid && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">
                  {appliedDiscount.code} Applied!
                </p>
                <p className="text-sm text-green-700">
                  {getDiscountDescription(appliedDiscount.discountType, appliedDiscount.calculatedAmount || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-700 border-green-300">
                {appliedDiscount.discountType?.type === 'percentage' ? (
                  <>
                    <Percent className="w-3 h-3 mr-1" />
                    {appliedDiscount.discountType.value}%
                  </>
                ) : (
                  <>
                    <DollarSign className="w-3 h-3 mr-1" />
                    {appliedDiscount.discountType?.value}
                  </>
                )}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExplanation(!showExplanation)}
                className="text-xs text-green-700 hover:text-green-800 hover:bg-green-100 p-1 h-auto"
              >
                <HelpCircle className="w-3 h-3 mr-1" />
                Details
              </Button>
            </div>
          </div>
          
          {appliedDiscount.discountType?.name && appliedDiscount.discountType.name !== appliedDiscount.code && (
            <p className="text-xs text-green-600 mt-2">
              Campaign: {appliedDiscount.discountType.name}
            </p>
          )}

          {/* Show detailed discount explanation for applied discount */}
          {showExplanation && appliedDiscount.discountType && (
            <div className="mt-3 border-t border-green-200 pt-3">
              <DiscountExplanation 
                discountData={convertToExplanationData(appliedDiscount.discountType, appliedDiscount.code)!}
                compact={true}
                className="border-0 bg-transparent p-0"
              />
            </div>
          )}
        </div>
      )}

      {/* Quote Total Display */}
      {!appliedDiscount && (
        <div className="text-xs text-gray-500 flex items-center justify-between">
          <span>Quote total: ${quoteTotal.toFixed(2)}</span>
          {code.length > 0 && code.length < 3 && (
            <span className="text-blue-500">Keep typing for live preview...</span>
          )}
        </div>
      )}
    </div>
  );
};