/**
 * Dual Weight Suggestions Component
 * 
 * Displays both HSN and ML weight suggestions side by side,
 * allowing admins to choose which weight to use for the quote.
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Tags, 
  Sparkles, 
  Scale, 
  Package,
  ArrowRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DualWeightSuggestionsProps {
  hsnWeight?: {
    average: number;
    min: number;
    max: number;
    packaging?: number;
    source: 'hsn';
    confidence: number;
  };
  mlWeight?: {
    estimated: number;
    confidence: number;
    reasoning: string[];
    source: 'ml';
  };
  currentWeight?: number;
  onSelectWeight: (weight: number, source: 'hsn' | 'ml') => void;
  isLoading?: boolean;
}

export const DualWeightSuggestions: React.FC<DualWeightSuggestionsProps> = ({
  hsnWeight,
  mlWeight,
  currentWeight,
  onSelectWeight,
  isLoading = false
}) => {
  if (!hsnWeight && !mlWeight) return null;

  const isHSNSelected = currentWeight === hsnWeight?.average;
  const isMLSelected = currentWeight === mlWeight?.estimated;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center space-x-2 text-sm font-medium text-gray-900">
        <Scale className="w-4 h-4 text-teal-600" />
        <span>Weight Suggestions</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* HSN Weight Suggestion */}
        {hsnWeight && (
          <Card
            className={cn(
              "p-4 cursor-pointer transition-all duration-200 hover:shadow-md",
              "border border-gray-200 bg-white",
              isHSNSelected 
                ? "border-teal-500 bg-teal-50 shadow-sm" 
                : "hover:border-teal-300 hover:bg-gray-50"
            )}
            onClick={() => onSelectWeight(hsnWeight.average, 'hsn')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className={cn(
                  "p-2.5 rounded-lg flex-shrink-0",
                  isHSNSelected ? "bg-teal-100" : "bg-gray-100"
                )}>
                  <Tags className={cn(
                    "w-5 h-5",
                    isHSNSelected ? "text-teal-600" : "text-gray-500"
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-gray-900">HSN Database</h4>
                    <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
                      Official Data
                    </Badge>
                    {isHSNSelected && (
                      <CheckCircle className="w-4 h-4 text-teal-600" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 mb-2">
                    <span className="text-lg font-bold text-gray-900">
                      {hsnWeight.average} kg
                    </span>
                    <span className="text-sm text-gray-600">
                      Range: {hsnWeight.min}-{hsnWeight.max} kg
                    </span>
                  </div>
                  
                  {hsnWeight.packaging && hsnWeight.packaging > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                      <Package className="w-4 h-4" />
                      <span>+{hsnWeight.packaging} kg packaging weight</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-teal-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${hsnWeight.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 font-medium">
                      {(hsnWeight.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>
              </div>
              
              <ArrowRight className={cn(
                "w-5 h-5 ml-3 flex-shrink-0",
                isHSNSelected ? "text-teal-600" : "text-gray-400"
              )} />
            </div>
          </Card>
        )}

        {/* ML Weight Suggestion */}
        {mlWeight && (
          <Card
            className={cn(
              "p-4 cursor-pointer transition-all duration-200 hover:shadow-md",
              "border border-gray-200 bg-white",
              isMLSelected 
                ? "border-teal-500 bg-teal-50 shadow-sm" 
                : "hover:border-teal-300 hover:bg-gray-50"
            )}
            onClick={() => onSelectWeight(mlWeight.estimated, 'ml')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className={cn(
                  "p-2.5 rounded-lg flex-shrink-0",
                  isMLSelected ? "bg-teal-100" : "bg-gray-100"
                )}>
                  <Sparkles className={cn(
                    "w-5 h-5",
                    isMLSelected ? "text-teal-600" : "text-gray-500"
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-gray-900">AI Estimation</h4>
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        mlWeight.confidence > 0.7 
                          ? "bg-blue-100 text-blue-800 border-blue-200" 
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      )}
                    >
                      {mlWeight.confidence > 0.7 ? "High" : "Medium"} Confidence
                    </Badge>
                    {isMLSelected && (
                      <CheckCircle className="w-4 h-4 text-teal-600" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 mb-2">
                    <span className="text-lg font-bold text-gray-900">
                      {mlWeight.estimated} kg
                    </span>
                    <span className="text-sm text-gray-600">
                      ML Analyzed
                    </span>
                  </div>
                  
                  {mlWeight.reasoning && mlWeight.reasoning.length > 0 && (
                    <div className="text-sm text-gray-600 mb-2 italic">
                      {mlWeight.reasoning[0]}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-teal-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${mlWeight.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 font-medium">
                      {(mlWeight.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>
              </div>
              
              <ArrowRight className={cn(
                "w-5 h-5 ml-3 flex-shrink-0",
                isMLSelected ? "text-teal-600" : "text-gray-400"
              )} />
            </div>
          </Card>
        )}
      </div>

      {/* Recommendation Note */}
      {hsnWeight && mlWeight && (
        <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <AlertCircle className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700">
            {Math.abs(hsnWeight.average - mlWeight.estimated) > 0.5 ? (
              <>
                <span className="font-semibold text-slate-900">Significant difference detected.</span>
                <br />
                HSN database suggests <strong>{hsnWeight.average}kg</strong> while AI estimates <strong>{mlWeight.estimated}kg</strong>. 
                Consider reviewing the product details or using HSN data for accuracy.
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-900">Estimates are aligned.</span>
                <br />
                Both sources suggest similar weights ({hsnWeight.average}kg vs {mlWeight.estimated}kg), 
                indicating reliable weight estimates.
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
        <span>Click a suggestion to apply, or enter weight manually</span>
      </div>
    </div>
  );
};