/**
 * Advanced Route Code Splitting System
 * 
 * Implements intelligent route-based code splitting with:
 * - Route grouping for better chunk optimization
 * - Preloading strategies based on user behavior
 * - Critical path optimization
 * - Fallback loading components
 */

import React from 'react';

// Loading component types for different route categories
interface RouteLoadingProps {
  category: 'admin' | 'auth' | 'dashboard' | 'public' | 'demo' | 'payment';
}

// Enhanced loading components for different route categories
export const RouteLoadingComponent: React.FC<RouteLoadingProps> = ({ category }) => {
  const getLoadingContent = (): JSX.Element => {
    switch (category) {
      case 'admin':
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading Admin Panel...</p>
            </div>
          </div>
        );
      
      case 'auth':
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-pulse bg-white rounded-lg shadow-lg p-8 w-96">
                <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-4"></div>
                <div className="h-10 bg-gray-200 rounded mb-4"></div>
                <div className="h-10 bg-gray-200 rounded mb-4"></div>
                <div className="h-10 bg-blue-200 rounded"></div>
              </div>
            </div>
          </div>
        );
      
      case 'dashboard':
        return (
          <div className="min-h-screen bg-white">
            <div className="animate-pulse">
              <div className="bg-gray-200 h-16 mb-6"></div>
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-gray-100 rounded-lg h-32"></div>
                  ))}
                </div>
                <div className="bg-gray-100 rounded-lg h-64"></div>
              </div>
            </div>
          </div>
        );
      
      case 'payment':
        return (
          <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-4 text-gray-700">Processing Payment...</p>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        );
    }
  };

  return <>{getLoadingContent()}</>;
};

// Route preloading utilities
export class RoutePreloader {
  private preloadedRoutes = new Set<string>();
  private preloadTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Preload a route component
   */
  async preloadRoute(routePath: string, importFn: () => Promise<any>): Promise<void> {
    if (this.preloadedRoutes.has(routePath)) {
      return;
    }

    try {
      await importFn();
      this.preloadedRoutes.add(routePath);
    } catch (error) {
      console.warn(`Failed to preload route ${routePath}:`, error);
    }
  }

  /**
   * Preload route with delay (useful for hover preloading)
   */
  preloadRouteWithDelay(routePath: string, importFn: () => Promise<any>, delay = 100): void {
    // Clear existing timeout
    if (this.preloadTimeouts.has(routePath)) {
      clearTimeout(this.preloadTimeouts.get(routePath)!);
    }

    const timeout = setTimeout(() => {
      this.preloadRoute(routePath, importFn);
      this.preloadTimeouts.delete(routePath);
    }, delay);

    this.preloadTimeouts.set(routePath, timeout);
  }

  /**
   * Cancel route preloading
   */
  cancelRoutePreload(routePath: string): void {
    if (this.preloadTimeouts.has(routePath)) {
      clearTimeout(this.preloadTimeouts.get(routePath)!);
      this.preloadTimeouts.delete(routePath);
    }
  }

  /**
   * Preload related routes based on current route
   */
  preloadRelatedRoutes(currentRoute: string): void {
    const relatedRoutes = this.getRelatedRoutes(currentRoute);
    
    relatedRoutes.forEach(({ route, importFn, priority }) => {
      const delay = priority === 'high' ? 100 : priority === 'medium' ? 500 : 1000;
      setTimeout(() => {
        this.preloadRoute(route, importFn);
      }, delay);
    });
  }

  private getRelatedRoutes(currentRoute: string): Array<{
    route: string;
    importFn: () => Promise<any>;
    priority: 'high' | 'medium' | 'low';
  }> {
    // Define related routes based on user flow patterns
    const routeRelationships: Record<string, Array<{
      route: string;
      importFn: () => Promise<any>;
      priority: 'high' | 'medium' | 'low';
    }>> = {
      '/': [
        {
          route: '/quote',
          importFn: () => import('@/pages/Quote'),
          priority: 'high',
        },
        {
          route: '/auth',
          importFn: () => import('@/pages/Auth'),
          priority: 'medium',
        },
      ],
      '/quote': [
        {
          route: '/dashboard',
          importFn: () => import('@/pages/Dashboard'),
          priority: 'high',
        },
        {
          route: '/cart',
          importFn: () => import('@/pages/Cart'),
          priority: 'medium',
        },
      ],
      '/dashboard': [
        {
          route: '/dashboard/quotes',
          importFn: () => import('@/pages/CustomerQuotesList'),
          priority: 'high',
        },
        {
          route: '/dashboard/orders',
          importFn: () => import('@/components/orders/CustomerOrderList'),
          priority: 'high',
        },
        {
          route: '/profile',
          importFn: () => import('@/pages/Profile'),
          priority: 'medium',
        },
      ],
      '/admin': [
        {
          route: '/admin/quotes',
          importFn: () => import('@/pages/admin/QuotesListPage'),
          priority: 'high',
        },
        {
          route: '/admin/customers',
          importFn: () => import('@/components/admin/SimpleCustomerManagement'),
          priority: 'high',
        },
        {
          route: '/admin/orders',
          importFn: () => import('@/pages/admin/OrderManagementPage'),
          priority: 'medium',
        },
      ],
    };

    return routeRelationships[currentRoute] || [];
  }

  /**
   * Get preload statistics
   */
  getStats(): {
    preloadedCount: number;
    pendingCount: number;
    preloadedRoutes: string[];
  } {
    return {
      preloadedCount: this.preloadedRoutes.size,
      pendingCount: this.preloadTimeouts.size,
      preloadedRoutes: Array.from(this.preloadedRoutes),
    };
  }

  /**
   * Clear all preloaded routes (for testing/debugging)
   */
  clear(): void {
    this.preloadedRoutes.clear();
    this.preloadTimeouts.forEach(timeout => clearTimeout(timeout));
    this.preloadTimeouts.clear();
  }
}

// Create singleton instance
export const routePreloader = new RoutePreloader();

// Advanced lazy loading with enhanced error boundaries
export const createAdvancedLazy = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    category: 'admin' | 'auth' | 'dashboard' | 'public' | 'demo' | 'payment';
    fallback?: React.ComponentType;
    retries?: number;
  } = { category: 'public' }
) => {
  const { category, fallback, retries = 3 } = options;

  return React.lazy(() => {
    let attempt = 0;
    
    const loadWithRetry = async (): Promise<{ default: T }> => {
      try {
        return await importFn();
      } catch (error) {
        attempt++;
        
        if (attempt >= retries) {
          console.error(`Failed to load component after ${retries} attempts:`, error);
          
          // Return fallback component or default error component
          if (fallback) {
            return { default: fallback as T };
          }
          
          // Default error component
          const ErrorComponent = (() => (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center text-red-600">
                <p className="text-lg font-semibold">Failed to load component</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Reload Page
                </button>
              </div>
            </div>
          )) as T;
          
          return { default: ErrorComponent };
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        return loadWithRetry();
      }
    };

    return loadWithRetry();
  });
};

// Route-based chunk naming for better debugging
export const getChunkName = (routePath: string): string => {
  // Convert route path to chunk name
  const cleanPath = routePath
    .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
    .replace(/\//g, '-') // Replace slashes with hyphens
    .replace(/[^a-zA-Z0-9-]/g, '') // Remove special characters
    .toLowerCase();

  if (!cleanPath) return 'home';
  
  // Group related routes for better caching
  if (cleanPath.startsWith('admin')) return `admin-${cleanPath.replace('admin-', '')}`;
  if (cleanPath.startsWith('dashboard')) return `dashboard-${cleanPath.replace('dashboard-', '')}`;
  if (cleanPath.startsWith('auth')) return `auth-${cleanPath.replace('auth-', '')}`;
  if (cleanPath.startsWith('demo')) return `demo-${cleanPath.replace('demo-', '')}`;
  if (cleanPath.includes('payment')) return `payment-${cleanPath}`;
  
  return cleanPath;
};

// Critical path optimization
export const preloadCriticalRoutes = (): void => {
  const criticalRoutes = [
    {
      route: '/auth',
      importFn: () => import('@/pages/Auth'),
    },
    {
      route: '/dashboard',
      importFn: () => import('@/pages/Dashboard'),
    },
  ];

  // Preload critical routes after initial load
  if (typeof window !== 'undefined') {
    requestIdleCallback(() => {
      criticalRoutes.forEach(({ route, importFn }) => {
        routePreloader.preloadRoute(route, importFn);
      });
    }, { timeout: 2000 });
  }
};

export default {
  RouteLoadingComponent,
  RoutePreloader,
  routePreloader,
  createAdvancedLazy,
  getChunkName,
  preloadCriticalRoutes,
};