/**
 * Smart HSN Code Field - Phase 3
 * 
 * Provides intelligent HSN/HS code suggestions using our ProductIntelligenceService.
 * Features real-time search, confidence scoring, and multi-country support.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Control, useWatch, UseFormSetValue, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Hash,
  CheckCircle,
  AlertTriangle,
  Target,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Info,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { productIntelligenceService, type ProductSuggestion } from '@/services/ProductIntelligenceService';

interface SmartHSNFieldProps {
  control: Control<FieldValues>;
  index: number;
  setValue: UseFormSetValue<FieldValues>;
  countryCode?: string;
  onHSNSelected?: (hsnCode: string, suggestion: ProductSuggestion) => void;
}

export const SmartHSNField: React.FC<SmartHSNFieldProps> = ({
  control,
  index,
  setValue,
  countryCode = 'IN',
  onHSNSelected,
}) => {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ProductSuggestion | null>(null);
  const [hasUserInput, setHasUserInput] = useState(false);

  // Watch relevant fields for auto-suggestions
  const productName = useWatch({
    control,
    name: `items.${index}.productName`,
  });

  const currentHSN = useWatch({
    control,
    name: `items.${index}.hsnCode`,
  });

  // Auto-search when product name changes
  useEffect(() => {
    if (productName && !hasUserInput) {
      const timeoutId = setTimeout(() => {
        searchHSNSuggestions(productName);
      }, 800); // Debounce for 800ms

      return () => clearTimeout(timeoutId);
    }
  }, [productName, hasUserInput]);

  const searchHSNSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery?.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await productIntelligenceService.getSmartSuggestions(
        searchQuery,
        countryCode,
        undefined, // category - let the AI determine
        5 // limit
      );
      
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      
      console.log(`🔍 [HSN] Found ${results.length} suggestions for "${searchQuery}"`);
    } catch (error) {
      console.error('HSN search error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  }, [countryCode]);

  const handleSelectSuggestion = async (suggestion: ProductSuggestion) => {
    setValue(`items.${index}.hsnCode`, suggestion.classification_code);
    setSelectedSuggestion(suggestion);
    setHasUserInput(true);
    setShowSuggestions(false);
    onHSNSelected?.(suggestion.classification_code, suggestion);

    // Record usage for learning
    await productIntelligenceService.updateUsageFrequency(
      suggestion.classification_code,
      countryCode
    );

    toast({
      title: 'HSN Code Applied',
      description: `${suggestion.classification_code} - ${suggestion.product_name} (${Math.round(suggestion.confidence_score * 100)}% confidence)`,
    });
  };

  const handleManualInput = (value: string) => {
    setHasUserInput(!!value);
    setSelectedSuggestion(null);
    if (!value) {
      setShowSuggestions(suggestions.length > 0);
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

  return (
    <FormField
      control={control}
      name={`items.${index}.hsnCode`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center space-x-2">
            <Hash className="h-4 w-4" />
            <span>{getClassificationSystemName(countryCode)} Code</span>
            <Badge variant="outline" className="text-xs">
              Smart Suggestions
            </Badge>
            {isSearching && (
              <div className="flex items-center space-x-1">
                <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                <span className="text-xs text-blue-600">Searching...</span>
              </div>
            )}
          </FormLabel>

          <FormControl>
            <div className="space-y-3">
              <div className="relative">
                <Input
                  placeholder={`Enter ${getClassificationSystemName(countryCode)} code or let AI suggest`}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    handleManualInput(e.target.value);
                  }}
                  onFocus={() => setShowSuggestions(suggestions.length > 0 && !hasUserInput)}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>

              {/* Selected Suggestion Info */}
              {selectedSuggestion && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div className="text-sm">
                          <div className="font-medium text-green-800">
                            {selectedSuggestion.product_name}
                          </div>
                          <div className="text-xs text-green-600">
                            Category: {selectedSuggestion.category} • 
                            Confidence: {Math.round(selectedSuggestion.confidence_score * 100)}%
                          </div>
                        </div>
                      </div>
                      <Badge 
                        className={getConfidenceColor(selectedSuggestion.confidence_score)}
                        variant="outline"
                      >
                        {Math.round(selectedSuggestion.confidence_score * 100)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <Card className="absolute z-50 w-full mt-1 shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Smart Suggestions</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        <Globe className="h-3 w-3 mr-1" />
                        {countryCode}
                      </Badge>
                    </div>
                  </CardHeader>
                  <ScrollArea className="max-h-60">
                    <div className="space-y-1 p-2">
                      {suggestions.map((suggestion, idx) => {
                        const ConfidenceIcon = getConfidenceIcon(suggestion.confidence_score);
                        return (
                          <Button
                            key={idx}
                            variant="ghost"
                            className="w-full justify-start h-auto p-3 text-left"
                            onClick={() => handleSelectSuggestion(suggestion)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono text-sm font-medium">
                                    {suggestion.classification_code}
                                  </span>
                                  <ConfidenceIcon className="h-3 w-3" />
                                </div>
                                <div className="text-sm">{suggestion.product_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {suggestion.category}
                                  {suggestion.customs_rate && 
                                    ` • ${suggestion.customs_rate}% customs`
                                  }
                                </div>
                              </div>
                              <Badge 
                                className={cn(
                                  "text-xs",
                                  getConfidenceColor(suggestion.confidence_score)
                                )}
                                variant="outline"
                              >
                                {Math.round(suggestion.confidence_score * 100)}%
                              </Badge>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </Card>
              )}

              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                <span>
                  AI will suggest {getClassificationSystemName(countryCode)} codes based on product name.
                  Higher confidence = more accurate suggestion.
                </span>
              </div>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};