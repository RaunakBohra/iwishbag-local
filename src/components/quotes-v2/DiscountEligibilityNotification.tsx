import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Gift,
  Tag,
  TrendingUp,
  Clock,
  Target,
  Sparkles,
  ArrowRight,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { discountEligibilityService, type DiscountEligibilityResult, type CustomerContext } from '@/services/DiscountEligibilityService';

interface DiscountEligibilityNotificationProps {
  customerContext: CustomerContext;
  onCodeApply?: (code: string) => void;
  className?: string;
}

export const DiscountEligibilityNotification: React.FC<DiscountEligibilityNotificationProps> = ({
  customerContext,
  onCodeApply,
  className = ''
}) => {
  const [eligibility, setEligibility] = useState<DiscountEligibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    checkEligibility();
  }, [customerContext.order_total, customerContext.country, customerContext.applied_codes]);

  const checkEligibility = async () => {
    try {
      setLoading(true);
      const result = await discountEligibilityService.getDiscountEligibility(customerContext);
      setEligibility(result);
    } catch (error) {
      console.error('Error checking discount eligibility:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !eligibility || dismissed || !eligibility.is_eligible) {
    return null;
  }

  const hasAutomaticBenefits = eligibility.automatic_benefits.length > 0;
  const hasAvailableCodes = eligibility.available_codes.length > 0;
  const hasSavings = eligibility.total_potential_savings > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Notification */}
      <Alert className="border-blue-200 bg-blue-50 relative">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-2 flex-1">
            <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <AlertDescription className="text-blue-800">
                <div className="font-semibold mb-1">
                  {hasAutomaticBenefits && hasAvailableCodes
                    ? "🎉 You have automatic benefits and more savings available!"
                    : hasAutomaticBenefits
                    ? "🎁 Automatic benefits applied to your order!"
                    : "💡 Additional discounts available for your order!"
                  }
                </div>
                
                {/* Quick Summary */}
                <div className="text-sm space-y-1">
                  {hasSavings && (
                    <div className="font-medium text-blue-900">
                      💰 Potential savings: ${eligibility.total_potential_savings.toFixed(2)}
                    </div>
                  )}
                  
                  {eligibility.eligibility_messages.slice(0, 2).map((message, index) => (
                    <div key={index} className="text-blue-700">
                      {message}
                    </div>
                  ))}
                  
                  {eligibility.eligibility_messages.length > 2 && !expanded && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded(true)}
                      className="p-0 h-auto text-blue-600 hover:text-blue-800"
                    >
                      <ChevronDown className="w-4 h-4 mr-1" />
                      Show more details
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="p-1 h-auto text-blue-400 hover:text-blue-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Alert>

      {/* Expanded Details */}
      {expanded && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center">
                <Gift className="w-5 h-5 mr-2 text-blue-600" />
                Your Discount Opportunities
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(false)}
                className="p-1"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Automatic Benefits */}
            {hasAutomaticBenefits && (
              <div>
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                  <Gift className="w-4 h-4 mr-1" />
                  Active Benefits
                </h4>
                <div className="space-y-2">
                  {eligibility.automatic_benefits.map((benefit, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-blue-50 rounded border border-blue-200">
                      <span className="text-blue-700 text-sm">
                        🎁 {benefit.description}
                      </span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {benefit.discount_value}% off
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Discount Codes */}
            {hasAvailableCodes && (
              <div>
                <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                  <Tag className="w-4 h-4 mr-1" />
                  Available Discount Codes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {eligibility.available_codes.slice(0, 4).map((code, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                      <span className="text-green-700 font-mono text-sm">{code}</span>
                      {onCodeApply && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCodeApply(code)}
                          className="ml-2 h-6 px-2 text-xs border-green-300 text-green-700 hover:bg-green-100"
                        >
                          Apply
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {eligibility.available_codes.length > 4 && (
                    <div className="col-span-full text-center text-sm text-gray-600">
                      +{eligibility.available_codes.length - 4} more codes available
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* All Eligibility Messages */}
            {eligibility.eligibility_messages.length > 2 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Savings Tips
                </h4>
                <div className="space-y-1">
                  {eligibility.eligibility_messages.slice(2).map((message, index) => (
                    <div key={index} className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                      {message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Applied Discounts Summary */}
            {eligibility.applied_discounts.length > 0 && (
              <div>
                <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                  <Target className="w-4 h-4 mr-1" />
                  Currently Applied
                </h4>
                <div className="space-y-1">
                  {eligibility.applied_discounts.map((discount, index) => (
                    <div key={index} className="text-sm text-green-700 flex justify-between items-center">
                      <span>✅ {discount.description}</span>
                      <span className="font-medium">{discount.discount_value}% off {discount.applies_to}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            {!hasAutomaticBenefits && hasAvailableCodes && (
              <div className="pt-2 border-t">
                <div className="text-center">
                  <span className="text-sm text-gray-600">
                    💡 Try the codes above to maximize your savings!
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Action Banner */}
      {!expanded && hasAvailableCodes && eligibility.available_codes.length <= 2 && (
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded border border-green-200">
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Quick save with: {eligibility.available_codes.join(' or ')}
            </span>
          </div>
          {onCodeApply && eligibility.available_codes.length === 1 && (
            <Button
              size="sm"
              onClick={() => onCodeApply(eligibility.available_codes[0])}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Apply {eligibility.available_codes[0]}
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default DiscountEligibilityNotification;