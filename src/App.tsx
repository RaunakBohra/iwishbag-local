import React, { Suspense, useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { AccessibilityProvider } from "@/components/ui/AccessibilityProvider";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { QueryProvider } from './providers/QueryProvider';
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/layout/Layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

// Lazy load pages for code splitting
const Index = React.lazy(() => import("@/pages/Index"));
const Quote = React.lazy(() => import("@/pages/Quote"));
const Auth = React.lazy(() => import("@/pages/Auth"));
const Dashboard = React.lazy(() => import("@/pages/Dashboard"));
const Quotes = React.lazy(() => import("@/pages/dashboard/Quotes"));
const Orders = React.lazy(() => import("@/pages/dashboard/Orders"));
const QuoteDetail = React.lazy(() => import("@/pages/dashboard/QuoteDetail"));
const OrderDetail = React.lazy(() => import("@/pages/dashboard/OrderDetail"));
const Profile = React.lazy(() => import("@/pages/Profile"));
const About = React.lazy(() => import("@/pages/About"));
const Blog = React.lazy(() => import("@/pages/Blog"));
const Contact = React.lazy(() => import("@/pages/Contact"));
const Checkout = React.lazy(() => import("@/pages/Checkout"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));
const MessageCenter = React.lazy(() => import("@/components/messaging/MessageCenter").then(m => ({ default: m.MessageCenter })));
const Cart = React.lazy(() => import("@/components/cart/Cart").then(m => ({ default: m.Cart })));
const CostEstimatorPage = React.lazy(() => import("@/pages/CostEstimator"));
const CustomerOrderDetailPage = React.lazy(() => import("@/pages/CustomerOrderDetailPage"));
const OrderConfirmationPage = React.lazy(() => import("@/pages/OrderConfirmationPage"));
const PaymentSuccess = React.lazy(() => import("@/pages/PaymentSuccess"));
const PaymentFailure = React.lazy(() => import("@/pages/PaymentFailure"));
const QuoteDetailUnified = React.lazy(() => import("@/pages/dashboard/QuoteDetailUnified"));

// Admin pages (lazy loaded)
const AdminDashboard = React.lazy(() => import("@/pages/admin/Dashboard"));
const CartAnalyticsPage = React.lazy(() => import("@/pages/admin/CartAnalytics"));
const CartRecoveryPage = React.lazy(() => import("@/pages/admin/CartRecovery"));
const EmailTemplatesPage = React.lazy(() => import("@/pages/admin/EmailTemplates"));
const PaymentManagement = React.lazy(() => import("@/pages/admin/PaymentManagement"));
const ShippingRoutesPage = React.lazy(() => import("@/pages/admin/ShippingRoutes"));
const StatusManagementPage = React.lazy(() => import("@/pages/admin/StatusManagement"));
const Address = React.lazy(() => import('@/pages/profile/Address'));

// Admin components (lazy loaded for better performance)
const AdminLayout = React.lazy(() => import("@/components/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminAnalytics = React.lazy(() => import("@/components/admin/AdminAnalytics").then(m => ({ default: m.AdminAnalytics })));
const QuoteManagementPage = React.lazy(() => import("@/components/admin/QuoteManagementPage").then(m => ({ default: m.QuoteManagementPage })));
const EnhancedCustomerManagementPage = React.lazy(() => import("@/components/admin/EnhancedCustomerManagementPage").then(m => ({ default: m.EnhancedCustomerManagementPage })));
const CountrySettings = React.lazy(() => import("@/components/admin/CountrySettings").then(m => ({ default: m.CountrySettings })));
const CustomsCategories = React.lazy(() => import("@/components/admin/CustomsCategories").then(m => ({ default: m.CustomsCategories })));
const UserRoles = React.lazy(() => import("@/components/admin/UserRoles").then(m => ({ default: m.UserRoles })));
const AdminQuoteDetailPage = React.lazy(() => import("@/components/admin/AdminQuoteDetailPage"));
const RejectionAnalytics = React.lazy(() => import("@/components/admin/RejectionAnalytics").then(m => ({ default: m.RejectionAnalytics })));
const QuoteTemplatesPage = React.lazy(() => import("@/components/admin/QuoteTemplatesPage").then(m => ({ default: m.QuoteTemplatesPage })));
const BankAccountSettings = React.lazy(() => import("@/components/admin/BankAccountSettings").then(m => ({ default: m.BankAccountSettings })));
const SystemSettings = React.lazy(() => import("@/components/admin/SystemSettings").then(m => ({ default: m.SystemSettings })));
const HomePageSettings = React.lazy(() => import("@/components/admin/HomePageSettings").then(m => ({ default: m.HomePageSettings })));

import { StatusConfigProvider } from './providers/StatusConfigProvider';

const router = createBrowserRouter([
  {
    path: "admin",
    element: <AdminProtectedRoute />,
    children: [
      {
        path: "",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: "cart-analytics", element: <CartAnalyticsPage /> },
          { path: "cart-recovery", element: <CartRecoveryPage /> },
          { path: "email-templates", element: <EmailTemplatesPage /> },
          { path: "analytics", element: <AdminAnalytics /> },
          { path: "rejection-analytics", element: <RejectionAnalytics /> },
          { path: "quotes", element: <QuoteManagementPage /> },
          
          { path: "orders/:id", element: <AdminQuoteDetailPage /> },
          { path: "customers", element: <EnhancedCustomerManagementPage /> },
          { path: "templates", element: <QuoteTemplatesPage /> },
          { path: "quotes/:id", element: <AdminQuoteDetailPage /> },
          { path: "countries", element: <CountrySettings /> },
          { path: "customs", element: <CustomsCategories /> },
          { path: "bank-accounts", element: <BankAccountSettings /> },
          { path: "system-settings", element: <SystemSettings /> },
          { path: "users", element: <UserRoles /> },
          { path: "footer", element: <HomePageSettings /> },
          { path: "home-page-settings", element: <HomePageSettings /> },
          { path: "payment-management", element: <PaymentManagement /> },
          { path: "shipping-routes", element: <ShippingRoutesPage /> },
          { path: "status-management", element: <StatusManagementPage /> },
          
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
        path: "s/:shareToken",
        element: <QuoteDetailUnified isShareToken={true} />,
      },
      {
        path: "guest-checkout",
        element: <Checkout />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "dashboard",
            element: <Dashboard />,
          },
          {
            path: "dashboard/quotes",
            element: <Quotes />,
          },
          {
            path: "dashboard/quotes/:id",
            element: <QuoteDetailUnified />,
          },
          {
            path: "dashboard/orders",
            element: <Orders />,
          },
          {
            path: "dashboard/orders/:id",
            element: <OrderDetail />,
          },
          {
            path: "quote/:id",
            element: <QuoteDetailUnified />,
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
            path: "payment-success", // PayU success redirect
            element: <PaymentSuccess />,
          },
          {
            path: "payment-failure", // PayU failure redirect
            element: <PaymentFailure />,
          },
          {
            path: "profile",
            element: <Profile />,
          },
          {
            path: "profile/address",
            element: <Address />,
          },
        ],
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
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryProvider>
          <AuthProvider>
            <AccessibilityProvider>
              <StatusConfigProvider>
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                  <RouterProvider router={router} />
                </Suspense>
                <Toaster />
              </StatusConfigProvider>
            </AccessibilityProvider>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
