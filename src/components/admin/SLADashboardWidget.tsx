/**
 * SLA Dashboard Widget - Displays key SLA metrics and performance indicators
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, TrendingUp, Star, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { slaService, type SLADashboardMetrics } from '@/services/SLAService';

interface SLADashboardWidgetProps {
  className?: string;
}

export const SLADashboardWidget: React.FC<SLADashboardWidgetProps> = ({ className }) => {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['sla-dashboard-metrics'],
    queryFn: () => slaService.getDashboardMetrics(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className || ''}`}>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load SLA metrics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSLAComplianceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600 bg-green-50 border-green-200';
    if (rate >= 85) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (rate >= 70) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getSatisfactionColor = (avg: number | null) => {
    if (!avg) return 'text-gray-500';
    if (avg >= 4) return 'text-green-600';
    if (avg >= 3.5) return 'text-yellow-600';
    if (avg >= 3) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className || ''}`}>
      {/* Response Time SLA */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Response SLA
          </CardTitle>
          <CardDescription className="text-xs">First response compliance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            {metrics.responseSLAComplianceRate.toFixed(1)}%
          </div>
          <Progress 
            value={metrics.responseSLAComplianceRate} 
            className="w-full h-2 mb-2" 
          />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Avg: {slaService.formatResponseTime(metrics.avgFirstResponseMinutes)}</span>
            <Badge 
              variant="outline" 
              className={getSLAComplianceColor(metrics.responseSLAComplianceRate)}
            >
              {metrics.responseSLAComplianceRate >= 95 ? 'Excellent' : 
               metrics.responseSLAComplianceRate >= 85 ? 'Good' :
               metrics.responseSLAComplianceRate >= 70 ? 'Fair' : 'Needs Improvement'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Resolution Time SLA */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Resolution SLA
          </CardTitle>
          <CardDescription className="text-xs">Ticket resolution compliance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            {metrics.resolutionSLAComplianceRate.toFixed(1)}%
          </div>
          <Progress 
            value={metrics.resolutionSLAComplianceRate} 
            className="w-full h-2 mb-2" 
          />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Avg: {slaService.formatResponseTime(metrics.avgResolutionMinutes)}</span>
            <Badge 
              variant="outline" 
              className={getSLAComplianceColor(metrics.resolutionSLAComplianceRate)}
            >
              {metrics.resolutionSLAComplianceRate >= 95 ? 'Excellent' : 
               metrics.resolutionSLAComplianceRate >= 85 ? 'Good' :
               metrics.resolutionSLAComplianceRate >= 70 ? 'Fair' : 'Needs Improvement'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Status Overview */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            Ticket Status
          </CardTitle>
          <CardDescription className="text-xs">30-day overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            {metrics.totalTickets}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                On Track
              </span>
              <span className="font-medium">{metrics.ticketsOnTrack}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                Approaching
              </span>
              <span className="font-medium">{metrics.ticketsApproachingDeadline}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Overdue
              </span>
              <span className="font-medium text-red-600">{metrics.ticketsOverdue}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Satisfaction */}
      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            Satisfaction
          </CardTitle>
          <CardDescription className="text-xs">Customer feedback scores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold mb-2 ${getSatisfactionColor(metrics.customerSatisfactionAvg)}`}>
            {metrics.customerSatisfactionAvg 
              ? `${metrics.customerSatisfactionAvg.toFixed(1)}/5.0`
              : 'N/A'
            }
          </div>
          <div className="flex items-center gap-1 mb-2">
            {metrics.customerSatisfactionAvg ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i}
                    className={`h-3 w-3 ${
                      i < Math.round(metrics.customerSatisfactionAvg!) 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </>
            ) : (
              <span className="text-xs text-gray-500">No ratings yet</span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {metrics.customerSatisfactionCount} responses
            </span>
            <Badge variant="outline" className={getSatisfactionColor(metrics.customerSatisfactionAvg)}>
              {metrics.customerSatisfactionAvg && metrics.customerSatisfactionAvg >= 4 ? 'Excellent' :
               metrics.customerSatisfactionAvg && metrics.customerSatisfactionAvg >= 3.5 ? 'Good' :
               metrics.customerSatisfactionAvg && metrics.customerSatisfactionAvg >= 3 ? 'Fair' : 'Poor'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Compact SLA Status Indicator for individual tickets
 */
interface SLAStatusIndicatorProps {
  ticket: {
    priority: string;
    created_at: string;
    first_response_at?: string | null;
    status: string;
  };
  className?: string;
}

export const SLAStatusIndicator: React.FC<SLAStatusIndicatorProps> = ({ ticket, className }) => {
  const now = new Date();
  const createdAt = new Date(ticket.created_at);
  const firstResponseAt = ticket.first_response_at ? new Date(ticket.first_response_at) : null;
  
  // Get SLA targets based on priority (simplified version)
  const getSLATargets = (priority: string) => {
    switch (priority) {
      case 'urgent': return { response: 60, resolution: 480 }; // 1h, 8h
      case 'high': return { response: 240, resolution: 1440 }; // 4h, 24h
      case 'medium': return { response: 480, resolution: 2880 }; // 8h, 48h
      case 'low': return { response: 1440, resolution: 5760 }; // 24h, 96h
      default: return { response: 480, resolution: 2880 };
    }
  };

  const targets = getSLATargets(ticket.priority);
  const elapsedMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
  
  // Check response SLA status
  const responseStatus = firstResponseAt 
    ? 'met'
    : elapsedMinutes > targets.response 
      ? 'breached' 
      : elapsedMinutes > (targets.response * 0.8)
        ? 'approaching'
        : 'on_track';

  const getStatusColor = () => {
    switch (responseStatus) {
      case 'met': return 'bg-green-500';
      case 'on_track': return 'bg-blue-500';
      case 'approaching': return 'bg-yellow-500';
      case 'breached': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (responseStatus) {
      case 'met': return 'SLA Met';
      case 'on_track': return 'On Track';
      case 'approaching': return 'Approaching Deadline';
      case 'breached': return 'SLA Breached';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className || ''}`}>
      <div 
        className={`w-2 h-2 rounded-full ${getStatusColor()}`}
        title={getStatusText()}
      />
      <span className="text-xs text-gray-500">
        {firstResponseAt ? 'Responded' : slaService.formatResponseTime(elapsedMinutes)}
      </span>
    </div>
  );
};