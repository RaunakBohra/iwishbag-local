import React, { useState, useEffect } from 'react';
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
  Ticket,
  DollarSign,
  Truck,
} from 'lucide-react';
import { useDashboardState } from '@/hooks/useDashboardState';
import { useUserTickets } from '@/hooks/useTickets';
import { useUnreadMessagesCount } from '@/hooks/useUnreadMessagesCount';
import { useDashboardTrends } from '@/hooks/useDashboardTrends';
import { useUserOnboarding } from '@/hooks/useUserOnboarding';
import { userActivityService, ACTIVITY_TYPES } from '@/services/UserActivityService';
import { notificationService } from '@/services/NotificationService';
import { NOTIFICATION_TYPES } from '@/types/NotificationTypes';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { EnhancedMetricCard } from '@/components/dashboard/EnhancedMetricCard';
import { ActivityTimeline, ActivityItem } from '@/components/dashboard/ActivityTimeline';
import { WelcomeOnboarding } from '@/components/dashboard/WelcomeOnboarding';
import { RecommendedProducts } from '@/components/dashboard/RecommendedProducts';
import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { AnimatedCounter } from '@/components/shared/AnimatedCounter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { H1, H2, BodySmall, StatNumber, StatLabel } from '@/components/ui/typography';
import { cn } from '@/lib/design-system';
import { HSNQuickTest } from '@/components/dev/HSNQuickTest';

const Dashboard = () => {
  const { user, quotes, orders, isLoading, isError } = useDashboardState();
  const { data: tickets = [] } = useUserTickets(user?.id);
  const { unreadCount: unreadMessages, isLoading: isLoadingMessages } = useUnreadMessagesCount();
  const { trends, isLoading: trendsLoading } = useDashboardTrends();
  const { shouldShowOnboarding, isNewUser } = useUserOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);

  // Track dashboard visits and create sample notifications for testing
  useEffect(() => {
    if (!user?.id) return;

    userActivityService.trackActivity(ACTIVITY_TYPES.DASHBOARD_VIEW, {
      is_new_user: isNewUser,
      has_quotes: (quotes || []).length > 0,
      has_orders: (orders || []).length > 0,
      has_tickets: tickets.length > 0,
    });

    // Create sample notifications for testing (only in development)
    if (import.meta.env.DEV) {
      createSampleNotifications();
    }
  }, [isNewUser, quotes, orders, tickets, user?.id]);

  // Function to create sample notifications for testing
  const createSampleNotifications = async () => {
    if (!user?.id) return;

    try {
      // Welcome notification for new users
      if (isNewUser) {
        await notificationService.createNotification(
          user.id,
          NOTIFICATION_TYPES.WELCOME_NEW_USER,
          "Welcome to iwishBag! Start by creating your first quote request to shop globally.",
          {
            action_url: '/quote',
            action_label: 'Request Quote',
            title: 'Welcome to iwishBag!',
            subtitle: 'Your global shopping journey starts here'
          },
          { skipDuplicates: true }
        );
      }

      // Pending quote notifications
      const pendingQuotes = quotes?.filter(q => q.status === 'pending') || [];
      if (pendingQuotes.length > 0) {
        await notificationService.createNotification(
          user.id,
          NOTIFICATION_TYPES.QUOTE_PENDING_REVIEW,
          `You have ${pendingQuotes.length} quote${pendingQuotes.length > 1 ? 's' : ''} under review. We'll send you an updated quote within 24-48 hours.`,
          {
            quote_id: pendingQuotes[0].id,
            action_url: '/dashboard/quotes',
            action_label: 'View Quotes',
            title: 'Quotes Under Review'
          },
          { skipDuplicates: true }
        );
      }

      // Approved quote notifications (high priority)
      const approvedQuotes = quotes?.filter(q => q.status === 'approved') || [];
      if (approvedQuotes.length > 0) {
        for (const quote of approvedQuotes.slice(0, 3)) { // Limit to 3 to avoid spam
          await notificationService.createNotification(
            user.id,
            NOTIFICATION_TYPES.QUOTE_APPROVED,
            `Great news! Your quote for "${quote.product_name || 'Product'}" has been approved and is ready for checkout.`,
            {
              quote_id: quote.id,
              action_url: `/checkout/${quote.id}`,
              action_label: 'Checkout Now',
              title: 'Quote Approved!',
              subtitle: `Total: $${quote.final_total_usd?.toFixed(2) || '0.00'}`
            },
            { skipDuplicates: true }
          );
        }
      }

      // Sample system notification
      await notificationService.createNotification(
        user.id,
        NOTIFICATION_TYPES.FEATURE_ANNOUNCEMENT,
        "New Feature: Track your orders in real-time with our enhanced tracking system!",
        {
          action_url: '/dashboard/orders',
          action_label: 'View Orders',
          title: 'New Tracking Feature',
          subtitle: 'Enhanced order tracking now available'
        },
        { skipDuplicates: true }
      );

      // Profile completion reminder
      if (!user.user_metadata?.full_name) {
        await notificationService.createNotification(
          user.id,
          NOTIFICATION_TYPES.PROFILE_INCOMPLETE,
          "Complete your profile to get personalized recommendations and faster checkout.",
          {
            action_url: '/profile',
            action_label: 'Complete Profile',
            title: 'Complete Your Profile'
          },
          { skipDuplicates: true }
        );
      }

      // Orders in progress notifications
      const inProgressOrders = orders?.filter(o => 
        o.status === 'ordered' || o.status === 'shipped'
      ) || [];
      
      if (inProgressOrders.length > 0) {
        const shippedOrders = inProgressOrders.filter(o => o.status === 'shipped');
        if (shippedOrders.length > 0) {
          await notificationService.createNotification(
            user.id,
            NOTIFICATION_TYPES.ORDER_SHIPPED_UPDATE,
            `Good news! ${shippedOrders.length} of your orders ${shippedOrders.length > 1 ? 'are' : 'is'} now shipped and on the way to you.`,
            {
              order_id: shippedOrders[0].id,
              action_url: '/dashboard/orders',
              action_label: 'Track Orders',
              title: 'Orders Shipped!'
            },
            { skipDuplicates: true }
          );
        }
      }

    } catch (error) {
      console.error('Error creating sample notifications:', error);
    }
  };

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

  // Enhanced recent activity with rich content
  const recentActivity: ActivityItem[] = [
    ...(quotes?.slice(0, 3).map((q) => ({
      id: q.id,
      type: 'quote' as const,
      title: q.product_name || `Quote ${q.display_id || `#${q.id.slice(0, 8)}`}`,
      description: `Quote request ${q.status === 'approved' ? 'approved and ready for checkout' : `is ${q.status}`}`,
      date: q.created_at,
      status: q.status,
      link: `/dashboard/quotes/${q.id}`,
      amount: q.final_total_usd,
      image: q.product_image,
      actions: q.status === 'approved' ? [
        {
          label: 'Checkout',
          onClick: () => window.location.href = `/checkout/${q.id}`,
          variant: 'default' as const
        },
        {
          label: 'View Details',
          onClick: () => window.location.href = `/dashboard/quotes/${q.id}`,
          variant: 'outline' as const
        }
      ] : q.status === 'sent' ? [
        {
          label: 'Review Quote',
          onClick: () => window.location.href = `/dashboard/quotes/${q.id}`,
          variant: 'default' as const
        }
      ] : undefined,
    })) || []),
    ...(orders?.slice(0, 2).map((o) => ({
      id: o.id,
      type: 'order' as const,
      title: o.product_name || `Order ${o.display_id || `#${o.id.slice(0, 8)}`}`,
      description: `Order ${o.status === 'completed' ? 'delivered successfully' : o.status === 'shipped' ? 'is on its way' : `is ${o.status}`}`,
      date: o.created_at,
      status: o.status,
      link: `/dashboard/orders/${o.id}`,
      amount: o.final_total_usd,
      actions: o.status === 'shipped' ? [
        {
          label: 'Track Package',
          onClick: () => window.location.href = `/track/${o.iwish_tracking_id || o.id}`,
          variant: 'default' as const
        }
      ] : undefined,
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
      insight: trends.activeQuotes.direction === 'up' ? 'You\'re requesting more quotes recently!' : 
               trends.activeQuotes.direction === 'down' ? 'Fewer active quotes than usual' : 
               'Steady quote activity',
    },
    {
      value: approvedQuotes,
      label: 'Approved Quotes',
      icon: CheckCircle,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'from-emerald-50 to-emerald-100',
      link: '/dashboard/quotes',
      trend: trends.approvedQuotes,
      insight: trends.approvedQuotes.direction === 'up' ? 'More quotes getting approved!' :
               trends.approvedQuotes.direction === 'down' ? 'Consider reviewing quote requirements' :
               'Consistent approval rate',
    },
    {
      value: ordersInProgress,
      label: 'Orders in Progress',
      icon: ShoppingCart,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-purple-50 to-purple-100',
      link: '/dashboard/orders',
      trend: trends.ordersInProgress,
      insight: trends.ordersInProgress.direction === 'up' ? 'More orders in the pipeline!' :
               'Orders moving through fulfillment',
    },
    {
      value: deliveredOrders,
      label: 'Delivered Orders',
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100',
      link: '/dashboard/orders',
      trend: trends.deliveredOrders,
      insight: trends.deliveredOrders.direction === 'up' ? 'Great! More deliveries completed' :
               'Steady delivery rate',
    },
    {
      value: openTickets,
      label: 'Active Help Requests',
      icon: Ticket,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100',
      link: '/support/my-tickets',
      trend: trends.openTickets,
      insight: trends.openTickets.direction === 'down' ? 'Fewer support issues - great!' :
               trends.openTickets.direction === 'up' ? 'We\'re here to help with any issues' :
               'Normal support activity',
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
                    : 'Here\'s what\'s happening with your international shopping.'
                  }
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
                          {React.cloneElement(action.icon, { className: 'w-4 h-4 sm:w-5 sm:h-5 text-teal-600' })}
                        </div>
                        <H2 className="text-sm sm:text-lg font-semibold mb-1 leading-tight">{action.label}</H2>
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

        {/* Smart Recommendations */}
        <AnimatedSection animation="fadeInUp" delay={600}>
          <div className="mb-8">
            <RecommendedProducts maxItems={4} />
          </div>
        </AnimatedSection>

        {/* Notification Center */}
        <AnimatedSection animation="fadeInUp" delay={700}>
          <div className="mb-8">
            <NotificationCenter 
              maxHeight="300px"
              defaultView="unread"
              compact={false}
            />
          </div>
        </AnimatedSection>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Enhanced Recent Activity Timeline */}
          <AnimatedSection animation="fadeInLeft" delay={800}>
            <ActivityTimeline
              activities={recentActivity}
              maxItems={5}
              showViewAll={true}
              viewAllLink="/dashboard/quotes"
            />
          </AnimatedSection>

          {/* Support/Contact Info */}
          <AnimatedSection animation="fadeInRight" delay={900}>
            <Card className="h-full bg-gray-50 border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-8 text-center flex flex-col justify-center h-full">
                <div className="w-16 h-16 rounded-lg bg-teal-50 flex items-center justify-center mx-auto mb-4">
                  <HelpCircle className="w-8 h-8 text-teal-600" />
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
                      className="text-teal-600 hover:text-teal-700 hover:underline font-medium"
                    >
                      support@iwishbag.com
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>

        {/* HSN System Test - Development Only */}
        {import.meta.env.DEV && (
          <AnimatedSection animation="fadeInUp" delay={900}>
            <HSNQuickTest className="mt-8" />
          </AnimatedSection>
        )}

        {/* Bottom CTA */}
        <AnimatedSection animation="fadeInUp" delay={1000}>
          <Card className="mt-8 bg-teal-50 border-teal-200 overflow-hidden relative">
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
