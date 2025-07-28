import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Truck,
  DollarSign,
  FileText,
  ShoppingCart,
  Calculator,
  User,
  Calendar,
  ArrowRight,
  Activity,
} from 'lucide-react';

interface StatusHistoryProps {
  quoteId: string;
}

interface StatusTransition {
  id: string;
  quote_id: string;
  from_status: string;
  to_status: string;
  trigger: string;
  metadata: Record<string, any>;
  changed_by: string | null;
  changed_at: string;
}

const getStatusIcon = (iconName: string) => {
  const iconMap = {
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Package,
    Truck,
    DollarSign,
    FileText,
    ShoppingCart,
    Calculator,
  };
  return iconMap[iconName as keyof typeof iconMap] || Clock;
};

const getTriggerLabel = (trigger: string) => {
  const triggerLabels = {
    manual: 'Manual',
    payment_received: 'Payment Received',
    quote_sent: 'Quote Sent',
    order_shipped: 'Order Shipped',
    quote_expired: 'Quote Expired',
    auto_calculation: 'Auto Calculation',
  };
  return triggerLabels[trigger as keyof typeof triggerLabels] || trigger;
};

const getTriggerColor = (trigger: string) => {
  const triggerColors = {
    manual: 'bg-blue-100 text-blue-800',
    payment_received: 'bg-green-100 text-green-800',
    quote_sent: 'bg-purple-100 text-purple-800',
    order_shipped: 'bg-orange-100 text-orange-800',
    quote_expired: 'bg-red-100 text-red-800',
    auto_calculation: 'bg-gray-100 text-gray-800',
  };
  return triggerColors[trigger as keyof typeof triggerColors] || 'bg-gray-100 text-gray-800';
};

export const StatusHistory: React.FC<StatusHistoryProps> = ({ quoteId }) => {
  const { getStatusConfig } = useStatusManagement();

  // Fetch status transition history
  const { data: transitions, isLoading, error } = useQuery({
    queryKey: ['status-transitions', quoteId],
    queryFn: async (): Promise<StatusTransition[]> => {
      const { data, error } = await supabase
        .from('status_transitions')
        .select('*')
        .eq('quote_id', quoteId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(quoteId),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            Status History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            Status History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Failed to load status history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" />
          Status History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!transitions || transitions.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-6 w-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No status changes yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transitions.map((transition, index) => {
              const fromConfig = getStatusConfig(transition.from_status, 'quote');
              const toConfig = getStatusConfig(transition.to_status, 'quote');
              
              const FromIcon = fromConfig ? getStatusIcon(fromConfig.icon) : Clock;
              const ToIcon = toConfig ? getStatusIcon(toConfig.icon) : Clock;

              return (
                <div key={transition.id} className="relative">
                  {/* Timeline line */}
                  {index < transitions.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200"></div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    {/* Status transition indicator */}
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1">
                      <div className="p-1 bg-gray-50 rounded">
                        <FromIcon className="h-3 w-3 text-gray-600" />
                      </div>
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                      <div className="p-1 bg-gray-50 rounded">
                        <ToIcon className="h-3 w-3 text-gray-600" />
                      </div>
                    </div>
                    
                    {/* Transition details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={fromConfig?.color || 'outline'} className="text-xs">
                          {fromConfig?.label || transition.from_status}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <Badge variant={toConfig?.color || 'outline'} className="text-xs">
                          {toConfig?.label || transition.to_status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Badge variant="outline" className={`text-xs ${getTriggerColor(transition.trigger)}`}>
                          {getTriggerLabel(transition.trigger)}
                        </Badge>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(transition.changed_at).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Admin notes or metadata */}
                      {transition.metadata?.admin_notes && (
                        <div className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1 mt-1">
                          <span className="font-medium">Note:</span> {transition.metadata.admin_notes}
                        </div>
                      )}

                      {transition.metadata?.reason && (
                        <div className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1 mt-1">
                          <span className="font-medium">Reason:</span> {transition.metadata.reason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};