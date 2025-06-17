
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { TrendingUp, DollarSign, Clock, ShoppingCart, AlertTriangle, Target } from "lucide-react";

type Quote = Tables<'quotes'>;

interface OverviewMetricsProps {
  quotes: Quote[];
  orders: Quote[];
}

export const OverviewMetrics = ({ quotes, orders }: OverviewMetricsProps) => {
  // Calculate metrics
  const totalQuotes = quotes.length;
  const pendingQuotes = quotes.filter(q => q.status === 'pending').length;
  const approvedQuotes = quotes.filter(q => q.approval_status === 'approved').length;
  const itemsInCart = quotes.filter(q => q.in_cart === true).length;
  const activeOrders = orders.filter(q => !['completed', 'cancelled', 'rejected'].includes(q.status)).length;
  
  const totalValue = quotes
    .filter(q => q.final_total)
    .reduce((sum, q) => sum + Number(q.final_total), 0);
    
  const cartValue = quotes
    .filter(q => q.in_cart && q.final_total)
    .reduce((sum, q) => sum + Number(q.final_total), 0);

  const approvalRate = totalQuotes > 0 ? (approvedQuotes / totalQuotes * 100) : 0;
  const avgQuoteValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;

  const metrics = [
    {
      title: "Total Quotes",
      value: totalQuotes,
      description: `${pendingQuotes} pending review`,
      icon: Clock,
      trend: "+12% from last month"
    },
    {
      title: "Approval Rate",
      value: `${approvalRate.toFixed(1)}%`,
      description: `${approvedQuotes} of ${totalQuotes} approved`,
      icon: Target,
      trend: approvalRate > 75 ? "Excellent performance" : "Room for improvement"
    },
    {
      title: "Cart Value",
      value: `$${cartValue.toFixed(2)}`,
      description: `${itemsInCart} items ready for checkout`,
      icon: ShoppingCart,
      trend: cartValue > 1000 ? "High value cart" : "Moderate value"
    },
    {
      title: "Active Orders",
      value: activeOrders,
      description: "Orders being processed",
      icon: TrendingUp,
      trend: `${orders.filter(o => o.status === 'shipped').length} shipped`
    },
    {
      title: "Average Quote Value",
      value: `$${avgQuoteValue.toFixed(2)}`,
      description: "Per quote average",
      icon: DollarSign,
      trend: avgQuoteValue > 500 ? "Above average" : "Below average"
    },
    {
      title: "Total Portfolio Value",
      value: `$${totalValue.toFixed(2)}`,
      description: "All-time quote value",
      icon: TrendingUp,
      trend: "Growing steadily"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <p className="text-xs text-muted-foreground">{metric.description}</p>
            <p className="text-xs text-green-600 mt-1">{metric.trend}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
