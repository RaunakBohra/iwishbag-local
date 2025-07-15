import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  Clock,
  Database,
  Play,
  Settings,
  Shield,
  Trash2,
  Users,
  BarChart3,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { guestCheckoutService } from '@/services/GuestCheckoutService';
import { supabase } from '@/integrations/supabase/client';

interface RetentionSettings {
  expired_retention_days: number;
  failed_retention_days: number;
  completed_retention_days: number;
  anonymized_retention_days: number;
  auto_cleanup_enabled: boolean;
  anonymization_enabled: boolean;
  cleanup_batch_size: number;
  cleanup_notifications: boolean;
  cleanup_log_retention_days: number;
}

interface CleanupStats {
  expiredDeleted: number;
  failedDeleted: number;
  completedAnonymized: number;
  anonymizedDeleted: number;
  totalProcessed: number;
  durationMs: number;
}

interface SessionStats {
  [key: string]: number;
  total: number;
  completed?: number;
  active?: number;
  expired?: number;
  cancelled?: number;
}

interface CleanupLog {
  id: string;
  created_at: string;
  triggered_by: string;
  expired_deleted: number;
  failed_deleted: number;
  completed_anonymized: number;
  anonymized_deleted: number;
  total_processed: number;
  cleanup_duration_ms: number;
}

const GuestSessionManagement: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<RetentionSettings>({
    expired_retention_days: 7,
    failed_retention_days: 30,
    completed_retention_days: 90,
    anonymized_retention_days: 365,
    auto_cleanup_enabled: true,
    anonymization_enabled: true,
    cleanup_batch_size: 1000,
    cleanup_notifications: true,
    cleanup_log_retention_days: 30
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);
  const [cleanupHistory, setCleanupHistory] = useState<CleanupLog[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);

  // Load current settings
  useEffect(() => {
    loadSettings();
    loadCleanupHistory();
    loadSessionStats();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'guest_session_expired_retention_days',
          'guest_session_failed_retention_days',
          'guest_session_completed_retention_days',
          'guest_session_anonymized_retention_days',
          'guest_session_auto_cleanup_enabled',
          'guest_session_anonymization_enabled',
          'guest_session_cleanup_batch_size',
          'guest_session_cleanup_notifications',
          'guest_session_cleanup_log_retention_days'
        ]);

      if (error) throw error;

      const settingsMap = data?.reduce<Partial<RetentionSettings>>((acc, setting) => {
        const key = setting.setting_key.replace('guest_session_', '') as keyof RetentionSettings;
        acc[key] = 
          setting.setting_key.includes('enabled') || setting.setting_key.includes('notifications')
            ? setting.setting_value === 'true'
            : parseInt(setting.setting_value);
        return acc;
      }, {});

      setSettings(prev => ({ ...prev, ...settingsMap }));
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load retention settings',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: `guest_session_${key}`,
        setting_value: value.toString(),
        description: getSettingDescription(key)
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(update, { onConflict: 'setting_key' });
        
        if (error) throw error;
      }

      toast({
        title: 'Settings Saved',
        description: 'Guest session retention settings have been updated',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save retention settings',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const runCleanup = async () => {
    setIsRunningCleanup(true);
    try {
      const result = await guestCheckoutService.enhancedCleanup('admin_manual');
      
      if (result.success && result.stats) {
        toast({
          title: 'Cleanup Completed',
          description: `Processed ${result.stats.totalProcessed} sessions in ${result.stats.durationMs}ms`,
        });
        
        // Reload history and stats
        loadCleanupHistory();
        loadSessionStats();
      } else {
        throw new Error(result.error || 'Cleanup failed');
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
      toast({
        title: 'Cleanup Failed',
        description: 'Failed to run session cleanup',
        variant: 'destructive'
      });
    } finally {
      setIsRunningCleanup(false);
    }
  };

  const loadCleanupHistory = async () => {
    try {
      const result = await guestCheckoutService.getCleanupHistory(20);
      if (result.success && result.logs) {
        setCleanupHistory(result.logs);
      }
    } catch (error) {
      console.error('Error loading cleanup history:', error);
    }
  };

  const loadSessionStats = async () => {
    try {
      const { data, error } = await supabase
        .from('guest_checkout_sessions')
        .select('status, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (error) throw error;

      const stats = data?.reduce<SessionStats>((acc, session) => {
        acc[session.status] = (acc[session.status] || 0) + 1;
        acc.total = (acc.total || 0) + 1;
        return acc;
      }, { total: 0 });

      setSessionStats(stats);
    } catch (error) {
      console.error('Error loading session stats:', error);
    }
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      'expired_retention_days': 'Days to keep expired/cancelled guest sessions before deletion',
      'failed_retention_days': 'Days to keep failed payment guest sessions before deletion',
      'completed_retention_days': 'Days to keep completed guest sessions before anonymization',
      'anonymized_retention_days': 'Days to keep anonymized guest session data before deletion',
      'auto_cleanup_enabled': 'Enable automatic cleanup of old guest sessions',
      'anonymization_enabled': 'Enable anonymization of old completed sessions (removes PII)',
      'cleanup_batch_size': 'Number of sessions to process in each cleanup batch',
      'cleanup_notifications': 'Send notifications when cleanup operations complete',
      'cleanup_log_retention_days': 'Days to keep cleanup operation logs'
    };
    return descriptions[key] || '';
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Database className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p>Loading session management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Guest Session Management</h2>
          <p className="text-muted-foreground">
            Configure retention policies and cleanup guest checkout sessions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runCleanup} disabled={isRunningCleanup} variant="outline">
            <Play className="h-4 w-4 mr-2" />
            {isRunningCleanup ? 'Running...' : 'Run Cleanup'}
          </Button>
          <Button onClick={saveSettings} disabled={isSaving}>
            <Settings className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Session Statistics */}
      {sessionStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Session Statistics (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{sessionStats.total || 0}</div>
                <div className="text-sm text-muted-foreground">Total Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{sessionStats.completed || 0}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{sessionStats.active || 0}</div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{sessionStats.expired || 0}</div>
                <div className="text-sm text-muted-foreground">Expired</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{sessionStats.cancelled || 0}</div>
                <div className="text-sm text-muted-foreground">Cancelled</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retention Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Retention Policies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Retention Periods */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Retention Periods (Days)</Label>
              
              <div className="space-y-2">
                <Label htmlFor="expired_retention">Expired/Cancelled Sessions</Label>
                <Input
                  id="expired_retention"
                  type="number"
                  min="1"
                  value={settings.expired_retention_days}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings(prev => ({ 
                    ...prev, 
                    expired_retention_days: parseInt(e.target.value) || 7 
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Delete sessions that expired or were cancelled
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="failed_retention">Failed Payment Sessions</Label>
                <Input
                  id="failed_retention"
                  type="number"
                  min="1"
                  value={settings.failed_retention_days}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings(prev => ({ 
                    ...prev, 
                    failed_retention_days: parseInt(e.target.value) || 30 
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Delete sessions where payment attempts failed
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="completed_retention">Completed Session Anonymization</Label>
                <Input
                  id="completed_retention"
                  type="number"
                  min="1"
                  value={settings.completed_retention_days}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings(prev => ({ 
                    ...prev, 
                    completed_retention_days: parseInt(e.target.value) || 90 
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Remove PII from successful sessions (keeps analytics)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="anonymized_retention">Final Deletion</Label>
                <Input
                  id="anonymized_retention"
                  type="number"
                  min="1"
                  value={settings.anonymized_retention_days}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings(prev => ({ 
                    ...prev, 
                    anonymized_retention_days: parseInt(e.target.value) || 365 
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Delete anonymized sessions completely
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Settings Toggles */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Cleanup Settings</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto_cleanup">Auto Cleanup</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically run cleanup operations
                  </p>
                </div>
                <Switch
                  id="auto_cleanup"
                  checked={settings.auto_cleanup_enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ 
                    ...prev, 
                    auto_cleanup_enabled: checked 
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="anonymization">Enable Anonymization</Label>
                  <p className="text-xs text-muted-foreground">
                    Remove PII while keeping analytics data
                  </p>
                </div>
                <Switch
                  id="anonymization"
                  checked={settings.anonymization_enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ 
                    ...prev, 
                    anonymization_enabled: checked 
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch_size">Cleanup Batch Size</Label>
                <Input
                  id="batch_size"
                  type="number"
                  min="100"
                  max="10000"
                  value={settings.cleanup_batch_size}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings(prev => ({ 
                    ...prev, 
                    cleanup_batch_size: parseInt(e.target.value) || 1000 
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="log_retention">Log Retention (Days)</Label>
                <Input
                  id="log_retention"
                  type="number"
                  min="7"
                  value={settings.cleanup_log_retention_days}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings(prev => ({ 
                    ...prev, 
                    cleanup_log_retention_days: parseInt(e.target.value) || 30 
                  }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cleanup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Cleanup Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cleanupHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Triggered By</TableHead>
                  <TableHead>Expired</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Anonymized</TableHead>
                  <TableHead>Deleted</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cleanupHistory.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.triggered_by}</Badge>
                    </TableCell>
                    <TableCell>{log.expired_deleted}</TableCell>
                    <TableCell>{log.failed_deleted}</TableCell>
                    <TableCell>{log.completed_anonymized}</TableCell>
                    <TableCell>{log.anonymized_deleted}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{log.total_processed}</Badge>
                    </TableCell>
                    <TableCell>{formatDuration(log.cleanup_duration_ms)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No cleanup operations recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GuestSessionManagement;