import React from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  CheckCircle,
  Mail,
  Plus,
  Search,
  HelpCircle,
  TrendingUp,
  Clock,
  Globe,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useDashboardState } from '@/hooks/useDashboardState';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { AnimatedCounter } from '@/components/shared/AnimatedCounter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { H1, H2, BodySmall, StatNumber, StatLabel } from '@/components/ui/typography';
import { cn } from '@/lib/design-system';

const Dashboard = () => {
  const { user, quotes, orders, isLoading, isError } = useDashboardState();

  // Metrics
  const activeQuotes =
    quotes?.filter(
      (q) => q.status === 'pending' || q.status === 'sent' || q.status === 'calculated',
    ).length || 0;
  const approvedQuotes = quotes?.filter((q) => q.status === 'approved').length || 0;
  const ordersInProgress =
    orders?.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length || 0;
  const deliveredOrders = orders?.filter((o) => o.status === 'completed').length || 0;
  const unreadMessages = 0; // TODO: Connect to real unread messages count

  // Recent activity (quotes and orders, most recent 5)
  const recentActivity = [
    ...(quotes?.slice(0, 3).map((q) => ({
      type: 'quote',
      text: `Quote #${q.display_id || q.id} - ${q.status}`,
      link: `/dashboard/quotes/${q.id}`,
      icon: <Package className="h-4 w-4 text-teal-600" />,
      date: q.created_at,
      status: q.status,
    })) || []),
    ...(orders?.slice(0, 2).map((o) => ({
      type: 'order',
      text: `Order #${o.display_id || o.id} - ${o.status}`,
      link: `/dashboard/orders/${o.id}`,
      icon: <ShoppingCart className="h-4 w-4 text-green-600" />,
      date: o.created_at,
      status: o.status,
    })) || []),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Quick Actions
  const quickActions = [
    {
      label: 'Request Quote',
      icon: <Plus className="h-5 w-5" />,
      to: '/quote',
      variant: 'primary',
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'View All Quotes',
      icon: <Package className="h-5 w-5" />,
      to: '/dashboard/quotes',
      variant: 'outline',
      color: 'from-purple-500 to-purple-600',
    },
    {
      label: 'My Orders',
      icon: <ShoppingCart className="h-5 w-5" />,
      to: '/dashboard/orders',
      variant: 'outline',
      color: 'from-green-500 to-green-600',
    },
  ];

  const metricCards = [
    {
      value: activeQuotes,
      label: 'Active Quotes',
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100',
      link: '/dashboard/quotes',
    },
    {
      value: approvedQuotes,
      label: 'Approved Quotes',
      icon: CheckCircle,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'from-emerald-50 to-emerald-100',
      link: '/dashboard/quotes',
    },
    {
      value: ordersInProgress,
      label: 'Orders in Progress',
      icon: ShoppingCart,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100',
      link: '/dashboard/orders',
    },
    {
      value: deliveredOrders,
      label: 'Delivered Orders',
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100',
      link: '/dashboard/orders',
    },
  ];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container py-8 sm:py-12">
        {/* Welcome Header */}
        <AnimatedSection animation="fadeInDown">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <H1 className="text-2xl sm:text-3xl">
                  Welcome back,{' '}
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Customer'}!
                </H1>
                <BodySmall className="text-gray-600">
                  Here's what's happening with your international shopping.
                </BodySmall>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Metric Cards - Clickable */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {metricCards.map((metric, index) => (
            <AnimatedSection key={index} animation="zoomIn" delay={index * 100}>
              <Link to={metric.link}>
                <Card
                  className={cn(
                    "relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer",
                    "bg-white border border-gray-200"
                  )}
                >
                  <CardContent className="relative p-6">
                    <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center mb-4">
                      <metric.icon className="w-6 h-6 text-teal-600" />
                    </div>
                    <StatNumber className="mb-1">
                      <AnimatedCounter end={metric.value} />
                    </StatNumber>
                    <StatLabel>{metric.label}</StatLabel>
                  </CardContent>
                </Card>
              </Link>
            </AnimatedSection>
          ))}
        </div>

        {/* Quick Actions - Improved Mobile Layout */}
        <AnimatedSection animation="fadeInUp" delay={400}>
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Quick Actions
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <AnimatedSection key={index} animation="fadeInUp" delay={500 + index * 100}>
                  <Link to={action.to}>
                    <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden">
                      <CardContent className="p-6">
                        <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                          {React.cloneElement(action.icon, { className: "w-5 h-5 text-blue-600" })}
                        </div>
                        <H2 className="text-lg font-semibold mb-1">{action.label}</H2>
                        <BodySmall className="text-gray-600">
                          {action.label === 'Request Quote' && 'Start a new quote request'}
                          {action.label === 'View All Quotes' && 'Manage your quote requests'}
                          {action.label === 'My Orders' && 'Track your shipments'}
                        </BodySmall>
                        <div className="mt-4 flex items-center text-blue-600 group-hover:translate-x-1 transition-transform">
                          <span className="text-sm font-medium">Go</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </AnimatedSection>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <AnimatedSection animation="fadeInLeft" delay={800}>
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Recent Activity
                  </CardTitle>
                  <Link
                    to="/dashboard/quotes"
                    className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium"
                  >
                    View All
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {recentActivity.length === 0 && (
                    <li className="text-gray-500 text-sm py-4 text-center">
                      <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      No recent activity yet.
                    </li>
                  )}
                  {recentActivity.map((item, idx) => (
                    <li key={idx} className="group">
                      <Link
                        to={item.link}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-shrink-0">{item.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {item.text}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(item.date).toLocaleDateString()}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Support/Contact Info */}
          <AnimatedSection animation="fadeInRight" delay={900}>
            <Card className="h-full bg-gray-50 border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-8 text-center flex flex-col justify-center h-full">
                <div className="w-16 h-16 rounded-lg bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <HelpCircle className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Need Assistance?</h3>
                <p className="text-gray-600 mb-6">
                  Our support team is here to help you with any questions about international
                  shipping, customs, or your orders.
                </p>
                <div className="space-y-3">
                  <Link to="/contact">
                    <Button className="w-full group">
                      <Mail className="w-4 h-4 mr-2" />
                      Contact Support
                    </Button>
                  </Link>
                  <p className="text-sm text-gray-600">
                    or email us at{' '}
                    <a
                      href="mailto:support@iwishbag.com"
                      className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                    >
                      support@iwishbag.com
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>

        {/* Bottom CTA */}
        <AnimatedSection animation="fadeInUp" delay={1000}>
          <Card className="mt-8 bg-blue-50 border-blue-200 overflow-hidden relative">
            <CardContent className="relative p-8 text-center">
              <h3 className="text-2xl font-semibold mb-3 text-gray-900">Ready to Shop Globally?</h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Get instant quotes for products from anywhere in the world. We handle shipping,
                customs, and delivery.
              </p>
              <Link to="/quote">
                <Button size="lg" className="group">
                  <Plus className="w-5 h-5 mr-2" />
                  Request a Quote
                </Button>
              </Link>
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </div>
  );
};

export default Dashboard;
