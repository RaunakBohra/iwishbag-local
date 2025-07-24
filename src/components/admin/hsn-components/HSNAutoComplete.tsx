// ============================================================================
// HSN AUTOCOMPLETE COMPONENT - Smart HSN Search with Database Integration
// Features: Keyword search, HSN code search, auto-suggestion, real-time validation
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  Check,
  ChevronDown,
  Package,
  Tag,
  DollarSign,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CurrencyConversionService from '@/services/CurrencyConversionService';

interface HSNRecord {
  id: string;
  hsn_code: string;
  description: string;
  category: string;
  subcategory?: string;
  keywords: string[];
  minimum_valuation_usd?: number;
  requires_currency_conversion: boolean;
  weight_data: any;
  tax_data: any;
  classification_data: any;
}

interface HSNAutoCompleteProps {
  value?: string;
  productName?: string;
  originCountry?: string;
  onHSNSelect: (hsn: HSNRecord) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const HSNAutoComplete: React.FC<HSNAutoCompleteProps> = ({
  value = '',
  productName = '',
  originCountry = 'US',
  onHSNSelect,
  onClear,
  placeholder = "Search HSN codes or enter product keywords...",
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hsnSuggestions, setHsnSuggestions] = useState<HSNRecord[]>([]);
  const [selectedHSN, setSelectedHSN] = useState<HSNRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const currencyService = CurrencyConversionService.getInstance();

  // Auto-search when productName changes
  useEffect(() => {
    if (productName && productName.length > 2 && !selectedHSN) {
      handleAutoSearch(productName);
    }
  }, [productName]);

  // Search HSN database
  const searchHSN = async (query: string): Promise<HSNRecord[]> => {
    if (query.length < 2) return [];

    try {
      // Search HSN code and description (this should work reliably)
      const { data, error } = await supabase
        .from('hsn_master')
        .select('*')
        .or(`hsn_code.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('is_active', true)
        .order('hsn_code')
        .limit(10);

      if (error) {
        console.error('HSN search error:', error);
        return [];
      }

      // Also do client-side keyword matching for better results
      const results = data || [];
      const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);
      
      // Add a score to results based on keyword matches
      const scoredResults = results.map(item => {
        let score = 0;
        
        // Higher score for exact HSN code match
        if (item.hsn_code.toLowerCase().includes(query.toLowerCase())) {
          score += 10;
        }
        
        // Score for description matches
        if (item.description.toLowerCase().includes(query.toLowerCase())) {
          score += 5;
        }
        
        // Score for keyword matches (client-side)
        if (item.keywords && Array.isArray(item.keywords)) {
          for (const keyword of item.keywords) {
            for (const term of queryTerms) {
              if (keyword.toLowerCase().includes(term) || term.includes(keyword.toLowerCase())) {
                score += 3;
              }
            }
          }
        }
        
        return { ...item, searchScore: score };
      });

      // Sort by score (highest first) and return
      return scoredResults
        .sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0))
        .slice(0, 10);

    } catch (error) {
      console.error('Error searching HSN records:', error);
      return [];
    }
  };

  // Handle search input
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setHsnSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchHSN(query);
      setHsnSuggestions(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-search based on product name
  const handleAutoSearch = async (productName: string) => {
    // Extract keywords from product name
    const keywords = productName.toLowerCase().split(' ').filter(word => word.length > 2);
    
    if (keywords.length === 0) return;

    setIsLoading(true);
    try {
      // Search by keywords first
      const keywordResults = await searchHSN(keywords.join(' '));
      
      if (keywordResults.length > 0) {
        setHsnSuggestions(keywordResults);
        // Auto-select if high confidence match
        const exactMatch = keywordResults.find(hsn => 
          hsn.keywords.some(keyword => 
            keywords.some(word => 
              keyword.toLowerCase().includes(word) || word.includes(keyword.toLowerCase())
            )
          )
        );
        
        if (exactMatch) {
          handleHSNSelect(exactMatch);
        }
      }
    } catch (error) {
      console.error('Auto-search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle HSN selection
  const handleHSNSelect = (hsn: HSNRecord) => {
    setSelectedHSN(hsn);
    setOpen(false);
    setShowPreview(true);
    onHSNSelect(hsn);
  };

  // Clear selection
  const handleClear = () => {
    setSelectedHSN(null);
    setSearchQuery('');
    setHsnSuggestions([]);
    setShowPreview(false);
    if (onClear) onClear();
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    const colors = {
      electronics: 'bg-blue-50 text-blue-700 border-blue-200',
      clothing: 'bg-purple-50 text-purple-700 border-purple-200',
      books: 'bg-green-50 text-green-700 border-green-200',
      toys: 'bg-orange-50 text-orange-700 border-orange-200',
      accessories: 'bg-pink-50 text-pink-700 border-pink-200',
      home_garden: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  // Format minimum valuation with currency conversion
  const formatMinimumValuation = async (hsnRecord: HSNRecord) => {
    if (!hsnRecord.minimum_valuation_usd || !hsnRecord.requires_currency_conversion) {
      return null;
    }

    try {
      const conversion = await currencyService.convertMinimumValuation(
        hsnRecord.minimum_valuation_usd,
        originCountry
      );
      return `$${hsnRecord.minimum_valuation_usd} USD → ${conversion.convertedAmount} ${conversion.originCurrency}`;
    } catch (error) {
      return `$${hsnRecord.minimum_valuation_usd} USD`;
    }
  };

  return (
    <div className="space-y-3">
      {/* HSN Search Interface */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-gray-700">
          HSN Classification
        </label>
        
        {selectedHSN ? (
          // Selected HSN Display
          <div className="flex items-center justify-between p-3 border border-green-200 bg-green-50 rounded-md">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-green-600" />
                <Badge variant="outline" className="text-xs">
                  HSN: {selectedHSN.hsn_code}
                </Badge>
                <Badge variant="outline" className={`text-xs ${getCategoryColor(selectedHSN.category)}`}>
                  {selectedHSN.category.charAt(0).toUpperCase() + selectedHSN.category.slice(1).replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="h-6 px-2 text-xs hover:bg-green-100"
            >
              Change
            </Button>
          </div>
        ) : (
          // Search Interface
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between text-left font-normal"
                disabled={disabled}
              >
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">
                    {searchQuery || placeholder}
                  </span>
                </div>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search HSN codes or keywords..."
                  value={searchQuery}
                  onValueChange={handleSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-sm text-gray-500">
                        <AlertTriangle className="h-8 w-8 mb-2 text-gray-400" />
                        <p>No HSN codes found</p>
                        <p className="text-xs">Try different keywords or HSN code</p>
                      </div>
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {hsnSuggestions.map((hsn) => (
                      <CommandItem
                        key={hsn.id}
                        value={hsn.hsn_code}
                        onSelect={() => handleHSNSelect(hsn)}
                        className="flex items-start space-x-3 p-3 cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {hsn.hsn_code}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${getCategoryColor(hsn.category)}`}>
                              {hsn.category.charAt(0).toUpperCase() + hsn.category.slice(1).replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {hsn.description}
                          </p>
                          {hsn.minimum_valuation_usd && (
                            <p className="text-xs text-gray-500 mt-1">
                              Min. valuation: ${hsn.minimum_valuation_usd} USD
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* HSN Preview Card */}
      {selectedHSN && showPreview && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-4">
            <div className="flex items-center text-sm font-medium text-blue-800 mb-3">
              <Lightbulb className="w-4 h-4 mr-2 text-blue-600" />
              HSN Classification Details
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedHSN.description}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    HSN: {selectedHSN.hsn_code}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${getCategoryColor(selectedHSN.category)}`}>
                    {selectedHSN.category.charAt(0).toUpperCase() + selectedHSN.category.slice(1).replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {selectedHSN.minimum_valuation_usd && (
                <div className="flex items-center space-x-2 text-sm">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">
                    Minimum valuation: ${selectedHSN.minimum_valuation_usd} USD
                  </span>
                  {originCountry !== 'US' && (
                    <span className="text-blue-600 font-medium">
                      (Currency conversion applies)
                    </span>
                  )}
                </div>
              )}

              {selectedHSN.keywords && selectedHSN.keywords.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Keywords:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedHSN.keywords.slice(0, 6).map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HSNAutoComplete;