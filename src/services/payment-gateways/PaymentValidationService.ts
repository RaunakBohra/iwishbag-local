/**
 * Payment Validation Service
 * Handles payment request validation and business rules enforcement
 * Decomposed from usePaymentGateways hook for better separation of concerns
 */

import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import type { PaymentGateway } from '@/types/payment';
import type { PaymentRequest } from './PaymentProcessingService';
import PaymentGatewayConfigService from './PaymentGatewayConfigService';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  correctedData?: Partial<PaymentRequest>;
}

export interface PaymentLimits {
  gateway: PaymentGateway;
  min_amount: number;
  max_amount: number;
  daily_limit?: number;
  monthly_limit?: number;
  currency_limits?: Record<string, { min: number; max: number }>;
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  applies_to_gateways: PaymentGateway[];
  rule_type: 'amount' | 'currency' | 'country' | 'frequency' | 'risk' | 'compliance';
  conditions: {
    min_amount?: number;
    max_amount?: number;
    allowed_currencies?: string[];
    blocked_countries?: string[];
    max_daily_transactions?: number;
    max_monthly_amount?: number;
    risk_score_threshold?: number;
    required_verification_level?: string;
  };
  actions: {
    block_payment?: boolean;
    require_manual_review?: boolean;
    apply_additional_fees?: number;
    redirect_to_alternative_gateway?: PaymentGateway;
    require_additional_verification?: boolean;
  };
  is_active: boolean;
  priority: number;
}

export interface RiskAssessment {
  risk_score: number; // 0-100
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: Array<{
    factor: string;
    score: number;
    description: string;
  }>;
  recommendations: string[];
  requires_manual_review: boolean;
  suggested_actions: string[];
}

export interface FraudCheck {
  is_suspicious: boolean;
  fraud_score: number; // 0-100
  fraud_indicators: Array<{
    indicator: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  recommended_action: 'approve' | 'review' | 'decline';
}

export interface ComplianceCheck {
  is_compliant: boolean;
  compliance_issues: Array<{
    issue: string;
    severity: 'minor' | 'major' | 'critical';
    description: string;
    resolution_required: boolean;
  }>;
  required_documents: string[];
  aml_status: 'clear' | 'pending' | 'flagged';
  sanctions_check: 'pass' | 'fail' | 'unknown';
}

export class PaymentValidationService {
  private configService: PaymentGatewayConfigService;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // Default payment limits by gateway
  private readonly DEFAULT_LIMITS: Record<PaymentGateway, PaymentLimits> = {
    stripe: {
      gateway: 'stripe',
      min_amount: 0.50,
      max_amount: 999999,
      daily_limit: 100000,
      monthly_limit: 1000000,
      currency_limits: {
        'USD': { min: 0.50, max: 999999 },
        'EUR': { min: 0.50, max: 999999 },
        'GBP': { min: 0.30, max: 999999 },
      },
    },
    payu: {
      gateway: 'payu',
      min_amount: 1.00,
      max_amount: 500000,
      daily_limit: 50000,
      monthly_limit: 500000,
      currency_limits: {
        'INR': { min: 1.00, max: 500000 },
      },
    },
    paypal: {
      gateway: 'paypal',
      min_amount: 0.01,
      max_amount: 60000,
      daily_limit: 60000,
      monthly_limit: 500000,
      currency_limits: {
        'USD': { min: 0.01, max: 60000 },
        'EUR': { min: 0.01, max: 60000 },
      },
    },
    esewa: {
      gateway: 'esewa',
      min_amount: 10,
      max_amount: 100000,
      daily_limit: 100000,
      monthly_limit: 500000,
      currency_limits: {
        'NPR': { min: 10, max: 100000 },
      },
    },
    khalti: {
      gateway: 'khalti',
      min_amount: 10,
      max_amount: 100000,
      daily_limit: 100000,
      monthly_limit: 500000,
      currency_limits: {
        'NPR': { min: 10, max: 100000 },
      },
    },
    fonepay: {
      gateway: 'fonepay',
      min_amount: 10,
      max_amount: 50000,
      daily_limit: 50000,
      monthly_limit: 200000,
      currency_limits: {
        'NPR': { min: 10, max: 50000 },
      },
    },
    airwallex: {
      gateway: 'airwallex',
      min_amount: 0.01,
      max_amount: 999999,
      daily_limit: 100000,
      monthly_limit: 1000000,
    },
    bank_transfer: {
      gateway: 'bank_transfer',
      min_amount: 1.00,
      max_amount: 999999,
      daily_limit: 999999,
      monthly_limit: 9999999,
    },
    cod: {
      gateway: 'cod',
      min_amount: 1.00,
      max_amount: 10000,
      daily_limit: 50000,
      monthly_limit: 200000,
    },
  };

  constructor(configService?: PaymentGatewayConfigService) {
    this.configService = configService || new PaymentGatewayConfigService();
    logger.info('PaymentValidationService initialized');
  }

  /**
   * Validate payment request comprehensively
   */
  async validatePaymentRequest(request: PaymentRequest): Promise<ValidationResult> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      let correctedData: Partial<PaymentRequest> = {};

      logger.info('Validating payment request:', { 
        gateway: request.gateway, 
        amount: request.amount, 
        currency: request.currency 
      });

      // Basic field validation
      const basicValidation = this.validateBasicFields(request);
      errors.push(...basicValidation.errors);
      warnings.push(...basicValidation.warnings);

      // Amount validation
      const amountValidation = await this.validateAmount(request);
      errors.push(...amountValidation.errors);
      warnings.push(...amountValidation.warnings);

      // Gateway availability validation
      const gatewayValidation = await this.validateGatewayAvailability(request);
      errors.push(...gatewayValidation.errors);
      warnings.push(...gatewayValidation.warnings);

      // Customer validation
      const customerValidation = await this.validateCustomer(request);
      errors.push(...customerValidation.errors);
      warnings.push(...customerValidation.warnings);

      // Business rules validation
      const businessRulesValidation = await this.validateBusinessRules(request);
      errors.push(...businessRulesValidation.errors);
      warnings.push(...businessRulesValidation.warnings);
      if (businessRulesValidation.correctedData) {
        correctedData = { ...correctedData, ...businessRulesValidation.correctedData };
      }

      // Risk assessment
      const riskAssessment = await this.performRiskAssessment(request);
      if (riskAssessment.risk_level === 'critical') {
        errors.push('Payment blocked due to high risk score');
      } else if (riskAssessment.risk_level === 'high') {
        warnings.push('Payment requires manual review due to risk factors');
      }

      // Fraud check
      const fraudCheck = await this.performFraudCheck(request);
      if (fraudCheck.is_suspicious && fraudCheck.recommended_action === 'decline') {
        errors.push('Payment blocked due to fraud detection');
      } else if (fraudCheck.is_suspicious && fraudCheck.recommended_action === 'review') {
        warnings.push('Payment flagged for manual review');
      }

      // Compliance check
      const complianceCheck = await this.performComplianceCheck(request);
      if (!complianceCheck.is_compliant) {
        const criticalIssues = complianceCheck.compliance_issues.filter(issue => issue.severity === 'critical');
        if (criticalIssues.length > 0) {
          errors.push(...criticalIssues.map(issue => `Compliance violation: ${issue.description}`));
        } else {
          warnings.push('Minor compliance issues detected');
        }
      }

      const isValid = errors.length === 0;

      logger.info('Payment validation completed:', {
        isValid,
        errorCount: errors.length,
        warningCount: warnings.length,
        riskLevel: riskAssessment.risk_level,
        fraudScore: fraudCheck.fraud_score
      });

      return {
        isValid,
        errors,
        warnings,
        correctedData: Object.keys(correctedData).length > 0 ? correctedData : undefined,
      };

    } catch (error) {
      logger.error('Payment validation failed:', error);
      Sentry.captureException(error);
      return {
        isValid: false,
        errors: ['Validation process failed'],
        warnings: [],
      };
    }
  }

  /**
   * Validate basic required fields
   */
  private validateBasicFields(request: PaymentRequest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!request.gateway) errors.push('Payment gateway is required');
    if (!request.amount || request.amount <= 0) errors.push('Valid payment amount is required');
    if (!request.currency) errors.push('Currency is required');
    if (!request.order_id) errors.push('Order ID is required');

    // Customer validation
    if (!request.customer) {
      errors.push('Customer information is required');
    } else {
      if (!request.customer.id) errors.push('Customer ID is required');
      if (!request.customer.name) errors.push('Customer name is required');
      if (!request.customer.email) errors.push('Customer email is required');
      
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (request.customer.email && !emailRegex.test(request.customer.email)) {
        errors.push('Valid customer email is required');
      }
    }

    // Currency format validation
    if (request.currency && !/^[A-Z]{3}$/.test(request.currency)) {
      errors.push('Currency must be a 3-letter ISO code (e.g., USD, EUR)');
    }

    // Amount precision validation
    if (request.amount && (request.amount * 100) % 1 !== 0) {
      warnings.push('Amount has more than 2 decimal places and will be rounded');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate payment amount against limits
   */
  private async validateAmount(request: PaymentRequest): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const limits = await this.getPaymentLimits(request.gateway);
      
      // Check minimum amount
      let minAmount = limits.min_amount;
      if (limits.currency_limits?.[request.currency]) {
        minAmount = limits.currency_limits[request.currency].min;
      }
      
      if (request.amount < minAmount) {
        errors.push(`Minimum amount for ${request.gateway} is ${request.currency} ${minAmount}`);
      }

      // Check maximum amount
      let maxAmount = limits.max_amount;
      if (limits.currency_limits?.[request.currency]) {
        maxAmount = limits.currency_limits[request.currency].max;
      }
      
      if (request.amount > maxAmount) {
        errors.push(`Maximum amount for ${request.gateway} is ${request.currency} ${maxAmount}`);
      }

      // Check daily and monthly limits (would require historical transaction data)
      const dailyTotal = await this.getDailyTransactionTotal(request.customer.id, request.gateway);
      if (limits.daily_limit && (dailyTotal + request.amount) > limits.daily_limit) {
        errors.push(`Daily limit exceeded for ${request.gateway}`);
      }

      const monthlyTotal = await this.getMonthlyTransactionTotal(request.customer.id, request.gateway);
      if (limits.monthly_limit && (monthlyTotal + request.amount) > limits.monthly_limit) {
        errors.push(`Monthly limit exceeded for ${request.gateway}`);
      }

      // Warning for high amounts
      if (request.amount > 10000) {
        warnings.push('Large transaction amount may require additional verification');
      }

    } catch (error) {
      logger.error('Amount validation error:', error);
      warnings.push('Unable to validate amount limits');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate gateway availability and configuration
   */
  private async validateGatewayAvailability(request: PaymentRequest): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if gateway is supported
      const supportedGateways: PaymentGateway[] = [
        'stripe', 'payu', 'paypal', 'esewa', 'khalti', 'fonepay', 'airwallex', 'bank_transfer', 'cod'
      ];
      
      if (!supportedGateways.includes(request.gateway)) {
        errors.push(`Unsupported payment gateway: ${request.gateway}`);
        return { isValid: false, errors, warnings };
      }

      // Check gateway configuration
      const config = await this.configService.getGatewayConfig(request.gateway);
      if (!config) {
        errors.push(`Gateway ${request.gateway} is not configured`);
        return { isValid: false, errors, warnings };
      }

      // Validate credentials
      const validation = this.configService.validateGatewayCredentials(config);
      if (!validation.hasValidCredentials) {
        errors.push(`Gateway ${request.gateway} has invalid credentials`);
      }

      // Check currency support
      const supportsCurrency = await this.configService.supportsCurrency(request.gateway, request.currency);
      if (!supportsCurrency) {
        errors.push(`Gateway ${request.gateway} does not support currency ${request.currency}`);
      }

      // Test mode warning
      if (validation.isTestMode) {
        warnings.push(`Gateway ${request.gateway} is in test mode`);
      }

    } catch (error) {
      logger.error('Gateway availability validation error:', error);
      errors.push('Unable to validate gateway availability');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate customer information and eligibility
   */
  private async validateCustomer(request: PaymentRequest): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check customer blacklist status
      const isBlacklisted = await this.isCustomerBlacklisted(request.customer.id);
      if (isBlacklisted) {
        errors.push('Customer is not eligible for payments');
        return { isValid: false, errors, warnings };
      }

      // Check customer verification status
      const verificationStatus = await this.getCustomerVerificationStatus(request.customer.id);
      
      // Some gateways require verified customers
      const requiresVerification = ['esewa', 'khalti', 'fonepay'].includes(request.gateway);
      if (requiresVerification && verificationStatus !== 'verified') {
        errors.push(`Payment method ${request.gateway} requires verified customer account`);
      }

      // Check for COD eligibility
      if (request.gateway === 'cod') {
        const codEligible = await this.isCODEligible(request);
        if (!codEligible.eligible) {
          errors.push(codEligible.reason || 'Not eligible for Cash on Delivery');
        }
      }

      // Phone number validation for certain gateways
      const requiresPhone = ['khalti', 'fonepay', 'cod'].includes(request.gateway);
      if (requiresPhone && !request.customer.phone) {
        errors.push(`Payment method ${request.gateway} requires customer phone number`);
      }

      // Warning for new customers
      const isNewCustomer = await this.isNewCustomer(request.customer.id);
      if (isNewCustomer && request.amount > 1000) {
        warnings.push('Large transaction from new customer may require additional verification');
      }

    } catch (error) {
      logger.error('Customer validation error:', error);
      warnings.push('Unable to fully validate customer information');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate against business rules
   */
  private async validateBusinessRules(request: PaymentRequest): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let correctedData: Partial<PaymentRequest> = {};

    try {
      const businessRules = await this.getActiveBusinessRules();
      const applicableRules = businessRules.filter(rule => 
        rule.applies_to_gateways.includes(request.gateway)
      );

      for (const rule of applicableRules) {
        const ruleResult = this.evaluateBusinessRule(rule, request);
        
        if (ruleResult.violated) {
          if (rule.actions.block_payment) {
            errors.push(`Business rule violation: ${rule.description}`);
          } else if (rule.actions.require_manual_review) {
            warnings.push(`Manual review required: ${rule.description}`);
          }

          if (rule.actions.redirect_to_alternative_gateway) {
            correctedData.gateway = rule.actions.redirect_to_alternative_gateway;
            warnings.push(`Redirected to alternative gateway: ${rule.actions.redirect_to_alternative_gateway}`);
          }

          if (rule.actions.require_additional_verification) {
            warnings.push('Additional verification required');
          }
        }
      }

    } catch (error) {
      logger.error('Business rules validation error:', error);
      warnings.push('Unable to validate business rules');
    }

    return { 
      isValid: errors.length === 0, 
      errors, 
      warnings,
      correctedData: Object.keys(correctedData).length > 0 ? correctedData : undefined
    };
  }

  /**
   * Perform risk assessment
   */
  private async performRiskAssessment(request: PaymentRequest): Promise<RiskAssessment> {
    try {
      const riskFactors: Array<{ factor: string; score: number; description: string }> = [];
      let totalRiskScore = 0;

      // Amount risk
      if (request.amount > 5000) {
        const amountRisk = Math.min(30, (request.amount / 1000) * 2);
        riskFactors.push({
          factor: 'high_amount',
          score: amountRisk,
          description: 'Large transaction amount',
        });
        totalRiskScore += amountRisk;
      }

      // New customer risk
      const isNewCustomer = await this.isNewCustomer(request.customer.id);
      if (isNewCustomer) {
        riskFactors.push({
          factor: 'new_customer',
          score: 15,
          description: 'New customer account',
        });
        totalRiskScore += 15;
      }

      // Unusual hour risk
      const hour = new Date().getHours();
      if (hour < 6 || hour > 22) {
        riskFactors.push({
          factor: 'unusual_hour',
          score: 10,
          description: 'Transaction outside business hours',
        });
        totalRiskScore += 10;
      }

      // Frequent transactions risk
      const recentTransactions = await this.getRecentTransactionCount(request.customer.id);
      if (recentTransactions > 5) {
        riskFactors.push({
          factor: 'frequent_transactions',
          score: 20,
          description: 'Multiple recent transactions',
        });
        totalRiskScore += 20;
      }

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (totalRiskScore > 70) riskLevel = 'critical';
      else if (totalRiskScore > 50) riskLevel = 'high';
      else if (totalRiskScore > 30) riskLevel = 'medium';

      const recommendations: string[] = [];
      const suggestedActions: string[] = [];

      if (riskLevel === 'high' || riskLevel === 'critical') {
        recommendations.push('Consider additional verification');
        suggestedActions.push('Require manual review');
      }

      return {
        risk_score: Math.min(100, totalRiskScore),
        risk_level: riskLevel,
        risk_factors: riskFactors,
        recommendations,
        requires_manual_review: riskLevel === 'high' || riskLevel === 'critical',
        suggested_actions: suggestedActions,
      };

    } catch (error) {
      logger.error('Risk assessment error:', error);
      return {
        risk_score: 50, // Default medium risk
        risk_level: 'medium',
        risk_factors: [],
        recommendations: ['Risk assessment unavailable'],
        requires_manual_review: true,
        suggested_actions: ['Manual review recommended'],
      };
    }
  }

  /**
   * Perform fraud check
   */
  private async performFraudCheck(request: PaymentRequest): Promise<FraudCheck> {
    try {
      const fraudIndicators: Array<{
        indicator: string;
        severity: 'low' | 'medium' | 'high';
        description: string;
      }> = [];

      let fraudScore = 0;

      // Email domain check
      const emailDomain = request.customer.email.split('@')[1];
      const suspiciousDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
      if (suspiciousDomains.includes(emailDomain)) {
        fraudIndicators.push({
          indicator: 'suspicious_email_domain',
          severity: 'high',
          description: 'Temporary or suspicious email domain',
        });
        fraudScore += 40;
      }

      // Round number amounts (often used in fraud)
      if (request.amount % 100 === 0 && request.amount > 1000) {
        fraudIndicators.push({
          indicator: 'round_amount',
          severity: 'low',
          description: 'Suspiciously round payment amount',
        });
        fraudScore += 10;
      }

      // Multiple rapid transactions
      const rapidTransactions = await this.getRapidTransactionCount(request.customer.id);
      if (rapidTransactions > 3) {
        fraudIndicators.push({
          indicator: 'rapid_transactions',
          severity: 'high',
          description: 'Multiple transactions in short timeframe',
        });
        fraudScore += 35;
      }

      let recommendedAction: 'approve' | 'review' | 'decline' = 'approve';
      if (fraudScore > 60) recommendedAction = 'decline';
      else if (fraudScore > 30) recommendedAction = 'review';

      return {
        is_suspicious: fraudScore > 30,
        fraud_score: Math.min(100, fraudScore),
        fraud_indicators: fraudIndicators,
        recommended_action: recommendedAction,
      };

    } catch (error) {
      logger.error('Fraud check error:', error);
      return {
        is_suspicious: true,
        fraud_score: 50,
        fraud_indicators: [],
        recommended_action: 'review',
      };
    }
  }

  /**
   * Perform compliance check
   */
  private async performComplianceCheck(request: PaymentRequest): Promise<ComplianceCheck> {
    try {
      const complianceIssues: Array<{
        issue: string;
        severity: 'minor' | 'major' | 'critical';
        description: string;
        resolution_required: boolean;
      }> = [];

      // High-value transaction reporting
      if (request.amount > 10000) {
        complianceIssues.push({
          issue: 'high_value_transaction',
          severity: 'major',
          description: 'Transaction exceeds reporting threshold',
          resolution_required: true,
        });
      }

      // Sanctions check (simplified)
      const sanctionsStatus = await this.checkSanctionsList(request.customer.email);
      
      return {
        is_compliant: complianceIssues.filter(issue => issue.severity === 'critical').length === 0,
        compliance_issues: complianceIssues,
        required_documents: request.amount > 10000 ? ['identity_verification'] : [],
        aml_status: 'clear', // Would integrate with actual AML service
        sanctions_check: sanctionsStatus,
      };

    } catch (error) {
      logger.error('Compliance check error:', error);
      return {
        is_compliant: false,
        compliance_issues: [{
          issue: 'compliance_check_failed',
          severity: 'major',
          description: 'Unable to perform compliance check',
          resolution_required: true,
        }],
        required_documents: [],
        aml_status: 'pending',
        sanctions_check: 'unknown',
      };
    }
  }

  /**
   * Helper methods for data retrieval
   */
  private async getPaymentLimits(gateway: PaymentGateway): Promise<PaymentLimits> {
    return this.DEFAULT_LIMITS[gateway] || this.DEFAULT_LIMITS.stripe;
  }

  private async getDailyTransactionTotal(customerId: string, gateway: PaymentGateway): Promise<number> {
    // Would query database for daily transaction total
    return 0; // Mock implementation
  }

  private async getMonthlyTransactionTotal(customerId: string, gateway: PaymentGateway): Promise<number> {
    // Would query database for monthly transaction total
    return 0; // Mock implementation
  }

  private async isCustomerBlacklisted(customerId: string): Promise<boolean> {
    // Would check customer blacklist
    return false; // Mock implementation
  }

  private async getCustomerVerificationStatus(customerId: string): Promise<string> {
    // Would get customer verification status
    return 'verified'; // Mock implementation
  }

  private async isCODEligible(request: PaymentRequest): Promise<{ eligible: boolean; reason?: string }> {
    // COD eligibility checks
    if (request.amount > 5000) {
      return { eligible: false, reason: 'Amount exceeds COD limit' };
    }
    return { eligible: true };
  }

  private async isNewCustomer(customerId: string): Promise<boolean> {
    // Would check customer age/transaction history
    return false; // Mock implementation
  }

  private async getActiveBusinessRules(): Promise<BusinessRule[]> {
    // Would fetch from database
    return []; // Mock implementation
  }

  private evaluateBusinessRule(rule: BusinessRule, request: PaymentRequest): { violated: boolean } {
    // Evaluate business rule against request
    return { violated: false }; // Mock implementation
  }

  private async getRecentTransactionCount(customerId: string): Promise<number> {
    // Would count recent transactions
    return 0; // Mock implementation
  }

  private async getRapidTransactionCount(customerId: string): Promise<number> {
    // Would count transactions in last hour
    return 0; // Mock implementation
  }

  private async checkSanctionsList(email: string): Promise<'pass' | 'fail' | 'unknown'> {
    // Would check against sanctions lists
    return 'pass'; // Mock implementation
  }

  /**
   * Cache management utilities
   */
  private getCacheKey(operation: string, params: any = {}): string {
    return `payment_validation_${operation}_${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cache.clear();
    logger.info('PaymentValidationService cleanup completed');
  }
}

export default PaymentValidationService;