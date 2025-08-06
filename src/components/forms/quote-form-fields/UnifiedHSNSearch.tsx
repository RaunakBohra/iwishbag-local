/**
 * Unified HSN Search Component
 * 
 * Combines category and HSN code selection into a single, intuitive search interface.
 * Positioned after price field to provide manual fallback when AI cannot find matches.
 * Displays HSN code, category, customs rate, and weight in search results.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Control, useWatch, UseFormSetValue, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Search,
  Hash,
  CheckCircle,
  AlertTriangle,
  Target,
  Sparkles,
  Package,
  Weight,
  Calculator,
  Info,
  Globe,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { productIntelligenceService, type ProductClassification } from '@/services/ProductIntelligenceService';

type HSNSearchResult = ProductClassification;

interface UnifiedHSNSearchProps {
  control?: Control<FieldValues> | null;
  index: number;
  setValue: UseFormSetValue<FieldValues> | ((name: string, value: any) => void);
  countryCode?: string;
  productName?: string; // Allow direct prop for product name
  currentCategory?: string; // Allow direct prop for current category
  currentHSN?: string; // Allow direct prop for current HSN
  onSelection?: (data: {
    hsnCode: string;
    category: string;
    customsRate?: number;
    weight?: number;
    suggestion: HSNSearchResult;
  }) => void;
  // Additional props for consolidated controls
  currentUseHSNRates?: boolean;
  currentValuationPreference?: 'auto' | 'product_price' | 'minimum_valuation';
  onHSNRateToggle?: (useHSNRates: boolean) => void;
  onValuationChange?: (preference: 'auto' | 'product_price' | 'minimum_valuation') => void;
  // For getting HSN info to show rates
  getHSNInfo?: (hsnCode: string, countryCode: string) => {
    description: string;
    customsRate: number;
    countryRate: number;
  } | null;
}

export const UnifiedHSNSearch: React.FC<UnifiedHSNSearchProps> = ({
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
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<HSNSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedResult, setSelectedResult] = useState<HSNSearchResult | null>(null);

  // Watch relevant fields (fallback to props if no control)
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
    if (productName && !selectedResult) {
      const timeoutId = setTimeout(() => {
        performSearch(productName);
      }, 1000); // 1 second debounce for auto-suggestions

      return () => clearTimeout(timeoutId);
    }
  }, [productName]);

  const performSearch = useCallback(async (query: string) => {
    if (!query?.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await productIntelligenceService.searchProductClassifications(
        query,
        countryCode,
        10 // limit - show more results for manual selection
      );
      
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      
      console.log(`🔍 [HSN Search] Found ${results.length} results for "${query}"`);
    } catch (error) {
      console.error('HSN search error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
      toast({
        title: 'Search Error',
        description: 'Failed to search HSN codes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  }, [countryCode, toast]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  const handleSelectResult = async (suggestion: HSNSearchResult) => {
    // Update form fields - handle both React Hook Form and direct function
    if (control) {
      setValue(`items.${index}.hsnCode`, suggestion.classification_code);
      setValue(`items.${index}.category`, suggestion.category);
      
      // Update additional fields if available
      if (suggestion.country_data?.customs_rate || suggestion.customs_rate) {
        setValue(`items.${index}.customsRate`, suggestion.country_data?.customs_rate || suggestion.customs_rate);
      }
      if (suggestion.typical_weight_kg) {
        setValue(`items.${index}.estimatedWeight`, suggestion.typical_weight_kg);
      }
    } else {
      // Direct function calls for non-hook-form usage
      (setValue as any)('hsnCode', suggestion.classification_code);
      (setValue as any)('category', suggestion.category);
    }

    setSelectedResult(suggestion);
    setShowSuggestions(false);
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
      suggestion.classification_code,
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return CheckCircle;
    if (confidence >= 0.7) return AlertTriangle;
    return Target;
  };

  const getClassificationSystemName = (country: string) => {
    switch (country) {
      case 'IN': return 'HSN';
      case 'NP': return 'HS';
      case 'US': return 'HTS';
      default: return 'Classification';
    }
  };

  const hasCurrentData = currentCategory && currentHSN;

  return (
    <div className="space-y-4">
      {/* Selected Result Display */}
      {selectedResult && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-800">
                    {selectedResult.classification_code} - {selectedResult.category}
                  </div>
                  <div className="text-sm text-green-600">
                    {selectedResult.product_name}
                    {(selectedResult.country_data?.customs_rate || selectedResult.customs_rate) && 
                      ` • ${selectedResult.country_data?.customs_rate || selectedResult.customs_rate}% customs`}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={getConfidenceColor(selectedResult.confidence_score)} variant="outline">
                  {Math.round(selectedResult.confidence_score * 100)}%
                </Badge>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consolidated HSN Controls - Show when HSN is selected */}
      {(selectedResult || currentHSN) && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* HSN Rate Information */}
              {getHSNInfo && (selectedResult?.classification_code || currentHSN) && (() => {
                const hsnCode = selectedResult?.classification_code || currentHSN || '';
                const hsnInfo = getHSNInfo(hsnCode, countryCode);
                const savings = hsnInfo ? Math.max(0, hsnInfo.countryRate - hsnInfo.customsRate) : 0;
                const isUsingHSN = currentUseHSNRates || false;
                
                return (
                  <div className="flex items-center p-3 bg-white rounded border">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-3" />
                    <div className="flex-1">
                      <div className="font-medium text-green-800">
                        {hsnCode} - {selectedResult?.category || currentCategory}
                      </div>
                      {hsnInfo && (
                        <div className="text-sm text-green-600">
                          HSN: {hsnInfo.customsRate}% • Default: {hsnInfo.countryRate}%
                          {savings > 0 && ` • Saves ${savings}%`}
                          {isUsingHSN ? (
                            <span className="ml-2 text-green-700 font-medium">✅ Using HSN rate</span>
                          ) : (
                            <span className="ml-2 text-orange-600 font-medium">⚠️ Using default rate</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Compact Settings Row */}
              <div className="flex items-center justify-between p-3 bg-white rounded border">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-green-700">Valuation:</Label>
                  <select
                    className="text-sm border rounded px-2 py-1 bg-white"
                    value={currentValuationPreference || 'auto'}
                    onChange={(e) => onValuationChange?.(e.target.value as 'auto' | 'product_price' | 'minimum_valuation')}
                  >
                    <option value="auto">🤖 Auto</option>
                    <option value="product_price">💰 Product Price</option>
                    <option value="minimum_valuation">🏛️ Min Valuation</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Label htmlFor="hsn-toggle-compact" className="text-sm font-medium text-green-700">
                    Use HSN Rate
                  </Label>
                  <Switch
                    id="hsn-toggle-compact"
                    checked={currentUseHSNRates || false}
                    onCheckedChange={onHSNRateToggle}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Data Display (when not from our selection) */}
      {hasCurrentData && !selectedResult && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Current: {currentHSN} - {currentCategory}
            <Button variant="link" size="sm" className="ml-2 p-0 h-auto" onClick={clearSelection}>
              Search for better match
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Search Interface */}
      <Card className="border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Search className="h-5 w-5 text-blue-600" />
            <span>{getClassificationSystemName(countryCode)} Code Search</span>
            <Badge variant="outline" className="text-xs">
              <Globe className="h-3 w-3 mr-1" />
              {countryCode}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder={`Search by product name, category, or ${getClassificationSystemName(countryCode)} code...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={!searchQuery.trim() || isSearching}
                className="shrink-0"
              >
                {isSearching ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Auto-suggestion indicator */}
            {productName && !selectedResult && (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <Sparkles className="h-4 w-4" />
                <span>Searching suggestions for "{productName}"...</span>
              </div>
            )}

            {/* Search Results */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Search Results</span>
                  <Badge variant="secondary" className="text-xs">
                    {suggestions.length} found
                  </Badge>
                </div>
                <div 
                  className="max-h-80 overflow-y-auto space-y-2 border rounded-md bg-gray-50 p-2"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#cbd5e1 #f1f5f9',
                    overflowY: 'scroll' as const
                  }}
                >
                    {suggestions.map((suggestion, idx) => {
                      const ConfidenceIcon = getConfidenceIcon(suggestion.confidence_score);
                      return (
                        <Card 
                          key={idx} 
                          className="cursor-pointer hover:shadow-md transition-shadow border-gray-200 hover:border-blue-300"
                          onClick={() => handleSelectResult(suggestion)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Hash className="h-4 w-4 text-blue-600" />
                                  <span className="font-mono font-medium text-blue-800">
                                    {suggestion.classification_code}
                                  </span>
                                  <ConfidenceIcon className="h-4 w-4 text-gray-500" />
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="font-medium">{suggestion.product_name}</div>
                                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                                    <div className="flex items-center space-x-1">
                                      <Package className="h-3 w-3" />
                                      <span>{suggestion.category}</span>
                                    </div>
                                    {(suggestion.country_data?.customs_rate || suggestion.customs_rate) && (
                                      <div className="flex items-center space-x-1">
                                        <Calculator className="h-3 w-3" />
                                        <span>{suggestion.country_data?.customs_rate || suggestion.customs_rate}% customs</span>
                                      </div>
                                    )}
                                    {suggestion.typical_weight_kg && (
                                      <div className="flex items-center space-x-1">
                                        <Weight className="h-3 w-3" />
                                        <span>{suggestion.typical_weight_kg}kg est.</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2 ml-4">
                                <Badge 
                                  className={cn("text-xs", getConfidenceColor(suggestion.confidence_score))}
                                  variant="outline"
                                >
                                  {Math.round(suggestion.confidence_score * 100)}%
                                </Badge>
                                <ArrowRight className="h-4 w-4 text-gray-400" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </div>
            )}

            {/* No results message */}
            {showSuggestions && suggestions.length === 0 && !isSearching && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No {getClassificationSystemName(countryCode)} codes found for this search. 
                  Try different keywords or product categories.
                </AlertDescription>
              </Alert>
            )}

            {/* Help text */}
            <div className="text-xs text-muted-foreground">
              <Info className="h-3 w-3 inline mr-1" />
              Search by product name for best results. Select a result to automatically fill category, 
              {getClassificationSystemName(countryCode)} code, and customs information.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};