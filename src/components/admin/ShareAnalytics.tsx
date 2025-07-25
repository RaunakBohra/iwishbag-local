/**
 * ShareAnalytics - Lightweight admin analytics for quote sharing
 *
 * Features:
 * - Basic counts only (no fancy charts)
 * - Minimal database queries
 * - Simple percentage calculations
 * - Light on resources
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Mail, CheckCircle, TrendingUp, Users, Clock } from 'lucide-react';

interface ShareStats {
  totalQuotes: number;
  sharedQuotes: number;
  approvedQuotes: number;
  verificationsSent: number;
  averageViewTime: number;
  topViewedQuote: {
    id: string;
    display_id: string;
    view_count: number;
  } | null;
}

export const ShareAnalytics: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['share-analytics'],
    queryFn: async (): Promise<ShareStats> => {
      // Single query to get all basic stats
      const [quotesResult, auditResult] = await Promise.all([
        // Get quote stats
        supabase
          .from('quotes')
          .select(
            `
            id,
            display_id,
            status,
            view_count,
            total_view_duration,
            share_token,
            email_verified
          `,
          )
          .not('share_token', 'is', null), // Only shared quotes

        // Get verification stats
        supabase.from('share_audit_log').select('action').eq('action', 'email_verification_sent'),
      ]);

      if (quotesResult.error) throw quotesResult.error;
      if (auditResult.error) throw auditResult.error;

      const quotes = quotesResult.data || [];
      const verificationsSent = auditResult.data?.length || 0;

      const totalQuotes = quotes.length;
      const approvedQuotes = quotes.filter((q) => q.status === 'approved').length;

      // Calculate average view time (in minutes)
      const totalViewTime = quotes.reduce((sum, q) => sum + (q.total_view_duration || 0), 0);
      const averageViewTime = totalQuotes > 0 ? Math.round(totalViewTime / totalQuotes / 60) : 0;

      // Find top viewed quote
      const topViewedQuote =
        quotes
          .filter((q) => q.view_count > 0)
          .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))[0] || null;

      return {
        totalQuotes,
        sharedQuotes: totalQuotes, // All quotes we fetched are shared
        approvedQuotes,
        verificationsSent,
        averageViewTime,
        topViewedQuote: topViewedQuote
          ? {
              id: topViewedQuote.id,
              display_id: topViewedQuote.display_id || topViewedQuote.id.substring(0, 8),
              view_count: topViewedQuote.view_count || 0,
            }
          : null,
      };
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const approvalRate = stats?.totalQuotes
    ? Math.round((stats.approvedQuotes / stats.totalQuotes) * 100)
    : 0;

  const verificationRate = stats?.totalQuotes
    ? Math.round((stats.verificationsSent / stats.totalQuotes) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Quote Share Analytics</h3>
        <Badge variant="outline" className="text-xs">
          Last 5 minutes
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Shared Quotes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Shared Quotes</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.totalQuotes || 0}</div>
            <p className="text-xs text-gray-500">Total quotes shared with customers</p>
          </CardContent>
        </Card>

        {/* Approval Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Approval Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{approvalRate}%</div>
            <p className="text-xs text-gray-500">
              {stats?.approvedQuotes || 0} of {stats?.totalQuotes || 0} approved
            </p>
          </CardContent>
        </Card>

        {/* Email Verifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Email Verifications</CardTitle>
            <Mail className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.verificationsSent || 0}</div>
            <p className="text-xs text-gray-500">{verificationRate}% verification rate</p>
          </CardContent>
        </Card>

        {/* Average View Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg View Time</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.averageViewTime || 0}m</div>
            <p className="text-xs text-gray-500">Time spent reviewing quotes</p>
          </CardContent>
        </Card>

        {/* Top Viewed Quote */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Most Viewed</CardTitle>
            <Eye className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.topViewedQuote?.view_count || 0}
            </div>
            <p className="text-xs text-gray-500">
              {stats?.topViewedQuote ? `Quote #${stats.topViewedQuote.display_id}` : 'No data yet'}
            </p>
          </CardContent>
        </Card>

        {/* Conversion Trend */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {approvalRate >= 50 ? '📈' : approvalRate >= 30 ? '📊' : '📉'}
            </div>
            <p className="text-xs text-gray-500">
              {approvalRate >= 50 ? 'Excellent' : approvalRate >= 30 ? 'Good' : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Simple Tips */}
      {stats && approvalRate < 40 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="text-amber-600">💡</div>
              <div>
                <p className="text-sm font-medium text-amber-800">Low approval rate detected</p>
                <p className="text-xs text-amber-700">
                  Consider reviewing pricing strategy or product presentation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
