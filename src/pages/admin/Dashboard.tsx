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
  Settings
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const navigate = useNavigate();

  // Fetch quick stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [quotesResult, ordersResult, customersResult] = await Promise.all([
        supabase.from('quotes').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
      ]);

      return {
        totalQuotes: quotesResult.count || 0,
        totalOrders: ordersResult.count || 0,
        totalCustomers: customersResult.count || 0,
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
      title: "System Settings",
      description: "Configure system options",
      icon: Settings,
      href: "/admin/footer",
      color: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    },
  ];

  // Show skeleton while loading
  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor and manage your business operations</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Card 
              key={action.title} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(action.href)}
            >
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalQuotes || 0}</div>
            <p className="text-xs text-muted-foreground">
              Customer quote requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Completed orders
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
      </div>

      {/* Analytics Dashboard */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Analytics Overview
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <ConversionRate />
          <RevenueTrend />
          <VolumeTrend />
          <TopCountries />
          <AverageOrderValue />
          <ExportAnalytics />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <RecentActivity />
      </div>

      {/* System Status */}
      <div>
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        <SystemStatus />
      </div>
    </div>
  );
};

export default AdminDashboard; 