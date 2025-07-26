// ============================================================================
// ADMIN SMART WEIGHT FIELD - ML-Powered Weight Input for Admin Quote Management
// Features: Real-time ML estimation, HSN weight data, dual suggestions
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
  RefreshCw,
} from 'lucide-react';
import { smartWeightEstimator } from '@/services/SmartWeightEstimator';
import { hsnWeightService, type HSNWeightData } from '@/services/HSNWeightService';
import { DualWeightSuggestions } from '@/components/admin/smart-weight-field/DualWeightSuggestions';
import { cn } from '@/lib/utils';
import { AdminQuoteFormValues } from '@/components/admin/admin-quote-form-validation';
import { useToast } from '@/hooks/use-toast';

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
  hsnCode?: string;
  onWeightSourceSelected?: (source: 'hsn' | 'ml' | 'manual') => void;
}

export const AdminSmartWeightField: React.FC<AdminSmartWeightFieldProps> = ({
  index,
  control,
  setValue,
  displayWeightUnit = 'kg',
  onNumberInputWheel,
  hsnCode,
  onWeightSourceSelected,
}) => {
  const { toast } = useToast();
  const [mlEstimation, setMlEstimation] = useState<EstimationResult | null>(null);
  const [hsnWeight, setHsnWeight] = useState<HSNWeightData | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isLoadingHSN, setIsLoadingHSN] = useState(false);
  const [hasUserInput, setHasUserInput] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'hsn' | 'ml' | 'manual' | null>(null);

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

  // Fetch HSN weight when HSN code changes
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
        console.error('Error fetching HSN weight:', error);
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
    setValue(`items.${index}.item_weight`, weight);
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

  const handleManualInput = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    setHasUserInput(!isNaN(numValue) && numValue > 0);
    if (!isNaN(numValue) && numValue > 0) {
      setSelectedSource('manual');
      onWeightSourceSelected?.('manual');
    }
  };

  const handleLearnFromCorrection = async () => {
    if (mlEstimation && currentWeight && productName) {
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
              originalEstimate: mlEstimation.estimated_weight,
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

  // Calculate difference between ML estimation and user input
  const weightDifference =
    mlEstimation && currentWeight
      ? Math.abs(parseFloat(currentWeight.toString()) - mlEstimation.estimated_weight)
      : 0;

  const showLearningPrompt =
    mlEstimation &&
    currentWeight &&
    weightDifference > 0.1 && // Significant difference
    parseFloat(currentWeight.toString()) > 0 &&
    selectedSource !== 'hsn'; // Don't show if HSN was selected

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
                {(isEstimating || isLoadingHSN) && (
                  <div className="flex items-center space-x-1">
                    <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                    <span className="text-xs text-blue-600">
                      {isLoadingHSN ? 'HSN...' : 'AI...'}
                    </span>
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

      {/* Dual Weight Suggestions */}
      {!hasUserInput && (hsnWeight || mlEstimation) && (
        <DualWeightSuggestions
          hsnWeight={
            hsnWeight
              ? {
                  ...hsnWeight,
                  source: 'hsn' as const,
                }
              : undefined
          }
          mlWeight={
            mlEstimation
              ? {
                  estimated: mlEstimation.estimated_weight,
                  confidence: mlEstimation.confidence,
                  reasoning: mlEstimation.reasoning,
                  source: 'ml' as const,
                }
              : undefined
          }
          currentWeight={currentWeight ? parseFloat(currentWeight.toString()) : undefined}
          onSelectWeight={handleSelectWeight}
          isLoading={isEstimating || isLoadingHSN}
        />
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
