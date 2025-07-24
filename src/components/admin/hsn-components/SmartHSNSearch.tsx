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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Search,
  Grid3X3,
  Lightbulb,
  ChevronRight,
  Loader2,
  Tag,
  Star,
  Package,
  Info,
  Scale,
  CheckCircle,
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
  className?: string;
  placeholder?: string;
  size?: 'sm' | 'default' | 'lg';
}

export const SmartHSNSearch: React.FC<SmartHSNSearchProps> = ({
  currentHSNCode,
  productName,
  onHSNSelect,
  className = '',
  placeholder = 'Search by product name, category, or HSN code...',
  size = 'default',
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
  const [activeTab, setActiveTab] = useState<'search' | 'categories' | 'suggestions'>('search');

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

      if (result.suggestions.length > 0 && activeTab !== 'search') {
        setActiveTab('suggestions');
      }
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
      setActiveTab('search');
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

    console.log('🎯 [HSN] Calling onHSNSelect with:', hsn);
    onHSNSelect(hsn);
    setIsOpen(false);
    setSearchQuery('');

    toast({
      title: 'HSN Code Selected',
      description: `${hsn.hsn_code} - ${hsn.display_name}`,
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
      {/* Current HSN Display */}
      {currentHSNData && (
        <div className="mb-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{currentHSNData.icon}</span>
              <div>
                <div className="font-medium text-green-800">
                  {currentHSNData.hsn_code} - {currentHSNData.display_name}
                </div>
                <div className="text-sm text-green-600">
                  Category: {currentHSNData.category} • Customs:{' '}
                  {currentHSNData.tax_data.typical_rates.customs.common}%
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(true)}
              className="text-green-700 border-green-300 hover:bg-green-100"
            >
              Change
            </Button>
          </div>
        </div>
      )}

      {/* Search Trigger */}
      {!currentHSNData && (
        <Button
          type="button"
          variant="outline"
          className={`w-full justify-start text-left font-normal ${getSizeClasses()}`}
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
        >
          <Search className="mr-2 h-4 w-4" />
          {currentHSNCode ? `HSN: ${currentHSNCode}` : placeholder}
        </Button>
      )}

      {/* Search Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-4xl max-h-[80vh] p-0"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            // Prevent Enter key from submitting parent form
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onClick={(e) => {
            // Prevent clicks inside dialog from bubbling to form
            e.stopPropagation();
          }}
        >
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center">
              <Search className="mr-2 h-5 w-5" />
              HSN Code Search
            </DialogTitle>
          </DialogHeader>

          <div className="px-6">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="search" className="flex items-center">
                  <Search className="mr-1 h-4 w-4" />
                  Search
                </TabsTrigger>
                <TabsTrigger value="categories" className="flex items-center">
                  <Grid3X3 className="mr-1 h-4 w-4" />
                  Categories
                </TabsTrigger>
                <TabsTrigger value="suggestions" className="flex items-center relative">
                  <Lightbulb className="mr-1 h-4 w-4" />
                  Suggestions
                  {autoSuggestions.length > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1 py-0 h-4 text-xs">
                      {autoSuggestions.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Search Tab */}
              <TabsContent value="search" className="mt-4">
                <div className="space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      ref={inputRef}
                      placeholder={placeholder}
                      value={searchQuery}
                      onChange={(e) => handleSearchInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      className="pl-10"
                    />
                    {isLoading && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                    )}
                  </div>

                  {/* Quick Category Buttons */}
                  {!searchQuery && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700 flex items-center">
                        <Grid3X3 className="mr-2 h-4 w-4" />
                        Quick Categories
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {categoryGroups.slice(0, 6).map((group) => (
                          <Button
                            type="button"
                            key={group.category}
                            variant="outline"
                            size="sm"
                            className="flex items-center justify-start p-3 h-auto hover:bg-gray-50 transition-colors"
                            onClick={() => handleCategorySelect(group.category)}
                          >
                            <span className="text-lg mr-2">{group.icon}</span>
                            <div className="text-left">
                              <div className="font-medium text-sm">{group.display_name}</div>
                              <div className="text-xs text-gray-500">{group.count} codes</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                      {categoryGroups.length > 6 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full text-blue-600 hover:text-blue-700"
                          onClick={() => setActiveTab('categories')}
                        >
                          View all {categoryGroups.length} categories →
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Selected Category Filter */}
                  {selectedCategory && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="flex items-center">
                        <Tag className="mr-1 h-3 w-3" />
                        {selectedCategory}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-4 w-4 p-0"
                          onClick={() => {
                            setSelectedCategory('');
                            handleSearch(searchQuery);
                          }}
                        >
                          ×
                        </Button>
                      </Badge>
                    </div>
                  )}

                  {/* Search Results */}
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {searchResults.map((hsn) => (
                        <HSNResultCard
                          key={hsn.hsn_code}
                          hsn={hsn}
                          onSelect={(hsn, event) => handleHSNSelect(hsn, event)}
                          showMatchReason={!!searchQuery}
                        />
                      ))}

                      {searchResults.length === 0 && !isLoading && (
                        <div className="text-center py-8 text-gray-500">
                          <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                          <p>No HSN codes found</p>
                          <p className="text-sm">Try different keywords or browse categories</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              {/* Categories Tab */}
              <TabsContent value="categories" className="mt-4">
                <ScrollArea className="h-80">
                  <div className="space-y-3">
                    {categoryGroups.map((group) => (
                      <Card
                        key={group.category}
                        className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-400 border-l-4"
                        style={{ borderLeftColor: group.color }}
                      >
                        <CardContent className="p-4">
                          <div
                            className="flex items-center justify-between"
                            onClick={() => handleCategorySelect(group.category)}
                          >
                            <div className="flex items-center space-x-4">
                              {/* Enhanced Icon with Background */}
                              <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-xl shadow-sm"
                                style={{ backgroundColor: group.color }}
                              >
                                {group.icon}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 text-lg">
                                  {group.display_name}
                                </div>
                                <div className="text-sm text-gray-600 flex items-center">
                                  <Package className="h-3 w-3 mr-1" />
                                  {group.count} HSN code{group.count > 1 ? 's' : ''} available
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="h-6 w-6 text-gray-400 hover:text-blue-500 transition-colors" />
                          </div>

                          {/* Subcategories */}
                          {group.subcategories.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {group.subcategories.slice(0, 4).map((subcat) => (
                                <button
                                  type="button"
                                  key={subcat.name}
                                  className="cursor-pointer hover:bg-gray-200 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCategorySelect(group.category, subcat.name);
                                  }}
                                >
                                  {subcat.name} ({subcat.count})
                                </button>
                              ))}
                              {group.subcategories.length > 4 && (
                                <Badge variant="outline">
                                  +{group.subcategories.length - 4} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Suggestions Tab */}
              <TabsContent value="suggestions" className="mt-4">
                <div className="space-y-4">
                  {productName && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="flex items-center space-x-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          AI suggestions for: "{productName}"
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-blue-600">
                        Using contextual learning from existing quotes and brand recognition
                      </div>
                    </div>
                  )}

                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {autoSuggestions.map((hsn) => (
                        <HSNResultCard
                          key={hsn.hsn_code}
                          hsn={hsn}
                          onSelect={(hsn, event) => handleHSNSelect(hsn, event)}
                          showConfidence={true}
                          showMatchReason={true}
                        />
                      ))}

                      {autoSuggestions.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Lightbulb className="mx-auto h-12 w-12 mb-4 opacity-50" />
                          <p>No suggestions available</p>
                          <p className="text-sm">
                            {productName
                              ? 'Try using the search or category tabs'
                              : 'Enter a product name to get AI suggestions'}
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// HSN Result Card Component
interface HSNResultCardProps {
  hsn: HSNSearchResult;
  onSelect: (hsn: HSNSearchResult, event?: React.MouseEvent) => void;
  showConfidence?: boolean;
  showMatchReason?: boolean;
}

const HSNResultCard: React.FC<HSNResultCardProps> = ({
  hsn,
  onSelect,
  showConfidence = false,
  showMatchReason = false,
}) => {
  const handleCardClick = (e: React.MouseEvent) => {
    console.log('🎯 [HSN] Card clicked:', { hsnCode: hsn.hsn_code, hsnName: hsn.display_name });
    e.preventDefault();
    e.stopPropagation();

    // Call onSelect with the HSN data
    console.log('🎯 [HSN] Calling onSelect from card');
    onSelect(hsn, e);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-400 border-l-4 hover:bg-blue-50/30"
      style={{ borderLeftColor: hsn.color }}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          handleCardClick(e as any);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {/* Enhanced Icon with Background */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-lg shadow-sm"
              style={{ backgroundColor: hsn.color }}
            >
              {hsn.icon}
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-mono font-bold text-blue-700 text-lg">{hsn.hsn_code}</span>
                {showConfidence && (
                  <Badge
                    variant={hsn.confidence >= 0.8 ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {Math.round(hsn.confidence * 100)}% match
                  </Badge>
                )}
                {hsn.search_priority <= 2 && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                  >
                    <Star className="h-3 w-3 mr-1" />
                    Popular
                  </Badge>
                )}
              </div>

              <div className="font-semibold text-gray-900 mb-1 text-base">{hsn.display_name}</div>
              <div className="text-sm text-gray-600 mb-3 line-clamp-2">{hsn.description}</div>

              {/* Enhanced Info Section */}
              <div className="flex items-center flex-wrap gap-3 text-xs">
                <div className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded-md">
                  <Scale className="h-3 w-3 text-gray-500" />
                  <span className="font-medium">
                    Customs: {hsn.tax_data.typical_rates.customs.common}%
                  </span>
                </div>

                <div className="flex items-center space-x-1 bg-blue-100 px-2 py-1 rounded-md">
                  <Package className="h-3 w-3 text-blue-500" />
                  <span className="font-medium text-blue-700">{hsn.category}</span>
                </div>

                {showMatchReason && (
                  <Badge
                    variant="outline"
                    className="text-xs py-1 bg-green-50 text-green-700 border-green-200"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {hsn.match_reason}
                  </Badge>
                )}
              </div>

              {/* Common Brands Section */}
              {hsn.common_brands && hsn.common_brands.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  <span className="font-medium">Popular brands: </span>
                  {hsn.common_brands.slice(0, 3).join(', ')}
                  {hsn.common_brands.length > 3 && ` +${hsn.common_brands.length - 3} more`}
                </div>
              )}
            </div>
          </div>

          {/* Action Arrow */}
          <div className="flex flex-center">
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartHSNSearch;
