import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Activity, CheckCircle, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCurrency } from '@/hooks/useCurrency';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { useStatusManagement } from '@/hooks/useStatusManagement';

export const RecentActivity = () => {
  const { formatAmount } = useCurrency('USD');
  const { getStatusesForOrdersList, getStatusConfig } = useStatusManagement();

  const { data: recentQuotes } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data: recentQuotes, error } = await supabase
        .from('quotes')
        .select(
          `
          id,
          email,
          final_total_usd,
          final_total_local,
          status,
          created_at,
          product_name,
          destination_country
        `,
        )
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return recentQuotes || [];
    },
  });

  const _getStatusColor = (status: string) => {
    const statusConfig = getStatusConfig(status, 'quote') || getStatusConfig(status, 'order');
    if (statusConfig) {
      switch (statusConfig.color) {
        case 'default':
          return 'bg-green-100 text-green-700';
        case 'secondary':
          return 'bg-yellow-100 text-yellow-700';
        case 'destructive':
          return 'bg-red-100 text-red-700';
        case 'outline':
          return 'bg-teal-100 text-teal-700';
        default:
          return 'bg-gray-100 text-gray-700';
      }
    }
    return 'bg-gray-100 text-gray-700';
  };

  const getActivityIcon = (status: string) => {
    const statusConfig = getStatusConfig(status, 'quote') || getStatusConfig(status, 'order');
    if (statusConfig?.isTerminal) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (statusConfig?.requiresAction) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    } else {
      return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityTitle = (status: string) => {
    const statusConfig = getStatusConfig(status, 'quote') || getStatusConfig(status, 'order');
    if (statusConfig?.isTerminal) {
      return statusConfig.category === 'order' ? 'Order Completed' : 'Quote Finalized';
    } else if (statusConfig?.requiresAction) {
      return statusConfig.category === 'order' ? 'Order Pending' : 'Quote Pending';
    } else {
      return statusConfig?.category === 'order' ? 'Order Updated' : 'Quote Created';
    }
  };

  const orderStatuses = getStatusesForOrdersList();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentQuotes?.map((quote) => {
            // Use final_total_local for display (user's preferred currency)
            const displayAmount = quote.final_total_local || quote.final_total_usd || 0;
            const isOrder = orderStatuses.includes(quote.status || '');

            return (
              <div
                key={quote.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isOrder ? 'bg-green-100' : 'bg-teal-100'}`}>
                    {getActivityIcon(quote.status || 'pending')}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{quote.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {getActivityTitle(quote.status || 'pending')} •{' '}
                      {formatDistanceToNow(new Date(quote.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{formatAmount(displayAmount)}</p>
                  <StatusBadge
                    status={quote.status || 'pending'}
                    category={isOrder ? 'order' : 'quote'}
                  />
                </div>
              </div>
            );
          })}
          {(!recentQuotes || recentQuotes.length === 0) && (
            <p className="text-center text-muted-foreground py-4">No recent activity</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
