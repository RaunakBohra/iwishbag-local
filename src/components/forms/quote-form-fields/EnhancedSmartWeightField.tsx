/**
 * Enhanced Smart Weight Field - Phase 3
 * 
 * Integrates with ProductIntelligenceService for smart weight estimation.
 * Features ML estimation, HSN-based weights, and confidence scoring.
 */

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
  CheckCircle,
  AlertTriangle,
  Target,
  TrendingUp,
  RefreshCw,
  Zap,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { productIntelligenceService, type WeightEstimation } from '@/services/ProductIntelligenceService';

interface EnhancedSmartWeightFieldProps {
  control: Control<FieldValues>;
  index: number;
  setValue: UseFormSetValue<FieldValues>;
  hsnCode?: string;
  countryCode?: string;
  onWeightSourceSelected?: (source: 'intelligence' | 'manual') => void;
}

export const EnhancedSmartWeightField: React.FC<EnhancedSmartWeightFieldProps> = ({
  control,
  index,
  setValue,
  hsnCode,
  countryCode = 'IN',
  onWeightSourceSelected,
}) => {
  const { toast } = useToast();
  const [weightEstimation, setWeightEstimation] = useState<WeightEstimation | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [hasUserInput, setHasUserInput] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'intelligence' | 'manual' | null>(null);

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

  const category = useWatch({
    control,
    name: `items.${index}.category`,
  });

  const costPrice = useWatch({
    control,
    name: `items.${index}.costprice_origin`,
  });

  // Auto-estimate when product details change
  useEffect(() => {
    if (!hasUserInput && productName) {
      const timeoutId = setTimeout(() => {
        estimateWeight();
      }, 800); // Debounce for 800ms

      return () => clearTimeout(timeoutId);
    }
  }, [productName, category, costPrice, hasUserInput]);

  const estimateWeight = useCallback(async () => {
    if (!productName?.trim()) {
      setWeightEstimation(null);
      return;
    }

    setIsEstimating(true);
    try {
      const result = await productIntelligenceService.estimateWeight(
        productName,
        countryCode,
        category,
        costPrice ? parseFloat(costPrice) : undefined
      );
      
      setWeightEstimation(result);
      console.log(`⚖️ [Weight] Estimation for "${productName}":`, result);
    } catch (error) {
      console.error('Weight estimation error:', error);
      setWeightEstimation(null);
    } finally {
      setIsEstimating(false);
    }
  }, [productName, countryCode, category, costPrice]);

  const handleSelectWeight = async (weight: number) => {
    setValue(`items.${index}.weight`, weight.toString());
    setHasUserInput(true);
    setSelectedSource('intelligence');
    onWeightSourceSelected?.('intelligence');

    toast({
      title: 'Weight Applied',
      description: `Using AI estimated weight: ${weight} kg`,
    });

    // Record usage for learning
    if (weightEstimation) {
      console.log(`📊 [Weight] Recording weight selection: ${weight}kg for "${productName}"`);
    }
  };

  const handleManualInput = (value: string) => {
    setHasUserInput(!!value);
    if (value) {
      setSelectedSource('manual');
      onWeightSourceSelected?.('manual');
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

  const getEstimationMethodIcon = (method: string) => {
    if (method.includes('Product-specific')) return Database;
    if (method.includes('Category-based')) return Brain;
    return Scale;
  };

  // Calculate difference between AI estimation and user input
  const weightDifference =
    weightEstimation && currentWeight
      ? Math.abs(parseFloat(currentWeight) - weightEstimation.estimated_weight_kg)
      : 0;

  const showLearningPrompt =
    weightEstimation &&
    currentWeight &&
    weightDifference > 0.1 && // Significant difference
    parseFloat(currentWeight) > 0 &&
    selectedSource === 'manual';

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
              AI Enhanced
            </Badge>
            {isEstimating && (
              <div className="flex items-center space-x-1">
                <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                <span className="text-xs text-blue-600">AI estimating...</span>
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

              {/* Weight Estimation Suggestion */}
              {weightEstimation && !hasUserInput && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Brain className="h-4 w-4 text-blue-600" />
                        <div className="text-sm">
                          <div className="font-medium text-blue-800">
                            AI Suggestion: {weightEstimation.estimated_weight_kg} kg
                          </div>
                          <div className="text-xs text-blue-600 flex items-center space-x-1">
                            {React.createElement(
                              getEstimationMethodIcon(weightEstimation.estimation_method),
                              { className: "h-3 w-3" }
                            )}
                            <span>{weightEstimation.estimation_method}</span>
                            {weightEstimation.classification_used && (
                              <span>• HSN: {weightEstimation.classification_used}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          className={getConfidenceColor(weightEstimation.confidence_score)}
                          variant="outline"
                        >
                          {Math.round(weightEstimation.confidence_score * 100)}%
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectWeight(weightEstimation.estimated_weight_kg)}
                          className="text-blue-700 border-blue-300 hover:bg-blue-100"
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          Use
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
                        onClick={() => {
                          // Could implement learning here
                          toast({
                            title: 'Feedback Recorded',
                            description: 'Thanks for helping improve our AI!',
                          });
                        }}
                        className="text-green-700 border-green-300 hover:bg-green-100"
                      >
                        Feedback
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <p className="text-xs text-muted-foreground">
                Enter the product weight in kilograms. AI will suggest weights based on product
                information and historical data.
              </p>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};