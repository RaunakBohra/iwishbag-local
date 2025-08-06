/**
 * Tax Calculation Steps Section
 * Handles the detailed step-by-step tax calculation display
 * Extracted from TaxCalculationDebugPanel for better maintainability
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Calculator, AlertTriangle, CheckCircle } from 'lucide-react';
import type { UnifiedQuote } from '@/types/unified-quote';

interface CalculationStep {
  label: string;
  formula: string;
  inputs: Array<{
    name: string;
    value: number | null;
    source: string;
    rate?: number;
  }>;
  calculation: string;
  result: number;
  notes: string;
}

interface TaxCalculationStepsSectionProps {
  quote: UnifiedQuote;
  calculationSteps: Record<string, CalculationStep>;
  liveHsnRates?: Record<string, any>;
  liveRouteRates?: any;
  isLoadingLiveData?: boolean;
  className?: string;
}

export const TaxCalculationStepsSection: React.FC<TaxCalculationStepsSectionProps> = ({
  quote,
  calculationSteps,
  liveHsnRates,
  liveRouteRates,
  isLoadingLiveData = false,
  className = '',
}) => {
  const [expandedSteps, setExpandedSteps] = React.useState<Set<string>>(new Set());
  
  const toggleStep = (stepKey: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepKey)) {
      newExpanded.delete(stepKey);
    } else {
      newExpanded.add(stepKey);
    }
    setExpandedSteps(newExpanded);
  };

  const breakdown = quote.calculation_data?.breakdown || {};
  
  // Check for data quality issues
  const hasDataIssues = !quote.items || quote.items.length === 0 || 
                       !quote.origin_country || !quote.destination_country;
  
  // Check for rate mismatches
  const hasRateMismatch = React.useMemo(() => {
    if (!liveHsnRates || !liveRouteRates) return false;
    
    const hsnMismatch = Object.values(liveHsnRates).some((r: any) => {
      const storedRate = quote.calculation_data?.tax_rates?.customs || 0;
      return Math.abs(r.customs - storedRate) > 0.1;
    });
    
    const routeMismatch = liveRouteRates?.customs && 
      Math.abs(liveRouteRates.customs - (quote.calculation_data?.operational_data?.customs?.smart_tier?.percentage || 0)) > 0.1;
    
    return hsnMismatch || routeMismatch;
  }, [liveHsnRates, liveRouteRates, quote]);

  const getStepStatus = (stepKey: string, step: CalculationStep) => {
    if (stepKey === 'customs' && hasRateMismatch) {
      return { status: 'warning', icon: AlertTriangle, color: 'text-orange-600' };
    }
    if (step.result > 0) {
      return { status: 'success', icon: CheckCircle, color: 'text-green-600' };
    }
    return { status: 'neutral', icon: Calculator, color: 'text-gray-600' };
  };

  const renderStepValue = (input: any) => {
    if (input.value === null) {
      return <span className="text-gray-500 italic">{input.source}</span>;
    }
    
    if (input.value === 0 && input.name.startsWith('├─')) {
      return <span className="text-blue-600 text-sm">{input.source}</span>;
    }
    
    if (typeof input.value === 'number') {
      if (input.name.includes('Rate') || input.name.includes('Percentage')) {
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {input.value.toFixed(2)}%
            </Badge>
            <span className="text-sm text-gray-600">{input.source}</span>
          </div>
        );
      } else {
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">
              ${input.value.toFixed(2)}
            </span>
            <span className="text-sm text-gray-600">{input.source}</span>
          </div>
        );
      }
    }
    
    return <span className="text-gray-600">{input.source}</span>;
  };

  const renderWarningInputs = (inputs: any[]) => {
    const warningInputs = inputs.filter(input => 
      input.name.includes('⚠️') || input.name.includes('WARNING')
    );
    
    if (warningInputs.length === 0) return null;
    
    return (
      <Alert className="mb-4 border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {warningInputs.map((input, idx) => (
            <div key={idx} className="text-orange-800">
              <strong>{input.name}:</strong> {input.source}
            </div>
          ))}
        </AlertDescription>
      </Alert>
    );
  };

  const renderMethodHierarchy = (inputs: any[]) => {
    const hierarchyInputs = inputs.filter(input => 
      input.name.includes('TAX METHOD') || input.name.includes('HOW IT WORKS') ||
      input.name.includes('ACTIVE METHOD') || input.name.startsWith('├─')
    );
    
    if (hierarchyInputs.length === 0) return null;
    
    return (
      <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
        <div className="space-y-2">
          {hierarchyInputs.map((input, idx) => {
            if (input.name.includes('🎭') || input.name.includes('📌') || input.name.includes('🎯')) {
              return (
                <div key={idx} className="font-semibold text-blue-900 border-b border-blue-200 pb-1">
                  {input.name}
                </div>
              );
            }
            
            if (input.name.startsWith('├─')) {
              return (
                <div key={idx} className="ml-4 text-sm text-blue-800 flex items-center gap-2">
                  <span className="text-blue-400">├─</span>
                  <span className="font-medium">{input.name.replace('├─ ', '')}</span>
                  {input.value !== 0 && (
                    <Badge variant="secondary" className="text-xs">{input.value}</Badge>
                  )}
                  <span className="text-blue-600">- {input.source}</span>
                </div>
              );
            }
            
            return (
              <div key={idx} className="text-sm text-blue-800">
                <span className="font-medium">{input.name}:</span> {input.source}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Data Quality Warnings */}
      {hasDataIssues && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            <strong>Data Quality Issues:</strong> Missing items, countries, or calculation data
          </AlertDescription>
        </Alert>
      )}
      
      {hasRateMismatch && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-orange-800">
            <strong>Rate Mismatch Detected:</strong> Live rates differ from stored rates. Recalculation recommended.
          </AlertDescription>
        </Alert>
      )}

      {/* Calculation Steps */}
      {Object.entries(calculationSteps).map(([stepKey, step]) => {
        const isExpanded = expandedSteps.has(stepKey);
        const stepStatus = getStepStatus(stepKey, step);
        const StatusIcon = stepStatus.icon;

        return (
          <Collapsible key={stepKey} open={isExpanded} onOpenChange={() => toggleStep(stepKey)}>
            <div className="border rounded-lg overflow-hidden">
              {/* Step Header */}
              <CollapsibleTrigger className="w-full p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`w-5 h-5 ${stepStatus.color}`} />
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{step.label}</h3>
                      <p className="text-sm text-gray-600">{step.formula}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono text-lg font-bold text-gray-900">
                        ${step.result.toFixed(2)}
                      </div>
                      {stepKey === 'customs' && hasRateMismatch && (
                        <Badge variant="outline" className="text-xs text-orange-600">
                          Rate Mismatch
                        </Badge>
                      )}
                    </div>
                    <div className="transition-transform duration-200">
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>

              {/* Step Details */}
              <CollapsibleContent>
                <div className="px-4 pb-4 border-t bg-gray-50">
                  {/* Warnings for this step */}
                  {stepKey === 'customs' && renderWarningInputs(step.inputs)}
                  
                  {/* Method hierarchy for customs step */}
                  {stepKey === 'customs' && renderMethodHierarchy(step.inputs)}
                  
                  {/* Calculation Formula */}
                  <div className="mb-4 p-3 bg-white rounded border">
                    <div className="text-sm font-medium text-gray-700 mb-2">Calculation:</div>
                    <div className="font-mono text-sm text-gray-900 bg-gray-100 p-2 rounded">
                      {step.calculation}
                    </div>
                  </div>

                  {/* Input Details */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-700">Input Breakdown:</h4>
                    {step.inputs
                      .filter(input => !input.name.includes('🎭') && !input.name.includes('📌') && !input.name.includes('⚠️'))
                      .map((input, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                        <div className="flex-1">
                          <span className={input.name.startsWith('├─') ? 'text-blue-700 font-medium' : 'font-medium text-gray-700'}>
                            {input.name}
                          </span>
                        </div>
                        <div className="flex-1 text-right">
                          {renderStepValue(input)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Step Notes */}
                  {step.notes && (
                    <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="text-sm text-blue-800">
                        <strong>Note:</strong> {step.notes}
                      </div>
                    </div>
                  )}

                  {/* Loading indicators for live data */}
                  {stepKey === 'customs' && isLoadingLiveData && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                      <div className="text-sm text-yellow-800 flex items-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
                        Loading live tax rates...
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
};