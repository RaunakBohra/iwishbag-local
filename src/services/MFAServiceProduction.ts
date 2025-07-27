import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Production MFA Service that uses Edge Functions
export class MFAServiceProduction {
  private static instance: MFAServiceProduction;
  private readonly isProduction = import.meta.env.PROD;

  static getInstance(): MFAServiceProduction {
    if (!MFAServiceProduction.instance) {
      MFAServiceProduction.instance = new MFAServiceProduction();
    }
    return MFAServiceProduction.instance;
  }

  /**
   * Generate TOTP secret using Edge Function in production
   */
  async generateSecret(email: string): Promise<{ secret: string; uri: string } | null> {
    try {
      if (this.isProduction) {
        // Call Edge Function
        const { data, error } = await supabase.functions.invoke('verify-totp', {
          body: { action: 'generate-secret' }
        });

        if (error) throw error;
        return data;
      } else {
        // Local development fallback
        const secret = authenticator.generateSecret();
        const uri = authenticator.keyuri(email, 'iwishBag', secret);
        return { secret, uri };
      }
    } catch (error) {
      logger.error('Failed to generate TOTP secret:', error);
      return null;
    }
  }

  /**
   * Verify TOTP code using Edge Function in production
   */
  async verifyCode(
    code: string, 
    secret: string, 
    isBackup = false
  ): Promise<{ verified: boolean; sessionToken?: string; error?: string }> {
    try {
      if (this.isProduction) {
        // Call Edge Function
        const { data, error } = await supabase.functions.invoke('verify-totp', {
          body: { 
            action: 'verify-code',
            code,
            secret,
            isBackup
          }
        });

        if (error) throw error;
        return data;
      } else {
        // Local development fallback - accept any 6-digit code
        if (code.length === 6 && /^\d+$/.test(code)) {
          return { 
            verified: true, 
            sessionToken: crypto.randomUUID() 
          };
        }
        return { verified: false, error: 'Invalid code' };
      }
    } catch (error) {
      logger.error('TOTP verification error:', error);
      return { 
        verified: false, 
        error: 'Verification failed' 
      };
    }
  }

  /**
   * Setup MFA with proper TOTP generation
   */
  async setupMFA(): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('User not authenticated');

      // Generate secret using Edge Function or local method
      const secretData = await this.generateSecret(user.email);
      if (!secretData) throw new Error('Failed to generate secret');

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secretData.uri, {
        width: 256,
        margin: 2,
      });

      // Call setup_mfa RPC to save to database
      const { data, error } = await supabase.rpc('setup_mfa');
      if (error) throw error;

      const setupData = data[0];
      
      // Update the secret in database with the one we generated
      await supabase
        .from('mfa_configurations')
        .update({ totp_secret: secretData.secret })
        .eq('user_id', user.id);

      return {
        secret: secretData.secret,
        qrCodeUrl,
        backupCodes: setupData.backup_codes,
      };
    } catch (error) {
      logger.error('MFA setup error:', error);
      throw error;
    }
  }

  /**
   * Verify TOTP during setup
   */
  async verifySetup(code: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Get user's secret
      const { data: config } = await supabase
        .from('mfa_configurations')
        .select('totp_secret')
        .eq('user_id', user.id)
        .single();

      if (!config?.totp_secret) return false;

      // Verify using Edge Function or local method
      const result = await this.verifyCode(code, config.totp_secret);
      
      if (result.verified) {
        // Mark as verified in database
        await supabase
          .from('mfa_configurations')
          .update({ 
            totp_verified: true,
            totp_enabled: true 
          })
          .eq('user_id', user.id);

        // Log activity
        await supabase
          .from('mfa_activity_log')
          .insert({
            user_id: user.id,
            activity_type: 'setup_completed',
            success: true,
          });
      }

      return result.verified;
    } catch (error) {
      logger.error('Setup verification error:', error);
      return false;
    }
  }

  /**
   * Verify TOTP during login
   */
  async verifyLogin(
    code: string,
    isBackupCode = false
  ): Promise<{
    verified: boolean;
    sessionToken?: string;
    error?: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { verified: false, error: 'Not authenticated' };
      }

      // Get user's secret
      const { data: config } = await supabase
        .from('mfa_configurations')
        .select('totp_secret')
        .eq('user_id', user.id)
        .single();

      if (!config?.totp_secret) {
        return { verified: false, error: 'MFA not configured' };
      }

      // Verify using Edge Function or local method
      const result = await this.verifyCode(code, config.totp_secret, isBackupCode);
      
      if (result.verified && result.sessionToken) {
        // The Edge Function already handles session creation and activity logging
        return result;
      }

      return result;
    } catch (error) {
      logger.error('Login verification error:', error);
      return { 
        verified: false, 
        error: 'Verification failed' 
      };
    }
  }
}

// Export singleton instance
export const mfaServiceProduction = MFAServiceProduction.getInstance();