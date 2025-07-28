import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/contexts/AuthContext';
import { AccessibilityProvider } from '@/components/ui/AccessibilityProvider';
import { PhoneCollectionProvider } from '@/components/onboarding/PhoneCollectionProvider';
import {
  ErrorBoundary,
  PaymentErrorFallback,
  QuoteFormErrorFallback,
  AdminErrorFallback,
} from '@/components/ui/ErrorBoundary';
import { QueryProvider } from './providers/QueryProvider';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminProtectedRoute from '@/components/auth/AdminProtectedRoute';
import { MFAProtectedRoute } from '@/components/auth/MFAProtectedRoute';
import CloudflareAnalytics from '@/components/analytics/CloudflareAnalytics';
import CloudflareBrowserInsights from '@/components/analytics/CloudflareBrowserInsights';
import { CloudflareRUM } from '@/components/analytics/CloudflareRUM';
import { PerformanceDashboard } from '@/components/analytics/PerformanceDashboard';

// Lazy load pages for code splitting
const Index = React.lazy(() => import('@/pages/Index'));
const Quote = React.lazy(() => import('@/pages/Quote'));
const Auth = React.lazy(() => import('@/pages/Auth'));
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const Quotes = React.lazy(() => import('@/pages/dashboard/Quotes'));
const Orders = React.lazy(() => import('@/pages/dashboard/Orders'));
const OrderDetail = React.lazy(() => import('@/pages/dashboard/OrderDetail'));
const Profile = React.lazy(() => import('@/pages/Profile'));
const About = React.lazy(() => import('@/pages/About'));
const Blog = React.lazy(() => import('@/pages/Blog'));
const BlogPost = React.lazy(() => import('@/pages/BlogPost'));
const Contact = React.lazy(() => import('@/pages/Contact'));
const PrivacyPolicy = React.lazy(() => import('@/pages/PrivacyPolicy'));
const TermsConditions = React.lazy(() => import('@/pages/TermsConditions'));
const Returns = React.lazy(() => import('@/pages/Returns'));
const Checkout = React.lazy(() => import('@/pages/Checkout'));
const NotFound = React.lazy(() => import('@/pages/NotFound'));
const MessageCenterPage = React.lazy(() => import('@/pages/MessageCenterPage'));
const Cart = React.lazy(() => import('@/components/cart/Cart').then((m) => ({ default: m.Cart })));
const CostEstimatorPage = React.lazy(() => import('@/pages/CostEstimator'));
const TestPayment = React.lazy(() => import('@/pages/TestPayment'));
const EsewaTest = React.lazy(() => import('@/pages/EsewaTest'));
const CustomerOrderDetailPage = React.lazy(() => import('@/pages/CustomerOrderDetailPage'));
const OrderConfirmationPage = React.lazy(() => import('@/pages/OrderConfirmationPage'));
const PaymentSuccess = React.lazy(() => import('@/pages/PaymentSuccess'));
const PaymentFailure = React.lazy(() => import('@/pages/PaymentFailure'));
const PaymentTest = React.lazy(() => import('@/pages/PaymentTest'));
const PaypalSuccess = React.lazy(() => import('@/pages/PaypalSuccess'));
const PaypalFailure = React.lazy(() => import('@/pages/PaypalFailure'));
const QuoteDetailUnified = React.lazy(() => import('@/pages/dashboard/QuoteDetailUnified'));
// Temporarily remove lazy loading for debugging
import CustomerQuoteDetail from '@/pages/dashboard/CustomerQuoteDetail';
import TestQuotePage from '@/pages/TestQuotePage';
// const CustomerQuoteDetail = React.lazy(() => import('@/pages/dashboard/CustomerQuoteDetail'));
const UnifiedQuotePage = React.lazy(() => import('@/pages/unified/UnifiedQuotePage'));
const ResetPassword = React.lazy(() => import('@/pages/auth/ResetPassword'));
const EmailConfirmation = React.lazy(() => import('@/pages/auth/EmailConfirmation'));
const OAuthCallback = React.lazy(() => import('@/pages/auth/OAuthCallback'));
const VerifyQuoteApproval = React.lazy(() => import('@/pages/auth/VerifyQuoteApproval'));
const FonepayCallback = React.lazy(() => import('@/pages/api/fonepay-callback'));
const EsewaSuccess = React.lazy(() => import('@/pages/payment-callback/esewa-success'));
const EsewaFailure = React.lazy(() => import('@/pages/payment-callback/esewa-failure'));
const TrackingPage = React.lazy(() =>
  import('@/pages/TrackingPage').then((m) => ({ default: m.TrackingPage })),
);
const MyTicketsPage = React.lazy(() => import('@/pages/support/MyTickets'));

// Admin pages (lazy loaded)
const AdminDashboard = React.lazy(() => import('@/pages/admin/Dashboard'));
const AdminQuoteDetail = React.lazy(() => import('@/pages/admin/QuoteDetail'));
const EmailTemplatesPage = React.lazy(() => import('@/pages/admin/EmailTemplates'));
const PaymentManagement = React.lazy(() => import('@/pages/admin/PaymentManagement'));
const ShippingRoutesPage = React.lazy(() => import('@/pages/admin/ShippingRoutes'));
const StatusManagementPage = React.lazy(() => import('@/pages/admin/StatusManagement'));
const SupportTicketsPage = React.lazy(() => import('@/pages/admin/SupportTickets'));
const AutoAssignmentPage = React.lazy(() => import('@/pages/admin/AutoAssignment'));
const PayUDebugPage = React.lazy(() =>
  import('@/pages/admin/PayUDebugPage').then((m) => ({
    default: m.PayUDebugPage,
  })),
);
const Address = React.lazy(() => import('@/pages/profile/Address'));

// Admin components (lazy loaded with separate chunks for better performance)
const AdminLayout = React.lazy(() =>
  import('@/components/admin/AdminLayout' /* webpackChunkName: "admin-layout" */).then((m) => ({
    default: m.AdminLayout,
  })),
);
const QuoteManagementPage = React.lazy(() => import('@/components/admin/QuoteManagementPage' /* webpackChunkName: "admin-quotes" */));
// OrderManagementPage removed - will be replaced by unified interface
const EnhancedCustomerManagementPage = React.lazy(() =>
  import('@/components/admin/EnhancedCustomerManagementPage' /* webpackChunkName: "admin-customers" */).then((m) => ({
    default: m.EnhancedCustomerManagementPage,
  })),
);
const CountrySettings = React.lazy(() =>
  import('@/components/admin/CountrySettings' /* webpackChunkName: "admin-countries" */).then((m) => ({
    default: m.CountrySettings,
  })),
);
const CustomsCategories = React.lazy(() =>
  import('@/components/admin/CustomsCategories' /* webpackChunkName: "admin-customs" */).then((m) => ({
    default: m.CustomsCategories,
  })),
);
const UnifiedQuoteInterface = React.lazy(() => import('@/components/admin/UnifiedQuoteInterface' /* webpackChunkName: "admin-quote-interface" */));
// QuoteTemplatesPage component is not found - commenting out to fix build
// const QuoteTemplatesPage = React.lazy(() =>
//   import('@/components/admin/QuoteTemplatesPage').then((m) => ({
//     default: m.QuoteTemplatesPage,
//   })),
// );
const BlogManagementPage = React.lazy(() => import('@/pages/admin/BlogManagement'));
const MembershipManagementPage = React.lazy(() => import('@/pages/admin/MembershipManagement'));
const DiscountManagementPage = React.lazy(() => import('@/pages/admin/DiscountManagement'));
const WAFManagement = React.lazy(() => import('@/pages/admin/WAFManagement'));
const RateLimitManagement = React.lazy(() => import('@/pages/admin/RateLimitManagement'));
const BankAccountSettings = React.lazy(() =>
  import('@/components/admin/BankAccountSettings').then((m) => ({
    default: m.BankAccountSettings,
  })),
);
const MLWeightEstimatorTester = React.lazy(() =>
  import('@/components/admin/MLWeightEstimatorTester').then((m) => ({
    default: m.MLWeightEstimatorTester,
  })),
);
const HSNTestPage = React.lazy(() => import('@/pages/dev/hsn-test'));
const SystemSettings = React.lazy(() =>
  import('@/components/admin/SystemSettings').then((m) => ({
    default: m.SystemSettings,
  })),
);
const TestEmail = React.lazy(() => import('@/pages/TestEmail'));
const PaymentManagementPageNew = React.lazy(() => import('@/pages/admin/PaymentManagementPage'));
const StatusDebug = React.lazy(() => import('@/pages/debug/StatusDebug'));
const CustomerProfile = React.lazy(() => import('@/pages/admin/CustomerProfile'));
const DuplicateComponentsPreview = React.lazy(
  () => import('@/pages/admin/DuplicateComponentsPreview'),
);
const UserManagementPage = React.lazy(() => import('@/pages/admin/UserManagementPage'));
const HSNManagement = React.lazy(() => import('@/pages/admin/HSNManagement'));
const AuditLogsPage = React.lazy(() => import('@/pages/admin/AuditLogsPage'));
const SecuritySettings = React.lazy(() => import('@/pages/admin/SecuritySettings'));
const ApiAnalytics = React.lazy(() => import('@/pages/admin/ApiAnalytics'));
const PerformanceMonitor = React.lazy(() => import('@/components/admin/PerformanceMonitor' /* webpackChunkName: "admin-performance" */));
const ApiDocumentation = React.lazy(() => import('@/pages/admin/ApiDocumentation' /* webpackChunkName: "admin-docs" */));

// Package Forwarding pages
const PackageForwarding = React.lazy(() => import('@/pages/dashboard/PackageForwarding').then((m) => ({ default: m.PackageForwarding })));
const WarehouseManagement = React.lazy(() => import('@/pages/admin/WarehouseManagement').then((m) => ({ default: m.WarehouseManagement })));
const ReturnManagement = React.lazy(() => import('@/pages/admin/ReturnManagement'));
const WarehouseAnalytics = React.lazy(() => import('@/pages/admin/WarehouseAnalytics'));

// Test pages
const TestMembershipDiscount = React.lazy(() => import('@/pages/TestMembershipDiscount'));

// Demo pages for weight recommendation designs (chunked separately)
const DemoIndex = React.lazy(() => import('@/demo/DemoIndex' /* webpackChunkName: "demo-index" */));
const ManualTaxInputDesigns = React.lazy(() => import('@/demo/ManualTaxInputDesigns' /* webpackChunkName: "demo-tax-designs" */));
const ToggleDesigns = React.lazy(() => import('@/demo/ToggleDesigns' /* webpackChunkName: "demo-toggle-designs" */));
const UrlAutoFillDemo = React.lazy(() => import('@/pages/demo/UrlAutoFillDemo' /* webpackChunkName: "demo-url-autofill" */));
const WeightTabDemo = React.lazy(() => import('@/demo/WeightTabDemo' /* webpackChunkName: "demo-weight-tab" */));
const HSNInputDesigns = React.lazy(() => import('@/demo/HSNInputDesigns' /* webpackChunkName: "demo-hsn-designs" */));
const ProfessionalProductTableVariants = React.lazy(() => import('@/demo/ProfessionalProductTableVariants' /* webpackChunkName: "demo-product-table" */));

import { StatusConfigProvider } from './providers/StatusConfigProvider';
import UserRoleEnsurer from '@/components/auth/UserRoleEnsurer';
import { PermissionsProvider } from '@/contexts/PermissionsContext';

// Import test utilities in development
if (import.meta.env.DEV) {
  import('@/utils/recordTestPayment');
}

const router = createBrowserRouter([
  {
    path: 'admin',
    element: <AdminProtectedRoute />,
    children: [
      {
        path: '',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: 'email-templates', element: <EmailTemplatesPage /> },
          {
            path: 'quotes',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <QuoteManagementPage />
              </ErrorBoundary>
            ),
          },
          { path: 'orders', element: <Navigate to="/admin/quotes" replace /> },
          {
            path: 'orders/:id',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <UnifiedQuoteInterface />
              </ErrorBoundary>
            ),
          },
          { path: 'customers', element: <EnhancedCustomerManagementPage /> },
          { path: 'customers/:customerId', element: <CustomerProfile /> },
          { path: 'users', element: <UserManagementPage /> },
          { path: 'support-tickets', element: <SupportTicketsPage /> },
          { path: 'auto-assignment', element: <AutoAssignmentPage /> },
          // { path: 'templates', element: <QuoteTemplatesPage /> }, // Component not found - commented out
          {
            path: 'quotes/:id',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <AdminQuoteDetail />
              </ErrorBoundary>
            ),
          },
          { path: 'countries', element: <CountrySettings /> },
          {
            path: 'hsn-management',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <HSNManagement />
              </ErrorBoundary>
            ),
          },
          { path: 'customs', element: <CustomsCategories /> },
          { path: 'bank-accounts', element: <BankAccountSettings /> },
          { path: 'system-settings', element: <SystemSettings /> },
          { path: 'test-email', element: <TestEmail /> },
          {
            path: 'payment-management',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <PaymentManagement />
              </ErrorBoundary>
            ),
          },
          { path: 'shipping-routes', element: <ShippingRoutesPage /> },
          { path: 'status-management', element: <StatusManagementPage /> },
          { path: 'payment-proofs', element: <PaymentManagementPageNew /> },
          { path: 'waf-management', element: <WAFManagement /> },
          { path: 'rate-limit-management', element: <RateLimitManagement /> },
          { path: 'debug/status', element: <StatusDebug /> },
          { path: 'cleanup/duplicates', element: <DuplicateComponentsPreview /> },
          { path: 'debug/payu', element: <PayUDebugPage /> },
          { path: 'ml/weight-estimator', element: <MLWeightEstimatorTester /> },
          { path: 'dev/hsn-test', element: <HSNTestPage /> },
          { path: 'blog', element: <BlogManagementPage /> },
          { path: 'memberships', element: <MembershipManagementPage /> },
          { path: 'discounts', element: <DiscountManagementPage /> },
          {
            path: 'audit-logs',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <AuditLogsPage />
              </ErrorBoundary>
            ),
          },
          {
            path: 'security',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <SecuritySettings />
              </ErrorBoundary>
            ),
          },
          {
            path: 'api-analytics',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <ApiAnalytics />
              </ErrorBoundary>
            ),
          },
          {
            path: 'performance',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <PerformanceMonitor />
              </ErrorBoundary>
            ),
          },
          {
            path: 'api-documentation',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <ApiDocumentation />
              </ErrorBoundary>
            ),
          },
          {
            path: 'warehouse',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <WarehouseManagement />
              </ErrorBoundary>
            ),
          },
          {
            path: 'analytics',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <WarehouseAnalytics />
              </ErrorBoundary>
            ),
          },
          {
            path: 'returns',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <ReturnManagement />
              </ErrorBoundary>
            ),
          },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
  // Development routes (public access)
  {
    path: 'dev/hsn-test',
    element: <HSNTestPage />,
  },
  // Demo routes (public access for design review)
  {
    path: 'demo',
    children: [
      {
        index: true,
        element: <DemoIndex />,
      },
      {
        path: 'manual-tax-designs',
        element: <ManualTaxInputDesigns />,
      },
      {
        path: 'toggle-designs',
        element: <ToggleDesigns />,
      },
      {
        path: 'url-autofill',
        element: <UrlAutoFillDemo />,
      },
      {
        path: 'weight-tabs',
        element: <WeightTabDemo />,
      },
      {
        path: 'hsn-designs',
        element: <HSNInputDesigns />,
      },
      {
        path: 'product-table-variants',
        element: <ProfessionalProductTableVariants />,
      },
    ],
  },
  // Auth routes - No Layout wrapper
  {
    path: 'auth',
    element: <Auth />,
  },
  {
    path: 'auth/reset',
    element: <ResetPassword />,
  },
  {
    path: 'auth/confirm',
    element: <EmailConfirmation />,
  },
  {
    path: 'auth/callback',
    element: <OAuthCallback />,
  },
  {
    path: 'auth/verify-quote',
    element: <VerifyQuoteApproval />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Index />,
      },
      {
        path: 'quote',
        element: (
          <ErrorBoundary fallback={QuoteFormErrorFallback}>
            <Quote />
          </ErrorBoundary>
        ),
      },
      {
        path: 'about',
        element: <About />,
      },
      {
        path: 'blog',
        element: <Blog />,
      },
      {
        path: 'blog/:slug',
        element: <BlogPost />,
      },
      {
        path: 'contact',
        element: <Contact />,
      },
      {
        path: 'privacy-policy',
        element: <PrivacyPolicy />,
      },
      {
        path: 'terms-conditions',
        element: <TermsConditions />,
      },
      {
        path: 'returns',
        element: <Returns />,
      },
      {
        path: 'cost-estimator',
        element: <CostEstimatorPage />,
      },
      {
        path: 'track/:trackingId?',
        element: <TrackingPage />,
      },
      {
        path: 's/:shareToken',
        element: <QuoteDetailUnified isShareToken={true} />,
      },
      {
        path: 'quotes/:id',
        element: (
          <div style={{ 
            background: 'linear-gradient(45deg, #ff0000, #ff6600)', 
            color: 'white', 
            padding: '40px', 
            minHeight: '100vh', 
            fontSize: '32px',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            <h1>🎯 SUCCESS! /quotes/:id ROUTE MATCHED! 🎯</h1>
            <p>URL: {window.location.href}</p>
            <p>Time: {new Date().toLocaleString()}</p>
            <p>NO PROTECTED ROUTE - DIRECT ACCESS</p>
            <hr style={{margin: '20px 0'}} />
            {(() => {
              console.log('🎯 Route /quotes/:id matched successfully WITHOUT ProtectedRoute!');
              return <TestQuotePage />;
            })()}
          </div>
        ),
      },
      {
        path: 'guest-checkout',
        element: (
          <ErrorBoundary fallback={PaymentErrorFallback}>
            <Checkout />
          </ErrorBoundary>
        ),
      },
      {
        path: 'order-confirmation/:id',
        element: <OrderConfirmationPage />,
      },
      {
        path: 'payment-success', // PayU success redirect (public access)
        element: (
          <ErrorBoundary fallback={PaymentErrorFallback}>
            <PaymentSuccess />
          </ErrorBoundary>
        ),
      },
      {
        path: 'payment-failure', // PayU failure redirect (public access)
        element: (
          <ErrorBoundary fallback={PaymentErrorFallback}>
            <PaymentFailure />
          </ErrorBoundary>
        ),
      },
      {
        path: 'paypal-success', // PayPal success redirect (public access)
        element: (
          <ErrorBoundary fallback={PaymentErrorFallback}>
            <PaypalSuccess />
          </ErrorBoundary>
        ),
      },
      {
        path: 'paypal-failure', // PayPal failure redirect (public access)
        element: (
          <ErrorBoundary fallback={PaymentErrorFallback}>
            <PaypalFailure />
          </ErrorBoundary>
        ),
      },
      {
        path: 'payment-callback/fonepay', // Fonepay payment callback (public access)
        element: (
          <ErrorBoundary fallback={PaymentErrorFallback}>
            <FonepayCallback />
          </ErrorBoundary>
        ),
      },
      {
        path: 'payment-callback/esewa-success', // eSewa success callback (public access)
        element: (
          <ErrorBoundary fallback={PaymentErrorFallback}>
            <EsewaSuccess />
          </ErrorBoundary>
        ),
      },
      {
        path: 'payment-callback/esewa-failure', // eSewa failure callback (public access)
        element: (
          <ErrorBoundary fallback={PaymentErrorFallback}>
            <EsewaFailure />
          </ErrorBoundary>
        ),
      },
      {
        path: 'payment-test', // Test page for debugging PayU callbacks - Admin only
        element: (
          <AdminProtectedRoute>
            <PaymentTest />
          </AdminProtectedRoute>
        ),
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'dashboard',
            element: <Dashboard />,
          },
          {
            path: 'dashboard/quotes',
            element: <Quotes />,
          },
          // Temporarily commented out to test route conflict
          // {
          //   path: 'dashboard/quotes/:id',
          //   element: (
          //     <ErrorBoundary fallback={AdminErrorFallback}>
          //       <QuoteDetailUnified />
          //     </ErrorBoundary>
          //   ),
          // },
          {
            path: 'dashboard/orders',
            element: <Orders />,
          },
          {
            path: 'dashboard/orders/:id',
            element: <OrderDetail />,
          },
          {
            path: 'dashboard/package-forwarding',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <PackageForwarding />
              </ErrorBoundary>
            ),
          },
          {
            path: 'support',
            element: <Navigate to="/support/my-tickets" replace />,
          },
          {
            path: 'support/my-tickets',
            element: <MyTicketsPage />,
          },
          {
            path: 'quote/:id',
            element: <QuoteDetailUnified />,
          },
          {
            path: 'order/:id',
            element: <CustomerOrderDetailPage />,
          },
          {
            path: 'cart',
            element: <Cart />,
          },
          {
            path: 'checkout',
            element: (
              <ErrorBoundary fallback={PaymentErrorFallback}>
                <Checkout />
              </ErrorBoundary>
            ),
          },
          {
            path: 'messages',
            element: <MessageCenterPage />,
          },
          {
            path: 'profile',
            element: <Profile />,
          },
          {
            path: 'profile/address',
            element: <Address />,
          },
          {
            path: 'test-payment',
            element: <TestPayment />,
          },
          {
            path: 'esewa-test',
            element: <EsewaTest />,
          },
          {
            path: 'test-membership-discount',
            element: <TestMembershipDiscount />,
          },
        ],
      },
      {
        path: 'quotes/*',
        element: (
          <div style={{ 
            background: 'purple', 
            color: 'white', 
            padding: '40px', 
            minHeight: '100vh', 
            fontSize: '24px' 
          }}>
            <h1>🟣 QUOTES WILDCARD ROUTE MATCHED</h1>
            <p>URL: {window.location.href}</p>
            <p>This means quotes/:id didn't match but quotes/* did</p>
          </div>
        ),
      },
      {
        path: '*',
        element: (
          <div style={{ 
            background: 'black', 
            color: 'white', 
            padding: '40px', 
            minHeight: '100vh', 
            fontSize: '24px' 
          }}>
            <h1>⚫ CATCH-ALL ROUTE MATCHED</h1>
            <p>URL: {window.location.href}</p>
            <p>This means no other route matched</p>
            <NotFound />
          </div>
        ),
      },
    ],
  },
]);

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <CloudflareAnalytics />
          <CloudflareBrowserInsights />
          <CloudflareRUM />
          {import.meta.env.DEV && <PerformanceDashboard />}
          <UserRoleEnsurer />
          <PermissionsProvider>
            <AccessibilityProvider>
              <StatusConfigProvider>
                <HelmetProvider>
                  <Suspense fallback={null}>
                    <RouterProvider router={router} />
                  </Suspense>
                  <PhoneCollectionProvider />
                  <Toaster />
                </HelmetProvider>
              </StatusConfigProvider>
            </AccessibilityProvider>
          </PermissionsProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;
