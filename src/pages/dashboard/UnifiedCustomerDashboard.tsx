/**
 * Unified Customer Dashboard - Integrated Experience
 * 
 * Combines package forwarding, quotes, orders, and support into a single
 * cohesive dashboard experience. Uses UnifiedUserContextService for
 * consistent data access and personalization.
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, 
  FileText, 
  CreditCard, 
  MessageSquare, 
  Search,
  Filter,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Truck,
  Star,
  Settings,
  Bell,
  Calculator,
  Crown
} from 'lucide-react';

import { unifiedUserContextService, type UnifiedUserProfile } from '@/services/UnifiedUserContextService';
import { masterServiceOrchestrator } from '@/services/MasterServiceOrchestrator';
import { currencyService } from '@/services/CurrencyService';
import { formatAmountWithFinancialPrecision } from '@/utils/quoteCurrencyUtils';
import { ShippingCalculator } from '@/components/dashboard/ShippingCalculator';
// import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { MembershipDashboard } from '@/components/dashboard/MembershipDashboard';

// ============================================================================
// UNIFIED DASHBOARD COMPONENT
// ============================================================================

export default function UnifiedCustomerDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [selectedTab, setSelectedTab] = useState('overview');

  // Load unified user context
  const { data: userContext, isLoading } = useQuery({
    queryKey: ['unified-user-context'],
    queryFn: () => unifiedUserContextService.getCurrentUserContext(),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Load dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['unified-dashboard', userContext?.id],
    queryFn: async () => {
      if (!userContext) return null;
      
      // Use master orchestrator for coordinated data fetching
      const [quotes, packages, notifications] = await Promise.all([
        masterServiceOrchestrator.executeOperation({
          id: `quotes-${userContext.id}`,
          service: 'quote',
          operation: 'read',
          context: { user_id: userContext.id },
          priority: 'medium',
        }),
        masterServiceOrchestrator.executeOperation({
          id: `packages-${userContext.id}`,
          service: 'package',
          operation: 'read',
          context: { user_id: userContext.id },
          priority: 'medium',
        }),
        masterServiceOrchestrator.executeOperation({
          id: `notifications-${userContext.id}`,
          service: 'notification',
          operation: 'read',
          context: { user_id: userContext.id },
          priority: 'low',
        }),
      ]);

      return {
        quotes: quotes.data || [],
        packages: packages.data || [],
        notifications: notifications.data || [],
      };
    },
    enabled: !!userContext,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!userContext) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load your dashboard. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {userContext.display_name}!</h1>
          <p className="text-muted-foreground">
            {userContext.customer_data.customer_segment === 'vip' && (
              <Badge variant="secondary" className="mr-2">
                <Star className="h-3 w-3 mr-1" />
                VIP Customer
              </Badge>
            )}
            Last active: {new Date(userContext.last_active_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* <NotificationCenter userId={userContext.id} /> */}
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userContext.customer_data.active_quotes}</div>
            <p className="text-xs text-muted-foreground">
              +{userContext.activity_summary.quotes_created_30d} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Packages in Warehouse</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userContext.package_forwarding.packages_in_warehouse}
            </div>
            <p className="text-xs text-muted-foreground">
              {userContext.package_forwarding.total_packages_received} total received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userContext.customer_data.pending_payments}</div>
            <p className="text-xs text-muted-foreground">
              Ready for checkout
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lifetime Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmountWithFinancialPrecision(
                userContext.customer_data.lifetime_value - userContext.customer_data.total_spent_usd,
                userContext.preferences.currency_code
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated savings vs retail
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Storage Fees Alert */}
      {userContext.package_forwarding.outstanding_storage_fees > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have outstanding storage fees of{' '}
            <strong>
              {formatAmountWithFinancialPrecision(
                userContext.package_forwarding.outstanding_storage_fees,
                userContext.preferences.currency_code
              )}
            </strong>
            . Please settle these to avoid additional charges.
            <Button variant="link" className="ml-2 p-0 h-auto">
              Pay Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-lg grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="membership" className="flex items-center gap-1">
              <Crown className="h-3 w-3" />
              Plus
            </TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
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
          <UnifiedOverviewTab 
            userContext={userContext} 
            dashboardData={dashboardData} 
            isLoading={isDashboardLoading}
          />
        </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes" className="space-y-4">
          <UnifiedQuotesTab 
            userContext={userContext}
            quotes={dashboardData?.quotes || []}
            searchQuery={searchQuery}
            activeFilter={activeFilter}
          />
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages" className="space-y-4">
          <UnifiedPackagesTab 
            userContext={userContext}
            packages={dashboardData?.packages || []}
            searchQuery={searchQuery}
          />
        </TabsContent>

        {/* Calculator Tab */}
        <TabsContent value="calculator" className="space-y-4">
          <ShippingCalculator 
            packages={dashboardData?.packages || []}
            onCalculate={(option) => {
              console.log('Quote created for shipping option:', option);
            }}
          />
        </TabsContent>

        {/* Membership Tab */}
        <TabsContent value="membership" className="space-y-4">
          <MembershipDashboard />
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="space-y-4">
          <UnifiedSupportTab userContext={userContext} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

interface TabProps {
  userContext: UnifiedUserProfile;
  searchQuery?: string;
  activeFilter?: string;
}

function UnifiedOverviewTab({ 
  userContext, 
  dashboardData, 
  isLoading 
}: TabProps & { 
  dashboardData: any; 
  isLoading: boolean; 
}) {
  if (isLoading) {
    return <div className="animate-pulse">Loading overview...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest actions across all services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Quote #IWB2025001 approved</p>
              <p className="text-xs text-muted-foreground">2 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Package received from Amazon</p>
              <p className="text-xs text-muted-foreground">1 day ago</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Quote #IWB2025002 sent for review</p>
              <p className="text-xs text-muted-foreground">3 days ago</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get things done faster</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full justify-start">
            <FileText className="h-4 w-4 mr-2" />
            Create New Quote
          </Button>
          
          <Button variant="outline" className="w-full justify-start">
            <Package className="h-4 w-4 mr-2" />
            View My Packages
          </Button>
          
          <Button variant="outline" className="w-full justify-start">
            <Calculator className="h-4 w-4 mr-2" />
            Shipping Calculator
          </Button>
          
          <Button variant="outline" className="w-full justify-start">
            <MessageSquare className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
        </CardContent>
      </Card>

      {/* Account Health */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Account Health</CardTitle>
          <CardDescription>Your account status and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {userContext.customer_data.verification_level === 'full' ? '100%' : '75%'}
              </div>
              <p className="text-sm text-muted-foreground">Profile Complete</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {userContext.customer_data.customer_segment.toUpperCase()}
              </div>
              <p className="text-sm text-muted-foreground">Customer Tier</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {userContext.activity_summary.login_count_30d}
              </div>
              <p className="text-sm text-muted-foreground">Logins This Month</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UnifiedQuotesTab({ userContext, quotes, searchQuery, activeFilter }: TabProps & { quotes: any[] }) {
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = !searchQuery || 
      quote.tracking_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.items?.some((item: any) => item.product_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = activeFilter === 'all' || 
      (activeFilter === 'active' && ['pending', 'sent', 'approved'].includes(quote.status)) ||
      (activeFilter === 'completed' && ['completed', 'delivered'].includes(quote.status));
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Your Quotes</h3>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          New Quote
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredQuotes.map((quote) => (
          <Card key={quote.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{quote.tracking_id}</h4>
                  <p className="text-sm text-muted-foreground">
                    {quote.items?.length || 0} items • Created {new Date(quote.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={quote.status === 'approved' ? 'default' : 'secondary'}>
                    {quote.status}
                  </Badge>
                  <p className="text-sm font-semibold mt-1">
                    {formatAmountWithFinancialPrecision(quote.total_amount_usd || 0, userContext.preferences.currency_code)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function UnifiedPackagesTab({ userContext, packages, searchQuery }: TabProps & { packages: any[] }) {
  const filteredPackages = packages.filter(pkg => 
    !searchQuery || 
    pkg.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pkg.sender_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Your Packages</h3>
        <Button variant="outline">
          <Truck className="h-4 w-4 mr-2" />
          Ship Now
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredPackages.map((pkg) => (
          <Card key={pkg.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{pkg.tracking_number}</h4>
                  <p className="text-sm text-muted-foreground">
                    From: {pkg.sender_name} • {new Date(pkg.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={pkg.status === 'received' ? 'default' : 'secondary'}>
                    {pkg.status}
                  </Badge>
                  <p className="text-sm mt-1">
                    {pkg.weight_lbs}lbs • {pkg.dimensions_l}×{pkg.dimensions_w}×{pkg.dimensions_h}"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function UnifiedSupportTab({ userContext }: TabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Get support for your orders, packages, and account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full justify-start">
            <MessageSquare className="h-4 w-4 mr-2" />
            Start Live Chat
          </Button>
          
          <Button variant="outline" className="w-full justify-start">
            <FileText className="h-4 w-4 mr-2" />
            Browse FAQ
          </Button>
          
          <Separator />
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Priority Support:</strong> {userContext.customer_data.customer_segment === 'vip' ? 'Available' : 'Upgrade to VIP'}</p>
            <p><strong>Response Time:</strong> Usually within 2-4 hours</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}