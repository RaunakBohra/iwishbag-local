import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Smartphone, 
  Key, 
  Loader2,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { mfaService } from '@/services/MFAService';
import { logger } from '@/utils/logger';

interface MFAVerificationProps {
  onSuccess: (sessionToken: string) => void;
  onCancel: () => void;
  userEmail?: string;
}

export const MFAVerification: React.FC<MFAVerificationProps> = ({ 
  onSuccess, 
  onCancel,
  userEmail 
}) => {
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus on code input when component mounts
    codeInputRef.current?.focus();
  }, []);

  const handleVerifyTOTP = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await mfaService.verifyLogin(verificationCode);
      
      if (result.verified && result.sessionToken) {
        toast({
          title: 'Verification Successful',
          description: 'You have been logged in securely',
        });
        onSuccess(result.sessionToken);
      } else {
        setAttempts(prev => prev + 1);
        setError(result.error || 'Invalid code. Please try again.');
        setVerificationCode('');
        
        if (attempts >= 2) {
          setError('Invalid code. Please check your authenticator app or use a backup code.');
        }
      }
    } catch (error) {
      logger.error('MFA verification error:', error);
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBackupCode = async () => {
    if (backupCode.length < 8) {
      setError('Please enter a valid backup code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await mfaService.verifyLogin(backupCode, true);
      
      if (result.verified && result.sessionToken) {
        toast({
          title: 'Verification Successful',
          description: 'You have been logged in using a backup code',
        });
        onSuccess(result.sessionToken);
      } else {
        setError(result.error || 'Invalid backup code. Please try again.');
        setBackupCode('');
      }
    } catch (error) {
      logger.error('Backup code verification error:', error);
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    setVerificationCode(cleaned);
    setError(null);
    
    // Auto-submit when 6 digits are entered
    if (cleaned.length === 6) {
      handleVerifyTOTP();
    }
  };

  const handleBackupCodeChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setBackupCode(cleaned);
    setError(null);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          {userEmail ? `Verify your identity for ${userEmail}` : 'Enter your authentication code'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="authenticator" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="authenticator">
              <Smartphone className="h-4 w-4 mr-2" />
              Authenticator
            </TabsTrigger>
            <TabsTrigger value="backup">
              <Key className="h-4 w-4 mr-2" />
              Backup Code
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="authenticator" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totp-code">
                Enter the 6-digit code from your authenticator app
              </Label>
              <Input
                ref={codeInputRef}
                id="totp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && verificationCode.length === 6) {
                    handleVerifyTOTP();
                  }
                }}
                className="text-center text-2xl font-mono tracking-widest"
                disabled={loading}
              />
            </div>
            
            <Button 
              onClick={handleVerifyTOTP} 
              disabled={loading || verificationCode.length !== 6}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Code
            </Button>
          </TabsContent>
          
          <TabsContent value="backup" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backup-code">
                Enter one of your backup codes
              </Label>
              <Input
                id="backup-code"
                type="text"
                placeholder="ABCD1234"
                value={backupCode}
                onChange={(e) => handleBackupCodeChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && backupCode.length >= 8) {
                    handleVerifyBackupCode();
                  }
                }}
                className="font-mono uppercase"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Backup codes are 8 characters long and can only be used once
              </p>
            </div>
            
            <Button 
              onClick={handleVerifyBackupCode} 
              disabled={loading || backupCode.length < 8}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Backup Code
            </Button>
          </TabsContent>
        </Tabs>

        <div className="pt-4 border-t">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full"
            disabled={loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
        </div>

        <div className="text-sm text-center text-muted-foreground">
          <p>Having trouble?</p>
          <Button variant="link" className="p-0 h-auto">
            Contact your administrator
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};