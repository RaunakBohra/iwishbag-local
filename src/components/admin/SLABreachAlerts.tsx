/**
 * SLA Breach Alerts Component
 * Displays real-time breach notifications and alerts in admin dashboard
 */

import { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  AlertCircle,
  CheckCircle,
  Bell,
  X,
  Eye,
  Send,
  RefreshCw,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useUnacknowledgedBreaches,
  useBreachStats,
  useAcknowledgeBreach,
  useBreachDetection,
  useSendBreachNotifications,
  useSLABreachUtils,
} from '@/hooks/useSLABreaches';
import { formatDistanceToNow } from 'date-fns';

/**
 * Critical breach alert banner
 */
export const CriticalBreachAlert = () => {
  const { data: stats } = useBreachStats();
  const { shouldShowCriticalAlert } = useSLABreachUtils();
  const [dismissed, setDismissed] = useState(false);

  if (!shouldShowCriticalAlert(stats) || dismissed) {
    return null;
  }

  return (
    <Alert variant="destructive" className="border-red-500 bg-red-50">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        🚨 Critical SLA Breaches Detected
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="h-auto p-1 hover:bg-red-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription>
        {stats.critical_breaches > 0 && (
          <span className="font-medium text-red-800">
            {stats.critical_breaches} critical breach(es)
          </span>
        )}
        {stats.critical_breaches > 0 && stats.high_priority_breaches > 0 && ' • '}
        {stats.high_priority_breaches > 0 && (
          <span className="text-red-700">
            {stats.high_priority_breaches} high-priority breach(es)
          </span>
        )}
        <div className="mt-2">
          <SLABreachDialog>
            <Button
              variant="outline"
              size="sm"
              className="text-red-800 border-red-300 hover:bg-red-100"
            >
              <Eye className="h-4 w-4 mr-2" />
              View All Breaches
            </Button>
          </SLABreachDialog>
        </div>
      </AlertDescription>
    </Alert>
  );
};

/**
 * Breach statistics summary cards
 */
export const BreachStatsCards = () => {
  const { data: stats, isLoading } = useBreachStats();
  const breachDetection = useBreachDetection();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">SLA Breach Overview</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => breachDetection.mutate()}
          disabled={breachDetection.isPending}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${breachDetection.isPending ? 'animate-spin' : ''}`}
          />
          {breachDetection.isPending ? 'Checking...' : 'Check Now'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={stats.total_unacknowledged > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Unacknowledged</p>
                <p className="text-2xl font-bold text-red-600">{stats.total_unacknowledged}</p>
              </div>
              <Bell className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={stats.breaches_last_24h > 0 ? 'border-orange-200 bg-orange-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Last 24h</p>
                <p className="text-2xl font-bold text-orange-600">{stats.breaches_last_24h}</p>
              </div>
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Response Breaches</p>
                <p className="text-2xl font-bold text-purple-600">{stats.response_breaches}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Resolution Breaches</p>
                <p className="text-2xl font-bold text-blue-600">{stats.resolution_breaches}</p>
              </div>
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/**
 * SLA breach notifications dialog
 */
export const SLABreachDialog = ({ children }: { children: React.ReactNode }) => {
  const { data: breaches = [], isLoading } = useUnacknowledgedBreaches();
  const acknowledgeMutation = useAcknowledgeBreach();
  const sendNotificationsMutation = useSendBreachNotifications();
  const { getBreachTypeLabel, getSeverityIcon, getBadgeVariant, formatTimeAgo } =
    useSLABreachUtils();

  const handleAcknowledge = (notificationId: string) => {
    acknowledgeMutation.mutate(notificationId);
  };

  const handleSendNotifications = () => {
    const unsentBreaches = breaches.filter(
      (b) =>
        b.breach_type.includes('breach') && // Only send for actual breaches, not warnings
        !b.acknowledged_at,
    );

    if (unsentBreaches.length > 0) {
      sendNotificationsMutation.mutate(unsentBreaches);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              SLA Breach Notifications
            </span>
            {breaches.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendNotifications}
                disabled={sendNotificationsMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Email Alerts
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : breaches.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Breaches</h3>
              <p className="text-gray-600">All SLAs are currently being met.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breaches.map((breach) => (
                  <TableRow key={breach.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{breach.ticket_subject}</div>
                        <div className="text-xs text-gray-500">#{breach.ticket_id.slice(0, 8)}</div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">{getBreachTypeLabel(breach.breach_type)}</Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={getBadgeVariant(breach.severity)}>
                        {getSeverityIcon(breach.severity)} {breach.severity.toUpperCase()}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-sm">{breach.customer_email}</TableCell>

                    <TableCell className="text-sm">
                      {breach.assigned_to_name || 'Unassigned'}
                    </TableCell>

                    <TableCell className="text-sm text-gray-500">
                      {formatTimeAgo(breach.sent_at)}
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAcknowledge(breach.id)}
                        disabled={acknowledgeMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Ack
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
