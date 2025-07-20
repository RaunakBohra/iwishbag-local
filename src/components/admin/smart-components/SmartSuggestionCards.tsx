// ============================================================================
// SMART SUGGESTION CARDS - AI-Powered Optimization Recommendations
// Features: Real-time suggestions, one-click apply, impact preview
// ============================================================================

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  TrendingDown, 
  Zap, 
  Scale, 
  DollarSign,
  Clock,
  CheckCircle,
  X
} from 'lucide-react';
import type { SmartSuggestion } from '@/types/unified-quote';

interface SmartSuggestionCardsProps {
  suggestions: SmartSuggestion[];
  onApplySuggestion: (suggestion: SmartSuggestion) => void;
  onDismissSuggestion?: (suggestionId: string) => void;
}

export const SmartSuggestionCards: React.FC<SmartSuggestionCardsProps> = ({
  suggestions,
  onApplySuggestion,
  onDismissSuggestion,
}) => {
  if (suggestions.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'shipping': return <Zap className="w-4 h-4" />;
      case 'weight': return <Scale className="w-4 h-4" />;
      case 'customs': return <DollarSign className="w-4 h-4" />;
      case 'price': return <TrendingDown className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'shipping': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'weight': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'customs': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'price': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Lightbulb className="w-5 h-5 text-yellow-500" />
        <h3 className="font-medium text-gray-900">Smart Suggestions</h3>
        <Badge variant="secondary">{suggestions.length}</Badge>
      </div>

      {/* Suggestions Grid */}
      <div className="grid gap-3">
        {suggestions.map((suggestion) => (
          <Card 
            key={suggestion.id} 
            className={`border transition-all hover:shadow-md ${getTypeColor(suggestion.type)}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                {/* Suggestion Content */}
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`p-2 rounded-full ${getTypeColor(suggestion.type)}`}>
                    {getIcon(suggestion.type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge 
                        variant="outline" 
                        className="text-xs capitalize"
                      >
                        {suggestion.type}
                      </Badge>
                      <span className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                        {(suggestion.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-800 mb-2">
                      {suggestion.message}
                    </p>
                    
                    {/* Impact Preview */}
                    {suggestion.potential_impact && (
                      <div className="flex items-center space-x-4 text-xs text-gray-600">
                        {suggestion.potential_impact.cost_change && (
                          <div className="flex items-center">
                            <DollarSign className="w-3 h-3 mr-1" />
                            <span className={
                              suggestion.potential_impact.cost_change > 0 
                                ? 'text-red-600' 
                                : 'text-green-600'
                            }>
                              {suggestion.potential_impact.cost_change > 0 ? '+' : ''}
                              ${Math.abs(suggestion.potential_impact.cost_change).toFixed(2)}
                            </span>
                          </div>
                        )}
                        
                        {suggestion.potential_impact.time_change && (
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{suggestion.potential_impact.time_change}</span>
                          </div>
                        )}
                        
                        {suggestion.potential_impact.accuracy_improvement && (
                          <div className="flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            <span>
                              +{(suggestion.potential_impact.accuracy_improvement * 100).toFixed(0)}% accuracy
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 ml-4">
                  {suggestion.action && (
                    <Button
                      size="sm"
                      onClick={() => onApplySuggestion(suggestion)}
                      className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                    >
                      Apply
                    </Button>
                  )}
                  
                  {onDismissSuggestion && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDismissSuggestion(suggestion.id)}
                      className="p-1 h-auto text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      {suggestions.length > 1 && (
        <Card className="bg-gray-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">Potential total savings:</span>
                <span className="font-medium text-green-600">
                  ${suggestions
                    .filter(s => s.potential_impact?.cost_change && s.potential_impact.cost_change < 0)
                    .reduce((sum, s) => sum + Math.abs(s.potential_impact!.cost_change!), 0)
                    .toFixed(2)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">Avg. confidence:</span>
                <span className="font-medium">
                  {(suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};