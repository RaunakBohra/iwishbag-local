import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Smartphone, 
  Key, 
  Copy, 
  Check,
  AlertTriangle,
  Loader2,
  Download,
  QrCode
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { mfaService, type MFASetupResponse } from '@/services/MFAService';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

interface MFASetupProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export const MFASetup: React.FC<MFASetupProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState<'intro' | 'setup' | 'verify' | 'backup'>('intro');
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<MFASetupResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const data = await mfaService.setupMFA();
      if (data) {
        setSetupData(data);
        setStep('setup');
      } else {
        throw new Error('Failed to initialize MFA setup');
      }
    } catch (error) {
      logger.error('MFA setup error:', error);
      toast({
        title: 'Setup Failed',
        description: 'Unable to start MFA setup. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const verified = await mfaService.verifySetup(verificationCode);
      if (verified) {
        setStep('backup');
        toast({
          title: 'MFA Enabled',
          description: 'Two-factor authentication has been successfully enabled',
        });
      } else {
        toast({
          title: 'Verification Failed',
          description: 'Invalid code. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Verification error:', error);
      toast({
        title: 'Error',
        description: 'Unable to verify code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, item: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => new Set(prev).add(item));
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(item);
          return newSet;
        });
      }, 2000);
      toast({
        title: 'Copied',
        description: `${item} copied to clipboard`,
      });
    } catch (error) {
      logger.error('Copy failed:', error);
    }
  };

  const handleDownloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;

    const content = `iwishBag Two-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleDateString()}

IMPORTANT: Keep these codes safe! Each code can only be used once.

${setupData.backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

Store these codes in a secure location. You'll need them if you lose access to your authenticator app.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'iwishbag-2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (step === 'intro') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Enable Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your admin account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-medium">Use an authenticator app</h3>
                <p className="text-sm text-muted-foreground">
                  Generate time-based codes with apps like Google Authenticator, Authy, or 1Password
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <Key className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-medium">Backup codes for emergencies</h3>
                <p className="text-sm text-muted-foreground">
                  Get recovery codes to use if you lose access to your authenticator app
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Two-factor authentication is required for all admin accounts to ensure platform security
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Button onClick={handleStartSetup} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Get Started
            </Button>
            {onSkip && (
              <Button variant="outline" onClick={onSkip}>
                Skip for Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'setup' && setupData) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Set Up Authenticator App</CardTitle>
          <CardDescription>
            Scan the QR code or enter the setup key manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="qr" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="qr">QR Code</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>
            
            <TabsContent value="qr" className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img 
                  src={setupData.qrCodeUrl} 
                  alt="MFA QR Code" 
                  className="w-64 h-64"
                />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Scan this QR code with your authenticator app
              </p>
            </TabsContent>
            
            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-2">
                <Label>Account Name</Label>
                <div className="flex gap-2">
                  <Input value="iwishBag" readOnly />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleCopy('iwishBag', 'Account name')}
                  >
                    {copiedItems.has('Account name') ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secret Key</Label>
                <div className="flex gap-2">
                  <Input 
                    value={setupData.secret} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleCopy(setupData.secret, 'Secret key')}
                  >
                    {copiedItems.has('Secret key') ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-4">
            <Label htmlFor="verification-code">
              Enter the 6-digit code from your authenticator app
            </Label>
            <div className="flex gap-2">
              <Input
                id="verification-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl font-mono tracking-widest"
              />
              <Button 
                onClick={handleVerifyCode} 
                disabled={loading || verificationCode.length !== 6}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'backup' && setupData) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-6 w-6 text-green-600" />
            Two-Factor Authentication Enabled!
          </CardTitle>
          <CardDescription>
            Save your backup codes before continuing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Save these backup codes in a secure location. You'll need them if you lose access to your authenticator app.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            {setupData.backupCodes.map((code, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <code className="font-mono text-sm">{code}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleCopy(code, `Backup code ${index + 1}`)}
                >
                  {copiedItems.has(`Backup code ${index + 1}`) ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <Button onClick={handleDownloadBackupCodes} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Codes
            </Button>
            <Button onClick={async () => {
              try {
                // Create MFA session after setup completion
                const { data, error } = await supabase.rpc('create_mfa_session_after_setup');
                if (error) throw error;
                
                if (data?.success && data?.sessionToken) {
                  sessionStorage.setItem('mfa_session', data.sessionToken);
                  logger.info('MFA session created:', data.sessionToken);
                }
              } catch (error) {
                logger.error('Failed to create MFA session:', error);
              }
              
              onComplete();
            }}>
              I've Saved My Codes
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Each backup code can only be used once</p>
            <p>• Store them securely offline</p>
            <p>• You can generate new codes from your security settings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};