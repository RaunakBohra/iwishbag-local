import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Clock, Edit, Plus, Trash2, BarChart3 } from 'lucide-react';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';
import type { UnifiedQuote } from '@/types/unified-quote';

interface HSNAdminHistoryProps {
  quote: UnifiedQuote;
  className?: string;
}

export function HSNAdminHistory({ quote, className = '' }: HSNAdminHistoryProps) {
  const history = unifiedDataEngine.getHSNAdminOverrideHistory(quote);

  // Debug logging to track data updates
  React.useEffect(() => {
    console.log('🔍 [HSN-HISTORY] Component updated with quote data:', {
      quoteId: quote.id,
      adminOverrideCount: quote.operational_data?.admin_override_count || 0,
      overridesLength: history.overrides.length,
      lastModification: quote.operational_data?.last_hsn_modification,
      updatedAt: quote.updated_at,
    });
  }, [quote.operational_data?.admin_override_count, quote.updated_at, history.overrides.length]);

  const getActionIcon = (modificationType: string) => {
    switch (modificationType) {
      case 'assign':
        return <Plus className="h-3 w-3 text-green-600" />;
      case 'change':
        return <Edit className="h-3 w-3 text-blue-600" />;
      case 'clear':
        return <Trash2 className="h-3 w-3 text-red-600" />;
      default:
        return <Edit className="h-3 w-3 text-gray-600" />;
    }
  };

  const getActionColor = (modificationType: string) => {
    switch (modificationType) {
      case 'assign':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'change':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'clear':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (history.summary.total_modifications === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            HSN Admin Activity
          </CardTitle>
          <CardDescription>Track HSN classification changes by admins</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No admin HSN modifications yet</p>
            <p className="text-xs mt-1">All HSN codes are from auto-classification or migration</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          HSN Admin Activity
          <Badge variant="secondary" className="ml-auto">
            {history.summary.total_modifications}
          </Badge>
        </CardTitle>
        <CardDescription>Track HSN classification changes by admins</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 bg-green-50 rounded-md border border-green-200">
            <div className="text-lg font-semibold text-green-700">
              {history.summary.assignments}
            </div>
            <div className="text-xs text-green-600">Assigned</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-md border border-blue-200">
            <div className="text-lg font-semibold text-blue-700">{history.summary.changes}</div>
            <div className="text-xs text-blue-600">Changed</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded-md border border-red-200">
            <div className="text-lg font-semibold text-red-700">{history.summary.clears}</div>
            <div className="text-xs text-red-600">Cleared</div>
          </div>
        </div>

        <Separator />

        {/* Recent Activity */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Recent Activity
          </h4>
          <ScrollArea className="h-40">
            <div className="space-y-2">
              {history.recent_activity.map((activity, index) => (
                <div
                  key={`${activity.timestamp}-${index}`}
                  className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <div
                    className={`p-1.5 rounded-full ${getActionColor(activity.modification_type)}`}
                  >
                    {getActionIcon(activity.modification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground leading-tight">
                      {activity.action_description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs py-0 px-1.5 h-4">
                        {activity.modification_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {activity.time_ago}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Metadata */}
        {history.summary.last_activity && (
          <>
            <Separator />
            <div className="text-xs text-muted-foreground">
              Last admin activity: {new Date(history.summary.last_activity).toLocaleString()}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default HSNAdminHistory;
