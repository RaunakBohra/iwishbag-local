import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, MessageSquare, Settings, DollarSign } from "lucide-react";

interface Activity {
  id: string;
  type: 'order' | 'message' | 'status_change' | 'payment';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
}

interface CustomerActivityTimelineProps {
  customerId: string;
}

export const CustomerActivityTimeline = ({ customerId }: CustomerActivityTimelineProps) => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['customer-activity', customerId],
    queryFn: async () => {
      const activities: Activity[] = [];

      // Fetch orders
      const { data: orders } = await supabase
        .from('quotes')
        .select('id, created_at, status, total_amount')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5);

      orders?.forEach(order => {
        activities.push({
          id: `order-${order.id}`,
          type: 'order',
          title: `Order #${order.id}`,
          description: `Order ${order.status} with total of $${order.total_amount}`,
          timestamp: order.created_at,
          icon: <Package className="h-4 w-4" />
        });
      });

      // Fetch messages
      const { data: messages } = await supabase
        .from('messages')
        .select('id, created_at, content')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5);

      messages?.forEach(message => {
        activities.push({
          id: `message-${message.id}`,
          type: 'message',
          title: 'New Message',
          description: message.content,
          timestamp: message.created_at,
          icon: <MessageSquare className="h-4 w-4" />
        });
      });

      // Fetch profile changes
      const { data: profileChanges } = await supabase
        .from('profile_changes')
        .select('id, created_at, field, old_value, new_value')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5);

      profileChanges?.forEach(change => {
        activities.push({
          id: `change-${change.id}`,
          type: 'status_change',
          title: 'Profile Updated',
          description: `${change.field} changed from ${change.old_value} to ${change.new_value}`,
          timestamp: change.created_at,
          icon: <Settings className="h-4 w-4" />
        });
      });

      // Sort all activities by timestamp
      return activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            {activities?.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4">
                <div className="mt-1">
                  {activity.icon}
                </div>
                <div>
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(activity.timestamp), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
            ))}
            {activities?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}; 