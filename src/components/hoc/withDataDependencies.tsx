import React, { ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface DataDependency {
  data: any;
  isLoading: boolean;
  error?: any;
  name?: string;
}

interface WithDataDependenciesOptions {
  dependencies: DataDependency[];
  loadingComponent?: React.ReactNode;
  errorComponent?: (errors: Record<string, any>) => React.ReactNode;
  minLoadTime?: number; // Minimum time to show loading state (prevents flashing)
}

/**
 * Higher-Order Component that ensures all data dependencies are loaded
 * before rendering the wrapped component
 */
export function withDataDependencies<P extends object>(
  Component: ComponentType<P>,
  options: WithDataDependenciesOptions
) {
  return function WithDataDependenciesWrapper(props: P) {
    const [hasMinLoadTimePassed, setHasMinLoadTimePassed] = React.useState(
      !options.minLoadTime
    );

    React.useEffect(() => {
      if (options.minLoadTime && !hasMinLoadTimePassed) {
        const timer = setTimeout(() => {
          setHasMinLoadTimePassed(true);
        }, options.minLoadTime);
        return () => clearTimeout(timer);
      }
    }, []);

    // Check loading states
    const isAnyLoading = options.dependencies.some(dep => dep.isLoading);
    const errors = options.dependencies.reduce((acc, dep) => {
      if (dep.error && dep.name) {
        acc[dep.name] = dep.error;
      }
      return acc;
    }, {} as Record<string, any>);
    
    const hasErrors = Object.keys(errors).length > 0;
    const allDataLoaded = options.dependencies.every(
      dep => !dep.isLoading && dep.data !== null && dep.data !== undefined
    );

    // Show loading state
    if (isAnyLoading || !hasMinLoadTimePassed || !allDataLoaded) {
      return (
        <>
          {options.loadingComponent || (
            <div className="space-y-4 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
        </>
      );
    }

    // Show error state
    if (hasErrors && options.errorComponent) {
      return <>{options.errorComponent(errors)}</>;
    }

    // All data loaded, render component
    return <Component {...props} />;
  };
}

/**
 * Hook version of withDataDependencies
 */
export function useDataDependencies(dependencies: DataDependency[]): {
  isReady: boolean;
  isLoading: boolean;
  errors: Record<string, any>;
  hasErrors: boolean;
} {
  const isLoading = dependencies.some(dep => dep.isLoading);
  
  const errors = dependencies.reduce((acc, dep) => {
    if (dep.error && dep.name) {
      acc[dep.name] = dep.error;
    }
    return acc;
  }, {} as Record<string, any>);
  
  const hasErrors = Object.keys(errors).length > 0;
  
  const isReady = dependencies.every(
    dep => !dep.isLoading && dep.data !== null && dep.data !== undefined
  );

  return {
    isReady,
    isLoading,
    errors,
    hasErrors,
  };
}