/**
 * Discount Abuse Detection Service
 * Real-time monitoring and prevention of discount code abuse patterns
 */

import { supabase } from '@/integrations/supabase/client';
import { DiscountLoggingService } from './DiscountLoggingService';

export interface AbuseAttempt {
  id?: string;
  session_id: string;
  customer_id?: string;
  ip_address?: string;
  user_agent?: string;
  abuse_type: 'rapid_attempts' | 'invalid_codes_spam' | 'account_farming' | 'bot_detected' | 'geographic_fraud' | 'code_sharing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: {
    discount_codes_attempted?: string[];
    attempt_count?: number;
    time_window?: string;
    suspicious_patterns?: string[];
    device_fingerprint?: string;
    linked_accounts?: string[];
    [key: string]: any;
  };
  detected_at: Date;
  response_action: 'log_only' | 'rate_limit' | 'captcha_required' | 'temporary_block' | 'permanent_block';
  block_duration?: number; // minutes
  resolved: boolean;
  resolved_at?: Date;
  notes?: string;
}

export interface AbusePattern {
  pattern_type: string;
  threshold: number;
  time_window_minutes: number;
  response_action: string;
  enabled: boolean;
}

export interface SessionActivity {
  session_id: string;
  discount_attempts: Array<{
    code: string;
    timestamp: Date;
    result: 'valid' | 'invalid' | 'expired' | 'blocked';
    ip_address?: string;
  }>;
  first_attempt: Date;
  last_attempt: Date;
  total_attempts: number;
  unique_codes: number;
  suspicious_score: number;
}

export class DiscountAbuseDetectionService {
  private static instance: DiscountAbuseDetectionService;
  private sessionTracking = new Map<string, SessionActivity>();
  private blockedSessions = new Map<string, { until: Date; reason: string }>();
  private blockedIPs = new Map<string, { until: Date; reason: string; attempts: number }>();

  // Default abuse patterns
  private defaultPatterns: AbusePattern[] = [
    {
      pattern_type: 'rapid_attempts',
      threshold: 10,
      time_window_minutes: 5,
      response_action: 'rate_limit',
      enabled: true
    },
    {
      pattern_type: 'invalid_codes_spam',
      threshold: 15,
      time_window_minutes: 10,
      response_action: 'temporary_block',
      enabled: true
    },
    {
      pattern_type: 'bot_detected',
      threshold: 50,
      time_window_minutes: 5,
      response_action: 'captcha_required',
      enabled: true
    },
    {
      pattern_type: 'geographic_fraud',
      threshold: 3,
      time_window_minutes: 60,
      response_action: 'temporary_block',
      enabled: true
    }
  ];

  static getInstance(): DiscountAbuseDetectionService {
    if (!DiscountAbuseDetectionService.instance) {
      DiscountAbuseDetectionService.instance = new DiscountAbuseDetectionService();
    }
    return DiscountAbuseDetectionService.instance;
  }

  /**
   * Check if a discount attempt should be allowed
   */
  async checkDiscountAttempt(attemptData: {
    session_id: string;
    customer_id?: string;
    discount_code: string;
    ip_address?: string;
    user_agent?: string;
    country?: string;
  }): Promise<{
    allowed: boolean;
    reason?: string;
    action_required?: 'captcha' | 'block' | 'rate_limit';
    block_duration?: number;
  }> {
    const { session_id, customer_id, discount_code, ip_address, user_agent, country } = attemptData;

    try {
      // 1. Check if session/IP is already blocked
      const blockCheck = this.checkExistingBlocks(session_id, ip_address);
      if (!blockCheck.allowed) {
        return blockCheck;
      }

      // 2. Track this attempt
      this.trackAttempt(session_id, discount_code, ip_address);

      // 3. Run abuse detection checks
      const abuseChecks = await Promise.all([
        this.checkRapidAttempts(session_id),
        this.checkInvalidCodeSpam(session_id),
        this.checkBotBehavior(session_id, user_agent),
        this.checkGeographicFraud(customer_id, ip_address, country),
        this.checkAccountFarming(customer_id, ip_address)
      ]);

      // 4. Process any detected abuse
      for (const check of abuseChecks) {
        if (check.abuse_detected) {
          await this.handleAbuseDetection(check);
          
          if (check.response_action === 'temporary_block' || check.response_action === 'permanent_block') {
            return {
              allowed: false,
              reason: check.reason,
              action_required: 'block',
              block_duration: check.block_duration
            };
          } else if (check.response_action === 'captcha_required') {
            return {
              allowed: false,
              reason: check.reason,
              action_required: 'captcha'
            };
          } else if (check.response_action === 'rate_limit') {
            return {
              allowed: false,
              reason: check.reason,
              action_required: 'rate_limit'
            };
          }
        }
      }

      return { allowed: true };

    } catch (error) {
      console.error('Error in abuse detection:', error);
      // Fail open - allow the attempt but log the error
      return { allowed: true };
    }
  }

  /**
   * Check for existing blocks
   */
  private checkExistingBlocks(session_id: string, ip_address?: string): {
    allowed: boolean;
    reason?: string;
    action_required?: 'block';
    block_duration?: number;
  } {
    const now = new Date();

    // Check session block
    const sessionBlock = this.blockedSessions.get(session_id);
    if (sessionBlock && sessionBlock.until > now) {
      const remainingMinutes = Math.ceil((sessionBlock.until.getTime() - now.getTime()) / (1000 * 60));
      return {
        allowed: false,
        reason: `Session blocked: ${sessionBlock.reason}`,
        action_required: 'block',
        block_duration: remainingMinutes
      };
    }

    // Check IP block
    if (ip_address) {
      const ipBlock = this.blockedIPs.get(ip_address);
      if (ipBlock && ipBlock.until > now) {
        const remainingMinutes = Math.ceil((ipBlock.until.getTime() - now.getTime()) / (1000 * 60));
        return {
          allowed: false,
          reason: `IP blocked: ${ipBlock.reason}`,
          action_required: 'block',
          block_duration: remainingMinutes
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Track discount attempt
   */
  private trackAttempt(session_id: string, discount_code: string, ip_address?: string): void {
    const now = new Date();

    if (!this.sessionTracking.has(session_id)) {
      this.sessionTracking.set(session_id, {
        session_id,
        discount_attempts: [],
        first_attempt: now,
        last_attempt: now,
        total_attempts: 0,
        unique_codes: 0,
        suspicious_score: 0
      });
    }

    const session = this.sessionTracking.get(session_id)!;
    session.discount_attempts.push({
      code: discount_code,
      timestamp: now,
      result: 'invalid', // Will be updated based on validation
      ip_address
    });
    session.last_attempt = now;
    session.total_attempts++;
    
    // Count unique codes
    const uniqueCodes = new Set(session.discount_attempts.map(a => a.code));
    session.unique_codes = uniqueCodes.size;
  }

  /**
   * Check for rapid attempts pattern
   */
  private async checkRapidAttempts(session_id: string): Promise<{
    abuse_detected: boolean;
    reason?: string;
    response_action?: string;
    block_duration?: number;
    details?: any;
  }> {
    const session = this.sessionTracking.get(session_id);
    if (!session) return { abuse_detected: false };

    const pattern = this.defaultPatterns.find(p => p.pattern_type === 'rapid_attempts');
    if (!pattern || !pattern.enabled) return { abuse_detected: false };

    const now = new Date();
    const timeWindow = pattern.time_window_minutes * 60 * 1000;
    const recentAttempts = session.discount_attempts.filter(
      attempt => (now.getTime() - attempt.timestamp.getTime()) <= timeWindow
    );

    if (recentAttempts.length >= pattern.threshold) {
      return {
        abuse_detected: true,
        reason: `Too many discount attempts: ${recentAttempts.length} attempts in ${pattern.time_window_minutes} minutes`,
        response_action: pattern.response_action,
        block_duration: 15, // 15 minute block for rapid attempts
        details: {
          attempt_count: recentAttempts.length,
          time_window: `${pattern.time_window_minutes} minutes`,
          threshold: pattern.threshold
        }
      };
    }

    return { abuse_detected: false };
  }

  /**
   * Check for invalid code spam
   */
  private async checkInvalidCodeSpam(session_id: string): Promise<{
    abuse_detected: boolean;
    reason?: string;
    response_action?: string;
    block_duration?: number;
    details?: any;
  }> {
    const session = this.sessionTracking.get(session_id);
    if (!session) return { abuse_detected: false };

    const pattern = this.defaultPatterns.find(p => p.pattern_type === 'invalid_codes_spam');
    if (!pattern || !pattern.enabled) return { abuse_detected: false };

    const invalidAttempts = session.discount_attempts.filter(a => a.result === 'invalid');
    
    if (invalidAttempts.length >= pattern.threshold) {
      return {
        abuse_detected: true,
        reason: `Excessive invalid code attempts: ${invalidAttempts.length} invalid codes tried`,
        response_action: pattern.response_action,
        block_duration: 30, // 30 minute block for spam
        details: {
          invalid_attempts: invalidAttempts.length,
          unique_invalid_codes: new Set(invalidAttempts.map(a => a.code)).size
        }
      };
    }

    return { abuse_detected: false };
  }

  /**
   * Check for bot behavior patterns
   */
  private async checkBotBehavior(session_id: string, user_agent?: string): Promise<{
    abuse_detected: boolean;
    reason?: string;
    response_action?: string;
    details?: any;
  }> {
    const session = this.sessionTracking.get(session_id);
    if (!session) return { abuse_detected: false };

    const suspiciousPatterns = [];

    // Check user agent
    if (user_agent) {
      const botKeywords = ['bot', 'crawler', 'spider', 'scraper', 'automated', 'curl', 'wget'];
      if (botKeywords.some(keyword => user_agent.toLowerCase().includes(keyword))) {
        suspiciousPatterns.push('Suspicious user agent detected');
      }
    }

    // Check timing patterns (very regular intervals suggest automation)
    if (session.discount_attempts.length >= 5) {
      const intervals = [];
      for (let i = 1; i < session.discount_attempts.length; i++) {
        const interval = session.discount_attempts[i].timestamp.getTime() - session.discount_attempts[i-1].timestamp.getTime();
        intervals.push(interval);
      }
      
      // Check if intervals are too regular (within 100ms of each other)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const regularIntervals = intervals.filter(interval => Math.abs(interval - avgInterval) < 100);
      
      if (regularIntervals.length > intervals.length * 0.8) {
        suspiciousPatterns.push('Regular timing intervals suggest automation');
      }
    }

    // Check extremely high attempt rate
    const pattern = this.defaultPatterns.find(p => p.pattern_type === 'bot_detected');
    if (pattern && pattern.enabled && session.total_attempts >= pattern.threshold) {
      suspiciousPatterns.push(`Extremely high attempt rate: ${session.total_attempts} attempts`);
    }

    if (suspiciousPatterns.length > 0) {
      return {
        abuse_detected: true,
        reason: 'Bot-like behavior detected',
        response_action: 'captcha_required',
        details: {
          suspicious_patterns: suspiciousPatterns,
          user_agent,
          total_attempts: session.total_attempts
        }
      };
    }

    return { abuse_detected: false };
  }

  /**
   * Check for geographic fraud
   */
  private async checkGeographicFraud(customer_id?: string, ip_address?: string, country?: string): Promise<{
    abuse_detected: boolean;
    reason?: string;
    response_action?: string;
    details?: any;
  }> {
    // This would integrate with IP geolocation services to detect:
    // - VPN usage for geo-restricted discounts
    // - Country mismatches between IP and billing address
    // For now, we'll do basic checks

    if (!customer_id || !ip_address || !country) {
      return { abuse_detected: false };
    }

    // Mock check - in production, integrate with IP geolocation service
    const suspiciousPatterns = [];

    // Check for common VPN/proxy indicators in IP
    const vpnRanges = ['10.', '192.168.', '172.16.'];
    if (vpnRanges.some(range => ip_address.startsWith(range))) {
      suspiciousPatterns.push('Private IP range detected');
    }

    if (suspiciousPatterns.length > 0) {
      return {
        abuse_detected: true,
        reason: 'Geographic fraud indicators detected',
        response_action: 'temporary_block',
        details: {
          suspicious_patterns: suspiciousPatterns,
          customer_country: country,
          ip_address: ip_address.substring(0, 8) + '***' // Partial IP for privacy
        }
      };
    }

    return { abuse_detected: false };
  }

  /**
   * Check for account farming (multiple accounts from same source)
   */
  private async checkAccountFarming(customer_id?: string, ip_address?: string): Promise<{
    abuse_detected: boolean;
    reason?: string;
    response_action?: string;
    details?: any;
  }> {
    if (!customer_id || !ip_address) {
      return { abuse_detected: false };
    }

    try {
      // Check how many different customers have used discounts from this IP recently
      const { data: recentActivity, error } = await supabase
        .from('discount_application_log')
        .select('customer_id')
        .eq('customer_country', 'IN') // Example: focus on specific patterns
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .limit(100);

      if (error) {
        console.error('Error checking account farming:', error);
        return { abuse_detected: false };
      }

      // This is a simplified check - in production, you'd track IP addresses
      // For now, just check if too many different customer IDs in recent activity
      const uniqueCustomers = new Set(recentActivity?.map(r => r.customer_id) || []);
      
      if (uniqueCustomers.size > 10) { // Suspicious if >10 different customers recently
        return {
          abuse_detected: true,
          reason: 'Potential account farming detected',
          response_action: 'temporary_block',
          details: {
            unique_customers_detected: uniqueCustomers.size,
            time_window: '24 hours'
          }
        };
      }

      return { abuse_detected: false };

    } catch (error) {
      console.error('Error in account farming check:', error);
      return { abuse_detected: false };
    }
  }

  /**
   * Handle detected abuse
   */
  private async handleAbuseDetection(abuseData: {
    abuse_detected: boolean;
    reason?: string;
    response_action?: string;
    block_duration?: number;
    details?: any;
  }): Promise<void> {
    if (!abuseData.abuse_detected) return;

    try {
      // Log the abuse attempt
      await DiscountLoggingService.getInstance().logSuspiciousActivity({
        type: 'rapid_attempts', // This would be dynamic based on abuse type
        severity: this.getSeverityLevel(abuseData.response_action),
        details: abuseData.details || {},
        customer_id: undefined, // Would be populated from context
        ip_address: undefined   // Would be populated from context
      });

      // Apply blocking if required
      if (abuseData.response_action === 'temporary_block' && abuseData.block_duration) {
        // Block would be applied in the calling context
        console.log(`🚨 Abuse detected: ${abuseData.reason} - blocking for ${abuseData.block_duration} minutes`);
      }

    } catch (error) {
      console.error('Error handling abuse detection:', error);
    }
  }

  /**
   * Get severity level from response action
   */
  private getSeverityLevel(action?: string): 'low' | 'medium' | 'high' {
    switch (action) {
      case 'permanent_block':
        return 'high';
      case 'temporary_block':
        return 'high';
      case 'captcha_required':
        return 'medium';
      case 'rate_limit':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Block a session temporarily
   */
  blockSession(session_id: string, duration_minutes: number, reason: string): void {
    const until = new Date(Date.now() + duration_minutes * 60 * 1000);
    this.blockedSessions.set(session_id, { until, reason });
    
    console.log(`🚫 Session ${session_id} blocked until ${until.toISOString()} - ${reason}`);
  }

  /**
   * Block an IP address temporarily
   */
  blockIP(ip_address: string, duration_minutes: number, reason: string): void {
    const until = new Date(Date.now() + duration_minutes * 60 * 1000);
    const existing = this.blockedIPs.get(ip_address);
    const attempts = existing ? existing.attempts + 1 : 1;
    
    this.blockedIPs.set(ip_address, { until, reason, attempts });
    
    console.log(`🚫 IP ${ip_address} blocked until ${until.toISOString()} - ${reason} (attempt #${attempts})`);
  }

  /**
   * Get abuse statistics for admin dashboard
   */
  async getAbuseStatistics(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    total_blocked_sessions: number;
    total_blocked_ips: number;
    abuse_attempts_by_type: { [type: string]: number };
    top_blocked_reasons: Array<{ reason: string; count: number }>;
    prevention_effectiveness: number;
  }> {
    const stats = {
      total_blocked_sessions: this.blockedSessions.size,
      total_blocked_ips: this.blockedIPs.size,
      abuse_attempts_by_type: {},
      top_blocked_reasons: [],
      prevention_effectiveness: 0
    };

    // In production, this would query the database for historical data
    // For now, return current in-memory stats
    return stats;
  }

  /**
   * Clear expired blocks (cleanup)
   */
  cleanupExpiredBlocks(): void {
    const now = new Date();
    
    // Clean up expired session blocks
    for (const [session_id, block] of this.blockedSessions.entries()) {
      if (block.until <= now) {
        this.blockedSessions.delete(session_id);
      }
    }
    
    // Clean up expired IP blocks
    for (const [ip, block] of this.blockedIPs.entries()) {
      if (block.until <= now) {
        this.blockedIPs.delete(ip);
      }
    }
  }
}