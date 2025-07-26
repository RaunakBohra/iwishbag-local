import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useD1Sync } from '@/hooks/useD1Sync';
import { RefreshCw, Play, Pause, Cloud, Clock } from 'lucide-react';
import { format } from 'date-fns';

export function D1SyncManager() {
  const { syncStatus, triggerSync, toggleAutoSync, isAdmin } = useD1Sync();

  if (!isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              D1 Edge Cache Sync
            </CardTitle>
            <CardDescription>
              Synchronize Supabase data to Cloudflare D1 for global edge performance
            </CardDescription>
          </div>
          <Badge variant={syncStatus.isRunning ? 'default' : 'secondary'}>
            {syncStatus.isRunning ? 'Auto-sync Active' : 'Manual Mode'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Last Sync
            </div>
            <p className="text-sm font-medium mt-1">
              {syncStatus.lastSync 
                ? format(new Date(syncStatus.lastSync), 'PPp')
                : 'Never synced'}
            </p>
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Sync Status</div>
            <p className="text-sm font-medium mt-1">
              {syncStatus.isSyncing ? (
                <span className="flex items-center gap-2 text-blue-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Syncing...
                </span>
              ) : (
                'Ready'
              )}
            </p>
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Auto-sync</div>
            <p className="text-sm font-medium mt-1">
              {syncStatus.isRunning ? 'Every 5 minutes' : 'Disabled'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={triggerSync}
            disabled={syncStatus.isSyncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
            {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          
          <Button
            onClick={toggleAutoSync}
            variant={syncStatus.isRunning ? 'destructive' : 'outline'}
            className="flex items-center gap-2"
          >
            {syncStatus.isRunning ? (
              <>
                <Pause className="h-4 w-4" />
                Stop Auto-sync
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Auto-sync
              </>
            )}
          </Button>
        </div>

        {/* Sync Information */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">What gets synced:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Country settings & currency exchange rates</li>
            <li>• Popular products (top 100)</li>
            <li>• HSN tax classifications</li>
            <li>• Shipping zones & payment gateways</li>
          </ul>
        </div>

        {/* Performance Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-900">
            <strong>Performance Impact:</strong> D1 provides {'<'}10ms global query latency, 
            reducing API response times by up to 95% for international users.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}