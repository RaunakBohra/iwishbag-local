// =============================================
// Message Center Page - Unified Communication Hub
// =============================================
// Centralized communication hub that integrates messages, notifications,
// and support tickets into a single, intuitive interface for iwishBag users.
// Created: 2025-07-24
// =============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  MessageSquare,
  Bell,
  Ticket,
  Clock,
  Users,
  HeadphonesIcon,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/design-system';

// Import existing components
import { MessageCenter } from '@/components/messaging/MessageCenter';
import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { QuickReplies } from '@/components/messaging/QuickReplies';

// Import hooks
import { useUserTickets } from '@/hooks/useTickets';
import { useUnreadNotifications } from '@/hooks/useNotifications';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Business Hours Component
interface BusinessHoursProps {
  isCompact?: boolean;
}

const BusinessHoursDisplay: React.FC<BusinessHoursProps> = ({ isCompact = false }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Business hours: Monday-Friday 9 AM - 6 PM IST (GMT+5:30)
      const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const day = istTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const hour = istTime.getHours();

      // Check if it's Monday-Friday (1-5) and between 9 AM - 6 PM
      const isBusinessDay = day >= 1 && day <= 5;
      const isBusinessHour = hour >= 9 && hour < 18;
      setIsOnline(isBusinessDay && isBusinessHour);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (isCompact) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <div className={cn('w-2 h-2 rounded-full', isOnline ? 'bg-green-500' : 'bg-red-500')} />
        <span className="text-gray-600">Support {isOnline ? 'Online' : 'Offline'}</span>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <HeadphonesIcon className="h-5 w-5 text-blue-600" />
          <span>Support Hours</span>
          <Badge
            variant={isOnline ? 'default' : 'secondary'}
            className={cn(
              'ml-auto',
              isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600',
            )}
          >
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Business Hours:</span>
            <span className="text-sm text-gray-600">Mon-Fri, 9 AM - 6 PM IST</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Current Time:</span>
            <span className="text-sm text-gray-600">
              {currentTime.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                weekday: 'short'
              })}{' '}
              IST
            </span>
          </div>
          <Separator />
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600">
              {isOnline
                ? 'Our support team is currently online and ready to help!'
                : "Our support team is currently offline. We'll respond to your messages during business hours."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Support Tickets Summary Component
interface SupportTicketsSummaryProps {
  userId: string;
}

const SupportTicketsSummary: React.FC<SupportTicketsSummaryProps> = ({ userId }) => {
  const { data: tickets, isLoading, refetch } = useUserTickets(userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading tickets...</span>
      </div>
    );
  }

  const openTickets =
    tickets?.filter((ticket) => ticket.status === 'open' || ticket.status === 'in_progress') || [];

  const recentTickets = tickets?.slice(0, 5) || [];

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Tickets</p>
                <p className="text-2xl font-bold text-orange-600">{openTickets.length}</p>
              </div>
              <Ticket className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                <p className="text-2xl font-bold text-blue-600">{tickets?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Tickets</CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentTickets.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No support tickets yet</p>
              <p className="text-xs text-gray-400 mt-1">Your support requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{ticket.subject}</p>
                      <Badge
                        variant={getTicketStatusVariant(ticket.status)}
                        className="text-xs flex-shrink-0"
                      >
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Created {new Date(ticket.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center ml-3">{getTicketStatusIcon(ticket.status)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Helper functions for ticket status
const getTicketStatusVariant = (status: string) => {
  switch (status) {
    case 'open':
    case 'in_progress':
      return 'default' as const;
    case 'resolved':
    case 'closed':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
};

const getTicketStatusIcon = (status: string) => {
  switch (status) {
    case 'open':
    case 'in_progress':
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case 'resolved':
    case 'closed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
};

// Main MessageCenterPage Component
export const MessageCenterPage: React.FC = () => {
  const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('messages');

  // Get notification count for tab badge
  const { data: unreadNotifications } = useUnreadNotifications();
  const unreadCount = unreadNotifications?.length || 0;

  // Get message count for tab badge
  const { data: unreadMessagesCount = 0 } = useQuery({
    queryKey: ['unreadMessagesCount', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      // All authenticated users can see all unread messages
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user.id);

      if (error) {
        console.error('Error fetching unread messages count:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get tickets count for tab badge
  const { data: userTickets } = useUserTickets(user?.id);
  const openTicketsCount =
    userTickets?.filter((ticket) => ticket.status === 'open' || ticket.status === 'in_progress')
      .length || 0;

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Sign In Required</h2>
            <p className="text-gray-500">
              Please sign in to access your messages and notifications.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Communication Hub</h1>
            <p className="text-gray-600 mt-1">
              Manage your messages, notifications, and support tickets
            </p>
          </div>
          <BusinessHoursDisplay isCompact />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="messages" className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>Messages</span>
                {unreadMessagesCount > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5 min-w-0">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5 min-w-0">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger value="tickets" className="flex items-center space-x-2">
                <Ticket className="h-4 w-4" />
                <span>Support</span>
                {openTicketsCount > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5 min-w-0">
                    {openTicketsCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="messages" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Messages</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <MessageCenter />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <span>Notifications</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <NotificationCenter />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tickets" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Ticket className="h-5 w-5" />
                    <span>Support Tickets</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>{user?.id && <SupportTicketsSummary userId={user.id} />}</CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Business Hours */}
          <BusinessHoursDisplay />

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setActiveTab('messages')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                New Message
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open('/support/my-tickets', '_blank')}
              >
                <Ticket className="h-4 w-4 mr-2" />
                Create Ticket
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setActiveTab('notifications')}
              >
                <Bell className="h-4 w-4 mr-2" />
                View All Notifications
              </Button>
            </CardContent>
          </Card>

          {/* Communication Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Unread Messages</span>
                  <Badge variant={unreadMessagesCount > 0 ? 'destructive' : 'secondary'}>
                    {unreadMessagesCount}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Unread Notifications</span>
                  <Badge variant={unreadCount > 0 ? 'destructive' : 'secondary'}>
                    {unreadCount}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Open Tickets</span>
                  <Badge variant={openTicketsCount > 0 ? 'destructive' : 'secondary'}>
                    {openTicketsCount}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Replies - Show only on Messages tab */}
          {activeTab === 'messages' && (
            <QuickReplies
              onSelectReply={(message) => {
                // This could be enhanced to pre-fill a message form
                console.log('Selected quick reply:', message);
                // For now, just copy to clipboard
                navigator.clipboard.writeText(message).then(() => {
                  // Could show a toast notification here
                });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageCenterPage;
