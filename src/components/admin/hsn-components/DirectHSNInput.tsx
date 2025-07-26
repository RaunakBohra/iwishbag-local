// ============================================================================
// DIRECT HSN INPUT - Direct Input Field with Search-as-you-type
// Features: Direct typing, real-time search, clean text display
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, X, Lightbulb, Loader2, ChevronDown } from 'lucide-react';
import { enhancedHSNSearchService, HSNSearchResult } from '@/services/EnhancedHSNSearchService';
import { useToast } from '@/hooks/use-toast';

interface DirectHSNInputProps {
  value?: string; // Current HSN code
  displayValue?: string; // Display text (category - code)
  onSelect: (hsn: HSNSearchResult) => void;
  onClear?: () => void;
  productName?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const DirectHSNInput: React.FC<DirectHSNInputProps> = ({
  value = '',
  displayValue = '',
  onSelect,
  onClear,
  productName,
  placeholder = 'Type to search HSN codes...',
  className = '',
  disabled = false,
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HSNSearchResult[]>([]);
  const [autoSuggestions, setAutoSuggestions] = useState<HSNSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isEditing, setIsEditing] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const initializeSearch = async () => {
    try {
      // Initialize the learning system
      await enhancedHSNSearchService.initializeContextualLearning();

      // Load popular HSN codes for empty state
      const popular = await enhancedHSNSearchService.searchHSN({ limit: 8 });
      setSearchResults(popular);
    } catch (error) {
      console.error('Failed to initialize HSN search:', error);
    }
  };

  const detectHSNFromProduct = useCallback(async () => {
    if (!productName) return;

    try {
      const result = await enhancedHSNSearchService.getEnhancedProductSuggestions(productName);
      setAutoSuggestions(result.suggestions);
    } catch (error) {
      console.error('HSN detection failed:', error);
    }
  }, [productName]);

  // Initialize search and auto-suggestions when component mounts
  useEffect(() => {
    initializeSearch();
  }, []);

  // Auto-detect HSN from product name
  useEffect(() => {
    if (productName && !value) {
      detectHSNFromProduct();
    }
  }, [productName, value, detectHSNFromProduct]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSearch = async (query: string) => {
    setSelectedIndex(-1); // Reset selection

    if (!query.trim()) {
      // Show popular HSN codes when empty
      const popular = await enhancedHSNSearchService.searchHSN({ limit: 8 });
      setSearchResults(popular);
      return;
    }

    setIsLoading(true);

    try {
      const results = await enhancedHSNSearchService.searchHSN({
        query: query.trim(),
        limit: 10,
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: 'Search failed',
        description: 'Failed to search HSN codes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (newValue: string) => {
    setSearchQuery(newValue);
    setSelectedIndex(-1);
    setIsEditing(true); // User is actively typing

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(newValue);
    }, 300);
  };

  const handleHSNSelect = (hsn: HSNSearchResult) => {
    console.log('🎯 [DirectHSN] handleHSNSelect called:', hsn);

    // Prevent any form submission
    const event = window.event as KeyboardEvent | MouseEvent | null;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    onSelect(hsn);
    setSearchQuery('');
    setSelectedIndex(-1);
    setIsEditing(false); // Stop editing mode

    // Close dropdown immediately
    setIsOpen(false);

    // Remove focus from input to prevent reopening
    inputRef.current?.blur();

    toast({
      title: 'HSN Code Selected',
      description: `${hsn.category} - ${hsn.hsn_code}`,
    });
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
    setSearchQuery('');
    setSelectedIndex(-1);
    setIsEditing(false); // Stop editing mode
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const allItems = [...autoSuggestions.slice(0, 2), ...searchResults];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allItems.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        if (selectedIndex >= 0 && allItems[selectedIndex]) {
          handleHSNSelect(allItems[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Display current selection or search input
  const getDisplayText = () => {
    // Always prioritize what user is typing when actively editing
    if (isEditing && searchQuery.trim()) {
      return searchQuery;
    }
    // Show display value when not editing and we have a selected value
    if (!isEditing && value && displayValue) {
      return displayValue; // Show "Category - HSN123"
    }
    // Default to search query (could be empty)
    return searchQuery;
  };

  const showClearButton = value || searchQuery;

  return (
    <div className={`hsn-input-wrapper ${className}`}>
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
        }}
      >
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              value={getDisplayText()}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={() => {
                if (!isOpen) {
                  setIsOpen(true);
                  setIsEditing(true);
                  if (!searchQuery && !value) {
                    handleSearch('');
                  }
                }
              }}
              placeholder={placeholder}
              disabled={disabled}
              className={`
                pr-20 text-sm
                ${value ? 'font-medium text-gray-900' : 'text-gray-600'}
              `}
            />

            {/* Right side icons */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
              {showClearButton && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleClear();
                  }}
                >
                  <X className="h-3 w-3 text-gray-400" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsOpen(!isOpen);
                  if (!isOpen) {
                    inputRef.current?.focus();
                  }
                }}
              >
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>
            </div>
          </div>
        </PopoverTrigger>

        <PopoverContent
          ref={popoverRef}
          className="w-[--radix-popover-trigger-width] p-0 border border-gray-200 shadow-xl rounded-xl bg-white"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {/* Results List */}
          <Command className="rounded-xl">
            <CommandList className="max-h-64 overflow-y-auto">
              {/* AI Suggestions Section */}
              {autoSuggestions.length > 0 && (
                <CommandGroup heading="AI Suggestions">
                  {autoSuggestions.slice(0, 2).map((hsn, index) => (
                    <CommandItem
                      key={`ai-${hsn.hsn_code}`}
                      onSelect={() => handleHSNSelect(hsn)}
                      className={`
                        px-3 py-2 cursor-pointer
                        ${selectedIndex === index ? 'bg-blue-50 text-blue-900' : ''}
                      `}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Lightbulb className="h-4 w-4 text-purple-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{hsn.category}</span>
                            <span className="text-gray-400">-</span>
                            <span className="font-mono font-semibold text-blue-600 text-sm">
                              {hsn.hsn_code}
                            </span>
                            <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded">
                              AI
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{hsn.display_name}</div>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Search Results Section */}
              <CommandGroup heading={searchQuery ? 'Search Results' : 'Popular HSN Codes'}>
                {searchResults.map((hsn, index) => {
                  const actualIndex = autoSuggestions.slice(0, 2).length + index;
                  return (
                    <CommandItem
                      key={hsn.hsn_code}
                      onSelect={() => handleHSNSelect(hsn)}
                      className={`
                        px-3 py-2 cursor-pointer
                        ${selectedIndex === actualIndex ? 'bg-blue-50 text-blue-900' : ''}
                      `}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: hsn.color }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{hsn.category}</span>
                            <span className="text-gray-400">-</span>
                            <span className="font-mono font-semibold text-blue-600 text-sm">
                              {hsn.hsn_code}
                            </span>
                            {hsn.search_priority <= 2 && (
                              <span className="bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5 rounded border border-blue-200">
                                Popular
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{hsn.display_name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {hsn.tax_data.typical_rates.customs.common}% customs duty
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              {/* Empty State */}
              {searchResults.length === 0 &&
                autoSuggestions.length === 0 &&
                !isLoading &&
                searchQuery && (
                  <CommandEmpty>
                    <div className="py-6 text-center">
                      <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        No HSN codes found
                      </div>
                      <div className="text-xs text-gray-500">
                        Try different keywords or check spelling
                      </div>
                    </div>
                  </CommandEmpty>
                )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DirectHSNInput;
