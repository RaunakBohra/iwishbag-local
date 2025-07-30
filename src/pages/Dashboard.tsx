import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  CheckCircle,
  Plus,
  Search,
  TrendingUp,
  Clock,
  Globe,
  ArrowRight,
  Sparkles,
  Ticket,
  DollarSign,
  Truck,
} from 'lucide-react';
import { useDashboardState } from '@/hooks/useDashboardState';
import { useUserTickets } from '@/hooks/useTickets';
import { useUnreadMessagesCount } from '@/hooks/useUnreadMessagesCount';
import { useDashboardTrends } from '@/hooks/useDashboardTrends';
import { useUserOnboarding } from '@/hooks/useUserOnboarding';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { EnhancedMetricCard } from '@/components/dashboard/EnhancedMetricCard';
import { WelcomeOnboarding } from '@/components/dashboard/WelcomeOnboarding';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { AnimatedCounter } from '@/components/shared/AnimatedCounter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { H1, H2, BodySmall, StatNumber, StatLabel } from '@/components/ui/typography';
import { cn } from '@/lib/design-system';

const Dashboard = () => {
  const { user, quotes, orders, isLoading, isError } = useDashboardState();
  const { data: tickets = [] } = useUserTickets(user?.id);
  const { unreadCount: unreadMessages, isLoading: isLoadingMessages } = useUnreadMessagesCount();
  const { trends, isLoading: trendsLoading } = useDashboardTrends();
  const { shouldShowOnboarding, isNewUser } = useUserOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);

  // Metrics
  const activeQuotes =
    quotes?.filter(
      (q) => q.status === 'pending' || q.status === 'sent' || q.status === 'calculated',
    ).length || 0;
  const approvedQuotes = quotes?.filter((q) => q.status === 'approved').length || 0;
  const ordersInProgress =
    orders?.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length || 0;
  const deliveredOrders = orders?.filter((o) => o.status === 'completed').length || 0;
  const openTickets =
    tickets?.filter((t) => t.status === 'open' || t.status === 'in_progress').length || 0;

  // Quick Actions
  const quickActions = [
    {
      label: 'Request Quote',
      icon: <Plus className="h-5 w-5" />,
      to: '/quote',
      variant: 'primary',
      color: 'from-teal-500 to-teal-600',
    },
    {
      label: 'View All Quotes',
      icon: <Package className="h-5 w-5" />,
      to: '/dashboard/quotes',
      variant: 'outline',
      color: 'from-orange-500 to-orange-600',
    },
    {
      label: 'My Orders',
      icon: <ShoppingCart className="h-5 w-5" />,
      to: '/dashboard/orders',
      variant: 'outline',
      color: 'from-green-500 to-green-600',
    },
    {
      label: 'Get Help',
      icon: <Ticket className="h-5 w-5" />,
      to: '/support/my-tickets',
      variant: 'outline',
      color: 'from-purple-500 to-purple-600',
    },
  ];

  const metricCards = [
    {
      value: activeQuotes,
      label: 'Active Quotes',
      icon: Package,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'from-blue-50 to-blue-100',
      link: '/dashboard/quotes',
      trend: trends.activeQuotes,
      insight:
        trends.activeQuotes.direction === 'up'
          ? "You're requesting more quotes recently!"
          : trends.activeQuotes.direction === 'down'
            ? 'Fewer active quotes than usual'
            : 'Steady quote activity',
    },
    {
      value: approvedQuotes,
      label: 'Approved Quotes',
      icon: CheckCircle,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'from-emerald-50 to-emerald-100',
      link: '/dashboard/quotes',
      trend: trends.approvedQuotes,
      insight:
        trends.approvedQuotes.direction === 'up'
          ? 'More quotes getting approved!'
          : trends.approvedQuotes.direction === 'down'
            ? 'Consider reviewing quote requirements'
            : 'Consistent approval rate',
    },
    {
      value: ordersInProgress,
      label: 'Orders in Progress',
      icon: ShoppingCart,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-purple-50 to-purple-100',
      link: '/dashboard/orders',
      trend: trends.ordersInProgress,
      insight:
        trends.ordersInProgress.direction === 'up'
          ? 'More orders in the pipeline!'
          : 'Orders moving through fulfillment',
    },
    {
      value: deliveredOrders,
      label: 'Delivered Orders',
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100',
      link: '/dashboard/orders',
      trend: trends.deliveredOrders,
      insight:
        trends.deliveredOrders.direction === 'up'
          ? 'Great! More deliveries completed'
          : 'Steady delivery rate',
    },
    {
      value: openTickets,
      label: 'Active Help Requests',
      icon: Ticket,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100',
      link: '/support/my-tickets',
      trend: trends.openTickets,
      insight:
        trends.openTickets.direction === 'down'
          ? 'Fewer support issues - great!'
          : trends.openTickets.direction === 'up'
            ? "We're here to help with any issues"
            : 'Normal support activity',
    },
  ];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container px-4 sm:px-6 py-6 sm:py-8 lg:py-12">
        {/* Welcome & Onboarding for New Users */}
        {showOnboarding && (
          <WelcomeOnboarding
            userName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Customer'}
            onDismiss={() => setShowOnboarding(false)}
            showDismiss={true}
          />
        )}

        {/* Welcome Header - Enhanced for returning users */}
        <AnimatedSection animation="fadeInDown">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <H1 className="text-2xl sm:text-3xl">
                  {isNewUser ? 'Welcome' : 'Welcome back'},{' '}
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Customer'}!
                </H1>
                <BodySmall className="text-gray-600">
                  {isNewUser
                    ? 'Ready to start your global shopping journey?'
                    : "Here's what's happening with your international shopping."}
                </BodySmall>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Enhanced Metric Cards with Trends */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
          {metricCards.map((metric, index) => (
            <EnhancedMetricCard
              key={index}
              value={metric.value}
              label={metric.label}
              icon={metric.icon}
              color={metric.color}
              bgColor={metric.bgColor}
              link={metric.link}
              trend={trendsLoading ? undefined : metric.trend}
              insight={metric.insight}
              delay={index * 100}
            />
          ))}
        </div>

        {/* Quick Actions - Improved Mobile Layout */}
        <AnimatedSection animation="fadeInUp" delay={400}>
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-teal-600" />
              Quick Actions
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {quickActions.map((action, index) => (
                <AnimatedSection key={index} animation="fadeInUp" delay={500 + index * 100}>
                  <Link to={action.to}>
                    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1">
                      <CardContent className="p-4 sm:p-6">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-teal-50 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-teal-100 transition-colors">
                          {React.cloneElement(action.icon, {
                            className: 'w-4 h-4 sm:w-5 sm:h-5 text-teal-600',
                          })}
                        </div>
                        <H2 className="text-sm sm:text-lg font-semibold mb-1 leading-tight">
                          {action.label}
                        </H2>
                        <BodySmall className="text-gray-600 text-xs sm:text-sm leading-tight hidden sm:block">
                          {action.label === 'Request Quote' && 'Start a new quote request'}
                          {action.label === 'View All Quotes' && 'Manage your quote requests'}
                          {action.label === 'My Orders' && 'Track your shipments'}
                          {action.label === 'Get Help' && 'Get support with your orders'}
                        </BodySmall>
                        <div className="mt-2 sm:mt-4 flex items-center text-teal-600 group-hover:translate-x-1 transition-transform">
                          <span className="text-xs sm:text-sm font-medium">Go</span>
                          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </AnimatedSection>



      </div>
    </div>
  );
};

export default Dashboard;
