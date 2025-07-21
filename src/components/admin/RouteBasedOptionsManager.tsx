// ============================================================================
// ROUTE-BASED OPTIONS MANAGER - Admin Interface for Handling & Insurance Config
// Allows admins to configure handling charges and insurance options per delivery option
// Integrates with existing shipping route management system
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Package, Shield, Calculator, Info, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import type {
  DeliveryOption,
  RouteHandlingChargeConfig,
  RouteInsuranceConfig,
} from '../../types/shipping';

interface RouteBasedOptionsManagerProps {
  deliveryOptions: DeliveryOption[];
  onUpdateDeliveryOptions: (options: DeliveryOption[]) => void;
  currencySymbol?: string;
}

export const RouteBasedOptionsManager: React.FC<RouteBasedOptionsManagerProps> = ({
  deliveryOptions,
  onUpdateDeliveryOptions,
  currencySymbol = '$',
}) => {
  console.log('RouteBasedOptionsManager rendered with', { deliveryOptions, currencySymbol });

  // Early return with debug UI if no delivery options
  if (!deliveryOptions || deliveryOptions.length === 0) {
    return (
      <Card className="mt-6 border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-600">Route-Based Options Manager (DEBUG)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            No delivery options available yet. Add delivery options above to configure handling
            charges and insurance.
          </p>
        </CardContent>
      </Card>
    );
  }
  const [expandedOptions, setExpandedOptions] = useState<Record<string, boolean>>({});

  // Toggle expansion for a delivery option
  const toggleExpanded = (optionId: string) => {
    setExpandedOptions((prev) => ({
      ...prev,
      [optionId]: !prev[optionId],
    }));
  };

  // Update handling charge for a delivery option
  const updateHandlingCharge = (
    optionId: string,
    handlingCharge: RouteHandlingChargeConfig | undefined,
  ) => {
    const updatedOptions = deliveryOptions.map((option) =>
      option.id === optionId ? { ...option, handling_charge: handlingCharge } : option,
    );
    onUpdateDeliveryOptions(updatedOptions);
  };

  // Update insurance options for a delivery option
  const updateInsuranceOptions = (
    optionId: string,
    insuranceOptions: RouteInsuranceConfig | undefined,
  ) => {
    const updatedOptions = deliveryOptions.map((option) =>
      option.id === optionId ? { ...option, insurance_options: insuranceOptions } : option,
    );
    onUpdateDeliveryOptions(updatedOptions);
  };

  // Add handling charge to delivery option
  const addHandlingCharge = (optionId: string) => {
    const defaultHandling: RouteHandlingChargeConfig = {
      base_fee: 5.0,
      percentage_of_value: 2.0,
      min_fee: 3.0,
      max_fee: 50.0,
    };
    updateHandlingCharge(optionId, defaultHandling);
  };

  // Add insurance options to delivery option
  const addInsuranceOptions = (optionId: string) => {
    const defaultInsurance: RouteInsuranceConfig = {
      available: true,
      default_enabled: false,
      coverage_percentage: 1.5,
      min_fee: 2.0,
      max_coverage: 5000.0,
      customer_description: 'Protect your package against loss, damage, or theft during shipping',
    };
    updateInsuranceOptions(optionId, defaultInsurance);
  };

  // Calculate example costs for preview
  const calculateExampleCosts = (option: DeliveryOption, itemValue: number = 100) => {
    let handlingCost = 0;
    let insuranceCost = 0;

    if (option.handling_charge) {
      const baseHandling = option.handling_charge.base_fee;
      const percentageHandling = (itemValue * option.handling_charge.percentage_of_value) / 100;
      const totalHandling = baseHandling + percentageHandling;
      handlingCost = Math.max(
        option.handling_charge.min_fee,
        Math.min(option.handling_charge.max_fee, totalHandling),
      );
    }

    if (option.insurance_options?.available) {
      const calculatedInsurance = (itemValue * option.insurance_options.coverage_percentage) / 100;
      insuranceCost = Math.max(
        option.insurance_options.min_fee,
        Math.min(option.insurance_options.max_coverage, calculatedInsurance),
      );
    }

    return { handlingCost, insuranceCost };
  };

  return (
    <div className="route-based-options-manager space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Calculator className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-medium">Route-Based Options Configuration</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-gray-500" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs">
                <p className="font-medium mb-1">Configure Per Delivery Option:</p>
                <p className="text-sm">• Handling charges with flexible pricing models</p>
                <p className="text-sm">• Insurance options with customer descriptions</p>
                <p className="text-sm">• Settings apply only to this specific route</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {deliveryOptions.map((option) => {
        const isExpanded = expandedOptions[option.id];
        const { handlingCost, insuranceCost } = calculateExampleCosts(option);

        return (
          <Card key={option.id} className="border-l-4 border-l-blue-500">
            <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(option.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div>
                        <CardTitle className="text-base flex items-center space-x-2">
                          <span>
                            {option.carrier} - {option.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {option.min_days}-{option.max_days} days
                          </Badge>
                        </CardTitle>
                        <div className="text-sm text-gray-600 mt-1">
                          Base shipping: {currencySymbol}
                          {option.price.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Configuration Status */}
                      <div className="flex items-center space-x-2">
                        {option.handling_charge && (
                          <Badge variant="secondary" className="text-xs">
                            <Package className="w-3 h-3 mr-1" />
                            Handling: {currencySymbol}
                            {handlingCost.toFixed(2)}
                          </Badge>
                        )}

                        {option.insurance_options?.available && (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Insurance: {currencySymbol}
                            {insuranceCost.toFixed(2)}
                          </Badge>
                        )}
                      </div>

                      <Button variant="ghost" size="sm" type="button">
                        {isExpanded ? 'Collapse' : 'Configure'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Handling Charge Configuration */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-blue-600" />
                          <h4 className="font-medium">Handling Charges</h4>
                        </div>

                        {!option.handling_charge ? (
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => addHandlingCharge(option.id)}
                            className="flex items-center space-x-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Handling</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => updateHandlingCharge(option.id, undefined)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>

                      {option.handling_charge ? (
                        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`${option.id}-base-fee`} className="text-xs">
                                Base Fee ({currencySymbol})
                              </Label>
                              <Input
                                id={`${option.id}-base-fee`}
                                type="number"
                                step="0.01"
                                value={option.handling_charge.base_fee}
                                onChange={(e) =>
                                  updateHandlingCharge(option.id, {
                                    ...option.handling_charge!,
                                    base_fee: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="h-8"
                              />
                            </div>

                            <div>
                              <Label htmlFor={`${option.id}-percentage`} className="text-xs">
                                Value Percentage (%)
                              </Label>
                              <Input
                                id={`${option.id}-percentage`}
                                type="number"
                                step="0.1"
                                value={option.handling_charge.percentage_of_value}
                                onChange={(e) =>
                                  updateHandlingCharge(option.id, {
                                    ...option.handling_charge!,
                                    percentage_of_value: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="h-8"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`${option.id}-min-fee`} className="text-xs">
                                Minimum Fee ({currencySymbol})
                              </Label>
                              <Input
                                id={`${option.id}-min-fee`}
                                type="number"
                                step="0.01"
                                value={option.handling_charge.min_fee}
                                onChange={(e) =>
                                  updateHandlingCharge(option.id, {
                                    ...option.handling_charge!,
                                    min_fee: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="h-8"
                              />
                            </div>

                            <div>
                              <Label htmlFor={`${option.id}-max-fee`} className="text-xs">
                                Maximum Fee ({currencySymbol})
                              </Label>
                              <Input
                                id={`${option.id}-max-fee`}
                                type="number"
                                step="0.01"
                                value={option.handling_charge.max_fee}
                                onChange={(e) =>
                                  updateHandlingCharge(option.id, {
                                    ...option.handling_charge!,
                                    max_fee: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="h-8"
                              />
                            </div>
                          </div>

                          <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                            <strong>Example:</strong> For {currencySymbol}100 order: Base (
                            {currencySymbol}
                            {option.handling_charge.base_fee}) + Percentage ({currencySymbol}
                            {((100 * option.handling_charge.percentage_of_value) / 100).toFixed(2)})
                            =
                            <strong>
                              {' '}
                              {currencySymbol}
                              {handlingCost.toFixed(2)}
                            </strong>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg text-center">
                          No handling charges configured. Customers will see standard calculation.
                        </div>
                      )}
                    </div>

                    {/* Insurance Options Configuration */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Shield className="w-4 h-4 text-green-600" />
                          <h4 className="font-medium">Insurance Options</h4>
                        </div>

                        {!option.insurance_options ? (
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => addInsuranceOptions(option.id)}
                            className="flex items-center space-x-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Insurance</span>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => updateInsuranceOptions(option.id, undefined)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>

                      {option.insurance_options ? (
                        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Insurance Available</Label>
                            <Switch
                              checked={option.insurance_options.available}
                              onCheckedChange={(checked) =>
                                updateInsuranceOptions(option.id, {
                                  ...option.insurance_options!,
                                  available: checked,
                                })
                              }
                            />
                          </div>

                          {option.insurance_options.available && (
                            <>
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Default Enabled</Label>
                                <Switch
                                  checked={option.insurance_options.default_enabled}
                                  onCheckedChange={(checked) =>
                                    updateInsuranceOptions(option.id, {
                                      ...option.insurance_options!,
                                      default_enabled: checked,
                                    })
                                  }
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label
                                    htmlFor={`${option.id}-coverage-percentage`}
                                    className="text-xs"
                                  >
                                    Coverage Percentage (%)
                                  </Label>
                                  <Input
                                    id={`${option.id}-coverage-percentage`}
                                    type="number"
                                    step="0.1"
                                    value={option.insurance_options.coverage_percentage}
                                    onChange={(e) =>
                                      updateInsuranceOptions(option.id, {
                                        ...option.insurance_options!,
                                        coverage_percentage: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="h-8"
                                  />
                                </div>

                                <div>
                                  <Label htmlFor={`${option.id}-insurance-min`} className="text-xs">
                                    Minimum Fee ({currencySymbol})
                                  </Label>
                                  <Input
                                    id={`${option.id}-insurance-min`}
                                    type="number"
                                    step="0.01"
                                    value={option.insurance_options.min_fee}
                                    onChange={(e) =>
                                      updateInsuranceOptions(option.id, {
                                        ...option.insurance_options!,
                                        min_fee: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="h-8"
                                  />
                                </div>
                              </div>

                              <div>
                                <Label htmlFor={`${option.id}-max-coverage`} className="text-xs">
                                  Maximum Coverage ({currencySymbol})
                                </Label>
                                <Input
                                  id={`${option.id}-max-coverage`}
                                  type="number"
                                  step="0.01"
                                  value={option.insurance_options.max_coverage}
                                  onChange={(e) =>
                                    updateInsuranceOptions(option.id, {
                                      ...option.insurance_options!,
                                      max_coverage: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="h-8"
                                />
                              </div>

                              <div>
                                <Label htmlFor={`${option.id}-description`} className="text-xs">
                                  Customer Description
                                </Label>
                                <Textarea
                                  id={`${option.id}-description`}
                                  value={option.insurance_options.customer_description}
                                  onChange={(e) =>
                                    updateInsuranceOptions(option.id, {
                                      ...option.insurance_options!,
                                      customer_description: e.target.value,
                                    })
                                  }
                                  className="h-16 text-xs"
                                  placeholder="Describe insurance coverage for customers..."
                                />
                              </div>

                              <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                                <strong>Example:</strong> For {currencySymbol}100 order:
                                {option.insurance_options.coverage_percentage}% =
                                <strong>
                                  {' '}
                                  {currencySymbol}
                                  {insuranceCost.toFixed(2)}
                                </strong>{' '}
                                coverage fee
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg text-center">
                          No insurance options configured. Insurance will not be available for this
                          delivery method.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Combined Preview */}
                  {(option.handling_charge || option.insurance_options?.available) && (
                    <>
                      <Separator className="my-4" />
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h5 className="font-medium text-sm mb-2 flex items-center">
                          <Calculator className="w-4 h-4 mr-2 text-blue-600" />
                          Total Cost Preview (for {currencySymbol}100 order)
                        </h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="flex justify-between">
                              <span>Base Shipping:</span>
                              <span>
                                {currencySymbol}
                                {option.price.toFixed(2)}
                              </span>
                            </div>
                            {option.handling_charge && (
                              <div className="flex justify-between">
                                <span>Handling Charge:</span>
                                <span>
                                  {currencySymbol}
                                  {handlingCost.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {option.insurance_options?.available && (
                              <div className="flex justify-between">
                                <span>Insurance (optional):</span>
                                <span>
                                  {currencySymbol}
                                  {insuranceCost.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="border-l pl-4">
                            <div className="flex justify-between font-medium">
                              <span>Total (without insurance):</span>
                              <span>
                                {currencySymbol}
                                {(option.price + handlingCost).toFixed(2)}
                              </span>
                            </div>
                            {option.insurance_options?.available && (
                              <div className="flex justify-between font-medium text-blue-600">
                                <span>Total (with insurance):</span>
                                <span>
                                  {currencySymbol}
                                  {(option.price + handlingCost + insuranceCost).toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {deliveryOptions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-gray-600">
              No delivery options configured. Add delivery options first to configure handling
              charges and insurance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
