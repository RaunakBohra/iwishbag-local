import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
    insurance: boolean;
    discountCode?: string;
    adjustedTotal?: number;
    shippingAdjustment?: number;
    insuranceAdjustment?: number;
    discountAmount?: number;
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
  const [insuranceEnabled, setInsuranceEnabled] = useState(true);
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState('');

  // Get shipping options from admin calculation data (same source admin uses)
  const adminShippingOptions = quote.calculation_data?.shipping_options || [];
  const selectedOptionId = quote.operational_data?.shipping?.selected_option;
  
  // Convert admin shipping options to display format - no fallbacks, only show what admin configured
  const shippingOptions: ShippingOption[] = adminShippingOptions.map((option: any) => {
    const isSelected = selectedOptionId === option.id;
    
    return {
      id: option.id,
      name: option.name || `${option.carrier || 'Standard'} Shipping`,
      description: `${option.carrier || 'Standard'} - ${option.description || 'Delivery service'}`,
      days: option.days || `${option.min_days}-${option.max_days} days`,
      price: isSelected ? 0 : (option.cost_usd || option.cost || 0) - (breakdown.shipping || 0),
      recommended: option.recommended || isSelected,
      icon: option.carrier === 'FedEx' || option.service_type === 'express' ? <Zap className="w-5 h-5" /> :
            option.carrier === 'DHL' || option.service_type === 'standard' ? <Truck className="w-5 h-5" /> :
            <Package className="w-5 h-5" />
    };
  });

  // Get insurance settings from admin calculation result (same as admin side)
  const adminInsuranceEnabled = quote.calculation_result?.insurance_enabled !== false;
  const insuranceFromBreakdown = breakdown.insurance || 0;
  
  const insuranceSettings = {
    enabled: adminInsuranceEnabled,
    currentFee: insuranceFromBreakdown,
    rate: 0.02, // 2% rate for calculation
    minFee: 5,
    maxFee: 50,
    coverage: quote.total_usd || 0
  };

  const calculateInsuranceFee = (enabled: boolean) => {
    if (!enabled || !insuranceSettings.enabled) return 0;
    return insuranceSettings.currentFee; // Use admin-calculated fee
  };

  const handleOptionsUpdate = (updates: Partial<{ shipping: string; insurance: boolean; discountCode: string }>) => {
    let shouldRecalculate = false;
    
    if (updates.shipping && updates.shipping !== selectedShipping) {
      setSelectedShipping(updates.shipping);
      shouldRecalculate = true;
    }
    if (updates.insurance !== undefined && updates.insurance !== insuranceEnabled) {
      setInsuranceEnabled(updates.insurance);
      shouldRecalculate = true;
    }
    if (updates.discountCode !== undefined && updates.discountCode !== discountCode) {
      setDiscountCode(updates.discountCode);
      shouldRecalculate = true;
    }

    // Only recalculate if something actually changed
    if (shouldRecalculate) {
      setTimeout(() => calculateAdjustedTotal(), 10);
    }
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
    try {
      const baseTotal = quote.total_customer_currency || quote.total_usd;
      const selectedShippingOption = shippingOptions.find(opt => opt.id === selectedShipping);
      
      const shippingAdjustment = (selectedShippingOption?.price || 0);
      
      // Calculate insurance adjustment based on toggle
      const currentInsuranceFee = insuranceFromBreakdown;
      const newInsuranceFee = insuranceEnabled ? currentInsuranceFee : 0;
      const insuranceAdjustment = newInsuranceFee - currentInsuranceFee;
      
      let discountAmount = 0;
      if (discountApplied && discountCode) {
        const discountPercentages = { 'FIRST10': 0.1, 'WELCOME5': 0.05, 'SAVE15': 0.15, 'BUNDLE20': 0.2 };
        discountAmount = baseTotal * (discountPercentages[discountCode.toUpperCase()] || 0);
      }

      const adjustedTotal = baseTotal + shippingAdjustment + insuranceAdjustment - discountAmount;
      
      // Safely notify parent of total change
      if (onOptionsChange) {
        onOptionsChange({
          shipping: selectedShipping,
          insurance: insuranceEnabled,
          discountCode: discountCode,
          adjustedTotal: Math.max(0, adjustedTotal), // Ensure non-negative
          shippingAdjustment: shippingAdjustment,
          insuranceAdjustment: insuranceAdjustment,
          discountAmount: discountAmount
        });
      }
      
      return adjustedTotal;
    } catch (error) {
      console.error('Error calculating adjusted total:', error);
      return quote.total_customer_currency || quote.total_usd;
    }
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
                  <div className={`flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer transition-all ${
                    selectedOptionId === option.id 
                      ? 'border-teal-500 bg-teal-50' 
                      : 'border-gray-300'
                  }`}>
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
                          {selectedOptionId === option.id && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                              Auto
                            </Badge>
                          )}
                          {option.recommended && selectedOptionId !== option.id && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{option.days}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            <span>{option.description.split(' - ')[0]}</span>
                          </div>
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

      {/* Package Protection Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Protect Your Package
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium">Package Insurance</div>
                <div className="text-sm text-muted-foreground">
                  Full coverage up to {formatCurrency(insuranceSettings.coverage, 'USD')}
                </div>
                {insuranceEnabled && (
                  <div className="text-sm text-green-600 font-medium mt-1">
                    +{formatCurrency(calculateInsuranceFee(true), quote.customer_currency)}
                  </div>
                )}
              </div>
            </div>
            <Switch
              checked={insuranceEnabled}
              onCheckedChange={(checked) => handleOptionsUpdate({ insurance: checked })}
            />
          </div>

          {insuranceSettings.enabled && (
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
                  <p className="text-blue-700 text-xs mt-2">
                    Rate: {(insuranceSettings.rate * 100).toFixed(1)}% (min: {formatCurrency(insuranceSettings.minFee, 'USD')}, max: {formatCurrency(insuranceSettings.maxFee, 'USD')})
                  </p>
                </div>
              </div>
            </div>
          )}

          {!insuranceSettings.enabled && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-600" />
                <p className="text-sm text-gray-700">
                  Package insurance is currently disabled by admin settings.
                </p>
              </div>
            </div>
          )}
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
      {(selectedShipping !== 'express' || !insuranceEnabled || discountApplied) && (
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