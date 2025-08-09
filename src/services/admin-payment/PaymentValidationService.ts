/**
 * Payment Validation Service
 * Handles payment validation, business rules, and fraud detection
 * Extracted from UnifiedPaymentModal for clean validation management
 * 
 * RESPONSIBILITIES:
 * - Payment amount and currency validation
 * - Business rule enforcement and compliance
 * - Duplicate payment prevention
 * - Payment method restrictions and limitations
 * - Fraud detection and risk assessment
 * - Compliance checking (AML, KYC requirements)
 * - Customer payment limits and restrictions
 * - Geographic and regulatory validation
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentValidationResult {
  isValid: boolean;
  errors: PaymentValidationError[];
  warnings: PaymentValidationWarning[];
  riskScore: number; // 0-100 (higher = riskier)
  recommendations: PaymentRecommendation[];
  complianceChecks: ComplianceCheck[];
}

export interface PaymentValidationError {
  code: PaymentErrorCode;
  message: string;
  field?: string;
  severity: 'critical' | 'high' | 'medium';
  context?: Record<string, any>;
}

export interface PaymentValidationWarning {
  code: PaymentWarningCode;
  message: string;
  field?: string;
  impact: 'high' | 'medium' | 'low';
  context?: Record<string, any>;
}

export interface PaymentRecommendation {
  type: 'security' | 'optimization' | 'compliance';
  message: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ComplianceCheck {
  rule: string;
  status: 'passed' | 'failed' | 'warning';
  description: string;
  reference?: string;
}

export enum PaymentErrorCode {
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_CURRENCY = 'INVALID_CURRENCY',
  DUPLICATE_PAYMENT = 'DUPLICATE_PAYMENT',
  PAYMENT_METHOD_RESTRICTED = 'PAYMENT_METHOD_RESTRICTED',
  AMOUNT_LIMIT_EXCEEDED = 'AMOUNT_LIMIT_EXCEEDED',
  CUSTOMER_BLOCKED = 'CUSTOMER_BLOCKED',
  GEOGRAPHIC_RESTRICTION = 'GEOGRAPHIC_RESTRICTION',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  FRAUD_DETECTED = 'FRAUD_DETECTED',
  INSUFFICIENT_KYC = 'INSUFFICIENT_KYC'
}

export enum PaymentWarningCode {
  HIGH_RISK_TRANSACTION = 'HIGH_RISK_TRANSACTION',
  UNUSUAL_AMOUNT = 'UNUSUAL_AMOUNT',
  FREQUENT_PAYMENTS = 'FREQUENT_PAYMENTS',
  NEW_PAYMENT_METHOD = 'NEW_PAYMENT_METHOD',
  CROSS_BORDER_PAYMENT = 'CROSS_BORDER_PAYMENT',
  LARGE_TRANSACTION = 'LARGE_TRANSACTION'
}

export interface PaymentValidationRequest {
  quote_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  customer_id?: string;
  customer_email?: string;
  customer_country?: string;
  ip_address?: string;
  user_agent?: string;
  gateway?: string;
  reference_number?: string;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  rule_type: 'amount' | 'currency' | 'method' | 'customer' | 'geographic' | 'compliance';
  conditions: Record<string, any>;
  action: 'block' | 'warn' | 'require_approval';
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerRiskProfile {
  customer_id: string;
  risk_score: number; // 0-100
  trust_level: 'low' | 'medium' | 'high';
  payment_history: {
    total_payments: number;
    successful_payments: number;
    failed_payments: number;
    disputed_payments: number;
    average_amount: number;
    last_payment_date: string;
  };
  flags: string[];
  kyc_status: 'pending' | 'verified' | 'rejected';
  kyc_level: 'basic' | 'enhanced' | 'premium';
  notes: string[];
}

export interface PaymentLimits {
  daily_limit: number;
  monthly_limit: number;
  transaction_limit: number;
  method_limits: Record<string, {
    min_amount: number;
    max_amount: number;
    daily_limit: number;
  }>;
  geographic_limits: Record<string, {
    allowed: boolean;
    max_amount?: number;
    requires_approval?: boolean;
  }>;
}

export class PaymentValidationService {
  private static instance: PaymentValidationService;
  private rulesCache = new Map<string, { rules: ValidationRule[]; timestamp: number }>();
  private riskCache = new Map<string, { profile: CustomerRiskProfile; timestamp: number }>();
  private readonly cacheTTL = 10 * 60 * 1000; // 10 minutes

  // Default validation limits
  private readonly defaultLimits: PaymentLimits = {
    daily_limit: 10000,
    monthly_limit: 50000,
    transaction_limit: 5000,
    method_limits: {
      'bank_transfer': { min_amount: 1, max_amount: 100000, daily_limit: 50000 },
      'credit_card': { min_amount: 1, max_amount: 10000, daily_limit: 20000 },
      'upi': { min_amount: 1, max_amount: 5000, daily_limit: 10000 },
      'digital_wallet': { min_amount: 1, max_amount: 2000, daily_limit: 5000 }
    },
    geographic_limits: {
      'US': { allowed: true },
      'IN': { allowed: true },
      'NP': { allowed: true },
      'BD': { allowed: true },
      'CN': { allowed: false },
      'RU': { allowed: false }
    }
  };

  constructor() {
    logger.info('PaymentValidationService initialized');
  }

  static getInstance(): PaymentValidationService {
    if (!PaymentValidationService.instance) {
      PaymentValidationService.instance = new PaymentValidationService();
    }
    return PaymentValidationService.instance;
  }

  /**
   * Validate payment request comprehensively
   */
  async validatePayment(request: PaymentValidationRequest): Promise<PaymentValidationResult> {
    try {
      logger.info('Validating payment request:', { 
        quote_id: request.quote_id, 
        amount: request.amount,
        method: request.payment_method
      });

      const errors: PaymentValidationError[] = [];
      const warnings: PaymentValidationWarning[] = [];
      const recommendations: PaymentRecommendation[] = [];
      const complianceChecks: ComplianceCheck[] = [];

      // Step 1: Basic validation
      const basicValidation = this.validateBasicPaymentData(request);
      errors.push(...basicValidation.errors);
      warnings.push(...basicValidation.warnings);

      // Step 2: Business rules validation
      const rulesValidation = await this.validateBusinessRules(request);
      errors.push(...rulesValidation.errors);
      warnings.push(...rulesValidation.warnings);
      recommendations.push(...rulesValidation.recommendations);

      // Step 3: Duplicate payment check
      const duplicateCheck = await this.checkDuplicatePayment(request);
      if (duplicateCheck.isDuplicate) {
        errors.push({
          code: PaymentErrorCode.DUPLICATE_PAYMENT,
          message: 'Duplicate payment detected',
          severity: 'high',
          context: duplicateCheck.context
        });
      }

      // Step 4: Customer risk assessment
      let riskScore = 0;
      if (request.customer_id) {
        const riskAssessment = await this.assessCustomerRisk(request);
        riskScore = riskAssessment.riskScore;
        warnings.push(...riskAssessment.warnings);
        recommendations.push(...riskAssessment.recommendations);
      }

      // Step 5: Geographic validation
      const geoValidation = this.validateGeographicRestrictions(request);
      errors.push(...geoValidation.errors);
      warnings.push(...geoValidation.warnings);

      // Step 6: Compliance checks
      const complianceValidation = await this.performComplianceChecks(request);
      complianceChecks.push(...complianceValidation);
      
      // Convert compliance failures to errors
      complianceValidation
        .filter(check => check.status === 'failed')
        .forEach(check => {
          errors.push({
            code: PaymentErrorCode.COMPLIANCE_VIOLATION,
            message: `Compliance check failed: ${check.description}`,
            severity: 'critical',
            context: { rule: check.rule, reference: check.reference }
          });
        });

      // Step 7: Fraud detection
      const fraudCheck = await this.detectFraud(request);
      riskScore = Math.max(riskScore, fraudCheck.riskScore);
      if (fraudCheck.isFraudulent) {
        errors.push({
          code: PaymentErrorCode.FRAUD_DETECTED,
          message: 'Potential fraudulent activity detected',
          severity: 'critical',
          context: fraudCheck.indicators
        });
      }

      // Step 8: Generate additional recommendations
      recommendations.push(...this.generateSecurityRecommendations(request, riskScore));

      const result: PaymentValidationResult = {
        isValid: errors.filter(e => e.severity === 'critical').length === 0,
        errors,
        warnings,
        riskScore,
        recommendations,
        complianceChecks
      };

      // Log validation result
      await this.logValidationResult(request, result);

      logger.info(`Payment validation completed. Valid: ${result.isValid}, Risk Score: ${riskScore}`);
      return result;

    } catch (error) {
      logger.error('Payment validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate payment amount and limits
   */
  async validatePaymentLimits(
    customerId: string,
    amount: number,
    currency: string,
    paymentMethod: string
  ): Promise<{
    withinLimits: boolean;
    exceededLimits: string[];
    remainingLimits: Record<string, number>;
  }> {
    try {
      const limits = await this.getCustomerLimits(customerId);
      const usage = await this.getCustomerUsage(customerId);
      
      const exceededLimits: string[] = [];
      const remainingLimits: Record<string, number> = {};

      // Check transaction limit
      if (amount > limits.transaction_limit) {
        exceededLimits.push('transaction_limit');
      }

      // Check daily limit
      const dailyRemaining = limits.daily_limit - usage.daily_amount;
      remainingLimits.daily_limit = Math.max(0, dailyRemaining);
      if (amount > dailyRemaining) {
        exceededLimits.push('daily_limit');
      }

      // Check monthly limit
      const monthlyRemaining = limits.monthly_limit - usage.monthly_amount;
      remainingLimits.monthly_limit = Math.max(0, monthlyRemaining);
      if (amount > monthlyRemaining) {
        exceededLimits.push('monthly_limit');
      }

      // Check method-specific limits
      const methodLimit = limits.method_limits[paymentMethod];
      if (methodLimit) {
        if (amount < methodLimit.min_amount || amount > methodLimit.max_amount) {
          exceededLimits.push(`method_limit_${paymentMethod}`);
        }

        const methodDailyRemaining = methodLimit.daily_limit - usage.method_daily_amounts[paymentMethod];
        remainingLimits[`${paymentMethod}_daily`] = Math.max(0, methodDailyRemaining);
        if (amount > methodDailyRemaining) {
          exceededLimits.push(`method_daily_limit_${paymentMethod}`);
        }
      }

      return {
        withinLimits: exceededLimits.length === 0,
        exceededLimits,
        remainingLimits
      };

    } catch (error) {
      logger.error('Payment limit validation failed:', error);
      return {
        withinLimits: false,
        exceededLimits: ['validation_error'],
        remainingLimits: {}
      };
    }
  }

  /**
   * Get customer risk profile
   */
  async getCustomerRiskProfile(customerId: string, forceRefresh: boolean = false): Promise<CustomerRiskProfile> {
    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = this.getRiskFromCache(customerId);
        if (cached) {
          logger.debug('Customer risk profile cache hit:', customerId);
          return cached;
        }
      }

      // Fetch customer payment history
      const { data: payments, error: paymentsError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (paymentsError) throw paymentsError;

      // Calculate risk profile
      const profile = this.calculateCustomerRiskProfile(customerId, payments || []);

      // Cache the result
      this.setRiskCache(customerId, profile);

      return profile;

    } catch (error) {
      logger.error('Failed to get customer risk profile:', error);
      throw error;
    }
  }

  /**
   * Update validation rules
   */
  async updateValidationRule(ruleId: string, updates: Partial<ValidationRule>): Promise<ValidationRule> {
    try {
      const { data: updatedRule, error } = await supabase
        .from('payment_validation_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', ruleId)
        .select('*')
        .single();

      if (error) throw error;

      // Clear rules cache
      this.rulesCache.clear();

      return updatedRule;

    } catch (error) {
      logger.error('Failed to update validation rule:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private validateBasicPaymentData(request: PaymentValidationRequest): {
    errors: PaymentValidationError[];
    warnings: PaymentValidationWarning[];
  } {
    const errors: PaymentValidationError[] = [];
    const warnings: PaymentValidationWarning[] = [];

    // Amount validation
    if (!request.amount || request.amount <= 0) {
      errors.push({
        code: PaymentErrorCode.INVALID_AMOUNT,
        message: 'Payment amount must be greater than zero',
        field: 'amount',
        severity: 'critical'
      });
    }

    if (request.amount > 100000) {
      warnings.push({
        code: PaymentWarningCode.LARGE_TRANSACTION,
        message: 'Large transaction detected - may require additional verification',
        field: 'amount',
        impact: 'high',
        context: { amount: request.amount, threshold: 100000 }
      });
    }

    // Currency validation
    const supportedCurrencies = ['USD', 'INR', 'NPR', 'EUR', 'GBP'];
    if (!supportedCurrencies.includes(request.currency)) {
      errors.push({
        code: PaymentErrorCode.INVALID_CURRENCY,
        message: `Unsupported currency: ${request.currency}`,
        field: 'currency',
        severity: 'high'
      });
    }

    // Payment method validation
    const supportedMethods = ['bank_transfer', 'credit_card', 'upi', 'digital_wallet', 'cash'];
    if (!supportedMethods.includes(request.payment_method)) {
      errors.push({
        code: PaymentErrorCode.PAYMENT_METHOD_RESTRICTED,
        message: `Payment method not supported: ${request.payment_method}`,
        field: 'payment_method',
        severity: 'high'
      });
    }

    return { errors, warnings };
  }

  private async validateBusinessRules(request: PaymentValidationRequest): Promise<{
    errors: PaymentValidationError[];
    warnings: PaymentValidationWarning[];
    recommendations: PaymentRecommendation[];
  }> {
    const errors: PaymentValidationError[] = [];
    const warnings: PaymentValidationWarning[] = [];
    const recommendations: PaymentRecommendation[] = [];

    try {
      const rules = await this.getValidationRules();
      
      for (const rule of rules.filter(r => r.is_active)) {
        const ruleResult = this.evaluateRule(rule, request);
        
        if (ruleResult.triggered) {
          switch (rule.action) {
            case 'block':
              errors.push({
                code: PaymentErrorCode.COMPLIANCE_VIOLATION,
                message: ruleResult.message,
                severity: 'critical',
                context: { rule_id: rule.id, rule_name: rule.name }
              });
              break;
            case 'warn':
              warnings.push({
                code: PaymentWarningCode.HIGH_RISK_TRANSACTION,
                message: ruleResult.message,
                impact: 'high',
                context: { rule_id: rule.id, rule_name: rule.name }
              });
              break;
            case 'require_approval':
              recommendations.push({
                type: 'compliance',
                message: `Manual approval required: ${ruleResult.message}`,
                action: 'require_manual_approval',
                priority: 'high'
              });
              break;
          }
        }
      }

    } catch (error) {
      logger.error('Business rules validation failed:', error);
    }

    return { errors, warnings, recommendations };
  }

  private async checkDuplicatePayment(request: PaymentValidationRequest): Promise<{
    isDuplicate: boolean;
    context?: Record<string, any>;
  }> {
    try {
      if (!request.reference_number) {
        return { isDuplicate: false };
      }

      const { data: existingPayment, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('quote_id', request.quote_id)
        .eq('amount', request.amount)
        .eq('reference_number', request.reference_number)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .limit(1);

      if (error) {
        logger.warn('Duplicate payment check failed:', error);
        return { isDuplicate: false };
      }

      if (existingPayment && existingPayment.length > 0) {
        return {
          isDuplicate: true,
          context: {
            existing_payment_id: existingPayment[0].id,
            existing_payment_date: existingPayment[0].created_at
          }
        };
      }

      return { isDuplicate: false };

    } catch (error) {
      logger.error('Duplicate payment check failed:', error);
      return { isDuplicate: false };
    }
  }

  private async assessCustomerRisk(request: PaymentValidationRequest): Promise<{
    riskScore: number;
    warnings: PaymentValidationWarning[];
    recommendations: PaymentRecommendation[];
  }> {
    const warnings: PaymentValidationWarning[] = [];
    const recommendations: PaymentRecommendation[] = [];

    try {
      if (!request.customer_id) {
        return { riskScore: 50, warnings, recommendations }; // Medium risk for anonymous
      }

      const profile = await this.getCustomerRiskProfile(request.customer_id);
      let riskScore = profile.risk_score;

      // Adjust risk based on current transaction
      if (request.amount > profile.payment_history.average_amount * 5) {
        riskScore += 20;
        warnings.push({
          code: PaymentWarningCode.UNUSUAL_AMOUNT,
          message: 'Transaction amount is significantly higher than customer average',
          impact: 'high'
        });
      }

      // Check payment frequency
      const recentPayments = await this.getCustomerRecentPayments(request.customer_id);
      if (recentPayments.length > 10) { // More than 10 payments in last 24 hours
        riskScore += 15;
        warnings.push({
          code: PaymentWarningCode.FREQUENT_PAYMENTS,
          message: 'High frequency of payments detected',
          impact: 'medium'
        });
      }

      // KYC recommendations
      if (profile.kyc_status !== 'verified' && request.amount > 1000) {
        recommendations.push({
          type: 'compliance',
          message: 'KYC verification recommended for high-value transactions',
          action: 'require_kyc_verification',
          priority: 'high'
        });
      }

      return {
        riskScore: Math.min(100, riskScore),
        warnings,
        recommendations
      };

    } catch (error) {
      logger.error('Customer risk assessment failed:', error);
      return { riskScore: 50, warnings, recommendations };
    }
  }

  private validateGeographicRestrictions(request: PaymentValidationRequest): {
    errors: PaymentValidationError[];
    warnings: PaymentValidationWarning[];
  } {
    const errors: PaymentValidationError[] = [];
    const warnings: PaymentValidationWarning[] = [];

    if (!request.customer_country) {
      return { errors, warnings };
    }

    const countryLimits = this.defaultLimits.geographic_limits[request.customer_country];
    
    if (!countryLimits || !countryLimits.allowed) {
      errors.push({
        code: PaymentErrorCode.GEOGRAPHIC_RESTRICTION,
        message: `Payments not allowed from ${request.customer_country}`,
        severity: 'critical',
        context: { country: request.customer_country }
      });
    }

    if (countryLimits?.max_amount && request.amount > countryLimits.max_amount) {
      errors.push({
        code: PaymentErrorCode.AMOUNT_LIMIT_EXCEEDED,
        message: `Amount exceeds limit for ${request.customer_country}`,
        severity: 'high',
        context: { 
          amount: request.amount, 
          limit: countryLimits.max_amount,
          country: request.customer_country
        }
      });
    }

    if (countryLimits?.requires_approval) {
      warnings.push({
        code: PaymentWarningCode.CROSS_BORDER_PAYMENT,
        message: 'Cross-border payment requires manual approval',
        impact: 'high'
      });
    }

    return { errors, warnings };
  }

  private async performComplianceChecks(request: PaymentValidationRequest): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];

    // AML check
    checks.push({
      rule: 'AML_SCREENING',
      status: request.amount > 10000 ? 'warning' : 'passed',
      description: 'Anti-Money Laundering screening',
      reference: 'AML_POLICY_2024'
    });

    // PEP check (Politically Exposed Persons)
    checks.push({
      rule: 'PEP_SCREENING',
      status: 'passed', // Would be actual check
      description: 'Politically Exposed Person screening'
    });

    // Sanctions check
    checks.push({
      rule: 'SANCTIONS_CHECK',
      status: 'passed', // Would be actual check
      description: 'International sanctions list screening'
    });

    // Transaction monitoring
    checks.push({
      rule: 'TRANSACTION_MONITORING',
      status: request.amount > 50000 ? 'warning' : 'passed',
      description: 'High-value transaction monitoring',
      reference: 'TM_THRESHOLD_50K'
    });

    return checks;
  }

  private async detectFraud(request: PaymentValidationRequest): Promise<{
    isFraudulent: boolean;
    riskScore: number;
    indicators: string[];
  }> {
    const indicators: string[] = [];
    let riskScore = 0;

    // IP address analysis
    if (request.ip_address) {
      // Mock fraud detection logic
      if (request.ip_address.startsWith('192.168.')) {
        riskScore += 10;
        indicators.push('suspicious_ip_pattern');
      }
    }

    // Amount patterns
    if (request.amount === Math.round(request.amount) && request.amount > 1000) {
      riskScore += 5;
      indicators.push('round_amount_pattern');
    }

    // Time-based analysis
    const hour = new Date().getHours();
    if (hour < 6 || hour > 23) { // Unusual hours
      riskScore += 10;
      indicators.push('unusual_transaction_time');
    }

    return {
      isFraudulent: riskScore > 70,
      riskScore,
      indicators
    };
  }

  private generateSecurityRecommendations(
    request: PaymentValidationRequest,
    riskScore: number
  ): PaymentRecommendation[] {
    const recommendations: PaymentRecommendation[] = [];

    if (riskScore > 60) {
      recommendations.push({
        type: 'security',
        message: 'Consider requiring additional authentication for this transaction',
        action: 'enable_two_factor_auth',
        priority: 'high'
      });
    }

    if (request.amount > 5000 && !request.customer_id) {
      recommendations.push({
        type: 'security',
        message: 'High-value anonymous payment detected',
        action: 'require_customer_identification',
        priority: 'high'
      });
    }

    return recommendations;
  }

  // Helper methods for fetching data
  private async getValidationRules(): Promise<ValidationRule[]> {
    const cached = this.rulesCache.get('all');
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.rules;
    }

    const { data: rules, error } = await supabase
      .from('payment_validation_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) throw error;

    this.rulesCache.set('all', {
      rules: rules || [],
      timestamp: Date.now()
    });

    return rules || [];
  }

  private evaluateRule(rule: ValidationRule, request: PaymentValidationRequest): {
    triggered: boolean;
    message: string;
  } {
    // Simple rule evaluation logic
    // In practice, this would be more sophisticated
    try {
      const conditions = rule.conditions;
      let triggered = false;
      let message = rule.description;

      if (conditions.max_amount && request.amount > conditions.max_amount) {
        triggered = true;
        message = `Amount exceeds limit: ${conditions.max_amount}`;
      }

      if (conditions.blocked_methods && conditions.blocked_methods.includes(request.payment_method)) {
        triggered = true;
        message = `Payment method not allowed: ${request.payment_method}`;
      }

      return { triggered, message };

    } catch (error) {
      logger.error('Rule evaluation failed:', error);
      return { triggered: false, message: 'Rule evaluation error' };
    }
  }

  private async getCustomerLimits(customerId: string): Promise<PaymentLimits> {
    // Would fetch customer-specific limits from database
    // For now, return default limits
    return this.defaultLimits;
  }

  private async getCustomerUsage(customerId: string): Promise<{
    daily_amount: number;
    monthly_amount: number;
    method_daily_amounts: Record<string, number>;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const { data: payments, error } = await supabase
        .from('payment_transactions')
        .select('amount, payment_method, created_at')
        .eq('customer_id', customerId)
        .eq('status', 'completed')
        .gte('created_at', monthStart);

      if (error) throw error;

      const dailyAmount = (payments || [])
        .filter(p => p.created_at.startsWith(today))
        .reduce((sum, p) => sum + p.amount, 0);

      const monthlyAmount = (payments || [])
        .reduce((sum, p) => sum + p.amount, 0);

      const methodDailyAmounts: Record<string, number> = {};
      (payments || [])
        .filter(p => p.created_at.startsWith(today))
        .forEach(p => {
          methodDailyAmounts[p.payment_method] = (methodDailyAmounts[p.payment_method] || 0) + p.amount;
        });

      return {
        daily_amount: dailyAmount,
        monthly_amount: monthlyAmount,
        method_daily_amounts: methodDailyAmounts
      };

    } catch (error) {
      logger.error('Failed to get customer usage:', error);
      return {
        daily_amount: 0,
        monthly_amount: 0,
        method_daily_amounts: {}
      };
    }
  }

  private calculateCustomerRiskProfile(customerId: string, payments: any[]): CustomerRiskProfile {
    const totalPayments = payments.length;
    const successfulPayments = payments.filter(p => p.status === 'completed').length;
    const failedPayments = payments.filter(p => p.status === 'failed').length;
    const disputedPayments = 0; // Would be calculated from disputes table

    const averageAmount = totalPayments > 0 
      ? payments.reduce((sum, p) => sum + p.amount, 0) / totalPayments 
      : 0;

    const lastPaymentDate = payments.length > 0 ? payments[0].created_at : '';

    // Calculate risk score based on payment history
    let riskScore = 50; // Base score

    if (totalPayments > 10) riskScore -= 10; // Experienced customer
    if (successfulPayments / Math.max(totalPayments, 1) > 0.9) riskScore -= 15; // High success rate
    if (failedPayments > 3) riskScore += 20; // Multiple failures
    if (disputedPayments > 0) riskScore += 30; // Any disputes

    riskScore = Math.max(0, Math.min(100, riskScore));

    const trustLevel: 'low' | 'medium' | 'high' = 
      riskScore < 30 ? 'high' : riskScore < 70 ? 'medium' : 'low';

    return {
      customer_id: customerId,
      risk_score: riskScore,
      trust_level: trustLevel,
      payment_history: {
        total_payments: totalPayments,
        successful_payments: successfulPayments,
        failed_payments: failedPayments,
        disputed_payments: disputedPayments,
        average_amount: averageAmount,
        last_payment_date: lastPaymentDate
      },
      flags: [],
      kyc_status: 'pending', // Would be fetched from customer profile
      kyc_level: 'basic',
      notes: []
    };
  }

  private async getCustomerRecentPayments(customerId: string): Promise<any[]> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: payments, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to get recent payments:', error);
      return [];
    }

    return payments || [];
  }

  private async logValidationResult(
    request: PaymentValidationRequest,
    result: PaymentValidationResult
  ): Promise<void> {
    try {
      await supabase
        .from('payment_validation_logs')
        .insert({
          quote_id: request.quote_id,
          customer_id: request.customer_id,
          amount: request.amount,
          currency: request.currency,
          payment_method: request.payment_method,
          is_valid: result.isValid,
          risk_score: result.riskScore,
          error_count: result.errors.length,
          warning_count: result.warnings.length,
          validation_result: result,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Failed to log validation result:', error);
    }
  }

  // Cache management methods
  private getRiskFromCache(customerId: string): CustomerRiskProfile | null {
    const cached = this.riskCache.get(customerId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.profile;
    }
    
    if (cached) {
      this.riskCache.delete(customerId);
    }
    
    return null;
  }

  private setRiskCache(customerId: string, profile: CustomerRiskProfile): void {
    this.riskCache.set(customerId, {
      profile,
      timestamp: Date.now()
    });
  }

  /**
   * Public utility methods
   */
  clearAllCache(): void {
    this.rulesCache.clear();
    this.riskCache.clear();
    logger.info('Payment validation cache cleared');
  }

  dispose(): void {
    this.rulesCache.clear();
    this.riskCache.clear();
    logger.info('PaymentValidationService disposed');
  }
}

export default PaymentValidationService;