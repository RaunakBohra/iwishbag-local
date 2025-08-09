/**
 * Advanced Lazy Loading Utilities
 * 
 * Provides optimized lazy loading with:
 * - Route-based code splitting
 * - Preloading strategies 
 * - Loading states
 * - Error boundaries
 * - Performance monitoring
 */

import React, { ComponentType, lazy, Suspense, ReactNode } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Enhanced loading component with skeleton
const EnhancedLoader: React.FC<{ 
  type?: 'page' | 'component' | 'modal';
  minHeight?: string;
}> = ({ type = 'page', minHeight = '200px' }) => {
  return (
    <div className="flex items-center justify-center" style={{ minHeight }}>
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted-foreground">
          {type === 'page' ? 'Loading page...' : 
           type === 'modal' ? 'Loading content...' :
           'Loading component...'}
        </p>
      </div>
    </div>
  );
};

// Route-based lazy loading with automatic chunk naming
export const createLazyRoute = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  chunkName: string,
  options: {
    fallback?: ReactNode;
    errorBoundary?: boolean;
    preload?: boolean;
  } = {}
) => {
  const LazyComponent = lazy(() => 
    importFn().then(module => {
      // Performance monitoring
      if (import.meta.env.DEV) {
        console.log(`📦 Loaded chunk: ${chunkName}`);
      }
      return module;
    })
  );

  // Preload the component if requested
  if (options.preload) {
    const preloadTimer = setTimeout(() => {
      importFn().catch(() => {
        // Silently fail preload attempts
      });
    }, 100);
    // Clear on module unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => clearTimeout(preloadTimer));
    }
  }

  const WrappedComponent: React.FC = (props) => {
    const content = (
      <Suspense fallback={options.fallback || <EnhancedLoader />}>
        <LazyComponent {...props} />
      </Suspense>
    );

    return options.errorBoundary ? (
      <ErrorBoundary>
        {content}
      </ErrorBoundary>
    ) : content;
  };

  return WrappedComponent;
};

// Grouped lazy loading for related components
export const createLazyGroup = (
  imports: Record<string, () => Promise<{ default: ComponentType<any> }>>,
  groupName: string
) => {
  const components: Record<string, ComponentType> = {};
  
  Object.entries(imports).forEach(([key, importFn]) => {
    components[key] = createLazyRoute(
      importFn,
      `${groupName}-${key}`,
      { errorBoundary: true }
    );
  });

  return components;
};

// Admin-specific lazy loading with enhanced security
export const createAdminLazyRoute = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  chunkName: string
) => {
  return createLazyRoute(
    importFn,
    `admin-${chunkName}`,
    {
      fallback: <EnhancedLoader type="page" minHeight="400px" />,
      errorBoundary: true,
      preload: false // Admin pages loaded on-demand only
    }
  );
};

// Customer-specific lazy loading with preloading
export const createCustomerLazyRoute = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  chunkName: string,
  preload = false
) => {
  return createLazyRoute(
    importFn,
    `customer-${chunkName}`,
    {
      fallback: <EnhancedLoader type="page" minHeight="300px" />,
      errorBoundary: true,
      preload
    }
  );
};

// Heavy component lazy loading (for large components within pages)
export const createComponentLazyRoute = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  chunkName: string
) => {
  return createLazyRoute(
    importFn,
    `component-${chunkName}`,
    {
      fallback: <EnhancedLoader type="component" minHeight="150px" />,
      errorBoundary: false // Let parent handle errors
    }
  );
};

// Performance monitoring hook
export const useChunkLoadTime = (chunkName: string) => {
  React.useEffect(() => {
    const startTime = performance.now();
    return () => {
      const loadTime = performance.now() - startTime;
      if (import.meta.env.DEV && loadTime > 1000) {
        console.warn(`⚠️  Slow chunk load: ${chunkName} took ${loadTime.toFixed(2)}ms`);
      }
    };
  }, [chunkName]);
};

export default {
  createLazyRoute,
  createLazyGroup,
  createAdminLazyRoute,
  createCustomerLazyRoute,
  createComponentLazyRoute,
  EnhancedLoader
};