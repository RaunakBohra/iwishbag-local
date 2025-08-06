/**
 * Compact HSN Search Component
 * 
 * A space-efficient combobox-style HSN search interface inspired by Stripe and Shopify patterns.
 * Uses progressive disclosure to maintain all functionality while minimizing UI footprint.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Control, useWatch, UseFormSetValue, FieldValues } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Search,
  Hash,
  CheckCircle,
  X,
  Settings,
  ChevronDown,
  Package,
  Calculator,
  Weight,
  Globe,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { productIntelligenceService, type ProductClassification } from '@/services/ProductIntelligenceService';

type HSNSearchResult = ProductClassification;

interface CompactHSNSearchProps {
  control?: Control<FieldValues> | null;
  index: number;
  setValue: UseFormSetValue<FieldValues> | ((name: string, value: any) => void);
  countryCode?: string;
  productName?: string;
  currentCategory?: string;
  currentHSN?: string;
  onSelection?: (data: {
    hsnCode: string;
    category: string;
    customsRate?: number;
    weight?: number;
    suggestion: HSNSearchResult;
  }) => void;
  // Settings props
  currentUseHSNRates?: boolean;
  currentValuationPreference?: 'auto' | 'product_price' | 'minimum_valuation';
  onHSNRateToggle?: (useHSNRates: boolean) => void;
  onValuationChange?: (preference: 'auto' | 'product_price' | 'minimum_valuation') => void;
  getHSNInfo?: (hsnCode: string, countryCode: string) => {
    description: string;
    customsRate: number;
    countryRate: number;
  } | null;
}

export const CompactHSNSearch: React.FC<CompactHSNSearchProps> = ({
  control,
  index,
  setValue,
  countryCode = 'IN',
  productName: propProductName,
  currentCategory: propCurrentCategory,
  currentHSN: propCurrentHSN,
  onSelection,
  currentUseHSNRates,
  currentValuationPreference,
  onHSNRateToggle,
  onValuationChange,
  getHSNInfo,
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<HSNSearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<HSNSearchResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Watch relevant fields
  const productName = control ? useWatch({
    control,
    name: `items.${index}.productName`,
  }) : propProductName;

  const currentCategory = control ? useWatch({
    control,
    name: `items.${index}.category`,
  }) : propCurrentCategory;

  const currentHSN = control ? useWatch({
    control,
    name: `items.${index}.hsnCode`,
  }) : propCurrentHSN;

  // Auto-suggest when product name changes
  useEffect(() => {
    if (productName && !selectedResult && !currentHSN) {
      const timeoutId = setTimeout(() => {
        performSearch(productName);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [productName]);

  const performSearch = useCallback(async (query: string) => {
    if (!query?.trim()) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await productIntelligenceService.searchProductClassifications(
        query,
        countryCode,
        8 // Show more results for better selection
      );
      
      setSuggestions(results);
      console.log(`🔍 [Compact HSN Search] Found ${results.length} results for "${query}"`);
    } catch (error) {
      console.error('HSN search error:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [countryCode]);

  const handleSelectResult = async (suggestion: HSNSearchResult) => {
    // Update form fields
    if (control) {
      setValue(`items.${index}.hsnCode`, suggestion.classification_code);
      setValue(`items.${index}.category`, suggestion.category);
      
      if (suggestion.country_data?.customs_rate || suggestion.customs_rate) {
        setValue(`items.${index}.customsRate`, suggestion.country_data?.customs_rate || suggestion.customs_rate);
      }
      if (suggestion.typical_weight_kg) {
        setValue(`items.${index}.estimatedWeight`, suggestion.typical_weight_kg);
      }
    } else {
      (setValue as any)('hsnCode', suggestion.classification_code);
      (setValue as any)('category', suggestion.category);
    }

    setSelectedResult(suggestion);
    setOpen(false);
    setSearchQuery('');

    // Callback to parent component
    if (onSelection) {
      onSelection({
        hsnCode: suggestion.classification_code,
        category: suggestion.category,
        customsRate: suggestion.country_data?.customs_rate || suggestion.customs_rate,
        weight: suggestion.typical_weight_kg,
        suggestion,
      });
    }

    // Record usage for learning
    await productIntelligenceService.updateUsageFrequency(
      suggestion.id,
      countryCode
    );

    toast({
      title: 'HSN Code Applied',
      description: `${suggestion.classification_code} - ${suggestion.category}`,
    });
  };

  const clearSelection = () => {
    setSelectedResult(null);
    if (control) {
      setValue(`items.${index}.hsnCode`, '');
      setValue(`items.${index}.category`, '');
    } else {
      (setValue as any)('hsnCode', '');
      (setValue as any)('category', '');
    }
  };

  const getClassificationSystemName = (country: string) => {
    switch (country) {
      case 'IN': return 'HSN';
      case 'NP': return 'HS';
      case 'US': return 'HTS';
      default: return 'Classification';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  // Determine what to show in the trigger
  const hasSelection = selectedResult || currentHSN;
  const displayHSN = selectedResult?.classification_code || currentHSN;
  const displayCategory = selectedResult?.category || currentCategory;
  const displayName = selectedResult?.product_name;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 w-full">
        {/* Main HSN Search Combobox */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "flex-1 justify-between text-left font-normal min-w-0 sm:min-w-[300px]",
                hasSelection ? "border-green-300 bg-green-50" : "border-gray-300"
              )}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {hasSelection ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <Badge variant="outline" className="font-mono text-xs flex-shrink-0">
                        {displayHSN}
                      </Badge>
                      <span className="truncate text-sm">
                        {displayName || displayCategory}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-500">
                      {productName ? 
                        `Searching "${productName.slice(0, 30)}${productName.length > 30 ? '...' : ''}"` :
                        `Search ${getClassificationSystemName(countryCode)} codes...`
                      }
                    </span>
                    {productName && !selectedResult && (
                      <Sparkles className="h-3 w-3 text-blue-500 animate-pulse flex-shrink-0" />
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0">
                <Badge variant="outline" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  {countryCode}
                </Badge>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[90vw] sm:w-[400px] p-0" align="start">
            <Command>
              <CommandInput 
                placeholder={`Search by product name, category, or ${getClassificationSystemName(countryCode)} code...`}
                value={searchQuery}
                onValueChange={(value) => {
                  setSearchQuery(value);
                  performSearch(value);
                }}
              />
              <CommandList>
                {isSearching && (
                  <div className="flex items-center justify-center py-4">
                    <Search className="h-4 w-4 animate-pulse mr-2" />
                    <span className="text-sm text-gray-500">Searching...</span>
                  </div>
                )}
                
                <CommandEmpty>
                  <div className="text-center py-4">
                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <div className="text-sm text-gray-500">
                      No {getClassificationSystemName(countryCode)} codes found
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Try different keywords or product categories
                    </div>
                  </div>
                </CommandEmpty>

                {suggestions.length > 0 && (
                  <CommandGroup>
                    {suggestions.map((suggestion) => (
                      <CommandItem
                        key={suggestion.id}
                        value={`${suggestion.classification_code} ${suggestion.product_name} ${suggestion.category}`}
                        onSelect={() => handleSelectResult(suggestion)}
                        className="py-3"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <Hash className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <code className="text-sm font-mono font-semibold text-blue-800">
                                  {suggestion.classification_code}
                                </code>
                                <Badge 
                                  className={cn("text-xs", getConfidenceColor(suggestion.confidence_score))}
                                  variant="outline"
                                >
                                  {Math.round(suggestion.confidence_score * 100)}%
                                </Badge>
                              </div>
                              <div className="text-sm font-medium truncate">
                                {suggestion.product_name}
                              </div>
                              <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                                <div className="flex items-center space-x-1">
                                  <Package className="h-3 w-3" />
                                  <span>{suggestion.category}</span>
                                </div>
                                {(suggestion.country_data?.customs_rate || suggestion.customs_rate) && (
                                  <div className="flex items-center space-x-1">
                                    <Calculator className="h-3 w-3" />
                                    <span>{suggestion.country_data?.customs_rate || suggestion.customs_rate}%</span>
                                  </div>
                                )}
                                {suggestion.typical_weight_kg && (
                                  <div className="flex items-center space-x-1">
                                    <Weight className="h-3 w-3" />
                                    <span>{suggestion.typical_weight_kg}kg</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Clear Button (when selection exists) */}
        {hasSelection && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear HSN selection</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Settings Button (when selection exists) */}
        {hasSelection && (onHSNRateToggle || onValuationChange) && (
          <Popover open={showSettings} onOpenChange={setShowSettings}>
            <PopoverTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>HSN settings</p>
                </TooltipContent>
              </Tooltip>
            </PopoverTrigger>
            <PopoverContent className="w-[90vw] sm:w-80" align="end">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">HSN Settings</h4>
                
                {/* HSN Rate Information */}
                {getHSNInfo && displayHSN && (() => {
                  const hsnInfo = getHSNInfo(displayHSN, countryCode);
                  const savings = hsnInfo ? Math.max(0, hsnInfo.countryRate - hsnInfo.customsRate) : 0;
                  const isUsingHSN = currentUseHSNRates || false;
                  
                  return hsnInfo ? (
                    <div className="p-3 bg-gray-50 rounded border text-sm">
                      <div className="font-medium">{displayHSN} - {displayCategory}</div>
                      <div className="text-gray-600 mt-1">
                        HSN: {hsnInfo.customsRate}% • Default: {hsnInfo.countryRate}%
                        {savings > 0 && ` • Saves ${savings}%`}
                      </div>
                      <div className="mt-2">
                        {isUsingHSN ? (
                          <span className="text-green-700 font-medium text-xs">✅ Using HSN rate</span>
                        ) : (
                          <span className="text-orange-600 font-medium text-xs">⚠️ Using default rate</span>
                        )}
                      </div>
                    </div>
                  ) : null;
                })()}

                <Separator />

                {/* Valuation Preference */}
                {onValuationChange && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Valuation Method</Label>
                    <select
                      className="w-full text-sm border rounded px-3 py-2 bg-white"
                      value={currentValuationPreference || 'auto'}
                      onChange={(e) => onValuationChange(e.target.value as 'auto' | 'product_price' | 'minimum_valuation')}
                    >
                      <option value="auto">🤖 Auto</option>
                      <option value="product_price">💰 Product Price</option>
                      <option value="minimum_valuation">🏛️ Min Valuation</option>
                    </select>
                  </div>
                )}

                {/* HSN Rate Toggle */}
                {onHSNRateToggle && (
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Use HSN Rate</Label>
                    <Switch
                      checked={currentUseHSNRates || false}
                      onCheckedChange={onHSNRateToggle}
                    />
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </TooltipProvider>
  );
};