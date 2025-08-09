/**
 * Heavy Component Lazy Loading
 * 
 * For large components that can be progressively loaded within pages
 * to improve initial page load times and perceived performance.
 */

import React, { Suspense } from 'react';
import { createComponentLazyRoute } from '@/utils/lazy-loading';
import { LoadingSpinner, SkeletonLoader } from '@/components/ui/LoadingSpinner';

// ==================== ADMIN HEAVY COMPONENTS ====================

// Quote Calculator V2 - Heavy component with lots of features
export const LazyQuoteCalculatorV2 = createComponentLazyRoute(
  () => import('@/pages/admin/QuoteCalculatorV2'),
  'quote-calculator-v2'
);

// Customer Profile - Heavy with analytics and history
export const LazyCustomerProfile = createComponentLazyRoute(
  () => import('@/pages/admin/CustomerProfile'),
  'customer-profile-heavy'
);

// Advanced Customer Filters - Heavy filtering component
export const LazyAdvancedCustomerFilters = createComponentLazyRoute(
  () => import('@/components/admin/AdvancedCustomerFilters'),
  'advanced-filters'
);

// Payment Management Modal - Heavy with transaction history
export const LazyUnifiedPaymentModal = createComponentLazyRoute(
  () => import('@/components/admin/UnifiedPaymentModal'),
  'payment-modal'
);

// Regional Pricing Manager - Heavy data management component
export const LazyRegionalPricingManager = createComponentLazyRoute(
  () => import('@/components/admin/RegionalPricingManager'),
  'regional-pricing-manager'
);

// Enhanced Addon Services Selector - Heavy product selection
export const LazyEnhancedAddonServicesSelector = createComponentLazyRoute(
  () => import('@/components/quote/EnhancedAddonServicesSelector'),
  'addon-services-selector'
);

// ==================== CUSTOMER HEAVY COMPONENTS ====================

// Shopify Style Quote View - Heavy interactive component
export const LazyShopifyStyleQuoteView = createComponentLazyRoute(
  () => import('@/components/quotes/ShopifyStyleQuoteView'),
  'shopify-quote-view'
);

// Professional Breakdown - Heavy calculation display
export const LazyProfessionalBreakdown = createComponentLazyRoute(
  () => import('@/components/quotes/ProfessionalBreakdown'),
  'professional-breakdown'
);

// Customer Breakdown - Customer-facing calculation display
export const LazyCustomerBreakdown = createComponentLazyRoute(
  () => import('@/components/quotes/CustomerBreakdown'),
  'customer-breakdown'
);

// Smart Cart Item - Heavy cart management
export const LazySmartCartItem = createComponentLazyRoute(
  () => import('@/components/cart/SmartCartItem'),
  'smart-cart-item'
);

// ==================== PROGRESSIVE LOADING WRAPPERS ====================

// Progressive Wrapper for conditionally heavy components
export const ProgressiveWrapper: React.FC<{
  children: React.ReactNode;
  condition?: boolean;
  fallback?: React.ReactNode;
  minHeight?: string;
}> = ({ 
  children, 
  condition = true, 
  fallback,
  minHeight = '200px' 
}) => {
  if (!condition) {
    return <>{fallback || <SkeletonLoader className={`min-h-[${minHeight}]`} count={3} />}</>;
  }

  return (
    <Suspense fallback={fallback || <LoadingSpinner size="lg" />}>
      {children}
    </Suspense>
  );
};

// Intersection Observer based lazy loading for below-the-fold components
export const LazyOnScroll: React.FC<{
  children: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  fallback?: React.ReactNode;
}> = ({ 
  children, 
  rootMargin = '50px',
  threshold = 0.1,
  fallback 
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return (
    <div ref={ref}>
      {isVisible ? (
        <Suspense fallback={fallback || <SkeletonLoader count={2} />}>
          {children}
        </Suspense>
      ) : (
        fallback || <SkeletonLoader count={2} />
      )}
    </div>
  );
};

// Performance monitoring for heavy components
export const useComponentLoadTime = (componentName: string) => {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      if (import.meta.env.DEV) {
        if (loadTime > 500) {
          console.warn(`⚡ Heavy component: ${componentName} took ${loadTime.toFixed(2)}ms to load`);
        } else {
          console.log(`✅ Component: ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
        }
      }
    };
  }, [componentName]);
};

export default {
  LazyQuoteCalculatorV2,
  LazyCustomerProfile,
  LazyAdvancedCustomerFilters,
  LazyUnifiedPaymentModal,
  LazyRegionalPricingManager,
  LazyEnhancedAddonServicesSelector,
  LazyShopifyStyleQuoteView,
  LazyProfessionalBreakdown,
  LazyCustomerBreakdown,
  LazySmartCartItem,
  ProgressiveWrapper,
  LazyOnScroll,
  useComponentLoadTime
};