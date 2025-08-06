import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '@/contexts/AuthContext';
import { AccessibilityProvider } from '@/components/ui/AccessibilityProvider';
import { PhoneCollectionProvider } from '@/components/onboarding/PhoneCollectionProvider';
import { LoadingProvider } from '@/contexts/LoadingContext';
import {
  ErrorBoundary,
  PaymentErrorFallback,
  QuoteFormErrorFallback,
  AdminErrorFallback,
} from '@/components/ui/ErrorBoundary';
import { QueryProvider } from './providers/QueryProvider';
import { SkeletonProvider } from './providers/SkeletonProvider';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminProtectedRoute from '@/components/auth/AdminProtectedRoute';

// Lazy load pages for code splitting
const Index = React.lazy(() => import('@/pages/Index'));
const Quote = React.lazy(() => import('@/pages/Quote'));
const Auth = React.lazy(() => import('@/pages/Auth'));
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
// const Quotes = React.lazy(() => import('@/pages/dashboard/Quotes')); // REMOVED: V1 customer quotes page
const Orders = React.lazy(() => import('@/pages/dashboard/Orders'));
const OrderDetail = React.lazy(() => import('@/pages/dashboard/OrderDetail'));
const Profile = React.lazy(() => import('@/pages/Profile'));
const About = React.lazy(() => import('@/pages/About'));
const Blog = React.lazy(() => import('@/pages/Blog'));
const BlogPost = React.lazy(() => import('@/pages/BlogPost'));
const ContactRedirect = React.lazy(() => import('@/components/ContactRedirect').then((m) => ({ default: m.ContactRedirect })));
const PrivacyPolicy = React.lazy(() => import('@/pages/PrivacyPolicy'));
const TermsConditions = React.lazy(() => import('@/pages/TermsConditions'));
const Returns = React.lazy(() => import('@/pages/Returns'));
const Help = React.lazy(() => import('@/pages/Help'));
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
// const QuoteDetailUnified = React.lazy(() => import('@/pages/dashboard/QuoteDetailUnified')); // REMOVED: V1
// import CustomerQuoteDetail from '@/pages/dashboard/CustomerQuoteDetail'; // REMOVED: V1
// import TestQuotePage from '@/pages/TestQuotePage'; // REMOVED: V1 test page
// const UnifiedQuotePage = React.lazy(() => import('@/pages/unified/UnifiedQuotePage')); // REMOVED: V1 unified page
const ResetPassword = React.lazy(() => import('@/pages/auth/ResetPassword'));
const EmailConfirmation = React.lazy(() => import('@/pages/auth/EmailConfirmation'));
const OAuthCallback = React.lazy(() => import('@/pages/auth/OAuthCallback'));
// const VerifyQuoteApproval = React.lazy(() => import('@/pages/auth/VerifyQuoteApproval')); // REMOVED: V1 verification page
const FonepayCallback = React.lazy(() => import('@/pages/api/fonepay-callback'));
const EsewaSuccess = React.lazy(() => import('@/pages/payment-callback/esewa-success'));
const EsewaFailure = React.lazy(() => import('@/pages/payment-callback/esewa-failure'));
const TrackingPage = React.lazy(() =>
  import('@/pages/TrackingPage').then((m) => ({ default: m.TrackingPage })),
);
const MyTicketsPage = React.lazy(() => import('@/pages/support/MyTickets'));

// Admin pages (lazy loaded)
const AdminDashboard = React.lazy(() => import('@/pages/admin/Dashboard'));
// const AdminQuoteDetailsPage = React.lazy(() => import('@/pages/admin/quote/AdminQuoteDetailsPage')); // REMOVED: Redundant - QuoteCalculatorV2 handles editing
const QuotesListPage = React.lazy(() => import('@/pages/admin/QuotesListPage'));
// const EmailTemplatesPage = React.lazy(() => import('@/pages/admin/EmailTemplates')); // Email templates removed
const PaymentManagement = React.lazy(() => import('@/pages/admin/PaymentManagement'));
const ShippingRoutesPage = React.lazy(() => import('@/pages/admin/ShippingRoutes'));
const StatusManagementPage = React.lazy(() => import('@/pages/admin/StatusManagement'));
const SupportTicketsPage = React.lazy(() => import('@/pages/admin/SupportTickets'));
const AutoAssignmentPage = React.lazy(() => import('@/pages/admin/AutoAssignment'));
const EnhancedCustomerManagementPage = React.lazy(() => import('@/components/admin/SimpleCustomerManagement'));
const CustomerProfile = React.lazy(() => import('@/pages/admin/CustomerProfile'));
const CountrySettings = React.lazy(() => import('@/components/admin/CountrySettings'));
const BankAccountSettings = React.lazy(() => import('@/components/admin/BankAccountSettings'));
const SystemSettings = React.lazy(() => import('@/components/admin/SystemSettings'));
const TestEmail = React.lazy(() => import('@/pages/TestEmail'));
const TestSES = React.lazy(() => import('@/pages/TestSES'));
const DiscountSystemTest = React.lazy(() => import('@/components/test/DiscountSystemTest').then((m) => ({ default: m.DiscountSystemTest })));
const PayUDebugPage = React.lazy(() =>
  import('@/pages/admin/PayUDebugPage').then((m) => ({
    default: m.PayUDebugPage,
  })),
);
const Address = React.lazy(() => import('@/pages/profile/Address'));

// Admin components (lazy loaded with separate chunks for better performance)
const AdminLayout = React.lazy(() => import('@/components/admin/AdminLayout'));
const WAFManagement = React.lazy(() => import('@/pages/admin/WAFManagement'));
const RateLimitManagement = React.lazy(() => import('@/pages/admin/RateLimitManagement'));
const StatusDebug = React.lazy(() => import('@/pages/debug/StatusDebug'));
const AdminStatusDebug = React.lazy(() => import('@/pages/debug/AdminStatusDebug'));
const DuplicateComponentsPreview = React.lazy(() => import('@/pages/admin/DuplicateComponentsPreview'));
const BlogManagementPage = React.lazy(() => import('@/pages/admin/BlogManagement'));
const MembershipManagementPage = React.lazy(() => import('@/pages/admin/MembershipManagement'));
const DiscountManagementPage = React.lazy(() => import('@/pages/admin/DiscountManagement'));
const EmailDashboard = React.lazy(() => import('@/pages/admin/EmailDashboard'));
const SMSDashboard = React.lazy(() => import('@/pages/admin/SMSDashboard'));
const QuoteCalculatorV2 = React.lazy(() => import('@/pages/admin/QuoteCalculatorV2'));
const QuoteReminderSettings = React.lazy(() => import('@/pages/admin/QuoteReminderSettings'));
const ReturnManagement = React.lazy(() => import('@/pages/admin/ReturnManagement'));
const TestMembershipDiscount = React.lazy(() => import('@/pages/TestMembershipDiscount'));
const AbuseMonitoringDashboard = React.lazy(() => import('@/components/admin/AbuseMonitoringDashboard').then((m) => ({ default: m.AbuseMonitoringDashboard })));
const CustomerQuotesList = React.lazy(() => import('@/pages/CustomerQuotesList'));

// Demo components - temporarily disabled for build issues
// const ManualTaxInputDesigns = React.lazy(() => import('@/demo/ManualTaxInputDesigns'));
// const ToggleDesigns = React.lazy(() => import('@/demo/ToggleDesigns'));
// const UrlAutoFillDemo = React.lazy(() => import('@/pages/demo/UrlAutoFillDemo'));
// const WeightTabDemo = React.lazy(() => import('@/demo/WeightTabDemo'));
const CompactPhoneInputDemo = React.lazy(() => import('@/demo/CompactPhoneInputDemo'));
const QuoteV2Demo = React.lazy(() => import('@/components/demo/QuoteV2Demo').then((m) => ({ default: m.QuoteV2Demo })));
const QuoteV2Integration = React.lazy(() => import('@/pages/demos/QuoteV2Integration'));
const PublicQuoteView = React.lazy(() => import('@/pages/PublicQuoteView'));
const TestSmartProductForm = React.lazy(() => import('@/pages/TestSmartProductForm'));
const RouteShippingDesigns = React.lazy(() => import('@/pages/demo/RouteShippingDesigns'));
const ShopifyStyleQuoteView = React.lazy(() => import('@/components/quotes/ShopifyStyleQuoteView').then((m) => ({ default: m.ShopifyStyleQuoteView })));
// const ProfessionalProductTableVariants = React.lazy(() => import('@/demo/ProfessionalProductTableVariants' /* webpackChunkName: "demo-product-table" */));

// Smart Intelligence Management pages
const SmartIntelligenceDashboard = React.lazy(() => import('@/pages/admin/SmartIntelligenceDashboard'));
const ProductClassificationsManager = React.lazy(() => import('@/pages/admin/ProductClassificationsManager'));
const CountrySettingsManager = React.lazy(() => import('@/pages/admin/CountrySettingsManager'));
const IntelligenceSettings = React.lazy(() => import('@/pages/admin/IntelligenceSettings'));
const DataManagement = React.lazy(() => import('@/pages/admin/DataManagement'));

import { StatusConfigProvider } from './providers/StatusConfigProvider';
// Role-related imports removed - using simple authentication only

// Import test utilities in development
if (import.meta.env.DEV) {
  import('@/utils/recordTestPayment');
}

const router = createBrowserRouter([
  {
    path: 'admin',
    element: <ProtectedRoute />,
    children: [
      {
        path: '',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboard /> },
          // { path: 'email-templates', element: <EmailTemplatesPage /> }, // Email templates removed
          {
            path: 'quotes',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <QuotesListPage />
              </ErrorBoundary>
            ),
          },
          {
            path: 'quote-calculator-v2',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <QuoteCalculatorV2 />
              </ErrorBoundary>
            ),
          },
          {
            path: 'quote-calculator-v2/:id',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <QuoteCalculatorV2 />
              </ErrorBoundary>
            ),
          },
          { path: 'orders', element: <Navigate to="/admin/quotes" replace /> },
          {
            path: 'orders/:id',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <AdminDashboard />
              </ErrorBoundary>
            ),
          },
          { path: 'customers', element: <EnhancedCustomerManagementPage /> },
          { path: 'customers/:customerId', element: <CustomerProfile /> },
          // { path: 'users', element: <UserManagementPage /> }, // User management removed
          { path: 'support-tickets', element: <SupportTicketsPage /> },
          { path: 'auto-assignment', element: <AutoAssignmentPage /> },
          // { path: 'templates', element: <QuoteTemplatesPage /> }, // Component not found - commented out
          {
            path: 'quotes/:id',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <QuoteCalculatorV2 />
              </ErrorBoundary>
            ),
          },
          { path: 'countries', element: <CountrySettings /> },
          { path: 'bank-accounts', element: <BankAccountSettings /> },
          { path: 'system-settings', element: <SystemSettings /> },
          { path: 'test-email', element: <TestEmail /> },
          { path: 'test-ses', element: <TestSES /> },
          { path: 'test-discount', element: <DiscountSystemTest /> },
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
          // { path: 'payment-proofs', element: <PaymentManagementPageNew /> }, // Removed payment proofs page
          { path: 'waf-management', element: <WAFManagement /> },
          { path: 'rate-limit-management', element: <RateLimitManagement /> },
          { path: 'debug/status', element: <StatusDebug /> },
          { path: 'cleanup/duplicates', element: <DuplicateComponentsPreview /> },
          { path: 'debug/payu', element: <PayUDebugPage /> },
          
          { path: 'blog', element: <BlogManagementPage /> },
          { path: 'memberships', element: <MembershipManagementPage /> },
          { path: 'discounts', element: <DiscountManagementPage /> },
          { 
            path: 'abuse-monitoring', 
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <AbuseMonitoringDashboard />
              </ErrorBoundary>
            )
          },
          { path: 'quote-reminders', element: <QuoteReminderSettings /> },
          { path: 'emails', element: <EmailDashboard /> },
          { path: 'sms', element: <SMSDashboard /> },
          // Audit logs page removed
          {
            path: 'returns',
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <ReturnManagement />
              </ErrorBoundary>
            ),
          },
          // Smart Intelligence Management routes
          { 
            path: 'smart-intelligence', 
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <SmartIntelligenceDashboard />
              </ErrorBoundary>
            )
          },
          { 
            path: 'product-classifications', 
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <ProductClassificationsManager />
              </ErrorBoundary>
            )
          },
          { 
            path: 'country-settings', 
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <CountrySettingsManager />
              </ErrorBoundary>
            )
          },
          { 
            path: 'intelligence-settings', 
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <IntelligenceSettings />
              </ErrorBoundary>
            )
          },
          { 
            path: 'data-management', 
            element: (
              <ErrorBoundary fallback={AdminErrorFallback}>
                <DataManagement />
              </ErrorBoundary>
            )
          },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
  // Development routes (public access)
  // Demo routes (public access for design review) - temporarily disabled
  // {
  //   path: 'demo',
  //   children: [
  //     // {
  //     //   index: true,
  //     //   element: <DemoIndex />,
  //     // }, // DemoIndex component doesn't exist
  //     {
  //       path: 'manual-tax-designs',
  //       element: <ManualTaxInputDesigns />,
  //     },
  //     {
  //       path: 'toggle-designs',
  //       element: <ToggleDesigns />,
  //     },
  //     {
  //       path: 'url-autofill',
  //       element: <UrlAutoFillDemo />,
  //     },
  //     {
  //       path: 'weight-tabs',
  //       element: <WeightTabDemo />,
  //     },
  //     // {
  //     //   path: 'product-table-variants',
  //     //   element: <ProfessionalProductTableVariants />,
  //     // },
  //   ],
  // },
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
  // {
  //   path: 'auth/verify-quote',
  //   element: <VerifyQuoteApproval />, // REMOVED: V1 verification page
  // },
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
        element: <ContactRedirect />,
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
        path: 'help',
        element: <Help />,
      },
      {
        path: 'demo/compact-phone',
        element: <CompactPhoneInputDemo />,
      },
      {
        path: 'demo/quotes-v2',
        element: <QuoteV2Demo />,
      },
      {
        path: 'demo/quotes-v2-integration',
        element: <QuoteV2Integration />,
      },
      {
        path: 'test-smart-product-form',
        element: <TestSmartProductForm />,
      },
      {
        path: 'demo/route-shipping-designs',
        element: <RouteShippingDesigns />,
      },
      {
        path: 'quote/view/:token',
        element: <PublicQuoteView />,
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
        element: (
          <ErrorBoundary fallback={QuoteFormErrorFallback}>
            <ShopifyStyleQuoteView viewMode="shared" />
          </ErrorBoundary>
        ),
      },
      // Moved quotes/:id to ProtectedRoute children section below
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
        element: <ProtectedRoute />,
        children: [
          {
            path: 'payment-test', // Test page for debugging PayU callbacks
            element: <PaymentTest />,
          },
          {
            path: 'dashboard',
            element: <Dashboard />,
          },
          {
            path: 'dashboard/quotes',
            element: (
              <ErrorBoundary fallback={QuoteFormErrorFallback}>
                <CustomerQuotesList />
              </ErrorBoundary>
            ),
          },
          {
            path: 'dashboard/quotes/:id',
            element: (
              <ErrorBoundary fallback={QuoteFormErrorFallback}>
                <ShopifyStyleQuoteView viewMode="customer" />
              </ErrorBoundary>
            ),
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
            element: <Navigate to="/admin/quotes" replace />, // Redirect to admin quotes
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
            path: 'debug/admin-status',
            element: <AdminStatusDebug />,
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
          {
            path: 'quotes/:id',
            element: <Navigate to="/admin/quotes" replace />, // Redirect to admin quotes
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
        <SkeletonProvider>
          <AuthProvider>
            <LoadingProvider>
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
            </LoadingProvider>
          </AuthProvider>
        </SkeletonProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;
