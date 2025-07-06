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
import Index from "@/pages/Index";
import Quote from "@/pages/Quote";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Quotes from "@/pages/dashboard/Quotes";
import Orders from "@/pages/dashboard/Orders";
import QuoteDetail from "@/pages/dashboard/QuoteDetail";
import OrderDetail from "@/pages/dashboard/OrderDetail";
import QuoteDetails from "@/pages/QuoteDetails";
import Profile from "@/pages/Profile";
import About from "@/pages/About";
import Blog from "@/pages/Blog";
import Contact from "@/pages/Contact";
import Checkout from "@/pages/Checkout";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";
import { MessageCenter } from "@/components/messaging/MessageCenter";
import { Cart } from "@/components/cart/Cart";
import CostEstimatorPage from "@/pages/CostEstimator";
import CustomerOrderDetailPage from "@/pages/CustomerOrderDetailPage";
import OrderConfirmationPage from "@/pages/OrderConfirmationPage";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFailure from "@/pages/PaymentFailure";
import AdminDashboard from "@/pages/admin/Dashboard";
import CartAnalyticsPage from "@/pages/admin/CartAnalytics";
import CartRecoveryPage from "@/pages/admin/CartRecovery";
import EmailTemplatesPage from "@/pages/admin/EmailTemplates";
import PaymentManagement from "@/pages/admin/PaymentManagement";
import ShippingRoutesPage from "@/pages/admin/ShippingRoutes";
import StatusManagementPage from "@/pages/admin/StatusManagement";
import Address from '@/pages/profile/Address';

// Direct imports instead of lazy loading
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { QuoteManagementPage } from "@/components/admin/QuoteManagementPage";

import { EnhancedCustomerManagementPage } from "@/components/admin/EnhancedCustomerManagementPage";
import { CountrySettings } from "@/components/admin/CountrySettings";
import { CustomsCategories } from "@/components/admin/CustomsCategories";
import { UserRoles } from "@/components/admin/UserRoles";
import AdminQuoteDetailPage from "@/components/admin/AdminQuoteDetailPage";
import { RejectionAnalytics } from "@/components/admin/RejectionAnalytics";
import { QuoteTemplatesPage } from "@/components/admin/QuoteTemplatesPage";
import { BankAccountSettings } from "@/components/admin/BankAccountSettings";
import { SystemSettings } from "@/components/admin/SystemSettings";
import { HomePageSettings } from "@/components/admin/HomePageSettings";

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
            element: <QuoteDetail />,
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
                <RouterProvider router={router} />
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
