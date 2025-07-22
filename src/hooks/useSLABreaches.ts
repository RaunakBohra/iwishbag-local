/**
 * React hooks for SLA breach notifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { slaBreachService, type BreachNotification } from '@/services/SLABreachService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to get unacknowledged breach notifications
 */
export const useUnacknowledgedBreaches = () => {
  return useQuery({
    queryKey: ['sla-breaches', 'unacknowledged'],
    queryFn: () => slaBreachService.getUnacknowledgedBreaches(),
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });
};

/**
 * Hook to get breach statistics
 */
export const useBreachStats = () => {
  return useQuery({
    queryKey: ['sla-breaches', 'stats'],
    queryFn: () => slaBreachService.getBreachStats(),
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  });
};

/**
 * Hook to get breach notifications for specific ticket
 */
export const useTicketBreaches = (ticketId: string) => {
  return useQuery({
    queryKey: ['sla-breaches', 'ticket', ticketId],
    queryFn: () => slaBreachService.getTicketBreachNotifications(ticketId),
    enabled: !!ticketId,
    refetchInterval: 60 * 1000, // Refresh every minute
  });
};

/**
 * Hook to run breach detection
 */
export const useBreachDetection = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => slaBreachService.detectBreaches(),
    onSuccess: (breachCount) => {
      // Invalidate all breach-related queries
      queryClient.invalidateQueries({ queryKey: ['sla-breaches'] });
      queryClient.invalidateQueries({ queryKey: ['sla-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });

      if (breachCount > 0) {
        toast({
          title: 'Breach Detection Complete',
          description: `${breachCount} new breach(es) or warning(s) detected`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Breach Detection Complete',
          description: 'No new breaches detected',
        });
      }
    },
    onError: (error) => {
      console.error('Failed to run breach detection:', error);
      toast({
        title: 'Error',
        description: 'Failed to run breach detection',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to acknowledge breach notification
 */
export const useAcknowledgeBreach = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return slaBreachService.acknowledgeNotification(notificationId, user.id);
    },
    onSuccess: (success) => {
      // Invalidate breach queries
      queryClient.invalidateQueries({ queryKey: ['sla-breaches'] });
      
      if (success) {
        toast({
          title: 'Acknowledged',
          description: 'Breach notification acknowledged',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to acknowledge notification',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Failed to acknowledge breach:', error);
      toast({
        title: 'Error',
        description: 'Failed to acknowledge breach notification',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to send breach notifications
 */
export const useSendBreachNotifications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notifications: BreachNotification[]) => 
      slaBreachService.sendBreachNotifications(notifications),
    onSuccess: (sentCount) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['sla-breaches'] });
      
      toast({
        title: 'Notifications Sent',
        description: `${sentCount} breach notification(s) sent successfully`,
      });
    },
    onError: (error) => {
      console.error('Failed to send breach notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to send breach notifications',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook for SLA breach utilities
 */
export const useSLABreachUtils = () => {
  const getBreachTypeLabel = (type: string) => {
    return slaBreachService.getBreachTypeLabel(type);
  };

  const getSeverityColor = (severity: string) => {
    return slaBreachService.getSeverityColor(severity);
  };

  const getSeverityIcon = (severity: string) => {
    return slaBreachService.getSeverityIcon(severity);
  };

  const getBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const shouldShowCriticalAlert = (stats: any) => {
    return stats && (stats.critical_breaches > 0 || stats.high_priority_breaches > 2);
  };

  return {
    getBreachTypeLabel,
    getSeverityColor,
    getSeverityIcon,
    getBadgeVariant,
    formatTimeAgo,
    shouldShowCriticalAlert,
  };
};

/**
 * Hook for periodic breach monitoring (background task)
 */
export const useBreachMonitoring = (enabled: boolean = true) => {
  const breachDetection = useBreachDetection();
  
  // Auto-run breach detection every 5 minutes
  useQuery({
    queryKey: ['breach-monitoring'],
    queryFn: async () => {
      if (enabled) {
        breachDetection.mutate();
      }
      return null;
    },
    refetchInterval: 5 * 60 * 1000, // Every 5 minutes
    refetchIntervalInBackground: true,
    enabled: enabled,
    retry: false,
  });

  return {
    isRunning: breachDetection.isPending,
    lastRun: breachDetection.status,
  };
};