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
        {}
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