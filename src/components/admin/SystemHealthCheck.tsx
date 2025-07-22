/**
 * System Health Check Component
 * Validates all support system functionality for testing
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { 
  useUnacknowledgedBreaches, 
  useBreachStats, 
  useBreachDetection 
} from '@/hooks/useSLABreaches';
import { useAssignmentStats } from '@/hooks/useAutoAssignment';
import { useTicketStats, useAdminTickets } from '@/hooks/useTickets';

interface HealthCheckItem {
  name: string;
  status: 'loading' | 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

export const SystemHealthCheck = () => {
  const [healthChecks, setHealthChecks] = useState<HealthCheckItem[]>([]);

  // Test hooks
  const { data: breaches, isLoading: breachesLoading, error: breachesError } = useUnacknowledgedBreaches();
  const { data: breachStats, isLoading: breachStatsLoading, error: breachStatsError } = useBreachStats();
  const { data: assignmentStats, isLoading: assignmentLoading, error: assignmentError } = useAssignmentStats();
  const { data: ticketStats, isLoading: ticketStatsLoading, error: ticketStatsError } = useTicketStats();
  const { data: tickets, isLoading: ticketsLoading, error: ticketsError } = useAdminTickets({});
  const breachDetection = useBreachDetection();

  useEffect(() => {
    const checks: HealthCheckItem[] = [
      {
        name: 'SLA Breach Notifications',
        status: breachesLoading ? 'loading' : breachesError ? 'error' : 'success',
        message: breachesLoading ? 'Loading...' : breachesError ? 'Failed to load' : `${breaches?.length || 0} unacknowledged breaches`,
        data: breaches
      },
      {
        name: 'SLA Breach Statistics',
        status: breachStatsLoading ? 'loading' : breachStatsError ? 'error' : 'success',
        message: breachStatsLoading ? 'Loading...' : breachStatsError ? 'Failed to load' : `${breachStats?.total_unacknowledged || 0} total unacknowledged`,
        data: breachStats
      },
      {
        name: 'Auto-Assignment System',
        status: assignmentLoading ? 'loading' : assignmentError ? 'error' : 'success',
        message: assignmentLoading ? 'Loading...' : assignmentError ? 'Failed to load' : `${assignmentStats?.active_rules || 0} active rules, ${assignmentStats?.total_assignments || 0} assignments made`,
        data: assignmentStats
      },
      {
        name: 'Support Tickets',
        status: ticketsLoading ? 'loading' : ticketsError ? 'error' : 'success',
        message: ticketsLoading ? 'Loading...' : ticketsError ? 'Failed to load' : `${tickets?.length || 0} tickets loaded`,
        data: tickets
      },
      {
        name: 'Ticket Statistics',
        status: ticketStatsLoading ? 'loading' : ticketStatsError ? 'error' : 'success',
        message: ticketStatsLoading ? 'Loading...' : ticketStatsError ? 'Failed to load' : `${ticketStats?.total || 0} total tickets`,
        data: ticketStats
      }
    ];

    setHealthChecks(checks);
  }, [
    breaches, breachesLoading, breachesError,
    breachStats, breachStatsLoading, breachStatsError,
    assignmentStats, assignmentLoading, assignmentError,
    tickets, ticketsLoading, ticketsError,
    ticketStats, ticketStatsLoading, ticketStatsError
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loading':
        return 'bg-yellow-50 border-yellow-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const runBreachDetection = () => {
    breachDetection.mutate();
  };

  const overallStatus = healthChecks.every(c => c.status === 'success') ? 'success' :
                       healthChecks.some(c => c.status === 'error') ? 'error' :
                       healthChecks.some(c => c.status === 'loading') ? 'loading' : 'warning';

  return (
    <div className="space-y-6">
      <Card className={getStatusColor(overallStatus)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(overallStatus)}
            System Health Check
            <Badge variant={overallStatus === 'success' ? 'default' : overallStatus === 'error' ? 'destructive' : 'secondary'}>
              {overallStatus.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {healthChecks.map((check, index) => (
              <div key={index} className={`p-3 rounded-lg border ${getStatusColor(check.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(check.status)}
                    <span className="font-medium">{check.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">{check.message}</span>
                </div>
                {check.data && (
                  <div className="mt-2 text-xs text-gray-500">
                    <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(check.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex gap-2">
            <Button 
              onClick={runBreachDetection} 
              disabled={breachDetection.isPending}
              variant="outline"
            >
              {breachDetection.isPending ? 'Running...' : 'Test Breach Detection'}
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Refresh All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{tickets?.length || 0}</div>
              <div className="text-sm text-gray-600">Total Tickets</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{breachStats?.total_unacknowledged || 0}</div>
              <div className="text-sm text-gray-600">Unacknowledged Breaches</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{assignmentStats?.active_rules || 0}</div>
              <div className="text-sm text-gray-600">Active Assignment Rules</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{assignmentStats?.total_assignments || 0}</div>
              <div className="text-sm text-gray-600">Total Assignments</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};