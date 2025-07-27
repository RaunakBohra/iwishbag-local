import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Configure TOTP settings
authenticator.options = {
  window: 1, // Allow 1 time step in either direction
  step: 30,  // 30 second time steps
  digits: 6, // 6 digit codes
};

export interface MFASetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFAVerificationResponse {
  verified: boolean;
  sessionToken?: string;
  error?: string;
}

export class MFAService {
  private static instance: MFAService;

  private constructor() {}

  static getInstance(): MFAService {
    if (!MFAService.instance) {
      MFAService.instance = new MFAService();
    }
    return MFAService.instance;
  }

  /**
   * Check if current user requires MFA
   */
  async requiresMFA(userId?: string): Promise<boolean> {
    try {
      const targetUserId = userId || (await this.getCurrentUserId());
      if (!targetUserId) return false;

      const { data, error } = await supabase
        .rpc('requires_mfa', { p_user_id: targetUserId });

      if (error) {
        logger.error('Error checking MFA requirement:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      logger.error('MFA requirement check failed:', error);
      return false;
    }
  }

  /**
   * Initialize MFA setup for current user
   */
  async setupMFA(): Promise<MFASetupResponse | null> {
    try {
      const { data, error } = await supabase.rpc('setup_mfa');

      if (error) {
        logger.error('MFA setup failed:', error);
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('No data returned from MFA setup');
      }

      // Handle new JSON response format
      if (!data.success) {
        throw new Error(data.error || 'MFA setup failed');
      }

      // Generate QR code
      const qrCodeUrl = await this.generateQRCode(data.qr_uri);

      return {
        secret: data.secret,
        qrCodeUrl,
        backupCodes: data.backup_codes,
      };
    } catch (error) {
      logger.error('MFA setup error:', error);
      throw error;
    }
  }

  /**
   * Verify TOTP code during setup
   */
  async verifySetup(code: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('verify_totp_setup', { p_code: code });

      if (error) {
        logger.error('MFA setup verification failed:', error);
        return false;
      }

      return data?.verified || false;
    } catch (error) {
      logger.error('MFA verification error:', error);
      return false;
    }
  }

  /**
   * Verify MFA code during login
   */
  async verifyLogin(
    code: string,
    isBackupCode = false
  ): Promise<MFAVerificationResponse> {
    try {
      const { data, error } = await supabase
        .rpc('verify_totp_code', { 
          p_code: code, 
          p_is_backup: isBackupCode 
        });

      if (error) {
        logger.error('MFA login verification failed:', error);
        return { 
          verified: false, 
          error: 'Verification failed. Please try again.' 
        };
      }

      return {
        verified: data?.verified || false,
        sessionToken: data?.sessionToken,
        error: data?.error,
      };
    } catch (error) {
      logger.error('MFA login error:', error);
      return { 
        verified: false, 
        error: 'An error occurred during verification' 
      };
    }
  }

  /**
   * Generate TOTP token (for testing/validation)
   */
  generateToken(secret: string): string {
    return authenticator.generate(secret);
  }

  /**
   * Verify TOTP token locally (for immediate feedback)
   */
  verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch (error) {
      logger.error('Token verification error:', error);
      return false;
    }
  }

  /**
   * Disable MFA for current user
   */
  async disableMFA(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('disable_mfa');

      if (error) {
        logger.error('Failed to disable MFA:', error);
        return false;
      }

      return data?.success || false;
    } catch (error) {
      logger.error('MFA disable error:', error);
      return false;
    }
  }

  /**
   * Get MFA status for current user
   */
  async getMFAStatus(): Promise<{
    enabled: boolean;
    verified: boolean;
    backupCodesRemaining?: number;
  } | null> {
    try {
      const { data, error } = await supabase.rpc('get_mfa_status');

      if (error) {
        logger.error('Failed to get MFA status:', error);
        return null;
      }

      return data ? {
        enabled: data.enabled || false,
        verified: data.verified || false,
        backupCodesRemaining: data.backupCodesRemaining || 0,
      } : null;
    } catch (error) {
      logger.error('Failed to get MFA status:', error);
      return null;
    }
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(): Promise<string[] | null> {
    try {
      const { data, error } = await supabase.rpc('regenerate_backup_codes');

      if (error) {
        logger.error('Failed to regenerate backup codes:', error);
        return null;
      }

      return data?.backupCodes || null;
    } catch (error) {
      logger.error('Failed to regenerate backup codes:', error);
      return null;
    }
  }

  /**
   * Private helper methods
   */
  private async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }

  private async generateQRCode(uri: string): Promise<string> {
    try {
      return await QRCode.toDataURL(uri, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    } catch (error) {
      logger.error('QR code generation failed:', error);
      throw error;
    }
  }

  private async logActivity(
    activityType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return;

      await supabase
        .from('mfa_activity_log')
        .insert({
          user_id: userId,
          activity_type: activityType,
          metadata,
          ip_address: null, // Would be set by server
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      logger.error('Failed to log MFA activity:', error);
    }
  }

  /**
   * Check if MFA session is valid
   */
  async isSessionValid(sessionToken: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('mfa_sessions')
        .select('expires_at')
        .eq('session_token', sessionToken)
        .single();

      if (error || !data) return false;

      return new Date(data.expires_at) > new Date();
    } catch (error) {
      logger.error('Session validation error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const mfaService = MFAService.getInstance();