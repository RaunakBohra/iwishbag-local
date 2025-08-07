/**
 * QuoteOptionsCore - Base Component for Quote Options
 * 
 * Provides the foundational structure and logic for quote options selection
 * Can be customized for admin, customer desktop, and mobile interfaces
 * 
 * Features:
 * - Uses shared useQuoteOptions hook for state management
 * - Supports different UI variants (admin, customer, mobile)
 * - Real-time sync with WebSocket updates
 * - Optimistic updates with error handling
 * - Currency conversion and formatting
 * - Extensible design for future option types
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Truck, 
  Shield, 
  Tag, 
  Clock, 
  CheckCircle,
  Info,
  Zap,
  Package,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useQuoteOptions, type UseQuoteOptionsConfig } from '@/hooks/useQuoteOptions';
import { formatCurrency } from '@/lib/utils';

export interface QuoteOptionsCoreProps extends UseQuoteOptionsConfig {
  // UI variant configuration
  variant: 'admin' | 'customer' | 'mobile';
  
  // Display configuration
  formatCurrency: (amount: number, currency: string) => string;
  className?: string;
  
  // Feature toggles
  features?: {
    showShipping?: boolean;
    showInsurance?: boolean;
    showDiscounts?: boolean;
    showAdvancedOptions?: boolean;
    showRealTimeStatus?: boolean;
  };
  
  // Text customization
  labels?: {
    shipping?: string;
    insurance?: string;
    discounts?: string;
    applyButton?: string;
    removeButton?: string;
  };
  
  // Layout customization
  layout?: {
    compact?: boolean;
    horizontal?: boolean;
    hideHeaders?: boolean;
  };
}

export const QuoteOptionsCore: React.FC<QuoteOptionsCoreProps> = ({
  variant = 'customer',
  formatCurrency,
  className = "",
  features = {
    showShipping: true,
    showInsurance: true,
    showDiscounts: true,
    showAdvancedOptions: variant === 'admin',
    showRealTimeStatus: variant === 'admin'
  },
  labels = {
    shipping: variant === 'admin' ? 'Shipping Configuration' : 'Choose Shipping Speed',
    insurance: 'Package Protection',
    discounts: 'Discount Codes',
    applyButton: 'Apply',
    removeButton: 'Remove'
  },
  layout = {
    compact: variant === 'mobile',
    horizontal: false,
    hideHeaders: variant === 'mobile'
  },
  ...config
}) => {
  const {
    optionsState,
    isLoading,
    error,
    selectedShipping,
    insuranceEnabled,
    appliedDiscountCodes,
    adjustedTotal,
    totalSavings,
    actions,
    isConnected,
    subscriberCount,
    formState
  } = useQuoteOptions(config);

  // Loading state
  if (isLoading && !optionsState) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading quote options...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && !optionsState) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card className="border-red-200">
          <CardContent className="flex items-center justify-center py-8">
            <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
            <div>
              <p className="text-red-700 font-medium">Failed to load quote options</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={actions.refreshOptions}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!optionsState) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Real-time connection status (admin only) */}
      {features.showRealTimeStatus && (
        <div className="flex items-center justify-between text-sm text-gray-600 px-1">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span>Live sync active</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span>Offline</span>
              </>
            )}
          </div>
          {subscriberCount > 1 && (
            <Badge variant="secondary" className="text-xs">
              {subscriberCount} viewers
            </Badge>
          )}
        </div>
      )}

      {/* Shipping Options */}
      {features.showShipping && (
        <Card>
          {!layout.hideHeaders && (
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                {labels.shipping}
              </CardTitle>
            </CardHeader>
          )}
          <CardContent>
            {optionsState.shipping.available_options.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <Package className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p>No shipping options available</p>
              </div>
            ) : (
              <RadioGroup 
                value={selectedShipping || ''} 
                onValueChange={(value) => {
                  actions.updateShippingOption(value);
                }}
              >
                <div className="space-y-3">
                  {optionsState.shipping.available_options.map((option: any) => {
                    const isSelected = selectedShipping === option.id;
                    const additionalCost = option.price || 0;
                    
                    return (
                      <div key={option.id} className="relative">
                        <div className={`flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer transition-all ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                        }`}>
                          <RadioGroupItem value={option.id} id={option.id} />
                          <div className="flex items-center gap-3 flex-1">
                            <div className="text-blue-600">
                              {option.carrier === 'FedEx' ? <Zap className="w-5 h-5" /> :
                               option.carrier === 'DHL' ? <Truck className="w-5 h-5" /> :
                               <Package className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={option.id} className="font-medium cursor-pointer">
                                  {option.name || `${option.carrier || 'Standard'} Shipping`}
                                </Label>
                                {isSelected && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                                    Selected
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {option.carrier || 'Standard'} - {option.min_days}-{option.max_days} days delivery
                              </p>
                              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{option.min_days}-{option.max_days} days</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Package className="w-3 h-3" />
                                  <span>{option.carrier || 'Standard'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {additionalCost === 0 ? (
                                  <span className="text-green-600">Included</span>
                                ) : (
                                  <span>+{formatCurrency(additionalCost, optionsState.shipping.cost_currency)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            )}
          </CardContent>
        </Card>
      )}

      {/* Insurance Options */}
      {features.showInsurance && optionsState.insurance.available && (
        <Card>
          {!layout.hideHeaders && (
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                {labels.insurance}
              </CardTitle>
            </CardHeader>
          )}
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium">Package Insurance</div>
                  <div className="text-sm text-muted-foreground">
                    Coverage up to {formatCurrency(optionsState.insurance.coverage_amount, 'USD')}
                  </div>
                  {insuranceEnabled && (
                    <div className="text-sm text-green-600 font-medium mt-1">
                      +{formatCurrency(optionsState.insurance.cost, optionsState.insurance.cost_currency)}
                    </div>
                  )}
                </div>
              </div>
              <Switch
                checked={insuranceEnabled}
                onCheckedChange={(checked) => {
                  actions.toggleInsurance(checked);
                }}
                disabled={isLoading}
              />
            </div>

            {/* Insurance details */}
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
                    Rate: {optionsState.insurance.rate_percentage}% 
                    (min: {formatCurrency(2, 'USD')}, max: {formatCurrency(50, 'USD')})
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discount Codes */}
      {features.showDiscounts && (
        <Card>
          {!layout.hideHeaders && (
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-600" />
                {labels.discounts}
              </CardTitle>
            </CardHeader>
          )}
          <CardContent>
            {/* Applied discounts */}
            {Array.isArray(appliedDiscountCodes) && appliedDiscountCodes.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-sm font-medium text-green-700">Applied discounts:</p>
                {appliedDiscountCodes.map((code) => (
                  <div key={code} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-mono text-sm">{code}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => actions.removeDiscountCode(code)}
                      className="text-green-700 hover:text-green-900"
                    >
                      {labels.removeButton}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Discount code input */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Enter discount code"
                    value={formState.discountCode}
                    onChange={(e) => formState.setDiscountCode(e.target.value.toUpperCase())}
                    className={formState.discountError ? 'border-red-300' : ''}
                    disabled={formState.discountLoading}
                  />
                  {formState.discountError && (
                    <p className="text-sm text-red-600 mt-1">{formState.discountError}</p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    actions.applyDiscountCode(formState.discountCode);
                  }}
                  disabled={formState.discountLoading || !formState.discountCode.trim()}
                >
                  {formState.discountLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    labels.applyButton
                  )}
                </Button>
              </div>

              {/* Available discount hints */}
              {variant === 'customer' && (
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="font-medium text-purple-900 text-sm mb-1">First-time customers</div>
                    <div className="text-purple-700 text-sm">
                      Use code <code className="font-mono bg-purple-200 px-1 rounded">FIRST10</code> for 10% off
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="font-medium text-purple-900 text-sm mb-1">Bundle savings</div>
                    <div className="text-purple-700 text-sm">
                      Use code <code className="font-mono bg-purple-200 px-1 rounded">BUNDLE20</code> for 20% off
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Updated Total Summary */}
      {(totalSavings > 0 || adjustedTotal !== optionsState.totals.base_total) && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-900">Updated Total</p>
                <p className="text-sm text-green-700">Including your selections</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(adjustedTotal, optionsState.totals.currency)}
                </div>
                {totalSavings > 0 && (
                  <div className="text-sm text-green-700">
                    You save {formatCurrency(totalSavings, optionsState.totals.currency)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};