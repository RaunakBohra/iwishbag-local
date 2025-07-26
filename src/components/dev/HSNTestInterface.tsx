// ============================================================================
// HSN TEST INTERFACE - Development Testing Component
// Test the enhanced customs calculation system with real sample data
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TestTube,
  Eye,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Calculator,
  ArrowRight,
  Info,
} from 'lucide-react';
import { CompactHSNTaxBreakdown } from '@/components/admin/smart-components/CompactHSNTaxBreakdown';
import { SmartCustomsCalculation } from '@/components/admin/smart-components/SmartCustomsCalculation';
import { sampleHSNQuotes } from '@/data/sample-hsn-quotes';
import type { UnifiedQuote } from '@/types/unified-quote';
import type { ItemTaxBreakdown } from '@/services/PerItemTaxCalculator';

interface HSNTestInterfaceProps {
  className?: string;
}

export const HSNTestInterface: React.FC<HSNTestInterfaceProps> = ({ className }) => {
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>(sampleHSNQuotes[0]?.id || '');
  const [selectedQuote, setSelectedQuote] = useState<UnifiedQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [mockTaxBreakdowns, setMockTaxBreakdowns] = useState<ItemTaxBreakdown[]>([]);

  // Update selected quote when selection changes
  useEffect(() => {
    const quote = sampleHSNQuotes.find((q) => q.id === selectedQuoteId) || null;
    setSelectedQuote(quote);

    if (quote) {
      generateMockTaxBreakdowns(quote);
    }
  }, [selectedQuoteId]);

  // Generate mock tax breakdowns for testing
  const generateMockTaxBreakdowns = (quote: UnifiedQuote) => {
    const breakdowns: ItemTaxBreakdown[] = quote.items
      .filter((item) => item.hsn_code)
      .map((item) => {
        // Get HSN-specific data
        const hsnConfig = getHSNConfig(item.hsn_code!);
        const originPrice = item.price_usd * 83; // Convert to INR for testing

        // Calculate actual price taxes
        const actualPriceCustoms =
          Math.round(((originPrice * hsnConfig.customsRate) / 100) * 100) / 100;
        const actualPriceLocalTax =
          Math.round(((originPrice * hsnConfig.localTaxRate) / 100) * 100) / 100;

        // Calculate minimum valuation if applicable
        let minimumValuationCalculation = undefined;
        let selectedMethod: 'actual_price' | 'minimum_valuation' = 'actual_price';
        let taxableAmount = originPrice;
        let valuationMethod: 'original_price' | 'minimum_valuation' | 'higher_of_both' =
          'original_price';

        if (hsnConfig.minimumValuationUSD) {
          const minimumInINR = Math.ceil(hsnConfig.minimumValuationUSD * 83);
          const minimumCustoms =
            Math.round(((minimumInINR * hsnConfig.customsRate) / 100) * 100) / 100;
          const minimumLocalTax =
            Math.round(((minimumInINR * hsnConfig.localTaxRate) / 100) * 100) / 100;

          minimumValuationCalculation = {
            basis_amount: minimumInINR,
            customs_amount: minimumCustoms,
            local_tax_amount: minimumLocalTax,
            total_tax: minimumCustoms + minimumLocalTax,
            currency_conversion_details: `$${hsnConfig.minimumValuationUSD} USD → ₹${minimumInINR} INR`,
          };

          // Determine selected method
          if (originPrice >= minimumInINR) {
            selectedMethod = 'actual_price';
            taxableAmount = originPrice;
            valuationMethod = 'higher_of_both';
          } else {
            selectedMethod = 'minimum_valuation';
            taxableAmount = minimumInINR;
            valuationMethod = 'minimum_valuation';
          }
        }

        const selectedCalculation =
          selectedMethod === 'minimum_valuation' && minimumValuationCalculation
            ? minimumValuationCalculation
            : {
                basis_amount: originPrice,
                customs_amount: actualPriceCustoms,
                local_tax_amount: actualPriceLocalTax,
                total_tax: actualPriceCustoms + actualPriceLocalTax,
              };

        return {
          item_id: item.id,
          hsn_code: item.hsn_code!,
          item_name: item.name,
          original_price_origin_currency: originPrice,
          minimum_valuation_conversion: minimumValuationCalculation
            ? {
                usdAmount: hsnConfig.minimumValuationUSD!,
                originCurrency: 'INR',
                convertedAmount: minimumValuationCalculation.basis_amount,
                exchangeRate: 83,
                conversionTimestamp: new Date(),
                roundingMethod: 'up' as const,
                cacheSource: 'cached' as const,
              }
            : undefined,
          taxable_amount_origin_currency: taxableAmount,
          valuation_method: valuationMethod,
          calculation_options: {
            actual_price_calculation: {
              basis_amount: originPrice,
              customs_amount: actualPriceCustoms,
              local_tax_amount: actualPriceLocalTax,
              total_tax: actualPriceCustoms + actualPriceLocalTax,
            },
            minimum_valuation_calculation: minimumValuationCalculation,
            selected_method: selectedMethod,
            admin_can_override: true,
          },
          customs_calculation: {
            rate_percentage: hsnConfig.customsRate,
            amount_origin_currency: selectedCalculation.customs_amount,
            basis_amount: selectedCalculation.basis_amount,
          },
          local_tax_calculation: {
            tax_type: 'vat' as const,
            rate_percentage: hsnConfig.localTaxRate,
            amount_origin_currency: selectedCalculation.local_tax_amount,
            basis_amount: selectedCalculation.basis_amount,
          },
          total_customs: selectedCalculation.customs_amount,
          total_local_taxes: selectedCalculation.local_tax_amount,
          total_taxes: selectedCalculation.total_tax,
          calculation_timestamp: new Date(),
          admin_overrides_applied: [],
          confidence_score: hsnConfig.confidence,
          warnings: generateWarnings(item, selectedMethod, minimumValuationCalculation),
        } as ItemTaxBreakdown;
      });

    setMockTaxBreakdowns(breakdowns);
  };

  const getHSNConfig = (hsnCode: string) => {
    const configs: Record<string, any> = {
      '6204': { customsRate: 12, localTaxRate: 13, minimumValuationUSD: 10, confidence: 0.85 },
      '8517': { customsRate: 20, localTaxRate: 13, minimumValuationUSD: 50, confidence: 0.95 },
      '4901': { customsRate: 0, localTaxRate: 0, minimumValuationUSD: null, confidence: 0.9 },
      '6109': { customsRate: 12, localTaxRate: 13, minimumValuationUSD: 5, confidence: 0.9 },
      '8518': { customsRate: 20, localTaxRate: 13, minimumValuationUSD: 15, confidence: 0.92 },
    };
    return (
      configs[hsnCode] || {
        customsRate: 10,
        localTaxRate: 10,
        minimumValuationUSD: null,
        confidence: 0.7,
      }
    );
  };

  const generateWarnings = (item: any, selectedMethod: string, minimumCalc: any): string[] => {
    const warnings: string[] = [];

    if (selectedMethod === 'minimum_valuation' && minimumCalc) {
      warnings.push(`Minimum valuation applied: ${minimumCalc.currency_conversion_details}`);
    }

    if (item.hsn_code === '4901') {
      warnings.push('Item may be tax-exempt under educational materials provision');
    }

    return warnings;
  };

  const getQuoteTypeDescription = (quote: UnifiedQuote): string => {
    const itemCount = quote.items.length;
    const hasMinimumValuation = quote.items.some((item) =>
      ['6204', '8517', '6109', '8518'].includes(item.hsn_code || ''),
    );
    const hasTaxExempt = quote.items.some((item) => item.hsn_code === '4901');

    let description = `${itemCount} item${itemCount > 1 ? 's' : ''}`;
    if (hasMinimumValuation) description += ', with minimum valuations';
    if (hasTaxExempt) description += ', includes tax-exempt items';

    return description;
  };

  const handleMethodChange = (itemId: string, method: string, value?: number) => {
    console.log('Method changed for item:', itemId, 'to:', method, 'value:', value);
    // Here you would typically update the backend or state
    // For testing, we'll just log the change
  };

  if (!selectedQuote) {
    return (
      <div className={`p-6 ${className}`}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>No sample quotes available for testing.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 max-w-7xl mx-auto ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HSN System Test Interface</h1>
          <p className="text-sm text-gray-600 mt-1">
            Test enhanced customs calculation with real sample data
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <TestTube className="w-4 h-4 mr-1" />
          Development Testing
        </Badge>
      </div>

      {/* Quote Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Eye className="w-5 h-5" />
            <span>Select Test Quote</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a test quote" />
                </SelectTrigger>
                <SelectContent>
                  {sampleHSNQuotes.map((quote) => (
                    <SelectItem key={quote.id} value={quote.id}>
                      <div className="flex items-center justify-between min-w-0">
                        <span className="font-medium">{quote.display_id}</span>
                        <span className="text-sm text-gray-500 ml-4">
                          {getQuoteTypeDescription(quote)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => generateMockTaxBreakdowns(selectedQuote)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Quote Overview */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Quote:</span>
                <div className="font-medium">{selectedQuote.display_id}</div>
              </div>
              <div>
                <span className="text-gray-600">Route:</span>
                <div className="font-medium flex items-center">
                  {selectedQuote.origin_country}
                  <ArrowRight className="w-3 h-3 mx-1" />
                  {selectedQuote.destination_country}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Items:</span>
                <div className="font-medium">{selectedQuote.items.length}</div>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <Badge variant="outline" className="text-xs">
                  {selectedQuote.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Components */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">HSN Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Tax Breakdown</TabsTrigger>
          <TabsTrigger value="individual">Individual Items</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: HSN Tax Breakdown Component */}
            <div className="lg:col-span-2">
              <CompactHSNTaxBreakdown
                quote={selectedQuote}
                isCalculating={isLoading}
                compact={false}
                onRecalculate={() => {
                  setIsLoading(true);
                  setTimeout(() => {
                    generateMockTaxBreakdowns(selectedQuote);
                    setIsLoading(false);
                  }, 1000);
                }}
                onUpdateQuote={() => console.log('Update quote requested')}
              />
            </div>

            {/* Right: Test Information */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Test Scenarios</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>Currency uniformity (INR)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>Minimum valuation conversion</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>Higher-of-both logic</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>Admin override options</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Current Quote Details</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <div>
                    <span className="text-gray-600">Customer:</span>
                    <div className="font-medium">{selectedQuote.customer_data.info.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Value:</span>
                    <div className="font-medium">
                      ₹{selectedQuote.calculation_data.breakdown.items_total} INR
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">HSN Items:</span>
                    <div className="font-medium">
                      {selectedQuote.items.filter((item) => item.hsn_code).length} /{' '}
                      {selectedQuote.items.length}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          {mockTaxBreakdowns.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mockTaxBreakdowns.map((breakdown) => (
                <Card key={breakdown.item_id}>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{breakdown.item_name}</span>
                      <Badge variant="outline" className="text-xs">
                        HSN: {breakdown.hsn_code}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SmartCustomsCalculation
                      breakdown={breakdown}
                      onMethodChange={(method, value) =>
                        handleMethodChange(breakdown.item_id, method, value)
                      }
                      allowOverride={true}
                      compact={false}
                      showDetails={true}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No HSN items found in this quote. Select a different quote with HSN-classified
                items.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          <div className="space-y-4">
            {selectedQuote.items.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Price:</span>
                      <div className="font-medium">₹{Math.round(item.price_usd * 83)} INR</div>
                    </div>
                    <div>
                      <span className="text-gray-600">HSN Code:</span>
                      <div className="font-medium">{item.hsn_code || 'Not classified'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Category:</span>
                      <div className="font-medium capitalize">{item.category}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Weight:</span>
                      <div className="font-medium">{item.weight_kg} kg</div>
                    </div>
                  </div>
                  {item.options && (
                    <div className="mt-2 text-sm text-gray-600">Options: {item.options}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Test Results Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="w-5 h-5" />
            <span>Test Results Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {
                  mockTaxBreakdowns.filter(
                    (b) => b.calculation_options.selected_method === 'actual_price',
                  ).length
                }
              </div>
              <div className="text-gray-600">Using Actual Price</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">
                {
                  mockTaxBreakdowns.filter(
                    (b) => b.calculation_options.selected_method === 'minimum_valuation',
                  ).length
                }
              </div>
              <div className="text-gray-600">Using Min. Valuation</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                ₹{mockTaxBreakdowns.reduce((sum, b) => sum + b.total_taxes, 0).toFixed(2)}
              </div>
              <div className="text-gray-600">Total Taxes (INR)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HSNTestInterface;
