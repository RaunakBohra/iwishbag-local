import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronDown, 
  ChevronRight, 
  MoreVertical,
  Package,
  DollarSign,
  Scale,
  FileText,
  X,
  Calculator,
  Globe,
  Check,
  Brain,
  Database,
  Bot,
  Settings,
  Receipt,
  ExternalLink,
  Hash,
  Trash2,
  Copy as CopyIcon,
  Star,
  Download,
  Link,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SleekHSNSearch } from '@/components/admin/SleekHSNSearch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { volumetricWeightService } from '@/services/VolumetricWeightService';
import { hsnWeightService } from '@/services/HSNWeightService';
import { smartWeightEstimator } from '@/services/SmartWeightEstimator';
import { taxRateService } from '@/services/TaxRateService';
import { hsnTaxService } from '@/services/HSNTaxService';
import { routeTierTaxService } from '@/services/RouteTierTaxService';
import { supabase } from '@/integrations/supabase/client';
import { getItemMinimumValuation, getValuationComparison, formatValuationAmount, fetchItemMinimumValuation } from '@/utils/valuationUtils';
import type { QuoteItem } from '@/types/unified-quote';

// Extended interface for SleekProductTable specific features
interface SleekProductTableItem extends QuoteItem {
  product_name?: string; // Alias for name field
  product_url?: string; // Alias for url field  
  price?: number; // Alias for costprice_origin field
  weight_source?: string;
  dimensions?: { length: number; width: number; height: number; unit?: 'cm' | 'in' };
  image_url?: string;
  seller?: string;
  // Additional display options
  weight_options?: {
    hsn?: number;
    ml?: number;
    volumetric?: number;
  };
  tax_options?: {
    customs?: { rate: number; amount: number };
    hsn?: { rate: number; amount: number };
    country?: { rate: number; amount: number };
    manual?: { rate: number; amount: number };
  };
}

interface SleekProductTableProps {
  items: SleekProductTableItem[];
  onUpdateItem: (itemId: string, updates: Partial<SleekProductTableItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onDuplicateItem: (item: SleekProductTableItem) => void;
  onRecalculate: (updatedItems?: any[]) => void;
  selectedShippingOption?: {
    id: string;
    name: string;
    carrier: string;
    volumetric_divisor?: number;
  };
  quote?: any; // Quote object for accessing operational_data
}

export const SleekProductTable: React.FC<SleekProductTableProps> = ({
  items,
  onUpdateItem,
  onDeleteItem,
  onDuplicateItem,
  onRecalculate,
  selectedShippingOption,
  quote,
}) => {
  // State for expanded rows - default to all expanded
  const [expandedRows, setExpandedRows] = useState<string[]>(items.map(item => item.id));
  const [editingField, setEditingField] = useState<{itemId: string, field: string} | null>(null);
  const [loadingWeight, setLoadingWeight] = useState<{itemId: string, source: string} | null>(null);
  const [editingManualWeight, setEditingManualWeight] = useState<string | null>(null);
  const [editingManualTaxRate, setEditingManualTaxRate] = useState<string | null>(null);
  const [editingDimension, setEditingDimension] = useState<{itemId: string, field: 'length' | 'width' | 'height'} | null>(null);
  const [hsnCategories, setHsnCategories] = useState<Record<string, string>>({});
  const [dynamicTaxRates, setDynamicTaxRates] = useState<{
    customsDefault: number;
    manualDefault: number;
    countryVatRate: number;
  }>({ customsDefault: 10, manualDefault: 15, countryVatRate: 18 });
  
  // Add debug data state for real-time tax values
  const [debugTaxData, setDebugTaxData] = useState<Record<string, {
    hsnRates?: { customs: number; vat: number; sales_tax: number; };
    routeRates?: { customs: number; vat: number; sales_tax: number; };
  }>>({});

  // State for real-time minimum valuations (fallback when calculation_data is not available)
  const [realtimeMinimumValuations, setRealtimeMinimumValuations] = useState<Record<string, {
    amount: number;
    currency: string;
    usdAmount: number;
    loading?: boolean;
  }>>({});

  // Pre-fetch tax debug data for all items
  useEffect(() => {
    const fetchTaxDebugData = async () => {
      if (!quote) return;
      
      const newDebugData: Record<string, any> = {};
      
      // Fetch route rates once for all items
      const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0) * (item.quantity || 1), 0);
      const itemsTotal = items.reduce((sum, item) => sum + (item.costprice_origin || item.price || 0) * (item.quantity || 1), 0);
      
      try {
        const routeRates = await routeTierTaxService.getRouteTierTaxes(
          quote.origin_country,
          quote.destination_country,
          itemsTotal,
          totalWeight
        );
        
        for (const item of items) {
          const itemDebugData: any = { routeRates };
          
          // Fetch HSN rates if item has HSN code
          if (item.hsn_code) {
            try {
              const hsnRates = await hsnTaxService.getHSNTaxRates(
                item.hsn_code,
                quote.destination_country
              );
              itemDebugData.hsnRates = hsnRates;
            } catch (error) {
              console.error(`Failed to fetch HSN rates for ${item.hsn_code}:`, error);
            }
          }
          
          newDebugData[item.id] = itemDebugData;
        }
        
        setDebugTaxData(newDebugData);
      } catch (error) {
        console.error('Failed to fetch tax debug data:', error);
      }
    };
    
    fetchTaxDebugData();
  }, [items, quote?.origin_country, quote?.destination_country]);

  // Pre-fetch weights for all items on mount
  useEffect(() => {
    const fetchWeightsForItems = async () => {
      for (const item of items) {
        // Skip if weight options already populated
        if (item.weight_options?.hsn && item.weight_options?.ml) continue;
        
        const newWeightOptions: any = { ...item.weight_options };
        
        // Fetch HSN weight if available
        if (item.hsn_code && !newWeightOptions.hsn) {
          try {
            const hsnData = await hsnWeightService.getHSNWeight(item.hsn_code);
            if (hsnData) {
              newWeightOptions.hsn = hsnData.average;
            }
          } catch (error) {
            console.error(`Failed to fetch HSN weight for ${item.hsn_code}:`, error);
          }
        }
        
        // Fetch ML weight if not available
        if (!newWeightOptions.ml) {
          try {
            const mlWeight = await smartWeightEstimator.estimateWeight(
              item.product_name,
              item.product_url
            );
            if (mlWeight && mlWeight.estimated_weight > 0) {
              newWeightOptions.ml = mlWeight.estimated_weight;
            }
          } catch (error) {
            console.error(`Failed to fetch ML weight for ${item.product_name}:`, error);
          }
        }
        
        // Update item if we fetched new weights
        if (newWeightOptions.hsn || newWeightOptions.ml) {
          onUpdateItem(item.id, { weight_options: newWeightOptions });
        }
      }
    };
    
    fetchWeightsForItems();
  }, [items.length]); // Only re-run when number of items changes

  // Fetch HSN categories for items with HSN codes
  useEffect(() => {
    const fetchHSNCategories = async () => {
      const hsnCodes = items.filter(item => item.hsn_code).map(item => item.hsn_code!);
      if (hsnCodes.length === 0) return;
      
      try {
        const { data } = await supabase
          .from('hsn_master')
          .select('hsn_code, category')
          .in('hsn_code', hsnCodes);
        
        if (data) {
          const categories: Record<string, string> = {};
          data.forEach(hsn => {
            categories[hsn.hsn_code] = hsn.category;
          });
          setHsnCategories(categories);
        }
      } catch (error) {
        console.error('Failed to fetch HSN categories:', error);
      }
    };
    
    fetchHSNCategories();
  }, [items]);

  // Fetch dynamic tax rates based on quote destination country
  useEffect(() => {
    const fetchDynamicTaxRates = async () => {
      if (!quote?.destination_country) return;
      
      try {
        const [customsDefault, manualDefault, countryVatRate] = await Promise.all([
          taxRateService.getCountryCustomsDefault(quote.destination_country),
          taxRateService.getCountryManualDefault(quote.destination_country),
          taxRateService.getCountryVATRate(quote.destination_country)
        ]);

        setDynamicTaxRates({
          customsDefault,
          manualDefault,
          countryVatRate
        });
        
        console.log(`[Dynamic Tax Rates] Loaded for ${quote.destination_country}:`, {
          customsDefault,
          manualDefault,
          countryVatRate
        });
      } catch (error) {
        console.error('Failed to fetch dynamic tax rates:', error);
      }
    };
    
    fetchDynamicTaxRates();
  }, [quote?.destination_country]);

  // Fetch real-time minimum valuations for items missing calculation data
  useEffect(() => {
    console.log(`[REALTIME MIN VAL] useEffect triggered`, {
      itemsLength: items.length,
      originCountry: quote?.origin_country,
      hasItems: items.length > 0,
      hasQuote: !!quote
    });

    const fetchRealtimeMinimumValuations = async () => {
      if (!quote?.origin_country) {
        console.log(`[REALTIME MIN VAL] No origin country available: ${quote?.origin_country}`);
        return;
      }

      console.log(`[REALTIME MIN VAL] Starting fetch for ${items.length} items`);
      const newRealtimeValuations: Record<string, any> = {};
      
      for (const item of items) {
        // Skip if we already have calculation data or no HSN code
        if (!item.hsn_code) {
          console.log(`[REALTIME MIN VAL] Skipping ${item.id} - no HSN code`);
          continue;
        }
        
        const hasCalculationData = getItemMinimumValuation(quote, item.id) > 0;
        console.log(`[REALTIME MIN VAL] Item ${item.id} (${item.product_name}):`, {
          hsn_code: item.hsn_code,
          hasCalculationData,
          calculationAmount: getItemMinimumValuation(quote, item.id)
        });
        
        if (hasCalculationData) {
          console.log(`[REALTIME MIN VAL] Skipping ${item.id} - already has calculation data`);
          continue;
        }

        // Set loading state
        setRealtimeMinimumValuations(prev => ({
          ...prev,
          [item.id]: { amount: 0, currency: 'USD', usdAmount: 0, loading: true }
        }));

        try {
          console.log(`[REALTIME MIN VAL] Fetching for item ${item.id} (${item.product_name})`);
          const realtimeData = await fetchItemMinimumValuation(item, quote.origin_country);
          
          if (realtimeData) {
            newRealtimeValuations[item.id] = {
              amount: realtimeData.amount,
              currency: realtimeData.currency,
              usdAmount: realtimeData.usdAmount,
              loading: false
            };
            console.log(`[REALTIME MIN VAL] ✅ Fetched for ${item.id}: ${realtimeData.amount} ${realtimeData.currency}`);
          } else {
            console.log(`[REALTIME MIN VAL] ❌ No data found for ${item.id}`);
            newRealtimeValuations[item.id] = { amount: 0, currency: 'USD', usdAmount: 0, loading: false };
          }
        } catch (error) {
          console.error(`[REALTIME MIN VAL] Error fetching for ${item.id}:`, error);
          newRealtimeValuations[item.id] = { amount: 0, currency: 'USD', usdAmount: 0, loading: false };
        }
      }

      if (Object.keys(newRealtimeValuations).length > 0) {
        setRealtimeMinimumValuations(prev => ({ ...prev, ...newRealtimeValuations }));
      }
    };

    // Call the function
    fetchRealtimeMinimumValuations();
    console.log(`[REALTIME MIN VAL] useEffect completed, function called`);
  }, [items, quote?.origin_country]);

  // Helper function to get minimum valuation with real-time fallback
  const getMinimumValuationWithFallback = (itemId: string): { amount: number; loading: boolean } => {
    // First try the enhanced utility function (includes fallbacks)
    const calculationAmount = getItemMinimumValuation(quote, itemId);
    console.log(`[FALLBACK HELPER] Item ${itemId}: calculationAmount = ${calculationAmount}`);
    
    if (calculationAmount > 0) {
      console.log(`[FALLBACK HELPER] Using calculation amount: ${calculationAmount}`);
      return { amount: calculationAmount, loading: false };
    }

    // Fall back to real-time data
    const realtimeData = realtimeMinimumValuations[itemId];
    console.log(`[FALLBACK HELPER] Real-time data for ${itemId}:`, realtimeData);
    
    if (realtimeData) {
      console.log(`[FALLBACK HELPER] Using real-time amount: ${realtimeData.amount}, loading: ${realtimeData.loading}`);
      return { amount: realtimeData.amount, loading: realtimeData.loading || false };
    }

    console.log(`[FALLBACK HELPER] No data found for ${itemId}, returning 0`);
    return { amount: 0, loading: false };
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(row => row !== id) : [...prev, id]
    );
  };

  const handleFieldEdit = (itemId: string, field: string, value: any) => {
    onUpdateItem(itemId, { [field]: value });
    setEditingField(null);
    
    // Recalculate if weight, price, or tax-related field changed
    if (['price', 'weight', 'weight_source', 'tax_method', 'valuation_method', 'hsn_code'].includes(field)) {
      // Pass updated items to avoid state timing issues
      const updatedItems = items.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
      );
      onRecalculate(updatedItems);
    }
  };

  const calculateVolumetricWeight = (dimensions: any) => {
    if (!dimensions) return null;
    const { length, width, height, unit } = dimensions;
    
    // Use the service to calculate volumetric weight
    // Default to air divisor (5000) for the product table
    return volumetricWeightService.calculateVolumetricWeight(
      { length, width, height, unit: unit || 'cm' },
      5000 // Air freight divisor
    );
  };

  return (
    <div className="w-full space-y-3">
      {items.map((item) => {
        const isExpanded = expandedRows.includes(item.id);
        const volumetricWeight = calculateVolumetricWeight(item.dimensions);
        
        return (
          <div key={item.id} className="group">
            {/* Main Row with fixed grid layout for alignment */}
            <div className={cn(
              "border rounded-lg transition-all duration-200 bg-white",
              isExpanded ? "shadow-lg border-blue-200 ring-1 ring-blue-100" : "hover:shadow-md hover:border-gray-300"
            )}>
              <div className="p-3">
                <div className="flex items-center gap-4">
                  {/* Expand Button */}
                  <button
                    onClick={() => toggleRowExpansion(item.id)}
                    className={cn(
                      "p-1.5 rounded transition-all flex-shrink-0",
                      isExpanded ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50 text-gray-400"
                    )}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                  
                  {/* Product Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {item.image_url && (
                      <div className="w-10 h-10 bg-gray-50 rounded-md overflow-hidden flex-shrink-0 border border-gray-100">
                        <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          {editingField?.itemId === item.id && editingField?.field === 'product_name' ? (
                            <div className="flex items-center gap-1">
                              <Input
                                className="h-6 text-xs font-medium border-gray-200 focus:border-blue-400"
                                defaultValue={item.product_name}
                                onBlur={(e) => handleFieldEdit(item.id, 'product_name', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleFieldEdit(item.id, 'product_name', e.currentTarget.value);
                                  if (e.key === 'Escape') setEditingField(null);
                                }}
                                autoFocus
                              />
                              <button
                                onClick={() => setEditingField(null)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                              >
                                <X className="h-3 w-3 text-gray-400" />
                              </button>
                            </div>
                          ) : (
                            <h3 
                              className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors truncate leading-tight"
                              onClick={() => setEditingField({itemId: item.id, field: 'product_name'})}
                            >
                              {item.product_name}
                            </h3>
                          )}
                          
                          <div className="flex items-center gap-2 mt-0.5">
                            {editingField?.itemId === item.id && editingField?.field === 'product_url' ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  className="h-5 text-xs border-gray-200 focus:border-blue-400"
                                  defaultValue={item.product_url}
                                  placeholder="Enter product URL"
                                  onBlur={(e) => handleFieldEdit(item.id, 'product_url', e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleFieldEdit(item.id, 'product_url', e.currentTarget.value);
                                    if (e.key === 'Escape') setEditingField(null);
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={() => setEditingField(null)}
                                  className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                                >
                                  <X className="h-3 w-3 text-gray-400" />
                                </button>
                              </div>
                            ) : item.product_url ? (
                              <div className="flex items-center gap-1">
                                <p 
                                  className="text-xs text-gray-500 cursor-pointer hover:text-blue-500 transition-colors truncate"
                                  onClick={() => window.open(item.product_url, '_blank')}
                                  title="Click to open URL"
                                >
                                  {new URL(item.product_url).hostname}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingField({itemId: item.id, field: 'product_url'});
                                  }}
                                  className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                                  title="Edit URL"
                                >
                                  <Edit className="h-3 w-3 text-gray-400 hover:text-blue-500" />
                                </button>
                              </div>
                            ) : (
                              <button 
                                className="text-xs text-gray-400 hover:text-blue-500 transition-colors"
                                onClick={() => setEditingField({itemId: item.id, field: 'product_url'})}
                              >
                                + Add URL
                              </button>
                            )}
                            
                            {item.seller && (
                              <>
                                <span className="text-gray-300 text-xs">•</span>
                                <span className="text-xs text-gray-500">{item.seller}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right side stats */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {/* Quantity */}
                    <div className="text-center min-w-[60px]">
                      {editingField?.itemId === item.id && editingField?.field === 'quantity' ? (
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            className="h-6 w-14 text-xs text-center border-gray-200 focus:border-blue-400"
                            defaultValue={item.quantity}
                            min="1"
                            onBlur={(e) => handleFieldEdit(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleFieldEdit(item.id, 'quantity', parseInt(e.currentTarget.value) || 1);
                              if (e.key === 'Escape') setEditingField(null);
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => setEditingField(null)}
                            className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                          >
                            <X className="h-3 w-3 text-gray-400" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => setEditingField({itemId: item.id, field: 'quantity'})}
                        >
                          <p className="text-xs text-gray-400 uppercase tracking-wider">Qty</p>
                          <p className="text-sm font-semibold">{item.quantity}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Price */}
                    <div className="text-center min-w-[80px]">
                      {editingField?.itemId === item.id && editingField?.field === 'price' ? (
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            className="h-6 w-20 text-xs text-center border-gray-200 focus:border-blue-400"
                            defaultValue={item.price}
                            step="0.01"
                            min="0"
                            onBlur={(e) => handleFieldEdit(item.id, 'price', parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleFieldEdit(item.id, 'price', parseFloat(e.currentTarget.value) || 0);
                              if (e.key === 'Escape') setEditingField(null);
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => setEditingField(null)}
                            className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                          >
                            <X className="h-3 w-3 text-gray-400" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => setEditingField({itemId: item.id, field: 'price'})}
                        >
                          <p className="text-xs text-gray-400 uppercase tracking-wider">Unit Price</p>
                          <p className="text-sm font-semibold">${item.price.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Weight */}
                    <div className="text-center min-w-[85px]">
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Weight</p>
                      <p className="text-sm font-semibold">{item.weight.toFixed(2)} kg</p>
                    </div>
                    
                    {/* HSN */}
                    <div className="text-center min-w-[140px] mr-1">
                      {editingField?.itemId === item.id && editingField?.field === 'hsn_code' ? (
                        <div className="relative">
                          <SleekHSNSearch
                            value={item.hsn_code || ''}
                            onChange={async (hsnCode) => {
                              // Single atomic update to prevent race conditions
                              if (hsnCode) {
                                try {
                                  // Fetch HSN data, weight data, and ML weight in parallel
                                  const [hsnCategoryData, hsnWeightData, mlWeightData] = await Promise.all([
                                    supabase
                                      .from('hsn_master')
                                      .select('category, minimum_valuation_usd, tax_data')
                                      .eq('hsn_code', hsnCode)
                                      .single(),
                                    hsnWeightService.getHSNWeight(hsnCode),
                                    smartWeightEstimator.estimateWeight(item.product_name, item.product_url)
                                  ]);

                                  // Update local HSN categories state
                                  if (hsnCategoryData.data) {
                                    setHsnCategories(prev => ({
                                      ...prev,
                                      [hsnCode]: hsnCategoryData.data.category
                                    }));
                                  }

                                  // Extract tax rate from HSN data (use dynamic rate as fallback)
                                  let hsnTaxRate = dynamicTaxRates.countryVatRate; // Use dynamic country rate as default
                                  if (hsnCategoryData.data?.tax_data?.typical_rates?.customs?.common) {
                                    hsnTaxRate = hsnCategoryData.data.tax_data.typical_rates.customs.common;
                                  }

                                  // Create comprehensive update with all data in single call
                                  const comprehensiveUpdate = {
                                    hsn_code: hsnCode,
                                    category: hsnCategoryData.data?.category || '',
                                    minimum_valuation_usd: hsnCategoryData.data?.minimum_valuation_usd || 0,
                                    weight_options: {
                                      ...item.weight_options,
                                      hsn: hsnWeightData?.average || undefined,
                                      ml: mlWeightData?.estimated_weight || item.weight_options?.ml
                                    },
                                    tax_options: {
                                      ...item.tax_options,
                                      hsn: { rate: hsnTaxRate, amount: 0 }
                                    }
                                  };

                                  // Single atomic update - prevents race conditions
                                  onUpdateItem(item.id, comprehensiveUpdate);

                                  // Trigger recalculation for price/tax changes
                                  onRecalculate();

                                } catch (error) {
                                  console.error('Failed to fetch HSN data:', error);
                                  // Fallback: just update HSN code
                                  onUpdateItem(item.id, { hsn_code: hsnCode });
                                  onRecalculate();
                                }
                              } else {
                                // Clear HSN code
                                onUpdateItem(item.id, { hsn_code: '', category: '' });
                                onRecalculate();
                              }

                              setEditingField(null);
                            }}
                            onCancel={() => setEditingField(null)}
                            placeholder="Type HSN code..."
                            className="h-6 text-xs pr-8"
                            autoFocus
                          />
                          <div className="absolute right-0 top-0 flex items-center h-6">
                            {item.hsn_code && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFieldEdit(item.id, 'hsn_code', '');
                                  setEditingField(null);
                                }}
                                className="p-0.5 hover:bg-gray-100 rounded transition-colors mr-1"
                                title="Clear HSN"
                              >
                                <Trash2 className="h-3 w-3 text-gray-400" />
                              </button>
                            )}
                            <button
                              onClick={() => setEditingField(null)}
                              className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                            >
                              <X className="h-3 w-3 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer hover:text-blue-600 transition-colors text-center"
                          onClick={() => setEditingField({itemId: item.id, field: 'hsn_code'})}
                        >
                          <p className="text-xs text-gray-400 uppercase tracking-wider">HSN</p>
                          {item.hsn_code ? (
                            <div className="text-sm font-semibold">
                              <span className="font-mono">{item.hsn_code}</span>
                              {item.hsn_code && (hsnCategories[item.hsn_code] || item.category) && (
                                <span className="text-[10px] text-gray-500 ml-1">
                                  • {(hsnCategories[item.hsn_code] || item.category).substring(0, 12)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 hover:text-blue-500">+ Add</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100">
                          <MoreVertical className="h-3.5 w-3.5 text-gray-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => item.product_url && window.open(item.product_url, '_blank')}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Product Page
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => item.product_url && navigator.clipboard.writeText(item.product_url)}>
                          <Link className="h-4 w-4 mr-2" />
                          Copy Product URL
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDuplicateItem(item)}>
                          <CopyIcon className="h-4 w-4 mr-2" />
                          Duplicate Product
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Star className="h-4 w-4 mr-2" />
                          Add to Favorites
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Export Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onDeleteItem(item.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Product
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
              
              {/* Expanded Content - Sleek & Minimal */}
              {isExpanded && (
                <div className="border-t bg-white">
                  {/* Smart Weight & Tax Row */}
                  <div className="px-6 py-4 border-b border-gray-50">
                    <div className="grid grid-cols-6 gap-4 items-center">
                      {/* Weight Options */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-500 w-12">Weight</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {['manual', 'hsn', 'ml', 'volumetric'].map((source) => {
                              const isActive = (item.weight_source || 'manual') === source;
                              const icons = { 
                                manual: Settings,
                                hsn: Hash,
                                ml: Brain, 
                                volumetric: Calculator 
                              };
                              const IconComponent = icons[source as keyof typeof icons];
                              
                              // Get weight value for this source
                              let weightValue: number | string = 0;
                              let hasData = false;
                              
                              if (source === 'manual') {
                                weightValue = item.weight;
                                hasData = true;
                              } else if (source === 'volumetric' && volumetricWeight) {
                                weightValue = volumetricWeight;
                                hasData = true;
                              } else if (item.weight_options?.[source as keyof typeof item.weight_options]) {
                                weightValue = item.weight_options[source as keyof typeof item.weight_options] as number;
                                hasData = true;
                              } else {
                                // No data available for this source - skip rendering
                                hasData = false;
                              }
                              
                              // Don't render if no data available (except manual which is always shown)
                              if (!hasData && source !== 'manual') {
                                return null;
                              }
                              
                              // Special handling for manual weight - make it editable
                              if (source === 'manual' && editingManualWeight === item.id) {
                                return (
                                  <div key={source} className="flex items-center gap-1">
                                    <Settings className="h-3 w-3 text-gray-500" />
                                    <span className="capitalize text-[11px]">Manual</span>
                                    <Input
                                      type="number"
                                      step="0.001"
                                      className="h-6 w-20 text-[11px] px-1"
                                      defaultValue={item.weight}
                                      onBlur={(e) => {
                                        const newWeight = parseFloat(e.target.value) || 0;
                                        onUpdateItem(item.id, { 
                                          weight_source: 'manual',
                                          weight: newWeight,
                                          weight_options: {
                                            ...item.weight_options,
                                            manual: newWeight
                                          }
                                        });
                                        onRecalculate();
                                        setEditingManualWeight(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const newWeight = parseFloat(e.currentTarget.value) || 0;
                                          onUpdateItem(item.id, { 
                                            weight_source: 'manual',
                                            weight: newWeight,
                                            weight_options: {
                                              ...item.weight_options,
                                              manual: newWeight
                                            }
                                          });
                                          onRecalculate();
                                          setEditingManualWeight(null);
                                        }
                                        if (e.key === 'Escape') {
                                          setEditingManualWeight(null);
                                        }
                                      }}
                                      autoFocus
                                    />
                                    <span className="text-[11px]">kg</span>
                                  </div>
                                );
                              }
                              
                              return (
                                <button
                                  key={source}
                                  onClick={async () => {
                                    // If manual and not loading, make it editable
                                    if (source === 'manual') {
                                      setEditingManualWeight(item.id);
                                      return;
                                    }
                                    
                                    setLoadingWeight({ itemId: item.id, source });
                                    let newWeight = item.weight;
                                    
                                    try {
                                      // Fetch weight based on source
                                      if (source === 'hsn') {
                                        if (!item.hsn_code) {
                                          alert('Please assign an HSN code first');
                                          return;
                                        }
                                        const hsnData = await hsnWeightService.getHSNWeight(item.hsn_code);
                                        if (hsnData) {
                                          newWeight = hsnData.average;
                                        } else {
                                          // No HSN weight data available
                                          console.warn(`No HSN weight data for code: ${item.hsn_code}`);
                                          alert(`No weight data available for HSN code ${item.hsn_code}`);
                                          return;
                                        }
                                      } else if (source === 'ml') {
                                        const mlWeight = await smartWeightEstimator.estimateWeight(
                                          item.product_name, 
                                          item.product_url
                                        );
                                        if (mlWeight && mlWeight.estimated_weight > 0) {
                                          newWeight = mlWeight.estimated_weight;
                                          // Store confidence for potential display
                                          console.log(`ML weight confidence for ${item.product_name}: ${mlWeight.confidence}`);
                                        } else {
                                          console.warn(`Failed to estimate ML weight for: ${item.product_name}`);
                                          alert(`Could not estimate weight for "${item.product_name}"`);
                                          return;
                                        }
                                      } else if (source === 'volumetric' && volumetricWeight) {
                                        newWeight = volumetricWeight;
                                      } else if (source === 'volumetric' && !volumetricWeight) {
                                        alert('Please enter dimensions to calculate volumetric weight');
                                        return;
                                      }
                                      
                                      onUpdateItem(item.id, { 
                                        weight_source: source,
                                        weight: newWeight,
                                        weight_options: {
                                          ...item.weight_options,
                                          [source]: newWeight
                                        }
                                      });
                                      onRecalculate();
                                    } catch (error) {
                                      console.error(`Error fetching weight for source ${source}:`, error);
                                      alert(`Error fetching ${source} weight. Please try again.`);
                                    } finally {
                                      setLoadingWeight(null);
                                    }
                                  }}
                                  disabled={loadingWeight?.itemId === item.id && loadingWeight?.source === source}
                                  className={cn(
                                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-all",
                                    isActive 
                                      ? "bg-blue-100 text-blue-700 font-medium" 
                                      : "text-gray-500 hover:bg-gray-100",
                                    loadingWeight?.itemId === item.id && loadingWeight?.source === source && "opacity-50"
                                  )}
                                  title={
                                    source === 'hsn' ? 'Weight from HSN master data' :
                                    source === 'ml' ? 'AI-estimated weight based on product name' :
                                    source === 'volumetric' ? 'Calculated from dimensions' :
                                    'Manually entered weight'
                                  }
                                >
                                  {loadingWeight?.itemId === item.id && loadingWeight?.source === source ? (
                                    <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <IconComponent className="h-3 w-3" />
                                  )}
                                  <span className="capitalize">{source}</span>
                                  <span className="font-mono">
                                    {typeof weightValue === 'number' ? `${weightValue.toFixed(3)}kg` : `${weightValue}kg`}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      
                      {/* Tax Options */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-3 justify-end">
                          <span className="text-xs font-medium text-gray-500 w-8">Tax</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {['hsn', 'country', 'customs', 'manual'].map((method) => {
                              const isActive = (item.tax_method || 'hsn') === method;
                              const icons = { 
                                customs: Database, 
                                hsn: Hash, 
                                country: Globe, 
                                manual: Settings 
                              };
                              const labels = {
                                customs: 'Customs',
                                hsn: 'HSN',
                                country: 'Route',
                                manual: 'Manual'
                              };
                              const IconComponent = icons[method as keyof typeof icons];
                              
                              // Get tax rate for display with method-specific logic (using dynamic rates)
                              const getTaxRateForMethod = (method: string, item: any): number => {
                                if (method === 'hsn') {
                                  // For HSN method: check tax_options first, then fall back to dynamic country rate
                                  return item.tax_options?.hsn?.rate || 
                                         (item.hsn_code ? dynamicTaxRates.countryVatRate : dynamicTaxRates.countryVatRate);
                                } else if (method === 'customs') {
                                  // For customs method: use operational_data customs percentage or dynamic default
                                  return quote?.operational_data?.customs?.percentage || dynamicTaxRates.customsDefault;
                                } else if (method === 'manual') {
                                  // For manual method: use manual rate or dynamic default
                                  return item.tax_options?.manual?.rate || dynamicTaxRates.manualDefault;
                                } else if (method === 'country') {
                                  // For route/country method: use route rate or dynamic customs default
                                  return item.tax_options?.country?.rate || dynamicTaxRates.customsDefault;
                                }
                                return dynamicTaxRates.manualDefault; // Final fallback to dynamic rate
                              };
                              
                              const taxRate = getTaxRateForMethod(method, item);
                              
                              // Debug logging for tax rate display
                              if (method === 'hsn' && item.hsn_code) {
                                console.log(`[HSN Tax Rate Debug] Item ${item.id}:`, {
                                  hsn_code: item.hsn_code,
                                  method: method,
                                  tax_options: item.tax_options,
                                  hsn_tax_options: item.tax_options?.hsn,
                                  displayed_rate: taxRate,
                                  fallback_used: !item.tax_options?.[method as keyof typeof item.tax_options]?.rate
                                });
                              }
                              
                              // Special handling for manual tax rate - make it editable
                              if (method === 'manual' && editingManualTaxRate === item.id) {
                                return (
                                  <div key={method} className="flex items-center gap-1">
                                    <Settings className="h-3 w-3 text-gray-500" />
                                    <span className="text-[11px]">Manual</span>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      className="h-6 w-16 text-[11px] px-1"
                                      defaultValue={taxRate}
                                      onBlur={(e) => {
                                        const newTaxRate = parseFloat(e.target.value) || dynamicTaxRates.manualDefault;
                                        onUpdateItem(item.id, { 
                                          tax_method: 'manual',
                                          tax_options: {
                                            ...item.tax_options,
                                            manual: { rate: newTaxRate, amount: 0 }
                                          }
                                        });
                                        onRecalculate();
                                        setEditingManualTaxRate(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const newTaxRate = parseFloat(e.currentTarget.value) || dynamicTaxRates.manualDefault;
                                          onUpdateItem(item.id, { 
                                            tax_method: 'manual',
                                            tax_options: {
                                              ...item.tax_options,
                                              manual: { rate: newTaxRate, amount: 0 }
                                            }
                                          });
                                          onRecalculate();
                                          setEditingManualTaxRate(null);
                                        }
                                        if (e.key === 'Escape') {
                                          setEditingManualTaxRate(null);
                                        }
                                      }}
                                      autoFocus
                                    />
                                    <span className="text-[11px]">%</span>
                                  </div>
                                );
                              }
                              
                              return (
                                <button
                                  key={method}
                                  onClick={() => {
                                    // If manual and not editing, make it editable
                                    if (method === 'manual') {
                                      setEditingManualTaxRate(item.id);
                                      return;
                                    }
                                    
                                    onUpdateItem(item.id, { tax_method: method });
                                    onRecalculate();
                                  }}
                                  className={cn(
                                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-all",
                                    isActive 
                                      ? "bg-emerald-100 text-emerald-700 font-medium" 
                                      : "text-gray-500 hover:bg-gray-100"
                                  )}
                                >
                                  <IconComponent className="h-3 w-3" />
                                  <span className="capitalize">{labels[method as keyof typeof labels]}</span>
                                  <span className="font-mono">{taxRate}%</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* DEBUG: Tax Values Preview */}
                  <div className="px-6 py-2 bg-gray-50 border-b border-gray-100">
                    <div className="text-xs space-y-2">
                      <div className="font-medium text-gray-600 mb-1">🔍 Tax Debug Values - Live Data:</div>
                      <div className="grid grid-cols-4 gap-3 text-[10px]">
                        {/* HSN Method Debug */}
                        <div className="bg-white p-2 rounded border">
                          <div className="font-medium text-blue-600 mb-1">HSN Method</div>
                          <div className="text-gray-600">
                            {debugTaxData[item.id]?.hsnRates ? (
                              <>
                                <div>Customs: <span className="font-mono">{debugTaxData[item.id].hsnRates.customs}%</span></div>
                                <div>VAT: <span className="font-mono">{debugTaxData[item.id].hsnRates.vat}%</span></div>
                                <div>Sales Tax: <span className="font-mono">{debugTaxData[item.id].hsnRates.sales_tax}%</span></div>
                                <div className="text-green-600 mt-1 font-medium">✅ HSN: {item.hsn_code}</div>
                              </>
                            ) : item.hsn_code ? (
                              <div className="text-yellow-600">Loading HSN {item.hsn_code}...</div>
                            ) : (
                              <div className="text-red-500">No HSN Code</div>
                            )}
                          </div>
                        </div>
                        
                        {/* Route Method Debug */}
                        <div className="bg-white p-2 rounded border">
                          <div className="font-medium text-green-600 mb-1">Route Method</div>
                          <div className="text-gray-600">
                            {debugTaxData[item.id]?.routeRates ? (
                              <>
                                <div>Customs: <span className="font-mono">{debugTaxData[item.id].routeRates.customs}%</span></div>
                                <div>VAT: <span className="font-mono">{debugTaxData[item.id].routeRates.vat}%</span></div>
                                <div>Sales Tax: <span className="font-mono">{debugTaxData[item.id].routeRates.sales_tax}%</span></div>
                                <div className="text-green-600 mt-1 font-medium">✅ Route: {quote?.origin_country}→{quote?.destination_country}</div>
                              </>
                            ) : (
                              <div className="text-yellow-600">Loading route rates...</div>
                            )}
                          </div>
                        </div>
                        
                        {/* Manual Method Debug */}
                        <div className="bg-white p-2 rounded border">
                          <div className="font-medium text-orange-600 mb-1">Manual Method</div>
                          <div className="text-gray-600">
                            <div>Customs: <span className="font-mono">{item.tax_options?.manual?.rate || dynamicTaxRates.manualDefault}%</span> <span className="text-gray-400">(user)</span></div>
                            {debugTaxData[item.id]?.routeRates ? (
                              <>
                                <div>VAT: <span className="font-mono">{debugTaxData[item.id].routeRates.vat}%</span> <span className="text-gray-400">(route)</span></div>
                                <div>Sales Tax: <span className="font-mono">{debugTaxData[item.id].routeRates.sales_tax}%</span> <span className="text-gray-400">(route)</span></div>
                                <div className="text-green-600 mt-1 font-medium">✅ Mixed Sources</div>
                              </>
                            ) : (
                              <div className="text-yellow-600">Loading route for dest tax...</div>
                            )}
                          </div>
                        </div>
                        
                        {/* Current Active Method */}
                        <div className="bg-blue-50 p-2 rounded border border-blue-200">
                          <div className="font-medium text-blue-700 mb-1">🎯 Active: {(item.tax_method || 'hsn').toUpperCase()}</div>
                          <div className="text-gray-700">
                            {(() => {
                              const method = item.tax_method || 'hsn';
                              const itemDebug = debugTaxData[item.id];
                              
                              if (method === 'hsn' && itemDebug?.hsnRates) {
                                return (
                                  <>
                                    <div>Customs: <span className="font-mono font-bold">{itemDebug.hsnRates.customs}%</span></div>
                                    <div>Dest Tax: <span className="font-mono font-bold">{itemDebug.hsnRates.vat}%</span></div>
                                    <div className="text-blue-600 mt-1 font-medium">← HSN Table</div>
                                  </>
                                );
                              } else if (method === 'country' && itemDebug?.routeRates) {
                                return (
                                  <>
                                    <div>Customs: <span className="font-mono font-bold">{itemDebug.routeRates.customs}%</span></div>
                                    <div>Dest Tax: <span className="font-mono font-bold">{itemDebug.routeRates.vat}%</span></div>
                                    <div className="text-blue-600 mt-1 font-medium">← Route</div>
                                  </>
                                );
                              } else if (method === 'manual' && itemDebug?.routeRates) {
                                return (
                                  <>
                                    <div>Customs: <span className="font-mono font-bold">{item.tax_options?.manual?.rate || dynamicTaxRates.manualDefault}%</span></div>
                                    <div>Dest Tax: <span className="font-mono font-bold">{itemDebug.routeRates.vat}%</span></div>
                                    <div className="text-blue-600 mt-1 font-medium">← Manual+Route</div>
                                  </>
                                );
                              } else {
                                return <div className="text-yellow-600">Loading {method} data...</div>;
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Dimensions & Valuation Row */}
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-6 gap-4 items-center">
                      {/* Dimensions */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-500 w-12">Size</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Length */}
                            {editingDimension?.itemId === item.id && editingDimension?.field === 'length' ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-gray-500">L</span>
                                <Input
                                  type="number"
                                  step="0.1"
                                  className="h-6 w-16 text-[11px] px-1"
                                  defaultValue={item.dimensions?.length || ''}
                                  placeholder="0"
                                  onBlur={(e) => {
                                    const newLength = parseFloat(e.target.value) || 0;
                                    const dimensions = { ...item.dimensions, length: newLength };
                                    onUpdateItem(item.id, { dimensions });
                                    setEditingDimension(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const newLength = parseFloat(e.currentTarget.value) || 0;
                                      const dimensions = { ...item.dimensions, length: newLength };
                                      onUpdateItem(item.id, { dimensions });
                                      setEditingDimension(null);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingDimension(null);
                                    }
                                  }}
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingDimension({ itemId: item.id, field: 'length' })}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all text-gray-600 hover:bg-gray-100 border border-gray-200"
                              >
                                <span>L</span>
                                <span className="font-mono">{item.dimensions?.length ? `${item.dimensions.length}` : '0'}</span>
                              </button>
                            )}
                            
                            <X className="h-3 w-3 text-gray-400" />
                            
                            {/* Width */}
                            {editingDimension?.itemId === item.id && editingDimension?.field === 'width' ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-gray-500">W</span>
                                <Input
                                  type="number"
                                  step="0.1"
                                  className="h-6 w-16 text-[11px] px-1"
                                  defaultValue={item.dimensions?.width || ''}
                                  placeholder="0"
                                  onBlur={(e) => {
                                    const newWidth = parseFloat(e.target.value) || 0;
                                    const dimensions = { ...item.dimensions, width: newWidth };
                                    onUpdateItem(item.id, { dimensions });
                                    setEditingDimension(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const newWidth = parseFloat(e.currentTarget.value) || 0;
                                      const dimensions = { ...item.dimensions, width: newWidth };
                                      onUpdateItem(item.id, { dimensions });
                                      setEditingDimension(null);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingDimension(null);
                                    }
                                  }}
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingDimension({ itemId: item.id, field: 'width' })}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all text-gray-600 hover:bg-gray-100 border border-gray-200"
                              >
                                <span>W</span>
                                <span className="font-mono">{item.dimensions?.width ? `${item.dimensions.width}` : '0'}</span>
                              </button>
                            )}
                            
                            <X className="h-3 w-3 text-gray-400" />
                            
                            {/* Height */}
                            {editingDimension?.itemId === item.id && editingDimension?.field === 'height' ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-gray-500">H</span>
                                <Input
                                  type="number"
                                  step="0.1"
                                  className="h-6 w-16 text-[11px] px-1"
                                  defaultValue={item.dimensions?.height || ''}
                                  placeholder="0"
                                  onBlur={(e) => {
                                    const newHeight = parseFloat(e.target.value) || 0;
                                    const dimensions = { ...item.dimensions, height: newHeight };
                                    onUpdateItem(item.id, { dimensions });
                                    setEditingDimension(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const newHeight = parseFloat(e.currentTarget.value) || 0;
                                      const dimensions = { ...item.dimensions, height: newHeight };
                                      onUpdateItem(item.id, { dimensions });
                                      setEditingDimension(null);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingDimension(null);
                                    }
                                  }}
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingDimension({ itemId: item.id, field: 'height' })}
                                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all text-gray-600 hover:bg-gray-100 border border-gray-200"
                              >
                                <span>H</span>
                                <span className="font-mono">{item.dimensions?.height ? `${item.dimensions.height}` : '0'}</span>
                              </button>
                            )}
                            
                            {/* Unit Selector */}
                            <Select 
                              value={item.dimensions?.unit || 'cm'}
                              onValueChange={(value) => {
                                const dimensions = { ...item.dimensions, unit: value as 'cm' | 'in' };
                                onUpdateItem(item.id, { dimensions });
                              }}
                            >
                              <SelectTrigger className="h-6 w-auto min-w-[32px] text-[11px] border-gray-200 px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cm">cm</SelectItem>
                                <SelectItem value="in">in</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Volumetric Divisor Indicator */}
                          {item.dimensions?.length > 0 && item.dimensions?.width > 0 && item.dimensions?.height > 0 && (
                            <div className="ml-3 text-xs bg-blue-50 px-2 py-1 rounded">
                              <span className="text-gray-500">Divisor: </span>
                              <span className="font-medium text-blue-600">
                                {selectedShippingOption?.volumetric_divisor || 5000} ({selectedShippingOption?.carrier || 'Default'})
                              </span>
                              <span className="text-gray-400 ml-1 text-[10px]">
                                • {selectedShippingOption ? selectedShippingOption.name : 'Select shipping option to see specific divisor'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Enhanced Valuation with Debug Logging */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-3 justify-end">
                          <span className="text-xs font-medium text-gray-500">Valuation</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                // 🧮 DEBUG LOG: Valuation Method Selection
                                console.log(`\n🎯 [UI VALUATION] User selected: Actual Price Method`);
                                console.log(`├── Item: ${item.product_name}`);
                                console.log(`├── Product Price: $${item.price}`);
                                console.log(`├── HSN Code: ${item.hsn_code || 'Not set'}`);
                                console.log(`├── Previous Method: ${item.valuation_method || 'actual_price'}`);
                                console.log(`└── New Method: actual_price`);
                                
                                onUpdateItem(item.id, { valuation_method: 'actual_price' });
                                
                                // 🧮 Trigger enhanced calculation with logging
                                setTimeout(() => {
                                  console.log(`🔄 [RECALCULATION] Starting quote recalculation for valuation method change...`);
                                  onRecalculate();
                                }, 100);
                              }}
                              className={cn(
                                "px-2 py-1 rounded-md text-xs transition-all",
                                (item.valuation_method || 'actual_price') === 'actual_price'
                                  ? "bg-purple-100 text-purple-700 font-medium" 
                                  : "text-gray-500 hover:bg-gray-100"
                              )}
                              title={`Actual Price Method: Uses product price ($${item.price}) for tax calculation`}
                            >
                              <span>Actual</span>
                              <span className="font-mono ml-1">${item.price}</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                // 🧮 DEBUG LOG: Valuation Method Selection
                                const minValData = getMinimumValuationWithFallback(item.id);
                                console.log(`\n🎯 [UI VALUATION] User selected: Minimum Valuation Method`);
                                console.log(`├── Item: ${item.product_name}`);
                                console.log(`├── Product Price: $${item.price}`);
                                console.log(`├── HSN Minimum: $${minValData.amount} (enhanced with fallback)`);
                                console.log(`├── HSN Code: ${item.hsn_code || 'Not set'}`);
                                console.log(`├── Previous Method: ${item.valuation_method || 'actual_price'}`);
                                console.log(`├── New Method: minimum_valuation`);
                                console.log(`├── Data Source: ${minValData.amount > 0 ? 'Available' : 'Missing'}`);
                                if (minValData.amount === 0) {
                                  console.log(`└── ⚠️ Warning: No minimum valuation available for HSN ${item.hsn_code}`);
                                }
                                
                                onUpdateItem(item.id, { valuation_method: 'minimum_valuation' });
                                
                                // 🧮 Trigger enhanced calculation with logging
                                setTimeout(() => {
                                  console.log(`🔄 [RECALCULATION] Starting quote recalculation for valuation method change...`);
                                  onRecalculate();
                                }, 100);
                              }}
                              disabled={getMinimumValuationWithFallback(item.id).loading}
                              className={cn(
                                "px-2 py-1 rounded-md text-xs transition-all flex items-center gap-1",
                                item.valuation_method === 'minimum_valuation'
                                  ? "bg-purple-100 text-purple-700 font-medium" 
                                  : "text-gray-500 hover:bg-gray-100",
                                getMinimumValuationWithFallback(item.id).loading && "opacity-50 cursor-wait"
                              )}
                              title={`Minimum Valuation Method: Uses HSN minimum valuation ($${getMinimumValuationWithFallback(item.id).amount}) for tax calculation`}
                            >
                              <span>Minimum</span>
                              {getMinimumValuationWithFallback(item.id).loading ? (
                                <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin ml-1" />
                              ) : (
                                <span className="font-mono ml-1">
                                  ${getMinimumValuationWithFallback(item.id).amount.toFixed(0)}
                                </span>
                              )}
                            </button>
                            
                            <button
                              onClick={() => {
                                // 🧮 DEBUG LOG: Valuation Method Selection
                                const minValData = getMinimumValuationWithFallback(item.id);
                                const higherAmount = Math.max(item.price, minValData.amount);
                                const isActualHigher = item.price >= minValData.amount;
                                console.log(`\n🎯 [UI VALUATION] User selected: Higher of Both Method`);
                                console.log(`├── Item: ${item.product_name}`);
                                console.log(`├── Product Price: $${item.price}`);
                                console.log(`├── HSN Minimum: $${minValData.amount} (enhanced with fallback)`);
                                console.log(`├── Higher Amount: $${higherAmount} (${isActualHigher ? 'actual price' : 'minimum valuation'})`);
                                console.log(`├── HSN Code: ${item.hsn_code || 'Not set'}`);
                                console.log(`├── Previous Method: ${item.valuation_method || 'actual_price'}`);
                                console.log(`├── Data Loading: ${minValData.loading}`);
                                console.log(`└── New Method: higher_of_both`);
                                
                                onUpdateItem(item.id, { valuation_method: 'higher_of_both' });
                                
                                // 🧮 Trigger enhanced calculation with logging
                                setTimeout(() => {
                                  console.log(`🔄 [RECALCULATION] Starting quote recalculation for valuation method change...`);
                                  onRecalculate();
                                }, 100);
                              }}
                              disabled={getMinimumValuationWithFallback(item.id).loading}
                              className={cn(
                                "px-2 py-1 rounded-md text-xs transition-all flex items-center gap-1",
                                item.valuation_method === 'higher_of_both'
                                  ? "bg-purple-100 text-purple-700 font-medium" 
                                  : "text-gray-500 hover:bg-gray-100",
                                getMinimumValuationWithFallback(item.id).loading && "opacity-50 cursor-wait"
                              )}
                              title={`Higher of Both Method: Uses the higher amount between actual price and minimum valuation ($${Math.max(item.price, getMinimumValuationWithFallback(item.id).amount)})`}
                            >
                              <span>Higher</span>
                              {getMinimumValuationWithFallback(item.id).loading ? (
                                <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin ml-1" />
                              ) : (
                                <span className="font-mono ml-1">
                                  ${Math.max(item.price, getMinimumValuationWithFallback(item.id).amount).toFixed(0)}
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};