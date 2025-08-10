import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DiscountService, type ApplicableDiscount } from '@/services/DiscountService';
import { MembershipService } from '@/services/MembershipService';
import { currencyService } from '@/services/CurrencyService';
import { formatAmountWithFinancialPrecision } from '@/utils/quoteCurrencyUtils';
import { Tag, Percent, CreditCard, Crown, AlertCircle, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface DiscountDisplayProps {
  quoteId?: string;
  customerId?: string;
  subtotal: number;
  handlingFee: number;
  paymentMethod?: string;
  countryCode?: string;
  currency?: string;
  onDiscountChange?: (discounts: ApplicableDiscount[], totalDiscount: number) => void;
  className?: string;
}

export function DiscountDisplay({
  quoteId,
  customerId,
  subtotal,
  handlingFee,
  paymentMethod,
  countryCode,
  currency = 'USD',
  onDiscountChange,
  className
}: DiscountDisplayProps) {
  const [discounts, setDiscounts] = useState<ApplicableDiscount[]>([]);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [savingsPercentage, setSavingsPercentage] = useState(0);
  const [discountCode, setDiscountCode] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  const [appliedCodes, setAppliedCodes] = useState<string[]>([]);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [hasMembership, setHasMembership] = useState(false);

  useEffect(() => {
    if (customerId) {
      calculateDiscounts();
      checkMembership();
    }
  }, [customerId, subtotal, handlingFee, paymentMethod, countryCode]);

  const checkMembership = async () => {
    if (!customerId) return;
    
    const status = await MembershipService.checkMembershipStatus(customerId);
    setHasMembership(status.has_membership);
  };

  const calculateDiscounts = async () => {
    if (!customerId || subtotal <= 0) return;

    try {
      const result = await DiscountService.getInstance().calculateDiscounts(
        customerId,
        subtotal,
        handlingFee,
        paymentMethod,
        countryCode,
        appliedCodes
      );

      setDiscounts(result.discounts);
      setTotalDiscount(result.total_discount);
      setSavingsPercentage(result.savings_percentage);

      if (onDiscountChange) {
        onDiscountChange(result.discounts, result.total_discount);
      }
    } catch (error) {
      console.error('Error calculating discounts:', error);
    }
  };

  const handleApplyCode = async () => {
    if (!discountCode.trim()) return;

    setValidatingCode(true);
    try {
      const validation = await DiscountService.getInstance().validateDiscountCode(discountCode.trim(), customerId);
      
      if (validation.valid) {
        setAppliedCodes([...appliedCodes, discountCode.trim().toUpperCase()]);
        setDiscountCode('');
        toast.success('Discount code applied successfully');
        calculateDiscounts();
      } else {
        toast.error(validation.error || 'Invalid discount code');
      }
    } catch (error) {
      console.error('Error applying discount code:', error);
      toast.error('Failed to apply discount code');
    } finally {
      setValidatingCode(false);
    }
  };

  const removeDiscountCode = (code: string) => {
    setAppliedCodes(appliedCodes.filter(c => c !== code));
    calculateDiscounts();
  };

  const getDiscountIcon = (source: string) => {
    switch (source) {
      case 'membership':
        return <Crown className="h-4 w-4" />;
      case 'payment_method':
        return <CreditCard className="h-4 w-4" />;
      case 'campaign':
        return <Tag className="h-4 w-4" />;
      case 'code':
        return <Tag className="h-4 w-4" />;
      default:
        return <Percent className="h-4 w-4" />;
    }
  };

  const formatDiscount = (discount: ApplicableDiscount) => {
    if (discount.discount_type === 'percentage') {
      return `${discount.discount_value}% off`;
    } else {
      return formatAmountWithFinancialPrecision(discount.discount_value, currency);
    }
  };

  if (!customerId) {
    return null;
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Discounts & Offers</CardTitle>
            {totalDiscount > 0 && (
              <Badge variant="success" className="text-sm">
                Save {formatAmountWithFinancialPrecision(totalDiscount, currency)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active Discounts */}
          {discounts.length > 0 && (
            <div className="space-y-2">
              {discounts.map((discount, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {getDiscountIcon(discount.discount_source)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{discount.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDiscount(discount)} • Saves {formatAmountWithFinancialPrecision(discount.discount_amount, currency)}
                      </p>
                    </div>
                  </div>
                  {discount.discount_source === 'code' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDiscountCode(discount.description?.split(': ')[1] || '')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              {savingsPercentage > 0 && (
                <p className="text-sm text-center text-muted-foreground pt-2">
                  Total savings: {savingsPercentage.toFixed(1)}% off your order
                </p>
              )}
            </div>
          )}

          {/* Promo Code Input */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Enter promo code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleApplyCode()}
                className="uppercase"
              />
              <Button 
                onClick={handleApplyCode} 
                disabled={validatingCode || !discountCode.trim()}
                variant="outline"
              >
                {validatingCode ? 'Validating...' : 'Apply'}
              </Button>
            </div>
          </div>

          {/* Membership Upsell */}
          {!hasMembership && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Become a Plus member</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Get 2% additional discount on all orders + FREE warehouse storage
                  </p>
                </div>
                <Button size="sm" variant="outline" className="text-xs">
                  Learn More
                </Button>
              </div>
            </div>
          )}

          {/* Payment Method Discount Hint */}
          {paymentMethod !== 'bank_transfer' && paymentMethod !== 'wire_transfer' && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Save 2% more by choosing bank transfer as payment method
              </p>
            </div>
          )}

          {/* View Details */}
          {discounts.length > 0 && (
            <Button
              variant="link"
              size="sm"
              className="w-full"
              onClick={() => setShowDetailsDialog(true)}
            >
              View discount details
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Discount Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discount Breakdown</DialogTitle>
            <DialogDescription>
              How your discounts are calculated
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {discounts.map((discount, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getDiscountIcon(discount.discount_source)}
                      <span className="font-medium">{discount.description}</span>
                    </div>
                    <Badge variant="outline">{formatDiscount(discount)}</Badge>
                  </div>
                  <div className="pl-6 space-y-1 text-sm text-muted-foreground">
                    <p>Applied to: {discount.applies_to === 'total' ? 'Order total' : 'Handling fee only'}</p>
                    <p>Discount amount: {formatAmountWithFinancialPrecision(discount.discount_amount, currency)}</p>
                    {discount.is_stackable && <p className="text-green-600">✓ Can be combined with other discounts</p>}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Discount</span>
                <span className="font-semibold text-green-600">
                  -{formatAmountWithFinancialPrecision(totalDiscount, currency)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                You're saving {savingsPercentage.toFixed(1)}% on this order
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Compact version for checkout summary
export function DiscountSummary({
  discounts,
  totalDiscount,
  currency = 'USD',
  className
}: {
  discounts: ApplicableDiscount[];
  totalDiscount: number;
  currency?: string;
  className?: string;
}) {
  if (discounts.length === 0) return null;

  return (
    <div className={className}>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Discounts Applied</p>
        {discounts.map((discount, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{discount.description}</span>
            <span className="text-green-600">
              -{formatAmountWithFinancialPrecision(discount.discount_amount, currency)}
            </span>
          </div>
        ))}
        <div className="flex justify-between font-medium pt-2 border-t">
          <span>Total Savings</span>
          <span className="text-green-600">
            -{formatAmountWithFinancialPrecision(totalDiscount, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}