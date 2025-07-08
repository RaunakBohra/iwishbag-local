import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminQuoteFormSchema, AdminQuoteFormValues } from '@/components/admin/admin-quote-form-validation';
import { useOptimizedQuoteCalculation, useRealTimeQuoteCalculation } from '@/hooks/useOptimizedQuoteCalculation';
import { QuoteCalculationParams } from '@/services/QuoteCalculatorService';
import { useAllCountries } from '@/hooks/useAllCountries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Clock, Zap, BarChart3, RefreshCw } from 'lucide-react';

interface OptimizedQuoteCalculatorProps {
  initialData?: Partial<AdminQuoteFormValues>;
  onCalculationComplete?: (result: any) => void;
  realTimeMode?: boolean;
  showPerformanceMetrics?: boolean;
}

export const OptimizedQuoteCalculator: React.FC<OptimizedQuoteCalculatorProps> = ({
  initialData,
  onCalculationComplete,
  realTimeMode = true,
  showPerformanceMetrics = false
}) => {
  const { data: allCountries } = useAllCountries();
  const [lastCalculationTime, setLastCalculationTime] = useState<number>(0);

  // Form setup
  const form = useForm<AdminQuoteFormValues>({
    resolver: zodResolver(adminQuoteFormSchema),
    defaultValues: {
      items: [{ 
        id: '1', 
        item_price: 100, 
        item_weight: 1, 
        quantity: 1, 
        product_name: 'Sample Product' 
      }],
      country_code: 'US',
      currency: 'USD',
      final_currency: 'USD',
      sales_tax_price: 0,
      merchant_shipping_price: 0,
      domestic_shipping: 0,
      handling_charge: 0,
      discount: 0,
      insurance_amount: 0,
      customs_percentage: 6,
      ...initialData
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  // Watch form values for real-time calculations
  const watchedValues = form.watch();

  // Optimized calculation hook
  const {
    calculateQuote,
    result: calculationResult,
    isCalculating,
    error,
    performanceMetrics,
    cacheStats,
    clearCache
  } = useOptimizedQuoteCalculation({
    onCalculationComplete: (result) => {
      setLastCalculationTime(Date.now());
      onCalculationComplete?.(result);
    }
  });

  // Prepare calculation parameters
  const calculationParams = useMemo((): QuoteCalculationParams | null => {
    if (!allCountries || !watchedValues.country_code) return null;

    const countrySettings = allCountries.find(c => c.code === watchedValues.country_code);
    if (!countrySettings) return null;

    return {
      items: watchedValues.items || [],
      originCountry: watchedValues.country_code,
      destinationCountry: 'IN', // Default for demo
      currency: watchedValues.currency || 'USD',
      sales_tax_price: watchedValues.sales_tax_price,
      merchant_shipping_price: watchedValues.merchant_shipping_price,
      domestic_shipping: watchedValues.domestic_shipping,
      handling_charge: watchedValues.handling_charge,
      discount: watchedValues.discount,
      insurance_amount: watchedValues.insurance_amount,
      customs_percentage: watchedValues.customs_percentage,
      countrySettings
    };
  }, [watchedValues, allCountries]);

  // Real-time calculation
  const {
    result: realTimeResult,
    isCalculating: isRealTimeCalculating
  } = useRealTimeQuoteCalculation(
    realTimeMode ? calculationParams : null,
    {
      debounceMs: 800,
      enabled: realTimeMode,
      onCalculationComplete: (result) => {
        setLastCalculationTime(Date.now());
        onCalculationComplete?.(result);
      }
    }
  );

  // Use real-time result if available, otherwise use manual calculation result
  const displayResult = realTimeMode ? realTimeResult : calculationResult;

  // Manual calculation trigger
  const handleCalculate = useCallback(async () => {
    if (calculationParams) {
      await calculateQuote(calculationParams);
    }
  }, [calculationParams, calculateQuote]);

  // Add new item
  const addItem = useCallback(() => {
    append({
      id: Date.now().toString(),
      item_price: 0,
      item_weight: 0,
      quantity: 1,
      product_name: ''
    });
  }, [append]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Optimized Quote Calculator
            </CardTitle>
            <div className="flex items-center gap-2">
              {realTimeMode && (
                <Badge variant="outline" className="text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Real-time
                </Badge>
              )}
              {(isCalculating || isRealTimeCalculating) && (
                <Badge variant="outline" className="text-blue-600">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Calculating...
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country_code">Origin Country</Label>
                  <Select
                    value={form.watch('country_code') || ''}
                    onValueChange={(value) => form.setValue('country_code', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCountries?.map((country) => (
                        <SelectItem key={country.code} value={country.code || ''}>
                          {country.name} ({country.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    {...form.register('currency')}
                    placeholder="USD"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Items</CardTitle>
                <Button onClick={addItem} variant="outline" size="sm">
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-4 gap-2 p-3 border rounded">
                  <Input
                    {...form.register(`items.${index}.product_name`)}
                    placeholder="Product name"
                  />
                  <Input
                    {...form.register(`items.${index}.item_price`, { valueAsNumber: true })}
                    type="number"
                    placeholder="Price"
                  />
                  <Input
                    {...form.register(`items.${index}.item_weight`, { valueAsNumber: true })}
                    type="number"
                    placeholder="Weight"
                  />
                  <div className="flex gap-1">
                    <Input
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                      type="number"
                      placeholder="Qty"
                    />
                    {fields.length > 1 && (
                      <Button
                        onClick={() => remove(index)}
                        variant="outline"
                        size="sm"
                        className="px-2"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Additional Costs */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Costs & Fees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sales_tax_price">Sales Tax</Label>
                  <Input
                    {...form.register('sales_tax_price', { valueAsNumber: true })}
                    type="number"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="merchant_shipping_price">Merchant Shipping</Label>
                  <Input
                    {...form.register('merchant_shipping_price', { valueAsNumber: true })}
                    type="number"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="domestic_shipping">Domestic Shipping</Label>
                  <Input
                    {...form.register('domestic_shipping', { valueAsNumber: true })}
                    type="number"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="handling_charge">Handling Charge</Label>
                  <Input
                    {...form.register('handling_charge', { valueAsNumber: true })}
                    type="number"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="insurance_amount">Insurance</Label>
                  <Input
                    {...form.register('insurance_amount', { valueAsNumber: true })}
                    type="number"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="discount">Discount</Label>
                  <Input
                    {...form.register('discount', { valueAsNumber: true })}
                    type="number"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="customs_percentage">Customs Percentage (%)</Label>
                <Input
                  {...form.register('customs_percentage', { valueAsNumber: true })}
                  type="number"
                  placeholder="6"
                  step="0.1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Manual Calculate Button */}
          {!realTimeMode && (
            <Button 
              onClick={handleCalculate} 
              disabled={isCalculating || !calculationParams}
              className="w-full"
            >
              {isCalculating ? 'Calculating...' : 'Calculate Quote'}
            </Button>
          )}
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {/* Calculation Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Calculation Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(isCalculating || isRealTimeCalculating) && !displayResult ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : displayResult?.success && displayResult.breakdown ? (
                <Tabs defaultValue="summary" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
                    <TabsTrigger value="metadata">Metadata</TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-sm text-green-600">Final Total</div>
                        <div className="text-2xl font-bold text-green-700">
                          {watchedValues.currency} {displayResult.breakdown.final_total.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="text-sm text-blue-600">Items Total</div>
                        <div className="text-xl font-semibold text-blue-700">
                          {watchedValues.currency} {displayResult.breakdown.total_item_price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    {displayResult.warnings && displayResult.warnings.length > 0 && (
                      <Alert>
                        <AlertDescription>
                          {displayResult.warnings.join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>

                  <TabsContent value="breakdown" className="space-y-2">
                    {[
                      ['Items Total', displayResult.breakdown.total_item_price],
                      ['Sales Tax', displayResult.breakdown.sales_tax_price],
                      ['Merchant Shipping', displayResult.breakdown.merchant_shipping_price],
                      ['International Shipping', displayResult.breakdown.international_shipping],
                      ['Customs & ECS', displayResult.breakdown.customs_and_ecs],
                      ['Domestic Shipping', displayResult.breakdown.domestic_shipping],
                      ['Handling Charge', displayResult.breakdown.handling_charge],
                      ['Insurance', displayResult.breakdown.insurance_amount],
                      ['Discount', -displayResult.breakdown.discount],
                      ['Payment Gateway Fee', displayResult.breakdown.payment_gateway_fee],
                      ['VAT', displayResult.breakdown.vat]
                    ].map(([label, amount]) => (
                      <div key={label} className="flex justify-between py-1 border-b">
                        <span className="text-sm">{label}</span>
                        <span className="font-mono text-sm">
                          {watchedValues.currency} {Number(amount).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 border-t-2 font-bold">
                      <span>Final Total</span>
                      <span className="font-mono">
                        {watchedValues.currency} {displayResult.breakdown.final_total.toLocaleString()}
                      </span>
                    </div>
                  </TabsContent>

                  <TabsContent value="metadata" className="space-y-2">
                    <div className="text-sm space-y-1">
                      <div>Exchange Rate: {displayResult.breakdown.exchange_rate}</div>
                      <div>Rate Source: {displayResult.breakdown.exchange_rate_source}</div>
                      <div>Shipping Method: {displayResult.breakdown.shipping_method}</div>
                      <div>Total Weight: {displayResult.breakdown.total_item_weight} kg</div>
                      <div>Calculated: {new Date(displayResult.breakdown.calculation_timestamp).toLocaleTimeString()}</div>
                      {displayResult.performance && (
                        <div>Calculation Time: {displayResult.performance.calculation_time_ms}ms</div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : error || displayResult?.error ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {error || displayResult?.error?.message || 'Calculation failed'}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {realTimeMode ? 'Enter values to see real-time calculation' : 'Click calculate to see results'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          {showPerformanceMetrics && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Performance Metrics
                  </CardTitle>
                  <Button onClick={clearCache} variant="outline" size="sm">
                    Clear Cache
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Cache Hit Rate</div>
                    <div className="font-semibold">{performanceMetrics.cacheHitRate.toFixed(1)}%</div>
                    <Progress value={performanceMetrics.cacheHitRate} className="mt-1" />
                  </div>
                  <div>
                    <div className="text-gray-600">Avg Calculation Time</div>
                    <div className="font-semibold">{performanceMetrics.averageCalculationTime.toFixed(0)}ms</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Total Calculations</div>
                    <div className="font-semibold">{performanceMetrics.totalCalculations}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Cache Size</div>
                    <div className="font-semibold">{cacheStats.calculationCache.size}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};