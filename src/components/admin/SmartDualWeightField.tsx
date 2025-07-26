import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Scale, ChevronDown, Database, Brain, Sparkles, Edit2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const [isLoading, setIsLoading] = useState(false);
  const [primarySuggestion, setPrimarySuggestion] = useState<WeightPrediction | null>(null);
  const [alternatives, setAlternatives] = useState<WeightPrediction[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync inputValue with value prop changes
  useEffect(() => {
    if (!isEditing) {
      setInputValue(value?.toString() || '');
    }
  }, [value, isEditing]);

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

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    setIsEditing(true);
  };

  const handleWeightSelect = (weight: number, source: 'hsn' | 'ml' | 'manual') => {
    console.log('🎯 SmartDualWeightField: handleWeightSelect called', { weight, source });
    setInputValue(weight.toString());
    onChange(weight);
    onSourceSelected?.(source);
    setIsOpen(false);
    setIsEditing(false);
  };

  const saveEdit = () => {
    const numericValue = parseFloat(inputValue) || 0;
    onChange(numericValue);
    onSourceSelected?.('manual');
    setIsEditing(false);
    setIsOpen(false);
  };

  const cancelEdit = () => {
    setInputValue(value?.toString() || '');
    setIsEditing(false);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const allItems = [...(primarySuggestion ? [primarySuggestion] : []), ...alternatives];
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < allItems.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && allItems[selectedIndex]) {
          handleWeightSelect(allItems[selectedIndex].weight, allItems[selectedIndex].source as any);
        } else {
          saveEdit();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setIsEditing(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const startEdit = () => {
    setInputValue(value?.toString() || '');
    setIsEditing(true);
    setIsOpen(true);
  };

  const showClearButton = value > 0;

  // If editing, show HSN-style dropdown
  if (isEditing || isOpen) {
    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        <Popover
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setIsEditing(false);
              setSelectedIndex(-1);
            }
          }}
        >
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                ref={inputRef}
                type="number"
                step="0.01"
                min="0.01"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={() => {
                  if (!isOpen) {
                    setIsOpen(true);
                    setIsEditing(true);
                  }
                }}
                placeholder="Enter weight..."
                className={`
                  pr-20 text-sm
                  ${value > 0 ? 'font-medium text-gray-900' : 'text-gray-600'}
                `}
                autoFocus
              />

              {/* Right side icons */}
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 z-10">
                <span className="text-xs text-gray-500">kg</span>
                {showClearButton && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-gray-100 hover:text-gray-700 bg-gray-50 border border-gray-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setInputValue('');
                      onChange(0);
                      onSourceSelected?.('manual');
                    }}
                    title="Clear weight"
                  >
                    <X className="h-3 w-3 text-gray-600" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsOpen(!isOpen);
                    if (!isOpen) {
                      inputRef.current?.focus();
                    }
                  }}
                >
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </Button>
              </div>
            </div>
          </PopoverTrigger>

          <PopoverContent
            className="w-80 p-0 border border-gray-200 shadow-lg rounded-lg bg-white"
            align="center"
            sideOffset={4}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <Command className="rounded-lg">
              <CommandList className="max-h-48 overflow-y-auto">
                {/* All Weight Options in Single Row */}
                {(primarySuggestion || alternatives.length > 0) && (
                  <div className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {/* Primary Suggestion */}
                      {primarySuggestion && (
                        <button
                          onClick={() => handleWeightSelect(primarySuggestion.weight, primarySuggestion.source as any)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                        >
                          {getSourceIcon(primarySuggestion.source)}
                          <span className="font-medium text-sm text-gray-900">
                            {primarySuggestion.source === 'hsn' ? 'HSN' : primarySuggestion.source === 'ml' ? 'ML' : 'Hybrid'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {Math.round(primarySuggestion.confidence * 100)}%
                          </span>
                          <span className="font-bold text-sm text-blue-600">
                            {primarySuggestion.weight}kg
                          </span>
                        </button>
                      )}
                      
                      {/* Alternative Suggestions */}
                      {alternatives.map((alt, index) => (
                        <button
                          key={`alt-${alt.source}-${index}`}
                          onClick={() => handleWeightSelect(alt.weight, alt.source as any)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                        >
                          {getSourceIcon(alt.source)}
                          <span className="font-medium text-sm text-gray-900">
                            {alt.source === 'hsn' ? 'HSN' : alt.source === 'ml' ? 'ML' : 'Hybrid'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {Math.round(alt.confidence * 100)}%
                          </span>
                          <span className="font-bold text-sm text-gray-700">
                            {alt.weight}kg
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!primarySuggestion && alternatives.length === 0 && !isLoading && (
                  <CommandEmpty>
                    <div className="py-4 text-center">
                      <Scale className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                      <div className="text-xs font-medium text-gray-900">
                        No suggestions
                      </div>
                      <div className="text-xs text-gray-500">
                        Enter manually
                      </div>
                    </div>
                  </CommandEmpty>
                )}

                {/* Loading State */}
                {isLoading && (
                  <div className="flex items-center justify-center py-3">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-xs text-gray-600">Loading...</span>
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Display mode - shows like InlineEdit with hover effects
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div
        className="cursor-pointer hover:bg-blue-50 px-2 py-1 -mx-2 -my-1 rounded inline-flex items-center gap-1 group"
        onClick={startEdit}
      >
        <span>{value || '-'}</span>
        <span className="text-gray-500 text-xs">kg</span>
        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50" />
        {(primarySuggestion || alternatives.length > 0) && (
          <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-50 text-blue-600" />
        )}
      </div>
    </div>
  );
};