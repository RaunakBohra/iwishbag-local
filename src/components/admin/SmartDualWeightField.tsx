import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Scale, ChevronDown, Database, Brain, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { leanWeightService, type WeightPrediction } from '@/services/LeanWeightService';

interface SmartDualWeightFieldProps {
  value: number;
  onChange: (value: number) => void;
  onSourceSelected?: (source: 'hsn' | 'ml' | 'manual') => void;
  productName?: string;
  hsnCode?: string;
  productUrl?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export const SmartDualWeightField: React.FC<SmartDualWeightFieldProps> = ({
  value,
  onChange,
  onSourceSelected,
  productName = '',
  hsnCode = '',
  productUrl = '',
  label = '',
  required = false,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [primarySuggestion, setPrimarySuggestion] = useState<WeightPrediction | null>(null);
  const [alternatives, setAlternatives] = useState<WeightPrediction[]>([]);

  // Fetch weight suggestions using LeanWeightService
  useEffect(() => {
    const fetchWeightSuggestions = async () => {
      if (!productName && !hsnCode && !productUrl) return;

      setIsLoading(true);
      try {
        const prediction = await leanWeightService.predictWeight(
          productName,
          hsnCode,
          productUrl
        );

        setPrimarySuggestion(prediction);

        // Get alternative predictions
        const alts: WeightPrediction[] = [];
        
        // Try HSN-only prediction if we have HSN code
        if (hsnCode && prediction.source !== 'hsn') {
          const hsnPrediction = await leanWeightService.predictWeight('', hsnCode);
          if (hsnPrediction.weight !== prediction.weight) {
            alts.push(hsnPrediction);
          }
        }

        // Try ML-only prediction if we have product name
        if (productName && prediction.source !== 'ml') {
          const mlPrediction = await leanWeightService.predictWeight(productName);
          if (mlPrediction.weight !== prediction.weight) {
            alts.push(mlPrediction);
          }
        }

        setAlternatives(alts);
      } catch (error) {
        console.error('Error fetching weight suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeightSuggestions();
  }, [productName, hsnCode, productUrl]);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'hsn': return <Database className="w-4 h-4 text-blue-600" />;
      case 'ml': return <Brain className="w-4 h-4 text-purple-600" />;
      case 'hybrid': return <Sparkles className="w-4 h-4 text-green-600" />;
      default: return <Scale className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'hsn': return 'HSN Database';
      case 'ml': return 'ML Prediction';
      case 'hybrid': return 'Smart Hybrid';
      default: return 'Manual Entry';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    const numericValue = parseFloat(newValue) || 0;
    onChange(numericValue);
    onSourceSelected?.('manual');
  };

  const handleSuggestionSelect = (weight: number, source: 'hsn' | 'ml' | 'manual') => {
    setInputValue(weight.toString());
    onChange(weight);
    onSourceSelected?.(source);
    setPopoverOpen(false);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className={cn(
        'relative flex items-center gap-2',
        className?.includes('compact-mode') && 'inline-flex'
      )}>
        <div className="relative">
          <div className="flex items-center bg-white border border-gray-200 rounded px-2 py-1 min-w-fit">
            <Scale className="w-3 h-3 text-gray-400" />
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="0.00"
              required={required}
              className={cn(
                'h-6 border-0 p-0 text-xs font-medium ml-1 pr-4 min-w-0 w-auto'
              )}
              style={{
                width: `${Math.max(3, inputValue.length || 3)}ch`
              }}
            />
            <span className="text-xs text-gray-400">kg</span>
          </div>
          
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0 hover:bg-gray-100"
              >
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="end">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  <span className="font-medium text-sm">Weight Suggestions</span>
                  {isLoading && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900"></div>
                  )}
                </div>
                
                {/* Primary Suggestion */}
                {primarySuggestion && (
                  <div className="p-3 bg-blue-50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSourceIcon(primarySuggestion.source)}
                        <div>
                          <div className="text-sm font-medium">{getSourceLabel(primarySuggestion.source)}</div>
                          <div className="text-xs text-gray-600">
                            {Math.round(primarySuggestion.confidence * 100)}% confidence
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => handleSuggestionSelect(primarySuggestion.weight, primarySuggestion.source as any)}
                        className="h-7"
                      >
                        {primarySuggestion.weight} kg
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Alternative Suggestions */}
                {alternatives.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-700">Alternative Suggestions</div>
                    {alternatives.map((alt, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          {getSourceIcon(alt.source)}
                          <div>
                            <div className="text-sm">{getSourceLabel(alt.source)}</div>
                            <div className="text-xs text-gray-500">
                              {Math.round(alt.confidence * 100)}% confidence
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestionSelect(alt.weight, alt.source as any)}
                          className="h-7"
                        >
                          {alt.weight} kg
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* No suggestions state */}
                {!isLoading && !primarySuggestion && (
                  <div className="text-center text-gray-500 text-sm py-4">
                    No weight suggestions available
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};