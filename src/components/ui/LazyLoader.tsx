import React, { Suspense, lazy } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

interface LazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Default loading skeleton
const DefaultFallback = () => (
  <div className="space-y-4 p-4">
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </div>
);

// Spinner fallback for smaller components
const SpinnerFallback = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

export const LazyLoader: React.FC<LazyLoaderProps> = ({ 
  children, 
  fallback = <DefaultFallback /> 
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

// Lazy load admin components
export const LazyAdminDashboard = lazy(() => import("@/pages/admin/Dashboard").then(module => ({ default: module.default })));
export const LazyCartAnalytics = lazy(() => import("@/pages/admin/CartAnalytics").then(module => ({ default: module.default })));
export const LazyCartRecovery = lazy(() => import("@/pages/admin/CartRecovery").then(module => ({ default: module.default })));
export const LazyEmailTemplates = lazy(() => import("@/pages/admin/EmailTemplates").then(module => ({ default: module.default })));

// Lazy load customer components
export const LazyCustomerDashboard = lazy(() => import("@/pages/Dashboard").then(module => ({ default: module.default })));
export const LazyProfile = lazy(() => import("@/pages/Profile").then(module => ({ default: module.default })));

// Lazy load form components
export const LazyQuoteForm = lazy(() => import("@/components/forms/QuoteForm").then(module => ({ default: module.default })));

// Performance monitoring hook
export const usePerformanceMonitor = () => {
  const measurePerformance = (name: string, fn: () => void) => {
    const start = performance.now();
    fn();
    const end = performance.now();
    const duration = end - start;
    
    // Only log in development and for slow operations
    if (process.env.NODE_ENV === 'development' && duration > 16) {
      console.warn(`Performance: ${name} took ${duration.toFixed(2)}ms`);
    }
  };

  const measureAsyncPerformance = async (name: string, fn: () => Promise<void>) => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    const duration = end - start;
    
    // Only log in development and for slow operations
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      console.warn(`Performance: ${name} took ${duration.toFixed(2)}ms`);
    }
  };

  return { measurePerformance, measureAsyncPerformance };
};

// Virtual scrolling hook for large lists
export const useVirtualScroll = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleItemCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleItemCount + 1, items.length);

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  };
}; 