import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Package,
  Scale,
  Truck,
  DollarSign,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Info,
  Settings,
  Tag,
  Globe
} from 'lucide-react';
import { currencyService } from '@/services/CurrencyService';
import { simplifiedQuoteCalculator } from '@/services/SimplifiedQuoteCalculator';

interface QuoteDetailsAnalysisProps {
  quote: any;
}

// Utility function to get customer currency from destination country
const getCustomerCurrency = (destinationCountry: string): string => {
  const countryCurrencyMap: Record<string, string> = {
    IN: 'INR',
    NP: 'NPR', 
    US: 'USD',
    CA: 'CAD',
    GB: 'GBP',
    AU: 'AUD',
  };
  return countryCurrencyMap[destinationCountry] || 'USD';
};

export const QuoteDetailsAnalysis: React.FC<QuoteDetailsAnalysisProps> = ({ quote }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showConfiguration, setShowConfiguration] = useState(false);

  if (!quote.calculation_data || !quote.calculation_data.calculation_steps) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-gray-600 text-center">No calculation data available</p>
        </CardContent>
      </Card>
    );
  }

  const calc = quote.calculation_data;
  const steps = calc.calculation_steps || {};
  const rates = calc.applied_rates || {};
  const inputs = calc.inputs || {};
  const taxInfo = simplifiedQuoteCalculator.getTaxInfo(quote.destination_country);

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const formatCurrency = (amount: number, currency?: string) => {
    // Try to get origin currency from quote data
    const originCurrency = calc.inputs?.origin_currency || quote.origin_currency || 'USD';
    return currencyService.formatAmount(amount, currency || originCurrency);
  };

  // Get origin currency for display purposes
  const originCurrency = calc.inputs?.origin_currency || quote.origin_currency || 'USD';

  // Calculate key values
  const itemsSubtotal = steps.items_subtotal || quote.items.reduce((sum: number, item: any) => {
    const price = item.costprice_origin || item.unit_price_usd || 0;
    const quantity = item.quantity || 1;
    return sum + (price * quantity);
  }, 0);

  const totalShippingCost = steps.shipping_cost || steps.discounted_shipping_cost || 0;
  const totalTaxAmount = steps.local_tax_amount || 0;
  const finalTotalUSD = steps.total_usd || quote.total_usd || 0;
  
  // Calculate customer currency amount if not available
  let finalTotalCustomer = steps.total_customer_currency || quote.total_customer_currency || 0;
  const customerCurrency = quote.customer_currency || calc.inputs?.customer_currency || getCustomerCurrency(quote.destination_country);
  
  // If we don't have customer currency amount but have exchange rate, calculate it
  if (!finalTotalCustomer && finalTotalUSD && calc.exchange_rate?.rate) {
    finalTotalCustomer = finalTotalUSD * calc.exchange_rate.rate;
  }

  // Validation: Check for impossible scenarios
  const isImpossibleScenario = finalTotalUSD < itemsSubtotal && itemsSubtotal > 0;
  if (isImpossibleScenario) {
    const originCurrency = calc.inputs?.origin_currency || quote.origin_currency || 'USD';
    console.error(`🚨 [VALIDATION ERROR] Total (${formatCurrency(finalTotalUSD)}) is less than items cost (${formatCurrency(itemsSubtotal)}) - this is impossible!`);
    console.error(`🔍 [DEBUG] Quote ID: ${quote.id}, Items:`, quote.items.map(item => ({
      name: item.name,
      price: item.costprice_origin || item.unit_price_usd || 0,
      quantity: item.quantity,
      valuation_preference: item.valuation_preference
    })));
  }

  // Enhanced metrics for dashboard (6 cards in 2 rows)
  const keyMetrics = [
    // Row 1: Quote & Items Overview
    {
      icon: Globe,
      title: 'Route',
      value: `${inputs.origin_country || quote.origin_country || 'US'} → ${inputs.destination_country || quote.destination_country || 'NP'}`,
      subtitle: `${inputs.shipping_method || 'International'} • Rate: ${(inputs.exchange_rate || 1).toFixed(4)}`,
      color: 'text-blue-600'
    },
    {
      icon: Package,
      title: 'Items',
      value: `${quote.items.length} items`,
      subtitle: `${formatCurrency(itemsSubtotal)} total`,
      color: 'text-green-600'
    },
    {
      icon: Scale,
      title: 'Weight',
      value: (() => {
        const totalActual = inputs.total_weight_kg || 0;
        const totalVolumetric = inputs.total_volumetric_weight_kg || 0;
        const totalChargeable = inputs.total_chargeable_weight_kg || totalActual;
        
        if (totalVolumetric > totalActual) {
          return `${totalChargeable} kg (Vol)`;
        }
        return `${totalChargeable} kg`;
      })(),
      subtitle: (() => {
        const totalActual = inputs.total_weight_kg || 0;
        const totalVolumetric = inputs.total_volumetric_weight_kg || 0;
        
        if (totalVolumetric > totalActual) {
          return `Volumetric: ${totalVolumetric}kg > Actual: ${totalActual}kg`;
        } else if (totalVolumetric > 0) {
          return `Actual: ${totalActual}kg > Volumetric: ${totalVolumetric}kg`;
        }
        return `Actual weight: ${totalActual}kg`;
      })(),
      color: (inputs.total_volumetric_weight_kg || 0) > (inputs.total_weight_kg || 0) ? 'text-orange-600' : 'text-purple-600'
    },
    // Row 2: Costs & Final Totals
    {
      icon: Truck,
      title: 'Shipping',
      value: `${formatCurrency(rates.shipping_rate_per_kg || 0)}/kg`,
      subtitle: `${formatCurrency(totalShippingCost)} cost`,
      color: 'text-blue-600'
    },
    {
      icon: DollarSign,
      title: 'Taxes',
      value: `${rates.local_tax_percentage || 0}% ${taxInfo.local_tax_name}`,
      subtitle: `${formatCurrency(totalTaxAmount)} tax`,
      color: 'text-orange-600'
    },
    {
      icon: DollarSign,
      title: 'Total',
      value: `${formatCurrency(finalTotalUSD)} ${originCurrency}`,
      subtitle: customerCurrency !== originCurrency ? `Customer pays: ${currencyService.formatAmount(finalTotalCustomer, customerCurrency)}` : 'Final amount',
      color: 'text-green-600'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Info className="w-5 h-5 mr-2" />
          Quote Details & Analysis
          {isImpossibleScenario && (
            <Badge variant="destructive" className="ml-2">
              ⚠️ Calculation Error
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Warning for impossible scenarios */}
        {isImpossibleScenario && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800">
              <Info className="w-4 h-4" />
              <span className="text-sm font-medium">Calculation Error Detected</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Total amount ({formatCurrency(finalTotalUSD)}) is less than items cost ({formatCurrency(itemsSubtotal)}). 
              This indicates a calculation bug that needs to be fixed.
            </p>
          </div>
        )}
        {/* Enhanced Metrics Dashboard - 6 Cards in 2 Rows */}
        <div className="space-y-4">
          {/* Row 1: Quote & Items Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {keyMetrics.slice(0, 3).map((metric, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <metric.icon className={`w-4 h-4 ${metric.color}`} />
                  <span className="text-sm font-medium text-gray-700">{metric.title}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-semibold text-gray-900">{metric.value}</p>
                  <p className="text-xs text-gray-600">{metric.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Row 2: Costs & Final Totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {keyMetrics.slice(3, 6).map((metric, index) => (
              <div key={index + 3} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <metric.icon className={`w-4 h-4 ${metric.color}`} />
                  <span className="text-sm font-medium text-gray-700">{metric.title}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-semibold text-gray-900">{metric.value}</p>
                  <p className="text-xs text-gray-600">{metric.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Items Table */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Items ({quote.items.length})
          </h3>
          
          <div className="space-y-2">
            {quote.items.map((item: any, index: number) => {
              const itemId = item.id || `item-${index}`;
              const isExpanded = expandedItems.has(itemId);
              const itemWeight = item.weight || item.weight_kg || 0;
              const itemPrice = item.costprice_origin || item.unit_price_usd || 0;
              const itemTotal = (item.quantity || 1) * itemPrice;

              return (
                <div key={itemId} className="border rounded-lg overflow-hidden">
                  {/* Main Item Row */}
                  <div className="p-4 bg-white hover:bg-gray-50">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Item Name */}
                      <div className="col-span-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleItemExpansion(itemId)}
                            className="h-6 w-6 p-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </Button>
                          <span className="font-medium text-sm truncate block" title={item.name || 'Unnamed Item'}>
                            {item.name || 'Unnamed Item'}
                          </span>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-1 text-center">
                        <span className="text-sm">{item.quantity || 1}</span>
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-2 text-right">
                        <span className="text-sm font-medium">{formatCurrency(itemPrice)}</span>
                      </div>

                      {/* Weight */}
                      <div className="col-span-2 text-right">
                        <div className="flex flex-col items-end gap-1">
                          {/* Main weight display */}
                          <div className="flex items-center gap-1">
                            {item.volumetric_weight_kg && item.volumetric_weight_kg > itemWeight ? (
                              <>
                                <span className="text-sm font-medium text-orange-600">{item.volumetric_weight_kg} kg</span>
                                <Badge variant="outline" className="text-sm bg-orange-50 text-orange-700 border-orange-200">
                                  Vol
                                </Badge>
                              </>
                            ) : (
                              <>
                                <span className="text-sm">{itemWeight} kg</span>
                                {item.volumetric_weight_kg && (
                                  <Badge variant="outline" className="text-sm bg-gray-50 text-gray-600 border-gray-200">
                                    Act
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                          {/* Secondary weight info */}
                          {item.volumetric_weight_kg && item.volumetric_weight_kg !== itemWeight && (
                            <span className="text-xs text-gray-500">
                              {item.volumetric_weight_kg > itemWeight 
                                ? `Act: ${itemWeight}kg` 
                                : `Vol: ${item.volumetric_weight_kg}kg`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="col-span-2 text-right">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(itemTotal)}</span>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 text-right">
                        {item.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                            className="h-6 w-6 p-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Item Details */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-gray-50 border-t">
                      <div className="space-y-3 text-sm">
                        {/* First row: URL, Category, and HSN Code */}
                        <div className="grid grid-cols-3 gap-4">
                          {/* URL - show only domain */}
                          {item.url && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Source</span>
                              <p>
                                <a 
                                  href={item.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                                  title={item.url}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {(() => {
                                    try {
                                      const domain = new URL(item.url).hostname;
                                      return domain.replace('www.', '');
                                    } catch {
                                      return item.url.split('/')[2] || item.url;
                                    }
                                  })()}
                                </a>
                              </p>
                            </div>
                          )}
                          
                          {/* Category */}
                          {item.category && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Category</span>
                              <p className="text-sm">{item.category}</p>
                            </div>
                          )}
                          
                          {/* HSN Code */}
                          {item.hsn_code && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">HSN Code</span>
                              <p className="flex items-center gap-1 text-sm">
                                <Tag className="w-3 h-3" />
                                {item.hsn_code}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Second row: Notes (if exists) */}
                        {(item.notes || item.customer_notes) && (
                          <div className="mt-3">
                            <span className="text-gray-500 font-medium block mb-1">Notes</span>
                            <p className="text-sm">{item.notes || item.customer_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Collapsible Configuration Section */}
        <Collapsible open={showConfiguration} onOpenChange={setShowConfiguration}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              <Settings className="w-4 h-4 mr-2" />
              {showConfiguration ? 'Hide' : 'Show'} Calculation Settings
              <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showConfiguration ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Applied Rates */}
              <div className="space-y-3">
                <h4 className="text-base font-medium text-gray-700 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Applied Rates
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Origin Sales Tax:</span>
                    <span>{rates.origin_sales_tax_percentage || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping Rate:</span>
                    <span>{formatCurrency(rates.shipping_rate_per_kg || 0)}/kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Insurance:</span>
                    <span>{rates.insurance_percentage || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customs Duty:</span>
                    <span>{rates.customs_percentage || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{taxInfo.local_tax_name}:</span>
                    <span>{rates.local_tax_percentage || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Gateway:</span>
                    <span>{rates.payment_gateway_percentage || 0}% + {formatCurrency(rates.payment_gateway_fixed || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Enhanced Weight Analysis */}
              <div className="space-y-3">
                <h4 className="text-base font-medium text-gray-700 flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Weight Analysis
                </h4>
                <div className="space-y-3">
                  {/* Weight Comparison */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs font-medium text-gray-600">Actual Weight</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{inputs.total_weight_kg || 0} kg</span>
                    </div>
                    
                    {inputs.total_volumetric_weight_kg ? (
                      <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs font-medium text-orange-600">Volumetric Weight</span>
                        </div>
                        <span className="text-sm font-medium text-orange-700">{inputs.total_volumetric_weight_kg} kg</span>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs font-medium text-gray-400">Volumetric Weight</span>
                        </div>
                        <span className="text-sm text-gray-400">Not calculated</span>
                      </div>
                    )}
                  </div>

                  {/* Chargeable Weight Result */}
                  <div className={`rounded-lg p-3 border-2 ${
                    inputs.total_volumetric_weight_kg && inputs.total_volumetric_weight_kg > (inputs.total_weight_kg || 0)
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          inputs.total_volumetric_weight_kg && inputs.total_volumetric_weight_kg > (inputs.total_weight_kg || 0)
                            ? 'text-orange-700'
                            : 'text-blue-700'
                        }`}>
                          Chargeable Weight:
                        </span>
                      </div>
                      <span className={`text-lg font-semibold text-gray-900 ${
                        inputs.total_volumetric_weight_kg && inputs.total_volumetric_weight_kg > (inputs.total_weight_kg || 0)
                          ? 'text-orange-800'
                          : 'text-blue-800'
                      }`}>
                        {inputs.total_chargeable_weight_kg || inputs.total_weight_kg || 0} kg
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {inputs.total_volumetric_weight_kg && inputs.total_volumetric_weight_kg > (inputs.total_weight_kg || 0)
                        ? 'Using volumetric weight for shipping calculation (higher than actual)'
                        : 'Using actual weight for shipping calculation'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Country Configuration */}
              <div className="space-y-3">
                <h4 className="text-base font-medium text-gray-700 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Route Configuration
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Origin Country:</span>
                    <span>{inputs.origin_country || quote.origin_country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Destination Country:</span>
                    <span>{inputs.destination_country || quote.destination_country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer Currency:</span>
                    <span>{quote.customer_currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Exchange Rate:</span>
                    <span>{inputs.exchange_rate || 1} {quote.customer_currency}/{originCurrency}</span>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};