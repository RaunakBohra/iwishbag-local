import React from 'react';
import { convertWeight, getDisplayWeight } from '@/lib/weightUtils';

interface WeightDisplayProps {
  weight: number | null | undefined;
  routeWeightUnit?: string | null;
  showOriginal?: boolean;
  compact?: boolean;
  className?: string;
}

export const WeightDisplay: React.FC<WeightDisplayProps> = ({
  weight,
  routeWeightUnit,
  showOriginal = true,
  compact = false,
  className = ''
}) => {
  const displayWeight = getDisplayWeight(weight, routeWeightUnit);
  const isConverted = routeWeightUnit && routeWeightUnit !== 'kg';

  if (compact) {
    return (
      <span className={className}>
        {displayWeight.value.toFixed(2)} {displayWeight.unit.toUpperCase()}
        {isConverted && <span className="text-xs text-blue-600 ml-1">(Route)</span>}
      </span>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="font-semibold">
        {displayWeight.value.toFixed(2)} {displayWeight.unit.toUpperCase()}
        {isConverted && (
          <span className="text-xs text-blue-600 ml-1">
            (Route Unit)
          </span>
        )}
      </div>
      {showOriginal && isConverted && (
        <div className="text-xs text-muted-foreground">
          Original: {displayWeight.originalValue.toFixed(2)} {displayWeight.originalUnit.toUpperCase()}
        </div>
      )}
    </div>
  );
}; 