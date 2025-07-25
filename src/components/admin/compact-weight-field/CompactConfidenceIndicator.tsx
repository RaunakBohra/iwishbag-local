import React from 'react';
import { cn } from '@/lib/utils';

interface CompactConfidenceIndicatorProps {
  confidence: number;
  size?: 'sm' | 'md';
  showPercentage?: boolean;
  className?: string;
}

export const CompactConfidenceIndicator: React.FC<CompactConfidenceIndicatorProps> = ({
  confidence,
  size = 'sm',
  showPercentage = false,
  className
}) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const percentage = Math.round(confidence * 100);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div 
        className={cn(
          'rounded-full flex-shrink-0',
          dotSize,
          getConfidenceColor(confidence)
        )}
        title={`${percentage}% confidence`}
      />
      {showPercentage && (
        <span className="text-xs text-gray-600 font-medium">
          {percentage}%
        </span>
      )}
    </div>
  );
};