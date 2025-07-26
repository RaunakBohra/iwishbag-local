/**
 * PER-ITEM VALUATION SELECTOR
 *
 * Granular valuation method selection component for individual items within quotes.
 * Provides fine-grained control over whether to use actual price, minimum valuation,
 * or admin-specified amounts for tax calculations on a per-item basis.
 *
 * Features:
 * - Individual item valuation method selection
 * - Real-time tax calculation preview
 * - Visual comparison between valuation methods
 * - Currency conversion transparency
 * - Admin override capabilities with audit logging
 * - Integration with PerItemTaxCalculator service
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calculator,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  Edit3,
  RefreshCw,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PerItemTaxCalculator, {
  ItemTaxBreakdown,
  QuoteItem,
  TaxCalculationContext,
} from '@/services/PerItemTaxCalculator';

interface ValuationMethod {
  id: 'actual_price' | 'minimum_valuation' | 'higher_of_both' | 'admin_override';
  name: string;
  description: string;
  icon: React.ReactNode;
  badge_color: 'default' | 'secondary' | 'destructive' | 'outline';
}

interface ItemValuationData {
  item_id: string;
  current_method: string;
  actual_price: number;
  minimum_valuation?: number;
  admin_override_amount?: number;
  currency: string;
  tax_preview: {
    customs_amount: number;
    local_tax_amount: number;
    total_tax: number;
  };
  method_comparison: {
    actual_price_tax: number;
    minimum_valuation_tax: number;
    difference_amount: number;
    difference_percent: number;
  };
}

interface PerItemValuationSelectorProps {
  items: QuoteItem[];
  quoteId: string;
  originCountry: string;
  destinationCountry: string;
  currentValuationMethods?: Record<string, string>; // item_id -> method
  onValuationChange: (itemId: string, method: string, amount?: number) => void;
  adminId?: string;
  isLoading?: boolean;
  className?: string;
  // Display options
  showComparison?: boolean;
  showPreview?: boolean;
  allowAdminOverride?: boolean;
  compactMode?: boolean;
}

export const PerItemValuationSelector: React.FC<PerItemValuationSelectorProps> = ({
  items,
  quoteId,
  originCountry,
  destinationCountry,
  currentValuationMethods = {},
  onValuationChange,
  adminId,
  isLoading = false,
  className = '',
  showComparison = true,
  showPreview = true,
  allowAdminOverride = true,
  compactMode = false,
}) => {
  const { toast } = useToast();

  // Core state
  const [itemValuationData, setItemValuationData] = useState<Record<string, ItemValuationData>>({});
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [editingOverride, setEditingOverride] = useState<string>(''); // item_id being edited
  const [overrideAmounts, setOverrideAmounts] = useState<Record<string, number>>({});

  // Services
  const [taxCalculator] = useState(() => PerItemTaxCalculator.getInstance());

  // Available valuation methods
  const valuationMethods: ValuationMethod[] = [
    {
      id: 'actual_price',
      name: 'Actual Price',
      description: 'Use the original item price for tax calculations',
      icon: <DollarSign className="h-4 w-4" />,
      badge_color: 'default',
    },
    {
      id: 'minimum_valuation',
      name: 'Minimum Valuation',
      description: 'Use HSN minimum valuation (currency converted)',
      icon: <TrendingUp className="h-4 w-4" />,
      badge_color: 'secondary',
    },
    {
      id: 'higher_of_both',
      name: 'Higher Amount',
      description: 'Automatically use the higher of actual price or minimum valuation',
      icon: <Zap className="h-4 w-4" />,
      badge_color: 'outline',
    },
    ...(allowAdminOverride
      ? [
          {
            id: 'admin_override' as const,
            name: 'Admin Override',
            description: 'Manually specify valuation amount',
            icon: <Edit3 className="h-4 w-4" />,
            badge_color: 'destructive' as const,
          },
        ]
      : []),
  ];

  /**
   * Calculate tax breakdown for all items with current valuation methods
   */
  const calculateAllItemTaxes = async () => {
    if (!items.length || isCalculating) return;

    setIsCalculating(true);

    try {
      const context: TaxCalculationContext = {
        route: {
          id: 1, // Dummy route ID - will be resolved by calculator
          origin_country: originCountry,
          destination_country: destinationCountry,
        },
        admin_id: adminId,
        calculation_date: new Date(),
      };

      const newValuationData: Record<string, ItemValuationData> = {};

      // Calculate taxes for each item
      for (const item of items) {
        if (!item.hsn_code) continue; // Skip items without HSN codes

        const currentMethod = currentValuationMethods[item.id] || 'higher_of_both';

        // Calculate with different valuation methods for comparison
        const actualPriceContext = { ...context, valuation_method_preference: 'actual_price' };
        const minValuationContext = {
          ...context,
          valuation_method_preference: 'minimum_valuation',
        };
        const currentMethodContext = { ...context, valuation_method_preference: currentMethod };

        const [actualPriceBreakdown, minValuationBreakdown, currentBreakdown] = await Promise.all([
          taxCalculator.calculateItemTax(item, actualPriceContext),
          taxCalculator.calculateItemTax(item, minValuationContext),
          taxCalculator.calculateItemTax(item, currentMethodContext),
        ]);

        if (currentBreakdown) {
          const actualPriceTax = actualPriceBreakdown?.total_taxes || 0;
          const minValuationTax = minValuationBreakdown?.total_taxes || 0;

          newValuationData[item.id] = {
            item_id: item.id,
            current_method: currentMethod,
            actual_price: item.price_origin_currency,
            minimum_valuation: minValuationBreakdown?.minimum_valuation_conversion?.convertedAmount,
            admin_override_amount: overrideAmounts[item.id],
            currency: minValuationBreakdown?.minimum_valuation_conversion?.originCurrency || 'USD',
            tax_preview: {
              customs_amount: currentBreakdown.total_customs,
              local_tax_amount: currentBreakdown.total_local_taxes,
              total_tax: currentBreakdown.total_taxes,
            },
            method_comparison: {
              actual_price_tax: actualPriceTax,
              minimum_valuation_tax: minValuationTax,
              difference_amount: Math.abs(actualPriceTax - minValuationTax),
              difference_percent:
                actualPriceTax > 0
                  ? Math.abs(((actualPriceTax - minValuationTax) / actualPriceTax) * 100)
                  : 0,
            },
          };
        }
      }

      setItemValuationData(newValuationData);
    } catch (error) {
      console.error('PerItemValuationSelector: Calculation error:', error);
      toast({
        title: 'Calculation Error',
        description: 'Failed to calculate item tax breakdowns. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  /**
   * Handle valuation method change for an item
   */
  const handleValuationMethodChange = async (itemId: string, method: string) => {
    try {
      // Log the change for audit purposes
      if (adminId) {
        await supabase.rpc('log_valuation_method_change', {
          p_quote_id: quoteId,
          p_item_id: itemId,
          p_admin_id: adminId,
          p_valuation_method: method,
          p_change_reason: `Admin selected ${method} valuation via PerItemValuationSelector`,
          p_change_details: {
            previous_method: currentValuationMethods[itemId] || 'higher_of_both',
            item_name: items.find((i) => i.id === itemId)?.name,
            route: `${originCountry} → ${destinationCountry}`,
            timestamp: new Date().toISOString(),
            ui_component: 'PerItemValuationSelector',
          },
        });
      }

      // Update local state
      const updatedMethods = { ...currentValuationMethods, [itemId]: method };

      // Notify parent component
      onValuationChange(itemId, method, overrideAmounts[itemId]);

      // Recalculate taxes with new method
      await calculateAllItemTaxes();

      toast({
        title: 'Method Updated',
        description: `Valuation method changed to ${valuationMethods.find((m) => m.id === method)?.name}`,
      });
    } catch (error) {
      console.error('PerItemValuationSelector: Method change error:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update valuation method. Please try again.',
        variant: 'destructive',
      });
    }
  };

  /**
   * Handle admin override amount change
   */
  const handleOverrideAmountChange = (itemId: string, amount: number) => {
    setOverrideAmounts((prev) => ({ ...prev, [itemId]: amount }));
  };

  /**
   * Save admin override amount
   */
  const saveOverrideAmount = async (itemId: string) => {
    const amount = overrideAmounts[itemId];
    if (!amount || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid override amount greater than 0.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Log the override for audit purposes
      if (adminId) {
        await supabase.rpc('log_valuation_override', {
          p_quote_id: quoteId,
          p_item_id: itemId,
          p_admin_id: adminId,
          p_override_amount: amount,
          p_change_reason: `Admin override valuation via PerItemValuationSelector`,
          p_change_details: {
            item_name: items.find((i) => i.id === itemId)?.name,
            original_amount: items.find((i) => i.id === itemId)?.price_origin_currency,
            override_amount: amount,
            route: `${originCountry} → ${destinationCountry}`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Update valuation method to admin_override
      await handleValuationMethodChange(itemId, 'admin_override');

      setEditingOverride('');

      onValuationChange(itemId, 'admin_override', amount);

      toast({
        title: 'Override Saved',
        description: `Admin override amount of ${amount} saved for item.`,
      });
    } catch (error) {
      console.error('PerItemValuationSelector: Override save error:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save override amount. Please try again.',
        variant: 'destructive',
      });
    }
  };

  /**
   * Get method badge variant
   */
  const getMethodBadge = (method: ValuationMethod, isSelected: boolean) => {
    if (isSelected) {
      return <Badge variant={method.badge_color}>{method.name}</Badge>;
    }
    return <Badge variant="outline">{method.name}</Badge>;
  };

  /**
   * Format currency amount
   */
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Initialize calculations on component mount
  useEffect(() => {
    if (items.length > 0) {
      calculateAllItemTaxes();
    }
  }, [items, currentValuationMethods]);

  // Set first item as selected by default
  useEffect(() => {
    if (items.length > 0 && !selectedItemId) {
      setSelectedItemId(items[0].id);
    }
  }, [items]);

  if (compactMode) {
    // Compact mode: show summary only
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Item Valuation Methods</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={calculateAllItemTaxes}
            disabled={isCalculating}
            className="flex items-center space-x-1"
          >
            <RefreshCw className={`h-3 w-3 ${isCalculating ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {items
            .filter((item) => item.hsn_code)
            .map((item) => {
              const valuationData = itemValuationData[item.id];
              const currentMethod = currentValuationMethods[item.id] || 'higher_of_both';
              const method = valuationMethods.find((m) => m.id === currentMethod);

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                    <div className="text-xs text-gray-500">HSN: {item.hsn_code}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {method && getMethodBadge(method, true)}
                    {valuationData && (
                      <div className="text-xs text-gray-600">
                        Tax:{' '}
                        {formatCurrency(
                          valuationData.tax_preview.total_tax,
                          valuationData.currency,
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Per-Item Valuation Selection</h3>
          <p className="text-sm text-gray-600">
            Configure valuation methods for individual items with HSN codes
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={calculateAllItemTaxes}
            disabled={isCalculating}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isCalculating ? 'animate-spin' : ''}`} />
            <span>Recalculate All</span>
          </Button>
        </div>
      </div>

      {/* Item selection and method configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Items with HSN Codes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items
              .filter((item) => item.hsn_code)
              .map((item) => {
                const valuationData = itemValuationData[item.id];
                const isSelected = selectedItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          HSN: {item.hsn_code} • {formatCurrency(item.price_origin_currency)}
                        </div>
                      </div>
                      {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                    </div>

                    {valuationData && (
                      <div className="mt-2 flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {
                            valuationMethods.find((m) => m.id === valuationData.current_method)
                              ?.name
                          }
                        </Badge>
                        <div className="text-xs text-gray-600">
                          Tax:{' '}
                          {formatCurrency(
                            valuationData.tax_preview.total_tax,
                            valuationData.currency,
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            {items.filter((item) => item.hsn_code).length === 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No items with HSN codes found. HSN codes are required for per-item valuation.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Method Selection and Configuration */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Valuation Method Configuration
              {selectedItemId && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  for {items.find((i) => i.id === selectedItemId)?.name}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedItemId && itemValuationData[selectedItemId] ? (
              <Tabs defaultValue="methods" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="methods">Methods</TabsTrigger>
                  {showComparison && <TabsTrigger value="comparison">Comparison</TabsTrigger>}
                  {showPreview && <TabsTrigger value="preview">Tax Preview</TabsTrigger>}
                </TabsList>

                {/* Method Selection Tab */}
                <TabsContent value="methods" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {valuationMethods.map((method) => {
                      const isSelected = currentValuationMethods[selectedItemId] === method.id;
                      const valuationData = itemValuationData[selectedItemId];

                      return (
                        <div
                          key={method.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            isSelected ? 'border-primary bg-primary/5' : 'hover:border-gray-300'
                          } ${isLoading || isCalculating ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() =>
                            !isLoading &&
                            !isCalculating &&
                            handleValuationMethodChange(selectedItemId, method.id)
                          }
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`p-1 rounded ${isSelected ? 'bg-primary text-white' : 'bg-gray-100'}`}
                              >
                                {method.icon}
                              </div>
                              <span className="font-medium">{method.name}</span>
                            </div>
                            {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                          </div>

                          <p className="text-sm text-gray-600 mb-3">{method.description}</p>

                          {method.id === 'admin_override' && isSelected && (
                            <div className="space-y-2">
                              <Label htmlFor="override-amount">Override Amount</Label>
                              <div className="flex space-x-2">
                                <Input
                                  id="override-amount"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={overrideAmounts[selectedItemId] || ''}
                                  onChange={(e) =>
                                    handleOverrideAmountChange(
                                      selectedItemId,
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  placeholder="Enter amount..."
                                  className="flex-1"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => saveOverrideAmount(selectedItemId)}
                                  disabled={
                                    !overrideAmounts[selectedItemId] ||
                                    overrideAmounts[selectedItemId] <= 0
                                  }
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          )}

                          {valuationData && isSelected && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-sm font-medium text-gray-700">
                                Current Tax:{' '}
                                {formatCurrency(
                                  valuationData.tax_preview.total_tax,
                                  valuationData.currency,
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Comparison Tab */}
                {showComparison && (
                  <TabsContent value="comparison" className="space-y-4">
                    {itemValuationData[selectedItemId] && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card className="p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <DollarSign className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">Actual Price Method</span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-2xl font-bold text-blue-600">
                                {formatCurrency(
                                  itemValuationData[selectedItemId].method_comparison
                                    .actual_price_tax,
                                  itemValuationData[selectedItemId].currency,
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                Based on item price:{' '}
                                {formatCurrency(
                                  itemValuationData[selectedItemId].actual_price,
                                  itemValuationData[selectedItemId].currency,
                                )}
                              </div>
                            </div>
                          </Card>

                          <Card className="p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="font-medium">Minimum Valuation Method</span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-2xl font-bold text-green-600">
                                {formatCurrency(
                                  itemValuationData[selectedItemId].method_comparison
                                    .minimum_valuation_tax,
                                  itemValuationData[selectedItemId].currency,
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                Based on minimum:{' '}
                                {itemValuationData[selectedItemId].minimum_valuation
                                  ? formatCurrency(
                                      itemValuationData[selectedItemId].minimum_valuation!,
                                      itemValuationData[selectedItemId].currency,
                                    )
                                  : 'Not available'}
                              </div>
                            </div>
                          </Card>
                        </div>

                        <Card className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Tax Difference Analysis</span>
                            <Badge
                              variant={
                                itemValuationData[selectedItemId].method_comparison
                                  .difference_percent > 10
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {itemValuationData[
                                selectedItemId
                              ].method_comparison.difference_percent.toFixed(1)}
                              % difference
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-lg font-semibold">
                              {formatCurrency(
                                itemValuationData[selectedItemId].method_comparison
                                  .difference_amount,
                                itemValuationData[selectedItemId].currency,
                              )}
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <div className="text-sm text-gray-600">
                              {itemValuationData[selectedItemId].method_comparison
                                .actual_price_tax >
                              itemValuationData[selectedItemId].method_comparison
                                .minimum_valuation_tax
                                ? 'Actual price results in higher tax'
                                : 'Minimum valuation results in higher tax'}
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}
                  </TabsContent>
                )}

                {/* Tax Preview Tab */}
                {showPreview && (
                  <TabsContent value="preview" className="space-y-4">
                    {itemValuationData[selectedItemId] && (
                      <div className="space-y-4">
                        <Card className="p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <Calculator className="h-5 w-5 text-primary" />
                            <span className="font-medium">Current Tax Breakdown</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-orange-600">
                                {formatCurrency(
                                  itemValuationData[selectedItemId].tax_preview.customs_amount,
                                  itemValuationData[selectedItemId].currency,
                                )}
                              </div>
                              <div className="text-sm text-gray-600">Customs Duty</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {formatCurrency(
                                  itemValuationData[selectedItemId].tax_preview.local_tax_amount,
                                  itemValuationData[selectedItemId].currency,
                                )}
                              </div>
                              <div className="text-sm text-gray-600">Local Tax (GST/VAT)</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">
                                {formatCurrency(
                                  itemValuationData[selectedItemId].tax_preview.total_tax,
                                  itemValuationData[selectedItemId].currency,
                                )}
                              </div>
                              <div className="text-sm text-gray-600">Total Tax</div>
                            </div>
                          </div>

                          <Separator className="my-4" />

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Valuation Method:</span>
                            <Badge variant="outline">
                              {
                                valuationMethods.find(
                                  (m) => m.id === itemValuationData[selectedItemId].current_method,
                                )?.name
                              }
                            </Badge>
                          </div>
                        </Card>
                      </div>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {selectedItemId ? (
                  <div className="space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <div>Calculating tax breakdown...</div>
                  </div>
                ) : (
                  <div>Select an item to configure valuation method</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
