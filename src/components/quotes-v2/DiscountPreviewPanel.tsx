import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  Gift, 
  Sparkles, 
  Calculator,
  ArrowRight,
  CheckCircle,
  Info,
  Percent,
  DollarSign
} from 'lucide-react';
import { DiscountService } from '@/services/DiscountService';

interface DiscountPreviewPanelProps {
  orderTotal: number;
  countryCode: string;
  customerId?: string;
  itemCount?: number;
  componentBreakdown?: {
    shipping_cost?: number;
    customs_duty?: number;
    handling_fee?: number;
    local_tax?: number;
    insurance_amount?: number;
  };
  appliedCodes?: string[];
  onCodeSelect?: (code: string) => void;
}

interface AutomaticDiscount {
  source: string;
  description: string;
  value: number;
  type: 'percentage' | 'fixed';
  applies_to: string;
  savings: number;
}

interface AvailableCode {
  code: string;
  description: string;
  discount_value: number;
  potential_savings: number;
  min_order?: number;
}

export const DiscountPreviewPanel: React.FC<DiscountPreviewPanelProps> = ({
  orderTotal,
  countryCode,
  customerId,
  itemCount = 1,
  componentBreakdown,
  appliedCodes = [],
  onCodeSelect
}) => {
  const [automaticDiscounts, setAutomaticDiscounts] = useState<AutomaticDiscount[]>([]);
  const [availableCodes, setAvailableCodes] = useState<AvailableCode[]>([]);
  const [totalPotentialSavings, setTotalPotentialSavings] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderTotal > 0 && countryCode) {
      loadDiscountPreviews();
    }
  }, [orderTotal, countryCode, customerId]);

  const loadDiscountPreviews = async () => {
    setLoading(true);
    try {
      // 1. Get automatic country-specific discounts
      const countryDiscounts = await DiscountService.getInstance().getAutomaticCountryBenefits(
        countryCode, 
        orderTotal
      );

      // 2. Get volume discounts
      const volumeDiscounts = await DiscountService.getInstance().getVolumeDiscounts(
        orderTotal, 
        itemCount
      );

      // 3. Get available code-based discounts
      const codeBasedDiscounts = await DiscountService.getInstance().getEligibleCodeBasedDiscounts(
        countryCode, 
        orderTotal
      );

      // Process automatic discounts
      const autoDiscountsList: AutomaticDiscount[] = [];
      
      // Add country discounts
      countryDiscounts.forEach(discount => {
        const componentValue = getComponentValue(discount.applies_to, componentBreakdown, orderTotal);
        const savings = calculateSavings(discount.discount_value, discount.discount_type, componentValue);
        
        autoDiscountsList.push({
          source: 'Country Benefits',
          description: `${countryCode} customers get ${discount.discount_value}% off ${discount.applies_to}`,
          value: discount.discount_value,
          type: discount.discount_type,
          applies_to: discount.applies_to,
          savings: savings
        });
      });

      // Add volume discounts
      volumeDiscounts.forEach(discount => {
        const componentValue = getComponentValue(discount.applies_to, componentBreakdown, orderTotal);
        const savings = calculateSavings(discount.discount_value, discount.discount_type, componentValue);
        
        autoDiscountsList.push({
          source: 'Volume Discount',
          description: `${discount.discount_value}% off ${discount.applies_to} for orders over $${getVolumeThreshold(orderTotal)}`,
          value: discount.discount_value,
          type: discount.discount_type,
          applies_to: discount.applies_to,
          savings: savings
        });
      });

      // Process available codes
      const availableCodesList: AvailableCode[] = codeBasedDiscounts.available_codes.map((code, index) => ({
        code,
        description: codeBasedDiscounts.discount_descriptions[index] || `Use code ${code} for additional savings`,
        discount_value: 10, // Default estimate - would need to fetch actual value
        potential_savings: orderTotal * 0.1, // Estimate 10% savings
        min_order: undefined
      }));

      setAutomaticDiscounts(autoDiscountsList);
      setAvailableCodes(availableCodesList);
      
      // Calculate total potential savings
      const autoSavings = autoDiscountsList.reduce((sum, d) => sum + d.savings, 0);
      const codeSavings = availableCodesList.reduce((sum, c) => sum + c.potential_savings, 0);
      setTotalPotentialSavings(autoSavings + codeSavings);

    } catch (error) {
      console.error('Error loading discount previews:', error);
    } finally {
      setLoading(false);
    }
  };

  const getComponentValue = (appliesTo: string, breakdown: any, total: number): number => {
    if (!breakdown) return total;
    
    switch (appliesTo) {
      case 'shipping': return breakdown.shipping_cost || 0;
      case 'customs': return breakdown.customs_duty || 0;
      case 'handling': return breakdown.handling_fee || 0;
      case 'taxes': return breakdown.local_tax || 0;
      case 'insurance': return breakdown.insurance_amount || 0;
      default: return total;
    }
  };

  const calculateSavings = (value: number, type: 'percentage' | 'fixed', componentValue: number): number => {
    if (type === 'percentage') {
      return (componentValue * value) / 100;
    }
    return Math.min(value, componentValue);
  };

  const getVolumeThreshold = (total: number): number => {
    if (total >= 1000) return 1000;
    if (total >= 500) return 500;
    return 100;
  };

  const handleCodeClick = (code: string) => {
    if (onCodeSelect) {
      onCodeSelect(code);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Loading Discount Previews...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (automaticDiscounts.length === 0 && availableCodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Discount Opportunities
          </CardTitle>
          <CardDescription>
            No special discounts available for this order configuration.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Sparkles className="h-5 w-5" />
          Available Savings
        </CardTitle>
        <CardDescription className="text-blue-700">
          {totalPotentialSavings > 0 && (
            <>
              You could save up to <span className="font-semibold">${totalPotentialSavings.toFixed(2)}</span> on this order
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Automatic Discounts */}
        {automaticDiscounts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-green-900 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Automatically Applied
            </h4>
            <div className="space-y-2">
              {automaticDiscounts.map((discount, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex-1">
                    <p className="font-medium text-green-900 text-sm">
                      {discount.source}
                    </p>
                    <p className="text-green-700 text-xs">
                      {discount.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      {discount.type === 'percentage' ? (
                        <>
                          <Percent className="w-3 h-3 mr-1" />
                          {discount.value}%
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-3 h-3 mr-1" />
                          {discount.value}
                        </>
                      )}
                    </Badge>
                    <span className="text-green-800 font-medium text-sm">
                      -${discount.savings.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Discount Codes */}
        {availableCodes.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-blue-900 flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Available Coupon Codes
            </h4>
            <div className="space-y-2">
              {availableCodes.map((codeOffer, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex-1">
                    <p className="font-medium text-blue-900 text-sm">
                      {codeOffer.code}
                    </p>
                    <p className="text-blue-700 text-xs">
                      {codeOffer.description}
                    </p>
                    {codeOffer.min_order && (
                      <p className="text-blue-600 text-xs">
                        Minimum order: ${codeOffer.min_order}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-800 font-medium text-sm">
                      Save ~${codeOffer.potential_savings.toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCodeClick(codeOffer.code)}
                      disabled={appliedCodes.includes(codeOffer.code)}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      {appliedCodes.includes(codeOffer.code) ? 'Applied' : 'Apply'}
                      {!appliedCodes.includes(codeOffer.code) && (
                        <ArrowRight className="w-3 h-3 ml-1" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Savings Summary */}
        {totalPotentialSavings > 0 && (
          <Alert className="border-green-200 bg-green-50">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Total Savings Opportunity:</strong> ${totalPotentialSavings.toFixed(2)} 
              ({((totalPotentialSavings / orderTotal) * 100).toFixed(1)}% off your order)
            </AlertDescription>
          </Alert>
        )}

        {/* Tips */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            <strong>Pro tip:</strong> Discounts are automatically applied based on your destination and order size. 
            Additional coupon codes can provide extra savings on top of automatic discounts.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};