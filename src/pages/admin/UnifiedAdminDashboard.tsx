/**
 * Unified Admin Dashboard - Central Admin Interface
 * 
 * Consolidates all admin functions into a cohesive interface using
 * the Master Service Orchestrator for unified operations and data access.
 * Provides consistent UX across quotes, packages, warehouse, and support.
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  Users, 
  Package, 
  FileText, 
  MessageSquare, 
  Warehouse,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Download,
  Settings,
  Bell,
  RefreshCcw,
  Eye,
  Edit,
  Trash2,
  ExternalLink
} from 'lucide-react';

import { masterServiceOrchestrator } from '@/services/MasterServiceOrchestrator';
import { unifiedUserContextService } from '@/services/UnifiedUserContextService';
import { enhancedSupportService } from '@/services/EnhancedSupportService';
import { currencyService } from '@/services/CurrencyService';

// ============================================================================
// ADMIN DASHBOARD TYPES
// ============================================================================

interface AdminDashboardData {
  // Core metrics
  total_users: number;
  active_users_30d: number;
  total_quotes: number;
  pending_quotes: number;
  total_packages: number;
  packages_in_warehouse: number;
  support_tickets_open: number;
  
  // Financial metrics
  total_revenue_30d: number;
  average_order_value: number;
  pending_payments: number;
  
  // Performance metrics
  quote_approval_time_avg: number;
  package_processing_time_avg: number;
  support_response_time_avg: number;
  
  // Recent activity
  recent_quotes: any[];
  recent_packages: any[];
  recent_tickets: any[];
  
  // System health
  service_health: Record<string, any>;
}

// ============================================================================
// UNIFIED ADMIN DASHBOARD
// ============================================================================

export default function UnifiedAdminDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [refreshKey, setRefreshKey] = useState(0);

  // Load admin dashboard data
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard', timeRange, refreshKey],
    queryFn: () => loadAdminDashboardData(timeRange),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Load system health
  const { data: systemHealth } = useQuery({
    queryKey: ['system-health', refreshKey],
    queryFn: () => masterServiceOrchestrator.getServiceHealth(),
    refetchInterval: 60000, // Refresh every minute
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load admin dashboard. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Unified management interface for iwishBag platform
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* System Health Alert */}
      {systemHealth && Object.values(systemHealth).some((s: any) => s.status === 'degraded') && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Some services are experiencing issues. Check the system health section for details.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.active_users_30d || 0} active this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.pending_quotes || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.total_quotes || 0} total quotes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warehouse Packages</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.packages_in_warehouse || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.total_packages || 0} total received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.support_tickets_open || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg response: {dashboardData?.support_response_time_avg || 0}h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-lg grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="warehouse">Warehouse</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <AdminOverviewTab dashboardData={dashboardData} systemHealth={systemHealth} />
        </TabsContent>

        {/* Quotes Management Tab */}
        <TabsContent value="quotes" className="space-y-4">
          <AdminQuotesTab searchQuery={searchQuery} />
        </TabsContent>

        {/* Warehouse Management Tab */}
        <TabsContent value="warehouse" className="space-y-4">
          <AdminWarehouseTab searchQuery={searchQuery} />
        </TabsContent>

        {/* Support Management Tab */}
        <TabsContent value="support" className="space-y-4">
          <AdminSupportTab searchQuery={searchQuery} />
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <AdminUsersTab searchQuery={searchQuery} />
        </TabsContent>

        {/* System Management Tab */}
        <TabsContent value="system" className="space-y-4">
          <AdminSystemTab systemHealth={systemHealth} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

function AdminOverviewTab({ 
  dashboardData, 
  systemHealth 
}: { 
  dashboardData: AdminDashboardData | undefined;
  systemHealth: any;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Financial performance and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {currencyService.formatAmount(dashboardData?.total_revenue_30d || 0, 'USD')}
              </div>
              <p className="text-sm text-muted-foreground">Revenue (30d)</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {currencyService.formatAmount(dashboardData?.average_order_value || 0, 'USD')}
              </div>
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {currencyService.formatAmount(dashboardData?.pending_payments || 0, 'USD')}
              </div>
              <p className="text-sm text-muted-foreground">Pending Payments</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Quotes</CardTitle>
          <CardDescription>Latest quote submissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dashboardData?.recent_quotes?.slice(0, 5).map((quote) => (
            <div key={quote.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{quote.tracking_id}</p>
                <p className="text-xs text-muted-foreground">
                  {quote.items?.length || 0} items • {new Date(quote.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={quote.status === 'pending' ? 'default' : 'secondary'}>
                  {quote.status}
                </Badge>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Service status and performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {systemHealth && Object.entries(systemHealth).map(([service, health]: [string, any]) => (
            <div key={service} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${
                  health.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium capitalize">{service}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {health.metrics?.calls || 0} calls • {health.metrics?.errors || 0} errors
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminQuotesTab({ searchQuery }: { searchQuery: string }) {
  const { data: quotes, isLoading } = useQuery({
    queryKey: ['admin-quotes', searchQuery],
    queryFn: async () => {
      const result = await masterServiceOrchestrator.executeOperation({
        id: 'admin-quotes-list',
        service: 'quote',
        operation: 'read',
        context: { metadata: { admin: true, search: searchQuery } },
        priority: 'medium',
      });
      return result.data || [];
    },
  });

  if (isLoading) return <div>Loading quotes...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quote Management</h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <FileText className="h-4 w-4 mr-2" />
            New Quote
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {quotes?.map((quote: any) => (
            <div key={quote.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-semibold">{quote.tracking_id}</h4>
                <p className="text-sm text-muted-foreground">
                  Customer: {quote.customer_email} • {quote.items?.length || 0} items
                </p>
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(quote.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={quote.status === 'pending' ? 'default' : 'secondary'}>
                  {quote.status}
                </Badge>
                <div className="text-right">
                  <p className="font-semibold">
                    {currencyService.formatAmount(quote.total_amount_usd || 0, 'USD')}
                  </p>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminWarehouseTab({ searchQuery }: { searchQuery: string }) {
  const { data: packages, isLoading } = useQuery({
    queryKey: ['admin-packages', searchQuery],
    queryFn: async () => {
      const result = await masterServiceOrchestrator.executeOperation({
        id: 'admin-packages-list',
        service: 'package',
        operation: 'read',
        context: { metadata: { admin: true, search: searchQuery } },
        priority: 'medium',
      });
      return result.data || [];
    },
  });

  if (isLoading) return <div>Loading packages...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Warehouse Management</h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Package className="h-4 w-4 mr-2" />
            Log Package
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {packages?.filter((p: any) => p.status === 'received').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">In Warehouse</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {packages?.filter((p: any) => p.status === 'processing').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {packages?.filter((p: any) => p.status === 'shipped').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Shipped</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{packages?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Total Packages</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {packages?.map((pkg: any) => (
            <div key={pkg.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-semibold">{pkg.tracking_number}</h4>
                <p className="text-sm text-muted-foreground">
                  From: {pkg.sender_name} • {pkg.weight_lbs}lbs
                </p>
                <p className="text-xs text-muted-foreground">
                  Received: {new Date(pkg.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={pkg.status === 'received' ? 'default' : 'secondary'}>
                  {pkg.status}
                </Badge>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Warehouse className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminSupportTab({ searchQuery }: { searchQuery: string }) {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-support-tickets', searchQuery],
    queryFn: async () => {
      // Get all open support tickets
      const result = await masterServiceOrchestrator.executeOperation({
        id: 'admin-support-tickets',
        service: 'support',
        operation: 'read',
        context: { metadata: { admin: true, search: searchQuery } },
        priority: 'medium',
      });
      return result.data || [];
    },
  });

  if (isLoading) return <div>Loading support tickets...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Support Management</h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {tickets?.filter((t: any) => t.status === 'open').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Open Tickets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {tickets?.filter((t: any) => t.status === 'in_progress').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {tickets?.filter((t: any) => t.priority === 'urgent').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Urgent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{tickets?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Total Tickets</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {tickets?.map((ticket: any) => (
            <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-semibold">{ticket.subject}</h4>
                <p className="text-sm text-muted-foreground">
                  {ticket.category} • Customer: {ticket.user_email}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(ticket.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={
                  ticket.priority === 'urgent' ? 'destructive' :
                  ticket.priority === 'high' ? 'default' : 'secondary'
                }>
                  {ticket.priority}
                </Badge>
                <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>
                  {ticket.status}
                </Badge>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminUsersTab({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">User Management</h3>
        <Button size="sm">
          <Users className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">User management features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminSystemTab({ systemHealth }: { systemHealth: any }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">System Health</h3>
        <Button size="sm">
          <Settings className="h-4 w-4 mr-2" />
          System Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {systemHealth && Object.entries(systemHealth).map(([service, health]: [string, any]) => (
          <Card key={service}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium capitalize">{service} Service</CardTitle>
              <div className={`h-3 w-3 rounded-full ${
                health.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
              }`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health.status}</div>
              <p className="text-xs text-muted-foreground">
                {health.metrics?.calls || 0} calls • {health.metrics?.errors || 0} errors
              </p>
              <p className="text-xs text-muted-foreground">
                Avg Duration: {health.metrics?.avg_duration?.toFixed(0) || 0}ms
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// DATA LOADING FUNCTIONS
// ============================================================================

async function loadAdminDashboardData(timeRange: string): Promise<AdminDashboardData> {
  try {
    // Use master orchestrator to load all data in parallel
    const operations = [
      {
        id: 'admin-stats-users',
        service: 'analytics' as const,
        operation: 'read' as const,
        context: { metadata: { type: 'user_stats', timeRange } },
        priority: 'medium' as const,
      },
      {
        id: 'admin-stats-quotes',
        service: 'quote' as const,
        operation: 'read' as const,
        context: { metadata: { type: 'stats', timeRange } },
        priority: 'medium' as const,
      },
      {
        id: 'admin-stats-packages',
        service: 'package' as const,
        operation: 'read' as const,
        context: { metadata: { type: 'stats', timeRange } },
        priority: 'medium' as const,
      },
    ];

    const results = await Promise.all(
      operations.map(op => masterServiceOrchestrator.executeOperation(op))
    );

    // Combine results into dashboard data
    return {
      total_users: results[0].data?.total_users || 0,
      active_users_30d: results[0].data?.active_users_30d || 0,
      total_quotes: results[1].data?.total_quotes || 0,
      pending_quotes: results[1].data?.pending_quotes || 0,
      total_packages: results[2].data?.total_packages || 0,
      packages_in_warehouse: results[2].data?.packages_in_warehouse || 0,
      support_tickets_open: 0, // Load from support service
      total_revenue_30d: results[1].data?.total_revenue_30d || 0,
      average_order_value: results[1].data?.average_order_value || 0,
      pending_payments: results[1].data?.pending_payments || 0,
      quote_approval_time_avg: results[1].data?.quote_approval_time_avg || 0,
      package_processing_time_avg: results[2].data?.package_processing_time_avg || 0,
      support_response_time_avg: 2, // Load from support service
      recent_quotes: results[1].data?.recent_quotes || [],
      recent_packages: results[2].data?.recent_packages || [],
      recent_tickets: [], // Load from support service
      service_health: {},
    };
  } catch (error) {
    console.error('Failed to load admin dashboard data:', error);
    throw error;
  }
}