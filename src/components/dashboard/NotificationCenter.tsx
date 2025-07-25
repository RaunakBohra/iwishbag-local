// =============================================
// Notification Center Component
// =============================================
// Dashboard component for displaying and managing user notifications.
// Features real-time updates, actions, and responsive design.
// Created: 2025-07-24
// =============================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellRing,
  Check,
  X,
  CheckCheck,
  Clock,
  AlertCircle,
  Info,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/design-system';
import { useNotifications, useUnreadNotifications } from '@/hooks/useNotifications';
import { NotificationRecord } from '@/services/NotificationService';
import { 
  getNotificationConfig, 
  NOTIFICATION_CATEGORIES,
  NotificationCategory 
} from '@/types/NotificationTypes';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface NotificationCenterProps {
  className?: string;
  maxHeight?: string;
  showTitle?: boolean;
  showActions?: boolean;
  defaultView?: 'unread' | 'all';
  compact?: boolean;
}

// Individual notification item component
const NotificationItem: React.FC<{
  notification: NotificationRecord;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  compact?: boolean;
}> = ({ notification, onRead, onDismiss, compact = false }) => {
  const [isActioning, setIsActioning] = useState(false);
  const config = getNotificationConfig(notification.type);
  
  const handleRead = async () => {
    if (notification.is_read) return;
    
    setIsActioning(true);
    try {
      await onRead(notification.id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setIsActioning(false);
    }
  };

  const handleDismiss = async () => {
    if (!notification.allow_dismiss) return;
    
    setIsActioning(true);
    try {
      await onDismiss(notification.id);
    } catch (error) {
      console.error('Error dismissing notification:', error);
    } finally {
      setIsActioning(false);
    }
  };

  const handleAction = () => {
    if (notification.data.action_url) {
      window.location.href = notification.data.action_url;
    }
    
    // Mark as read when taking action
    if (!notification.is_read) {
      handleRead();
    }
  };

  // Get priority color
  const getPriorityColor = () => {
    switch (notification.priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50';
      case 'low':
        return 'border-l-gray-500 bg-gray-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  // Get icon based on notification type/config
  const getIcon = () => {
    const iconName = config.icon || 'Bell';
    const iconProps = { className: 'w-4 h-4' };
    
    switch (iconName) {
      case 'CheckCircle':
        return <Check {...iconProps} className="w-4 h-4 text-green-600" />;
      case 'AlertCircle':
        return <AlertCircle {...iconProps} className="w-4 h-4 text-red-600" />;
      case 'Clock':
        return <Clock {...iconProps} className="w-4 h-4 text-orange-600" />;
      case 'Sparkles':
        return <Sparkles {...iconProps} className="w-4 h-4 text-purple-600" />;
      case 'Info':
        return <Info {...iconProps} className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell {...iconProps} className="w-4 h-4 text-gray-600" />;
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        'relative border-l-4 rounded-lg border border-gray-200 bg-white transition-all duration-200 hover:shadow-md',
        getPriorityColor(),
        !notification.is_read && 'shadow-sm',
        notification.is_read && 'opacity-75',
        compact ? 'p-3' : 'p-4'
      )}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-teal-500 rounded-full" />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {/* Message */}
              <p className={cn(
                'text-gray-900 leading-relaxed',
                compact ? 'text-sm' : 'text-base',
                !notification.is_read && 'font-medium'
              )}>
                {notification.message}
              </p>

              {/* Subtitle/Additional info */}
              {notification.data.subtitle && (
                <p className={cn(
                  'text-gray-600 mt-1',
                  compact ? 'text-xs' : 'text-sm'
                )}>
                  {notification.data.subtitle}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-2 mt-2">
                <span className={cn(
                  'text-gray-500',
                  compact ? 'text-xs' : 'text-sm'
                )}>
                  {timeAgo}
                </span>
                
                {notification.priority === 'urgent' && (
                  <Badge variant="destructive" className="text-xs">
                    Urgent
                  </Badge>
                )}
                
                {notification.priority === 'high' && (
                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                    High Priority
                  </Badge>
                )}

                {notification.requires_action && (
                  <Badge variant="outline" className="text-xs">
                    Action Required
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Action button */}
              {notification.data.action_url && notification.data.action_label && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAction}
                  disabled={isActioning}
                  className="text-xs"
                >
                  {notification.data.action_label}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              )}

              {/* Mark as read */}
              {!notification.is_read && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRead}
                  disabled={isActioning}
                  className="h-8 w-8 p-0"
                  title="Mark as read"
                >
                  {isActioning ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                </Button>
              )}

              {/* Dismiss */}
              {notification.allow_dismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  disabled={isActioning}
                  className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                  title="Dismiss"
                >
                  {isActioning ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className,
  maxHeight = '400px',
  showTitle = true,
  showActions = true,
  defaultView = 'unread',
  compact = false,
}) => {
  const [activeTab, setActiveTab] = useState<'unread' | 'all'>(defaultView);
  const [isExpanded, setIsExpanded] = useState(true);

  // Hooks for different notification views
  const unreadNotifications = useUnreadNotifications({ 
    limit: 50,
    refetchInterval: 15000, // 15 seconds for real-time feel
  });
  
  const allNotifications = useNotifications({ 
    limit: 100,
    enabled: activeTab === 'all',
  });

  // Use appropriate hook based on active tab
  const currentHook = activeTab === 'unread' ? unreadNotifications : allNotifications;
  const {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    markAsRead,
    dismiss,
    markAllAsRead,
    refresh,
  } = currentHook;

  // Group notifications by category for organization
  const groupedNotifications = useMemo(() => {
    const groups: Record<NotificationCategory, NotificationRecord[]> = {
      [NOTIFICATION_CATEGORIES.QUOTES]: [],
      [NOTIFICATION_CATEGORIES.ORDERS]: [],
      [NOTIFICATION_CATEGORIES.PAYMENTS]: [],
      [NOTIFICATION_CATEGORIES.SUPPORT]: [],
      [NOTIFICATION_CATEGORIES.SYSTEM]: [],
      [NOTIFICATION_CATEGORIES.ACCOUNT]: [],
    };

    notifications.forEach(notification => {
      const config = getNotificationConfig(notification.type);
      groups[config.category].push(notification);
    });

    // Filter out empty categories
    return Object.entries(groups).filter(([_, notifs]) => notifs.length > 0);
  }, [notifications]);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const isEmpty = notifications.length === 0;

  return (
    <Card className={cn('shadow-sm border border-gray-200', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {showTitle && (
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="relative">
                {unreadCount > 0 ? (
                  <BellRing className="w-5 h-5 text-teal-600" />
                ) : (
                  <Bell className="w-5 h-5 text-gray-600" />
                )}
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </div>
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {unreadCount} unread
                </Badge>
              )}
            </CardTitle>
          )}

          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={refresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
              title="Refresh notifications"
            >
              <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            </Button>

            {/* Actions dropdown */}
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Filter className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem 
                    onClick={handleMarkAllAsRead}
                    disabled={unreadCount === 0}
                  >
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Mark All as Read
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Expand
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'unread' | 'all')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unread" className="relative">
              Unread
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <CardContent className="pt-0">
            <div 
              className="space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
              style={{ maxHeight }}
            >
              {isLoading ? (
                // Loading skeleton
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="border-l-4 border-l-gray-300 rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-4 h-4 bg-gray-300 rounded-full flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-300 rounded w-3/4" />
                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : isEmpty ? (
                // Empty state
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600 text-sm">
                    {activeTab === 'unread' 
                      ? "No unread notifications" 
                      : "No notifications yet"
                    }
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {activeTab === 'unread' 
                      ? "You're all caught up!"
                      : "Notifications will appear here when you have them"
                    }
                  </p>
                </div>
              ) : (
                // Notification list
                <AnimatePresence mode="popLayout">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={markAsRead}
                      onDismiss={dismiss}
                      compact={compact}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </CardContent>
        )}
      </AnimatePresence>
    </Card>
  );
};