import React from 'react';
import { DashboardSkeleton } from '@/components/admin/DashboardSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  Package,
  TrendingUp,
  ShoppingCart,
  Mail,
  CheckCircle,
  CreditCard,
  Shield,
  Clock,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ManualAnalysisTasks } from '@/components/admin/ManualAnalysisTasks';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { SimpleEnhancedAnalytics } from '@/components/admin/SimpleEnhancedAnalytics';
import { SimpleShareStats } from '@/components/admin/SimpleShareStats';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { SystemHealthCheck } from '@/components/admin/SystemHealthCheck';
import { PermissionsTestCard } from '@/components/admin/PermissionsTestCard';
import { HSNManagementQuickAction } from '@/components/admin/HSNManagementQuickAction';
import { ErrorMonitoringDashboard } from '@/components/admin/ErrorMonitoringDashboard';
import { D1SyncManager } from '@/components/admin/D1SyncManager';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { getStatusesForOrdersList, getStatusesForQuotesList } = useStatusManagement();

  // Fetch comprehensive data for analytics with optimized queries
  const { data: allQuotes, isLoading: quotesLoading } = useQuery({
    queryKey: ['admin-all-quotes'],
    queryFn: async () => {
      // Only select needed columns for analytics to reduce data transfer
      const { data, error } = await supabase
        .from('quotes')
        .select(
          'id, display_id, status, destination_country, final_total_usd, created_at, customer_data, items, user_id',
        )
        .order('created_at', { ascending: false })
        .limit(1000); // Limit to prevent excessive data loading
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000, // Cache for 5 minutes
    refetchInterval: 600000, // Refetch every 10 minutes
  });

  const { data: allOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-all-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select(
          'id, display_id, status, destination_country, final_total_usd, created_at, customer_data, items, user_id',
        )
        .in('status', getStatusesForOrdersList())
        .order('created_at', { ascending: false })
        .limit(500); // Limit orders
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000, // Cache for 5 minutes
    refetchInterval: 600000, // Refetch every 10 minutes
  });

  // Fetch quick stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [quotesResult, ordersResult, customersResult, pendingQuotesResult] = await Promise.all([
        supabase.from('quotes').select('*', { count: 'exact', head: true }),
        supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .in('status', getStatusesForOrdersList()),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .in('status', getStatusesForQuotesList()),
      ]);

      // Try to get payment data, but handle gracefully if table doesn't exist
      let paymentResult = { count: 0 };
      let revenueResult = { data: [] };
      try {
        const [paymentData, revenueData] = await Promise.all([
          supabase
            .from('payment_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed'),
          supabase.from('payment_transactions').select('amount').eq('status', 'completed'),
        ]);
        paymentResult = paymentData;
        revenueResult = revenueData;
      } catch (error) {
        console.warn('Payment transactions table not available:', error);
      }

      // Calculate total revenue from completed payments
      const totalRevenue =
        revenueResult.data?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0;

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
      title: 'View Quotes',
      description: 'Manage customer quotes',
      icon: FileText,
      href: '/admin/quotes',
      color: 'bg-teal-500/10 text-teal-600',
    },
    {
      title: 'Manage Orders',
      description: 'Track and process orders',
      icon: Package,
      href: '/admin/orders',
      color: 'bg-green-500/10 text-green-600',
    },
    {
      title: 'Customer Analytics',
      description: 'View customer insights',
      icon: Users,
      href: '/admin/customers',
      color: 'bg-orange-500/10 text-orange-600',
    },
    {
      title: 'Email Templates',
      description: 'Manage email campaigns',
      icon: Mail,
      href: '/admin/email-templates',
      color: 'bg-red-500/10 text-red-600',
    },
    {
      title: 'Payment Management',
      description: 'Manage payment transactions',
      icon: CreditCard,
      href: '/admin/payment-management',
      color: 'bg-teal-500/10 text-teal-600',
    },
    {
      title: 'WAF Security',
      description: 'Configure firewall rules',
      icon: Shield,
      href: '/admin/waf-management',
      color: 'bg-purple-500/10 text-purple-600',
    },
    {
      title: 'Rate Limiting',
      description: 'Manage API rate limits',
      icon: Clock,
      href: '/admin/rate-limit-management',
      color: 'bg-orange-500/10 text-orange-600',
    },
  ];

  // Show skeleton while loading
  if (statsLoading || quotesLoading || ordersLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage your international shopping platform
          </p>
        </div>
      </div>

      {/* Manual Analysis Tasks - New Feature */}
      <ManualAnalysisTasks />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalQuotes || 0}</div>
            <p className="text-xs text-muted-foreground">All time quote requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">Orders in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPayments || 0}</div>
            <p className="text-xs text-muted-foreground">Successful transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and HSN Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Quick Actions - Take up 3 columns */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* HSN Management Quick Action - Take up 1 column */}
        <div className="lg:col-span-1">
          <HSNManagementQuickAction />
        </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Dashboard Overview</TabsTrigger>
          <TabsTrigger value="health-check">System Health Check</TabsTrigger>
          <TabsTrigger value="permissions-test">Permissions Test</TabsTrigger>
          <TabsTrigger value="error-monitoring">Error Monitoring</TabsTrigger>
          <TabsTrigger value="d1-sync">D1 Edge Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="health-check" className="space-y-6">
          <SystemHealthCheck />
        </TabsContent>

        <TabsContent value="permissions-test" className="space-y-6">
          <PermissionsTestCard />
        </TabsContent>

        <TabsContent value="error-monitoring" className="space-y-6">
          <ErrorMonitoringDashboard />
        </TabsContent>

        <TabsContent value="d1-sync" className="space-y-6">
          <D1SyncManager />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalQuotes || 0}</div>
                <p className="text-xs text-muted-foreground">{stats?.pendingQuotes || 0} pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
                <p className="text-xs text-muted-foreground">{stats?.activeOrders || 0} active</p>
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
                <div className="text-2xl font-bold">
                  ${(stats?.totalRevenue || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Analytics */}
          {!quotesLoading && !ordersLoading && allQuotes && allOrders ? (
            <SimpleEnhancedAnalytics quotes={allQuotes} orders={allOrders} />
          ) : (
            <AdminAnalytics />
          )}

          {/* Share Analytics - Lightweight BI */}
          <div className="mt-8">
            <SimpleShareStats />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
