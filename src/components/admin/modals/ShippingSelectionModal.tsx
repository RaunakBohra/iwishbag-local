// ============================================================================
// SHIPPING SELECTION MODAL - Advanced Shipping Configuration
// Based on Shopify Polaris & Amazon Seller Central modal patterns 2025
// Features: Detailed shipping option comparison, bulk selections, preferences
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Truck,
  Clock,
  DollarSign,
  Star,
  AlertTriangle,
  CheckCircle,
  Info,
  Search,
  Filter,
  ArrowUpDown,
  Zap,
  TrendingDown,
  Save,
  X,
  Loader2,
} from 'lucide-react';
import type { UnifiedQuote, ShippingOption, ShippingRecommendation } from '@/types/unified-quote';

interface ShippingSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: UnifiedQuote;
  shippingOptions: ShippingOption[];
  recommendations: ShippingRecommendation[];
  selectedOptionId?: string;
  onSelectOption: (optionId: string) => Promise<void>;
  isSaving?: boolean;
}

type SortOption = 'cost' | 'speed' | 'recommendation' | 'carrier';
type FilterOption = 'all' | 'recommended' | 'express' | 'economy';

export const ShippingSelectionModal: React.FC<ShippingSelectionModalProps> = ({
  isOpen,
  onClose,
  quote,
  shippingOptions,
  recommendations,
  selectedOptionId,
  onSelectOption,
  isSaving = false,
}) => {
  const [tempSelectedOption, setTempSelectedOption] = useState<string>(selectedOptionId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recommendation');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Reset temp selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedOption(selectedOptionId || '');
      setSearchQuery('');
      setSortBy('recommendation');
      setFilterBy('all');
    }
  }, [isOpen, selectedOptionId]);

  // Filter and sort options
  const filteredAndSortedOptions = React.useMemo(() => {
    let filtered = shippingOptions;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (option) =>
          option.carrier.toLowerCase().includes(searchQuery.toLowerCase()) ||
          option.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply category filter
    switch (filterBy) {
      case 'recommended':
        filtered = filtered.filter((option) =>
          recommendations.some((rec) => rec.option_id === option.id),
        );
        break;
      case 'express':
        filtered = filtered.filter((option) => parseInt(option.days.split('-')[0]) <= 5);
        break;
      case 'economy':
        filtered = filtered.filter((option) => parseInt(option.days.split('-')[0]) > 7);
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'cost':
        return filtered.sort((a, b) => a.cost_usd - b.cost_usd);
      case 'speed':
        return filtered.sort(
          (a, b) => parseInt(a.days.split('-')[0]) - parseInt(b.days.split('-')[0]),
        );
      case 'recommendation':
        return filtered.sort((a, b) => {
          const aRec = recommendations.find((rec) => rec.option_id === a.id);
          const bRec = recommendations.find((rec) => rec.option_id === b.id);
          if (aRec && !bRec) return -1;
          if (!aRec && bRec) return 1;
          if (aRec && bRec) return bRec.savings_usd - aRec.savings_usd;
          return a.cost_usd - b.cost_usd;
        });
      case 'carrier':
        return filtered.sort((a, b) => a.carrier.localeCompare(b.carrier));
      default:
        return filtered;
    }
  }, [shippingOptions, searchQuery, sortBy, filterBy, recommendations]);

  const handleSave = async () => {
    if (tempSelectedOption && tempSelectedOption !== selectedOptionId) {
      await onSelectOption(tempSelectedOption);
    }
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedOption(selectedOptionId || '');
    onClose();
  };

  // Get recommendation for an option
  const getRecommendation = (optionId: string) => {
    return recommendations.find((rec) => rec.option_id === optionId);
  };

  // Calculate total weight
  const getTotalWeight = () => {
    return quote.items?.reduce((sum, item) => sum + item.weight_kg * item.quantity, 0) || 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-gray-600" />
            <span>Select Shipping Option</span>
            <Badge variant="outline" className="text-xs">
              {filteredAndSortedOptions.length} of {shippingOptions.length} options
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Choose the best shipping option for this quote. Changes will be saved when you confirm
            your selection.
          </DialogDescription>
        </DialogHeader>

        {/* Controls Bar */}
        <div className="flex items-center space-x-4 py-3 border-b border-gray-100">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search carriers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-8 text-sm"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All Options</option>
              <option value="recommended">Recommended</option>
              <option value="express">Express (≤5 days)</option>
              <option value="economy">Economy (&gt;7 days)</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="recommendation">Best Match</option>
              <option value="cost">Lowest Cost</option>
              <option value="speed">Fastest</option>
              <option value="carrier">Carrier Name</option>
            </select>
          </div>
        </div>

        {/* Options List */}
        <div className="flex-1 overflow-y-auto py-4">
          <RadioGroup value={tempSelectedOption} onValueChange={setTempSelectedOption}>
            <div className="space-y-3">
              {filteredAndSortedOptions.map((option) => {
                const recommendation = getRecommendation(option.id);
                const isSelected = tempSelectedOption === option.id;

                return (
                  <div
                    key={option.id}
                    className={`relative p-4 border rounded-lg transition-all hover:shadow-sm ${
                      isSelected
                        ? 'border-blue-300 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Radio Button */}
                      <div className="pt-1">
                        <RadioGroupItem value={option.id} id={option.id} />
                      </div>

                      {/* Option Content */}
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        <div className="space-y-3">
                          {/* Header Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold text-gray-900">
                                    {option.carrier}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {option.name}
                                  </Badge>
                                  {recommendation && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs bg-green-100 text-green-700"
                                    >
                                      <Star className="w-3 h-3 mr-1" />
                                      Recommended
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{option.days} days</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <span>{(option.confidence * 100).toFixed(0)}% confidence</span>
                                  </div>
                                  {option.tracking && (
                                    <span className="text-green-600 text-xs">✓ Tracking</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Price */}
                            <div className="text-right">
                              <div className="flex items-center text-lg font-bold text-gray-900">
                                <DollarSign className="w-4 h-4" />
                                {option.cost_usd.toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {getTotalWeight() > 0 && (
                                  <>≈ ${(option.cost_usd / getTotalWeight()).toFixed(2)}/kg</>
                                )}
                              </div>
                              {recommendation && recommendation.savings_usd > 0 && (
                                <div className="text-sm text-green-600 font-medium">
                                  <TrendingDown className="w-3 h-3 inline mr-1" />
                                  Save ${recommendation.savings_usd.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Details Row */}
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-gray-600 text-xs mb-1">Delivery Speed</div>
                              <div className="flex items-center space-x-1">
                                {parseInt(option.days.split('-')[0]) <= 3 ? (
                                  <Zap className="w-3 h-3 text-blue-600" />
                                ) : (
                                  <Clock className="w-3 h-3 text-gray-400" />
                                )}
                                <span className="font-medium">{option.days} days</span>
                              </div>
                            </div>

                            <div>
                              <div className="text-gray-600 text-xs mb-1">Reliability</div>
                              <div className="flex items-center space-x-1">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    option.confidence > 0.8
                                      ? 'bg-green-500'
                                      : option.confidence > 0.6
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                  }`}
                                />
                                <span className="font-medium">
                                  {(option.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>

                            <div>
                              <div className="text-gray-600 text-xs mb-1">Features</div>
                              <div className="flex items-center space-x-2">
                                {option.tracking && (
                                  <Badge variant="outline" className="text-xs h-5">
                                    Tracking
                                  </Badge>
                                )}
                                {option.insurance && (
                                  <Badge variant="outline" className="text-xs h-5">
                                    Insured
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Restrictions */}
                          {option.restrictions && option.restrictions.length > 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded p-3">
                              <div className="flex items-start space-x-2">
                                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                <div className="text-sm">
                                  <div className="font-medium text-orange-800 mb-1">
                                    Shipping Restrictions
                                  </div>
                                  <ul className="text-orange-700 space-y-1 text-xs">
                                    {option.restrictions.map((restriction, index) => (
                                      <li key={index}>• {restriction}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Recommendation Details */}
                          {recommendation && (
                            <div className="bg-green-50 border border-green-200 rounded p-3">
                              <div className="flex items-start space-x-2">
                                <Star className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <div className="text-sm">
                                  <div className="font-medium text-green-800 mb-1">
                                    Why This is Recommended
                                  </div>
                                  <div className="text-green-700 text-xs">
                                    {recommendation.reason === 'cost_savings' &&
                                      `Save $${recommendation.savings_usd.toFixed(2)} compared to other options`}
                                    {recommendation.reason === 'fast_delivery' &&
                                      'Fastest available delivery option'}
                                    {recommendation.reason === 'best_value' &&
                                      'Best balance of cost and delivery speed'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Label>
                    </div>
                  </div>
                );
              })}
            </div>
          </RadioGroup>

          {filteredAndSortedOptions.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div className="text-sm">No shipping options match your search criteria.</div>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterBy('all');
                  }}
                  className="text-xs mt-2"
                >
                  Clear filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Info className="w-4 h-4" />
              <span>
                {tempSelectedOption !== selectedOptionId
                  ? 'You have unsaved changes'
                  : 'Current selection will be applied'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!tempSelectedOption || isSaving}
                className="min-w-20"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Selection
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
