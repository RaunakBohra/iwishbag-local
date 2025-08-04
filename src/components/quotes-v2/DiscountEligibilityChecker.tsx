import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MapPin, 
  DollarSign,
  Users,
  Gift,
  Target,
  TrendingUp,
  AlertTriangle,
  Info,
  Sparkles
} from 'lucide-react';
import { DiscountService } from '@/services/DiscountService';
import { currencyService } from '@/services/CurrencyService';

interface DiscountEligibilityCheckerProps {
  customerId?: string;
  orderTotal: number;
  countryCode: string;
  originCurrency?: string; // NEW: Currency of the order total (INR, USD, NPR, etc.)
  isFirstOrder?: boolean;
  hasAccount?: boolean;
  className?: string;
}

interface EligibilityCheck {
  discountCode: string;
  discountName: string;
  discountType: string;
  discountValue: number;
  eligible: boolean;
  reasons: EligibilityReason[];
  potentialSavings: number;
  appliesTo: string;
  priority: 'high' | 'medium' | 'low';
}

interface EligibilityReason {
  type: 'met' | 'not_met' | 'warning';
  requirement: string;
  status: string;
  suggestion?: string;
}

export const DiscountEligibilityChecker: React.FC<DiscountEligibilityCheckerProps> = ({
  customerId,
  orderTotal,
  countryCode,
  originCurrency = 'USD',
  isFirstOrder = false,
  hasAccount = false,
  className = ''
}) => {
  const [eligibilityChecks, setEligibilityChecks] = useState<EligibilityCheck[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    checkEligibility();
  }, [orderTotal, countryCode, customerId, originCurrency]);

  // Helper function to format amounts in origin currency
  const formatOriginAmount = (amount: number): string => {
    return currencyService.formatAmount(amount, originCurrency);
  };

  const checkEligibility = async () => {
    setIsLoading(true);
    try {
      // Convert USD thresholds to origin currency
      const exchangeRate = await currencyService.getExchangeRate('USD', originCurrency);
      const volumeThresholdUSD = 1000;
      const volumeThresholdOrigin = volumeThresholdUSD * exchangeRate;

      // Mock eligibility check - in real implementation, this would call DiscountService
      const mockChecks: EligibilityCheck[] = [
        {
          discountCode: 'WELCOME10',
          discountName: 'Welcome Discount',
          discountType: 'percentage',
          discountValue: 10,
          eligible: isFirstOrder && hasAccount,
          potentialSavings: orderTotal * 0.1,
          appliesTo: 'total',
          priority: 'high',
          reasons: [
            {
              type: isFirstOrder ? 'met' : 'not_met',
              requirement: 'First-time customer',
              status: isFirstOrder ? 'You qualify as a first-time customer' : 'Available only for first orders',
              suggestion: !isFirstOrder ? 'This discount was available for your first order' : undefined
            },
            {
              type: hasAccount ? 'met' : 'not_met',
              requirement: 'Account registration',
              status: hasAccount ? 'Account is registered' : 'Account registration required',
              suggestion: !hasAccount ? 'Create an account to unlock this discount' : undefined
            }
          ]
        },
        {
          discountCode: 'VOLUME15',
          discountName: 'Volume Discount Tier 3',
          discountType: 'percentage',
          discountValue: 15,
          eligible: orderTotal >= volumeThresholdOrigin,
          potentialSavings: orderTotal >= volumeThresholdOrigin ? Math.min(orderTotal * 0.15, volumeThresholdOrigin) : (volumeThresholdOrigin * 0.15),
          appliesTo: 'shipping, customs',
          priority: 'high',
          reasons: [
            {
              type: orderTotal >= volumeThresholdOrigin ? 'met' : 'not_met',
              requirement: `Minimum order ${formatOriginAmount(volumeThresholdOrigin)}`,
              status: orderTotal >= volumeThresholdOrigin 
                ? `Your order of ${formatOriginAmount(orderTotal)} qualifies` 
                : `Add ${formatOriginAmount(volumeThresholdOrigin - orderTotal)} more to qualify`,
              suggestion: orderTotal < volumeThresholdOrigin ? 'Add more items to reach the minimum order value' : undefined
            }
          ]
        },
        {
          discountCode: 'INDIASHIP10',
          discountName: 'India Shipping Discount',
          discountType: 'percentage',
          discountValue: 10,
          eligible: countryCode === 'IN',
          potentialSavings: countryCode === 'IN' ? orderTotal * 0.02 : 0, // Assume 2% of order is shipping
          appliesTo: 'shipping',
          priority: 'medium',
          reasons: [
            {
              type: countryCode === 'IN' ? 'met' : 'not_met',
              requirement: 'Delivery to India',
              status: countryCode === 'IN' 
                ? 'Available for India delivery' 
                : `Not available for ${countryCode} delivery`,
              suggestion: countryCode !== 'IN' ? 'Check country-specific offers for your region' : undefined
            }
          ]
        },
        {
          discountCode: 'STUDENT20',
          discountName: 'Student Discount',
          discountType: 'percentage',
          discountValue: 20,
          eligible: false, // Would check student verification
          potentialSavings: orderTotal * 0.2,
          appliesTo: 'total',
          priority: 'medium',
          reasons: [
            {
              type: 'not_met',
              requirement: 'Student verification',
              status: 'Student status not verified',
              suggestion: 'Verify your student status to unlock 20% discount'
            }
          ]
        }
      ];

      setEligibilityChecks(mockChecks);
    } catch (error) {
      console.error('Error checking discount eligibility:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const eligibleDiscounts = eligibilityChecks.filter(check => check.eligible);
  const potentialDiscounts = eligibilityChecks.filter(check => !check.eligible);
  const totalPotentialSavings = eligibleDiscounts.reduce((sum, check) => sum + check.potentialSavings, 0);

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'met':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'not_met':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Checking discount eligibility...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Discount Eligibility
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Available Now</span>
            </div>
            <div className="text-lg font-bold text-green-800">{eligibleDiscounts.length}</div>
            <div className="text-xs text-green-600">
              Save up to {formatOriginAmount(totalPotentialSavings)}
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Potential</span>
            </div>
            <div className="text-lg font-bold text-blue-800">{potentialDiscounts.length}</div>
            <div className="text-xs text-blue-600">Discounts you could unlock</div>
          </div>
        </div>

        {/* Eligible Discounts */}
        {eligibleDiscounts.length > 0 && (
          <div>
            <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Ready to Use ({eligibleDiscounts.length})
            </h4>
            <div className="space-y-3">
              {eligibleDiscounts.map((check) => (
                <div key={check.discountCode} className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">{check.discountCode}</span>
                      <Badge variant="outline" className={getPriorityColor(check.priority)}>
                        {check.priority}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium text-green-800">
                      Save {formatOriginAmount(check.potentialSavings)}
                    </div>
                  </div>
                  <p className="text-sm text-green-700 mb-2">{check.discountName}</p>
                  <div className="space-y-1">
                    {check.reasons.map((reason, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        {getStatusIcon(reason.type)}
                        <span className={reason.type === 'met' ? 'text-green-700' : 'text-red-700'}>
                          {reason.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Potential Discounts */}
        {potentialDiscounts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-blue-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Unlock More Savings ({potentialDiscounts.length})
              </h4>
              {potentialDiscounts.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="text-xs"
                >
                  {showAll ? 'Show Less' : 'Show All'}
                </Button>
              )}
            </div>
            
            <div className="space-y-3">
              {(showAll ? potentialDiscounts : potentialDiscounts.slice(0, 2)).map((check) => (
                <div key={check.discountCode} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{check.discountCode}</span>
                      <Badge variant="outline" className={getPriorityColor(check.priority)}>
                        {check.priority}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium text-blue-800">
                      Could save {formatOriginAmount(check.potentialSavings)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{check.discountName}</p>
                  <div className="space-y-1">
                    {check.reasons.map((reason, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-start gap-2 text-sm">
                          {getStatusIcon(reason.type)}
                          <span className={reason.type === 'met' ? 'text-green-700' : 'text-gray-700'}>
                            {reason.status}
                          </span>
                        </div>
                        {reason.suggestion && (
                          <div className="ml-6 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                            💡 {reason.suggestion}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help Section */}
        <Separator />
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">How to maximize savings</span>
          </div>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Discounts are automatically applied during checkout</li>
            <li>• Volume discounts activate based on order total thresholds</li>
            <li>• Country-specific shipping discounts apply automatically</li>
            <li>• Student and membership discounts require verification</li>
            <li>• Subscribe to our newsletter for exclusive discount codes</li>
          </ul>
        </div>

        {/* Quick Actions */}
        {potentialDiscounts.some(d => d.discountCode === 'STUDENT20') && (
          <Alert>
            <Gift className="h-4 w-4" />
            <AlertDescription>
              <strong>Student Discount Available:</strong> Verify your student status to unlock 20% off your entire order.
              <Button variant="link" className="p-0 h-auto ml-2 text-sm">
                Verify Now →
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};