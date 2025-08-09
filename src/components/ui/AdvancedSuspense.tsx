/**
 * Advanced Suspense Component
 * 
 * Enhanced Suspense wrapper with intelligent loading states,
 * error boundaries, and performance optimization for route splitting.
 */

import React, { Suspense, useState, useEffect } from 'react';
import { RouteLoadingComponent } from '@/utils/routeCodeSplitting';

interface AdvancedSuspenseProps {
  children: React.ReactNode;
  category?: 'admin' | 'auth' | 'dashboard' | 'public' | 'demo' | 'payment';
  fallback?: React.ReactNode;
  minLoadingTime?: number; // Minimum loading time to prevent flash
  timeout?: number; // Max time before showing timeout message
  onLoadingStart?: () => void;
  onLoadingEnd?: () => void;
  onTimeout?: () => void;
}

interface LoadingState {
  isLoading: boolean;
  hasTimedOut: boolean;
  startTime: number;
}

export const AdvancedSuspense: React.FC<AdvancedSuspenseProps> = ({
  children,
  category = 'public',
  fallback,
  minLoadingTime = 150, // Prevent loading flash for fast loads
  timeout = 10000, // 10 second timeout
  onLoadingStart,
  onLoadingEnd,
  onTimeout,
}) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    hasTimedOut: false,
    startTime: 0,
  });

  const [showLoading, setShowLoading] = useState(false);

  // Handle loading state changes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let minLoadingTimeoutId: NodeJS.Timeout;

    if (loadingState.isLoading) {
      onLoadingStart?.();

      // Show loading after minimum time to prevent flash
      minLoadingTimeoutId = setTimeout(() => {
        setShowLoading(true);
      }, 50);

      // Set timeout for loading
      timeoutId = setTimeout(() => {
        setLoadingState(prev => ({ ...prev, hasTimedOut: true }));
        onTimeout?.();
      }, timeout);
    } else {
      onLoadingEnd?.();
      setShowLoading(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (minLoadingTimeoutId) clearTimeout(minLoadingTimeoutId);
    };
  }, [loadingState.isLoading, timeout, onLoadingStart, onLoadingEnd, onTimeout]);

  // Custom fallback component
  const renderFallback = () => {
    if (!showLoading) {
      return null; // Prevent loading flash
    }

    if (loadingState.hasTimedOut) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Taking Too Long</h3>
            <p className="text-gray-600 mb-4">This page is taking longer than expected to load.</p>
            <div className="space-y-2">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Reload Page
              </button>
              <button 
                onClick={() => window.history.back()} 
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    return <RouteLoadingComponent category={category} />;
  };

  return (
    <SuspenseWithLoadingTracking
      fallback={renderFallback()}
      onLoadingStart={() => setLoadingState({ isLoading: true, hasTimedOut: false, startTime: Date.now() })}
      onLoadingEnd={() => setLoadingState(prev => ({ ...prev, isLoading: false }))}
    >
      {children}
    </SuspenseWithLoadingTracking>
  );
};

// Custom Suspense component that tracks loading state
interface SuspenseWithLoadingTrackingProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onLoadingStart: () => void;
  onLoadingEnd: () => void;
}

const SuspenseWithLoadingTracking: React.FC<SuspenseWithLoadingTrackingProps> = ({
  children,
  fallback,
  onLoadingStart,
  onLoadingEnd,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Track when Suspense starts/stops loading
  useEffect(() => {
    if (isLoading) {
      onLoadingStart();
    } else {
      onLoadingEnd();
    }
  }, [isLoading, onLoadingStart, onLoadingEnd]);

  return (
    <Suspense
      fallback={
        <LoadingTracker onLoadingChange={setIsLoading}>
          {fallback}
        </LoadingTracker>
      }
    >
      <LoadingTracker onLoadingChange={() => setIsLoading(false)}>
        {children}
      </LoadingTracker>
    </Suspense>
  );
};

// Component to track loading state
interface LoadingTrackerProps {
  children: React.ReactNode;
  onLoadingChange: (loading: boolean) => void;
}

const LoadingTracker: React.FC<LoadingTrackerProps> = ({
  children,
  onLoadingChange,
}) => {
  useEffect(() => {
    onLoadingChange(true);
    return () => onLoadingChange(false);
  }, [onLoadingChange]);

  return <>{children}</>;
};

// Hook for route preloading on hover/focus
export const useRoutePreload = () => {
  const preloadRoute = (routePath: string, importFn: () => Promise<any>) => {
    // Import the route preloader
    import('@/utils/routeCodeSplitting').then(({ routePreloader }) => {
      routePreloader.preloadRouteWithDelay(routePath, importFn, 100);
    });
  };

  const cancelPreload = (routePath: string) => {
    import('@/utils/routeCodeSplitting').then(({ routePreloader }) => {
      routePreloader.cancelRoutePreload(routePath);
    });
  };

  return { preloadRoute, cancelPreload };
};

// Performance monitoring for code splitting
export const useCodeSplittingMetrics = () => {
  const [metrics, setMetrics] = useState({
    totalRoutes: 0,
    loadedRoutes: 0,
    averageLoadTime: 0,
    failedLoads: 0,
  });

  const recordRouteLoad = (routePath: string, loadTime: number, success: boolean) => {
    setMetrics(prev => ({
      totalRoutes: prev.totalRoutes + 1,
      loadedRoutes: success ? prev.loadedRoutes + 1 : prev.loadedRoutes,
      averageLoadTime: success 
        ? (prev.averageLoadTime * prev.loadedRoutes + loadTime) / (prev.loadedRoutes + 1)
        : prev.averageLoadTime,
      failedLoads: success ? prev.failedLoads : prev.failedLoads + 1,
    }));
  };

  const getSuccessRate = () => {
    if (metrics.totalRoutes === 0) return 100;
    return ((metrics.loadedRoutes / metrics.totalRoutes) * 100).toFixed(1);
  };

  return {
    metrics: {
      ...metrics,
      successRate: getSuccessRate(),
    },
    recordRouteLoad,
  };
};

// Skeleton loading components for different content types
export const SkeletonLoaders = {
  Table: () => (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="grid grid-cols-5 gap-4">
          <div className="h-4 bg-gray-100 rounded"></div>
          <div className="h-4 bg-gray-100 rounded"></div>
          <div className="h-4 bg-gray-100 rounded"></div>
          <div className="h-4 bg-gray-100 rounded"></div>
          <div className="h-4 bg-gray-100 rounded"></div>
        </div>
      ))}
    </div>
  ),

  Form: () => (
    <div className="animate-pulse space-y-6 max-w-md">
      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-100 rounded w-1/4"></div>
          <div className="h-10 bg-gray-100 rounded"></div>
        </div>
      ))}
      <div className="h-10 bg-blue-200 rounded"></div>
    </div>
  ),

  Dashboard: () => (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-100 rounded w-1/3"></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    </div>
  ),

  List: () => (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  ),
};

export default AdvancedSuspense;