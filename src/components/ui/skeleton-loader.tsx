import { ReactNode } from 'react';
import { Skeleton, SkeletonForm, SkeletonCard } from './skeleton';

interface SkeletonLoaderProps {
  isLoading: boolean;
  children: ReactNode;
  skeleton?: ReactNode;
  className?: string;
  type?: 'form' | 'card' | 'custom';
  formFields?: number;
}

/**
 * Wrapper component that shows skeleton while loading
 * Automatically swaps to children when loading is complete
 */
export function SkeletonLoader({
  isLoading,
  children,
  skeleton,
  className,
  type = 'custom',
  formFields = 4,
}: SkeletonLoaderProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  // If custom skeleton provided, use it
  if (skeleton) {
    return <>{skeleton}</>;
  }

  // Otherwise use predefined types
  switch (type) {
    case 'form':
      return <SkeletonForm fields={formFields} />;
    case 'card':
      return <SkeletonCard className={className} />;
    default:
      return <Skeleton className={className || "h-32 w-full"} />;
  }
}

/**
 * Hook to determine if multiple data sources are still loading
 */
export function useIsLoading(...loadingStates: boolean[]): boolean {
  return loadingStates.some(state => state);
}

/**
 * Component that shows skeleton until ALL conditions are met
 */
interface ConditionalSkeletonProps {
  conditions: Array<{
    data: any;
    isLoading: boolean;
  }>;
  children: ReactNode;
  skeleton?: ReactNode;
  minimumLoadTime?: number; // Minimum time to show skeleton (prevents flashing)
}

export function ConditionalSkeleton({
  conditions,
  children,
  skeleton,
  minimumLoadTime = 300,
}: ConditionalSkeletonProps) {
  const [minimumTimePassed, setMinimumTimePassed] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumTimePassed(true);
    }, minimumLoadTime);
    
    return () => clearTimeout(timer);
  }, [minimumLoadTime]);
  
  const allDataReady = conditions.every(
    condition => !condition.isLoading && condition.data !== undefined
  );
  
  const shouldShowContent = allDataReady && minimumTimePassed;
  
  if (!shouldShowContent) {
    return <>{skeleton || <SkeletonForm />}</>;
  }
  
  return <>{children}</>;
}

// Import React at component level
import * as React from 'react';