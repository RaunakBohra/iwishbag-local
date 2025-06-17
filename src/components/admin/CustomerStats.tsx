import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Package, DollarSign, Calendar, Tag } from "lucide-react";

interface CustomerStatsProps {
  stats: {
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string | null;
    averageOrderValue: number;
    tags: string[];
  };
}

const tagColors: { [key: string]: string } = {
  'VIP': 'bg-purple-100 text-purple-800',
  'Regular': 'bg-blue-100 text-blue-800',
  'High Value': 'bg-green-100 text-green-800',
  'Inactive': 'bg-gray-100 text-gray-800'
};

export const CustomerStats = ({ stats }: CustomerStatsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>Total Orders</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Total Spent</span>
            </div>
            <p className="text-2xl font-bold">${stats.totalSpent.toFixed(2)}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Average Order Value</span>
            </div>
            <p className="text-2xl font-bold">${stats.averageOrderValue.toFixed(2)}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Last Order</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.lastOrderDate 
                ? format(new Date(stats.lastOrderDate), 'MMM dd, yyyy')
                : 'Never'}
            </p>
          </div>
        </div>

        {stats.tags.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Tag className="h-4 w-4" />
              <span>Tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.tags.map((tag) => (
                <Badge 
                  key={tag}
                  variant="secondary"
                  className={tagColors[tag] || 'bg-gray-100 text-gray-800'}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 