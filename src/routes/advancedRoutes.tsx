/**
 * Advanced Route Configuration with Optimized Code Splitting
 * 
 * Implements intelligent route chunking, preloading, and loading states
 * for maximum performance and user experience.
 */

import React from 'react';
import { createAdvancedLazy } from '@/utils/routeCodeSplitting';
import AdvancedSuspense, { SkeletonLoaders } from '@/components/ui/AdvancedSuspense';

// ============================================================================
// CRITICAL ROUTES - Loaded immediately on app start
// ============================================================================

export const CriticalRoutes = {
  Layout: createAdvancedLazy(
    () => import('@/components/layout/Layout'),
    { category: 'public' }
  ),
  
  Index: createAdvancedLazy(
    () => import('@/pages/Index'),
    { category: 'public' }
  ),
  
  Auth: createAdvancedLazy(
    () => import('@/pages/Auth'),
    { category: 'auth' }
  ),
};

// ============================================================================
// DASHBOARD ROUTES - High priority for authenticated users
// ============================================================================

export const DashboardRoutes = {
  Dashboard: createAdvancedLazy(
    () => import('@/pages/Dashboard'),
    { 
      category: 'dashboard',
      fallback: () => <SkeletonLoaders.Dashboard />
    }
  ),
  
  Profile: createAdvancedLazy(
    () => import('@/pages/Profile'),
    { 
      category: 'dashboard',
      fallback: () => <SkeletonLoaders.Form />
    }
  ),
  
  CustomerQuotesList: createAdvancedLazy(
    () => import('@/pages/CustomerQuotesList'),
    { 
      category: 'dashboard',
      fallback: () => <SkeletonLoaders.List />
    }
  ),
  
  CustomerOrderList: createAdvancedLazy(
    () => import('@/components/orders/CustomerOrderList'),
    { 
      category: 'dashboard',
      fallback: () => <SkeletonLoaders.List />
    }
  ),
  
  CustomerOrderDetailPage: createAdvancedLazy(
    () => import('@/pages/CustomerOrderDetailPage'),
    { 
      category: 'dashboard',
      fallback: () => <SkeletonLoaders.Form />
    }
  ),
  
  MessageCenterPage: createAdvancedLazy(
    () => import('@/pages/MessageCenterPage'),
    { 
      category: 'dashboard',
      fallback: () => <SkeletonLoaders.List />
    }
  ),
  
  MyTicketsPage: createAdvancedLazy(
    () => import('@/pages/support/MyTickets'),
    { 
      category: 'dashboard',
      fallback: () => <SkeletonLoaders.List />
    }
  ),
};

// ============================================================================
// ADMIN ROUTES - Heavy components with advanced splitting
// ============================================================================

export const AdminRoutes = {
  // Core Admin Components
  AdminLayout: createAdvancedLazy(
    () => import('@/components/admin/AdminLayout'),
    { category: 'admin' }
  ),
  
  AdminDashboard: createAdvancedLazy(
    () => import('@/pages/admin/Dashboard'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Dashboard />
    }
  ),
  
  // Quote Management (Heavy - Split into separate chunks)
  QuotesListPage: createAdvancedLazy(
    () => import('@/pages/admin/QuotesListPage'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Table />
    }
  ),
  
  QuoteCalculatorV2: createAdvancedLazy(
    () => import('@/pages/admin/QuoteCalculatorV2'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Form />
    }
  ),
  
  // Customer Management
  SimpleCustomerManagement: createAdvancedLazy(
    () => import('@/components/admin/SimpleCustomerManagement'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Table />
    }
  ),
  
  CustomerProfile: createAdvancedLazy(
    () => import('@/pages/admin/CustomerProfile'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Form />
    }
  ),
  
  // Order Management System
  OrderManagementPage: createAdvancedLazy(
    () => import('@/pages/admin/OrderManagementPage'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Table />
    }
  ),
  
  OrderDetailPage: createAdvancedLazy(
    () => import('@/pages/admin/OrderDetailPage'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Form />
    }
  ),
  
  // Settings & Configuration
  CountrySettings: createAdvancedLazy(
    () => import('@/components/admin/CountrySettings'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Table />
    }
  ),
  
  BankAccountSettings: createAdvancedLazy(
    () => import('@/components/admin/BankAccountSettings'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Form />
    }
  ),
  
  SystemSettings: createAdvancedLazy(
    () => import('@/components/admin/SystemSettings'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Form />
    }
  ),
  
  RegionalPricingAdminPage: createAdvancedLazy(
    () => import('@/pages/admin/RegionalPricingAdminPage'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Table />
    }
  ),
  
  // Communication & Support
  EmailDashboard: createAdvancedLazy(
    () => import('@/pages/admin/EmailDashboard'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Dashboard />
    }
  ),
  
  SMSDashboard: createAdvancedLazy(
    () => import('@/pages/admin/SMSDashboard'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Dashboard />
    }
  ),
  
  SupportTicketsPage: createAdvancedLazy(
    () => import('@/pages/admin/SupportTickets'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Table />
    }
  ),
  
  // Advanced Management
  SystemPerformance: createAdvancedLazy(
    () => import('@/pages/admin/SystemPerformance'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Dashboard />
    }
  ),
  
  SmartIntelligenceDashboard: createAdvancedLazy(
    () => import('@/pages/admin/SmartIntelligenceDashboard'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Dashboard />
    }
  ),
  
  // Business Logic
  DiscountManagementPage: createAdvancedLazy(
    () => import('@/pages/admin/DiscountManagement'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Table />
    }
  ),
  
  MembershipManagementPage: createAdvancedLazy(
    () => import('@/pages/admin/MembershipManagement'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Table />
    }
  ),
  
  ReturnManagement: createAdvancedLazy(
    () => import('@/pages/admin/ReturnManagement'),
    { 
      category: 'admin',
      fallback: () => <SkeletonLoaders.Table />
    }
  ),
};

// ============================================================================
// E-COMMERCE ROUTES - Core shopping functionality
// ============================================================================

export const EcommerceRoutes = {
  Quote: createAdvancedLazy(
    () => import('@/pages/Quote'),
    { 
      category: 'public',
      fallback: () => <SkeletonLoaders.Form />
    }
  ),
  
  Cart: createAdvancedLazy(
    () => import('@/pages/Cart'),
    { 
      category: 'public',
      fallback: () => <SkeletonLoaders.List />
    }
  ),
  
  Checkout: createAdvancedLazy(
    () => import('@/pages/CheckoutShopify'),
    { 
      category: 'payment',
      fallback: () => <SkeletonLoaders.Form />
    }
  ),
  
  CostEstimatorPage: createAdvancedLazy(
    () => import('@/pages/CostEstimator'),
    { 
      category: 'public',
      fallback: () => <SkeletonLoaders.Form />
    }
  ),
  
  ShopifyStyleQuoteView: createAdvancedLazy(
    () => import('@/components/quotes/ShopifyStyleQuoteView'),
    { 
      category: 'public',
      fallback: () => <SkeletonLoaders.Form />
    }
  ),
};

// ============================================================================
// PAYMENT ROUTES - Split for better security and performance
// ============================================================================

export const PaymentRoutes = {
  PaymentSuccess: createAdvancedLazy(
    () => import('@/pages/PaymentSuccess'),
    { category: 'payment' }
  ),
  
  PaymentFailure: createAdvancedLazy(
    () => import('@/pages/PaymentFailure'),
    { category: 'payment' }
  ),
  
  PaypalSuccess: createAdvancedLazy(
    () => import('@/pages/PaypalSuccess'),
    { category: 'payment' }
  ),
  
  PaypalFailure: createAdvancedLazy(
    () => import('@/pages/PaypalFailure'),
    { category: 'payment' }
  ),
  
  OrderConfirmationPage: createAdvancedLazy(
    () => import('@/pages/OrderConfirmationPage'),
    { 
      category: 'payment',
      fallback: () => <SkeletonLoaders.Form />
    }
  ),
  
  // Payment Testing (Dev only)
  TestPayment: createAdvancedLazy(
    () => import('@/pages/TestPayment'),
    { category: 'payment' }
  ),
  
  EsewaTest: createAdvancedLazy(
    () => import('@/pages/EsewaTest'),
    { category: 'payment' }
  ),
};

// ============================================================================
// CONTENT ROUTES - Static/marketing content
// ============================================================================

export const ContentRoutes = {
  About: createAdvancedLazy(
    () => import('@/pages/About'),
    { category: 'public' }
  ),
  
  Blog: createAdvancedLazy(
    () => import('@/pages/Blog'),
    { category: 'public' }
  ),
  
  BlogPost: createAdvancedLazy(
    () => import('@/pages/BlogPost'),
    { category: 'public' }
  ),
  
  Help: createAdvancedLazy(
    () => import('@/pages/Help'),
    { category: 'public' }
  ),
  
  PrivacyPolicy: createAdvancedLazy(
    () => import('@/pages/PrivacyPolicy'),
    { category: 'public' }
  ),
  
  TermsConditions: createAdvancedLazy(
    () => import('@/pages/TermsConditions'),
    { category: 'public' }
  ),
  
  Returns: createAdvancedLazy(
    () => import('@/pages/Returns'),
    { category: 'public' }
  ),
  
  TrackingPage: createAdvancedLazy(
    () => import('@/pages/TrackingPage').then((m) => ({ default: m.TrackingPage })),
    { category: 'public' }
  ),
};

// ============================================================================
// AUTH ROUTES - Authentication flow
// ============================================================================

export const AuthRoutes = {
  ResetPassword: createAdvancedLazy(
    () => import('@/pages/auth/ResetPassword'),
    { category: 'auth' }
  ),
  
  EmailConfirmation: createAdvancedLazy(
    () => import('@/pages/auth/EmailConfirmation'),
    { category: 'auth' }
  ),
  
  OAuthCallback: createAdvancedLazy(
    () => import('@/pages/auth/OAuthCallback'),
    { category: 'auth' }
  ),
};

// ============================================================================
// DEMO & TEST ROUTES - Development and testing components
// ============================================================================

export const DemoRoutes = {
  QuoteV2Demo: createAdvancedLazy(
    () => import('@/components/demo/QuoteV2Demo').then((m) => ({ default: m.QuoteV2Demo })),
    { category: 'demo' }
  ),
  
  QuoteV2Integration: createAdvancedLazy(
    () => import('@/pages/demos/QuoteV2Integration'),
    { category: 'demo' }
  ),
  
  CompactPhoneInputDemo: createAdvancedLazy(
    () => import('@/demo/CompactPhoneInputDemo'),
    { category: 'demo' }
  ),
  
  TestSmartProductForm: createAdvancedLazy(
    () => import('@/pages/TestSmartProductForm'),
    { category: 'demo' }
  ),
  
  RouteShippingDesigns: createAdvancedLazy(
    () => import('@/pages/demo/RouteShippingDesigns'),
    { category: 'demo' }
  ),
};

// ============================================================================
// UTILITY ROUTES - Error pages and redirects
// ============================================================================

export const UtilityRoutes = {
  NotFound: createAdvancedLazy(
    () => import('@/pages/NotFound'),
    { category: 'public' }
  ),
  
  ContactRedirect: createAdvancedLazy(
    () => import('@/components/ContactRedirect').then((m) => ({ default: m.ContactRedirect })),
    { category: 'public' }
  ),
  
  PublicQuoteView: createAdvancedLazy(
    () => import('@/pages/PublicQuoteView'),
    { category: 'public' }
  ),
};

// ============================================================================
// ROUTE GROUPS FOR STRATEGIC PRELOADING
// ============================================================================

export const RouteGroups = {
  critical: [CriticalRoutes.Index, CriticalRoutes.Auth],
  dashboard: Object.values(DashboardRoutes),
  admin: Object.values(AdminRoutes),
  ecommerce: Object.values(EcommerceRoutes),
  payment: Object.values(PaymentRoutes),
  content: Object.values(ContentRoutes),
  auth: Object.values(AuthRoutes),
  demo: Object.values(DemoRoutes),
  utility: Object.values(UtilityRoutes),
};

// ============================================================================
// PRELOADING STRATEGIES
// ============================================================================

export const preloadStrategies = {
  // Preload based on user authentication state
  authenticatedUser: () => {
    import('@/utils/routeCodeSplitting').then(({ routePreloader }) => {
      // High priority routes for authenticated users
      routePreloader.preloadRoute('/dashboard', () => import('@/pages/Dashboard'));
      routePreloader.preloadRoute('/profile', () => import('@/pages/Profile'));
      
      // Medium priority - likely next actions
      setTimeout(() => {
        routePreloader.preloadRoute('/dashboard/quotes', () => import('@/pages/CustomerQuotesList'));
        routePreloader.preloadRoute('/dashboard/orders', () => import('@/components/orders/CustomerOrderList'));
      }, 1000);
    });
  },

  // Preload based on admin access
  adminUser: () => {
    import('@/utils/routeCodeSplitting').then(({ routePreloader }) => {
      // Critical admin routes
      routePreloader.preloadRoute('/admin', () => import('@/pages/admin/Dashboard'));
      routePreloader.preloadRoute('/admin/quotes', () => import('@/pages/admin/QuotesListPage'));
      
      // Secondary admin routes
      setTimeout(() => {
        routePreloader.preloadRoute('/admin/customers', () => import('@/components/admin/SimpleCustomerManagement'));
        routePreloader.preloadRoute('/admin/orders', () => import('@/pages/admin/OrderManagementPage'));
      }, 2000);
    });
  },

  // Preload for guest users
  guestUser: () => {
    import('@/utils/routeCodeSplitting').then(({ routePreloader }) => {
      // Routes likely to be visited by guests
      routePreloader.preloadRoute('/quote', () => import('@/pages/Quote'));
      routePreloader.preloadRoute('/auth', () => import('@/pages/Auth'));
      
      setTimeout(() => {
        routePreloader.preloadRoute('/about', () => import('@/pages/About'));
        routePreloader.preloadRoute('/help', () => import('@/pages/Help'));
      }, 1500);
    });
  },
};

// Export all route components for easy access
export const AllRoutes = {
  ...CriticalRoutes,
  ...DashboardRoutes,
  ...AdminRoutes,
  ...EcommerceRoutes,
  ...PaymentRoutes,
  ...ContentRoutes,
  ...AuthRoutes,
  ...DemoRoutes,
  ...UtilityRoutes,
};

export default AllRoutes;