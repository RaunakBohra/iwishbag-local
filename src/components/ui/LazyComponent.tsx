/**
 * LazyComponent - Component-level lazy loading system
 * 
 * Implements intelligent component-level lazy loading for heavy components
 * that aren't needed immediately on page load. Includes intersection-based
 * loading, skeleton fallbacks, and performance tracking.
 */

import React, { Suspense, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  minHeight?: number;
}

/**
 * LazyComponent wrapper that loads children only when they come into view
 */
export const LazyComponent: React.FC<LazyComponentProps> = ({
  children,
  fallback: Fallback,
  threshold = 0.1,
  rootMargin = '100px',
  enabled = true,
  onLoad,
  onError,
  className,
  minHeight = 200,
}) => {
  const [isInView, setIsInView] = useState(!enabled);
  const [hasError, setHasError] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          onLoad?.();
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [enabled, isInView, threshold, rootMargin, onLoad]);

  // Error handling
  const handleError = (error: Error) => {
    setHasError(true);
    onError?.(error);
  };

  if (hasError) {
    return (
      <div 
        className={cn("flex items-center justify-center text-gray-500", className)}
        style={{ minHeight }}
      >
        <p>Failed to load component</p>
      </div>
    );
  }

  if (!isInView) {
    return (
      <div 
        ref={elementRef}
        className={cn(className)}
        style={{ minHeight }}
      >
        {Fallback ? <Fallback /> : <div className="bg-gray-100 animate-pulse rounded" style={{ height: minHeight }} />}
      </div>
    );
  }

  return (
    <div className={className}>
      <ErrorBoundary onError={handleError}>
        {children}
      </ErrorBoundary>
    </div>
  );
};

/**
 * Error boundary for lazy components
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null; // Let parent handle error display
    }

    return this.props.children;
  }
}

/**
 * Pre-configured lazy components for common use cases
 */

// Heavy data tables
export const LazyDataTable: React.FC<{ 
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <LazyComponent
    fallback={() => (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
        ))}
      </div>
    )}
    minHeight={300}
    className={className}
  >
    {children}
  </LazyComponent>
);

// Complex forms
export const LazyForm: React.FC<{ 
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <LazyComponent
    fallback={() => (
      <div className="animate-pulse space-y-6 max-w-md">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-100 rounded w-1/4"></div>
            <div className="h-10 bg-gray-100 rounded"></div>
          </div>
        ))}
        <div className="h-10 bg-blue-200 rounded"></div>
      </div>
    )}
    minHeight={400}
    className={className}
  >
    {children}
  </LazyComponent>
);

// Chart components
export const LazyChart: React.FC<{ 
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <LazyComponent
    fallback={() => (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    )}
    minHeight={300}
    className={className}
  >
    {children}
  </LazyComponent>
);

// Modal content
export const LazyModal: React.FC<{ 
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <LazyComponent
    enabled={false} // Modals should load immediately when triggered
    className={className}
  >
    {children}
  </LazyComponent>
);

/**
 * Hook for creating lazy-loaded components dynamically
 */
export const useLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    fallback?: React.ComponentType;
    threshold?: number;
    rootMargin?: string;
  } = {}
) => {
  const [Component, setComponent] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadComponent = async () => {
    if (Component || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const { default: LoadedComponent } = await importFn();
      setComponent(() => LoadedComponent);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load component'));
    } finally {
      setIsLoading(false);
    }
  };

  const LazyWrapper: React.FC<React.ComponentProps<T>> = (props) => (
    <LazyComponent
      {...options}
      onLoad={loadComponent}
      onError={setError}
    >
      {Component ? (
        <Component {...props} />
      ) : error ? (
        <div className="text-red-500 text-center p-4">
          Failed to load component: {error.message}
        </div>
      ) : (
        options.fallback ? <options.fallback /> : <div>Loading...</div>
      )}
    </LazyComponent>
  );

  return LazyWrapper;
};

/**
 * Performance metrics for lazy component loading
 */
class LazyComponentMetrics {
  private loadTimes = new Map<string, number>();
  private loadCounts = new Map<string, number>();
  private totalComponents = 0;

  recordLoad(componentName: string, loadTime: number) {
    this.loadTimes.set(componentName, loadTime);
    this.loadCounts.set(componentName, (this.loadCounts.get(componentName) || 0) + 1);
    this.totalComponents++;
  }

  getMetrics() {
    const components = Array.from(this.loadTimes.entries());
    const averageLoadTime = components.length > 0
      ? components.reduce((sum, [, time]) => sum + time, 0) / components.length
      : 0;

    return {
      totalComponents: this.totalComponents,
      uniqueComponents: this.loadTimes.size,
      averageLoadTime: Math.round(averageLoadTime),
      componentStats: components.map(([name, time]) => ({
        name,
        loadTime: time,
        loadCount: this.loadCounts.get(name) || 0,
      })),
    };
  }

  logReport() {
    const metrics = this.getMetrics();
    
    console.group('🧩 Lazy Component Performance Report');
    console.log(`📊 Total Components Loaded: ${metrics.totalComponents}`);
    console.log(`🎯 Unique Components: ${metrics.uniqueComponents}`);
    console.log(`⏱️ Average Load Time: ${metrics.averageLoadTime}ms`);
    
    if (metrics.componentStats.length > 0) {
      console.table(metrics.componentStats);
    }
    
    console.groupEnd();
  }
}

export const lazyComponentMetrics = new LazyComponentMetrics();

// Auto-log metrics in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      lazyComponentMetrics.logReport();
    }, 5000);
  });
}

export default LazyComponent;