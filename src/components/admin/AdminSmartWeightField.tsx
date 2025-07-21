// ============================================================================
// ADMIN SMART WEIGHT FIELD - ML-Powered Weight Input for Admin Quote Management
// Features: Real-time ML estimation, confidence indicators, learning system
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Control, useWatch, UseFormSetValue } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
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
  TrendingUp,
} from 'lucide-react';
import { smartWeightEstimator } from '@/services/SmartWeightEstimator';
import { cn } from '@/lib/utils';
import { AdminQuoteFormValues } from '@/components/admin/admin-quote-form-validation';

interface EstimationResult {
  estimated_weight: number;
  confidence: number;
  reasoning: string[];
  suggestions: string[];
}

interface AdminSmartWeightFieldProps {
  index: number;
  control: Control<AdminQuoteFormValues>;
  setValue: UseFormSetValue<AdminQuoteFormValues>;
  displayWeightUnit?: 'kg' | 'lb';
  onNumberInputWheel?: (e: React.WheelEvent) => void;
}

export const AdminSmartWeightField: React.FC<AdminSmartWeightFieldProps> = ({
  index,
  control,
  setValue,
  displayWeightUnit = 'kg',
  onNumberInputWheel,
}) => {
  const [estimation, setEstimation] = useState<EstimationResult | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [hasUserInput, setHasUserInput] = useState(false);

  // Watch relevant fields for auto-estimation
  const productName = useWatch({
    control,
    name: `items.${index}.product_name`,
  });

  const productUrl = useWatch({
    control,
    name: `items.${index}.product_url`,
  });

  const currentWeight = useWatch({
    control,
    name: `items.${index}.item_weight`,
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
        const result = await smartWeightEstimator.estimateWeight(name || '', url || undefined);
        setEstimation(result);

        // Only show suggestion if user hasn't manually entered a weight
        if (!hasUserInput && !currentWeight) {
          setShowSuggestion(true);
        }
      } catch (error) {
        console.error('Weight estimation error:', error);
        setEstimation(null);
        setShowSuggestion(false);
      } finally {
        setIsEstimating(false);
      }
    },
    [hasUserInput, currentWeight],
  );

  // Auto-estimate when product name or URL changes
  useEffect(() => {
    if (productName || productUrl) {
      const timeoutId = setTimeout(() => {
        estimateWeight(productName, productUrl);
      }, 800); // Debounce for 800ms

      return () => clearTimeout(timeoutId);
    }
  }, [productName, productUrl, estimateWeight]);

  const handleApplySuggestion = () => {
    if (estimation) {
      setValue(`items.${index}.item_weight`, estimation.estimated_weight);
      setHasUserInput(true);
      setShowSuggestion(false);
    }
  };

  const handleManualInput = (value: string) => {
    if (value && parseFloat(value) > 0) {
      setHasUserInput(true);
      setShowSuggestion(false);
    }
  };

  const handleLearnFromCorrection = async () => {
    if (estimation && currentWeight && productName) {
      const actualWeight =
        typeof currentWeight === 'number' ? currentWeight : parseFloat(currentWeight);
      if (!isNaN(actualWeight)) {
        try {
          await smartWeightEstimator.learnFromActualWeight(
            productName,
            actualWeight,
            productUrl || undefined,
            {
              userConfirmed: true,
              originalEstimate: estimation.estimated_weight,
            },
          );
          console.log(`✅ ML learning completed: "${productName}" → ${actualWeight}kg`);
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
  const weightDifference =
    estimation && currentWeight
      ? Math.abs(parseFloat(currentWeight.toString()) - estimation.estimated_weight)
      : 0;

  const showLearningPrompt =
    estimation &&
    currentWeight &&
    weightDifference > 0.1 && // Significant difference
    parseFloat(currentWeight.toString()) > 0;

  return (
    <div className="space-y-2">
      <FormField
        control={control}
        name={`items.${index}.item_weight`}
        render={({ field }) => {
          // Weight field logic (similar to original component)
          const getDisplayValue = () => {
            if (!field.value) return '';
            return parseFloat(field.value.toFixed(2)).toString();
          };

          const restrictTo2Decimals = (value: string) => {
            let sanitized = value.replace(/[^\d.]/g, '');
            const parts = sanitized.split('.');
            if (parts.length > 2) sanitized = parts[0] + '.' + parts.slice(1).join('');
            if (parts[1]?.length > 2) sanitized = parts[0] + '.' + parts[1].slice(0, 2);
            return sanitized;
          };

          const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            const value = e.target.value;
            if (value) {
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                field.onChange(numValue);
                handleManualInput(value);
              }
            } else {
              field.onChange('');
            }
          };

          return (
            <FormItem className="m-0">
              <FormLabel className="text-xs font-medium text-muted-foreground flex items-center space-x-1">
                <Scale className="h-3 w-3" />
                <span>Weight ({displayWeightUnit})</span>
                {isEstimating && (
                  <div className="flex items-center space-x-1">
                    <Brain className="h-3 w-3 animate-pulse text-blue-500" />
                    <span className="text-xs text-blue-600">AI...</span>
                  </div>
                )}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={getDisplayValue()}
                  onChange={(e) => {
                    const sanitized = restrictTo2Decimals(e.target.value);
                    e.target.value = sanitized;
                  }}
                  onBlur={handleBlur}
                  onWheel={onNumberInputWheel}
                  className="h-9 mt-1"
                />
              </FormControl>
            </FormItem>
          );
        }}
      />

      {/* ML Suggestion Card */}
      {showSuggestion && estimation && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Brain className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-800">
                    AI: {estimation.estimated_weight} kg
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {React.createElement(getConfidenceIcon(estimation.confidence), {
                    className: 'h-3 w-3',
                  })}
                  <Badge
                    className={cn('text-xs px-1 py-0', getConfidenceColor(estimation.confidence))}
                  >
                    {(estimation.confidence * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>

              {/* Compact reasoning */}
              {estimation.reasoning.length > 0 && (
                <div className="text-xs text-blue-600">{estimation.reasoning[0]}</div>
              )}

              <div className="flex space-x-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplySuggestion}
                  className="h-6 text-xs px-2 flex-1"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Use
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSuggestion(false)}
                  className="h-6 text-xs px-2"
                >
                  ✕
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Prompt */}
      {showLearningPrompt && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <div className="text-xs">
                  <div className="font-medium text-green-800">Train AI</div>
                  <div className="text-green-600">Diff: {weightDifference.toFixed(2)}kg</div>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleLearnFromCorrection}
                className="h-6 text-xs px-2 text-green-700 border-green-300 hover:bg-green-100"
              >
                Learn
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
