import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Package, 
  User, 
  Clock, 
  TrendingUp,
  DollarSign,
  Activity,
  ShoppingCart,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { StatusBadge } from '@/components/dashboard/StatusBadge';

export const RecentActivity = () => {
  const { formatAmount } = useUserCurrency();
  
  const { data: recentQuotes, error } = await supabase
    .from('quotes')
    .select(`
      id,
      email,
      final_total,
      final_total_local,
      status,
      created_at,
      product_name,
      country_code
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'completed':
      case 'paid':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getActivityIcon = (status: string, approvalStatus?: string) => {
    if (approvalStatus === 'approved' || status === 'paid' || status === 'completed') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (status === 'pending' || status === 'processing') {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    } else if (status === 'rejected' || status === 'cancelled') {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityTitle = (status: string, approvalStatus?: string) => {
    if (approvalStatus === 'approved' || status === 'paid' || status === 'completed') {
      return 'Order Completed';
    } else if (status === 'pending' || status === 'processing') {
      return 'Quote Pending';
    } else if (status === 'rejected' || status === 'cancelled') {
      return 'Quote Rejected';
    } else {
      return 'Quote Created';
    }
  };

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
            const displayAmount = quote.final_total_local || quote.final_total || 0;
            const isOrder = quote.status === 'approved' || quote.status === 'paid' || quote.status === 'completed';
            
            return (
              <div key={quote.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isOrder ? 'bg-green-100' : 'bg-blue-100'}`}>
                    {getActivityIcon(quote.status, quote.status)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{quote.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {getActivityTitle(quote.status, quote.status)} • {formatDistanceToNow(new Date(quote.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">
                    {formatAmount(displayAmount)}
                  </p>
                  <StatusBadge status={quote.status || 'pending'} category={['paid', 'ordered', 'shipped', 'completed', 'cancelled'].includes(quote.status || '') ? 'order' : 'quote'} />
                </div>
              </div>
            );
          })}
          {(!recentQuotes || recentQuotes.length === 0) && (
            <p className="text-center text-muted-foreground py-4">
              No recent activity
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 