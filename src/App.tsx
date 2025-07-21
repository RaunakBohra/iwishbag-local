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
import { SentryTestTrigger } from '@/components/debug/SentryTestTrigger';

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
const MessageCenter = React.lazy(() =>
  import('@/components/messaging/MessageCenter').then((m) => ({
    default: m.MessageCenter,
  })),
);
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
const ResetPassword = React.lazy(() => import('@/pages/auth/ResetPassword'));
const EmailConfirmation = React.lazy(() => import('@/pages/auth/EmailConfirmation'));
const OAuthCallback = React.lazy(() => import('@/pages/auth/OAuthCallback'));
const FonepayCallback = React.lazy(() => import('@/pages/api/fonepay-callback'));
const EsewaSuccess = React.lazy(() => import('@/pages/payment-callback/esewa-success'));
const EsewaFailure = React.lazy(() => import('@/pages/payment-callback/esewa-failure'));
const TrackingPage = React.lazy(() =>
  import('@/pages/TrackingPage').then((m) => ({ default: m.TrackingPage })),
);
const MyTicketsPage = React.lazy(() => import('@/pages/support/MyTickets'));

// Admin pages (lazy loaded)
const AdminDashboard = React.lazy(() => import('@/pages/admin/Dashboard'));
const EmailTemplatesPage = React.lazy(() => import('@/pages/admin/EmailTemplates'));
const PaymentManagement = React.lazy(() => import('@/pages/admin/PaymentManagement'));
const ShippingRoutesPage = React.lazy(() => import('@/pages/admin/ShippingRoutes'));
const StatusManagementPage = React.lazy(() => import('@/pages/admin/StatusManagement'));
const SupportTicketsPage = React.lazy(() => import('@/pages/admin/SupportTickets'));
const PayUDebugPage = React.lazy(() =>
  import('@/pages/admin/PayUDebugPage').then((m) => ({
    default: m.PayUDebugPage,
  })),
);
const Address = React.lazy(() => import('@/pages/profile/Address'));

// Admin components (lazy loaded for better performance)
const AdminLayout = React.lazy(() =>
  import('@/components/admin/AdminLayout').then((m) => ({
    default: m.AdminLayout,
  })),
);
const QuoteManagementPage = React.lazy(() =>
  import('@/components/admin/QuoteManagementPage').then((m) => ({
    default: m.QuoteManagementPage,
  })),
);
// OrderManagementPage removed - will be replaced by unified interface
const EnhancedCustomerManagementPage = React.lazy(() =>
  import('@/components/admin/EnhancedCustomerManagementPage').then((m) => ({
    default: m.EnhancedCustomerManagementPage,
  })),
);
const CountrySettings = React.lazy(() =>
  import('@/components/admin/CountrySettings').then((m) => ({
    default: m.CountrySettings,
  })),
);
const CustomsCategories = React.lazy(() =>
  import('@/components/admin/CustomsCategories').then((m) => ({
    default: m.CustomsCategories,
  })),
);
const UnifiedQuoteInterface = React.lazy(() => import('@/components/admin/UnifiedQuoteInterface'));
const QuoteTemplatesPage = React.lazy(() =>
  import('@/components/admin/QuoteTemplatesPage').then((m) => ({
    default: m.QuoteTemplatesPage,
  })),
);
const BlogManagementPage = React.lazy(() => import('@/pages/admin/BlogManagement'));
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
const SystemSettings = React.lazy(() =>
  import('@/components/admin/SystemSettings').then((m) => ({
    default: m.SystemSettings,
  })),
);
const TestEmail = React.lazy(() => import('@/pages/TestEmail'));
const PaymentManagementPageNew = React.lazy(() => import('@/pages/admin/PaymentManagementPage'));
const StatusDebug = React.lazy(() => import('@/pages/debug/StatusDebug'));

import { StatusConfigProvider } from './providers/StatusConfigProvider';
import UserRoleEnsurer from '@/components/auth/UserRoleEnsurer';

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
          { path: 'support-tickets', element: <SupportTicketsPage /> },
          { path: 'templates', element: <QuoteTemplatesPage /> },
          {
            path: 'quotes/:id',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <UnifiedQuoteInterface />
              </ErrorBoundary>
            ),
          },
          { path: 'countries', element: <CountrySettings /> },
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
          { path: 'debug/status', element: <StatusDebug /> },
          { path: 'debug/payu', element: <PayUDebugPage /> },
          { path: 'ml/weight-estimator', element: <MLWeightEstimatorTester /> },
          { path: 'blog', element: <BlogManagementPage /> },
          { path: '*', element: <NotFound /> },
        ],
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
          {
            path: 'dashboard/quotes/:id',
            element: <QuoteDetailUnified />,
          },
          {
            path: 'dashboard/orders',
            element: <Orders />,
          },
          {
            path: 'dashboard/orders/:id',
            element: <OrderDetail />,
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
            element: <MessageCenter />,
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
        ],
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <UserRoleEnsurer />
          <AccessibilityProvider>
            <StatusConfigProvider>
              <HelmetProvider>
                <Suspense fallback={null}>
                  <RouterProvider router={router} />
                </Suspense>
                <PhoneCollectionProvider />
                <Toaster />
                <SentryTestTrigger />
              </HelmetProvider>
            </StatusConfigProvider>
          </AccessibilityProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;
