import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
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
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { QuoteManagementPage } from "@/components/admin/QuoteManagementPage";
import { OrderManagementPage } from "@/components/admin/OrderManagementPage";
import { CustomerManagementPage } from "@/components/admin/CustomerManagementPage";
import { CountrySettings } from "@/components/admin/CountrySettings";
import { CustomsCategories } from "@/components/admin/CustomsCategories";
import { UserRoles } from "@/components/admin/UserRoles";
import { MessageCenter } from "@/components/messaging/MessageCenter";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { Cart } from "@/components/cart/Cart";
import AdminQuoteDetailPage from "@/components/admin/AdminQuoteDetailPage";
import CostEstimatorPage from "@/pages/CostEstimator";
import CustomerOrderDetailPage from "@/pages/CustomerOrderDetailPage";
import { RejectionAnalytics } from "@/components/admin/RejectionAnalytics";
import { QuoteTemplatesPage } from "@/components/admin/QuoteTemplatesPage";
import { BankAccountSettings } from "@/components/admin/BankAccountSettings";
import { SystemSettings } from "@/components/admin/SystemSettings";
import OrderConfirmationPage from "@/pages/OrderConfirmationPage";
import { QueryProvider } from './providers/QueryProvider';
import { HomePageSettings } from "@/components/admin/HomePageSettings";
import ButtonPreview from "@/pages/ButtonPreview";
import AdminDashboard from "@/pages/admin/Dashboard";
import CartAnalyticsPage from "@/pages/admin/CartAnalytics";
import CartRecoveryPage from "@/pages/admin/CartRecovery";
import EmailTemplatesPage from "@/pages/admin/EmailTemplates";
import PaymentManagement from "@/pages/admin/PaymentManagement";
import { AccessibilityProvider } from "@/components/ui/AccessibilityProvider";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ProductAnalyzerTest } from "@/pages/ProductAnalyzerTest";

const router = createBrowserRouter([
  {
    path: "admin",
    element: <AdminProtectedRoute />,
    children: [
      {
        path: "",
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminDashboard />,
          },
          {
            path: "cart-analytics",
            element: <CartAnalyticsPage />,
          },
          {
            path: "cart-recovery",
            element: <CartRecoveryPage />,
          },
          {
            path: "email-templates",
            element: <EmailTemplatesPage />,
          },
          {
            path: "analytics",
            element: <AdminAnalytics />,
          },
          {
            path: "rejection-analytics",
            element: <RejectionAnalytics />,
          },
          {
            path: "quotes",
            element: <QuoteManagementPage />,
          },
          {
            path: "orders",
            element: <OrderManagementPage />,
          },
          {
            path: "orders/:id",
            element: <AdminQuoteDetailPage />,
          },
          {
            path: "customers",
            element: <CustomerManagementPage />,
          },
          {
            path: "templates",
            element: <QuoteTemplatesPage />,
          },
          {
            path: "quotes/:id",
            element: <AdminQuoteDetailPage />,
          },
          {
            path: "countries",
            element: <CountrySettings />,
          },
          {
            path: "customs",
            element: <CustomsCategories />,
          },
          {
            path: "bank-accounts",
            element: <BankAccountSettings />,
          },
          {
            path: "system-settings",
            element: <SystemSettings />,
          },
          {
            path: "users",
            element: <UserRoles />,
          },
          {
            path: "footer",
            element: <HomePageSettings />,
          },
          {
            path: "home-page-settings",
            element: <HomePageSettings />,
          },
          {
            path: "payment-management",
            element: <PaymentManagement />,
          },
          {
            path: "*",
            element: <NotFound />,
          },
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
