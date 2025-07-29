import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { hsnTaxService } from '@/services/HSNTaxService';
import { routeTierTaxService } from '@/services/RouteTierTaxService';

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
  const [routeData, setRouteData] = useState<any>(null);
  
  // Live tax data states
  const [liveHsnRates, setLiveHsnRates] = useState<Record<string, any>>({});
  const [liveRouteRates, setLiveRouteRates] = useState<any>(null);
  const [isLoadingLiveData, setIsLoadingLiveData] = useState(false);

  // Fetch the shipping route data
  useEffect(() => {
    const fetchRouteData = async () => {
      if (!quote.origin_country || !quote.destination_country) return;
      
      const { data, error } = await supabase
        .from('shipping_routes')
        .select('*')
        .eq('origin_country', quote.origin_country)
        .eq('destination_country', quote.destination_country)
        .single();
        
      if (!error && data) {
        setRouteData(data);
      }
    };
    
    fetchRouteData();
  }, [quote.origin_country, quote.destination_country]);
  
  // Fetch live tax data
  useEffect(() => {
    const fetchLiveTaxData = async () => {
      if (!quote.origin_country || !quote.destination_country) return;
      
      setIsLoadingLiveData(true);
      
      try {
        // Fetch route tier taxes (like item debug does)
        const totalWeight = quote.items?.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0) || 0;
        const itemsTotal = quote.items?.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0) || 0;
        
        const routeRates = await routeTierTaxService.getRouteTierTaxes(
          quote.origin_country,
          quote.destination_country,
          itemsTotal,
          totalWeight
        );
        
        setLiveRouteRates(routeRates);
        
        // Fetch HSN rates for items with HSN codes
        const hsnData: Record<string, any> = {};
        
        if (quote.items) {
          for (const item of quote.items) {
            if (item.hsn_code) {
              try {
                const hsnRates = await hsnTaxService.getHSNTaxRates(
                  item.hsn_code,
                  quote.destination_country
                );
                if (hsnRates) {
                  hsnData[item.hsn_code] = hsnRates;
                }
              } catch (error) {
                console.error(`Error fetching HSN rates for ${item.hsn_code}:`, error);
              }
            }
          }
        }
        
        setLiveHsnRates(hsnData);
      } catch (error) {
        console.error('Error fetching live tax data:', error);
      } finally {
        setIsLoadingLiveData(false);
      }
    };
    
    fetchLiveTaxData();
  }, [quote.origin_country, quote.destination_country, quote.items]);

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
  const getShippingBreakdown = (fetchedRouteData: any) => {
    const shippingTotal = breakdown.shipping || 0;
    const totalWeight = quote.items?.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0) || 0;
    
    // Extract all shipping-related data
    const selectedShipping = quote.calculation_data?.selected_shipping || {};
    const embeddedRouteData = selectedShipping.route_data || {};
    const shippingBreakdownData = quote.calculation_data?.shipping_breakdown || {};
    
    // Try to get the actual route's delivery options
    const routeDeliveryOptions = fetchedRouteData?.delivery_options || 
                                embeddedRouteData?.delivery_options || 
                                quote.calculation_data?.route?.delivery_options || 
                                [];
    
    // Try to find shipping breakdown data in various locations
    // Priority: calculation_data.shipping_breakdown > embedded route data > fetched route data
    const calcShippingBreakdown = quote.calculation_data?.shipping_breakdown || {};
    
    const baseShipping = Number(calcShippingBreakdown.base_cost) ||
                        Number(shippingBreakdownData.base_cost) || 
                        Number(embeddedRouteData.base_shipping_cost) ||
                        Number(fetchedRouteData?.base_shipping_cost) ||
                        Number(quote.calculation_data?.shipping_data?.base_cost) || 0;
    
    // Use shipping_per_kg or cost_per_kg from database
    const weightRate = Number(calcShippingBreakdown.weight_rate_per_kg) ||
                      Number(shippingBreakdownData.weight_rate) || 
                      Number(embeddedRouteData.weight_rate_per_kg) ||
                      Number(fetchedRouteData?.shipping_per_kg) ||
                      Number(fetchedRouteData?.cost_per_kg) ||
                      Number(quote.calculation_data?.shipping_data?.weight_rate) || 0;
    
    const deliveryPremium = Number(calcShippingBreakdown.delivery_premium) ||
                           Number(shippingBreakdownData.delivery_premium) || 
                           Number(embeddedRouteData.delivery_premium) ||
                           Number(quote.calculation_data?.shipping_data?.delivery_premium) || 0;
    
    // Extract carrier from delivery options if available
    let actualCarrier = '';
    let deliveryOptionName = '';
    
    // First try to get from calculation_data.selected_shipping
    const calcSelectedShipping = quote.calculation_data?.selected_shipping;
    if (calcSelectedShipping?.carrier) {
      actualCarrier = calcSelectedShipping.carrier;
      deliveryOptionName = calcSelectedShipping.name || '';
    }
    // Then try to get from selected delivery option
    else if (selectedShipping.carrier) {
      actualCarrier = selectedShipping.carrier;
      deliveryOptionName = selectedShipping.name || selectedShipping.delivery_option || '';
    } 
    // Then try to get from route delivery options
    else if (routeDeliveryOptions.length > 0) {
      // Find the selected option or use the first one
      const selectedOptionId = selectedShipping.id || selectedShipping.option_id;
      const selectedOption = selectedOptionId 
        ? routeDeliveryOptions.find((opt: any) => opt.id === selectedOptionId) 
        : routeDeliveryOptions[0];
      
      if (selectedOption) {
        actualCarrier = selectedOption.carrier || '';
        deliveryOptionName = selectedOption.name || '';
      }
    }
    // Fall back to other sources
    else {
      actualCarrier = embeddedRouteData.carrier || quote.shipping_carrier || '';
      deliveryOptionName = selectedShipping.delivery_option || selectedShipping.name || '';
    }
    
    const shippingMethod = quote.shipping_method || '';
    const deliveryOption = deliveryOptionName;
    
    // Extract weight tier details for rate breakdown
    const weightTiers = fetchedRouteData?.weight_tiers || 
                       quote.calculation_data?.route_weight_tiers || 
                       selectedShipping.weight_tiers || 
                       embeddedRouteData.weight_tiers || [];
    
    // Determine weight tier from actual weight
    let weightTierUsed = calcShippingBreakdown.weight_tier_used || 'N/A';
    if (weightTierUsed === 'N/A' && weightTiers && weightTiers.length > 0) {
      for (const tier of weightTiers) {
        if (totalWeight >= tier.min && (tier.max === null || totalWeight <= tier.max)) {
          weightTierUsed = `${tier.min}-${tier.max || '∞'}kg`;
          break;
        }
      }
    }
    const weightTier = weightTierUsed || embeddedRouteData.weight_tier_used || 'N/A';
    const weightCost = Number(calcShippingBreakdown.weight_cost) || 
                      Number(embeddedRouteData.weight_cost) || 
                      (totalWeight * weightRate);
    const costPercentage = Number(quote.calculation_data?.shipping_percentage) || 
                          Number(embeddedRouteData.cost_percentage) || 
                          Number(fetchedRouteData?.cost_percentage) || 0;
    const processingDays = selectedShipping.estimated_days || 
                          embeddedRouteData.processing_days || 
                          fetchedRouteData?.processing_days || 
                          'N/A';
    const volumetricWeight = embeddedRouteData.volumetric_weight || 0;
    const chargeableWeight = embeddedRouteData.chargeable_weight || totalWeight;
    
    const rateSource = embeddedRouteData.rate_source || 
                      (weightTier !== 'N/A' ? 'weight_tier' : 'per_kg_fallback');
    
    // Check if this is IN→NP route with INR rates
    const isINtoNP = quote.origin_country === 'IN' && quote.destination_country === 'NP';
    const currencySymbol = isINtoNP ? '₹' : '$';
    const routeExchangeRate = Number(fetchedRouteData?.exchange_rate) || 1;
    
    // If we still don't have breakdown data, estimate it from the total
    if (baseShipping === 0 && weightRate === 0 && deliveryPremium === 0 && shippingTotal > 0) {
      // For IN->NP route, we know the configuration from database
      if (isINtoNP && fetchedRouteData) {
        // Use actual route data from database
        const baseINR = Number(fetchedRouteData.base_shipping_cost) || 100;
        const exchangeRate = routeExchangeRate || quote.calculation_data?.exchange_rate || 1.6019;
        const baseUSD = baseINR / exchangeRate;
        
        // Calculate weight-based cost using actual tiers from DB
        const routeTiers = fetchedRouteData.weight_tiers || weightTiers;
        let tierForWeight = 0;
        
        // Find the appropriate tier for the weight
        for (const tier of routeTiers) {
          if (totalWeight >= tier.min && (tier.max === null || totalWeight <= tier.max)) {
            tierForWeight = Number(tier.cost) || 0;
            break;
          }
        }
        
        const weightCostINR = totalWeight * tierForWeight;
        const weightCostUSD = weightCostINR / exchangeRate;
        
        // Cost percentage component from route data
        const itemsTotal = breakdown.items_total || 0;
        const routeCostPercentage = Number(fetchedRouteData.cost_percentage) || 2.5;
        const percentageCost = itemsTotal * (routeCostPercentage / 100);
        
        // The difference is likely delivery premium or other fees
        const calculatedBase = baseUSD + weightCostUSD + percentageCost;
        const estimatedPremium = Math.max(0, shippingTotal - calculatedBase);
        
        // Get the actual carrier from route delivery options
        let routeCarrier = actualCarrier;
        if (!routeCarrier && fetchedRouteData?.delivery_options?.length > 0) {
          routeCarrier = fetchedRouteData.delivery_options[0].carrier || '';
        }
        
        return {
          base: baseUSD,
          rate: tierForWeight / exchangeRate,
          premium: estimatedPremium,
          method: shippingMethod,
          carrier: routeCarrier,
          deliveryOption: deliveryOption || fetchedRouteData?.delivery_options?.[0]?.name || 'Standard',
          weightTier: `${totalWeight <= 1 ? '0-1' : totalWeight <= 3 ? '1-3' : totalWeight <= 5 ? '3-5' : '5-∞'}kg`,
          weightCost: weightCostUSD,
          costPercentage: routeCostPercentage,
          processingDays: processingDays,
          volumetricWeight: 0,
          chargeableWeight: totalWeight,
          weightTiers: fetchedRouteData?.weight_tiers || [
            {min: 0, max: 1, cost: 15},
            {min: 1, max: 3, cost: 25},
            {min: 3, max: 5, cost: 35},
            {min: 5, max: null, cost: 45}
          ],
          rateSource: 'route_config',
          note: 'Reconstructed from IN→NP route configuration'
        };
      }
      
      // For other routes, simple estimation
      const estimatedRate = totalWeight > 0 ? shippingTotal / totalWeight : 0;
      return {
        base: 0,
        rate: estimatedRate,
        premium: 0,
        method: shippingMethod,
        carrier: actualCarrier,
        deliveryOption: deliveryOption || 'Standard',
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
      carrier: actualCarrier,
      deliveryOption: deliveryOption || 'Standard',
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

  const shippingBreakdown = getShippingBreakdown(routeData);

  // Get currency symbol for display
  const isINtoNP = quote.origin_country === 'IN' && quote.destination_country === 'NP';
  const currencySymbol = isINtoNP ? '₹' : '$';

  // Calculate method info outside IIFE for reuse
  const quoteLevelMethod = quote.calculation_method_preference || quote.tax_method || 'hsn_only';
  const hasItemLevelMethods = quote.items?.some(item => item.tax_method) || false;
  const itemMethods = hasItemLevelMethods ? [...new Set(quote.items?.map(item => item.tax_method || 'hsn'))] : [];

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
          source: shippingBreakdown.carrier ? 
            `${shippingBreakdown.carrier} - ${shippingBreakdown.deliveryOption}` : 
            (shippingBreakdown.deliveryOption ? shippingBreakdown.deliveryOption : 'Not specified'),
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
          name: 'Weight Rate',
          value: shippingBreakdown.rate,
          source: shippingBreakdown.weightTier !== 'N/A' && shippingBreakdown.weightTier !== 'Unknown' 
            ? `Tier ${shippingBreakdown.weightTier} @ ${currencySymbol}${shippingBreakdown.rate.toFixed(2)}/kg` 
            : shippingBreakdown.note || 'Route per-kg rate',
          rate: shippingBreakdown.rate,
        },
        // Show available weight tiers if we have them
        ...(shippingBreakdown.weightTiers && shippingBreakdown.weightTiers.length > 0 ? [{
          name: '├─ Available Tiers',
          value: 0,
          source: quote.origin_country === 'IN' && quote.destination_country === 'NP' 
            ? shippingBreakdown.weightTiers.map((tier: any) => {
                const exchangeRate = Number(quote.calculation_data?.exchange_rate) || 1.6019;
                const usdRate = Number(tier.cost) / exchangeRate;
                return `${tier.min}-${tier.max || '∞'}kg: ₹${tier.cost}/kg ($${Number.isFinite(usdRate) ? usdRate.toFixed(2) : '0.00'}/kg)`;
              }).join(', ')
            : shippingBreakdown.weightTiers.map((tier: any) => 
                `${tier.min}-${tier.max || '∞'}kg: $${Number.isFinite(tier.cost) ? Number(tier.cost).toFixed(2) : '0.00'}/kg`
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
          source: `${(shippingBreakdown.chargeableWeight || 0).toFixed(2)} kg × $${(shippingBreakdown.rate || 0).toFixed(2)}/kg`,
        },
        {
          name: 'Delivery Premium',
          value: shippingBreakdown.premium,
          source: `${shippingBreakdown.deliveryOption} option`,
        },
        ...(shippingBreakdown.costPercentage > 0 ? [{
          name: 'Value-based Fee',
          value: (breakdown.items_total || 0) * (shippingBreakdown.costPercentage / 100),
          source: `${shippingBreakdown.costPercentage}% of product cost ($${(breakdown.items_total || 0).toFixed(2)})`,
          rate: shippingBreakdown.costPercentage,
        }] : []),
        {
          name: 'Processing Time',
          value: 0,
          source: `${shippingBreakdown.processingDays} days`,
        },
      ],
      calculation: `${(shippingBreakdown.base || 0).toFixed(2)} + (${(shippingBreakdown.chargeableWeight || 0).toFixed(2)} × ${(shippingBreakdown.rate || 0).toFixed(2)}) + ${(shippingBreakdown.premium || 0).toFixed(2)}${shippingBreakdown.costPercentage > 0 ? ` + ${((breakdown.items_total || 0) * (shippingBreakdown.costPercentage / 100)).toFixed(2)}` : ''}`,
      result: breakdown.shipping || 0,
      notes: shippingBreakdown.note ? `Cross-border freight charges (${shippingBreakdown.note})` : 
             quote.origin_country === 'IN' && quote.destination_country === 'NP' ? 
             'Cross-border freight charges (IN→NP route uses INR rates: ₹15-45/kg, converted to USD)' : 
             'Cross-border freight charges',
    },

    customs: {
      label: 'Customs Duty Analysis',
      formula: 'Comprehensive breakdown of all calculation methods',
      inputs: (() => {
        const inputs = [];
        
        // Phase 6: Add data validation warnings
        const warnings = [];
        if (!quote.items || quote.items.length === 0) {
          warnings.push('No items in quote');
        }
        if (!quote.origin_country || !quote.destination_country) {
          warnings.push('Missing origin or destination country');
        }
        if (!breakdown.customs && breakdown.customs !== 0) {
          warnings.push('No customs data in calculation');
        }
        
        // Phase 8: Check for rate mismatches early
        const earlyRateMismatch = 
          (liveHsnRates && Object.keys(liveHsnRates).length > 0 && 
           Object.values(liveHsnRates).some((r: any) => r.customs !== taxRates.customs)) ||
          (liveRouteRates && liveRouteRates.customs !== operationalData?.customs?.smart_tier?.percentage);
          
        if (earlyRateMismatch) {
          warnings.push('⚠️ TAX RATES OUTDATED - Recalculation needed');
        }
        
        if (warnings.length > 0) {
          inputs.push({
            name: '⚠️ DATA WARNINGS',
            value: warnings.length,
            source: warnings.join(' | '),
            rate: 0,
          });
        }
        
        // Phase 5: Quote vs Item Level Clarity
        inputs.push({
          name: '🎭 TAX METHOD HIERARCHY',
          value: 0,
          source: '─── Understanding Quote vs Item Level ───',
          rate: 0,
        });
        
        inputs.push({
          name: '├─ Quote Level',
          value: 0,
          source: `Set on quote: ${quoteLevelMethod} (applies to all items without individual methods)`,
          rate: 0,
        });
        
        if (hasItemLevelMethods) {
          const itemsWithMethods = quote.items?.filter(item => item.tax_method) || [];
          const itemsWithoutMethods = quote.items?.filter(item => !item.tax_method) || [];
          
          inputs.push({
            name: '├─ Item Level Override',
            value: itemsWithMethods.length,
            source: `${itemsWithMethods.length} items have custom methods (overrides quote level)`,
            rate: 0,
          });
          
          if (itemsWithoutMethods.length > 0) {
            inputs.push({
              name: '├─ Default Items',
              value: itemsWithoutMethods.length,
              source: `${itemsWithoutMethods.length} items use quote-level method (${quoteLevelMethod})`,
              rate: 0,
            });
          }
          
          // Show which items use which methods
          const methodCounts: Record<string, number> = {};
          quote.items?.forEach(item => {
            const method = item.tax_method || quoteLevelMethod;
            methodCounts[method] = (methodCounts[method] || 0) + 1;
          });
          
          Object.entries(methodCounts).forEach(([method, count]) => {
            inputs.push({
              name: `├─ ${method} method`,
              value: count,
              source: `Used by ${count} item${count > 1 ? 's' : ''}`,
              rate: 0,
            });
          });
        } else {
          inputs.push({
            name: '├─ All Items',
            value: quote.items?.length || 0,
            source: `All ${quote.items?.length || 0} items use quote-level method`,
            rate: 0,
          });
        }
        
        // Add clarity on how the system works
        inputs.push({
          name: '📌 HOW IT WORKS',
          value: 0,
          source: '─── Tax Method Priority Rules ───',
          rate: 0,
        });
        
        inputs.push({
          name: '├─ Priority',
          value: 0,
          source: 'Item-level methods ALWAYS override quote-level method',
          rate: 0,
        });
        
        inputs.push({
          name: '├─ Quote Methods',
          value: 0,
          source: '3 types: manual, hsn_only, route_based',
          rate: 0,
        });
        
        inputs.push({
          name: '├─ Item Methods',
          value: 0,
          source: '3 types: hsn, route, manual',
          rate: 0,
        });
        
        inputs.push({
          name: '├─ Current Mode',
          value: 0,
          source: hasItemLevelMethods ? '🔸 ITEM MODE: Each item calculated separately' : '🔹 QUOTE MODE: All items use same method',
          rate: 0,
        });
        
        // 1. Current Active Method - Check both quote-level and item-level
        const activeValuation = quote.valuation_method_preference || 'product_value';
        const cifValue = (breakdown.items_total || 0) + (breakdown.purchase_tax || 0) + (breakdown.shipping || 0) + (breakdown.insurance || 0);
        
        inputs.push({
          name: '🎯 ACTIVE METHOD',
          value: hasItemLevelMethods ? 'PER-ITEM' : quoteLevelMethod.toUpperCase(),
          source: hasItemLevelMethods ? `Item methods: ${itemMethods.join(', ')}` : `${quoteLevelMethod} mode with ${activeValuation} valuation`,
          rate: 0,
        });
        
        // 2. CIF Calculation Base & Actual Customs Base
        inputs.push({
          name: '💰 CIF Components',
          value: cifValue,
          source: `Items($${(breakdown.items_total || 0).toFixed(2)}) + Shipping($${(breakdown.shipping || 0).toFixed(2)}) + Insurance($${(breakdown.insurance || 0).toFixed(2)})`,
          rate: 0,
        });
        
        // Get the actual customs calculation base used
        const hsnCalculationData = quote.calculation_data?.hsn_calculation;
        const hasMinimumValuationData = hsnCalculationData?.items_with_minimum_valuation > 0;
        const recalculatedTotal = hsnCalculationData?.recalculated_items_total || breakdown.items_total || 0;
        
        // Determine what customs base was actually used based on valuation method
        let actualCustomsBase = cifValue;
        let customsBaseExplanation = 'Using standard CIF value';
        
        if (activeValuation === 'minimum_valuation' && hasMinimumValuationData) {
          actualCustomsBase = (recalculatedTotal || breakdown.items_total || 0) + (breakdown.shipping || 0) + (breakdown.insurance || 0);
          customsBaseExplanation = 'Using HSN minimum valuation for items';
        } else if (activeValuation === 'higher_of_both' && hasMinimumValuationData) {
          const productCIF = cifValue;
          const minimumCIF = (recalculatedTotal || breakdown.items_total || 0) + (breakdown.shipping || 0) + (breakdown.insurance || 0);
          actualCustomsBase = Math.max(productCIF, minimumCIF);
          customsBaseExplanation = `Using higher of: Product($${productCIF.toFixed(2)}) vs Minimum($${minimumCIF.toFixed(2)})`;
        }
        
        inputs.push({
          name: '🎯 ACTUAL CUSTOMS BASE',
          value: actualCustomsBase,
          source: customsBaseExplanation,
          rate: 0,
        });
        
        // 3. HSN Method Analysis
        inputs.push({
          name: '📊 HSN METHOD',
          value: 0,
          source: '─── HSN Classification Analysis ───',
          rate: 0,
        });
        
        // Check if HSN data is available
        const hasHsnData = quote.items?.some(item => item.hsn_code) || false;
        const storedHsnRate = hasHsnData ? (taxRates.customs || 0) : 0;
        
        // Get live HSN rate (average if multiple items)
        let liveHsnRate = 0;
        if (hasHsnData && Object.keys(liveHsnRates).length > 0) {
          const rates = Object.values(liveHsnRates).map((r: any) => r.customs || 0);
          liveHsnRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
        }
        
        const hsnRate = liveHsnRate || storedHsnRate; // Prefer live data
        const hsnResult = actualCustomsBase * (hsnRate / 100);
        
        inputs.push({
          name: `├─ HSN Available`,
          value: hasHsnData ? 1 : 0,
          source: hasHsnData ? `${quote.items?.filter(i => i.hsn_code).length}/${quote.items?.length || 0} items have HSN codes` : 'No HSN codes found',
          rate: 0,
        });
        
        inputs.push({
          name: `├─ HSN Rate (Stored)`,
          value: storedHsnRate,
          source: storedHsnRate > 0 ? 'From calculation_data' : 'No stored data',
          rate: storedHsnRate,
        });
        
        if (hasHsnData) {
          inputs.push({
            name: `├─ HSN Rate (Live)`,
            value: liveHsnRate,
            source: isLoadingLiveData ? '⏳ Loading...' : liveHsnRate > 0 ? '🟢 LIVE from HSN service' : '⚪ No live data',
            rate: liveHsnRate,
          });
          
          if (liveHsnRate > 0 && storedHsnRate !== liveHsnRate) {
            inputs.push({
              name: `├─ ⚠️ Rate Mismatch`,
              value: Math.abs(liveHsnRate - storedHsnRate),
              source: `Live: ${liveHsnRate}% vs Stored: ${storedHsnRate}%`,
              rate: 0,
            });
          }
        }
        
        inputs.push({
          name: `├─ HSN Calculation`,
          value: hsnResult,
          source: `$${actualCustomsBase.toFixed(2)} × ${hsnRate}% = $${hsnResult.toFixed(2)}`,
          rate: 0,
        });
        
        // 4. Route Method Analysis
        inputs.push({
          name: '🌍 ROUTE METHOD',
          value: 0,
          source: '─── Route Tier Analysis ───',
          rate: 0,
        });
        
        // Check if route data is available
        const routeKey = `${quote.origin_country}-${quote.destination_country}`;
        const storedRouteCustoms = operationalData?.customs?.smart_tier?.percentage || 0;
        const liveRouteCustoms = liveRouteRates?.customs || 0;
        const routeCustoms = liveRouteCustoms || storedRouteCustoms; // Prefer live data
        const routeResult = actualCustomsBase * (routeCustoms / 100);
        const hasStoredRouteData = storedRouteCustoms > 0;
        const hasLiveRouteData = liveRouteCustoms > 0;
        
        inputs.push({
          name: `├─ Route Available`,
          value: hasLiveRouteData || hasStoredRouteData ? 1 : 0,
          source: hasLiveRouteData || hasStoredRouteData ? `Route ${routeKey} has tier data` : `Route ${routeKey} missing from route_customs_tiers`,
          rate: 0,
        });
        
        inputs.push({
          name: `├─ Route Rate (Stored)`,
          value: storedRouteCustoms,
          source: hasStoredRouteData ? 'From operational_data' : 'No stored data',
          rate: storedRouteCustoms,
        });
        
        inputs.push({
          name: `├─ Route Rate (Live)`,
          value: liveRouteCustoms,
          source: isLoadingLiveData ? '⏳ Loading...' : liveRouteCustoms > 0 ? `🟢 LIVE: ${liveRouteRates?.tier_name || 'tier'}` : '⚪ No route tier data',
          rate: liveRouteCustoms,
        });
        
        if (liveRouteCustoms > 0 && storedRouteCustoms !== liveRouteCustoms) {
          inputs.push({
            name: `├─ ⚠️ Rate Mismatch`,
            value: Math.abs(liveRouteCustoms - storedRouteCustoms),
            source: `Live: ${liveRouteCustoms}% vs Stored: ${storedRouteCustoms}%`,
            rate: 0,
          });
        }
        
        inputs.push({
          name: `├─ Route Calculation`,
          value: routeResult,
          source: `$${actualCustomsBase.toFixed(2)} × ${routeCustoms}% = $${routeResult.toFixed(2)}`,
          rate: 0,
        });
        
        // 5. Manual Method Analysis
        inputs.push({
          name: '✏️ MANUAL METHOD',
          value: 0,
          source: '─── Manual Input Analysis (User customs + Route dest tax) ───',
          rate: 0,
        });
        
        // For per-item calculations, get manual rate from items
        let manualRate = 0;
        if (hasItemLevelMethods && quote.items) {
          const manualItems = quote.items.filter(item => item.tax_method === 'manual');
          if (manualItems.length > 0) {
            // Calculate weighted average manual rate
            let weightedSum = 0;
            let totalValue = 0;
            manualItems.forEach(item => {
              const itemValue = (item.costprice_origin || 0) * (item.quantity || 1);
              const itemRate = item.tax_options?.manual?.rate || 0;
              weightedSum += itemRate * itemValue;
              totalValue += itemValue;
            });
            manualRate = totalValue > 0 ? weightedSum / totalValue : 0;
          }
        } else {
          // Quote level - manual rates are only at item level now
          manualRate = 0;
        }
        const manualResult = actualCustomsBase * (manualRate / 100);
        
        inputs.push({
          name: `├─ Manual Rate`,
          value: manualRate,
          source: manualRate > 0 ? 'User/Admin input' : 'No manual rate set',
          rate: manualRate,
        });
        
        inputs.push({
          name: `├─ Destination Tax`,
          value: routeCustoms > 0 ? 'From route' : 'No route data',
          source: 'Manual method uses route destination tax',
          rate: 0,
        });
        
        inputs.push({
          name: `├─ Manual Calculation`,
          value: manualResult,
          source: `$${actualCustomsBase.toFixed(2)} × ${manualRate}% = $${manualResult.toFixed(2)}`,
          rate: 0,
        });
        
        
        // 7. Method Comparison
        inputs.push({
          name: '📈 COMPARISON',
          value: 0,
          source: '─── Method Results Comparison ───',
          rate: 0,
        });
        
        const methods = [
          { name: 'HSN', result: hsnResult, available: hasHsnData, isLive: liveHsnRate > 0 },
          { name: 'Route', result: routeResult, available: hasLiveRouteData || hasStoredRouteData, isLive: hasLiveRouteData },
          { name: 'Manual', result: manualResult, available: manualRate > 0, isLive: false }
        ];
        
        const availableMethods = methods.filter(m => m.available);
        const minResult = availableMethods.reduce((min, m) => Math.min(min, m.result), Infinity);
        const maxResult = availableMethods.reduce((max, m) => Math.max(max, m.result), -Infinity);
        
        availableMethods.forEach(method => {
          const isLowest = method.result === minResult && availableMethods.length > 1;
          const isHighest = method.result === maxResult && availableMethods.length > 1;
          const status = isLowest ? '🟢 LOWEST' : isHighest ? '🔴 HIGHEST' : '🟡 MIDDLE';
          const liveIndicator = method.isLive ? ' (LIVE)' : '';
          
          inputs.push({
            name: `├─ ${method.name}${liveIndicator}`,
            value: method.result,
            source: `${status} - $${method.result.toFixed(2)}`,
            rate: 0,
          });
        });
        
        if (availableMethods.length > 1) {
          const savings = maxResult - minResult;
          inputs.push({
            name: `├─ Potential Savings`,
            value: savings,
            source: `Using lowest method saves $${savings.toFixed(2)}`,
            rate: 0,
          });
        }
        
        // 7. Valuation Method Impact
        inputs.push({
          name: '💎 VALUATION IMPACT',
          value: 0,
          source: '─── Valuation Method Analysis ───',
          rate: 0,
        });
        
        const productValue = breakdown.items_total || 0;
        const minimumValuation = hasMinimumValuationData 
          ? recalculatedTotal 
          : productValue * 1.2; // Estimated if no HSN data
        const higherOfBoth = Math.max(productValue, minimumValuation);
        
        // Show which valuation is active
        const valuationInUse = activeValuation === 'minimum_valuation' 
          ? minimumValuation 
          : activeValuation === 'higher_of_both' 
          ? higherOfBoth 
          : productValue;
        
        inputs.push({
          name: `├─ Product Value`,
          value: productValue,
          source: activeValuation === 'product_value' ? '✅ ACTIVE' : 'Actual item prices',
          rate: 0,
        });
        
        inputs.push({
          name: `├─ Minimum Valuation`,
          value: minimumValuation,
          source: activeValuation === 'minimum_valuation' 
            ? `✅ ACTIVE${hasMinimumValuationData ? ' (HSN data)' : ' (estimated 20% higher)'}`
            : hasMinimumValuationData ? 'From HSN data' : 'Estimated +20%',
          rate: 0,
        });
        
        inputs.push({
          name: `├─ Higher of Both`,
          value: higherOfBoth,
          source: activeValuation === 'higher_of_both' 
            ? `✅ ACTIVE (${higherOfBoth === minimumValuation ? 'minimum' : 'product'} value wins)`
            : `Max of product vs minimum`,
          rate: 0,
        });
        
        // Show the valuation difference impact
        const valuationDifference = valuationInUse - productValue;
        if (valuationDifference > 0) {
          inputs.push({
            name: `├─ Valuation Impact`,
            value: valuationDifference,
            source: `+$${valuationDifference.toFixed(2)} added to item value for customs`,
            rate: 0,
          });
        }
        
        // Show HSN minimum valuation details if available
        if (hasMinimumValuationData && hsnCalculationData) {
          inputs.push({
            name: `├─ HSN Details`,
            value: hsnCalculationData.items_with_minimum_valuation,
            source: `${hsnCalculationData.items_with_minimum_valuation} items have HSN minimum valuations`,
            rate: 0,
          });
        }
        
        // Phase 4: Comprehensive Method Comparison Matrix
        inputs.push({
          name: '📊 METHOD MATRIX',
          value: 0,
          source: '─── All Methods Side-by-Side ───',
          rate: 0,
        });
        
        // Calculate all methods with same base for fair comparison
        const methodMatrix = {
          hsn: {
            rate: liveHsnRate || storedHsnRate,
            base: actualCustomsBase,
            amount: actualCustomsBase * ((liveHsnRate || storedHsnRate) / 100),
            isLive: liveHsnRate > 0,
            available: hasHsnData,
            source: hasHsnData ? (liveHsnRate > 0 ? 'Live HSN Service' : 'Stored HSN Data') : 'No HSN codes'
          },
          route: {
            rate: liveRouteCustoms || storedRouteCustoms,
            base: actualCustomsBase,
            amount: actualCustomsBase * ((liveRouteCustoms || storedRouteCustoms) / 100),
            isLive: hasLiveRouteData,
            available: hasLiveRouteData || hasStoredRouteData,
            source: hasLiveRouteData ? 'Live Route Data' : (hasStoredRouteData ? 'Stored Route Data' : 'No route data')
          },
          manual: {
            rate: manualRate,
            base: actualCustomsBase,
            amount: actualCustomsBase * (manualRate / 100),
            isLive: false,
            available: manualRate > 0,
            source: manualRate > 0 ? 'Item-level rates' : 'Not configured'
          }
        };
        
        // Display matrix
        Object.entries(methodMatrix).forEach(([method, data]) => {
          const statusIcon = data.available ? (data.isLive ? '🟢' : '🟡') : '🔴';
          const methodName = method.charAt(0).toUpperCase() + method.slice(1);
          
          inputs.push({
            name: `├─ ${statusIcon} ${methodName}`,
            value: data.amount,
            source: `${data.rate.toFixed(1)}% × $${data.base.toFixed(2)} = $${data.amount.toFixed(2)} | ${data.source}`,
            rate: data.rate,
          });
        });
        
        // Show active method result vs others
        const activeMethod = hasItemLevelMethods ? 'per-item' : quoteLevelMethod;
        const actualCustoms = breakdown.customs || 0;
        const perItemCustomsTotal = itemBreakdowns.reduce((sum, ib) => sum + (ib.customs || 0), 0);
        const expectedFromMatrix = (() => {
          if (hasItemLevelMethods) {
            return perItemCustomsTotal;
          }
          switch (activeMethod) {
            case 'hsn':
            case 'hsn_only':
              return methodMatrix.hsn.amount;
            case 'route':
            case 'route_based':
              return methodMatrix.route.amount;
            case 'manual':
              return methodMatrix.manual.amount;
            default:
              return 0;
          }
        })();
        
        if (Math.abs(actualCustoms - expectedFromMatrix) > 0.01) {
          inputs.push({
            name: `├─ ⚠️ DISCREPANCY`,
            value: actualCustoms - expectedFromMatrix,
            source: `Actual ($${actualCustoms.toFixed(2)}) vs Expected ($${expectedFromMatrix.toFixed(2)})`,
            rate: 0,
          });
        }

        // Show actual current calculation
        inputs.push({
          name: '✅ FINAL RESULT',
          value: breakdown.customs || 0,
          source: hasItemLevelMethods 
            ? `Applied: Per-item methods (${itemMethods.join(', ')}) with ${activeValuation} valuation`
            : `Applied: ${quoteLevelMethod} method with ${activeValuation} valuation`,
          rate: 0,
        });
        
        // If per-item methods, show breakdown
        if (hasItemLevelMethods && itemBreakdowns.length > 0) {
          inputs.push({
            name: '📋 ITEM BREAKDOWN',
            value: 0,
            source: '─── Per-Item Method Application ───',
            rate: 0,
          });
          
          itemBreakdowns.forEach((itemBreakdown, idx) => {
            const item = quote.items?.[idx];
            if (item) {
              inputs.push({
                name: `├─ ${item.product_name}`,
                value: itemBreakdown.customs || 0,
                source: `Method: ${item.tax_method || 'hsn'} → $${(itemBreakdown.customs || 0).toFixed(2)}`,
                rate: 0,
              });
            }
          });
          
          // Show per-item total
          inputs.push({
            name: `├─ Per-Item Total`,
            value: perItemCustomsTotal,
            source: `Sum of all item customs: $${perItemCustomsTotal.toFixed(2)}`,
            rate: 0,
          });
        }
        
        // Check for rate mismatches
        const hasRateMismatch = 
          (liveHsnRate > 0 && Math.abs(liveHsnRate - storedHsnRate) > 0.01) ||
          (liveRouteCustoms > 0 && Math.abs(liveRouteCustoms - storedRouteCustoms) > 0.01);
        
        // Phase 6: Root Cause Analysis
        if (Math.abs(actualCustoms - expectedFromMatrix) > 0.01 || hasRateMismatch) {
          inputs.push({
            name: '🔍 ROOT CAUSE ANALYSIS',
            value: 0,
            source: '─── Why the Discrepancy? ───',
            rate: 0,
          });
          
          // Check for common issues
          if (hasItemLevelMethods && perItemCustomsTotal === 0) {
            inputs.push({
              name: '├─ Issue',
              value: 0,
              source: '❌ Per-item calculations returning $0',
              rate: 0,
            });
            inputs.push({
              name: '├─ Likely Cause',
              value: 0,
              source: 'Missing HSN codes or route data for items',
              rate: 0,
            });
          } else if (actualCustoms === 0 && expectedFromMatrix > 0) {
            inputs.push({
              name: '├─ Issue',
              value: 0,
              source: '❌ Calculation engine returning $0',
              rate: 0,
            });
            inputs.push({
              name: '├─ Likely Cause',
              value: 0,
              source: 'Tax method not properly set or data not saved',
              rate: 0,
            });
          } else if (actualCustoms > 0 && actualCustoms !== expectedFromMatrix) {
            inputs.push({
              name: '├─ Issue',
              value: 0,
              source: '❌ Calculation mismatch',
              rate: 0,
            });
            inputs.push({
              name: '├─ Likely Cause',
              value: 0,
              source: 'Stored data outdated - recalculation needed',
              rate: 0,
            });
          }
          
          // Check for rate mismatches specifically
          if (hasRateMismatch) {
            inputs.push({
              name: '├─ Issue',
              value: 0,
              source: '❌ Tax rates have changed',
              rate: 0,
            });
            inputs.push({
              name: '├─ Details',
              value: 0,
              source: 'Live rates differ from stored calculation',
              rate: 0,
            });
          }
          
          inputs.push({
            name: '├─ Solution',
            value: 0,
            source: '💡 Click "Recalculate Quote" to update',
            rate: 0,
          });
        }
        
        return inputs;
      })(),
      calculation: hasItemLevelMethods 
        ? `Current: PER-ITEM methods (${itemMethods.join(', ')})`
        : `Current: ${quoteLevelMethod.toUpperCase()} method`,
      result: breakdown.customs || 0,
      notes: `Comprehensive analysis of all 4 customs calculation methods (HSN, Country/Route, Manual, Customs) for ${quote.origin_country}→${quote.destination_country} route. Item-level methods override quote-level preferences when set.`,
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
              {isLoadingLiveData && (
                <Badge variant="secondary" className="animate-pulse">
                  Loading Live Data...
                </Badge>
              )}
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