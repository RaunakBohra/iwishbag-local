import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeightSuggestion {
  value: number;
  source: 'hsn' | 'ai';
  confidence: number;
  description: string;
}

interface StripeWeightSelectorProps {
  weight: number;
  suggestions: WeightSuggestion[];
  onWeightChange: (weight: number, source: 'hsn' | 'ai' | 'manual') => void;
  className?: string;
}

export const StripeWeightSelector: React.FC<StripeWeightSelectorProps> = ({
  weight,
  suggestions,
  onWeightChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(weight.toString());

  const handleInputChange = (value: string) => {
    setInputValue(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      onWeightChange(numValue, 'manual');
    }
  };

  const handleSuggestionSelect = (suggestion: WeightSuggestion) => {
    setInputValue(suggestion.value.toString());
    onWeightChange(suggestion.value, suggestion.source);
    setIsOpen(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-500';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-1 text-sm text-gray-600">
        <Scale className="w-3.5 h-3.5" />
        <span>Weight</span>
      </div>

      <div className="relative flex items-center">
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          className="w-20 h-8 text-sm pr-8 border-gray-300 focus:border-gray-400 focus:ring-0"
          placeholder="0.0"
          type="number"
          step="0.1"
          min="0"
        />
        <span className="absolute right-8 text-xs text-gray-500 pointer-events-none">kg</span>

        {suggestions.length > 0 && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 h-8 w-8 p-0 hover:bg-gray-50"
              >
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-900 px-2 py-1">Suggestions</div>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{suggestion.value}kg</span>
                      <span className="text-xs text-gray-500 uppercase">{suggestion.source}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          suggestion.confidence >= 0.8
                            ? 'bg-green-500'
                            : suggestion.confidence >= 0.6
                              ? 'bg-yellow-500'
                              : 'bg-red-500',
                        )}
                      />
                      <span
                        className={cn(
                          'text-xs font-medium',
                          getConfidenceColor(suggestion.confidence),
                        )}
                      >
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};
