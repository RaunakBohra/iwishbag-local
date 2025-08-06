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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

  // Fetch HSN details when we have currentHSN but no selectedResult (loading existing data)
  useEffect(() => {
    if (currentHSN && !selectedResult) {
      const fetchHSNDetails = async () => {
        try {
          const results = await productIntelligenceService.searchProductClassifications(
            currentHSN, 
            countryCode, 
            1
          );
          if (results.length > 0 && results[0].classification_code === currentHSN) {
            setSelectedResult(results[0]);
          }
        } catch (error) {
          console.log('Could not fetch HSN details:', error);
        }
      };
      fetchHSNDetails();
    }
  }, [currentHSN, selectedResult, countryCode]);

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

  // Debug logging (can be removed in production)
  // console.log('[CompactHSNSearch] Debug:', {
  //   hasSelection,
  //   currentHSN,
  //   selectedResult: !!selectedResult,
  //   hasCallbacks: !!(onHSNRateToggle || onValuationChange),
  //   shouldShowSettings: hasSelection && (onHSNRateToggle || onValuationChange),
  //   showSettings: showSettings
  // });

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
                "flex-1 justify-between text-left font-normal min-w-0 sm:min-w-[300px] transition-all duration-200 relative",
                hasSelection 
                  ? "border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm hover:from-blue-100 hover:to-indigo-100 border-l-4 border-l-blue-500" 
                  : "border-gray-300 bg-white hover:border-gray-400"
              )}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {hasSelection ? (
                  <>
                    <div className="flex items-center justify-center w-4 h-4 bg-blue-600 text-white rounded-full flex-shrink-0">
                      <CheckCircle className="h-3 w-3" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="font-mono text-sm font-semibold text-blue-800 flex-shrink-0">
                          {displayHSN}
                        </span>
                        <span className="truncate text-sm font-medium text-gray-900">
                          {displayName || displayCategory}
                        </span>
                      </div>
                      {/* Additional details - Financial information only */}
                      <div className="flex items-center space-x-4 text-xs text-gray-600 mt-1.5">
                        {(selectedResult?.country_data?.customs_rate || selectedResult?.customs_rate) && (
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-500 font-medium text-xs">DUTY:</span>
                            <span className="font-semibold text-blue-700 text-xs">
                              {selectedResult.country_data?.customs_rate || selectedResult.customs_rate}%
                            </span>
                          </div>
                        )}
                        {selectedResult?.minimum_valuation_usd && (
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-500 font-medium text-xs">MIN VAL:</span>
                            <span className="font-semibold text-emerald-700 text-xs">
                              ${selectedResult.minimum_valuation_usd}
                            </span>
                          </div>
                        )}
                      </div>
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
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs font-medium",
                    hasSelection 
                      ? "bg-white/80 text-blue-700 border-blue-200" 
                      : "bg-gray-100 text-gray-600 border-gray-200"
                  )}
                >
                  <Globe className="h-3 w-3 mr-1" />
                  {countryCode}
                </Badge>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-colors",
                  hasSelection ? "text-blue-500" : "text-gray-400"
                )} />
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
                              <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                                <div className="flex items-center space-x-1">
                                  <Package className="h-3 w-3" />
                                  <span className="font-medium">{suggestion.category}</span>
                                </div>
                                {(suggestion.country_data?.customs_rate || suggestion.customs_rate) && (
                                  <div className="flex items-center space-x-1">
                                    <span className="text-gray-400 font-medium">DUTY:</span>
                                    <span className="font-semibold text-blue-600">
                                      {suggestion.country_data?.customs_rate || suggestion.customs_rate}%
                                    </span>
                                  </div>
                                )}
                                {suggestion.minimum_valuation_usd && (
                                  <div className="flex items-center space-x-1">
                                    <span className="text-gray-400 font-medium">MIN:</span>
                                    <span className="font-semibold text-green-600">
                                      ${suggestion.minimum_valuation_usd}
                                    </span>
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

        {/* Settings Button (when selection exists) - Using Dialog instead of Popover */}
        {hasSelection && (onHSNRateToggle || onValuationChange) && (
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                title="HSN settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-gray-900">
                  Classification Settings
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* HSN Classification Details */}
                {displayHSN && (
                  <div className="border rounded-lg bg-white">
                    {/* Header */}
                    <div className="px-4 py-3 bg-gray-50 border-b rounded-t-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {getClassificationSystemName(countryCode)} Classification
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {countryCode} Customs Code
                          </div>
                        </div>
                        <Badge variant="outline" className="font-mono text-sm">
                          {displayHSN}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="px-4 py-4 space-y-4">
                      {/* Primary Classification */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Product Classification</div>
                        <div className="text-sm text-gray-900">{displayName || displayCategory}</div>
                      </div>
                      
                      {/* Subcategory */}
                      {selectedResult?.subcategory && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Subcategory</div>
                          <div className="text-sm text-gray-900">{selectedResult.subcategory}</div>
                        </div>
                      )}
                      
                      {/* Description */}
                      {selectedResult?.description && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Description</div>
                          <div className="text-sm text-gray-900 leading-relaxed">{selectedResult.description}</div>
                        </div>
                      )}
                      
                      {/* Financial Details */}
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                        {/* Customs Rate */}
                        {(selectedResult?.country_data?.customs_rate || selectedResult?.customs_rate) && (
                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                              Customs Duty Rate
                            </div>
                            <div className="text-lg font-semibold text-blue-600">
                              {selectedResult.country_data?.customs_rate || selectedResult.customs_rate}%
                            </div>
                          </div>
                        )}
                        
                        {/* Minimum Valuation */}
                        {selectedResult?.minimum_valuation_usd && (
                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                              Minimum Valuation
                            </div>
                            <div className="text-lg font-semibold text-green-600">
                              ${selectedResult.minimum_valuation_usd} USD
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Status Indicator */}
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Current Configuration:</span>
                          {currentUseHSNRates ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div>
                              HSN-Specific Rates Applied
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5"></div>
                              Default Country Rates Applied
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Configuration Controls */}
                <div className="border rounded-lg bg-white">
                  <div className="px-4 py-3 bg-gray-50 border-b rounded-t-lg">
                    <div className="text-sm font-medium text-gray-900">Configuration Settings</div>
                    <div className="text-xs text-gray-500 mt-0.5">Adjust customs calculation parameters</div>
                  </div>
                  
                  <div className="px-4 py-4 space-y-6">
                    {/* Valuation Method */}
                    {onValuationChange && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Valuation Method</Label>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Determines how customs value is calculated
                          </div>
                        </div>
                        <select
                          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={currentValuationPreference || 'auto'}
                          onChange={(e) => onValuationChange(e.target.value as 'auto' | 'product_price' | 'minimum_valuation')}
                        >
                          <option value="auto">Automatic Selection (recommended)</option>
                          <option value="product_price">Product Price Only</option>
                          <option value="minimum_valuation">Minimum Valuation Only</option>
                        </select>
                        <div className="text-xs text-gray-500">
                          {currentValuationPreference === 'auto' && 'Uses the higher value between product price and minimum valuation'}
                          {currentValuationPreference === 'product_price' && 'Uses only the declared product price for customs calculation'}
                          {currentValuationPreference === 'minimum_valuation' && 'Uses only the minimum valuation threshold for customs'}
                        </div>
                      </div>
                    )}

                    {/* HSN Rate Toggle */}
                    {onHSNRateToggle && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Customs Rate Application</Label>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Choose between HSN-specific or default country rates
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              Apply HSN-Specific Rate
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {currentUseHSNRates 
                                ? `Using ${selectedResult?.country_data?.customs_rate || selectedResult?.customs_rate || 'N/A'}% HSN rate`
                                : 'Using default country rate'
                              }
                            </div>
                          </div>
                          <Switch
                            checked={currentUseHSNRates || false}
                            onCheckedChange={onHSNRateToggle}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  );
};