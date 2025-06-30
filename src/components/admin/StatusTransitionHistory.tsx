import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, User, AlertCircle, CheckCircle, XCircle, FileText, DollarSign, Truck, Package } from 'lucide-react';
import { useStatusManagement } from '@/hooks/useStatusManagement';

interface StatusTransition {
  id: string;
  quote_id: string;
  from_status: string;
  to_status: string;
  trigger: string;
  metadata: Record<string, any>;
  changed_by: string | null;
  changed_at: string;
  user_email?: string;
}

interface StatusTransitionHistoryProps {
  quoteId: string;
}

const getTriggerIcon = (trigger: string) => {
  switch (trigger) {
    case 'payment_received':
      return <DollarSign className="h-4 w-4" />;
    case 'quote_sent':
      return <FileText className="h-4 w-4" />;
    case 'order_shipped':
      return <Truck className="h-4 w-4" />;
    case 'quote_expired':
      return <AlertCircle className="h-4 w-4" />;
    case 'auto_calculation':
      return <Package className="h-4 w-4" />;
    case 'manual':
      return <User className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getTriggerLabel = (trigger: string) => {
  switch (trigger) {
    case 'payment_received':
      return 'Payment Received';
    case 'quote_sent':
      return 'Quote Sent';
    case 'order_shipped':
      return 'Order Shipped';
    case 'quote_expired':
      return 'Quote Expired';
    case 'auto_calculation':
      return 'Auto Calculation';
    case 'manual':
      return 'Manual Change';
    default:
      return trigger;
  }
};

const getTriggerColor = (trigger: string) => {
  switch (trigger) {
    case 'payment_received':
      return 'bg-green-100 text-green-800';
    case 'quote_sent':
      return 'bg-blue-100 text-blue-800';
    case 'order_shipped':
      return 'bg-purple-100 text-purple-800';
    case 'quote_expired':
      return 'bg-red-100 text-red-800';
    case 'auto_calculation':
      return 'bg-orange-100 text-orange-800';
    case 'manual':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const StatusTransitionHistory: React.FC<StatusTransitionHistoryProps> = ({ quoteId }) => {
  const { getStatusConfig } = useStatusManagement();

  const { data: transitions, isLoading, error } = useQuery({
    queryKey: ['status-transitions', quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_transitions')
        .select(`
          *,
          profiles:changed_by(email)
        `)
        .eq('quote_id', quoteId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      
      return data?.map(transition => ({
        ...transition,
        user_email: transition.profiles?.email
      })) as StatusTransition[];
    },
    enabled: !!quoteId
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
          <CardDescription>Loading status transition history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
          <CardDescription>Error loading status history</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Failed to load status transition history: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!transitions || transitions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
          <CardDescription>No status changes recorded yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Status changes will appear here once they occur.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status History</CardTitle>
        <CardDescription>
          Timeline of status changes for this quote
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transitions.map((transition, index) => {
            const fromStatusConfig = getStatusConfig(transition.from_status, 'quote');
            const toStatusConfig = getStatusConfig(transition.to_status, 'quote');
            const isLatest = index === 0;

            return (
              <div key={transition.id} className="flex items-start gap-4">
                {/* Timeline dot */}
                <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${
                  isLatest ? 'bg-blue-500' : 'bg-gray-300'
                }`} />
                
                {/* Content */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {getTriggerIcon(transition.trigger)}
                      <span className="font-medium">
                        {fromStatusConfig?.label || transition.from_status} → {toStatusConfig?.label || transition.to_status}
                      </span>
                    </div>
                    <Badge className={`text-xs ${getTriggerColor(transition.trigger)}`}>
                      {getTriggerLabel(transition.trigger)}
                    </Badge>
                    {isLatest && (
                      <Badge variant="outline" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(transition.changed_at).toLocaleString()}
                      </span>
                    </div>
                    
                    {transition.user_email && (
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>Changed by: {transition.user_email}</span>
                      </div>
                    )}
                    
                    {transition.metadata && Object.keys(transition.metadata).length > 0 && (
                      <div className="text-xs bg-gray-50 p-2 rounded">
                        <strong>Metadata:</strong> {JSON.stringify(transition.metadata, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}; 