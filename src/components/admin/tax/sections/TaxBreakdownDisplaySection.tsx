/**
 * Tax Breakdown Display Section
 * Handles the display of calculation breakdowns and per-item tax details
 * Extracted from TaxCalculationDebugPanel for better maintainability
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, FileText, Hash, Calculator, Info } from 'lucide-react';
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

interface TaxBreakdownDisplaySectionProps {
  quote: UnifiedQuote;
  calculationSteps: Record<string, CalculationStep>;
  expandedSections: Set<string>;
  onToggleSection: (key: string) => void;
  className?: string;
}

export const TaxBreakdownDisplaySection: React.FC<TaxBreakdownDisplaySectionProps> = ({
  quote,
  calculationSteps,
  expandedSections,
  onToggleSection,
  className = '',
}) => {
  const breakdown = quote.calculation_data?.breakdown || {};
  const itemBreakdowns = quote.calculation_data?.item_breakdowns || [];

  const DebugSection = ({ 
    step, 
    sectionKey 
  }: { 
    step: CalculationStep; 
    sectionKey: string;
  }) => {
    const isOpen = expandedSections.has(sectionKey);
    
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => onToggleSection(sectionKey)}
        >
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-gray-600" />
            <h4 className="font-semibold text-sm">{step.label}</h4>
            <Badge variant="outline" className="text-xs">
              ${step.result.toFixed(2)}
            </Badge>
          </div>
          {isOpen ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m18 15-6-6-6 6"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          )}
        </div>
        
        {isOpen && (
          <div className="mt-4 space-y-3">
            {/* Formula */}
            <div className="bg-white rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-3 h-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">Formula</span>
              </div>
              <code className="text-xs bg-gray-100 p-2 rounded block font-mono">
                {step.formula}
              </code>
            </div>

            {/* Inputs */}
            <div className="bg-white rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-3 h-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">Input Values</span>
              </div>
              <div className="space-y-2">
                {step.inputs.map((input, idx) => {
                  const isItemBreakdown = input.name.startsWith('├─');
                  const isSection = input.name.includes('🎭') || input.name.includes('📌') || input.name.includes('⚠️');
                  
                  // Skip section headers in the regular input display
                  if (isSection) return null;
                  
                  return (
                    <div key={idx} className={`flex items-center justify-between text-xs ${isItemBreakdown ? 'ml-4 pt-1' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className={`${isItemBreakdown ? 'text-gray-500' : 'text-gray-600'}`}>
                          {input.name}:
                        </span>
                        {input.rate !== undefined && (
                          <Badge variant="secondary" className="text-xs">
                            {(() => {
                              const rate = typeof input.rate === 'string' ? parseFloat(input.rate) : input.rate;
                              return rate >= 1 ? `${rate.toFixed(1)}%` : `${(rate * 100).toFixed(1)}%`;
                            })()}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {input.value !== null && input.value !== undefined ? (
                          <span className="font-mono font-medium">${Number(input.value).toFixed(2)}</span>
                        ) : null}
                        <span className="text-gray-400 text-xs">({input.source})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calculation */}
            <div className="bg-white rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-3 h-3 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">Calculation</span>
              </div>
              <code className="text-xs bg-gray-100 p-2 rounded block font-mono overflow-x-auto">
                {step.calculation}
              </code>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-600">Result:</span>
                <span className="font-mono font-semibold text-sm">${step.result.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {step.notes && (
              <div className="bg-blue-50 rounded p-3">
                <div className="flex items-center gap-2">
                  <Info className="w-3 h-3 text-blue-600" />
                  <span className="text-xs text-blue-800">{step.notes}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-xs text-gray-600">Base Cost</div>
          <div className="text-lg font-semibold font-mono">
            ${(breakdown.items_total || 0).toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-xs text-gray-600">Total Taxes</div>
          <div className="text-lg font-semibold font-mono text-red-600">
            ${((breakdown.purchase_tax || 0) + (breakdown.customs || 0) + 
               (breakdown.sales_tax || 0) + (breakdown.destination_tax || 0)).toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-xs text-gray-600">Fees & Shipping</div>
          <div className="text-lg font-semibold font-mono text-blue-600">
            ${((breakdown.shipping || 0) + (breakdown.fees || 0) + 
               (breakdown.handling || 0) + (breakdown.insurance || 0)).toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-xs text-gray-600">Final Total</div>
          <div className="text-lg font-semibold font-mono text-green-600">
            ${(quote.total || 0).toFixed(2)}
          </div>
        </div>
      </div>

      <Separator />

      {/* Detailed Calculations */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          Step-by-Step Calculations
        </h3>
        
        <div className="space-y-3">
          {Object.entries(calculationSteps).map(([key, step]) => (
            <DebugSection key={key} step={step} sectionKey={key} />
          ))}
        </div>
      </div>

      {/* Item-Level Breakdowns */}
      {itemBreakdowns.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Package className="w-4 h-4" />
              Per-Item Tax Breakdowns
            </h3>
            <div className="grid gap-3">
              {itemBreakdowns.map((itemBreakdown: any, idx: number) => {
                const item = quote.items?.find(i => i.id === itemBreakdown.item_id);
                return (
                  <div key={idx} className="bg-white rounded-lg p-3 text-xs border">
                    <div className="font-medium mb-2">
                      {item?.product_name || `Item ${idx + 1}`}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-gray-600">
                      <div>
                        <span className="block">Customs</span>
                        <span className="font-mono">${(itemBreakdown.customs || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block">Sales Tax</span>
                        <span className="font-mono">${(itemBreakdown.sales_tax || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block">Dest. Tax</span>
                        <span className="font-mono">${(itemBreakdown.destination_tax || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block">Total Tax</span>
                        <span className="font-mono font-semibold">
                          ${((itemBreakdown.customs || 0) + (itemBreakdown.sales_tax || 0) + 
                             (itemBreakdown.destination_tax || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};