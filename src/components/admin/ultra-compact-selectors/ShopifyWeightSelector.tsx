import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown, Scale, Sparkles, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeightSuggestion {
  value: number;
  source: 'hsn' | 'ai';
  confidence: number;
  description: string;
}

interface ShopifyWeightSelectorProps {
  weight: number;
  suggestions: WeightSuggestion[];
  onWeightChange: (weight: number, source: 'hsn' | 'ai' | 'manual') => void;
  className?: string;
}

export const ShopifyWeightSelector: React.FC<ShopifyWeightSelectorProps> = ({
  weight,
  suggestions,
  onWeightChange,
  className
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

  const getSourceIcon = (source: string) => {
    return source === 'hsn' ? Database : Sparkles;
  };

  const getSourceColor = (source: string) => {
    return source === 'hsn' ? 'text-green-600' : 'text-blue-600';
  };

  const getBadgeVariant = (source: string) => {
    return source === 'hsn' ? 'success' : 'info';
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Scale className="w-4 h-4 text-gray-500" />
        <span>Weight</span>
      </div>
      
      <div className="relative flex items-center">
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          className="w-24 h-9 text-sm pr-12 border-gray-300 focus:border-green-500 focus:ring-green-200 shadow-sm"
          placeholder="0.0"
          type="number"
          step="0.1"
          min="0"
        />
        <span className="absolute right-10 text-xs text-gray-500 pointer-events-none font-medium">kg</span>
        
        {suggestions.length > 0 && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 h-9 w-9 p-0 hover:bg-green-50 border-l border-gray-300"
              >
                <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 shadow-lg border border-gray-200" align="start">
              <div className="p-3 border-b border-gray-100">
                <div className="text-sm font-semibold text-gray-900">
                  Weight Suggestions
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Choose from AI or database recommendations
                </div>
              </div>
              <div className="p-2 space-y-1">
                {suggestions.map((suggestion, index) => {
                  const Icon = getSourceIcon(suggestion.source);
                  return (
                    <button
                      key={index}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className="w-full flex items-center justify-between p-3 text-sm rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('p-1.5 rounded-md', 
                          suggestion.source === 'hsn' ? 'bg-green-100' : 'bg-blue-100'
                        )}>
                          <Icon className={cn('w-3.5 h-3.5', getSourceColor(suggestion.source))} />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{suggestion.value}kg</span>
                            <Badge variant={getBadgeVariant(suggestion.source)} className="text-xs">
                              {suggestion.source.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 truncate max-w-40">
                            {suggestion.description}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <div className={cn('w-2 h-2 rounded-full', 
                            suggestion.confidence >= 0.8 ? 'bg-green-500' :
                            suggestion.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                          )} />
                          <span className="text-xs font-medium text-gray-600">
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};