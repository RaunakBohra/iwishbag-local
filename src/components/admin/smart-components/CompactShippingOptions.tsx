// ============================================================================
// COMPACT SHIPPING OPTIONS - World-Class E-commerce Admin Layout
// Based on Shopify Polaris & Amazon Seller Central design patterns 2025
// Features: Ultra-compact cards, smart defaults, progressive disclosure
// ============================================================================

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Truck,
  Clock,
  DollarSign,
  Zap,
  CheckCircle,
  AlertTriangle,
  Star,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Loader2,
  MoreHorizontal,
} from 'lucide-react';
import type { UnifiedQuote, ShippingOption, ShippingRecommendation } from '@/types/unified-quote';
import { ShippingSelectionModal } from '@/components/admin/modals/ShippingSelectionModal';
import { useAdminQuoteCurrency } from '@/hooks/useAdminQuoteCurrency';

interface CompactShippingOptionsProps {
  quote: UnifiedQuote;
  shippingOptions: ShippingOption[];
  recommendations: ShippingRecommendation[];
  onSelectOption: (optionId: string) => void;
  showAllOptions?: boolean;
  onToggleShowAll?: (show: boolean) => void;
  compact?: boolean;
  editMode?: boolean; // NEW: Enable edit mode with explicit save controls
  onSaveShippingOption?: (optionId: string) => Promise<void>; // NEW: Explicit save function
  isSaving?: boolean; // NEW: Loading state for save operations
}

export const CompactShippingOptions: React.FC<CompactShippingOptionsProps> = ({
  quote,
  shippingOptions,
  recommendations,
  onSelectOption,
  showAllOptions = false,
  onToggleShowAll,
  compact = true,
  editMode = false,
  onSaveShippingOption,
  isSaving = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null); // NEW: Track pending selection
  const [showSaveControls, setShowSaveControls] = useState(false); // NEW: Show save/cancel buttons
  const [showModal, setShowModal] = useState(false); // NEW: Control modal visibility

  // Get standardized currency display
  const currencyDisplay = useAdminQuoteCurrency(quote);

  const selectedOptionId = quote.operational_data?.shipping?.selected_option;
  const selectedOption = shippingOptions.find((opt) => opt.id === selectedOptionId);

  // Debug logging for component state
  console.log('[DEBUG] CompactShippingOptions render:', {
    selectedOptionId,
    selectedOption: selectedOption
      ? { id: selectedOption.id, carrier: selectedOption.carrier, cost: selectedOption.cost_usd }
      : null,
    shippingOptionsCount: shippingOptions.length,
    quoteId: quote.id,
    operationalData: quote.operational_data,
  });

  // Get top recommendation
  const topRecommendation = recommendations[0];
  const recommendedOption = topRecommendation
    ? shippingOptions.find((opt) => opt.id === topRecommendation.option_id)
    : null;

  // Display options (smart filtering)
  const displayOptions = isExpanded ? shippingOptions : shippingOptions.slice(0, 2); // Show only top 2 by default

  // Helper function to calculate total weight
  const getTotalWeight = () => {
    return quote.items?.reduce((sum, item) => sum + item.weight_kg * item.quantity, 0) || 0;
  };

  // NEW: Handle option selection in edit mode
  const handleOptionSelect = (optionId: string) => {
    if (editMode && onSaveShippingOption) {
      // In edit mode: set pending selection and show save controls
      setPendingOptionId(optionId);
      setShowSaveControls(true);
    } else {
      // In view mode or legacy mode: immediate selection
      onSelectOption(optionId);
    }
  };

  // NEW: Save the pending selection
  const handleSaveSelection = async () => {
    if (pendingOptionId && onSaveShippingOption) {
      try {
        await onSaveShippingOption(pendingOptionId);
        setPendingOptionId(null);
        setShowSaveControls(false);
      } catch (error) {
        console.error('Failed to save shipping option:', error);
        // Error handling - could show toast notification
      }
    }
  };

  // NEW: Handle modal selection and save
  const handleModalSelection = async (optionId: string) => {
    if (onSaveShippingOption) {
      await onSaveShippingOption(optionId);
    } else {
      onSelectOption(optionId);
    }
    setShowModal(false);
  };

  // NEW: Cancel the pending selection
  const handleCancelSelection = () => {
    setPendingOptionId(null);
    setShowSaveControls(false);
  };

  // NEW: Get the display option ID (pending or selected)
  const getDisplayOptionId = () => {
    return pendingOptionId || selectedOptionId;
  };

  // NEW: Check if option is the current selection (selected or pending)
  const isCurrentOption = (optionId: string) => {
    return getDisplayOptionId() === optionId;
  };

  // Compact header with selected option info
  const CompactHeader = () => (
    <div className="p-4">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Truck className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900 text-sm">
            Shipping ({shippingOptions.length})
          </span>
          {selectedOption && (
            <Badge variant="outline" className="text-xs h-5 px-2">
              {selectedOption.carrier}
            </Badge>
          )}
          {/* NEW: Show pending indicator in edit mode */}
          {editMode && pendingOptionId && (
            <Badge variant="secondary" className="text-xs h-5 px-2 bg-cyan-100 text-cyan-700">
              Pending
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {/* NEW: Save/Cancel controls in edit mode with pending changes */}
          {editMode && showSaveControls ? (
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelSelection}
                disabled={isSaving}
                className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
              >
                <X className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveSelection}
                disabled={isSaving}
                className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
              </Button>
            </div>
          ) : (
            <>
              <span className="text-sm font-medium text-gray-900">
                {selectedOption ? currencyDisplay.formatDualAmount(selectedOption.cost_usd).short : currencyDisplay.formatSingleAmount(0, 'origin')}
              </span>
              {/* Show More Options button in edit mode, or toggle in view mode */}
              {editMode ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModal(true)}
                  className="h-6 px-2 text-xs"
                >
                  <MoreHorizontal className="w-3 h-3 mr-1" />
                  More
                </Button>
              ) : (
                compact && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-6 w-6 p-0"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </Button>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* Selected Option Summary */}
      {selectedOption && (
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center justify-between">
            <span>Selected: {selectedOption.name}</span>
            <div className="flex items-center space-x-2">
              <Clock className="w-3 h-3" />
              <span>{selectedOption.days} days</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Recommendation (if not selected) */}
      {recommendedOption && selectedOptionId !== recommendedOption.id && (
        <div className="mt-2 flex items-center justify-between bg-green-50 p-2 rounded text-xs">
          <div className="flex items-center text-green-700">
            <Star className="w-3 h-3 mr-1" />
            <span>
              Save ${topRecommendation.savings_usd.toFixed(2)} with {recommendedOption.carrier}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOptionSelect(recommendedOption.id)}
            className="h-6 px-2 text-xs text-green-700 border-green-300"
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );

  // Expandable options list
  const ExpandedOptions = () => (
    <div className="border-t border-gray-100 p-4 pt-3">
      {/* Recommendations Section */}
      {recommendations.length > 0 && showRecommendations && (
        <div className="mb-4 bg-green-50 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center text-green-800 text-xs font-medium">
              <Star className="w-3 h-3 mr-1" />
              Smart Recommendations
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRecommendations(false)}
              className="h-5 w-5 p-0 text-green-600"
            >
              ×
            </Button>
          </div>
          <div className="space-y-2">
            {recommendations.slice(0, 2).map((rec, index) => {
              const option = shippingOptions.find((opt) => opt.id === rec.option_id);
              if (!option) return null;

              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs">
                    {rec.reason === 'cost_savings' && (
                      <TrendingDown className="w-3 h-3 text-green-600" />
                    )}
                    {rec.reason === 'fast_delivery' && <Zap className="w-3 h-3 text-blue-600" />}
                    <span className="text-green-700">
                      {option.carrier}: {currencyDisplay.formatDualAmount(option.cost_usd).short}
                    </span>
                    <Badge variant="outline" className="text-xs h-4 px-1">
                      {rec.reason === 'cost_savings' && `Save $${rec.savings_usd.toFixed(2)}`}
                      {rec.reason === 'fast_delivery' && 'Fastest'}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOptionSelect(rec.option_id)}
                    className="h-6 px-2 text-xs text-green-700 border-green-300"
                  >
                    Select
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Options List */}
      <div className="space-y-2">
        {displayOptions.map((option) => {
          const isSelected = isCurrentOption(option.id);
          const recommendation = recommendations.find((rec) => rec.option_id === option.id);

          return (
            <div
              key={option.id}
              className={`cursor-pointer transition-all p-3 rounded-lg border ${
                isSelected
                  ? pendingOptionId === option.id
                    ? 'border-cyan-300 bg-cyan-50'
                    : 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => {
                console.log('🖱️ [DEBUG] CompactShippingOptions - Option clicked:', {
                  optionId: option.id,
                  carrier: option.carrier,
                  name: option.name,
                  cost: option.cost_usd,
                  wasSelected: isSelected,
                  selectedOptionId: quote.operational_data?.shipping?.selected_option,
                });
                handleOptionSelect(option.id);
              }}
            >
              <div className="flex items-center justify-between">
                {/* Option Details */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    {isSelected ? (
                      pendingOptionId === option.id ? (
                        <div className="w-4 h-4 rounded-full border-2 border-cyan-400 bg-cyan-100" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{option.carrier}</span>
                      <Badge variant="outline" className="text-xs h-4 px-1">
                        {option.name}
                      </Badge>

                      {recommendation && (
                        <Badge variant="secondary" className="text-xs h-4 px-1 flex items-center">
                          <Star className="w-2 h-2 mr-1" />
                          Best
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 mt-1 text-xs text-gray-600">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {option.days} days
                      </div>
                      <div className="flex items-center">
                        <span>{(option.confidence * 100).toFixed(0)}% confidence</span>
                      </div>
                      {option.tracking && <span className="text-green-600">Tracking ✓</span>}
                    </div>

                    {/* Restrictions (compact) */}
                    {option.restrictions.length > 0 && (
                      <div className="flex items-center mt-1 text-xs text-orange-600">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        <span className="truncate">{option.restrictions[0]}</span>
                        {option.restrictions.length > 1 && (
                          <span className="ml-1">+{option.restrictions.length - 1}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price with per-kg indication */}
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {currencyDisplay.formatDualAmount(option.cost_usd).short}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getTotalWeight() > 0 && (
                      <>≈ {currencyDisplay.formatSingleAmount(option.cost_usd / getTotalWeight(), 'origin')}/kg</>
                    )}
                  </div>

                  {recommendation && recommendation.savings_usd > 0 && (
                    <div className="text-xs text-green-600">
                      Save ${recommendation.savings_usd.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More Button */}
      {!isExpanded && shippingOptions.length > 2 && (
        <div className="text-center mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="text-xs h-7"
          >
            Show {shippingOptions.length - 2} more options
          </Button>
        </div>
      )}

      {/* Compact Summary Stats */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div>
            <div className="font-semibold text-blue-600">{shippingOptions.length}</div>
            <div className="text-gray-500">Options</div>
          </div>
          <div>
            <div className="font-semibold text-green-600">
              {currencyDisplay.formatDualAmount(Math.min(...shippingOptions.map((o) => o.cost_usd))).short}
            </div>
            <div className="text-gray-500">Cheapest</div>
          </div>
          <div>
            <div className="font-semibold text-cyan-600">
              {Math.min(...shippingOptions.map((o) => parseInt(o.days.split('-')[0])))}
            </div>
            <div className="text-gray-500">Fastest (days)</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Card className="shadow-sm border-gray-200 overflow-hidden">
        <CompactHeader />
        {/* Show expanded options if: compact mode AND expanded, OR non-compact mode (always expanded) */}
        {(compact && isExpanded) || !compact ? <ExpandedOptions /> : null}
      </Card>

      {/* Shipping Selection Modal */}
      <ShippingSelectionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        quote={quote}
        shippingOptions={shippingOptions}
        recommendations={recommendations}
        selectedOptionId={getDisplayOptionId()}
        onSelectOption={handleModalSelection}
        isSaving={isSaving}
      />
    </>
  );
};
