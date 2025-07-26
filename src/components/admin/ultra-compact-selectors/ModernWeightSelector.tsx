import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Scale, Sparkles, Database, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeightSuggestion {
  value: number;
  source: 'hsn' | 'ai';
  confidence: number;
  description: string;
}

interface ModernWeightSelectorProps {
  weight: number;
  suggestions: WeightSuggestion[];
  onWeightChange: (weight: number, source: 'hsn' | 'ai' | 'manual') => void;
  className?: string;
}

export const ModernWeightSelector: React.FC<ModernWeightSelectorProps> = ({
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

  const getSourceConfig = (source: string) => {
    return source === 'hsn'
      ? {
          icon: Database,
          color: 'from-emerald-500 to-teal-600',
          bg: 'bg-gradient-to-r from-emerald-50 to-teal-50',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
          badge: 'emerald' as const,
        }
      : {
          icon: Sparkles,
          color: 'from-blue-500 to-indigo-600',
          bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          badge: 'info' as const,
        };
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <div className="p-1 rounded-md bg-gradient-to-br from-slate-100 to-slate-200">
          <Scale className="w-3.5 h-3.5 text-slate-600" />
        </div>
        <span>Weight</span>
      </div>

      <div className="relative flex items-center">
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          className="w-24 h-10 text-sm pr-12 border-slate-300 focus:border-slate-400 focus:ring-slate-200 shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200"
          placeholder="0.0"
          type="number"
          step="0.1"
          min="0"
        />
        <span className="absolute right-10 text-xs text-slate-500 pointer-events-none font-medium">
          kg
        </span>

        {suggestions.length > 0 && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 h-10 w-10 p-0 hover:bg-slate-50 border-l border-slate-300 group transition-all duration-200"
              >
                <ChevronDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-800 transition-colors" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-0 shadow-2xl border border-slate-200 bg-white/95 backdrop-blur-md"
              align="start"
            >
              <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-slate-600" />
                  <div className="text-sm font-semibold text-slate-900">
                    Smart Weight Suggestions
                  </div>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  AI-powered recommendations based on product analysis
                </div>
              </div>
              <div className="p-3 space-y-2">
                {suggestions.map((suggestion, index) => {
                  const config = getSourceConfig(suggestion.source);
                  const Icon = config.icon;

                  return (
                    <button
                      key={index}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className={cn(
                        'w-full flex items-center justify-between p-4 text-sm rounded-xl transition-all duration-200 group',
                        'border hover:shadow-md transform hover:-translate-y-0.5',
                        config.bg,
                        config.border,
                        'hover:border-opacity-60',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg bg-gradient-to-br', config.color)}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-900">{suggestion.value}kg</span>
                            <Badge variant={config.badge} className="text-xs px-2">
                              {suggestion.source.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-600 truncate max-w-44">
                            {suggestion.description}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((dot) => (
                              <div
                                key={dot}
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full transition-all duration-300',
                                  dot <= suggestion.confidence * 5
                                    ? suggestion.confidence >= 0.8
                                      ? 'bg-emerald-500'
                                      : suggestion.confidence >= 0.6
                                        ? 'bg-amber-500'
                                        : 'bg-red-500'
                                    : 'bg-slate-200',
                                )}
                              />
                            ))}
                          </div>
                          <span className={cn('text-xs font-semibold', config.text)}>
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="p-3 pt-0">
                <div className="text-xs text-slate-500 text-center">
                  Confidence indicators help you choose the most reliable estimate
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};
