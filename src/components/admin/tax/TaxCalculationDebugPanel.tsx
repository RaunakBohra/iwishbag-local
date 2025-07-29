import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  Package,
  Plane,
  Building2,
  CreditCard,
  Globe,
  Receipt,
  TrendingUp,
  AlertCircle,
  Info,
  DollarSign,
  Percent,
  Hash,
  FileText,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { UnifiedQuote } from '@/types/unified-quote';

interface TaxCalculationDebugPanelProps {
  quote: UnifiedQuote;
  className?: string;
}

interface CalculationStep {
  label: string;
  formula: string;
  inputs: Array<{
    name: string;
    value: number;
    source: string;
    rate?: number;
  }>;
  calculation: string;
  result: number;
  notes?: string;
}

export const TaxCalculationDebugPanel: React.FC<TaxCalculationDebugPanelProps> = ({
  quote,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Extract all calculation data
  const breakdown = quote.calculation_data?.breakdown || {};
  const operationalData = quote.operational_data || {};
  const itemBreakdowns = quote.calculation_data?.item_breakdowns || [];
  const taxRates = quote.tax_rates || {};
  const exchangeRate = typeof quote.calculation_data?.exchange_rate === 'number' 
    ? quote.calculation_data.exchange_rate 
    : parseFloat(quote.calculation_data?.exchange_rate) || 1;

  // Helper to extract shipping data from various possible locations
  const getShippingBreakdown = () => {
    const shippingTotal = breakdown.shipping || 0;
    const totalWeight = quote.items?.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0) || 0;
    
    // Extract all shipping-related data
    const selectedShipping = quote.calculation_data?.selected_shipping || {};
    const routeData = selectedShipping.route_data || {};
    const shippingBreakdownData = quote.calculation_data?.shipping_breakdown || {};
    
    // Try to find shipping breakdown data in various locations
    const baseShipping = shippingBreakdownData.base_cost || 
                        routeData.base_shipping_cost ||
                        quote.calculation_data?.shipping_data?.base_cost || 0;
    
    const weightRate = shippingBreakdownData.weight_rate || 
                      routeData.weight_rate_per_kg ||
                      quote.calculation_data?.shipping_data?.weight_rate || 0;
    
    const deliveryPremium = shippingBreakdownData.delivery_premium || 
                           routeData.delivery_premium ||
                           quote.calculation_data?.shipping_data?.delivery_premium || 0;
    
    // Extract additional details
    const shippingMethod = quote.shipping_method || selectedShipping.carrier || 'Standard';
    const deliveryOption = selectedShipping.delivery_option || selectedShipping.name || 'Economy';
    const weightTier = routeData.weight_tier_used || 'N/A';
    const weightCost = routeData.weight_cost || (totalWeight * weightRate);
    const costPercentage = quote.calculation_data?.shipping_percentage || routeData.cost_percentage || 0;
    const processingDays = selectedShipping.estimated_days || routeData.processing_days || 'N/A';
    const volumetricWeight = routeData.volumetric_weight || 0;
    const chargeableWeight = routeData.chargeable_weight || totalWeight;
    
    // Extract weight tier details for rate breakdown
    const weightTiers = quote.calculation_data?.route_weight_tiers || 
                       selectedShipping.weight_tiers || 
                       routeData.weight_tiers || [];
    const rateSource = routeData.rate_source || 
                      (weightTier !== 'N/A' ? 'weight_tier' : 'per_kg_fallback');
    
    // Check if this is IN→NP route with INR rates
    const isINtoNP = quote.origin_country === 'IN' && quote.destination_country === 'NP';
    const currencySymbol = isINtoNP ? '₹' : '$';
    
    // If we still don't have breakdown data, estimate it from the total
    if (baseShipping === 0 && weightRate === 0 && deliveryPremium === 0 && shippingTotal > 0) {
      // Simple estimation: assume shipping is primarily weight-based
      const estimatedRate = totalWeight > 0 ? shippingTotal / totalWeight : 0;
      return {
        base: 0,
        rate: estimatedRate,
        premium: 0,
        method: shippingMethod,
        deliveryOption: deliveryOption,
        weightTier: 'Unknown',
        weightCost: shippingTotal,
        costPercentage: 0,
        processingDays: processingDays,
        volumetricWeight: 0,
        chargeableWeight: totalWeight,
        weightTiers: [],
        rateSource: 'estimated',
        note: 'Estimated from total shipping cost'
      };
    }
    
    return {
      base: baseShipping,
      rate: weightRate,
      premium: deliveryPremium,
      method: shippingMethod,
      deliveryOption: deliveryOption,
      weightTier: weightTier,
      weightCost: weightCost,
      costPercentage: costPercentage,
      processingDays: processingDays,
      volumetricWeight: volumetricWeight,
      chargeableWeight: chargeableWeight,
      weightTiers: weightTiers,
      rateSource: rateSource,
      note: null
    };
  };

  const shippingBreakdown = getShippingBreakdown();

  // Build calculation steps
  const calculationSteps: Record<string, CalculationStep> = {
    items_total: {
      label: 'Items Total',
      formula: 'Σ(item.price × item.quantity)',
      inputs: quote.items?.map((item, idx) => ({
        name: `${item.product_name} (${item.quantity}x)`,
        value: item.price * item.quantity,
        source: `Item ${idx + 1}`,
        rate: item.price,
      })) || [],
      calculation: quote.items?.map(item => `${item.price} × ${item.quantity}`).join(' + ') || 'N/A',
      result: breakdown.items_total || 0,
      notes: 'Base product costs before any taxes or fees',
    },
    
    purchase_tax: {
      label: 'Purchase Tax',
      formula: 'items_total × purchase_tax_rate',
      inputs: [
        {
          name: 'Items Total',
          value: breakdown.items_total || 0,
          source: 'Calculated above',
        },
        {
          name: 'Purchase Tax Rate',
          value: operationalData.purchase_tax_rate || 0,
          source: `${quote.origin_country} tax rate`,
          rate: operationalData.purchase_tax_rate,
        },
      ],
      calculation: `${breakdown.items_total || 0} × ${(operationalData.purchase_tax_rate || 0) / 100}`,
      result: breakdown.purchase_tax || 0,
      notes: `Tax paid in origin country (${quote.origin_country})`,
    },

    shipping: {
      label: 'International Shipping',
      formula: 'base_shipping_cost + (weight × rate_per_kg) + delivery_premium',
      inputs: [
        {
          name: 'Shipping Method',
          value: null,
          source: `${shippingBreakdown.method} - ${shippingBreakdown.deliveryOption}`,
        },
        {
          name: 'Route',
          value: null,
          source: `${quote.origin_country} → ${quote.destination_country}`,
        },
        {
          name: 'Base Shipping Cost',
          value: shippingBreakdown.base,
          source: `Base rate for route`,
        },
        {
          name: 'Actual Weight',
          value: quote.items?.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0) || 0,
          source: 'Sum of all item weights (kg)',
        },
        ...(shippingBreakdown.volumetricWeight > 0 ? [{
          name: 'Volumetric Weight',
          value: shippingBreakdown.volumetricWeight,
          source: 'L×W×H / dimensional factor',
        }] : []),
        {
          name: 'Chargeable Weight',
          value: shippingBreakdown.chargeableWeight,
          source: 'Max(actual, volumetric)',
        },
        {
          name: 'Weight Tier Applied',
          value: 0,
          source: shippingBreakdown.weightTier,
        },
        {
          name: 'Weight Rate Breakdown',
          value: shippingBreakdown.rate,
          source: shippingBreakdown.weightTier !== 'N/A' && shippingBreakdown.weightTier !== 'Unknown' 
            ? `Tier ${shippingBreakdown.weightTier} rate` 
            : shippingBreakdown.note || 'Route per-kg rate',
          rate: shippingBreakdown.rate,
        },
        // Show available weight tiers if we have them
        ...(shippingBreakdown.weightTiers && shippingBreakdown.weightTiers.length > 0 ? [{
          name: '├─ Available Tiers',
          value: 0,
          source: shippingBreakdown.weightTiers.map((tier: any) => 
            `${tier.min}-${tier.max || '∞'}kg: $${tier.cost}/kg`
          ).join(', '),
        }] : []),
        {
          name: '├─ Rate Source',
          value: 0,
          source: shippingBreakdown.rateSource === 'weight_tier' 
            ? 'Weight tier system' 
            : 'Per-kg fallback rate',
        },
        {
          name: 'Weight Cost',
          value: shippingBreakdown.weightCost,
          source: `${shippingBreakdown.chargeableWeight.toFixed(2)} kg × $${shippingBreakdown.rate.toFixed(2)}/kg`,
        },
        {
          name: 'Delivery Premium',
          value: shippingBreakdown.premium,
          source: `${shippingBreakdown.deliveryOption} option`,
        },
        ...(shippingBreakdown.costPercentage > 0 ? [{
          name: 'Value-based Fee',
          value: (breakdown.items_total || 0) * (shippingBreakdown.costPercentage / 100),
          source: `${shippingBreakdown.costPercentage}% of item value`,
          rate: shippingBreakdown.costPercentage,
        }] : []),
        {
          name: 'Processing Time',
          value: 0,
          source: `${shippingBreakdown.processingDays} days`,
        },
      ],
      calculation: `${shippingBreakdown.base.toFixed(2)} + (${shippingBreakdown.chargeableWeight.toFixed(2)} × ${shippingBreakdown.rate.toFixed(2)}) + ${shippingBreakdown.premium.toFixed(2)}${shippingBreakdown.costPercentage > 0 ? ` + ${((breakdown.items_total || 0) * (shippingBreakdown.costPercentage / 100)).toFixed(2)}` : ''}`,
      result: breakdown.shipping || 0,
      notes: shippingBreakdown.note ? `Cross-border freight charges (${shippingBreakdown.note})` : 
             quote.origin_country === 'IN' && quote.destination_country === 'NP' ? 
             'Cross-border freight charges (IN→NP route uses INR rates: ₹15-45/kg, converted to USD)' : 
             'Cross-border freight charges',
    },

    customs: {
      label: 'Customs Duty',
      formula: 'CIF_value × customs_rate',
      inputs: [
        {
          name: 'CIF Value',
          value: (breakdown.items_total || 0) + (breakdown.purchase_tax || 0) + (breakdown.shipping || 0) + (breakdown.insurance || 0),
          source: 'Cost + Insurance + Freight',
        },
        {
          name: 'Customs Rate',
          value: taxRates.customs || 0,
          source: quote.tax_method === 'hsn' ? 'HSN Classification' : 'Route/Manual',
          rate: taxRates.customs,
        },
        // Add per-item breakdown if multiple items
        ...(quote.items && quote.items.length > 1 ? quote.items.map((item, idx) => {
          const itemTotal = item.price * item.quantity;
          const itemProportion = (breakdown.items_total || 0) > 0 ? itemTotal / (breakdown.items_total || 1) : 0;
          
          // Try to get actual item customs from item_breakdowns
          const itemBreakdown = itemBreakdowns.find(b => b.item_id === item.id || b.item_id === `item-${idx}`);
          const itemCustoms = itemBreakdown?.customs || 
                             item.customs_amount || 
                             ((breakdown.customs || 0) * itemProportion);
          
          // Calculate the effective rate for this item
          const itemRate = itemTotal > 0 ? (itemCustoms / itemTotal) * 100 : 0;
          
          return {
            name: `├─ ${item.product_name} (${item.quantity}x)`,
            value: itemCustoms,
            source: itemBreakdown ? 'Actual calculation' : `${(itemProportion * 100).toFixed(1)}% of total`,
            rate: itemRate,
          };
        }) : []),
      ],
      calculation: `${((breakdown.items_total || 0) + (breakdown.purchase_tax || 0) + (breakdown.shipping || 0) + (breakdown.insurance || 0)).toFixed(2)} × ${(taxRates.customs || 0) / 100}`,
      result: breakdown.customs || 0,
      notes: quote.items && quote.items.length > 1 
        ? 'Import duty based on CIF valuation (distributed by item value proportion)'
        : 'Import duty based on CIF valuation',
    },

    sales_tax: {
      label: 'Sales Tax',
      formula: 'items_total × sales_tax_rate',
      inputs: [
        {
          name: 'Items Total',
          value: breakdown.items_total || 0,
          source: 'Product costs',
        },
        {
          name: 'Sales Tax Rate',
          value: taxRates.sales_tax || 0,
          source: `${quote.origin_country} state tax`,
          rate: taxRates.sales_tax,
        },
      ],
      calculation: `${breakdown.items_total || 0} × ${(taxRates.sales_tax || 0) / 100}`,
      result: breakdown.sales_tax || 0,
      notes: `Applies to ${quote.origin_country}→${quote.destination_country} route`,
    },

    payment_gateway_fee: {
      label: 'Payment Gateway Fee',
      formula: 'pre_gateway_subtotal × 2.9% + $0.30',
      inputs: [
        {
          name: 'Pre-Gateway Subtotal',
          value: (breakdown.items_total || 0) + (breakdown.purchase_tax || 0) + 
                 (breakdown.shipping || 0) + (breakdown.insurance || 0) + 
                 (breakdown.handling || 0) + (breakdown.customs || 0) + 
                 (breakdown.sales_tax || 0),
          source: 'All costs before gateway fee',
        },
        {
          name: 'Percentage Fee',
          value: 0.029,
          source: 'Standard rate',
          rate: 2.9,
        },
        {
          name: 'Fixed Fee',
          value: 0.30,
          source: 'Per transaction',
        },
      ],
      calculation: `${((breakdown.items_total || 0) + (breakdown.purchase_tax || 0) + (breakdown.shipping || 0) + (breakdown.insurance || 0) + (breakdown.handling || 0) + (breakdown.customs || 0) + (breakdown.sales_tax || 0)).toFixed(2)} × 0.029 + 0.30`,
      result: breakdown.fees || 0,
      notes: 'Calculated before destination tax',
    },

    destination_tax: {
      label: 'Destination Tax (VAT/GST)',
      formula: '(pre_gateway_subtotal + gateway_fee) × destination_tax_rate',
      inputs: [
        {
          name: 'Taxable Base',
          value: (breakdown.items_total || 0) + (breakdown.purchase_tax || 0) + 
                 (breakdown.shipping || 0) + (breakdown.insurance || 0) + 
                 (breakdown.handling || 0) + (breakdown.customs || 0) + 
                 (breakdown.sales_tax || 0) + (breakdown.fees || 0),
          source: 'Subtotal including gateway fee',
        },
        {
          name: 'Destination Tax Rate',
          value: taxRates.destination_tax || 0,
          source: `${quote.destination_country} VAT/GST`,
          rate: taxRates.destination_tax,
        },
      ],
      calculation: `${((breakdown.items_total || 0) + (breakdown.purchase_tax || 0) + (breakdown.shipping || 0) + (breakdown.insurance || 0) + (breakdown.handling || 0) + (breakdown.customs || 0) + (breakdown.sales_tax || 0) + (breakdown.fees || 0)).toFixed(2)} × ${(taxRates.destination_tax || 0) / 100}`,
      result: breakdown.destination_tax || 0,
      notes: `${quote.destination_country} value-added tax on total + fees`,
    },

    final_total: {
      label: 'Final Total',
      formula: 'all_costs + all_taxes + fees - discounts',
      inputs: [
        { name: 'Items + Purchase Tax', value: (breakdown.items_total || 0) + (breakdown.purchase_tax || 0), source: 'Products' },
        { name: 'Shipping', value: breakdown.shipping || 0, source: 'Freight' },
        { name: 'Insurance', value: breakdown.insurance || 0, source: 'Coverage' },
        { name: 'Handling', value: breakdown.handling || 0, source: 'Processing' },
        { name: 'Customs', value: breakdown.customs || 0, source: 'Import duty' },
        { name: 'Sales Tax', value: breakdown.sales_tax || 0, source: 'Origin tax' },
        { name: 'Gateway Fee', value: breakdown.fees || 0, source: 'Payment' },
        { name: 'Destination Tax', value: breakdown.destination_tax || 0, source: 'VAT/GST' },
        { name: 'Discount', value: -(breakdown.discount || 0), source: 'Promotion' },
      ],
      calculation: 'Sum of all components above',
      result: quote.total || 0,
      notes: 'Complete delivered cost to customer',
    },
  };

  const DebugSection = ({ 
    step, 
    sectionKey 
  }: { 
    step: CalculationStep; 
    sectionKey: string;
  }) => {
    const isOpen = expandedSections.has(sectionKey);
    
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection(sectionKey)}
        >
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-gray-600" />
            <h4 className="font-semibold text-sm">{step.label}</h4>
            <Badge variant="outline" className="text-xs">
              ${step.result.toFixed(2)}
            </Badge>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
        
        {isOpen && (
          <div className="mt-4 space-y-3">
            {/* Formula */}
            <div className="bg-white rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-3 h-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">Formula</span>
              </div>
              <code className="text-xs bg-gray-100 p-2 rounded block font-mono">
                {step.formula}
              </code>
            </div>

            {/* Inputs */}
            <div className="bg-white rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-3 h-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">Input Values</span>
              </div>
              <div className="space-y-2">
                {step.inputs.map((input, idx) => {
                  const isItemBreakdown = input.name.startsWith('├─');
                  return (
                    <div key={idx} className={`flex items-center justify-between text-xs ${isItemBreakdown ? 'ml-4 pt-1' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className={`${isItemBreakdown ? 'text-gray-500' : 'text-gray-600'}`}>{input.name}:</span>
                        {input.rate !== undefined && (
                          <Badge variant="secondary" className="text-xs">
                            {input.rate >= 1 ? `${input.rate.toFixed(1)}%` : `${(input.rate * 100).toFixed(1)}%`}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {input.value !== null && input.value !== undefined ? (
                        <span className="font-mono font-medium">${Number(input.value).toFixed(2)}</span>
                      ) : null}
                      <span className="text-gray-400 text-xs">({input.source})</span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Calculation */}
            <div className="bg-white rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-3 h-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">Calculation</span>
              </div>
              <code className="text-xs bg-gray-100 p-2 rounded block font-mono overflow-x-auto">
                {step.calculation}
              </code>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-600">Result:</span>
                <span className="font-mono font-semibold text-sm">${step.result.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {step.notes && (
              <div className="bg-blue-50 rounded p-3">
                <div className="flex items-center gap-2">
                  <Info className="w-3 h-3 text-blue-600" />
                  <span className="text-xs text-blue-800">{step.notes}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isExpanded) {
    return (
      <Card className={`border-orange-200 bg-orange-50 ${className}`}>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span>Tax Calculation Debug Panel</span>
              <Badge variant="outline" className="text-xs">
                {quote.tax_method || 'Unknown'} Method
              </Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
            >
              <ChevronDown className="w-4 h-4" />
              Show Debug Info
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={`border-orange-200 bg-orange-50 ${className}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <span>Tax Calculation Debug Panel</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {quote.tax_method || 'Unknown'} Method
              </Badge>
              <Badge variant="outline">
                Exchange Rate: {Number(exchangeRate).toFixed(2)}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overview Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-600">Base Cost</div>
              <div className="text-lg font-semibold font-mono">
                ${(breakdown.items_total || 0).toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-600">Total Taxes</div>
              <div className="text-lg font-semibold font-mono text-red-600">
                ${((breakdown.purchase_tax || 0) + (breakdown.customs || 0) + 
                   (breakdown.sales_tax || 0) + (breakdown.destination_tax || 0)).toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-600">Fees & Shipping</div>
              <div className="text-lg font-semibold font-mono text-blue-600">
                ${((breakdown.shipping || 0) + (breakdown.fees || 0) + 
                   (breakdown.handling || 0) + (breakdown.insurance || 0)).toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-xs text-gray-600">Final Total</div>
              <div className="text-lg font-semibold font-mono text-green-600">
                ${(quote.total || 0).toFixed(2)}
              </div>
            </div>
          </div>

          <Separator />

          {/* Detailed Calculations */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Step-by-Step Calculations
            </h3>
            
            <div className="space-y-3">
              {Object.entries(calculationSteps).map(([key, step]) => (
                <DebugSection key={key} step={step} sectionKey={key} />
              ))}
            </div>
          </div>

          {/* Item-Level Breakdowns */}
          {itemBreakdowns.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Per-Item Tax Breakdowns
                </h3>
                <div className="grid gap-3">
                  {itemBreakdowns.map((itemBreakdown, idx) => {
                    const item = quote.items?.find(i => i.id === itemBreakdown.item_id);
                    return (
                      <div key={idx} className="bg-white rounded-lg p-3 text-xs">
                        <div className="font-medium mb-2">{item?.product_name || `Item ${idx + 1}`}</div>
                        <div className="grid grid-cols-4 gap-2 text-gray-600">
                          <div>
                            <span className="block">Customs</span>
                            <span className="font-mono">${(itemBreakdown.customs || 0).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="block">Sales Tax</span>
                            <span className="font-mono">${(itemBreakdown.sales_tax || 0).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="block">Dest. Tax</span>
                            <span className="font-mono">${(itemBreakdown.destination_tax || 0).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="block">Total Tax</span>
                            <span className="font-mono font-semibold">
                              ${((itemBreakdown.customs || 0) + (itemBreakdown.sales_tax || 0) + 
                                 (itemBreakdown.destination_tax || 0)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Raw Data */}
          <Separator />
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
              View Raw Calculation Data
            </summary>
            <pre className="mt-3 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
              {JSON.stringify({
                breakdown: quote.calculation_data?.breakdown,
                tax_rates: quote.tax_rates,
                operational_data: quote.operational_data,
                calculation_method: quote.tax_method,
                exchange_rate: exchangeRate,
              }, null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default TaxCalculationDebugPanel;