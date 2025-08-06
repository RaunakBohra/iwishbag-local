import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { 
  CheckCircle, 
  Package, 
  Truck, 
  Shield, 
  CreditCard,
  MessageCircle,
  ChevronUp,
  ChevronDown,
  Settings,
  Tag,
  Clock,
  Zap
} from 'lucide-react';

interface MobileStickyBarProps {
  quote: any;
  onApprove: () => void;
  onRequestChanges: () => void;
  onReject: () => void;
  formatCurrency: (amount: number, currency: string) => string;
  adjustedTotal?: number;
}

export const MobileStickyBar: React.FC<MobileStickyBarProps> = ({
  quote,
  onApprove,
  onRequestChanges,
  onReject,
  formatCurrency,
  adjustedTotal
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4 z-50 md:hidden">
      <div className="space-y-3">
        {/* Price Summary */}
        <div className="text-center">
          <div className="text-2xl font-bold">
            {formatCurrency(adjustedTotal || quote.total_customer_currency || quote.total_usd, quote.customer_currency)}
          </div>
          {adjustedTotal && adjustedTotal !== (quote.total_customer_currency || quote.total_usd) && (
            <div className="text-sm text-muted-foreground line-through">
              Was: {formatCurrency(quote.total_customer_currency || quote.total_usd, quote.customer_currency)}
            </div>
          )}
          {quote.customer_currency !== 'USD' && (
            <div className="text-sm text-muted-foreground">
              ≈ {formatCurrency(adjustedTotal || quote.total_usd, 'USD')}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            className="w-full h-12 text-base font-medium bg-black hover:bg-gray-800"
            onClick={onApprove}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Approve & Add to Cart
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="destructive" 
              size="sm"
              onClick={onReject}
              className="h-10"
            >
              Reject
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onRequestChanges}
              className="h-10"
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              Ask
            </Button>
          </div>
        </div>

        {/* Trust Signal */}
        <div className="text-center text-xs text-muted-foreground">
          🔒 Secure checkout • ⚡ Instant approval
        </div>
      </div>
    </div>
  );
};

interface MobileProductSummaryProps {
  items: any[];
  quote: any;
  formatCurrency: (amount: number, currency: string) => string;
}

export const MobileProductSummary: React.FC<MobileProductSummaryProps> = ({
  items,
  quote,
  formatCurrency
}) => {
  return (
    <Card className="md:hidden mb-6">
      <CardContent className="p-4">
        {/* Hero Product */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
            {items[0]?.image_url ? (
              <img 
                src={items[0].image_url} 
                alt={items[0].name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg leading-tight mb-2">
              {items.length > 1 
                ? `${items[0]?.name} + ${items.length - 1} more`
                : items[0]?.name
              }
            </h2>
            <div className="text-sm text-muted-foreground">
              {items.length} item{items.length !== 1 ? 's' : ''} • Express shipping
            </div>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            All verified
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
            <Truck className="w-3 h-3 mr-1" />
            12-15 days
          </Badge>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
            <Shield className="w-3 h-3 mr-1" />
            Insured
          </Badge>
        </div>

        {/* Delivery Estimate */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-muted-foreground">
              <Truck className="w-4 h-4 mr-2" />
              <span>Delivery</span>
            </div>
            <span className="font-medium">
              {(() => {
                // Use admin shipping settings for delivery estimate
                const adminShippingOptions = quote.calculation_data?.shipping_options || [];
                const defaultOption = adminShippingOptions.find((opt: any) => opt.recommended) || 
                  adminShippingOptions[0] || { min_days: 25, max_days: 30 }; // fallback

                const minDate = new Date(Date.now() + defaultOption.min_days * 24 * 60 * 60 * 1000);
                const maxDate = new Date(Date.now() + defaultOption.max_days * 24 * 60 * 60 * 1000);
                
                return `${minDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })} - ${maxDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}`;
              })()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface MobileBreakdownProps {
  quote: any;
  breakdown: any;
  expanded: boolean;
  onToggle: () => void;
  formatCurrency: (amount: number, currency: string) => string;
  quoteOptions?: {
    shipping: string;
    insurance: boolean;
    discountCode: string;
  };
  onOptionsChange?: (options: {
    shipping: string;
    insurance: boolean;
    discountCode: string;
  }) => void;
}

export const MobileBreakdown: React.FC<MobileBreakdownProps> = ({
  quote,
  breakdown,
  expanded,
  onToggle,
  formatCurrency,
  quoteOptions,
  onOptionsChange
}) => {
  return (
    <Card className="md:hidden mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Total: {formatCurrency(quote.total_customer_currency || quote.total_usd, quote.customer_currency)}</h3>
          <Button variant="ghost" size="sm" onClick={onToggle} className="p-1 h-auto">
            {expanded ? (
              <>
                <span className="text-sm mr-1">Hide</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span className="text-sm mr-1">Show</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>

        {quote.customer_currency !== 'USD' && (
          <div className="text-sm text-muted-foreground text-center mb-3">
            ≈ {formatCurrency(quote.total_usd, 'USD')}
          </div>
        )}

        {expanded && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex justify-between text-sm">
              <span>Products</span>
              <span>{formatCurrency(breakdown.items_total || 0, quote.customer_currency)}</span>
            </div>
            
            {breakdown.item_discounts > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Bundle savings</span>
                <span>-{formatCurrency(breakdown.item_discounts, quote.customer_currency)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span>Shipping & Insurance</span>
              <span>{formatCurrency((breakdown.shipping || 0) + (breakdown.insurance || 0), quote.customer_currency)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Duties & Taxes</span>
              <span>{formatCurrency((breakdown.customs || 0) + (breakdown.local_tax || 0), quote.customer_currency)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Service fees</span>
              <span>{formatCurrency((breakdown.handling_fee || 0) + (breakdown.domestic_delivery || 0), quote.customer_currency)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface MobileTrustSignalsProps {}

export const MobileTrustSignals: React.FC<MobileTrustSignalsProps> = () => {
  return (
    <Card className="md:hidden mb-6">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <div className="text-sm font-medium">Free packaging</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <Shield className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-sm font-medium">Insurance included</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <Truck className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <div className="text-sm font-medium">Express shipping</div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <Package className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <div className="text-sm font-medium">SMS tracking</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface MobileProgressProps {
  currentStep: number;
}

export const MobileProgress: React.FC<MobileProgressProps> = ({ currentStep }) => {
  const steps = ['Requested', 'Calculated', 'Approval', 'Cart', 'Checkout'];
  
  return (
    <div className="md:hidden mb-6">
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div 
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                index + 1 <= currentStep 
                  ? 'bg-green-500 text-white' 
                  : index + 1 === currentStep + 1 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index + 1 <= currentStep ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                index + 1
              )}
            </div>
            <span className={`text-xs mt-1 ${
              index + 1 <= currentStep ? 'text-green-600 font-medium' : 'text-gray-500'
            }`}>
              {step}
            </span>
          </div>
        ))}
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-1">
        <div 
          className="bg-green-500 h-1 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
};

interface MobileQuoteOptionsProps {
  quote: any;
  breakdown: any;
  quoteOptions: {
    shipping: string;
    insurance: boolean;
    discountCode: string;
    adjustedTotal?: number;
    shippingAdjustment?: number;
    insuranceAdjustment?: number;
    discountAmount?: number;
  };
  onOptionsChange: (options: {
    shipping: string;
    insurance: boolean;
    discountCode: string;
    adjustedTotal?: number;
    shippingAdjustment?: number;
    insuranceAdjustment?: number;
    discountAmount?: number;
  }) => void;
  formatCurrency: (amount: number, currency: string) => string;
}

export const MobileQuoteOptions: React.FC<MobileQuoteOptionsProps> = ({
  quote,
  breakdown,
  quoteOptions,
  onOptionsChange,
  formatCurrency
}) => {
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState('');

  // Get shipping options from admin settings or defaults
  const adminShippingOptions = quote.calculation_data?.shipping_options || [];
  
  const shippingOptions = adminShippingOptions.length > 0 ? 
    adminShippingOptions.map((option: any) => ({
      id: option.id,
      name: option.name,
      days: option.delivery_days || `${option.min_days}-${option.max_days} days`,
      price: option.additional_cost || 0,
      recommended: option.recommended || false,
      icon: option.type === 'express' ? <Truck className="w-4 h-4" /> : 
            option.type === 'priority' ? <Zap className="w-4 h-4" /> : 
            <Package className="w-4 h-4" />
    })) : [
      // Fallback options if admin hasn't configured shipping
      {
        id: 'standard',
        name: 'Standard',
        days: '15-22 days',
        price: 0,
        icon: <Package className="w-4 h-4" />
      },
      {
        id: 'express',
        name: 'Express',
        days: '10-15 days',
        price: (breakdown.shipping || 45) * 0.3,
        recommended: true,
        icon: <Truck className="w-4 h-4" />
      },
      {
        id: 'priority',
        name: 'Priority',
        days: '7-12 days',
        price: (breakdown.shipping || 45) * 0.6,
        icon: <Zap className="w-4 h-4" />
      }
    ];

  // Get insurance settings from quote or defaults
  const insuranceSettings = {
    enabled: quote.calculation_data?.insurance_enabled !== false,
    rate: quote.calculation_data?.insurance_rate || 0.02,
    minFee: quote.calculation_data?.insurance_min_fee || 5,
    maxFee: quote.calculation_data?.insurance_max_fee || 50,
    coverage: quote.total_usd || 0
  };

  const calculateInsuranceFee = () => {
    if (!insuranceSettings.enabled) return 0;
    const calculatedFee = (quote.total_usd || 0) * insuranceSettings.rate;
    return Math.min(Math.max(calculatedFee, insuranceSettings.minFee), insuranceSettings.maxFee);
  };

  const handleOptionsUpdate = (updates: Partial<{ shipping: string; insurance: boolean; discountCode: string }>) => {
    const shipping = updates.shipping || quoteOptions.shipping;
    const insurance = updates.insurance !== undefined ? updates.insurance : quoteOptions.insurance;
    const discountCode = updates.discountCode !== undefined ? updates.discountCode : quoteOptions.discountCode;
    
    // Calculate adjustments
    const selectedShippingOption = shippingOptions.find(opt => opt.id === shipping);
    
    const baseTotal = quote.total_customer_currency || quote.total_usd;
    const shippingAdjustment = (selectedShippingOption?.price || 0) - (breakdown.shipping || 0);
    
    // Calculate insurance adjustment based on toggle and admin settings
    const currentInsuranceFee = breakdown.insurance || 0;
    const newInsuranceFee = insurance ? calculateInsuranceFee() : 0;
    const insuranceAdjustment = newInsuranceFee - currentInsuranceFee;
    
    let discountAmount = 0;
    if (discountApplied && discountCode) {
      const discountPercentages = { 'FIRST10': 0.1, 'WELCOME5': 0.05, 'SAVE15': 0.15, 'BUNDLE20': 0.2 };
      discountAmount = baseTotal * (discountPercentages[discountCode.toUpperCase()] || 0);
    }
    
    const adjustedTotal = baseTotal + shippingAdjustment + insuranceAdjustment - discountAmount;
    
    const newOptions = {
      shipping,
      insurance,
      discountCode,
      adjustedTotal,
      shippingAdjustment,
      insuranceAdjustment,
      discountAmount
    };
    
    onOptionsChange(newOptions);
  };

  const handleApplyDiscount = () => {
    if (!quoteOptions.discountCode.trim()) {
      setDiscountError('Please enter a discount code');
      return;
    }

    const validCodes = ['FIRST10', 'WELCOME5', 'SAVE15', 'BUNDLE20'];
    if (validCodes.includes(quoteOptions.discountCode.toUpperCase())) {
      setDiscountApplied(true);
      setDiscountError('');
      // Trigger recalculation with discount applied
      handleOptionsUpdate({});
    } else {
      setDiscountError('Invalid discount code');
      setDiscountApplied(false);
    }
  };

  return (
    <Card className="md:hidden mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Quote Options</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOptionsExpanded(!optionsExpanded)} className="p-1 h-auto">
            {optionsExpanded ? (
              <>
                <span className="text-sm mr-1">Hide</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span className="text-sm mr-1">Customize</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>

        {!optionsExpanded && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span className="capitalize font-medium">{quoteOptions.shipping}</span>
            </div>
            <div className="flex justify-between">
              <span>Insurance:</span>
              <span className="capitalize font-medium">{quoteOptions.insurance ? 'Enabled' : 'Disabled'}</span>
            </div>
            {quoteOptions.discountCode && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span className="font-medium">{quoteOptions.discountCode}</span>
              </div>
            )}
          </div>
        )}

        {optionsExpanded && (
          <div className="space-y-6 pt-3 border-t">
            {/* Shipping Options */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-blue-600" />
                <Label className="font-medium">Shipping Speed</Label>
              </div>
              <RadioGroup value={quoteOptions.shipping} onValueChange={(value) => handleOptionsUpdate({ shipping: value })}>
                <div className="space-y-2">
                  {shippingOptions.map((option) => (
                    <div key={option.id} className="flex items-center space-x-3 p-3 rounded-lg border">
                      <RadioGroupItem value={option.id} id={`mobile-${option.id}`} />
                      <div className="flex items-center gap-2 flex-1">
                        <div className="text-blue-600">
                          {option.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`mobile-${option.id}`} className="font-medium cursor-pointer text-sm">
                              {option.name}
                            </Label>
                            {option.recommended && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                Rec
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{option.days}</span>
                          </div>
                        </div>
                        <div className="text-right text-sm font-semibold">
                          {option.price === 0 ? (
                            <span className="text-green-600">FREE</span>
                          ) : (
                            <span>+{formatCurrency(option.price, quote.customer_currency)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Insurance Toggle */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-green-600" />
                <Label className="font-medium">Package Protection</Label>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex-1">
                  <div className="font-medium text-sm">Package Insurance</div>
                  <div className="text-xs text-muted-foreground">
                    Coverage up to {formatCurrency(insuranceSettings.coverage, 'USD')}
                  </div>
                  {quoteOptions.insurance && (
                    <div className="text-xs text-green-600 font-medium mt-1">
                      +{formatCurrency(calculateInsuranceFee(), quote.customer_currency)}
                    </div>
                  )}
                </div>
                <Switch
                  checked={quoteOptions.insurance}
                  onCheckedChange={(checked) => handleOptionsUpdate({ insurance: checked })}
                />
              </div>
              
              {!insuranceSettings.enabled && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                  Insurance is currently disabled by admin settings.
                </div>
              )}
            </div>

            {/* Discount Code */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-purple-600" />
                <Label className="font-medium">Discount Code</Label>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code"
                    value={quoteOptions.discountCode}
                    onChange={(e) => handleOptionsUpdate({ discountCode: e.target.value.toUpperCase() })}
                    className={`flex-1 ${discountError ? 'border-red-300' : ''}`}
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleApplyDiscount}
                    disabled={discountApplied}
                    className="px-3"
                  >
                    Apply
                  </Button>
                </div>
                {discountError && (
                  <p className="text-sm text-red-600">{discountError}</p>
                )}
                {discountApplied && (
                  <p className="text-sm text-green-600 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Discount applied!
                  </p>
                )}
                
                {/* Quick discount hints */}
                <div className="grid grid-cols-1 gap-2">
                  <div className="p-2 bg-purple-50 rounded text-xs">
                    <span className="font-medium text-purple-900">Try: </span>
                    <code className="bg-purple-200 px-1 rounded font-mono">FIRST10</code> or 
                    <code className="bg-purple-200 px-1 rounded font-mono ml-1">BUNDLE20</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};