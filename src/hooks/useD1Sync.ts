import { useState, useEffect } from 'react';
import { d1SyncService } from '@/services/D1SyncService';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { toast } from '@/components/ui/use-toast';

export function useD1Sync() {
  const { isAdmin } = useAdminCheck();
  const [syncStatus, setSyncStatus] = useState({
    isRunning: false,
    isSyncing: false,
    lastSync: null as string | null
  });

  useEffect(() => {
    // Update sync status
    const status = d1SyncService.getSyncStatus();
    setSyncStatus(status);

    // Start auto-sync if user is admin
    if (isAdmin) {
      d1SyncService.startAutoSync(5); // 5 minute interval
    }

    return () => {
      // Don't stop sync on unmount - let it run in background
    };
  }, [isAdmin]);

  const triggerSync = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));
      
      const result = await d1SyncService.syncAll();
      
      localStorage.setItem('d1_last_sync', new Date().toISOString());
      
      toast({
        title: 'D1 Sync Complete',
        description: `Successfully synced ${result.successful} data types${result.failed ? `, ${result.failed} failed` : ''}`,
      });

      setSyncStatus({
        isRunning: d1SyncService.getSyncStatus().isRunning,
        isSyncing: false,
        lastSync: new Date().toISOString()
      });
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync data to D1. Check console for details.',
        variant: 'destructive'
      });
      
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const toggleAutoSync = () => {
    if (syncStatus.isRunning) {
      d1SyncService.stopAutoSync();
      toast({
        title: 'Auto-sync Stopped',
        description: 'D1 auto-sync has been disabled',
      });
    } else {
      d1SyncService.startAutoSync(5);
      toast({
        title: 'Auto-sync Started',
        description: 'D1 will sync every 5 minutes',
      });
    }
    
    setSyncStatus(d1SyncService.getSyncStatus());
  };

  return {
    syncStatus,
    triggerSync,
    toggleAutoSync,
    isAdmin
  };
}