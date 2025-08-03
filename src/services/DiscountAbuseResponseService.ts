/**
 * Discount Abuse Response Service
 * Automated response system for handling detected abuse patterns
 */

import { supabase } from '@/integrations/supabase/client';
import { DiscountAbuseDetectionService, AbuseAttempt } from './DiscountAbuseDetectionService';
import { DiscountLoggingService } from './DiscountLoggingService';

export interface AbuseResponse {
  action_type: 'log_only' | 'rate_limit' | 'captcha_required' | 'temporary_block' | 'permanent_block' | 'ip_block';
  duration_minutes?: number;
  escalation_level: 'low' | 'medium' | 'high' | 'critical';
  automated: boolean;
  applied_at: Date;
  expires_at?: Date;
  reason: string;
  metadata?: {
    session_id?: string;
    ip_address?: string;
    customer_id?: string;
    trigger_pattern?: string;
    previous_violations?: number;
    [key: string]: any;
  };
}

export interface EscalationRule {
  violation_count: number;
  time_window_hours: number;
  response_action: string;
  duration_minutes: number;
  description: string;
}

export class DiscountAbuseResponseService {
  private static instance: DiscountAbuseResponseService;
  private abuseDetection: DiscountAbuseDetectionService;
  private logging: DiscountLoggingService;

  // Escalation matrix based on violation history
  private escalationRules: EscalationRule[] = [
    {
      violation_count: 1,
      time_window_hours: 1,
      response_action: 'rate_limit',
      duration_minutes: 5,
      description: 'First offense - brief rate limiting'
    },
    {
      violation_count: 2,
      time_window_hours: 6,
      response_action: 'captcha_required',
      duration_minutes: 15,
      description: 'Second offense - require CAPTCHA verification'
    },
    {
      violation_count: 3,
      time_window_hours: 24,
      response_action: 'temporary_block',
      duration_minutes: 60,
      description: 'Third offense - 1 hour temporary block'
    },
    {
      violation_count: 5,
      time_window_hours: 24,
      response_action: 'temporary_block',
      duration_minutes: 240,
      description: 'Multiple offenses - 4 hour block'
    },
    {
      violation_count: 10,
      time_window_hours: 48,
      response_action: 'ip_block',
      duration_minutes: 1440,
      description: 'Persistent abuse - 24 hour IP block'
    }
  ];

  static getInstance(): DiscountAbuseResponseService {
    if (!DiscountAbuseResponseService.instance) {
      DiscountAbuseResponseService.instance = new DiscountAbuseResponseService();
    }
    return DiscountAbuseResponseService.instance;
  }

  private constructor() {
    this.abuseDetection = DiscountAbuseDetectionService.getInstance();
    this.logging = DiscountLoggingService.getInstance();
  }

  /**
   * Execute automated response to detected abuse
   */
  async executeResponse(abuseAttempt: AbuseAttempt): Promise<AbuseResponse> {
    try {
      // Determine appropriate response based on severity and history
      const response = await this.determineResponse(abuseAttempt);
      
      // Apply the response
      await this.applyResponse(response, abuseAttempt);
      
      // Log the response for audit trail
      await this.logResponse(response, abuseAttempt);
      
      // Check if escalation is needed
      await this.checkEscalation(abuseAttempt);
      
      return response;
      
    } catch (error) {
      console.error('Error executing abuse response:', error);
      
      // Fallback response
      return {
        action_type: 'log_only',
        escalation_level: 'low',
        automated: true,
        applied_at: new Date(),
        reason: 'Error in response system - logged for manual review'
      };
    }
  }

  /**
   * Determine appropriate response based on abuse pattern and history
   */
  private async determineResponse(abuseAttempt: AbuseAttempt): Promise<AbuseResponse> {
    const now = new Date();
    
    // Get violation history for this session/IP/customer
    const violationHistory = await this.getViolationHistory(abuseAttempt);
    
    // Find applicable escalation rule
    const applicableRule = this.escalationRules
      .reverse() // Check from highest to lowest violation count
      .find(rule => {
        const recentViolations = violationHistory.filter(v => {
          const timeDiff = (now.getTime() - new Date(v.detected_at).getTime()) / (1000 * 60 * 60);
          return timeDiff <= rule.time_window_hours;
        });
        return recentViolations.length >= rule.violation_count;
      });

    // Determine response based on rule or default to the attempt's response
    const responseAction = applicableRule?.response_action || abuseAttempt.response_action;
    const duration = applicableRule?.duration_minutes || abuseAttempt.block_duration || 15;
    
    // Determine escalation level
    let escalationLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (violationHistory.length >= 10) escalationLevel = 'critical';
    else if (violationHistory.length >= 5) escalationLevel = 'high';
    else if (violationHistory.length >= 2) escalationLevel = 'medium';
    
    const response: AbuseResponse = {
      action_type: responseAction as any,
      duration_minutes: duration,
      escalation_level: escalationLevel,
      automated: true,
      applied_at: now,
      expires_at: duration ? new Date(now.getTime() + duration * 60 * 1000) : undefined,
      reason: applicableRule?.description || `${abuseAttempt.abuse_type} detected`,
      metadata: {
        session_id: abuseAttempt.session_id,
        ip_address: abuseAttempt.ip_address,
        customer_id: abuseAttempt.customer_id,
        trigger_pattern: abuseAttempt.abuse_type,
        previous_violations: violationHistory.length,
        escalation_rule: applicableRule?.description
      }
    };

    return response;
  }

  /**
   * Apply the determined response
   */
  private async applyResponse(response: AbuseResponse, abuseAttempt: AbuseAttempt): Promise<void> {
    const { session_id, ip_address, customer_id } = abuseAttempt;
    
    switch (response.action_type) {
      case 'rate_limit':
        // Apply rate limiting through abuse detection service
        if (session_id) {
          this.abuseDetection.blockSession(
            session_id,
            response.duration_minutes || 5,
            response.reason
          );
        }
        break;
        
      case 'captcha_required':
        // Mark session as requiring CAPTCHA verification
        if (session_id) {
          this.abuseDetection.blockSession(
            session_id,
            response.duration_minutes || 15,
            `CAPTCHA required: ${response.reason}`
          );
        }
        break;
        
      case 'temporary_block':
        // Apply temporary block to session and optionally IP
        if (session_id) {
          this.abuseDetection.blockSession(
            session_id,
            response.duration_minutes || 60,
            response.reason
          );
        }
        break;
        
      case 'ip_block':
        // Apply IP-level block
        if (ip_address) {
          this.abuseDetection.blockIP(
            ip_address,
            response.duration_minutes || 1440,
            response.reason
          );
        }
        break;
        
      case 'permanent_block':
        // Permanent blocks require manual intervention
        await this.escalateToPermanentBlock(abuseAttempt, response);
        break;
        
      case 'log_only':
      default:
        // No immediate action, just logging
        console.log(`🔍 Abuse logged: ${response.reason}`);
        break;
    }
  }

  /**
   * Get violation history for pattern analysis
   */
  private async getViolationHistory(abuseAttempt: AbuseAttempt): Promise<AbuseAttempt[]> {
    try {
      // This would query a database table for abuse attempts
      // For now, return empty array - in production, implement full history tracking
      const { data: history, error } = await supabase
        .from('abuse_attempts')
        .select('*')
        .or(`session_id.eq.${abuseAttempt.session_id},ip_address.eq.${abuseAttempt.ip_address}${abuseAttempt.customer_id ? `,customer_id.eq.${abuseAttempt.customer_id}` : ''}`)
        .order('detected_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching violation history:', error);
        return [];
      }

      return history || [];
    } catch (error) {
      console.error('Error in getViolationHistory:', error);
      return [];
    }
  }

  /**
   * Log the response for audit and analysis
   */
  private async logResponse(response: AbuseResponse, abuseAttempt: AbuseAttempt): Promise<void> {
    try {
      await this.logging.logSuspiciousActivity({
        type: 'automated_response',
        severity: response.escalation_level === 'critical' ? 'high' : 
                 response.escalation_level === 'high' ? 'high' : 'medium',
        details: {
          original_abuse_type: abuseAttempt.abuse_type,
          response_action: response.action_type,
          duration_minutes: response.duration_minutes,
          escalation_level: response.escalation_level,
          automated: response.automated,
          metadata: response.metadata
        },
        customer_id: abuseAttempt.customer_id,
        ip_address: abuseAttempt.ip_address
      });

      // Also log to abuse_attempts table if it exists
      const { error } = await supabase
        .from('abuse_attempts')
        .insert({
          session_id: abuseAttempt.session_id,
          customer_id: abuseAttempt.customer_id,
          ip_address: abuseAttempt.ip_address,
          user_agent: abuseAttempt.user_agent,
          abuse_type: abuseAttempt.abuse_type,
          severity: abuseAttempt.severity,
          details: abuseAttempt.details,
          detected_at: abuseAttempt.detected_at,
          response_action: response.action_type,
          block_duration: response.duration_minutes,
          resolved: false
        });

      if (error && !error.message.includes('relation "abuse_attempts" does not exist')) {
        console.error('Error logging to abuse_attempts:', error);
      }

    } catch (error) {
      console.error('Error logging response:', error);
    }
  }

  /**
   * Check if escalation to human review is needed
   */
  private async checkEscalation(abuseAttempt: AbuseAttempt): Promise<void> {
    const escalationCriteria = [
      abuseAttempt.severity === 'critical',
      abuseAttempt.abuse_type === 'account_farming',
      abuseAttempt.details?.attempt_count && abuseAttempt.details.attempt_count > 100
    ];

    if (escalationCriteria.some(criteria => criteria)) {
      await this.escalateToHumanReview(abuseAttempt);
    }
  }

  /**
   * Escalate to human review for complex cases
   */
  private async escalateToHumanReview(abuseAttempt: AbuseAttempt): Promise<void> {
    try {
      console.log('🚨 ESCALATION TO HUMAN REVIEW REQUIRED 🚨');
      console.log('Abuse Type:', abuseAttempt.abuse_type);
      console.log('Severity:', abuseAttempt.severity);
      console.log('Details:', abuseAttempt.details);
      
      // In production, this would:
      // 1. Send alerts to admin team
      // 2. Create admin dashboard notification
      // 3. Generate incident report
      // 4. Potentially integrate with external monitoring tools
      
      await this.logging.logSuspiciousActivity({
        type: 'escalated_to_human',
        severity: 'high',
        details: {
          escalation_reason: 'Automated system requires human review',
          original_abuse: abuseAttempt,
          requires_immediate_attention: true
        },
        customer_id: abuseAttempt.customer_id,
        ip_address: abuseAttempt.ip_address
      });

    } catch (error) {
      console.error('Error escalating to human review:', error);
    }
  }

  /**
   * Handle permanent block escalation
   */
  private async escalateToPermanentBlock(abuseAttempt: AbuseAttempt, response: AbuseResponse): Promise<void> {
    console.log('🚫 PERMANENT BLOCK INITIATED 🚫');
    console.log('This requires immediate admin intervention');
    
    // Temporary blocking while awaiting admin review
    if (abuseAttempt.session_id) {
      this.abuseDetection.blockSession(
        abuseAttempt.session_id,
        1440, // 24 hours
        'Pending permanent block review'
      );
    }
    
    if (abuseAttempt.ip_address) {
      this.abuseDetection.blockIP(
        abuseAttempt.ip_address,
        1440, // 24 hours
        'Pending permanent block review'
      );
    }
    
    await this.escalateToHumanReview(abuseAttempt);
  }

  /**
   * Get response statistics for admin dashboard
   */
  async getResponseStatistics(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    total_responses: number;
    responses_by_type: { [type: string]: number };
    escalation_breakdown: { [level: string]: number };
    effectiveness_metrics: {
      prevented_attempts: number;
      repeat_offenders: number;
      false_positives: number;
    };
  }> {
    // This would query actual database records in production
    // For now, return mock data structure
    return {
      total_responses: 0,
      responses_by_type: {
        'rate_limit': 0,
        'captcha_required': 0,
        'temporary_block': 0,
        'ip_block': 0,
        'permanent_block': 0
      },
      escalation_breakdown: {
        'low': 0,
        'medium': 0,
        'high': 0,
        'critical': 0
      },
      effectiveness_metrics: {
        prevented_attempts: 0,
        repeat_offenders: 0,
        false_positives: 0
      }
    };
  }

  /**
   * Manual override for admin users
   */
  async adminOverride(
    targetType: 'session' | 'ip' | 'customer',
    targetValue: string,
    action: 'unblock' | 'extend_block' | 'permanent_block',
    reason: string,
    adminId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔧 Admin override: ${action} for ${targetType}:${targetValue}`);
      
      // Log admin action
      await this.logging.logSuspiciousActivity({
        type: 'admin_override',
        severity: 'medium',
        details: {
          target_type: targetType,
          target_value: targetValue,
          action,
          reason,
          admin_id: adminId,
          timestamp: new Date()
        }
      });

      return {
        success: true,
        message: `Successfully applied ${action} to ${targetType}`
      };
      
    } catch (error) {
      console.error('Error in admin override:', error);
      return {
        success: false,
        message: 'Failed to apply admin override'
      };
    }
  }
}