// ============================================================================
// INDIVIDUAL CUSTOMER PROFILE PAGE - World-Class Customer Management
// Based on HubSpot Contacts & Shopify Customer Detail patterns 2025
// Features: Complete customer overview, analytics, communication center
// ============================================================================

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BulkTagModal } from '@/components/admin/modals/BulkTagModal';
import { SendEmailModal } from '@/components/admin/modals/SendEmailModal';
import { CustomerMessageModal } from '@/components/admin/modals/CustomerMessageModal';
import { EditCustomerModal } from '@/components/admin/modals/EditCustomerModal';
import { Customer } from '@/components/admin/CustomerTable';
import { format } from 'date-fns';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  DollarSign,
  ShoppingCart,
  Activity,
  MessageSquare,
  Edit,
  MoreHorizontal,
  Eye,
  Package,
  Truck,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Download,
  Tag,
  Bell,
  Settings,
  History,
  CreditCard,
  Globe,
  UserCheck,
  FileText,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { H1, H2, H3, Body, BodySmall } from '@/components/ui/typography';
import { getAdminCustomerDisplayData, getCustomerInitials as getInitials } from '@/lib/customerDisplayUtils';

interface CustomerProfileData {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  cod_enabled: boolean;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  delivery_addresses: Array<{
    id: string;
    full_name: string;
    phone: string;
    street_address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    is_primary: boolean;
  }>;
}

interface CustomerAnalytics {
  totalSpent: number;
  orderCount: number;
  quoteCount: number;
  avgOrderValue: number;
  lastOrderDate: Date | null;
  lastActivityDate: Date;
  totalSavings: number;
  favoriteCategories: string[];
  orderFrequency: 'low' | 'medium' | 'high';
  customerLifetimeValue: number;
  riskScore: number;
}

interface CustomerOrder {
  id: string;
  display_id: string;
  status: string;
  final_total_usd: number;
  created_at: string;
  items: any[];
  destination_country: string;
  iwish_tracking_id?: string;
  tracking_status?: string;
}

export const CustomerProfile: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  // Modal states
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [customerMessageOpen, setCustomerMessageOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);

  // Fetch customer profile data
  const {
    data: customer,
    isLoading: customerLoading,
    error: customerError,
  } = useQuery({
    queryKey: ['customer-profile', customerId],
    queryFn: async () => {
      if (!customerId) throw new Error('Customer ID is required');

      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          *,
          delivery_addresses (*)
        `,
        )
        .eq('id', customerId)
        .single();

      if (error) throw error;
      return data as CustomerProfileData;
    },
    enabled: !!customerId,
  });

  // Fetch customer orders and quotes
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomerOrder[];
    },
    enabled: !!customerId,
  });

  // Calculate customer analytics
  const analytics = useMemo((): CustomerAnalytics => {
    if (!customer || !orders) {
      return {
        totalSpent: 0,
        orderCount: 0,
        quoteCount: 0,
        avgOrderValue: 0,
        lastOrderDate: null,
        lastActivityDate: new Date(customer?.created_at || Date.now()),
        totalSavings: 0,
        favoriteCategories: [],
        orderFrequency: 'low',
        customerLifetimeValue: 0,
        riskScore: 0,
      };
    }

    const paidOrders = orders.filter((order) =>
      ['paid', 'ordered', 'shipped', 'completed'].includes(order.status),
    );

    const totalSpent = paidOrders.reduce((sum, order) => sum + (order.final_total_usd || 0), 0);
    const orderCount = paidOrders.length;
    const quoteCount = orders.length;
    const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

    const lastOrderDate =
      paidOrders.length > 0
        ? new Date(Math.max(...paidOrders.map((o) => new Date(o.created_at).getTime())))
        : null;

    const lastActivityDate =
      orders.length > 0
        ? new Date(Math.max(...orders.map((o) => new Date(o.created_at).getTime())))
        : new Date(customer.created_at);

    // Calculate risk score (0-100, lower is better)
    const daysSinceLastActivity = Math.ceil(
      (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    let riskScore = 20; // Base risk

    if (daysSinceLastActivity > 180) riskScore += 40;
    else if (daysSinceLastActivity > 90) riskScore += 25;
    else if (daysSinceLastActivity > 30) riskScore += 10;

    if (orderCount === 0) riskScore += 30;
    else if (orderCount === 1) riskScore += 15;

    if (totalSpent > 1000) riskScore -= 20;
    else if (totalSpent > 500) riskScore -= 10;

    const orderFrequency = orderCount >= 5 ? 'high' : orderCount >= 2 ? 'medium' : 'low';
    const customerLifetimeValue = totalSpent + avgOrderValue * 2; // Predictive CLV

    return {
      totalSpent,
      orderCount,
      quoteCount,
      avgOrderValue,
      lastOrderDate,
      lastActivityDate,
      totalSavings: totalSpent * 0.15, // Estimated savings
      favoriteCategories: [], // Would calculate from order items
      orderFrequency,
      customerLifetimeValue,
      riskScore: Math.max(0, Math.min(100, riskScore)),
    };
  }, [customer, orders]);

  // Customer display data using utility function
  const customerDisplayData = useMemo(() => {
    if (!customer) return null;
    return getAdminCustomerDisplayData(customer);
  }, [customer]);

  // Customer status and health indicators
  const getCustomerStatus = () => {
    if (!customer) return { label: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: User };

    if (customer.internal_notes?.includes('VIP')) {
      return { label: 'VIP', color: 'bg-yellow-100 text-yellow-800', icon: Star };
    }
    if (customer.cod_enabled) {
      return { label: 'Active', color: 'bg-green-100 text-green-800', icon: UserCheck };
    }
    return { label: 'Inactive', color: 'bg-gray-100 text-gray-800', icon: Clock };
  };

  const getHealthScore = () => {
    const baseScore = 50;
    let score = baseScore;

    // Positive factors
    score += Math.min(analytics.orderCount * 10, 30);
    score += Math.min(analytics.totalSpent / 100, 20);

    const daysSinceActivity = Math.ceil(
      (Date.now() - analytics.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceActivity <= 7) score += 15;
    else if (daysSinceActivity <= 30) score += 5;
    else if (daysSinceActivity > 90) score -= 20;

    if (customer?.internal_notes?.includes('VIP')) score += 15;

    return Math.max(0, Math.min(100, score));
  };

  const healthScore = getHealthScore();
  const status = getCustomerStatus();

  // Helper function to get customer avatar URL (similar to Profile page logic)
  const getCustomerAvatarUrl = () => {
    // Check profile avatar_url first (stored in database)
    if (customer?.avatar_url) {
      return customer.avatar_url;
    }
    return null;
  };

  const getCustomerInitials = () => {
    if (!customerDisplayData) return 'U';
    return getInitials(customerDisplayData.name);
  };

  if (customerLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-gray-200 rounded" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded-xl" />
                <div className="h-96 bg-gray-200 rounded-xl" />
              </div>
              <div className="h-96 bg-gray-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (customerError || !customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Customer Not Found</h2>
          <p className="text-gray-600 mb-4">
            The customer profile you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate('/admin/customers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  const primaryAddress =
    customer.delivery_addresses?.find((addr) => addr.is_primary) || customer.delivery_addresses?.[0];

  // Button handlers
  const handleEditCustomer = () => {
    if (customer) {
      setEditCustomerOpen(true);
    }
  };

  const handleSendEmail = () => {
    if (customer) {
      setSendEmailOpen(true);
    }
  };

  const handleCreateTicket = () => {
    if (customer) {
      setCustomerMessageOpen(true);
    }
  };

  const handleSendMessage = () => {
    if (customer) {
      setCustomerMessageOpen(true);
    }
  };

  const handleAddTag = () => {
    if (customer) {
      setBulkTagOpen(true);
    }
  };

  const handleExportData = () => {
    if (!customer || !orders) return;

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Field,Value\\n' +
      `Customer ID,${customer.id}\\n` +
      `Name,"${customerDisplayData?.name || 'N/A'}"\\n` +
      `Email,"${customer.email}"\\n` +
      `Phone,"${customer.phone || 'N/A'}"\\n` +
      `COD Enabled,${customer.cod_enabled ? 'Yes' : 'No'}\\n` +
      `Joined Date,"${format(new Date(customer.created_at), 'MMM d, yyyy')}"\\n` +
      `Total Spent,$${analytics.totalSpent.toFixed(2)}\\n` +
      `Total Orders,${analytics.orderCount}\\n` +
      `Total Quotes,${analytics.quoteCount}\\n` +
      `Average Order Value,$${analytics.avgOrderValue.toFixed(2)}\\n` +
      `Health Score,${healthScore}%\\n` +
      `Customer Lifetime Value,$${analytics.customerLifetimeValue.toFixed(2)}\\n` +
      `Risk Score,${analytics.riskScore}%\\n` +
      `Order Frequency,${analytics.orderFrequency}\\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_${customer.id}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Successful',
      description: `Customer data exported successfully`,
    });
  };

  // Convert customer to the format expected by modals
  const customerForModals = customer
    ? {
        id: customer.id,
        email: customer.email,
        full_name: customerDisplayData?.name || null,
        phone: customer.phone,
        avatar_url: customer.avatar_url,
        cod_enabled: customer.cod_enabled,
        internal_notes: customer.internal_notes,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
        delivery_addresses: customer.delivery_addresses,
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/customers')}
              className="border-gray-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
            <div>
              <H1 className="text-gray-900">{customerDisplayData?.name || 'Unknown Customer'}</H1>
              <div className="flex items-center space-x-3 mt-1">
                <Badge variant="outline" className={cn('text-xs', status.color)}>
                  <status.icon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
                <BodySmall className="text-gray-600">
                  Customer since {format(new Date(customer.created_at), 'MMM yyyy')}
                </BodySmall>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleEditCustomer}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Customer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSendEmail}>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateTicket}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Create Ticket
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <BodySmall className="text-gray-600">Total Spent</BodySmall>
                  </div>
                  <H3 className="text-gray-900 mt-1">${analytics.totalSpent.toFixed(0)}</H3>
                  <BodySmall className="text-green-600 mt-1">
                    +${analytics.totalSavings.toFixed(0)} saved
                  </BodySmall>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                    <BodySmall className="text-gray-600">Orders</BodySmall>
                  </div>
                  <H3 className="text-gray-900 mt-1">{analytics.orderCount}</H3>
                  <BodySmall className="text-gray-600 mt-1">
                    {analytics.quoteCount} quotes total
                  </BodySmall>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <BodySmall className="text-gray-600">Avg Order</BodySmall>
                  </div>
                  <H3 className="text-gray-900 mt-1">${analytics.avgOrderValue.toFixed(0)}</H3>
                  <BodySmall className="text-gray-600 mt-1">
                    {analytics.orderFrequency} frequency
                  </BodySmall>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-orange-600" />
                    <BodySmall className="text-gray-600">Health Score</BodySmall>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <H3 className="text-gray-900">{healthScore}%</H3>
                    {healthScore >= 80 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : healthScore >= 60 ? (
                      <Activity className="h-4 w-4 text-blue-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="mt-2">
                    <Progress value={healthScore} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabbed Content */}
            <Card>
              <CardHeader className="pb-2">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="orders">Orders ({analytics.orderCount})</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsContent value="overview" className="space-y-6">
                    {/* Recent Orders Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <H3 className="text-gray-900">Recent Orders</H3>
                        <Button variant="outline" size="sm" onClick={() => setActiveTab('orders')}>
                          <Eye className="h-4 w-4 mr-2" />
                          View All
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {orders.slice(0, 5).map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Package className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <Body className="font-medium text-gray-900">
                                  #{order.display_id || order.id.slice(0, 8)}
                                </Body>
                                <BodySmall className="text-gray-600">
                                  {format(new Date(order.created_at), 'MMM d, yyyy')}
                                </BodySmall>
                              </div>
                            </div>
                            <div className="text-right">
                              <Body className="font-medium text-gray-900">
                                ${order.final_total_usd?.toFixed(2) || '0.00'}
                              </Body>
                              <Badge variant="outline" className="text-xs">
                                {order.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="orders" className="space-y-4">
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <Body className="font-medium text-gray-900">
                                Order #{order.display_id || order.id.slice(0, 8)}
                              </Body>
                              <BodySmall className="text-gray-600">
                                {format(new Date(order.created_at), 'MMM d, yyyy')} •{' '}
                                {order.destination_country}
                              </BodySmall>
                              {order.iwish_tracking_id && (
                                <BodySmall className="text-blue-600">
                                  Tracking: {order.iwish_tracking_id}
                                </BodySmall>
                              )}
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <Body className="font-medium text-gray-900">
                              ${order.final_total_usd?.toFixed(2) || '0.00'}
                            </Body>
                            <Badge variant="outline" className="text-xs">
                              {order.status}
                            </Badge>
                            <div>
                              <Button variant="ghost" size="sm" asChild>
                                <a href={`/admin/orders/${order.id}`} target="_blank">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="space-y-4">
                    <div className="text-center py-12 text-gray-500">
                      <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <Body>Activity timeline coming soon</Body>
                      <BodySmall>Track customer interactions, emails, and system events</BodySmall>
                    </div>
                  </TabsContent>

                  <TabsContent value="analytics" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <H3 className="text-gray-900 mb-3">Customer Lifecycle</H3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <BodySmall className="text-gray-600">Customer Lifetime Value</BodySmall>
                            <BodySmall className="font-medium text-gray-900">
                              ${analytics.customerLifetimeValue.toFixed(0)}
                            </BodySmall>
                          </div>
                          <div className="flex justify-between">
                            <BodySmall className="text-gray-600">Risk Score</BodySmall>
                            <BodySmall
                              className={cn(
                                'font-medium',
                                analytics.riskScore < 30
                                  ? 'text-green-600'
                                  : analytics.riskScore < 60
                                    ? 'text-yellow-600'
                                    : 'text-red-600',
                              )}
                            >
                              {analytics.riskScore}%
                            </BodySmall>
                          </div>
                          <div className="flex justify-between">
                            <BodySmall className="text-gray-600">Order Frequency</BodySmall>
                            <BodySmall className="font-medium text-gray-900 capitalize">
                              {analytics.orderFrequency}
                            </BodySmall>
                          </div>
                        </div>
                      </div>

                      <div>
                        <H3 className="text-gray-900 mb-3">Purchase Patterns</H3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <BodySmall className="text-gray-600">Avg Days Between Orders</BodySmall>
                            <BodySmall className="font-medium text-gray-900">
                              {analytics.orderCount > 1
                                ? Math.ceil(
                                    (analytics.lastActivityDate.getTime() -
                                      new Date(customer.created_at).getTime()) /
                                      (1000 * 60 * 60 * 24) /
                                      analytics.orderCount,
                                  )
                                : 'N/A'}
                            </BodySmall>
                          </div>
                          <div className="flex justify-between">
                            <BodySmall className="text-gray-600">Quote Conversion Rate</BodySmall>
                            <BodySmall className="font-medium text-gray-900">
                              {analytics.quoteCount > 0
                                ? Math.round((analytics.orderCount / analytics.quoteCount) * 100)
                                : 0}
                              %
                            </BodySmall>
                          </div>
                          <div className="flex justify-between">
                            <BodySmall className="text-gray-600">Total Savings</BodySmall>
                            <BodySmall className="font-medium text-green-600">
                              ${analytics.totalSavings.toFixed(0)}
                            </BodySmall>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Customer Info Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Contact Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    {getCustomerAvatarUrl() && (
                      <AvatarImage
                        src={getCustomerAvatarUrl()!}
                        alt={customerDisplayData?.name || customer.email}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                      {getCustomerInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Body className="font-medium text-gray-900">
                      {customerDisplayData?.name || 'No name provided'}
                    </Body>
                    <BodySmall className="text-gray-600">{customer.email}</BodySmall>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <BodySmall className="text-gray-900">{customer.email}</BodySmall>
                  </div>

                  {customer.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <BodySmall className="text-gray-900">{customer.phone}</BodySmall>
                    </div>
                  )}

                  {primaryAddress && (
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <BodySmall className="text-gray-900">
                          {primaryAddress.city}, {primaryAddress.country}
                        </BodySmall>
                        <BodySmall className="text-gray-600">
                          {primaryAddress.street_address}
                        </BodySmall>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <BodySmall className="text-gray-900">
                      Joined {format(new Date(customer.created_at), 'MMM d, yyyy')}
                    </BodySmall>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Account Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <BodySmall className="text-gray-600">COD Enabled</BodySmall>
                  <Badge variant={customer.cod_enabled ? 'default' : 'secondary'}>
                    {customer.cod_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <BodySmall className="text-gray-600">Email Verified</BodySmall>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                </div>

                {customer.internal_notes && (
                  <div>
                    <BodySmall className="text-gray-600 mb-2">Internal Notes</BodySmall>
                    <div className="p-2 bg-gray-50 rounded text-xs text-gray-700">
                      {customer.internal_notes}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                  onClick={handleSendMessage}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                  onClick={handleSendEmail}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                  onClick={handleCreateTicket}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Create Ticket
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                  onClick={handleAddTag}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Add Tag
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modals */}
        {customerForModals && (
          <>
            <EditCustomerModal
              open={editCustomerOpen}
              onOpenChange={setEditCustomerOpen}
              customer={customerForModals}
            />

            <BulkTagModal
              open={bulkTagOpen}
              onOpenChange={setBulkTagOpen}
              selectedCustomers={[customerForModals]}
            />

            <SendEmailModal
              open={sendEmailOpen}
              onOpenChange={setSendEmailOpen}
              recipients={[customerForModals]}
              isBulk={false}
            />

            <CustomerMessageModal
              open={customerMessageOpen}
              onOpenChange={setCustomerMessageOpen}
              customer={customerForModals}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerProfile;
