import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Smartphone, 
  Key, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Download,
  Clock,
  Activity
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { mfaService } from '@/services/MFAService';
import { MFASetup } from '@/components/auth/MFASetup';
import { logger } from '@/utils/logger';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const SecuritySettings: React.FC = () => {
  const [showSetup, setShowSetup] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const queryClient = useQueryClient();

  // Fetch MFA status
  const { data: mfaStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['mfa-status'],
    queryFn: () => mfaService.getMFAStatus(),
  });

  // Fetch recent MFA activity
  const { data: activityLog } = useQuery({
    queryKey: ['mfa-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mfa_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!mfaStatus?.enabled,
  });

  // Disable MFA mutation
  const disableMFA = useMutation({
    mutationFn: () => mfaService.disableMFA(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] });
      toast({
        title: 'MFA Disabled',
        description: 'Two-factor authentication has been disabled',
      });
    },
    onError: (error) => {
      logger.error('Failed to disable MFA:', error);
      toast({
        title: 'Error',
        description: 'Failed to disable MFA. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Regenerate backup codes mutation
  const regenerateBackupCodes = useMutation({
    mutationFn: () => mfaService.regenerateBackupCodes(),
    onSuccess: (codes) => {
      if (codes) {
        setShowBackupCodes(true);
        toast({
          title: 'Backup Codes Generated',
          description: 'New backup codes have been generated',
        });
      }
    },
    onError: (error) => {
      logger.error('Failed to regenerate backup codes:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate new backup codes',
        variant: 'destructive',
      });
    },
  });

  const handleSetupComplete = () => {
    setShowSetup(false);
    queryClient.invalidateQueries({ queryKey: ['mfa-status'] });
    toast({
      title: 'Setup Complete',
      description: 'Two-factor authentication is now active',
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login_success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'login_failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'setup_completed':
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityDescription = (type: string) => {
    switch (type) {
      case 'login_success':
        return 'Successful login';
      case 'login_failed':
        return 'Failed login attempt';
      case 'setup_completed':
        return 'MFA enabled';
      case 'backup_code_used':
        return 'Backup code used';
      case 'disabled':
        return 'MFA disabled';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  if (showSetup) {
    return (
      <div className="container mx-auto py-6">
        <MFASetup 
          onComplete={handleSetupComplete}
          onSkip={() => setShowSetup(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account security and authentication settings
        </p>
      </div>

      {/* MFA Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </div>
            {statusLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : mfaStatus?.enabled ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">Disabled</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!mfaStatus?.enabled ? (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Two-factor authentication adds an extra layer of security by requiring a code from your phone in addition to your password.
                </AlertDescription>
              </Alert>
              <Button onClick={() => setShowSetup(true)}>
                <Smartphone className="mr-2 h-4 w-4" />
                Enable Two-Factor Authentication
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mfa-toggle">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require authentication code for login
                  </p>
                </div>
                <Switch
                  id="mfa-toggle"
                  checked={true}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      if (confirm('Are you sure you want to disable two-factor authentication?')) {
                        disableMFA.mutate();
                      }
                    }
                  }}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Backup Codes</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {mfaStatus.backupCodesRemaining} backup codes remaining
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => regenerateBackupCodes.mutate()}
                    disabled={regenerateBackupCodes.isPending}
                  >
                    {regenerateBackupCodes.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Generate New Backup Codes
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {mfaStatus?.enabled && activityLog && activityLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Security Activity
            </CardTitle>
            <CardDescription>
              Your recent authentication events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityLog.map((activity) => (
                <div 
                  key={activity.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {getActivityIcon(activity.activity_type)}
                    <div>
                      <p className="font-medium">
                        {getActivityDescription(activity.activity_type)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.ip_address || 'Unknown IP'}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground text-right">
                    <p>{format(new Date(activity.created_at), 'MMM d, yyyy')}</p>
                    <p>{format(new Date(activity.created_at), 'h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
          <CardDescription>
            Best practices for keeping your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Use a strong, unique password</p>
                <p className="text-sm text-muted-foreground">
                  Don't reuse passwords from other sites
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Keep your authenticator app updated</p>
                <p className="text-sm text-muted-foreground">
                  Regular updates ensure the best security
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Store backup codes securely</p>
                <p className="text-sm text-muted-foreground">
                  Keep them offline in a safe place
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Review activity regularly</p>
                <p className="text-sm text-muted-foreground">
                  Check for any suspicious login attempts
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings;