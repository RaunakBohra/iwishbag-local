/**
 * Return Analytics Section
 * Handles analytics dashboard with metrics and insights for returns/refunds
 * Extracted from ReturnManagementDashboard for better maintainability
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Package,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  BarChart3,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '@/utils/currencyConversion';

interface ReturnStats {
  total_refunds: number;
  pending_refunds: number;
  total_refund_amount: number;
  total_returns: number;
  pending_returns: number;
  completed_today: number;
}

interface ReturnAnalyticsSectionProps {
  stats?: ReturnStats;
  isLoading: boolean;
  onRefresh?: () => void;
  className?: string;
}

export const ReturnAnalyticsSection: React.FC<ReturnAnalyticsSectionProps> = ({
  stats,
  isLoading,
  onRefresh,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Refunds */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Refunds
              </CardTitle>
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_refunds || 0}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={stats?.pending_refunds ? "destructive" : "secondary"} className="text-xs">
                {stats?.pending_refunds || 0} pending
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Total Refund Amount */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Refund Value
              </CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.total_refund_amount || 0, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              All processed refunds
            </p>
          </CardContent>
        </Card>

        {/* Package Returns */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Package Returns
              </CardTitle>
              <Package className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_returns || 0}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={stats?.pending_returns ? "destructive" : "secondary"} className="text-xs">
                {stats?.pending_returns || 0} pending
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Completed Today */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed Today
              </CardTitle>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completed_today || 0}</div>
            <p className="text-xs text-muted-foreground">
              Refunds + Returns
            </p>
          </CardContent>
        </Card>

        {/* Processing Time */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Processing Time
              </CardTitle>
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3 days</div>
            <p className="text-xs text-muted-foreground">
              Refund to completion
            </p>
          </CardContent>
        </Card>

        {/* Customer Satisfaction */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Customer Satisfaction
              </CardTitle>
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-600 text-xs">+5% this month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Dashboard Placeholder */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Return Analytics</CardTitle>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh analytics"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </button>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="font-medium">Analytics dashboard coming soon</p>
            <p className="text-sm mt-2">
              Track return trends, processing times, and customer satisfaction
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Return volume trends</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Processing time analysis</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Refund reason breakdown</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};