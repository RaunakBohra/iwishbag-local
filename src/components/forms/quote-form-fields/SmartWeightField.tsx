// ============================================================================

// Features: Real-time ML estimation, dual suggestions
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
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { smartWeightEstimator } from '@/services/SmartWeightEstimator';
import { DualWeightSuggestions } from '@/components/admin/smart-weight-field/DualWeightSuggestions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  hsnCode?: string;
  onWeightSourceSelected?: (source: 'hsn' | 'ml' | 'manual') => void;
}

export const SmartWeightField: React.FC<SmartWeightFieldProps> = ({
  control,
  index,
  setValue,
  hsnCode,
  onWeightSourceSelected,
}) => {
  const { toast } = useToast();
  const [mlEstimation, setMlEstimation] = useState<EstimationResult | null>(null);
  const [hsnWeight, setHsnWeight] = useState<setIsEstimating] = useState(false);
  const [isLoadingsetIsLoadingsetShowSuggestion] = useState(false);
  const [hasUserInput, setHasUserInput] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'hsn' | 'ml' | 'manual' | null>(null);

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

  
  useEffect(() => {
    const fetchHSNWeight = async () => {
      if (!hsnCode) {
        setHsnWeight(null);
        return;
      }

      setIsLoadingHSN(true);
      try {
        const weight = await hsnWeightService.getHSNWeight(hsnCode);
        setHsnWeight(weight);
        if (weight) {
          console.log(`📊 [Weight] HSN weight found for ${hsnCode}:`, weight);
        }
      } catch (error) {
        console.error('Error fetching error);
        setHsnWeight(null);
      } finally {
        setIsLoadingHSN(false);
      }
    };

    fetchHSNWeight();
  }, [hsnCode]);

  // Debounced ML estimation function
  const estimateMLWeight = useCallback(async (name: string, url?: string) => {
    if (!name?.trim() && !url?.trim()) {
      setMlEstimation(null);
      return;
    }

    setIsEstimating(true);
    try {
      const result = await smartWeightEstimator.estimateWeight(name || '', url || undefined);
      setMlEstimation(result);
      console.log(`🤖 [Weight] ML estimation for "${name}":`, result);
    } catch (error) {
      console.error('Weight estimation error:', error);
      setMlEstimation(null);
    } finally {
      setIsEstimating(false);
    }
  }, []);

  // Auto-estimate when product name or URL changes
  useEffect(() => {
    if (!hasUserInput && (productName || productUrl)) {
      const timeoutId = setTimeout(() => {
        estimateMLWeight(productName, productUrl);
      }, 800); // Debounce for 800ms

      return () => clearTimeout(timeoutId);
    }
  }, [productName, productUrl, estimateMLWeight, hasUserInput]);

  const handleSelectWeight = async (weight: number, source: 'hsn' | 'ml') => {
    setValue(`items.${index}.weight`, weight.toString());
    setHasUserInput(true);
    setSelectedSource(source);
    onWeightSourceSelected?.(source);

    toast({
      title: 'Weight Applied',
      description: `Using ${source === 'hsn' ? 'HSN database' : 'AI estimated'} weight: ${weight} kg`,
    });

    // Record the selection for analytics
    if (productName) {
      await smartWeightEstimator.recordWeightSelection(
        productName,
        hsnWeight?.average || null,
        mlEstimation?.estimated_weight || 0,
        weight,
        source,
        productUrl,
        undefined, // category - could be passed if available
        hsnCode,
      );
    }
  };

  const handleManualInput = (value: string) => {
    setHasUserInput(!!value);
    if (value) {
      setSelectedSource('manual');
      onWeightSourceSelected?.('manual');
    }
  };

  const handleLearnFromCorrection = async () => {
    if (mlEstimation && currentWeight && productName) {
      const actualWeight = parseFloat(currentWeight);
      if (!isNaN(actualWeight)) {
        try {
          await smartWeightEstimator.learnFromActualWeight(
            productName,
            actualWeight,
            productUrl || undefined,
            {
              userConfirmed: true,
              originalEstimate: mlEstimation.estimated_weight,
            },
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

  // Calculate difference between ML estimation and user input
  const weightDifference =
    mlEstimation && currentWeight
      ? Math.abs(parseFloat(currentWeight) - mlEstimation.estimated_weight)
      : 0;

  const showLearningPrompt =
    mlEstimation &&
    currentWeight &&
    weightDifference > 0.1 && // Significant difference
    parseFloat(currentWeight) > 0 &&
    selectedSource !== 'hsn'; 

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
            {(isEstimating || isLoadingHSN) && (
              <div className="flex items-center space-x-1">
                <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                <span className="text-xs text-blue-600">
                  {isLoadingHSN ? 'Loading HSN...' : 'AI thinking...'}
                </span>
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

              {}
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
                Enter the product weight in kilograms. AI will suggest weights based on product
                information.
              </p>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
