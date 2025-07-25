import React from 'react';
import { StripeWeightSelector } from './StripeWeightSelector';
import { SmartHSNSearch } from '@/components/admin/hsn-components/SmartHSNSearch';
import { cn } from '@/lib/utils';

interface WeightSuggestion {
  value: number;
  source: 'hsn' | 'ai';
  confidence: number;
  description: string;
}

interface HSNData {
  code: string;
  description: string;
}

interface HSNSuggestion extends HSNData {
  confidence?: number;
}

interface InlineStripeSelectorsProps {
  weight: number;
  weightSuggestions: WeightSuggestion[];
  onWeightChange: (weight: number, source: 'hsn' | 'ai' | 'manual') => void;
  currentHSN?: HSNData;
  hsnSuggestions?: HSNSuggestion[];
  onHSNSelect: (hsn: HSNData) => void;
  onHSNRemove?: () => void;
  className?: string;
}

export const InlineStripeSelectors: React.FC<InlineStripeSelectorsProps> = ({
  weight,
  weightSuggestions,
  onWeightChange,
  currentHSN,
  hsnSuggestions,
  onHSNSelect,
  onHSNRemove,
  className
}) => {
  return (
    <div className={cn('flex items-center gap-6 flex-wrap', className)}>
      <StripeWeightSelector
        weight={weight}
        suggestions={weightSuggestions}
        onWeightChange={onWeightChange}
      />
      
      <div className="h-8 w-px bg-gray-200" />
      
      <SmartHSNSearch
        currentHSNCode={currentHSN?.code}
        onSelect={(hsn) => onHSNSelect({ code: hsn.hsn_code, description: hsn.display_name })}
        compact={true}
        size="sm"
      />
    </div>
  );
};