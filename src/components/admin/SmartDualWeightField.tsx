// ============================================================================
// SMART DUAL WEIGHT FIELD - Shows HSN + ML weight suggestions
// Features: Dual source display, confidence indicators, source selection tracking
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';
import { 
  Scale, 
  Brain, 
  Sparkles, 
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  AlertCircle,
  Target,
  Package,
} from 'lucide-react';
import { leanWeightService, type WeightPrediction } from '@/services/LeanWeightService';
import { cn } from '@/lib/utils';

interface SmartDualWeightFieldProps {
  value: number;
  onChange: (weight: number) => void;
  productName: string;
  hsnCode?: string;
  productUrl?: string;
  label?: string;
  required?: boolean;
  className?: string;
  onSourceSelected?: (source: 'hsn' | 'ml' | 'manual') => void;
  showDebug?: boolean;
}

export const SmartDualWeightField: React.FC<SmartDualWeightFieldProps> = ({
  value,
  onChange,
  productName,
  hsnCode,
  productUrl,
  label = 'Weight (kg)',
  required = false,
  className,
  onSourceSelected,
  showDebug = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [primarySuggestion, setPrimarySuggestion] = useState<WeightPrediction | null>(null);
  const [alternatives, setAlternatives] = useState<WeightPrediction[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const [selectedSource, setSelectedSource] = useState<'hsn' | 'ml' | 'manual'>('manual');

  // Fetch weight suggestions
  useEffect(() => {
    console.log('🎯 SmartDualWeightField - Effect triggered:', {
      productName,
      hsnCode,
      productUrl,
      hasProductName: !!productName,
      hasHsnCode: !!hsnCode
    });
    
    if (!productName && !hsnCode) {
      console.log('📋 SmartDualWeightField - No product name or HSN code, clearing suggestions');
      setPrimarySuggestion(null);
      setAlternatives([]);
      return;
    }

    const fetchSuggestions = async () => {
      console.log('🔄 SmartDualWeightField - Starting to fetch suggestions...');
      setIsLoading(true);
      try {
        console.log('📡 SmartDualWeightField - Calling leanWeightService.getWeightSuggestions with:', { 
          productName, 
          hsnCode, 
          productUrl 
        });
        
        const suggestions = await leanWeightService.getWeightSuggestions(
          productName,
          hsnCode,
          productUrl
        );
        
        console.log('✅ SmartDualWeightField - Suggestions received:', {
          primary: suggestions.primary ? {
            weight: suggestions.primary.weight,
            source: suggestions.primary.source,
            confidence: suggestions.primary.confidence
          } : null,
          alternativesCount: suggestions.alternatives.length,
          alternatives: suggestions.alternatives.map(alt => ({
            weight: alt.weight,
            source: alt.source,
            confidence: alt.confidence
          }))
        });
        
        setPrimarySuggestion(suggestions.primary);
        setAlternatives(suggestions.alternatives);
      } catch (error) {
        console.error('❌ SmartDualWeightField - Error fetching suggestions:', error);
      } finally {
        setIsLoading(false);
        console.log('🏁 SmartDualWeightField - Fetch complete');
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [productName, hsnCode, productUrl]);

  // Handle weight selection
  const handleSelectWeight = async (weight: number, source: 'hsn' | 'ml' | 'manual') => {
    setInputValue(weight.toString());
    onChange(weight);
    setSelectedSource(source);
    
    if (onSourceSelected) {
      onSourceSelected(source);
    }

    // Record selection for analytics
    if (productName) {
      await leanWeightService.recordWeightSelection({
        productName,
        hsnCode,
        selectedWeight: weight,
        selectedSource: source,
        hsnWeight: primarySuggestion?.hsnWeight,
        mlWeight: primarySuggestion?.mlWeight || alternatives.find(a => a.source === 'ml')?.mlWeight,
        timestamp: new Date(),
      });
    }
  };

  // Handle manual input
  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    const weight = parseFloat(value);
    if (!isNaN(weight) && weight > 0) {
      onChange(weight);
      setSelectedSource('manual');
      if (onSourceSelected) {
        onSourceSelected('manual');
      }
    }
  };

  // Get source icon
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'hsn':
        return <Package className="w-4 h-4" />;
      case 'ml':
        return <Brain className="w-4 h-4" />;
      case 'hybrid':
        return <Sparkles className="w-4 h-4" />;
      case 'pattern':
        return <Target className="w-4 h-4" />;
      default:
        return <Scale className="w-4 h-4" />;
    }
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-blue-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get source label
  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'hsn':
        return 'HSN Database';
      case 'ml':
        return 'ML Prediction';
      case 'hybrid':
        return 'HSN + Modifiers';
      case 'pattern':
        return 'Pattern Match';
      default:
        return source;
    }
  };

  return (
    <div className={cn('space-y-2', className?.includes('compact-mode') ? 'space-y-1' : 'space-y-2', className)}>
      <div className="flex items-center justify-between">
        {label && (
          <Label htmlFor="weight" className="flex items-center gap-1">
            <Scale className="w-4 h-4" />
            {label}
            {required && <span className="text-red-500">*</span>}
          </Label>
        )}
        
        {primarySuggestion && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="h-6 px-2 text-xs"
                >
                  {getSourceIcon(primarySuggestion.source)}
                  <span className="ml-1">{getSourceLabel(primarySuggestion.source)}</span>
                  <Badge
                    variant="outline"
                    className={cn('ml-1', getConfidenceColor(primarySuggestion.confidence))}
                  >
                    {Math.round(primarySuggestion.confidence * 100)}%
                  </Badge>
                  {showDetails ? (
                    <ChevronUp className="w-3 h-3 ml-1" />
                  ) : (
                    <ChevronDown className="w-3 h-3 ml-1" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to see weight suggestions</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className={cn(
        'relative flex items-center gap-2',
        className?.includes('compact-mode') && 'inline-flex'
      )}>
        {className?.includes('compact-mode') && (
          <span className="text-gray-500 text-xs font-medium min-w-[40px]">WEIGHT</span>
        )}
        <div className="flex items-center bg-white border border-gray-200 rounded px-2 py-1 flex-1">
          <Scale className="w-3 h-3 text-gray-400" />
          <Input
            id="weight"
            type="number"
            step="0.01"
            min="0.01"
            value={inputValue}
            onChange={handleManualInput}
            placeholder={primarySuggestion ? `${primarySuggestion.weight}` : '0.00'}
            required={required}
            className={cn(
              'w-20 h-8 border-0 p-0 text-sm font-medium ml-1',
              primarySuggestion && Math.abs(parseFloat(inputValue) - primarySuggestion.weight) > primarySuggestion.weight * 0.3
                ? 'text-yellow-600'
                : ''
            )}
          />
          <span className="text-xs text-gray-400 ml-1">kg</span>
        </div>
        
        {primarySuggestion && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectWeight(primarySuggestion.weight, primarySuggestion.source as any)}
                  className={cn(
                    'text-xs',
                    className?.includes('compact-mode') 
                      ? 'h-7 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700' 
                      : 'h-7 px-2'
                  )}
                >
                  {className?.includes('compact-mode') 
                    ? `${primarySuggestion.weight}kg`
                    : `Use ${primarySuggestion.weight}kg`
                  }
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to use {getSourceLabel(primarySuggestion.source)} suggestion</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Weight Suggestions Details */}
      {showDetails && (primarySuggestion || alternatives.length > 0) && (
        <Card className="p-3 space-y-3 bg-gray-50">
          {/* Primary Suggestion */}
          {primarySuggestion && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getSourceIcon(primarySuggestion.source)}
                  <span className="font-medium text-sm">
                    {getSourceLabel(primarySuggestion.source)}
                  </span>
                  <Badge
                    variant={selectedSource === primarySuggestion.source ? 'default' : 'outline'}
                    className={cn('text-xs', getConfidenceColor(primarySuggestion.confidence))}
                  >
                    {Math.round(primarySuggestion.confidence * 100)}% confidence
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant={selectedSource === primarySuggestion.source ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSelectWeight(primarySuggestion.weight, primarySuggestion.source as any)}
                  className="h-7"
                >
                  <Check className="w-3 h-3 mr-1" />
                  {primarySuggestion.weight} kg
                </Button>
              </div>
              
              {primarySuggestion.modifiers.length > 0 && (
                <div className="text-xs text-gray-600">
                  Modifiers: {primarySuggestion.modifiers.join(', ')}
                </div>
              )}
              
              {showDebug && primarySuggestion.reasoning.length > 0 && (
                <div className="text-xs text-gray-500 space-y-1">
                  {primarySuggestion.reasoning.map((reason, idx) => (
                    <div key={idx} className="flex items-start gap-1">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Alternative Suggestions */}
          {alternatives.length > 0 && (
            <div className="border-t pt-2 space-y-2">
              <div className="text-xs font-medium text-gray-600">Alternative suggestions:</div>
              {alternatives.map((alt, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getSourceIcon(alt.source)}
                    <span className="text-sm">{getSourceLabel(alt.source)}</span>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', getConfidenceColor(alt.confidence))}
                    >
                      {Math.round(alt.confidence * 100)}%
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectWeight(alt.weight, alt.source as any)}
                    className="h-6 text-xs"
                  >
                    {alt.weight} kg
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Weight Range Info */}
          {primarySuggestion?.hsnWeight && hsnCode && (
            <div className="border-t pt-2">
              <div className="flex items-start gap-1 text-xs text-gray-600">
                <AlertCircle className="w-3 h-3 mt-0.5" />
                <span>
                  HSN {hsnCode} typical weight: {primarySuggestion.hsnWeight} kg
                  {primarySuggestion.source === 'hybrid' && ' (adjusted for product specifics)'}
                </span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900"></div>
          <span>Analyzing weight...</span>
        </div>
      )}
    </div>
  );
};