// ============================================================================
// SMART SHIPPING OPTIONS - Enhanced Multiple Carrier Selection
// Features: All shipping options, smart recommendations, one-click optimization
// ============================================================================

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Truck, 
  Clock, 
  DollarSign, 
  Zap, 
  CheckCircle, 
  AlertTriangle,
  Star,
  TrendingDown
} from 'lucide-react';
import type { 
  UnifiedQuote, 
  ShippingOption, 
  ShippingRecommendation 
} from '@/types/unified-quote';

interface SmartShippingOptionsProps {
  quote: UnifiedQuote;
  shippingOptions: ShippingOption[];
  recommendations: ShippingRecommendation[];
  onSelectOption: (optionId: string) => void;
  showAllOptions: boolean;
  onToggleShowAll: (show: boolean) => void;
}

export const SmartShippingOptions: React.FC<SmartShippingOptionsProps> = ({
  quote,
  shippingOptions,
  recommendations,
  onSelectOption,
  showAllOptions,
  onToggleShowAll,
}) => {
  const selectedOptionId = quote.operational_data.shipping.selected_option;
  
  // Group options by carrier for better display
  const groupedOptions = shippingOptions.reduce((groups, option) => {
    const carrier = option.carrier;
    if (!groups[carrier]) {
      groups[carrier] = [];
    }
    groups[carrier].push(option);
    return groups;
  }, {} as Record<string, ShippingOption[]>);

  // Get recommendation for specific option
  const getRecommendationForOption = (optionId: string) => {
    return recommendations.find(rec => rec.option_id === optionId);
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Display options (filtered if not showing all)
  const displayOptions = showAllOptions 
    ? shippingOptions 
    : shippingOptions.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Shipping Options</h3>
          <p className="text-sm text-gray-600">
            {shippingOptions.length} options available for {quote.origin_country} → {quote.destination_country}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Show all options</span>
          <Switch
            checked={showAllOptions}
            onCheckedChange={onToggleShowAll}
          />
        </div>
      </div>

      {/* Top Recommendations Bar */}
      {recommendations.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center mb-2">
              <Star className="w-4 h-4 text-green-600 mr-2" />
              <span className="font-medium text-green-800">Smart Recommendations</span>
            </div>
            <div className="space-y-2">
              {recommendations.slice(0, 2).map((rec, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {rec.reason === 'cost_savings' && <TrendingDown className="w-4 h-4 text-green-600" />}
                    {rec.reason === 'fast_delivery' && <Zap className="w-4 h-4 text-blue-600" />}
                    <span className="text-sm text-green-700">
                      {rec.reason === 'cost_savings' && `Save $${rec.savings_usd.toFixed(2)}`}
                      {rec.reason === 'fast_delivery' && 'Fastest delivery'}
                      {rec.reason === 'reliability' && 'Most reliable'}
                      {rec.trade_off && ` • ${rec.trade_off}`}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectOption(rec.option_id)}
                    className="text-green-700 border-green-300 hover:bg-green-100"
                  >
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipping Options Grid */}
      <div className="grid gap-4">
        {displayOptions.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const recommendation = getRecommendationForOption(option.id);
          
          return (
            <Card 
              key={option.id}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50' 
                  : 'hover:border-gray-300'
              }`}
              onClick={() => onSelectOption(option.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {/* Option Details */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      {isSelected ? (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{option.carrier}</span>
                        <Badge variant="outline">{option.name}</Badge>
                        
                        {recommendation && (
                          <Badge variant="secondary" className="flex items-center">
                            <Star className="w-3 h-3 mr-1" />
                            Recommended
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {option.days} days
                        </div>
                        <div className={`flex items-center ${getConfidenceColor(option.confidence)}`}>
                          <span>{(option.confidence * 100).toFixed(0)}% confidence</span>
                        </div>
                        {option.tracking && (
                          <span className="text-green-600">Tracking included</span>
                        )}
                      </div>
                      
                      {/* Restrictions */}
                      {option.restrictions.length > 0 && (
                        <div className="flex items-center mt-2 text-xs text-orange-600">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {option.restrictions.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <div className="flex items-center text-lg font-semibold">
                      <DollarSign className="w-4 h-4" />
                      {option.cost_usd.toFixed(2)}
                    </div>
                    
                    {recommendation && recommendation.savings_usd > 0 && (
                      <div className="text-sm text-green-600">
                        Save ${recommendation.savings_usd.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendation details */}
                {recommendation && isSelected && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="flex items-center text-sm text-blue-700">
                      <Star className="w-3 h-3 mr-1" />
                      <span className="font-medium">Why recommended: </span>
                      <span className="ml-1">{recommendation.trade_off}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Show more options */}
      {!showAllOptions && shippingOptions.length > 3 && (
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => onToggleShowAll(true)}
          >
            Show {shippingOptions.length - 3} more options
          </Button>
        </div>
      )}

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shipping Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {shippingOptions.length}
              </div>
              <div className="text-sm text-gray-600">Options Available</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                ${Math.min(...shippingOptions.map(o => o.cost_usd)).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Cheapest Option</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {Math.min(...shippingOptions.map(o => parseInt(o.days.split('-')[0])))}
              </div>
              <div className="text-sm text-gray-600">Fastest (days)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};