import { Suspense, useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { AccessibilityProvider } from "@/components/ui/AccessibilityProvider";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { QueryProvider } from './providers/QueryProvider';
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/layout/Layout";
import Index from "@/pages/Index";
import Quote from "@/pages/Quote";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import QuoteDetails from "@/pages/QuoteDetails";
import Profile from "@/pages/Profile";
import About from "@/pages/About";
import Blog from "@/pages/Blog";
import Contact from "@/pages/Contact";
import Checkout from "@/pages/Checkout";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";
import EmergencyAdmin from "@/pages/EmergencyAdmin";
import { MessageCenter } from "@/components/messaging/MessageCenter";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { Cart } from "@/components/cart/Cart";
import CostEstimatorPage from "@/pages/CostEstimator";
import CustomerOrderDetailPage from "@/pages/CustomerOrderDetailPage";
import OrderConfirmationPage from "@/pages/OrderConfirmationPage";
import ButtonPreview from "@/pages/ButtonPreview";
import { ProductAnalyzerTest } from "@/pages/ProductAnalyzerTest";

// Lazy load admin/dashboard components
const AdminLayout = React.lazy(() => import("@/components/admin/AdminLayout"));
const AdminAnalytics = React.lazy(() => import("@/components/admin/AdminAnalytics"));
const QuoteManagementPage = React.lazy(() => import("@/components/admin/QuoteManagementPage"));
const OrderManagementPage = React.lazy(() => import("@/components/admin/OrderManagementPage"));
const EnhancedCustomerManagementPage = React.lazy(() => import("@/components/admin/EnhancedCustomerManagementPage"));
const CountrySettings = React.lazy(() => import("@/components/admin/CountrySettings"));
const CustomsCategories = React.lazy(() => import("@/components/admin/CustomsCategories"));
const UserRoles = React.lazy(() => import("@/components/admin/UserRoles"));
const AdminQuoteDetailPage = React.lazy(() => import("@/components/admin/AdminQuoteDetailPage"));
const RejectionAnalytics = React.lazy(() => import("@/components/admin/RejectionAnalytics"));
const QuoteTemplatesPage = React.lazy(() => import("@/components/admin/QuoteTemplatesPage"));
const BankAccountSettings = React.lazy(() => import("@/components/admin/BankAccountSettings"));
const SystemSettings = React.lazy(() => import("@/components/admin/SystemSettings"));
const HomePageSettings = React.lazy(() => import("@/components/admin/HomePageSettings"));
const AdminDashboard = React.lazy(() => import("@/pages/admin/Dashboard"));
const CartAnalyticsPage = React.lazy(() => import("@/pages/admin/CartAnalytics"));
const CartRecoveryPage = React.lazy(() => import("@/pages/admin/CartRecovery"));
const EmailTemplatesPage = React.lazy(() => import("@/pages/admin/EmailTemplates"));
const PaymentManagement = React.lazy(() => import("@/pages/admin/PaymentManagement"));

const router = createBrowserRouter([
  {
    path: "admin",
    element: <AdminProtectedRoute />,
    children: [
      {
        path: "",
        element: (
          <Suspense fallback={<div className="p-8 text-center">Loading admin...</div>}>
            <AdminLayout />
          </Suspense>
        ),
        children: [
          { index: true, element: <Suspense fallback={<div>Loading...</div>}><AdminDashboard /></Suspense> },
          { path: "cart-analytics", element: <Suspense fallback={<div>Loading...</div>}><CartAnalyticsPage /></Suspense> },
          { path: "cart-recovery", element: <Suspense fallback={<div>Loading...</div>}><CartRecoveryPage /></Suspense> },
          { path: "email-templates", element: <Suspense fallback={<div>Loading...</div>}><EmailTemplatesPage /></Suspense> },
          { path: "analytics", element: <Suspense fallback={<div>Loading...</div>}><AdminAnalytics /></Suspense> },
          { path: "rejection-analytics", element: <Suspense fallback={<div>Loading...</div>}><RejectionAnalytics /></Suspense> },
          { path: "quotes", element: <Suspense fallback={<div>Loading...</div>}><QuoteManagementPage /></Suspense> },
          { path: "orders", element: <Suspense fallback={<div>Loading...</div>}><OrderManagementPage /></Suspense> },
          { path: "orders/:id", element: <Suspense fallback={<div>Loading...</div>}><AdminQuoteDetailPage /></Suspense> },
          { path: "customers", element: <Suspense fallback={<div>Loading...</div>}><EnhancedCustomerManagementPage /></Suspense> },
          { path: "templates", element: <Suspense fallback={<div>Loading...</div>}><QuoteTemplatesPage /></Suspense> },
          { path: "quotes/:id", element: <Suspense fallback={<div>Loading...</div>}><AdminQuoteDetailPage /></Suspense> },
          { path: "countries", element: <Suspense fallback={<div>Loading...</div>}><CountrySettings /></Suspense> },
          { path: "customs", element: <Suspense fallback={<div>Loading...</div>}><CustomsCategories /></Suspense> },
          { path: "bank-accounts", element: <Suspense fallback={<div>Loading...</div>}><BankAccountSettings /></Suspense> },
          { path: "system-settings", element: <Suspense fallback={<div>Loading...</div>}><SystemSettings /></Suspense> },
          { path: "users", element: <Suspense fallback={<div>Loading...</div>}><UserRoles /></Suspense> },
          { path: "footer", element: <Suspense fallback={<div>Loading...</div>}><HomePageSettings /></Suspense> },
          { path: "home-page-settings", element: <Suspense fallback={<div>Loading...</div>}><HomePageSettings /></Suspense> },
          { path: "payment-management", element: <Suspense fallback={<div>Loading...</div>}><PaymentManagement /></Suspense> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Index />,
      },
      {
        path: "quote",
        element: <Quote />,
      },
      {
        path: "auth",
        element: <Auth />,
      },
      {
        path: "about",
        element: <About />,
      },
      {
        path: "blog",
        element: <Blog />,
      },
      {
        path: "contact",
        element: <Contact />,
      },
      {
        path: "cost-estimator",
        element: <CostEstimatorPage />,
      },
      {
        path: "test-analyzer",
        element: <ProductAnalyzerTest />,
      },
      {
        path: "emergency-admin",
        element: <EmergencyAdmin />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "dashboard",
            element: <Dashboard />,
          },
          {
            path: "quote/:id",
            element: <QuoteDetails />,
          },
          {
            path: "order/:id",
            element: <CustomerOrderDetailPage />,
          },
          {
            path: "cart",
            element: <Cart />,
          },
          {
            path: "checkout",
            element: <Checkout />,
          },
          {
            path: "messages",
            element: <MessageCenter />,
          },
          
          {
            path: "order-confirmation/:id", // New route for order confirmation
            element: <OrderConfirmationPage />,
          },
          {
            path: "notifications",
            element: <NotificationCenter />,
          },
          {
            path: "profile",
            element: <Profile />,
          },
        ],
      },
      {
        path: "button-preview",
        element: <ButtonPreview />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

function App() {
  return (
    <QueryProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <AccessibilityProvider>
            <div className="min-h-screen">
              <ErrorBoundary>
                <RouterProvider router={router} />
              </ErrorBoundary>
            </div>
            <Toaster />
          </AccessibilityProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

export default App;
