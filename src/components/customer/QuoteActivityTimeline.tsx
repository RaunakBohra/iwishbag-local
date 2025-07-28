import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  Truck,
  DollarSign,
  FileText,
  ShoppingCart,
  Send,
  MessageSquare,
  User,
  Calendar,
  Activity,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'status_change' | 'payment' | 'system' | 'user' | 'admin';
  action: string;
  timestamp: string;
  user?: string;
  details?: any;
}

interface QuoteActivityTimelineProps {
  activities?: ActivityItem[];
  quote: {
    created_at: string;
    updated_at: string;
    status: string;
    items?: any[];
  };
}

export const QuoteActivityTimeline: React.FC<QuoteActivityTimelineProps> = ({
  activities = [],
  quote,
}) => {
  // Generate default activities if none provided
  const defaultActivities: ActivityItem[] = activities.length > 0 ? activities : [
    {
      id: '1',
      type: 'system',
      action: `Quote created with ${quote.items?.length || 0} items`,
      timestamp: quote.created_at,
      user: 'System',
    },
    {
      id: '2',
      type: 'status_change',
      action: `Status changed to ${quote.status}`,
      timestamp: quote.updated_at,
      user: 'System',
    },
  ];

  const getActivityIcon = (type: string, action: string) => {
    if (action.toLowerCase().includes('created')) return FileText;
    if (action.toLowerCase().includes('sent')) return Send;
    if (action.toLowerCase().includes('approved')) return CheckCircle;
    if (action.toLowerCase().includes('rejected')) return XCircle;
    if (action.toLowerCase().includes('paid') || action.toLowerCase().includes('payment')) return DollarSign;
    if (action.toLowerCase().includes('ordered')) return ShoppingCart;
    if (action.toLowerCase().includes('shipped')) return Truck;
    if (action.toLowerCase().includes('delivered')) return Package;
    if (type === 'user' || type === 'admin') return User;
    return Activity;
  };

  const getActivityColor = (type: string, action: string) => {
    if (action.toLowerCase().includes('rejected')) return 'text-red-600 bg-red-100';
    if (action.toLowerCase().includes('approved')) return 'text-green-600 bg-green-100';
    if (action.toLowerCase().includes('paid')) return 'text-purple-600 bg-purple-100';
    if (action.toLowerCase().includes('shipped')) return 'text-blue-600 bg-blue-100';
    if (action.toLowerCase().includes('delivered')) return 'text-emerald-600 bg-emerald-100';
    return 'text-gray-600 bg-gray-100';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'h:mm a');
    } else if (diffInHours < 168) { // 7 days
      return format(date, 'EEE, h:mm a');
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Activity items */}
          <div className="space-y-6">
            {defaultActivities.map((activity, index) => {
              const Icon = getActivityIcon(activity.type, activity.action);
              const colorClasses = getActivityColor(activity.type, activity.action);

              return (
                <div key={activity.id} className="relative flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${colorClasses}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-900">{activity.action}</p>
                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>{formatTimestamp(activity.timestamp)}</span>
                          {activity.user && (
                            <>
                              <span>•</span>
                              <span>{activity.user}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {activity.type === 'payment' && (
                        <Badge variant="success" className="shrink-0">
                          Paid
                        </Badge>
                      )}
                    </div>

                    {/* Additional details */}
                    {activity.details && (
                      <div className="mt-2 rounded-lg bg-gray-50 p-3">
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                          {JSON.stringify(activity.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};