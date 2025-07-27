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
import { supabase } from '@/integrations/supabase/client';

interface QuoteItem {
  id: string;
  product_name: string;
  product_url?: string;
  price: number;
  quantity: number;
  weight: number;
  weight_source?: string;
  dimensions?: { length: number; width: number; height: number };
  hsn_code?: string;
  tax_method?: string;
  valuation_method?: string;
  image_url?: string;
  seller?: string;
  // New fields for comprehensive options
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
  minimum_valuation_usd?: number;
}

interface SleekProductTableProps {
  items: QuoteItem[];
  onUpdateItem: (itemId: string, updates: Partial<QuoteItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onDuplicateItem: (item: QuoteItem) => void;
  onRecalculate: () => void;
}

export const SleekProductTable: React.FC<SleekProductTableProps> = ({
  items,
  onUpdateItem,
  onDeleteItem,
  onDuplicateItem,
  onRecalculate,
}) => {
  // State for expanded rows - default to all expanded
  const [expandedRows, setExpandedRows] = useState<string[]>(items.map(item => item.id));
  const [editingField, setEditingField] = useState<{itemId: string, field: string} | null>(null);
  const [dimensionUnit, setDimensionUnit] = useState<'cm' | 'in'>('cm');
  const [loadingWeight, setLoadingWeight] = useState<{itemId: string, source: string} | null>(null);
  const [editingManualWeight, setEditingManualWeight] = useState<string | null>(null);
  const [hsnCategories, setHsnCategories] = useState<Record<string, string>>({});

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
      onRecalculate();
    }
  };

  const calculateVolumetricWeight = (dimensions: any) => {
    if (!dimensions) return null;
    const { length, width, height } = dimensions;
    
    // Use the service to calculate volumetric weight
    // Default to air divisor (5000) for the product table
    return volumetricWeightService.calculateVolumetricWeight(
      { ...dimensions, unit: dimensionUnit },
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
                  <div className="flex items-center gap-6 flex-shrink-0">
                    {/* Quantity */}
                    <div className="text-center min-w-[50px]">
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
                    <div className="text-center min-w-[90px]">
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Weight</p>
                      <p className="text-sm font-semibold">{item.weight.toFixed(3)} kg</p>
                    </div>
                    
                    {/* HSN */}
                    <div className="text-center min-w-[100px]">
                      {editingField?.itemId === item.id && editingField?.field === 'hsn_code' ? (
                        <div className="relative">
                          <SleekHSNSearch
                            value={item.hsn_code || ''}
                            onChange={async (hsnCode) => {
                              console.log('🔍 [PRODUCT-TABLE] HSN onChange received:', { hsnCode, itemId: item.id });
                              
                              // Update HSN code and category
                              if (hsnCode) {
                                try {
                                  console.log('🔍 [PRODUCT-TABLE] Fetching HSN data for:', hsnCode);
                                  // Fetch HSN data including category
                                  const { data } = await supabase
                                    .from('hsn_master')
                                    .select('category')
                                    .eq('hsn_code', hsnCode)
                                    .single();
                                  
                                  console.log('🔍 [PRODUCT-TABLE] HSN fetch result:', data);
                                  
                                  if (data) {
                                    // Update local state for category display
                                    setHsnCategories(prev => ({
                                      ...prev,
                                      [hsnCode]: data.category
                                    }));
                                    
                                    const updateData = { 
                                      hsn_code: hsnCode,
                                      category: data.category
                                    };
                                    console.log('🔍 [PRODUCT-TABLE] Calling onUpdateItem with:', updateData);
                                    // Update item with both HSN code and category
                                    onUpdateItem(item.id, updateData);
                                  } else {
                                    const updateData = { hsn_code: hsnCode };
                                    console.log('🔍 [PRODUCT-TABLE] No category found, calling onUpdateItem with:', updateData);
                                    // Just update HSN code if no category found
                                    onUpdateItem(item.id, updateData);
                                  }
                                  
                                  // Also fetch HSN weight
                                  const hsnData = await hsnWeightService.getHSNWeight(hsnCode);
                                  if (hsnData) {
                                    const weightUpdateData = { 
                                      weight_options: {
                                        ...item.weight_options,
                                        hsn: hsnData.average
                                      }
                                    };
                                    console.log('🔍 [PRODUCT-TABLE] Calling onUpdateItem with weight data:', weightUpdateData);
                                    onUpdateItem(item.id, weightUpdateData);
                                  }
                                } catch (error) {
                                  console.error('Failed to fetch HSN data:', error);
                                  // Still update the HSN code even if fetch fails
                                  const fallbackData = { hsn_code: hsnCode };
                                  console.log('🔍 [PRODUCT-TABLE] Error occurred, calling onUpdateItem with fallback:', fallbackData);
                                  onUpdateItem(item.id, fallbackData);
                                }
                              } else {
                                // Clear HSN code
                                console.log('🔍 [PRODUCT-TABLE] Clearing HSN code');
                                onUpdateItem(item.id, { hsn_code: '' });
                              }
                              
                              // Close the field and trigger recalculation
                              console.log('🔍 [PRODUCT-TABLE] Closing field and triggering recalculation...');
                              setEditingField(null);
                              onRecalculate();
                              console.log('🔍 [PRODUCT-TABLE] HSN onChange completed');
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
                          className="cursor-pointer hover:text-blue-600 transition-colors group"
                          onClick={() => setEditingField({itemId: item.id, field: 'hsn_code'})}
                        >
                          <p className="text-xs text-gray-400 uppercase tracking-wider">HSN</p>
                          {item.hsn_code ? (
                            <div>
                              <p className="text-sm font-mono font-semibold">{item.hsn_code}</p>
                              {hsnCategories[item.hsn_code] && (
                                <p className="text-[10px] text-gray-500 truncate">{hsnCategories[item.hsn_code]}</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 group-hover:text-blue-500">+ Add</p>
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
                              const IconComponent = icons[method as keyof typeof icons];
                              
                              // Get tax rate for display
                              const taxRate = item.tax_options?.[method as keyof typeof item.tax_options]?.rate || 18;
                              
                              return (
                                <button
                                  key={method}
                                  onClick={() => {
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
                                  <span className="capitalize">{method}</span>
                                  <span className="font-mono">{taxRate}%</span>
                                </button>
                              );
                            })}
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
                          <div className="flex items-center gap-1">
                            <Input 
                              placeholder="L" 
                              className="h-8 w-16 text-xs" 
                              defaultValue={item.dimensions?.length} 
                              onChange={(e) => {
                                const dimensions = { ...item.dimensions, length: parseFloat(e.target.value) || 0 };
                                onUpdateItem(item.id, { dimensions });
                              }}
                            />
                            <X className="h-3 w-3 text-gray-400" />
                            <Input 
                              placeholder="W" 
                              className="h-8 w-16 text-xs" 
                              defaultValue={item.dimensions?.width} 
                              onChange={(e) => {
                                const dimensions = { ...item.dimensions, width: parseFloat(e.target.value) || 0 };
                                onUpdateItem(item.id, { dimensions });
                              }}
                            />
                            <X className="h-3 w-3 text-gray-400" />
                            <Input 
                              placeholder="H" 
                              className="h-8 w-16 text-xs" 
                              defaultValue={item.dimensions?.height} 
                              onChange={(e) => {
                                const dimensions = { ...item.dimensions, height: parseFloat(e.target.value) || 0 };
                                onUpdateItem(item.id, { dimensions });
                              }}
                            />
                            <Select 
                              defaultValue={dimensionUnit}
                              onValueChange={(value) => setDimensionUnit(value as 'cm' | 'in')}
                            >
                              <SelectTrigger className="h-8 w-16 text-xs">
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
                                5000 (Air)
                              </span>
                              <span className="text-gray-400 ml-1 text-[10px]">
                                • Changes per shipping option
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Valuation */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-3 justify-end">
                          <span className="text-xs font-medium text-gray-500">Valuation</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                onUpdateItem(item.id, { valuation_method: 'actual_price' });
                                onRecalculate();
                              }}
                              className={cn(
                                "px-2 py-1 rounded-md text-xs transition-all",
                                (item.valuation_method || 'actual_price') === 'actual_price'
                                  ? "bg-purple-100 text-purple-700 font-medium" 
                                  : "text-gray-500 hover:bg-gray-100"
                              )}
                            >
                              <span>Actual</span>
                              <span className="font-mono ml-1">${item.price}</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                onUpdateItem(item.id, { valuation_method: 'minimum_valuation' });
                                onRecalculate();
                              }}
                              className={cn(
                                "px-2 py-1 rounded-md text-xs transition-all",
                                item.valuation_method === 'minimum_valuation'
                                  ? "bg-purple-100 text-purple-700 font-medium" 
                                  : "text-gray-500 hover:bg-gray-100"
                              )}
                            >
                              <span>Minimum</span>
                              <span className="font-mono ml-1">${item.minimum_valuation_usd || 0}</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                onUpdateItem(item.id, { valuation_method: 'higher_of_both' });
                                onRecalculate();
                              }}
                              className={cn(
                                "px-2 py-1 rounded-md text-xs transition-all",
                                item.valuation_method === 'higher_of_both'
                                  ? "bg-purple-100 text-purple-700 font-medium" 
                                  : "text-gray-500 hover:bg-gray-100"
                              )}
                            >
                              <span>Higher</span>
                              <span className="font-mono ml-1">
                                ${Math.max(item.price, item.minimum_valuation_usd || 0)}
                              </span>
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