/**
 * SimpleShareStats - Basic share statistics for testing
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, CheckCircle, Mail } from 'lucide-react';

export const SimpleShareStats: React.FC = () => {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['simple-share-stats'],
    queryFn: async () => {
      try {
        // Simple count query
        const { data, error } = await supabase
          .from('quotes')
          .select('id, status, share_token')
          .not('share_token', 'is', null);

        if (error) throw error;

        const totalShared = data?.length || 0;
        const approved = data?.filter((q) => q.status === 'approved').length || 0;

        return {
          totalShared,
          approved,
          approvalRate: totalShared > 0 ? Math.round((approved / totalShared) * 100) : 0,
        };
      } catch (err) {
        console.error('Stats query error:', err);
        return { totalShared: 0, approved: 0, approvalRate: 0 };
      }
    },
    refetchInterval: 30000, // 30 seconds
  });

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <p className="text-sm text-red-600">Failed to load share statistics</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Quote Share Statistics</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shared</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalShared || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approved || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <Mail className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approvalRate || 0}%</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
