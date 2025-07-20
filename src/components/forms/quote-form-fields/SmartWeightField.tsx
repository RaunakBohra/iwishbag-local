// ============================================================================
// SMART WEIGHT FIELD - ML-Powered Weight Input with Auto-Suggestions
// Features: Real-time ML estimation, confidence indicators, learning system
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Control, useWatch, UseFormSetValue, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Brain, 
  Scale, 
  Zap, 
  CheckCircle, 
  AlertTriangle,
  Lightbulb,
  Target,
  TrendingUp
} from 'lucide-react';
import { smartWeightEstimator } from '@/services/SmartWeightEstimator';
import { cn } from '@/lib/utils';

interface EstimationResult {
  estimated_weight: number;
  confidence: number;
  reasoning: string[];
  suggestions: string[];
}

interface SmartWeightFieldProps {
  control: Control<FieldValues>;
  index: number;
  setValue: UseFormSetValue<FieldValues>;
}

export const SmartWeightField: React.FC<SmartWeightFieldProps> = ({
  control,
  index,
  setValue,
}) => {
  const [estimation, setEstimation] = useState<EstimationResult | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [hasUserInput, setHasUserInput] = useState(false);

  // Watch relevant fields for auto-estimation
  const productName = useWatch({
    control,
    name: `items.${index}.productName`,
  });

  const productUrl = useWatch({
    control,
    name: `items.${index}.productUrl`,
  });

  const currentWeight = useWatch({
    control,
    name: `items.${index}.weight`,
  });

  // Debounced estimation function
  const estimateWeight = useCallback(
    async (name: string, url?: string) => {
      if (!name?.trim() && !url?.trim()) {
        setEstimation(null);
        setShowSuggestion(false);
        return;
      }

      setIsEstimating(true);
      try {
        const result = await smartWeightEstimator.estimateWeight(
          name || '',
          url || undefined
        );
        setEstimation(result);
        setShowSuggestion(true);
      } catch (error) {
        console.error('Weight estimation error:', error);
        setEstimation(null);
        setShowSuggestion(false);
      } finally {
        setIsEstimating(false);
      }
    },
    []
  );

  // Auto-estimate when product name or URL changes
  useEffect(() => {
    if (!hasUserInput && (productName || productUrl)) {
      const timeoutId = setTimeout(() => {
        estimateWeight(productName, productUrl);
      }, 800); // Debounce for 800ms

      return () => clearTimeout(timeoutId);
    }
  }, [productName, productUrl, estimateWeight, hasUserInput]);

  const handleApplySuggestion = () => {
    if (estimation) {
      setValue(`items.${index}.weight`, estimation.estimated_weight.toString());
      setHasUserInput(true);
      setShowSuggestion(false);
    }
  };

  const handleManualInput = (value: string) => {
    setHasUserInput(!!value);
    if (value) {
      setShowSuggestion(false);
    }
  };

  const handleLearnFromCorrection = async () => {
    if (estimation && currentWeight && productName) {
      const actualWeight = parseFloat(currentWeight);
      if (!isNaN(actualWeight)) {
        try {
          await smartWeightEstimator.learnFromActualWeight(
            productName,
            actualWeight,
            productUrl || undefined,
            {
              userConfirmed: true,
              originalEstimate: estimation.estimated_weight
            }
          );
          console.log('✅ ML learning completed from user correction');
        } catch (error) {
          console.error('Error learning from correction:', error);
        }
      }
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return CheckCircle;
    if (confidence >= 0.6) return AlertTriangle;
    return Target;
  };

  // Calculate difference between estimation and user input
  const weightDifference = estimation && currentWeight ? 
    Math.abs(parseFloat(currentWeight) - estimation.estimated_weight) : 0;
  
  const showLearningPrompt = estimation && currentWeight && 
    weightDifference > 0.1 && // Significant difference
    parseFloat(currentWeight) > 0;

  return (
    <FormField
      control={control}
      name={`items.${index}.weight`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center space-x-2">
            <Scale className="h-4 w-4" />
            <span>Product Weight (kg)</span>
            <Badge variant="outline" className="text-xs">
              Optional
            </Badge>
            {isEstimating && (
              <div className="flex items-center space-x-1">
                <Brain className="h-3 w-3 animate-pulse text-blue-500" />
                <span className="text-xs text-blue-600">AI thinking...</span>
              </div>
            )}
          </FormLabel>
          
          <FormControl>
            <div className="space-y-3">
              <Input
                type="number"
                step="0.001"
                min="0"
                max="1000"
                placeholder="0.500"
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  handleManualInput(e.target.value);
                }}
                className="text-right"
              />
              
              {/* ML Suggestion Card */}
              {showSuggestion && estimation && !hasUserInput && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Brain className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">
                            AI Suggestion: {estimation.estimated_weight} kg
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {React.createElement(getConfidenceIcon(estimation.confidence), {
                            className: 'h-3 w-3'
                          })}
                          <Badge className={cn('text-xs', getConfidenceColor(estimation.confidence))}>
                            {(estimation.confidence * 100).toFixed(0)}% confidence
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Reasoning */}
                      {estimation.reasoning.length > 0 && (
                        <div className="text-xs text-blue-600">
                          <div className="font-medium mb-1">Reasoning:</div>
                          <ul className="space-y-0.5">
                            {estimation.reasoning.slice(0, 2).map((reason, idx) => (
                              <li key={idx} className="flex items-start space-x-1">
                                <span>•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Suggestions */}
                      {estimation.suggestions.length > 0 && (
                        <div className="text-xs text-blue-600">
                          <div className="flex items-center space-x-1 mb-1">
                            <Lightbulb className="h-3 w-3" />
                            <span className="font-medium">Tips:</span>
                          </div>
                          <div>{estimation.suggestions[0]}</div>
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleApplySuggestion}
                          className="flex-1"
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          Use Suggestion
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSuggestion(false)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Learning Prompt */}
              {showLearningPrompt && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <div className="text-sm">
                          <div className="font-medium text-green-800">Help improve AI accuracy</div>
                          <div className="text-xs text-green-600">
                            Your input differs from AI estimate by {weightDifference.toFixed(2)}kg
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleLearnFromCorrection}
                        className="text-green-700 border-green-300 hover:bg-green-100"
                      >
                        Train AI
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <p className="text-xs text-muted-foreground">
                Enter the product weight in kilograms. AI will suggest weights based on product information.
              </p>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};