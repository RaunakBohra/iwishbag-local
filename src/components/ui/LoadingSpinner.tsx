/**
 * LoadingSpinner - Performance-optimized loading component
 * 
 * Features:
 * - Multiple sizes
 * - Accessibility support
 * - Low CPU usage animation
 * - Theme-aware styling
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { OptimizedIcon } from './OptimizedIcon';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6', 
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  text
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center space-y-2', className)}>
      <OptimizedIcon 
        name="Loader2" 
        className={cn(
          'animate-spin text-primary',
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

// Skeleton loading component for better UX
export const SkeletonLoader: React.FC<{
  className?: string;
  count?: number;
}> = ({ className, count = 1 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className={cn(
            'h-4 bg-muted rounded animate-pulse',
            className
          )}
        />
      ))}
    </div>
  );
};

export default LoadingSpinner;