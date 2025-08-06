import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  onQuoteUpdate?: () => void; // Callback to refresh quote data from parent
}

export const QuoteOptionsSelector: React.FC<QuoteOptionsSelectorProps> = ({
  quote,
  breakdown,
  onOptionsChange,
  formatCurrency,
  className = "",
  onQuoteUpdate
}) => {
  // Get shipping data from route calculations and available options
  const routeCalculations = quote.calculation_data?.route_calculations || {};
  const selectedDeliveryOption = routeCalculations.delivery_option_used;
  
  const [selectedShipping, setSelectedShipping] = useState(selectedDeliveryOption?.id || '');
  const [insuranceEnabled, setInsuranceEnabled] = useState(quote.insurance_required || false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState('');

  // Fetch all available shipping options for this route
  const [availableOptions, setAvailableOptions] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  
  useEffect(() => {
    const fetchShippingOptions = async () => {
      try {
        console.log('🚚 Fetching shipping options for:', quote.origin_country, '→', quote.destination_country);
        const { data, error } = await supabase
          .from('shipping_routes')
          .select('delivery_options')
          .eq('origin_country', quote.origin_country)
          .eq('destination_country', quote.destination_country)
          .eq('is_active', true)
          .single();
          
        if (!error && data?.delivery_options) {
          const activeOptions = data.delivery_options.filter((opt: any) => opt.active);
          console.log('✅ Found shipping options:', activeOptions.length, activeOptions);
          setAvailableOptions(activeOptions);
          
          // Set default selection if none exists
          if (!selectedShipping && activeOptions.length > 0) {
            const defaultOption = selectedDeliveryOption?.id || activeOptions[0]?.id;
            if (defaultOption) {
              console.log('🎯 Setting default shipping option:', defaultOption);
              setSelectedShipping(defaultOption);
            }
          }
        } else {
          console.warn('❌ No shipping options found:', error);
        }
      } catch (err) {
        console.error('❌ Error fetching shipping options:', err);
      } finally {
        setLoadingOptions(false);
      }
    };
    
    fetchShippingOptions();
  }, [quote.origin_country, quote.destination_country, selectedDeliveryOption?.id]);
  
  // Convert all available options to display format
  const shippingOptions: ShippingOption[] = availableOptions.map((option: any) => {
    const isSelected = selectedDeliveryOption?.id === option.id;
    const baseShippingCost = breakdown.shipping || 0;
    
    return {
      id: option.id,
      name: option.name || `${option.carrier || 'Standard'} Shipping`,
      description: `${option.carrier || 'Standard'} - ${option.min_days}-${option.max_days} days delivery`,
      days: `${option.min_days}-${option.max_days} days`,
      price: isSelected ? 0 : (option.price * (quote.calculation_data?.inputs?.total_weight_kg || 1)) - baseShippingCost,
      recommended: isSelected,
      icon: option.carrier === 'FedEx' || option.carrier === 'fedex' || option.carrier === 'JE' ? <Zap className="w-5 h-5" /> :
            option.carrier === 'DHL' || option.carrier === 'dhl' ? <Truck className="w-5 h-5" /> :
            <Package className="w-5 h-5" />
    };
  });

  // Get insurance settings from route calculations
  const insuranceSettings = routeCalculations.insurance || {};
  const adminInsuranceEnabled = insuranceSettings.available !== false;
  const insuranceFromBreakdown = breakdown.insurance || 0;
  
  const insuranceConfig = {
    enabled: adminInsuranceEnabled,
    currentFee: insuranceFromBreakdown,
    rate: (insuranceSettings.percentage || 1.5) / 100, // Use actual rate from calculation
    minFee: insuranceSettings.min_fee || 2,
    maxFee: 50,
    coverage: quote.total_usd || 0
  };

  const calculateInsuranceFee = (enabled: boolean) => {
    if (!enabled || !insuranceConfig.enabled) return 0;
    
    // Use admin-calculated fee if available, otherwise calculate using rate
    if (insuranceConfig.currentFee > 0) {
      return insuranceConfig.currentFee;
    }
    
    // Fallback calculation using rate
    const itemTotal = quote.total_usd || 0;
    const calculatedFee = itemTotal * insuranceConfig.rate;
    return Math.min(Math.max(calculatedFee, insuranceConfig.minFee), insuranceConfig.maxFee);
  };


  const handleOptionsUpdate = async (updates: Partial<{ shipping: string; insurance: boolean; discountCode: string }>) => {
    // Prevent infinite loops by checking if values actually changed
    const shippingChanged = updates.shipping && updates.shipping !== selectedShipping;
    const insuranceChanged = updates.insurance !== undefined && updates.insurance !== insuranceEnabled;
    const discountChanged = updates.discountCode !== undefined && updates.discountCode !== discountCode;
    
    if (!shippingChanged && !insuranceChanged && !discountChanged) {
      return; // Nothing actually changed, exit early
    }
    
    // Update state only if values changed
    if (shippingChanged) {
      setSelectedShipping(updates.shipping!);
    }
    if (insuranceChanged) {
      setInsuranceEnabled(updates.insurance!);
    }
    if (discountChanged) {
      setDiscountCode(updates.discountCode!);
    }

    // Update database if shipping or insurance changed
    if (shippingChanged || insuranceChanged) {
      try {
        const updateData: any = {};
        
        if (shippingChanged) {
          // Update the delivery option in route calculations
          const selectedOption = availableOptions.find(opt => opt.id === updates.shipping);
          if (selectedOption) {
            const newRouteCalc = {
              ...routeCalculations,
              delivery_option_used: {
                id: selectedOption.id,
                name: selectedOption.name,
                carrier: selectedOption.carrier,
                price_per_kg: selectedOption.price,
                delivery_days: `${selectedOption.min_days}-${selectedOption.max_days}`
              }
            };
            
            updateData.calculation_data = {
              ...quote.calculation_data,
              route_calculations: newRouteCalc
            };
            updateData.shipping_method = updates.shipping;
          }
        }
        
        if (insuranceChanged) {
          updateData.insurance_required = updates.insurance;
        }
        
        // Save to database
        await supabase
          .from('quotes_v2')
          .update(updateData)
          .eq('id', quote.id);
          
        console.log('✅ Quote options updated in database');
        
        // Refresh quote data to get updated totals and breakdown
        if (onQuoteUpdate) {
          setTimeout(() => {
            onQuoteUpdate();
            console.log('🔄 Quote data refreshed');
          }, 500); // Small delay to ensure database update is complete
        }
      } catch (error) {
        console.error('❌ Failed to update quote options:', error);
      }
    }

    // The useEffect will handle the recalculation automatically
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

  // Memoized calculation function to prevent infinite renders
  const calculateAdjustedTotal = useCallback(() => {
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
      
      return {
        shipping: selectedShipping,
        insurance: insuranceEnabled,
        discountCode: discountCode,
        adjustedTotal: Math.max(0, adjustedTotal), // Ensure non-negative
        shippingAdjustment: shippingAdjustment,
        insuranceAdjustment: insuranceAdjustment,
        discountAmount: discountAmount
      };
    } catch (error) {
      console.error('Error calculating adjusted total:', error);
      return {
        shipping: selectedShipping,
        insurance: insuranceEnabled,
        discountCode: discountCode,
        adjustedTotal: quote.total_customer_currency || quote.total_usd,
        shippingAdjustment: 0,
        insuranceAdjustment: 0,
        discountAmount: 0
      };
    }
  }, [quote, selectedShipping, insuranceEnabled, discountCode, discountApplied, shippingOptions, insuranceFromBreakdown]);
  
  // Use effect to notify parent of changes instead of calling during render
  useEffect(() => {
    if (onOptionsChange && shippingOptions.length > 0) {
      const result = calculateAdjustedTotal();
      onOptionsChange(result);
    }
  }, [onOptionsChange, calculateAdjustedTotal, shippingOptions.length]);

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
          {loadingOptions ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Loading shipping options...</span>
            </div>
          ) : (
            <RadioGroup value={selectedShipping} onValueChange={(value) => handleOptionsUpdate({ shipping: value })}>
              <div className="space-y-3">
                {shippingOptions.map((option) => (
                <div key={option.id} className="relative">
                  <div className={`flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer transition-all ${
                    selectedDeliveryOption?.id === option.id 
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
                          {selectedDeliveryOption?.id === option.id && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                              Selected
                            </Badge>
                          )}
                          {option.recommended && (
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
          )}
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
                  Full coverage up to {formatCurrency(insuranceConfig.coverage, 'USD')}
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
              onCheckedChange={(checked) => {
                console.log('🛡️ Insurance toggle clicked:', checked, 'current:', insuranceEnabled);
                handleOptionsUpdate({ insurance: checked });
              }}
            />
          </div>

          {insuranceConfig.enabled && (
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
                    Rate: {(insuranceConfig.rate * 100).toFixed(1)}% (min: {formatCurrency(insuranceConfig.minFee, 'USD')}, max: {formatCurrency(insuranceConfig.maxFee, 'USD')})
                  </p>
                </div>
              </div>
            </div>
          )}

          {!insuranceConfig.enabled && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-600" />
                <p className="text-sm text-gray-700">
                  Package insurance is currently disabled for this quote.
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
                  {formatCurrency(calculateAdjustedTotal().adjustedTotal, quote.customer_currency)}
                </div>
                {(() => {
                  const result = calculateAdjustedTotal();
                  const originalTotal = quote.total_customer_currency || quote.total_usd;
                  return result.adjustedTotal !== originalTotal && (
                    <div className="text-sm text-green-700">
                      {result.adjustedTotal < originalTotal ? 'You save ' : 'Additional '}
                      {formatCurrency(Math.abs(result.adjustedTotal - originalTotal), quote.customer_currency)}
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};