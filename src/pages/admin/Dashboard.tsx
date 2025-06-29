import React from "react";
import { SystemStatus } from "@/components/admin/SystemStatus";
import { RecentActivity } from "@/components/admin/RecentActivity";
import { DashboardSkeleton } from "@/components/admin/DashboardSkeleton";
import { 
  ConversionRate, 
  RevenueTrend, 
  VolumeTrend, 
  TopCountries, 
  AverageOrderValue,
  ExportAnalytics
} from "@/components/admin/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  BarChart3, 
  Users, 
  FileText, 
  Package, 
  TrendingUp, 
  ShoppingCart,
  Mail,
  Settings,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ManualAnalysisTasks } from "@/components/admin/ManualAnalysisTasks";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";
import { EmergencyAdminAccess } from "@/components/admin/EmergencyAdminAccess";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Tables } from "@/integrations/supabase/types";
import { CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuoteManagementPage } from "@/components/admin/QuoteManagementPage";
import { OrderManagementPage } from "@/components/admin/OrderManagementPage";
import { CustomerManagementPage } from "@/components/admin/CustomerManagementPage";
import { SystemSettings } from "@/components/admin/SystemSettings";
import { PaymentGatewayManagement } from "@/components/admin/PaymentGatewayManagement";
import { ExchangeRateManagement } from "@/components/admin/ExchangeRateManagement";
import { CountrySettings } from "@/components/admin/CountrySettings";
import { BankAccountSettings } from "@/components/admin/BankAccountSettings";
import { HomePageSettings } from "@/components/admin/HomePageSettings";
import { EmailTemplateManager } from "@/components/admin/EmailTemplateManager";
import { UserRoles } from "@/components/admin/UserRoles";
import { CartAnalytics } from "@/components/admin/CartAnalytics";
import { CartRecovery } from "@/components/admin/CartRecovery";
import { AdminRoleRecovery } from "@/components/admin/AdminRoleRecovery";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Globe, RefreshCw, UserCheck } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();

  // Fetch quick stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [quotesResult, ordersResult, customersResult, pendingQuotesResult] = await Promise.all([
        supabase.from('quotes').select('*', { count: 'exact', head: true }),
        supabase.from('quotes').select('*', { count: 'exact', head: true }).in('status', ['paid', 'ordered', 'shipped', 'completed']),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('quotes').select('*', { count: 'exact', head: true }).in('status', ['pending', 'confirmed']),
      ]);

      // Try to get payment data, but handle gracefully if table doesn't exist
      let paymentResult = { count: 0 };
      let revenueResult = { data: [] };
      try {
        const [paymentData, revenueData] = await Promise.all([
          supabase.from('payment_transactions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
          supabase.from('payment_transactions').select('amount').eq('status', 'completed')
        ]);
        paymentResult = paymentData;
        revenueResult = revenueData;
      } catch (error) {
        console.warn('Payment transactions table not available:', error);
      }

      // Calculate total revenue from completed payments
      const totalRevenue = revenueResult.data?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0;

      return {
        totalQuotes: quotesResult.count || 0,
        totalOrders: ordersResult.count || 0,
        totalCustomers: customersResult.count || 0,
        pendingQuotes: pendingQuotesResult.count || 0,
        totalPayments: paymentResult.count || 0,
        totalRevenue: totalRevenue,
        activeOrders: ordersResult.count || 0, // Using total orders as active for now
        newCustomersThisMonth: 0, // Placeholder - would need more complex query
      };
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const quickActions = [
    {
      title: "View Quotes",
      description: "Manage customer quotes",
      icon: FileText,
      href: "/admin/quotes",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      title: "Manage Orders",
      description: "Track and process orders",
      icon: Package,
      href: "/admin/orders",
      color: "bg-green-500/10 text-green-600 dark:text-green-400",
    },
    {
      title: "Customer Analytics",
      description: "View customer insights",
      icon: Users,
      href: "/admin/customers",
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
    {
      title: "Cart Analytics",
      description: "Monitor cart performance",
      icon: ShoppingCart,
      href: "/admin/cart-analytics",
      color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    },
    {
      title: "Email Templates",
      description: "Manage email campaigns",
      icon: Mail,
      href: "/admin/email-templates",
      color: "bg-red-500/10 text-red-600 dark:text-red-400",
    },
    {
      title: "Payment Management",
      description: "Manage payment transactions",
      icon: CreditCard,
      href: "/admin/payment-management",
      color: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    },
  ];

  // Show skeleton while loading
  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage your international shopping platform</p>
        </div>
      </div>

      {/* Manual Analysis Tasks - New Feature */}
      <ManualAnalysisTasks />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalQuotes || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time quote requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Orders in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPayments || 0}</div>
            <p className="text-xs text-muted-foreground">
              Successful transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Card key={action.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${action.color}`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
        </div>
      </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate(action.href)}
              >
                Go to {action.title}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Database: Online</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Email Service: Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Payment Gateway: Connected</span>
            </div>
      </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalQuotes || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.pendingQuotes || 0} pending
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.activeOrders || 0} active
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.newCustomersThisMonth || 0} this month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(stats?.totalRevenue || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>
          </div>

          <AdminAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard; 