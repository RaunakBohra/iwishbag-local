import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CompactConfidenceIndicator } from './CompactConfidenceIndicator';
import { Scale, ChevronDown, Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeightSuggestion {
  value: number;
  source: 'hsn' | 'ml' | 'manual';
  confidence: number;
  label: string;
  description?: string;
}

interface CompactWeightSelectorProps {
  currentWeight: number;
  suggestions: WeightSuggestion[];
  onWeightChange: (weight: number, source: 'hsn' | 'ml' | 'manual') => void;
  className?: string;
  disabled?: boolean;
}

export const CompactWeightSelector: React.FC<CompactWeightSelectorProps> = ({
  currentWeight,
  suggestions,
  onWeightChange,
  className,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentWeight.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  // Find current source based on weight value
  const currentSource =
    suggestions.find((s) => Math.abs(s.value - currentWeight) < 0.01)?.source || 'manual';
  const currentSuggestion = suggestions.find((s) => s.source === currentSource);

  useEffect(() => {
    setInputValue(currentWeight.toString());
  }, [currentWeight]);

  const handleSuggestionSelect = (suggestion: WeightSuggestion) => {
    onWeightChange(suggestion.value, suggestion.source);
    setIsOpen(false);
  };

  const handleManualEdit = () => {
    setIsEditing(true);
    setIsOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleInputSubmit = () => {
    const newWeight = parseFloat(inputValue);
    if (!isNaN(newWeight) && newWeight > 0) {
      onWeightChange(newWeight, 'manual');
    } else {
      setInputValue(currentWeight.toString());
    }
    setIsEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputSubmit();
    } else if (e.key === 'Escape') {
      setInputValue(currentWeight.toString());
      setIsEditing(false);
    }
  };

  // Filter out manual suggestions and current weight from quick suggestions
  const quickSuggestions = suggestions
    .filter((s) => s.source !== 'manual' && Math.abs(s.value - currentWeight) >= 0.01)
    .slice(0, 2);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Weight Input/Display */}
      <div className="flex items-center gap-1">
        <Scale className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Weight:</span>

        {isEditing ? (
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleInputSubmit}
            onKeyDown={handleInputKeyDown}
            className="w-20 h-7 text-sm px-2"
            type="number"
            step="0.1"
            min="0"
            disabled={disabled}
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualEdit}
            disabled={disabled}
            className="h-7 px-2 text-sm font-semibold hover:bg-gray-100"
          >
            {currentWeight} kg
          </Button>
        )}

        {/* Confidence Indicator */}
        {currentSuggestion && (
          <CompactConfidenceIndicator confidence={currentSuggestion.confidence} className="ml-1" />
        )}
      </div>

      {/* Quick Apply Chips */}
      {quickSuggestions.length > 0 && (
        <div className="flex items-center gap-1">
          {quickSuggestions.map((suggestion) => (
            <Button
              key={suggestion.source}
              variant="outline"
              size="sm"
              onClick={() => handleSuggestionSelect(suggestion)}
              disabled={disabled}
              className="h-7 px-2 text-xs border-gray-300 hover:border-teal-400 hover:bg-teal-50"
            >
              <span className="font-medium">{suggestion.label}:</span>
              <span className="ml-1">{suggestion.value}kg</span>
              <CompactConfidenceIndicator confidence={suggestion.confidence} className="ml-1" />
            </Button>
          ))}
        </div>
      )}

      {/* More Options Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-7 px-2 text-xs text-gray-600 hover:bg-gray-100"
          >
            <ChevronDown className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <Scale className="w-4 h-4" />
              Weight Options
            </div>

            {suggestions.map((suggestion) => {
              const isSelected = Math.abs(suggestion.value - currentWeight) < 0.01;

              return (
                <div
                  key={suggestion.source}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors',
                    isSelected
                      ? 'border-teal-200 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                  )}
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          suggestion.source === 'hsn'
                            ? 'success'
                            : suggestion.source === 'ml'
                              ? 'info'
                              : 'secondary'
                        }
                        className="text-xs"
                      >
                        {suggestion.label}
                      </Badge>
                      <span className="font-semibold text-gray-900">{suggestion.value} kg</span>
                    </div>

                    <CompactConfidenceIndicator confidence={suggestion.confidence} showPercentage />
                  </div>

                  <div className="flex items-center gap-2">
                    {suggestion.description && (
                      <Info className="w-3 h-3 text-gray-400" title={suggestion.description} />
                    )}
                    {isSelected && <Check className="w-4 h-4 text-teal-600" />}
                  </div>
                </div>
              );
            })}

            <div className="pt-2 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualEdit}
                className="w-full text-xs"
              >
                Enter Custom Weight
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
