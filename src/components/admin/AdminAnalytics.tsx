import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, Clock, CheckCircle, Users } from "lucide-react";

export const AdminAnalytics = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics-basic'],
    queryFn: async () => {
      // Use count queries instead of fetching all data
      const [
        totalQuotesResult,
        pendingQuotesResult,
        activeOrdersResult,
        completedOrdersResult
      ] = await Promise.all([
        supabase.from('quotes').select('*', { count: 'exact', head: true }),
        supabase.from('quotes').select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'calculated']),
        supabase.from('quotes').select('*', { count: 'exact', head: true })
          .in('status', ['paid', 'ordered', 'shipped']),
        supabase.from('quotes').select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
      ]);

      return {
        totalQuotes: totalQuotesResult.count || 0,
        pendingQuotes: pendingQuotesResult.count || 0,
        activeOrders: activeOrdersResult.count || 0,
        completedOrders: completedOrdersResult.count || 0
      };
    },
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: 300000 // Refetch every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: "Total Quotes",
      value: analytics?.totalQuotes || 0,
      icon: Package,
      color: "text-blue-600"
    },
    {
      title: "Pending Quotes",
      value: analytics?.pendingQuotes || 0,
      icon: Clock,
      color: "text-yellow-600"
    },
    {
      title: "Active Orders",
      value: analytics?.activeOrders || 0,
      icon: Users,
      color: "text-green-600"
    },
    {
      title: "Completed Orders",
      value: analytics?.completedOrders || 0,
      icon: CheckCircle,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            <metric.icon className={`h-4 w-4 ${metric.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};