import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { 
  Truck, 
  Shield, 
  Tag, 
  Clock, 
  CheckCircle,
  Info,
  Zap,
  Package
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ShippingOption {
  id: string;
  name: string;
  description: string;
  days: string;
  price: number;
  recommended?: boolean;
  icon: React.ReactNode;
}

interface InsuranceOption {
  id: string;
  name: string;
  description: string;
  coverage: number;
  price: number;
  recommended?: boolean;
}

interface QuoteOptionsSelectorProps {
  quote: any;
  breakdown: any;
  onOptionsChange: (options: {
    shipping: string;
    insurance: string;
    discountCode?: string;
  }) => void;
  formatCurrency: (amount: number, currency: string) => string;
  className?: string;
}

export const QuoteOptionsSelector: React.FC<QuoteOptionsSelectorProps> = ({
  quote,
  breakdown,
  onOptionsChange,
  formatCurrency,
  className = ""
}) => {
  const [selectedShipping, setSelectedShipping] = useState('express');
  const [selectedInsurance, setSelectedInsurance] = useState('standard');
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState('');

  const shippingOptions: ShippingOption[] = [
    {
      id: 'standard',
      name: 'Standard Shipping',
      description: 'Most economical option',
      days: '15-22 days',
      price: 0,
      icon: <Package className="w-5 h-5" />
    },
    {
      id: 'express',
      name: 'Express Shipping',
      description: 'Faster delivery, tracking included',
      days: '10-15 days',
      price: (breakdown.shipping || 45) * 0.3,
      recommended: true,
      icon: <Truck className="w-5 h-5" />
    },
    {
      id: 'priority',
      name: 'Priority Express',
      description: 'Fastest option with premium handling',
      days: '7-12 days',
      price: (breakdown.shipping || 45) * 0.6,
      icon: <Zap className="w-5 h-5" />
    }
  ];

  const insuranceOptions: InsuranceOption[] = [
    {
      id: 'basic',
      name: 'Basic Protection',
      description: 'Coverage for lost packages only',
      coverage: Math.round((quote.total_usd || 1000) * 0.8),
      price: 0
    },
    {
      id: 'standard',
      name: 'Standard Insurance',
      description: 'Full replacement value coverage',
      coverage: Math.round((quote.total_usd || 1000) * 1.2),
      price: 0,
      recommended: true
    },
    {
      id: 'premium',
      name: 'Premium Insurance',
      description: 'Enhanced coverage + expedited claims',
      coverage: Math.round((quote.total_usd || 1000) * 1.5),
      price: 15
    }
  ];

  const handleOptionsUpdate = (updates: Partial<{ shipping: string; insurance: string; discountCode: string }>) => {
    const newOptions = {
      shipping: updates.shipping || selectedShipping,
      insurance: updates.insurance || selectedInsurance,
      discountCode: updates.discountCode || discountCode
    };

    if (updates.shipping) setSelectedShipping(updates.shipping);
    if (updates.insurance) setSelectedInsurance(updates.insurance);
    if (updates.discountCode !== undefined) setDiscountCode(updates.discountCode);

    onOptionsChange(newOptions);
  };

  const handleApplyDiscount = () => {
    if (!discountCode.trim()) {
      setDiscountError('Please enter a discount code');
      return;
    }

    // Simulate discount validation
    const validCodes = ['FIRST10', 'WELCOME5', 'SAVE15', 'BUNDLE20'];
    if (validCodes.includes(discountCode.toUpperCase())) {
      setDiscountApplied(true);
      setDiscountError('');
      handleOptionsUpdate({ discountCode });
    } else {
      setDiscountError('Invalid discount code');
      setDiscountApplied(false);
    }
  };

  const calculateAdjustedTotal = () => {
    const baseTotal = quote.total_customer_currency || quote.total_usd;
    const selectedShippingOption = shippingOptions.find(opt => opt.id === selectedShipping);
    const selectedInsuranceOption = insuranceOptions.find(opt => opt.id === selectedInsurance);
    
    const shippingAdjustment = (selectedShippingOption?.price || 0) - (breakdown.shipping || 0);
    const insuranceAdjustment = (selectedInsuranceOption?.price || 0);
    
    let discountAmount = 0;
    if (discountApplied) {
      // Simple discount calculation based on code
      const discountPercentages = { 'FIRST10': 0.1, 'WELCOME5': 0.05, 'SAVE15': 0.15, 'BUNDLE20': 0.2 };
      discountAmount = baseTotal * (discountPercentages[discountCode.toUpperCase()] || 0);
    }

    return baseTotal + shippingAdjustment + insuranceAdjustment - discountAmount;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Shipping Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Choose Your Shipping Speed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={selectedShipping} onValueChange={(value) => handleOptionsUpdate({ shipping: value })}>
            <div className="space-y-3">
              {shippingOptions.map((option) => (
                <div key={option.id} className="relative">
                  <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-blue-600">
                        {option.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={option.id} className="font-medium cursor-pointer">
                            {option.name}
                          </Label>
                          {option.recommended && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{option.days}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {option.price === 0 ? (
                            <span className="text-green-600">FREE</span>
                          ) : (
                            <span>+{formatCurrency(option.price, quote.customer_currency)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Insurance Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Protect Your Package
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={selectedInsurance} onValueChange={(value) => handleOptionsUpdate({ insurance: value })}>
            <div className="space-y-3">
              {insuranceOptions.map((option) => (
                <div key={option.id} className="relative">
                  <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-green-600">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={option.id} className="font-medium cursor-pointer">
                            {option.name}
                          </Label>
                          {option.recommended && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span className="text-sm font-medium">
                            Up to {formatCurrency(option.coverage, 'USD')} coverage
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {option.price === 0 ? (
                            <span className="text-green-600">FREE</span>
                          ) : (
                            <span>+{formatCurrency(option.price, quote.customer_currency)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">Insurance covers:</p>
                <ul className="text-blue-800 space-y-1">
                  <li>• Lost or stolen packages</li>
                  <li>• Damage during transit</li>
                  <li>• Customs confiscation</li>
                  <li>• Shipping carrier errors</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discount Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-600" />
            Discount Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter discount code"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  className={discountError ? 'border-red-300' : ''}
                />
                {discountError && (
                  <p className="text-sm text-red-600 mt-1">{discountError}</p>
                )}
                {discountApplied && (
                  <p className="text-sm text-green-600 mt-1 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Discount applied successfully!
                  </p>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={handleApplyDiscount}
                disabled={discountApplied}
              >
                Apply
              </Button>
            </div>

            {/* Available Discounts Hint */}
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="font-medium text-purple-900 text-sm mb-1">First-time customers</div>
                <div className="text-purple-700 text-sm">Use code <code className="font-mono bg-purple-200 px-1 rounded">FIRST10</code> for 10% off</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="font-medium text-purple-900 text-sm mb-1">Bundle savings</div>
                <div className="text-purple-700 text-sm">Use code <code className="font-mono bg-purple-200 px-1 rounded">BUNDLE20</code> for 20% off</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Updated Total */}
      {(selectedShipping !== 'express' || selectedInsurance !== 'standard' || discountApplied) && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-900">Updated Total</p>
                <p className="text-sm text-green-700">Based on your selections</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(calculateAdjustedTotal(), quote.customer_currency)}
                </div>
                {calculateAdjustedTotal() !== (quote.total_customer_currency || quote.total_usd) && (
                  <div className="text-sm text-green-700">
                    {calculateAdjustedTotal() < (quote.total_customer_currency || quote.total_usd) ? 'You save ' : 'Additional '}
                    {formatCurrency(Math.abs(calculateAdjustedTotal() - (quote.total_customer_currency || quote.total_usd)), quote.customer_currency)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};