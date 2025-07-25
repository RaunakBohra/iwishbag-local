// ============================================================================
// SMART HSN SEARCH COMPONENT - Intelligent HSN Code Discovery Interface
// Features: Text search, category browsing, visual suggestions
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Search,
  Grid3X3,
  Lightbulb,
  ChevronRight,
  Loader2,
  Tag,
  Star,
  Package,
  Scale,
} from 'lucide-react';
import {
  enhancedHSNSearchService,
  HSNSearchResult,
  HSNCategoryGroup,
} from '@/services/EnhancedHSNSearchService';
import { useToast } from '@/hooks/use-toast';

interface SmartHSNSearchProps {
  currentHSNCode?: string;
  productName?: string;
  onHSNSelect: (hsn: HSNSearchResult) => void;
  onSelect?: (hsn: HSNSearchResult) => void; // For compatibility with existing usage
  className?: string;
  placeholder?: string;
  size?: 'sm' | 'default' | 'lg';
  compact?: boolean;
  trigger?: React.ReactNode;
}

export const SmartHSNSearch: React.FC<SmartHSNSearchProps> = ({
  currentHSNCode,
  productName,
  onHSNSelect,
  onSelect, // For compatibility
  className = '',
  placeholder = 'Search by product name, category, or HSN code...',
  size = 'default',
  compact = false,
  trigger,
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HSNSearchResult[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<HSNCategoryGroup[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSuggestions, setAutoSuggestions] = useState<HSNSearchResult[]>([]);
  const [currentHSNData, setCurrentHSNData] = useState<HSNSearchResult | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Load initial data and initialize learning
  useEffect(() => {
    loadInitialData();
    initializeLearningSystem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeLearningSystem = async () => {
    try {
      const result = await enhancedHSNSearchService.initializeContextualLearning();
      if (result.success) {
        console.log(
          `HSN Learning initialized: ${result.learned} new mappings, ${result.updated} updated`,
        );
      }
    } catch (error) {
      console.error('Failed to initialize HSN learning:', error);
    }
  };

  // Auto-detect HSN from product name
  useEffect(() => {
    if (productName && !currentHSNCode) {
      detectHSNFromProduct();
    }
  }, [productName, currentHSNCode]);

  // Load current HSN data
  useEffect(() => {
    if (currentHSNCode) {
      loadCurrentHSNData();
    }
  }, [currentHSNCode]);

  const loadInitialData = async () => {
    try {
      const [categories, popular] = await Promise.all([
        enhancedHSNSearchService.getCategoryGroups(),
        enhancedHSNSearchService.searchHSN({ limit: 8 }),
      ]);

      setCategoryGroups(categories);
      if (!currentHSNCode) {
        setSearchResults(popular);
      }
    } catch (error) {
      console.error('Failed to load HSN data:', error);
    }
  };

  const detectHSNFromProduct = async () => {
    if (!productName) return;

    try {
      const result = await enhancedHSNSearchService.getEnhancedProductSuggestions(productName);
      setAutoSuggestions(result.suggestions);

      // Store strategy stats for debugging/analytics
      console.log('HSN Detection Strategies:', result.strategies);
      if (result.learningStats) {
        console.log('Learning Stats:', result.learningStats);
      }

      // Auto-suggestions are now handled inline, no tabs needed
    } catch (error) {
      console.error('HSN detection failed:', error);
    }
  };

  const loadCurrentHSNData = async () => {
    if (!currentHSNCode) return;

    try {
      const results = await enhancedHSNSearchService.searchHSN({
        query: currentHSNCode,
        limit: 1,
      });

      if (results.length > 0) {
        setCurrentHSNData(results[0]);
      }
    } catch (error) {
      console.error('Failed to load current HSN:', error);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      // Show popular HSN codes when empty
      const popular = await enhancedHSNSearchService.searchHSN({ limit: 10 });
      setSearchResults(popular);
      return;
    }

    setIsLoading(true);

    try {
      const results = await enhancedHSNSearchService.searchHSN({
        query: query.trim(),
        limit: 12,
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

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleCategorySelect = async (category: string, subcategory?: string) => {
    setIsLoading(true);
    setSelectedCategory(category);

    try {
      const results = await enhancedHSNSearchService.searchHSN({
        category,
        subcategory,
        limit: 15,
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Category search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHSNSelect = (hsn: HSNSearchResult, event?: React.MouseEvent) => {
    console.log('🎯 [HSN] handleHSNSelect called:', { hsn, hasEvent: !!event });

    // Prevent any form submission or navigation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    console.log('🎯 [HSN] Calling callback with:', hsn);
    
    // Support both onSelect and onHSNSelect for compatibility
    if (onSelect) {
      onSelect(hsn);
    } else {
      onHSNSelect(hsn);
    }
    
    // Close dropdown and clear search  
    setIsOpen(false);
    setSearchQuery('');
    setSelectedCategory('');

    toast({
      title: 'HSN Code Selected',
      description: `${hsn.category} - ${hsn.hsn_code}`,
    });
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 text-sm';
      case 'lg':
        return 'h-12 text-lg';
      default:
        return 'h-10';
    }
  };

  return (
    <div className={className}>
      {/* World-Class HSN Search Dropdown */}
      <Popover onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          setSearchQuery('');
          setSelectedCategory('');
        }
      }}>
        <PopoverTrigger asChild>
          {trigger ? trigger : (
            <button
              type="button"
              className={`
                w-full flex items-center justify-between px-3 py-2.5
                bg-white border border-gray-300 rounded-lg 
                text-left text-gray-900 
                hover:border-gray-400 hover:shadow-sm
                focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:shadow-sm
                transition-all duration-200 ease-in-out
                group
                ${getSizeClasses()}
              `}
            >
              <div className="flex items-center min-w-0 flex-1">
                <Search className="mr-2.5 h-4 w-4 text-gray-400 group-hover:text-gray-500 flex-shrink-0 transition-colors duration-150" />
                {currentHSNData ? (
                  <div className="flex items-center min-w-0 flex-1">
                    <div 
                      className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                      style={{ backgroundColor: currentHSNData.color }}
                    />
                    <span className="font-medium text-gray-900 truncate">
                      {currentHSNData.category}
                    </span>
                    <span className="mx-2 text-gray-400">-</span>
                    <span className="font-mono font-semibold text-blue-600 flex-shrink-0">
                      {currentHSNData.hsn_code}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-500 truncate font-medium">
                    Search HSN codes...
                  </span>
                )}
              </div>
              <div className="flex items-center ml-2 flex-shrink-0">
                <ChevronRight className="h-4 w-4 text-gray-400 rotate-90 group-hover:text-gray-500 transition-colors duration-150" />
              </div>
            </button>
          )}
        </PopoverTrigger>
        
        <PopoverContent 
          className="
            w-96 p-0 border border-gray-200/60 
            shadow-2xl rounded-xl bg-white
            animate-in fade-in-0 zoom-in-95 duration-200
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
          " 
          align="start"
          sideOffset={8}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            // Smooth focus with slight delay for better UX
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
        >
          {/* Command Palette Style Input - Stripe/GitHub Inspired */}
          <div className="p-4 border-b border-gray-100/80">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors duration-150" />
              <Input
                ref={inputRef}
                placeholder="Search HSN codes by category, name, or code..."
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
                className="
                  pl-10 pr-12 h-11 w-full
                  border-0 bg-gray-50/80 rounded-lg
                  text-gray-900 placeholder-gray-500
                  focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                  transition-all duration-200 ease-in-out
                  text-sm font-medium
                "
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                </div>
              )}
            </div>
            
            {/* Search Hints - GitHub style */}
            {!searchQuery && (
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">↑↓</kbd>
                <span>to navigate</span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">↵</kbd>
                <span>to select</span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">esc</kbd>
                <span>to close</span>
              </div>
            )}
          </div>

          {/* Unified Results List */}
          <ScrollArea className="max-h-80">
            <div className="py-2">
              {/* Smart Combined Results */}
              {searchQuery ? (
                <>
                  {/* AI Suggestions First (if any) */}
                  {autoSuggestions.slice(0, 2).map((hsn) => (
                    <ModernHSNItem
                      key={`ai-${hsn.hsn_code}`}
                      hsn={hsn}
                      onSelect={handleHSNSelect}
                      showBadge="AI"
                    />
                  ))}
                  
                  {/* Regular Search Results */}
                  {searchResults.map((hsn) => (
                    <ModernHSNItem
                      key={hsn.hsn_code}
                      hsn={hsn}
                      onSelect={handleHSNSelect}
                    />
                  ))}

                  {/* No Results State - Enhanced */}
                  {searchResults.length === 0 && autoSuggestions.length === 0 && !isLoading && (
                    <div className="px-4 py-8 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-900 mb-1">No HSN codes found</div>
                      <div className="text-xs text-gray-500 mb-4">
                        Try different keywords or browse categories below
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          inputRef.current?.focus();
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Clear search and browse categories
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Popular Categories - Enhanced Design */
                <>
                  {/* Section Header */}
                  <div className="px-4 py-3 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <Grid3X3 className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Browse Categories</span>
                    </div>
                  </div>
                  
                  {/* Category List */}
                  <div className="py-1">
                    {categoryGroups.slice(0, 6).map((group, index) => (
                      <button
                        key={group.category}
                        type="button"
                        onClick={() => handleCategorySelect(group.category)}
                        className="
                          w-full flex items-center px-4 py-3 text-left 
                          hover:bg-gray-50 active:bg-gray-100
                          transition-all duration-150 ease-in-out
                          group cursor-pointer
                          border-l-2 border-transparent hover:border-l-blue-500
                        "
                        style={{
                          animationDelay: `${index * 50}ms`
                        }}
                      >
                        <div 
                          className="w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0 ring-2 ring-white shadow-sm"
                          style={{ backgroundColor: group.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {group.display_name}
                            </span>
                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                              {group.count}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {group.count} HSN codes available
                          </div>
                        </div>
                        <ChevronRight className="
                          h-4 w-4 text-gray-300 group-hover:text-gray-500 
                          flex-shrink-0 ml-2
                          transition-all duration-150 ease-in-out
                          group-hover:translate-x-0.5
                        " />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Modern HSN Item - World-class dropdown item following Stripe/GitHub patterns
interface ModernHSNItemProps {
  hsn: HSNSearchResult;
  onSelect: (hsn: HSNSearchResult, event?: React.MouseEvent) => void;
  showBadge?: 'AI' | 'Popular' | null;
}

const ModernHSNItem: React.FC<ModernHSNItemProps> = ({
  hsn,
  onSelect,
  showBadge = null,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(hsn, e);
  };

  const getBadgeConfig = () => {
    if (showBadge === 'AI') {
      return {
        text: 'AI',
        className: 'bg-purple-100 text-purple-700 border-purple-200'
      };
    }
    if (showBadge === 'Popular' || hsn.search_priority <= 2) {
      return {
        text: 'Popular',
        className: 'bg-blue-50 text-blue-700 border-blue-200'
      };
    }
    return null;
  };

  const badgeConfig = getBadgeConfig();

  return (
    <button
      type="button"
      className="
        w-full flex items-center px-3 py-2.5 text-left 
        hover:bg-gray-50 active:bg-gray-100
        transition-colors duration-150 ease-in-out
        group cursor-pointer
        border-l-2 border-transparent hover:border-l-blue-500
      "
      onClick={handleClick}
    >
      {/* Content Section */}
      <div className="flex-1 min-w-0">
        {/* Main Line: Category - HSN Code */}
        <div className="flex items-center gap-2 mb-1">
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: hsn.color }}
          />
          <span className="font-medium text-gray-900 text-sm truncate">
            {hsn.category}
          </span>
          <span className="text-gray-400 text-sm">-</span>
          <span className="font-mono font-semibold text-blue-600 text-sm">
            {hsn.hsn_code}
          </span>
          {badgeConfig && (
            <span className={`
              inline-flex items-center px-1.5 py-0.5 text-xs font-medium 
              rounded-md border ${badgeConfig.className}
            `}>
              {badgeConfig.text}
            </span>
          )}
        </div>
        
        {/* Description Line */}
        <div className="text-xs text-gray-600 truncate mb-0.5">
          {hsn.display_name}
        </div>
        
        {/* Tax Info Line */}
        <div className="text-xs text-gray-500">
          {hsn.tax_data.typical_rates.customs.common}% customs duty
        </div>
      </div>

      {/* Right Arrow - GitHub/Stripe style */}
      <ChevronRight className="
        h-4 w-4 text-gray-300 group-hover:text-gray-500 
        flex-shrink-0 ml-2
        transition-all duration-150 ease-in-out
        group-hover:translate-x-0.5
      " />
    </button>
  );
};

export default SmartHSNSearch;
