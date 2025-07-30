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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { volumetricWeightService } from '@/services/VolumetricWeightService';
import { smartWeightEstimator } from '@/services/SmartWeightEstimator';
import { taxRateService } from '@/services/TaxRateService';
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
  const [tempManualRates, setTempManualRates] = useState<Record<string, number>>({});
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

  // Pre-fetch tax debug data for all items (for display only, not calculation)
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
          
          // Fetch quote.destination_country
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
        console.error('Failed to fetch error);
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

  // DISABLED: Automatic minimum valuation fetching - calculations should only trigger manually
  // Fetch real-time minimum valuations for items missing calculation data
  

  // Helper function to get minimum valuation with real-time fallback
  const getMinimumValuationWithFallback = (itemId: string): { amount: number; loading: boolean; currency: string } => {
    // First try the enhanced utility function (includes fallbacks)
    const calculationAmount = getItemMinimumValuation(quote, itemId);
    console.log(`[FALLBACK HELPER] Item ${itemId}: calculationAmount = ${calculationAmount}`);
    
    if (calculationAmount > 0) {
      console.log(`[FALLBACK HELPER] Using calculation amount: ${calculationAmount}`);
      // For calculation data, we assume it's already in origin currency
      const originCurrency = quote?.calculation_data?.currency || 'USD';
      return { amount: calculationAmount, loading: false, currency: originCurrency };
    }

    // Fall back to real-time data
    const realtimeData = realtimeMinimumValuations[itemId];
    console.log(`[FALLBACK HELPER] Real-time data for ${itemId}:`, realtimeData);
    
    if (realtimeData) {
      console.log(`[FALLBACK HELPER] Using real-time amount: ${realtimeData.amount}, currency: ${realtimeData.currency}, loading: ${realtimeData.loading}`);
      return { 
        amount: realtimeData.amount, 
        loading: realtimeData.loading || false,
        currency: realtimeData.currency || 'USD'
      };
    }

    console.log(`[FALLBACK HELPER] No data found for ${itemId}, returning 0`);
    return { amount: 0, loading: false, currency: 'USD' };
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
            {}
                    <div className="text-center min-w-[140px] mr-1">
                      {editingField?.itemId === item.id && editingField?.field === 'hsn_code' ? (
                        <div className="relative">
                          <SleekHSNSearch
                            value={item.hsn_code || ''}
                            onChange={async (hsnCode) => {
                              // Single atomic update to prevent race conditions
                              if (hsnCode) {
                                try {
                                  // Fetch weight data, and ML weight in parallel
                                  const [hsnCategoryData, hsnWeightData, mlWeightData] = await Promise.all([
                                    supabase
                                      .from('hsn_master')
                                      .select('category, minimum_valuation_usd, tax_data')
                                      .eq('hsn_code', hsnCode)
                                      .single(),
                                    hsnWeightService.getsmartWeightEstimator.estimateWeight(item.product_name, item.product_url)
                                  ]);

                                  // Update local [hsnCode]: hsnCategoryData.data.category
                                    }));
                                  }

                                  
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
                                  console.error('Failed to fetch error);
                                  // Fallback: just update { hsn_code: hsnCode });
                                  onRecalculate();
                                }
                              } else {
                                // Clear { hsn_code: '', category: '' });
                                onRecalculate();
                              }

                              setEditingField(null);
                            }}
                            onCancel={() => setEditingField(null)}
                            placeholder="Type 'hsn_code', '');
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
                  
                  {}
                      <div className="col-span-3">
                        <div className="flex items-center gap-3 justify-end">
                          <span className="text-xs font-medium text-gray-500 w-8">Tax</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {['hsn', 'route', 'manual'].map((method) => {
                              const isActive = (item.tax_method || 'hsn') === method;
                              const icons = { 
                                hsn: Hash, 
                                route: Globe, 
                                manual: Settings 
                              };
                              const labels = {
                                hsn: 'route: 'Route',
                                manual: 'Manual'
                              };
                              const IconComponent = icons[method as keyof typeof icons];
                              
                              // Get tax rate for display with method-specific logic (using dynamic rates)
                              const getTaxRateForMethod = (method: string, item: any): number => {
                                if (method === 'hsn') {
                                  // For then fall back to dynamic country rate
                                  return item.tax_options?.hsn?.rate || 
                                         (item.hsn_code ? dynamicTaxRates.countryVatRate : dynamicTaxRates.countryVatRate);
                                } else if (method === 'manual') {
                                  // For manual method: use only the saved manual rate, no fallback
                                  return item.tax_options?.manual?.rate || 0;
                                } else if (method === 'route') {
                                  // For route method: use route rate or dynamic customs default
                                  return item.tax_options?.route?.rate || dynamicTaxRates.customsDefault;
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
                                  <div key={method} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200">
                                    <Hash className="h-3 w-3 text-amber-600" />
                                    <span className="text-[11px] text-amber-700 font-medium">Manual:</span>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      className="h-5 w-14 text-[11px] px-1 border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                      value={tempManualRates[item.id] ?? taxRate}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        setTempManualRates(prev => ({ ...prev, [item.id]: value }));
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          // Trigger save on Enter
                                          const newTaxRate = tempManualRates[item.id] ?? taxRate;
                                          const itemValue = (item.costprice_origin || item.price) * (item.quantity || 1);
                                          const newCustomsAmount = itemValue * (newTaxRate / 100);
                                          
                                          console.log('💡 [MANUAL TAX] Saving manual rate (Enter key):', {
                                            item_id: item.id,
                                            old_rate: item.tax_options?.manual?.rate || 'none',
                                            new_rate: newTaxRate,
                                            item_value: itemValue,
                                            new_customs_amount: newCustomsAmount,
                                            updates_being_sent: {
                                              tax_method: 'manual',
                                              tax_options: {
                                                ...item.tax_options,
                                                manual: { rate: newTaxRate, amount: 0 }
                                              }
                                            }
                                          });
                                          
                                          onUpdateItem(item.id, { 
                                            tax_method: 'manual',
                                            tax_options: {
                                              ...item.tax_options,
                                              manual: { rate: newTaxRate, amount: 0 }
                                            },
                                            customs_amount: newCustomsAmount,
                                            customs_value: itemValue
                                          });
                                          
                                          setEditingManualTaxRate(null);
                                          setTempManualRates(prev => {
                                            const { [item.id]: _, ...rest } = prev;
                                            return rest;
                                          });
                                          
                                          // Trigger recalculation after state update
                                          setTimeout(() => {
                                            console.log('[MANUAL TAX] Triggering recalculation after save (Enter key)');
                                            onRecalculate();
                                          }, 150);
                                        }
                                        if (e.key === 'Escape') {
                                          setEditingManualTaxRate(null);
                                          setTempManualRates(prev => {
                                            const { [item.id]: _, ...rest } = prev;
                                            return rest;
                                          });
                                        }
                                      }}
                                      autoFocus
                                    />
                                    <span className="text-[11px] mr-1">%</span>
                                    {}
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
                        
                        {}
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
                                console.log(`├── minValData.currency)} (enhanced with fallback)`);
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
                              title={`Minimum Valuation Method: Uses getMinimumValuationWithFallback(item.id).currency)}) for tax calculation`}
                            >
                              <span>Minimum</span>
                              {getMinimumValuationWithFallback(item.id).loading ? (
                                <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin ml-1" />
                              ) : (
                                <span className="font-mono ml-1">
                                  {formatValuationAmount(getMinimumValuationWithFallback(item.id).amount, getMinimumValuationWithFallback(item.id).currency)}
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
                                console.log(`├── minValData.currency)} (enhanced with fallback)`);
                                console.log(`├── Higher Amount: ${higherAmount} ${isActualHigher ? 'USD' : minValData.currency} (${isActualHigher ? 'actual price' : 'minimum valuation'})`);
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
                              title={`Higher of Both Method: Uses the higher amount between actual price ($${item.price}) and minimum valuation (${formatValuationAmount(getMinimumValuationWithFallback(item.id).amount, getMinimumValuationWithFallback(item.id).currency)})`}
                            >
                              <span>Higher</span>
                              {getMinimumValuationWithFallback(item.id).loading ? (
                                <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin ml-1" />
                              ) : (
                                <span className="font-mono ml-1">
                                  Higher
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