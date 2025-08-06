import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Gift, DollarSign, Users } from 'lucide-react';

interface DiscountStats {
  total_discounts_used: number;
  total_savings: number;
  active_campaigns: number;
  conversion_rate: number;
}

interface DiscountStatsSectionProps {
  stats: DiscountStats | null;
  loading: boolean;
}

export const DiscountStatsSection: React.FC<DiscountStatsSectionProps> = ({
  stats,
  loading
}) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Loading data...</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Discounts Used",
      value: stats.total_discounts_used.toLocaleString(),
      description: "Times discounts were applied",
      icon: Gift,
      color: "text-blue-600",
    },
    {
      title: "Total Savings",
      value: `$${stats.total_savings.toLocaleString()}`,
      description: "Customer savings to date",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Active Campaigns",
      value: stats.active_campaigns.toString(),
      description: "Currently running campaigns",
      icon: TrendingUp,
      color: "text-purple-600",
    },
    {
      title: "Conversion Rate",
      value: `${stats.conversion_rate.toFixed(1)}%`,
      description: "Discount usage rate",
      icon: Users,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <IconComponent className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};