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
  Link
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SmartHSNSearch } from '@/components/admin/hsn-components/SmartHSNSearch';
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
              <div className="p-4">
                <div className="grid grid-cols-[40px_1fr_140px_120px_100px_60px] gap-4 items-center">
                  {/* Expand Button */}
                  <button
                    onClick={() => toggleRowExpansion(item.id)}
                    className={cn(
                      "p-2 rounded-lg transition-all justify-self-start",
                      isExpanded ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100"
                    )}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  
                  {/* Product Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    {item.image_url && (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {editingField?.itemId === item.id && editingField?.field === 'product_name' ? (
                        <Input
                          className="h-8 font-medium"
                          defaultValue={item.product_name}
                          onBlur={(e) => handleFieldEdit(item.id, 'product_name', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleFieldEdit(item.id, 'product_name', e.currentTarget.value);
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <h3 
                          className="font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors truncate"
                          onClick={() => setEditingField({itemId: item.id, field: 'product_name'})}
                        >
                          {item.product_name}
                        </h3>
                      )}
                      
                      <div className="flex items-center gap-2 mt-1">
                        {editingField?.itemId === item.id && editingField?.field === 'product_url' ? (
                          <Input
                            className="h-6 text-xs"
                            defaultValue={item.product_url}
                            onBlur={(e) => handleFieldEdit(item.id, 'product_url', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleFieldEdit(item.id, 'product_url', e.currentTarget.value);
                              if (e.key === 'Escape') setEditingField(null);
                            }}
                            autoFocus
                          />
                        ) : item.product_url ? (
                          <div className="flex items-center gap-1">
                            <p 
                              className="text-sm text-gray-500 cursor-pointer hover:text-blue-500 transition-colors flex items-center gap-1 truncate"
                              onClick={() => setEditingField({itemId: item.id, field: 'product_url'})}
                            >
                              {new URL(item.product_url).hostname}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(item.product_url, '_blank');
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="Open in new tab"
                            >
                              <ExternalLink className="h-3 w-3 text-gray-400 hover:text-blue-500" />
                            </button>
                          </div>
                        ) : (
                          <p 
                            className="text-sm text-gray-400 cursor-pointer hover:text-blue-500 transition-colors"
                            onClick={() => setEditingField({itemId: item.id, field: 'product_url'})}
                          >
                            Add URL
                          </p>
                        )}
                        
                        <span className="text-gray-300">•</span>
                        
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">Qty:</span>
                          {editingField?.itemId === item.id && editingField?.field === 'quantity' ? (
                            <Input
                              type="number"
                              className="h-6 w-16 text-xs"
                              defaultValue={item.quantity}
                              onBlur={(e) => handleFieldEdit(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleFieldEdit(item.id, 'quantity', parseInt(e.currentTarget.value) || 1);
                                if (e.key === 'Escape') setEditingField(null);
                              }}
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => setEditingField({itemId: item.id, field: 'quantity'})}
                            >
                              {item.quantity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Price */}
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase">Price</p>
                    {editingField?.itemId === item.id && editingField?.field === 'price' ? (
                      <Input
                        type="number"
                        className="h-8 w-full text-center font-semibold"
                        defaultValue={item.price}
                        onBlur={(e) => handleFieldEdit(item.id, 'price', parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFieldEdit(item.id, 'price', parseFloat(e.currentTarget.value) || 0);
                          if (e.key === 'Escape') setEditingField(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <p 
                        className="font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => setEditingField({itemId: item.id, field: 'price'})}
                      >
                        ${item.price.toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Total: ${(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                  
                  {/* Weight */}
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase">Weight</p>
                    <div className="flex items-center justify-center gap-1">
                      <p className="font-semibold">{item.weight} kg</p>
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 capitalize">
                        {item.weight_source || 'manual'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* HSN */}
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase">HSN</p>
                    {editingField?.itemId === item.id && editingField?.field === 'hsn_code' ? (
                      <div className="w-full">
                        <SmartHSNSearch
                          value={item.hsn_code || ''}
                          onChange={(hsnCode) => handleFieldEdit(item.id, 'hsn_code', hsnCode)}
                          onCancel={() => setEditingField(null)}
                          placeholder="Search HSN"
                          className="h-8 text-xs font-mono"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <p 
                        className="font-mono font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => setEditingField({itemId: item.id, field: 'hsn_code'})}
                      >
                        {item.hsn_code || '--'}
                      </p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
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
                              const weightValue = source === 'manual' ? item.weight :
                                source === 'volumetric' && volumetricWeight ? volumetricWeight :
                                item.weight_options?.[source as keyof typeof item.weight_options] || item.weight;
                              
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
                                      if (source === 'hsn' && item.hsn_code) {
                                        const hsnData = await hsnWeightService.getHSNWeight(item.hsn_code);
                                        if (hsnData) {
                                          newWeight = hsnData.average;
                                        }
                                      } else if (source === 'ml') {
                                        const mlWeight = await smartWeightEstimator.estimateWeight(
                                          item.product_name, 
                                          item.product_url
                                        );
                                        if (mlWeight && mlWeight.weight > 0) {
                                          newWeight = mlWeight.weight;
                                        }
                                      } else if (source === 'volumetric' && volumetricWeight) {
                                        newWeight = volumetricWeight;
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
                                >
                                  {loadingWeight?.itemId === item.id && loadingWeight?.source === source ? (
                                    <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <IconComponent className="h-3 w-3" />
                                  )}
                                  <span className="capitalize">{source}</span>
                                  <span className="font-mono">
                                    {typeof weightValue === 'number' ? weightValue.toFixed(3) : weightValue}kg
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
                          
                          {/* Volumetric Weight Indicator */}
                          {volumetricWeight && volumetricWeight > 0 && (
                            <div className="ml-3 text-xs">
                              <span className="text-gray-500">Vol. Weight: </span>
                              <span className={cn(
                                "font-medium",
                                volumetricWeight > item.weight ? "text-orange-600" : "text-gray-600"
                              )}>
                                {volumetricWeight.toFixed(3)}kg
                              </span>
                              {volumetricWeight > item.weight && (
                                <span className="text-orange-600 ml-1">(Chargeable)</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Valuation */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-3 justify-end">
                          <span className="text-xs font-medium text-gray-500 w-8">Val</span>
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