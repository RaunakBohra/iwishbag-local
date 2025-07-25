/**
 * HSN System Status Card
 * Displays government API status and system health
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Wifi,
  Database,
  Globe,
  RefreshCw,
  Clock,
  Activity,
} from 'lucide-react';

interface SystemStatus {
  overall_status: 'healthy' | 'degraded' | 'down';
  services: {
    india_gst: { status: string; stats: any };
    nepal_vat: { status: string; stats: any };
    us_taxjar: { status: string; stats: any };
  };
  orchestrator_stats: {
    totalRequests: number;
    apiCallsMade: number;
    cacheHits: number;
    fallbacksUsed: number;
    errors: number;
  };
}

interface HSNSystemStatusCardProps {
  systemStatus: SystemStatus;
  showDetails?: boolean;
}

export const HSNSystemStatusCard: React.FC<HSNSystemStatusCardProps> = ({
  systemStatus,
  showDetails = false,
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'down':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy':
        return 'default';
      case 'degraded':
        return 'secondary';
      case 'down':
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const calculateHealthScore = () => {
    const services = Object.values(systemStatus.services);
    const onlineServices = services.filter((s) => s.status === 'online').length;
    return (onlineServices / services.length) * 100;
  };

  const healthScore = calculateHealthScore();

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon(systemStatus.overall_status)}
          <span className="font-medium">System Status</span>
          <Badge variant={getStatusColor(systemStatus.overall_status)}>
            {systemStatus.overall_status.toUpperCase()}
          </Badge>
        </div>
        <div className="text-sm text-gray-600">Health: {Math.round(healthScore)}%</div>
      </div>

      {/* Health Progress Bar */}
      <div>
        <Progress value={healthScore} className="h-2" />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Government API Services */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Government APIs</h4>

        <div className="grid grid-cols-1 gap-2">
          {/* India GST */}
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(systemStatus.services.india_gst.status)}
              <span className="text-sm">India GST</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={getStatusColor(systemStatus.services.india_gst.status)}
                className="text-xs"
              >
                {systemStatus.services.india_gst.status}
              </Badge>
              {showDetails && systemStatus.services.india_gst.stats?.requestCount && (
                <span className="text-xs text-gray-600">
                  {systemStatus.services.india_gst.stats.requestCount} reqs
                </span>
              )}
            </div>
          </div>

          {/* Nepal VAT */}
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(systemStatus.services.nepal_vat.status)}
              <span className="text-sm">Nepal VAT</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={getStatusColor(systemStatus.services.nepal_vat.status)}
                className="text-xs"
              >
                {systemStatus.services.nepal_vat.status}
              </Badge>
              {showDetails && systemStatus.services.nepal_vat.stats?.localDataEntries && (
                <span className="text-xs text-gray-600">
                  {systemStatus.services.nepal_vat.stats.localDataEntries} entries
                </span>
              )}
            </div>
          </div>

          {/* US TaxJar */}
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(systemStatus.services.us_taxjar.status)}
              <span className="text-sm">US TaxJar</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={getStatusColor(systemStatus.services.us_taxjar.status)}
                className="text-xs"
              >
                {systemStatus.services.us_taxjar.status}
              </Badge>
              {showDetails &&
                systemStatus.services.us_taxjar.stats?.hasValidAPIKey !== undefined && (
                  <span className="text-xs text-gray-600">
                    {systemStatus.services.us_taxjar.stats.hasValidAPIKey
                      ? 'API Key OK'
                      : 'No API Key'}
                  </span>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Orchestrator Statistics */}
      {showDetails && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Performance Stats</h4>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3 text-blue-500" />
              <span className="text-gray-600">Total Requests</span>
              <span className="font-medium ml-auto">
                {systemStatus.orchestrator_stats.totalRequests}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Wifi className="h-3 w-3 text-green-500" />
              <span className="text-gray-600">API Calls</span>
              <span className="font-medium ml-auto">
                {systemStatus.orchestrator_stats.apiCallsMade}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Database className="h-3 w-3 text-purple-500" />
              <span className="text-gray-600">Cache Hits</span>
              <span className="font-medium ml-auto">
                {systemStatus.orchestrator_stats.cacheHits}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <RefreshCw className="h-3 w-3 text-orange-500" />
              <span className="text-gray-600">Fallbacks</span>
              <span className="font-medium ml-auto">
                {systemStatus.orchestrator_stats.fallbacksUsed}
              </span>
            </div>
          </div>

          {systemStatus.orchestrator_stats.errors > 0 && (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded text-sm">
              <XCircle className="h-3 w-3 text-red-500" />
              <span className="text-red-700">
                {systemStatus.orchestrator_stats.errors} error
                {systemStatus.orchestrator_stats.errors !== 1 ? 's' : ''} occurred
              </span>
            </div>
          )}

          {/* Cache Hit Ratio */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Cache Hit Ratio</span>
              <span className="font-medium">
                {systemStatus.orchestrator_stats.totalRequests > 0
                  ? Math.round(
                      (systemStatus.orchestrator_stats.cacheHits /
                        systemStatus.orchestrator_stats.totalRequests) *
                        100,
                    )
                  : 0}
                %
              </span>
            </div>
            <Progress
              value={
                systemStatus.orchestrator_stats.totalRequests > 0
                  ? (systemStatus.orchestrator_stats.cacheHits /
                      systemStatus.orchestrator_stats.totalRequests) *
                    100
                  : 0
              }
              className="h-1"
            />
          </div>
        </div>
      )}

      {/* Status Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Last checked: {new Date().toLocaleTimeString()}
        </span>
        {systemStatus.overall_status === 'healthy' && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            All systems operational
          </span>
        )}
      </div>
    </div>
  );
};
