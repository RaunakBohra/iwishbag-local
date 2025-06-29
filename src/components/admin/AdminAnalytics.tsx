
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCurrencyDisplay } from "@/hooks/useAdminCurrencyDisplay";
import { MultiCurrencyDisplay } from "./MultiCurrencyDisplay";

export const AdminAnalytics = () => {
  const { formatMultiCurrency } = useAdminCurrencyDisplay();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('*')
        .not('final_total', 'is', null);

      if (error) throw error;

      const totalRevenue = quotes?.reduce((sum, quote) => sum + (quote.final_total || 0), 0) || 0;
      const totalOrders = quotes?.filter(q => ['paid', 'ordered', 'shipped', 'completed'].includes(q.status)).length || 0;
      const pendingQuotes = quotes?.filter(q => ['pending', 'calculated'].includes(q.status)).length || 0;
      const activeOrders = quotes?.filter(q => ['paid', 'ordered', 'shipped'].includes(q.status)).length || 0;

      return {
        totalRevenue,
        totalOrders,
        pendingQuotes,
        activeOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
      };
    },
  });

  if (isLoading) {
    return <div>Loading analytics...</div>;
  }

  const revenueCurrencies = analytics?.totalRevenue ? formatMultiCurrency({
    usdAmount: analytics.totalRevenue,
    showAllVariations: false // Just show USD for analytics
  }) : [];

  const avgOrderCurrencies = analytics?.averageOrderValue ? formatMultiCurrency({
    usdAmount: analytics.averageOrderValue,
    showAllVariations: false
  }) : [];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <MultiCurrencyDisplay 
              currencies={revenueCurrencies}
              orientation="vertical"
              showLabels={false}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics?.totalOrders || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analytics?.pendingQuotes || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <MultiCurrencyDisplay 
              currencies={avgOrderCurrencies}
              orientation="vertical"
              showLabels={false}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
