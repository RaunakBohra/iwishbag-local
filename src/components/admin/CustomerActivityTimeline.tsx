import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Activity,
  ShoppingCart,
  FileText,
  DollarSign,
  Calendar,
  MapPin,
  User,
  Mail,
  Phone,
  Package,
  Truck,
} from 'lucide-react';
import { format } from 'date-fns';
import { StatusBadge } from '@/components/dashboard/StatusBadge';

interface CustomerActivityTimelineProps {
  customerId: string;
}

interface CustomerProfile {
  id: string;
  full_name: string | null;
  email: string;
  cod_enabled: boolean;
  internal_notes: string | null;
  created_at: string;
  delivery_addresses: Array<{
    id: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    country: string;
    postal_code: string;
    is_default: boolean;
  }>;
}

type ActivityItem = {
  id: string;
  type: 'quote' | 'order' | 'payment' | 'shipping' | 'note';
  title: string;
  description: string;
  date: Date;
  status?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
};

export const CustomerActivityTimeline = ({ customerId }: CustomerActivityTimelineProps) => {
  const { data: customer } = useQuery<CustomerProfile>({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      // Use the Edge Function to get the specific customer
      const { data, error } = await supabase.functions.invoke('get-users-with-emails');

      if (error) throw error;

      if (!data?.data) {
        throw new Error('No customer data found');
      }

      const customers = data.data as CustomerProfile[];
      const customer = customers.find((c) => c.id === customerId);

      if (!customer) {
        throw new Error('Customer not found');
      }

      return customer;
    },
  });

  const { data: quotes } = useQuery({
    queryKey: ['customer-quotes', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('user_id', customerId)
        .in('status', ['paid', 'ordered', 'shipped', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Combine and sort all activities
  const activities: ActivityItem[] = [];

  // Add customer registration
  if (customer) {
    activities.push({
      id: 'registration',
      type: 'note',
      title: 'Customer Registered',
      description: 'Customer joined the platform',
      date: new Date(customer.created_at),
      status: 'completed',
    });
  }

  // Add quotes
  quotes?.forEach((quote) => {
    activities.push({
      id: `quote-${quote.id}`,
      type: 'quote',
      title: `Quote Created`,
      description: `Quote for ${quote.product_name || 'Product'}`,
      date: new Date(quote.created_at),
      status: quote.status,
      amount: quote.final_total_usd,
      metadata: {
        quoteId: quote.id,
        productName: quote.product_name,
        status: quote.status,
      },
    });
  });

  // Add orders (paid quotes)
  orders?.forEach((order) => {
    activities.push({
      id: `order-${order.id}`,
      type: 'order',
      title: `Order Placed`,
      description: `Order for ${order.product_name || 'Product'}`,
      date: new Date(order.updated_at || order.created_at),
      status: order.status,
      amount: order.final_total_usd,
      metadata: {
        orderId: order.id,
        productName: order.product_name,
        status: order.status,
      },
    });
  });

  // Sort activities by date (newest first)
  activities.sort((a, b) => b.date.getTime() - a.date.getTime());

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'quote':
        return <FileText className="h-4 w-4" />;
      case 'order':
        return <ShoppingCart className="h-4 w-4" />;
      case 'payment':
        return <DollarSign className="h-4 w-4" />;
      case 'shipping':
        return <Truck className="h-4 w-4" />;
      case 'note':
        return <User className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const category = ['paid', 'ordered', 'shipped', 'completed', 'cancelled'].includes(status)
      ? 'order'
      : 'quote';
    return <StatusBadge status={status} category={category} />;
  };

  if (!customer) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading customer information...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customer Info Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">{customer.full_name || 'Unnamed User'}</div>
                <div className="text-sm text-muted-foreground">{customer.id}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {customer.delivery_addresses?.[0]
                  ? `${customer.delivery_addresses[0].city}, ${customer.delivery_addresses[0].destination_country}`
                  : 'No address'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Joined {format(new Date(customer.created_at), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4" />
              <p>No activity found for this customer</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{activity.title}</h4>
                      {getStatusBadge(activity.status)}
                    </div>

                    <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>

                    {activity.amount && (
                      <div className="flex items-center gap-2 mt-2">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">${activity.amount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(activity.date, 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>

                  <div className="flex-shrink-0">{getStatusBadge(activity.status)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            <Button variant="outline" size="sm">
              <Phone className="h-4 w-4 mr-2" />
              Call Customer
            </Button>
            <Button variant="outline" size="sm">
              <Package className="h-4 w-4 mr-2" />
              Create Quote
            </Button>
            <Button variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
