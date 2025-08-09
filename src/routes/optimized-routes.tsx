/**
 * Optimized Route Definitions
 * 
 * Groups related routes into logical chunks for better performance:
 * - Customer routes: Public-facing pages
 * - Admin routes: Administrative interface
 * - Auth routes: Authentication flows
 * - Payment routes: Payment processing
 * - Support routes: Help and support
 */

import React from 'react';
import { 
  createAdminLazyRoute, 
  createCustomerLazyRoute, 
  createLazyRoute 
} from '@/utils/lazy-loading';

// ==================== CUSTOMER ROUTES (High Priority) ====================
// Preload commonly accessed customer pages
export const CustomerRoutes = {
  // Core customer pages - preloaded for better UX
  Index: createCustomerLazyRoute(
    () => import('@/pages/Index'),
    'homepage',
    true // preload
  ),
  
  Quote: createCustomerLazyRoute(
    () => import('@/pages/Quote'), 
    'quote-form',
    true // preload for main flow
  ),

  Dashboard: createCustomerLazyRoute(
    () => import('@/pages/Dashboard'),
    'customer-dashboard'
  ),

  Cart: createCustomerLazyRoute(
    () => import('@/pages/Cart'),
    'shopping-cart'
  ),

  Checkout: createCustomerLazyRoute(
    () => import('@/pages/CheckoutShopify'),
    'checkout-flow'
  ),

  // Secondary customer pages
  Profile: createCustomerLazyRoute(
    () => import('@/pages/Profile'),
    'user-profile'
  ),

  // Orders and OrderDetail routes removed - will be replaced with enhanced order management system

  CustomerQuotesList: createCustomerLazyRoute(
    () => import('@/pages/CustomerQuotesList'),
    'customer-quotes'
  ),

  PublicQuoteView: createCustomerLazyRoute(
    () => import('@/pages/PublicQuoteView'),
    'shared-quote'
  ),

  Tracking: createCustomerLazyRoute(
    () => import('@/pages/TrackingPage').then((m) => ({ default: m.TrackingPage })),
    'package-tracking'
  )
};

// ==================== ADMIN ROUTES (On-Demand Loading) ====================
// Admin pages loaded only when accessed - no preloading for security
export const AdminRoutes = {
  // Core admin interface
  Dashboard: createAdminLazyRoute(
    () => import('@/pages/admin/Dashboard'),
    'dashboard'
  ),

  QuoteCalculator: createAdminLazyRoute(
    () => import('@/pages/admin/QuoteCalculatorV2'),
    'quote-calculator'
  ),

  QuotesList: createAdminLazyRoute(
    () => import('@/pages/admin/QuotesListPage'),
    'quotes-management'
  ),

  CustomerManagement: createAdminLazyRoute(
    () => import('@/components/admin/SimpleCustomerManagement'),
    'customer-management'
  ),

  CustomerProfile: createAdminLazyRoute(
    () => import('@/pages/admin/CustomerProfile'),
    'customer-profile'
  ),

  // Enhanced Order Management System
  OrderManagement: createAdminLazyRoute(
    () => import('@/pages/admin/OrderManagementPage'),
    'order-management'
  ),

  OrderDetail: createAdminLazyRoute(
    () => import('@/pages/admin/OrderDetailPage'),
    'order-detail'
  ),

  // Payment and financial management
  PaymentManagement: createAdminLazyRoute(
    () => import('@/pages/admin/PaymentManagement'),
    'payment-management'
  ),

  // System configuration
  RegionalPricing: createAdminLazyRoute(
    () => import('@/pages/admin/RegionalPricingAdminPage'),
    'regional-pricing'
  ),

  ShippingRoutes: createAdminLazyRoute(
    () => import('@/pages/admin/ShippingRoutes'),
    'shipping-config'
  ),

  CountrySettings: createAdminLazyRoute(
    () => import('@/components/admin/CountrySettings'),
    'country-settings'
  ),

  SystemSettings: createAdminLazyRoute(
    () => import('@/components/admin/SystemSettings'),
    'system-config'
  ),

  // Analytics and monitoring
  SystemPerformance: createAdminLazyRoute(
    () => import('@/pages/admin/SystemPerformance'),
    'performance-monitoring'
  ),

  // Support and tickets
  SupportTickets: createAdminLazyRoute(
    () => import('@/pages/admin/SupportTicketsPage'),
    'support-tickets'
  ),

  AutoAssignment: createAdminLazyRoute(
    () => import('@/pages/admin/AutoAssignment'),
    'auto-assignment'
  ),

  // Communication
  EmailDashboard: createAdminLazyRoute(
    () => import('@/pages/admin/EmailDashboard'),
    'email-dashboard'
  ),

  SMSDashboard: createAdminLazyRoute(
    () => import('@/pages/admin/SMSDashboard'),
    'sms-dashboard'
  ),

  // Advanced features
  SmartIntelligence: createAdminLazyRoute(
    () => import('@/pages/admin/SmartIntelligenceDashboard'),
    'smart-intelligence'
  ),

  ProductClassifications: createAdminLazyRoute(
    () => import('@/pages/admin/ProductClassificationsManager'),
    'product-classifications'
  ),

  ReturnManagement: createAdminLazyRoute(
    () => import('@/pages/admin/ReturnManagement'),
    'return-management'
  ),

  // Security and monitoring
  AbuseMonitoring: createAdminLazyRoute(
    () => import('@/components/admin/AbuseMonitoringDashboard').then((m) => ({ default: m.AbuseMonitoringDashboard })),
    'abuse-monitoring'
  ),

  WAFManagement: createAdminLazyRoute(
    () => import('@/pages/admin/WAFManagement'),
    'waf-management'
  ),

  RateLimitManagement: createAdminLazyRoute(
    () => import('@/pages/admin/RateLimitManagement'),
    'rate-limiting'
  )
};

// ==================== AUTH ROUTES ====================
export const AuthRoutes = {
  Login: createLazyRoute(
    () => import('@/pages/Auth'),
    'auth-main',
    { errorBoundary: true }
  ),

  ResetPassword: createLazyRoute(
    () => import('@/pages/auth/ResetPassword'),
    'password-reset',
    { errorBoundary: true }
  ),

  EmailConfirmation: createLazyRoute(
    () => import('@/pages/auth/EmailConfirmation'),
    'email-verification',
    { errorBoundary: true }
  ),

  OAuthCallback: createLazyRoute(
    () => import('@/pages/auth/OAuthCallback'),
    'oauth-callback',
    { errorBoundary: true }
  )
};

// ==================== PAYMENT ROUTES ====================
export const PaymentRoutes = {
  PaymentSuccess: createLazyRoute(
    () => import('@/pages/PaymentSuccess'),
    'payment-success',
    { errorBoundary: true }
  ),

  PaymentFailure: createLazyRoute(
    () => import('@/pages/PaymentFailure'),
    'payment-failure',
    { errorBoundary: true }
  ),

  PaypalSuccess: createLazyRoute(
    () => import('@/pages/PaypalSuccess'),
    'paypal-success',
    { errorBoundary: true }
  ),

  PaypalFailure: createLazyRoute(
    () => import('@/pages/PaypalFailure'),
    'paypal-failure',
    { errorBoundary: true }
  ),

  EsewaSuccess: createLazyRoute(
    () => import('@/pages/payment-callback/esewa-success'),
    'esewa-success',
    { errorBoundary: true }
  ),

  EsewaFailure: createLazyRoute(
    () => import('@/pages/payment-callback/esewa-failure'),
    'esewa-failure',
    { errorBoundary: true }
  ),

  FonepayCallback: createLazyRoute(
    () => import('@/pages/api/fonepay-callback'),
    'fonepay-callback',
    { errorBoundary: true }
  ),

  OrderConfirmation: createLazyRoute(
    () => import('@/pages/OrderConfirmationPage'),
    'order-confirmation',
    { errorBoundary: true }
  )
};

// ==================== SUPPORT & CONTENT ROUTES ====================
export const SupportRoutes = {
  Help: createLazyRoute(
    () => import('@/pages/Help'),
    'help-center',
    { preload: false }
  ),

  About: createLazyRoute(
    () => import('@/pages/About'),
    'about-page',
    { preload: false }
  ),

  Blog: createLazyRoute(
    () => import('@/pages/Blog'),
    'blog-listing',
    { preload: false }
  ),

  BlogPost: createLazyRoute(
    () => import('@/pages/BlogPost'),
    'blog-article',
    { preload: false }
  ),

  PrivacyPolicy: createLazyRoute(
    () => import('@/pages/PrivacyPolicy'),
    'privacy-policy',
    { preload: false }
  ),

  TermsConditions: createLazyRoute(
    () => import('@/pages/TermsConditions'),
    'terms-conditions',
    { preload: false }
  ),

  Returns: createLazyRoute(
    () => import('@/pages/Returns'),
    'returns-policy',
    { preload: false }
  ),

  MyTickets: createLazyRoute(
    () => import('@/pages/support/MyTickets'),
    'support-tickets-customer',
    { preload: false }
  ),

  MessageCenter: createLazyRoute(
    () => import('@/pages/MessageCenterPage'),
    'message-center',
    { preload: false }
  )
};

// ==================== UTILITY ROUTES ====================
export const UtilityRoutes = {
  NotFound: createLazyRoute(
    () => import('@/pages/NotFound'),
    '404-page',
    { errorBoundary: false }
  ),

  CostEstimator: createLazyRoute(
    () => import('@/pages/CostEstimator'),
    'cost-calculator',
    { preload: false }
  ),

  ContactRedirect: createLazyRoute(
    () => import('@/components/ContactRedirect').then((m) => ({ default: m.ContactRedirect })),
    'contact-redirect',
    { preload: false }
  )
};

// ==================== LAYOUTS ====================
export const Layouts = {
  AdminLayout: createLazyRoute(
    () => import('@/components/admin/AdminLayout'),
    'admin-layout',
    { errorBoundary: true }
  )
};

export default {
  CustomerRoutes,
  AdminRoutes,
  AuthRoutes,
  PaymentRoutes,
  SupportRoutes,
  UtilityRoutes,
  Layouts
};