import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AdminQuoteDetails } from '@/hooks/admin/useAdminQuoteDetails';
import { Activity, User, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface QuoteActivityLogProps {
  quote: AdminQuoteDetails;
  onUpdate: (updates: Partial<AdminQuoteDetails>) => Promise<void>;
}

export const QuoteActivityLog: React.FC<QuoteActivityLogProps> = ({
  quote,
  onUpdate: _onUpdate
}) => {
  // Get activities from operational_data or create default
  const activities = quote.operational_data?.timeline || [
    {
      timestamp: quote.created_at,
      event: 'Quote Created',
      user: 'System',
      details: `Quote created with ${quote.items.length} items`
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-4">
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                </div>
                <div className="flex-1 -mt-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.event}
                  </p>
                  {activity.details && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {activity.details}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {activity.user || 'System'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};