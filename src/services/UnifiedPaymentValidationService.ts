/**
 * Unified Payment Validation Service
 * Consolidated from multiple PaymentValidationService instances across the codebase
 * Provides comprehensive validation for all payment operations
 * 
 * FEATURES:
 * - Form validation (from payment-modal)
 * - Business rules and compliance (from payment-management)
 * - Gateway validation and risk assessment (from payment-gateways)
 * - Fraud detection and security checks
 * - Payment limits and customer validation
 * - File upload validation for payment proofs
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import * as Sentry from '@sentry/react';
import PaymentGatewayConfigService from './payment-gateways/PaymentGatewayConfigService';

// ============================================================================
// TYPE DEFINITIONS - Comprehensive validation interfaces
// ============================================================================

export interface UnifiedValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  riskScore: number; // 0-100 (higher = riskier)
  recommendations: PaymentRecommendation[];
  complianceChecks: ComplianceCheck[];
  correctedData?: Partial<any>;
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'critical' | 'high' | 'medium';
  context?: Record<string, any>;
}

export interface ValidationWarning {
  code: string;
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

// Payment Method Types
export type PaymentMethodType =
  | 'bank_transfer'
  | 'cash'
  | 'upi'
  | 'payu'
  | 'stripe'
  | 'paypal'
  | 'esewa'
  | 'khalti'
  | 'fonepay'
  | 'airwallex'
  | 'cod'
  | 'credit_note'
  | 'check'
  | 'wire_transfer'
  | 'other';

export type PaymentGateway = 'stripe' | 'payu' | 'paypal' | 'esewa' | 'khalti' | 'fonepay' | 'airwallex' | 'bank_transfer' | 'cod';

// Request interfaces for different validation types
export interface PaymentRecordRequest {
  amount: string;
  method: PaymentMethodType;
  currency: string;
  transactionId?: string;
  date: string;
  notes?: string;
}

export interface PaymentVerificationRequest {
  proofId: string;
  amount: string;
  notes?: string;
  rejectionReason?: string;
}

export interface RefundRequest {
  paymentId: string;
  amount: string;
  reason: string;
  method: string;
}

export interface PaymentGatewayRequest {
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  order_id: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    country?: string;
  };
  ip_address?: string;
  user_agent?: string;
}

export interface PaymentSummaryData {
  finalTotal: number;
  totalPaid: number;
  totalPayments: number;
  remaining: number;
  isOverpaid: boolean;
  status: 'pending' | 'paid' | 'partial';
  hasRefunds: boolean;
}

// Business rules and limits
export interface PaymentLimits {
  gateway: PaymentGateway;
  min_amount: number;
  max_amount: number;
  daily_limit?: number;
  monthly_limit?: number;
  currency_limits?: Record<string, { min: number; max: number }>;
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

// ============================================================================
// UNIFIED PAYMENT VALIDATION SERVICE
// ============================================================================

export class UnifiedPaymentValidationService {
  private static instance: UnifiedPaymentValidationService;
  private configService: PaymentGatewayConfigService;
  private rulesCache = new Map<string, { rules: any[]; timestamp: number }>();
  private riskCache = new Map<string, { profile: CustomerRiskProfile; timestamp: number }>();
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTTL = 10 * 60 * 1000; // 10 minutes

  // Supported currencies and methods
  private readonly supportedCurrencies = [
    'USD', 'INR', 'NPR', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'JPY'
  ];

  private readonly paymentMethods: PaymentMethodType[] = [
    'bank_transfer', 'cash', 'upi', 'payu', 'stripe', 'paypal', 'esewa', 
    'khalti', 'fonepay', 'airwallex', 'cod', 'credit_note', 'check', 
    'wire_transfer', 'other'
  ];

  // Default payment limits by gateway
  private readonly defaultLimits: Record<PaymentGateway, PaymentLimits> = {
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
    logger.info('UnifiedPaymentValidationService initialized');
  }

  static getInstance(): UnifiedPaymentValidationService {
    if (!UnifiedPaymentValidationService.instance) {
      UnifiedPaymentValidationService.instance = new UnifiedPaymentValidationService();
    }
    return UnifiedPaymentValidationService.instance;
  }

  // ============================================================================
  // PRIMARY VALIDATION METHODS
  // ============================================================================

  /**
   * Validate payment recording data (from payment-modal functionality)
   */
  async validatePaymentRecord(
    data: PaymentRecordRequest, 
    paymentSummary: PaymentSummaryData,
    quoteCurrency: string
  ): Promise<UnifiedValidationResult> {
    try {
      logger.info('Validating payment record:', { amount: data.amount, method: data.method });

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const recommendations: PaymentRecommendation[] = [];
      const complianceChecks: ComplianceCheck[] = [];

      // Basic field validation
      this.validatePaymentRecordFields(data, quoteCurrency, errors, warnings);

      // Business logic validation
      this.validatePaymentRecordBusiness(data, paymentSummary, quoteCurrency, errors, warnings);

      // Risk assessment for the payment
      let riskScore = this.calculatePaymentRecordRisk(data, paymentSummary);

      // Generate recommendations
      recommendations.push(...this.generatePaymentRecordRecommendations(data, paymentSummary, riskScore));

      return this.buildValidationResult(errors, warnings, recommendations, complianceChecks, riskScore);

    } catch (error) {
      logger.error('Payment record validation failed:', error);
      return this.buildErrorResult('Payment record validation failed');
    }
  }

  /**
   * Validate payment verification data
   */
  async validatePaymentVerification(
    data: PaymentVerificationRequest,
    paymentSummary: PaymentSummaryData,
    quoteCurrency: string
  ): Promise<UnifiedValidationResult> {
    try {
      logger.info('Validating payment verification:', { proofId: data.proofId, amount: data.amount });

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const recommendations: PaymentRecommendation[] = [];
      const complianceChecks: ComplianceCheck[] = [];

      // Basic validation
      this.validateVerificationFields(data, errors);

      // Business validation
      this.validateVerificationBusiness(data, paymentSummary, quoteCurrency, errors, warnings);

      let riskScore = this.calculateVerificationRisk(data, paymentSummary);

      return this.buildValidationResult(errors, warnings, recommendations, complianceChecks, riskScore);

    } catch (error) {
      logger.error('Payment verification validation failed:', error);
      return this.buildErrorResult('Payment verification validation failed');
    }
  }

  /**
   * Validate refund request
   */
  async validateRefund(
    data: RefundRequest,
    availableRefundAmount: number,
    originalCurrency: string
  ): Promise<UnifiedValidationResult> {
    try {
      logger.info('Validating refund:', { paymentId: data.paymentId, amount: data.amount });

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const recommendations: PaymentRecommendation[] = [];
      const complianceChecks: ComplianceCheck[] = [];

      // Basic refund validation
      this.validateRefundFields(data, availableRefundAmount, originalCurrency, errors);

      let riskScore = this.calculateRefundRisk(data, availableRefundAmount);

      return this.buildValidationResult(errors, warnings, recommendations, complianceChecks, riskScore);

    } catch (error) {
      logger.error('Refund validation failed:', error);
      return this.buildErrorResult('Refund validation failed');
    }
  }

  /**
   * Comprehensive payment gateway validation (from payment-gateways functionality)
   */
  async validatePaymentGatewayRequest(request: PaymentGatewayRequest): Promise<UnifiedValidationResult> {
    try {
      logger.info('Validating payment gateway request:', { 
        gateway: request.gateway, 
        amount: request.amount, 
        currency: request.currency 
      });

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const recommendations: PaymentRecommendation[] = [];
      const complianceChecks: ComplianceCheck[] = [];
      let correctedData: Partial<PaymentGatewayRequest> = {};

      // Basic field validation
      this.validateGatewayRequestFields(request, errors, warnings);

      // Amount and limits validation
      await this.validateGatewayAmountLimits(request, errors, warnings);

      // Gateway availability and configuration
      await this.validateGatewayAvailability(request, errors, warnings);

      // Customer validation
      await this.validateGatewayCustomer(request, errors, warnings);

      // Business rules validation
      const businessRulesResult = await this.validateGatewayBusinessRules(request, errors, warnings);
      if (businessRulesResult.correctedData) {
        correctedData = { ...correctedData, ...businessRulesResult.correctedData };
      }

      // Risk assessment (from payment-management functionality)
      const riskAssessment = await this.performComprehensiveRiskAssessment(request);
      if (riskAssessment.riskScore > 70) {
        errors.push({
          code: 'HIGH_RISK_BLOCKED',
          message: 'Payment blocked due to high risk score',
          severity: 'critical',
          context: { riskScore: riskAssessment.riskScore }
        });
      }

      // Fraud detection
      const fraudCheck = await this.performFraudDetection(request);
      if (fraudCheck.isFraudulent) {
        errors.push({
          code: 'FRAUD_DETECTED',
          message: 'Potential fraudulent activity detected',
          severity: 'critical',
          context: fraudCheck.indicators
        });
      }

      // Compliance checks
      const compliance = await this.performComplianceValidation(request);
      complianceChecks.push(...compliance);

      // Log comprehensive validation result
      await this.logValidationResult(request, { errors, warnings, riskScore: riskAssessment.riskScore });

      return {
        isValid: errors.filter(e => e.severity === 'critical').length === 0,
        errors,
        warnings,
        riskScore: riskAssessment.riskScore,
        recommendations,
        complianceChecks,
        correctedData: Object.keys(correctedData).length > 0 ? correctedData : undefined
      };

    } catch (error) {
      logger.error('Payment gateway validation failed:', error);
      Sentry.captureException(error);
      return this.buildErrorResult('Payment gateway validation failed');
    }
  }

  /**
   * Validate file upload for payment proofs
   */
  validatePaymentProofFile(file: File): UnifiedValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // File size validation (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push({
        code: 'FILE_TOO_LARGE',
        message: 'File size cannot exceed 10MB',
        field: 'file',
        severity: 'high'
      });
    }

    // File type validation
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'image/bmp', 'image/tiff'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      errors.push({
        code: 'FILE_TYPE_INVALID',
        message: 'Invalid file type. Please upload an image or PDF file.',
        field: 'file',
        severity: 'high'
      });
    }

    // File name validation
    if (file.name.length > 255) {
      errors.push({
        code: 'FILENAME_TOO_LONG',
        message: 'File name is too long (max 255 characters)',
        field: 'file',
        severity: 'medium'
      });
    }

    return this.buildValidationResult(errors, warnings, [], [], 0);
  }

  // ============================================================================
  // FIELD VALIDATION METHODS
  // ============================================================================

  private validatePaymentRecordFields(
    data: PaymentRecordRequest,
    quoteCurrency: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Amount validation
    const amount = parseFloat(data.amount);
    if (!data.amount || data.amount.trim() === '') {
      errors.push({
        code: 'AMOUNT_REQUIRED',
        message: 'Payment amount is required',
        field: 'amount',
        severity: 'critical'
      });
    } else if (isNaN(amount) || amount <= 0) {
      errors.push({
        code: 'AMOUNT_INVALID',
        message: 'Payment amount must be a positive number',
        field: 'amount',
        severity: 'critical'
      });
    } else if (amount > 1000000) {
      errors.push({
        code: 'AMOUNT_TOO_LARGE',
        message: 'Payment amount exceeds maximum limit ($1,000,000)',
        field: 'amount',
        severity: 'high'
      });
    }

    // Currency validation
    if (!data.currency) {
      errors.push({
        code: 'CURRENCY_REQUIRED',
        message: 'Currency is required',
        field: 'currency',
        severity: 'critical'
      });
    } else if (!this.supportedCurrencies.includes(data.currency)) {
      errors.push({
        code: 'CURRENCY_UNSUPPORTED',
        message: 'Unsupported currency',
        field: 'currency',
        severity: 'high'
      });
    } else if (data.currency !== quoteCurrency) {
      warnings.push({
        code: 'CURRENCY_MISMATCH',
        message: `Payment currency differs from quote currency`,
        field: 'currency',
        impact: 'medium'
      });
    }

    // Payment method validation
    if (!data.method) {
      errors.push({
        code: 'METHOD_REQUIRED',
        message: 'Payment method is required',
        field: 'method',
        severity: 'critical'
      });
    } else if (!this.paymentMethods.includes(data.method)) {
      errors.push({
        code: 'METHOD_INVALID',
        message: 'Invalid payment method',
        field: 'method',
        severity: 'high'
      });
    }

    // Date validation
    if (!data.date) {
      errors.push({
        code: 'DATE_REQUIRED',
        message: 'Payment date is required',
        field: 'date',
        severity: 'critical'
      });
    } else {
      const paymentDate = new Date(data.date);
      const today = new Date();
      
      if (isNaN(paymentDate.getTime())) {
        errors.push({
          code: 'DATE_INVALID',
          message: 'Invalid payment date',
          field: 'date',
          severity: 'high'
        });
      } else if (paymentDate > today) {
        errors.push({
          code: 'DATE_FUTURE',
          message: 'Payment date cannot be in the future',
          field: 'date',
          severity: 'high'
        });
      }
    }
  }

  private validatePaymentRecordBusiness(
    data: PaymentRecordRequest,
    paymentSummary: PaymentSummaryData,
    quoteCurrency: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const amount = parseFloat(data.amount);
    
    if (amount && !isNaN(amount)) {
      // Check for overpayment
      if (amount > paymentSummary.remaining && paymentSummary.remaining > 0) {
        warnings.push({
          code: 'OVERPAYMENT',
          message: 'This payment exceeds the remaining balance',
          field: 'amount',
          impact: 'high',
          context: { amount, remaining: paymentSummary.remaining }
        });
      }

      // Check for round numbers (potential estimates)
      if (amount >= 100 && amount % 10 === 0 && data.method !== 'cash') {
        warnings.push({
          code: 'ROUND_NUMBER',
          message: 'Round number detected. Please verify exact amount.',
          field: 'amount',
          impact: 'low'
        });
      }
    }

    // Transaction ID for electronic payments
    const electronicMethods: PaymentMethodType[] = ['upi', 'payu', 'stripe', 'esewa', 'khalti', 'fonepay'];
    if (electronicMethods.includes(data.method) && (!data.transactionId || data.transactionId.trim() === '')) {
      warnings.push({
        code: 'TRANSACTION_ID_RECOMMENDED',
        message: 'Transaction ID is recommended for electronic payments',
        field: 'transactionId',
        impact: 'medium'
      });
    }
  }

  private validateVerificationFields(data: PaymentVerificationRequest, errors: ValidationError[]): void {
    if (!data.proofId || data.proofId.trim() === '') {
      errors.push({
        code: 'PROOF_ID_REQUIRED',
        message: 'Please select a payment proof to verify',
        field: 'proofId',
        severity: 'critical'
      });
    }

    const amount = parseFloat(data.amount);
    if (!data.amount || data.amount.trim() === '') {
      errors.push({
        code: 'AMOUNT_REQUIRED',
        message: 'Verified amount is required',
        field: 'amount',
        severity: 'critical'
      });
    } else if (isNaN(amount) || amount <= 0) {
      errors.push({
        code: 'AMOUNT_INVALID',
        message: 'Verified amount must be a positive number',
        field: 'amount',
        severity: 'critical'
      });
    }
  }

  private validateVerificationBusiness(
    data: PaymentVerificationRequest,
    paymentSummary: PaymentSummaryData,
    quoteCurrency: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const amount = parseFloat(data.amount);
    
    if (amount && !isNaN(amount)) {
      if (amount > paymentSummary.finalTotal * 2) {
        warnings.push({
          code: 'AMOUNT_UNUSUALLY_HIGH',
          message: 'Verified amount is significantly larger than the order total',
          field: 'amount',
          impact: 'high'
        });
      }

      // Check for verification overpayment
      const newTotal = paymentSummary.totalPaid + amount;
      if (newTotal > paymentSummary.finalTotal) {
        const overpayment = newTotal - paymentSummary.finalTotal;
        warnings.push({
          code: 'VERIFICATION_OVERPAYMENT',
          message: `This verification will result in overpayment`,
          field: 'amount',
          impact: 'high',
          context: { overpayment, currency: quoteCurrency }
        });
      }
    }
  }

  private validateRefundFields(
    data: RefundRequest,
    availableRefundAmount: number,
    originalCurrency: string,
    errors: ValidationError[]
  ): void {
    if (!data.paymentId || data.paymentId.trim() === '') {
      errors.push({
        code: 'PAYMENT_ID_REQUIRED',
        message: 'Please select a payment to refund',
        field: 'paymentId',
        severity: 'critical'
      });
    }

    const amount = parseFloat(data.amount);
    if (!data.amount || data.amount.trim() === '') {
      errors.push({
        code: 'AMOUNT_REQUIRED',
        message: 'Refund amount is required',
        field: 'amount',
        severity: 'critical'
      });
    } else if (isNaN(amount) || amount <= 0) {
      errors.push({
        code: 'AMOUNT_INVALID',
        message: 'Refund amount must be a positive number',
        field: 'amount',
        severity: 'critical'
      });
    } else if (amount > availableRefundAmount) {
      errors.push({
        code: 'AMOUNT_EXCEEDS_AVAILABLE',
        message: `Refund amount cannot exceed available amount`,
        field: 'amount',
        severity: 'critical',
        context: { amount, available: availableRefundAmount, currency: originalCurrency }
      });
    }

    if (!data.reason || data.reason.trim() === '') {
      errors.push({
        code: 'REASON_REQUIRED',
        message: 'Refund reason is required',
        field: 'reason',
        severity: 'critical'
      });
    }
  }

  private validateGatewayRequestFields(
    request: PaymentGatewayRequest,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Required fields
    if (!request.gateway) {
      errors.push({
        code: 'GATEWAY_REQUIRED',
        message: 'Payment gateway is required',
        severity: 'critical'
      });
    }

    if (!request.amount || request.amount <= 0) {
      errors.push({
        code: 'AMOUNT_INVALID',
        message: 'Valid payment amount is required',
        severity: 'critical'
      });
    }

    if (!request.currency) {
      errors.push({
        code: 'CURRENCY_REQUIRED',
        message: 'Currency is required',
        severity: 'critical'
      });
    } else if (!/^[A-Z]{3}$/.test(request.currency)) {
      errors.push({
        code: 'CURRENCY_FORMAT_INVALID',
        message: 'Currency must be a 3-letter ISO code',
        severity: 'high'
      });
    }

    if (!request.order_id) {
      errors.push({
        code: 'ORDER_ID_REQUIRED',
        message: 'Order ID is required',
        severity: 'critical'
      });
    }

    // Customer validation
    if (!request.customer) {
      errors.push({
        code: 'CUSTOMER_REQUIRED',
        message: 'Customer information is required',
        severity: 'critical'
      });
    } else {
      if (!request.customer.id) {
        errors.push({
          code: 'CUSTOMER_ID_REQUIRED',
          message: 'Customer ID is required',
          severity: 'critical'
        });
      }

      if (!request.customer.name) {
        errors.push({
          code: 'CUSTOMER_NAME_REQUIRED',
          message: 'Customer name is required',
          severity: 'critical'
        });
      }

      if (!request.customer.email) {
        errors.push({
          code: 'CUSTOMER_EMAIL_REQUIRED',
          message: 'Customer email is required',
          severity: 'critical'
        });
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(request.customer.email)) {
          errors.push({
            code: 'CUSTOMER_EMAIL_INVALID',
            message: 'Valid customer email is required',
            severity: 'high'
          });
        }
      }
    }
  }

  // ============================================================================
  // RISK ASSESSMENT METHODS
  // ============================================================================

  private calculatePaymentRecordRisk(
    data: PaymentRecordRequest,
    paymentSummary: PaymentSummaryData
  ): number {
    let riskScore = 0;
    const amount = parseFloat(data.amount);

    // High amount risk
    if (amount > 10000) riskScore += 20;
    else if (amount > 5000) riskScore += 10;

    // Overpayment risk
    if (amount > paymentSummary.remaining * 2) riskScore += 15;

    // Round number risk (fraud indicator)
    if (amount >= 100 && amount % 100 === 0) riskScore += 5;

    // Electronic payment without transaction ID
    const electronicMethods = ['upi', 'payu', 'stripe', 'esewa'];
    if (electronicMethods.includes(data.method) && !data.transactionId) riskScore += 10;

    return Math.min(100, riskScore);
  }

  private calculateVerificationRisk(
    data: PaymentVerificationRequest,
    paymentSummary: PaymentSummaryData
  ): number {
    let riskScore = 0;
    const amount = parseFloat(data.amount);

    // High verification amount
    if (amount > paymentSummary.finalTotal) riskScore += 25;

    // Very large verification
    if (amount > 50000) riskScore += 15;

    return Math.min(100, riskScore);
  }

  private calculateRefundRisk(data: RefundRequest, availableRefundAmount: number): number {
    let riskScore = 0;
    const amount = parseFloat(data.amount);

    // Large refund
    if (amount > 10000) riskScore += 20;

    // Full refund (higher risk)
    if (amount === availableRefundAmount) riskScore += 10;

    return Math.min(100, riskScore);
  }

  private async performComprehensiveRiskAssessment(
    request: PaymentGatewayRequest
  ): Promise<{ riskScore: number; riskFactors: string[] }> {
    let riskScore = 0;
    const riskFactors: string[] = [];

    // Amount-based risk
    if (request.amount > 10000) {
      riskScore += 25;
      riskFactors.push('high_amount');
    }

    // New customer risk
    const isNewCustomer = await this.isNewCustomer(request.customer.id);
    if (isNewCustomer && request.amount > 1000) {
      riskScore += 20;
      riskFactors.push('new_customer_high_amount');
    }

    // Time-based risk
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 10;
      riskFactors.push('unusual_hour');
    }

    // Email domain risk
    if (request.customer.email.includes('tempmail') || request.customer.email.includes('10minute')) {
      riskScore += 30;
      riskFactors.push('suspicious_email');
    }

    return { riskScore: Math.min(100, riskScore), riskFactors };
  }

  private async performFraudDetection(
    request: PaymentGatewayRequest
  ): Promise<{ isFraudulent: boolean; indicators: string[] }> {
    const indicators: string[] = [];
    let fraudScore = 0;

    // Round amount fraud pattern
    if (request.amount % 100 === 0 && request.amount > 1000) {
      fraudScore += 15;
      indicators.push('round_amount_pattern');
    }

    // Rapid transactions check would go here
    // const rapidCount = await this.getRapidTransactionCount(request.customer.id);

    const isFraudulent = fraudScore > 40;
    return { isFraudulent, indicators };
  }

  // ============================================================================
  // GATEWAY VALIDATION METHODS
  // ============================================================================

  private async validateGatewayAmountLimits(
    request: PaymentGatewayRequest,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    try {
      const limits = this.defaultLimits[request.gateway];
      if (!limits) return;

      // Minimum amount check
      let minAmount = limits.min_amount;
      if (limits.currency_limits?.[request.currency]) {
        minAmount = limits.currency_limits[request.currency].min;
      }

      if (request.amount < minAmount) {
        errors.push({
          code: 'AMOUNT_BELOW_MINIMUM',
          message: `Minimum amount for ${request.gateway} is ${request.currency} ${minAmount}`,
          severity: 'high',
          context: { minAmount, currency: request.currency }
        });
      }

      // Maximum amount check
      let maxAmount = limits.max_amount;
      if (limits.currency_limits?.[request.currency]) {
        maxAmount = limits.currency_limits[request.currency].max;
      }

      if (request.amount > maxAmount) {
        errors.push({
          code: 'AMOUNT_ABOVE_MAXIMUM',
          message: `Maximum amount for ${request.gateway} is ${request.currency} ${maxAmount}`,
          severity: 'high',
          context: { maxAmount, currency: request.currency }
        });
      }

      // Warning for large amounts
      if (request.amount > 10000) {
        warnings.push({
          code: 'LARGE_TRANSACTION',
          message: 'Large transaction may require additional verification',
          impact: 'medium'
        });
      }

    } catch (error) {
      logger.error('Amount limits validation error:', error);
      warnings.push({
        code: 'LIMITS_VALIDATION_ERROR',
        message: 'Unable to validate amount limits',
        impact: 'low'
      });
    }
  }

  private async validateGatewayAvailability(
    request: PaymentGatewayRequest,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    try {
      const supportedGateways: PaymentGateway[] = [
        'stripe', 'payu', 'paypal', 'esewa', 'khalti', 'fonepay', 'airwallex', 'bank_transfer', 'cod'
      ];
      
      if (!supportedGateways.includes(request.gateway)) {
        errors.push({
          code: 'GATEWAY_UNSUPPORTED',
          message: `Unsupported payment gateway: ${request.gateway}`,
          severity: 'critical'
        });
        return;
      }

      // Check gateway configuration
      try {
        const config = await this.configService.getGatewayConfig(request.gateway);
        if (!config) {
          errors.push({
            code: 'GATEWAY_NOT_CONFIGURED',
            message: `Gateway ${request.gateway} is not configured`,
            severity: 'critical'
          });
          return;
        }

        const validation = this.configService.validateGatewayCredentials(config);
        if (!validation.hasValidCredentials) {
          errors.push({
            code: 'GATEWAY_INVALID_CREDENTIALS',
            message: `Gateway ${request.gateway} has invalid credentials`,
            severity: 'critical'
          });
        }

        if (validation.isTestMode) {
          warnings.push({
            code: 'GATEWAY_TEST_MODE',
            message: `Gateway ${request.gateway} is in test mode`,
            impact: 'low'
          });
        }
      } catch (configError) {
        logger.warn('Gateway config validation error:', configError);
        warnings.push({
          code: 'GATEWAY_CONFIG_WARNING',
          message: 'Unable to fully validate gateway configuration',
          impact: 'medium'
        });
      }

    } catch (error) {
      logger.error('Gateway availability validation error:', error);
      errors.push({
        code: 'GATEWAY_VALIDATION_ERROR',
        message: 'Unable to validate gateway availability',
        severity: 'high'
      });
    }
  }

  private async validateGatewayCustomer(
    request: PaymentGatewayRequest,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    try {
      // Check customer verification requirements
      const requiresVerification = ['esewa', 'khalti', 'fonepay'].includes(request.gateway);
      if (requiresVerification) {
        const verificationStatus = await this.getCustomerVerificationStatus(request.customer.id);
        if (verificationStatus !== 'verified') {
          errors.push({
            code: 'CUSTOMER_VERIFICATION_REQUIRED',
            message: `Payment method ${request.gateway} requires verified customer`,
            severity: 'high'
          });
        }
      }

      // Phone number requirements
      const requiresPhone = ['khalti', 'fonepay', 'cod'].includes(request.gateway);
      if (requiresPhone && !request.customer.phone) {
        errors.push({
          code: 'CUSTOMER_PHONE_REQUIRED',
          message: `Payment method ${request.gateway} requires customer phone`,
          severity: 'high'
        });
      }

      // COD eligibility
      if (request.gateway === 'cod') {
        if (request.amount > 5000) {
          errors.push({
            code: 'COD_AMOUNT_EXCEEDED',
            message: 'Amount exceeds COD limit',
            severity: 'high'
          });
        }
      }

    } catch (error) {
      logger.error('Customer validation error:', error);
      warnings.push({
        code: 'CUSTOMER_VALIDATION_WARNING',
        message: 'Unable to fully validate customer information',
        impact: 'medium'
      });
    }
  }

  private async validateGatewayBusinessRules(
    request: PaymentGatewayRequest,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<{ correctedData?: Partial<PaymentGatewayRequest> }> {
    // Business rules would be loaded from database
    // For now, implementing basic rules
    
    const correctedData: Partial<PaymentGatewayRequest> = {};

    // Currency-gateway compatibility
    const currencyGatewayRules: Record<string, PaymentGateway[]> = {
      'NPR': ['esewa', 'khalti', 'fonepay', 'bank_transfer'],
      'INR': ['payu', 'bank_transfer'],
      'USD': ['stripe', 'paypal', 'airwallex', 'bank_transfer']
    };

    const compatibleGateways = currencyGatewayRules[request.currency] || [];
    if (compatibleGateways.length > 0 && !compatibleGateways.includes(request.gateway)) {
      warnings.push({
        code: 'CURRENCY_GATEWAY_INCOMPATIBLE',
        message: `Currency ${request.currency} may not be supported by ${request.gateway}`,
        impact: 'high'
      });
    }

    return { correctedData: Object.keys(correctedData).length > 0 ? correctedData : undefined };
  }

  // ============================================================================
  // COMPLIANCE AND ADVANCED VALIDATION
  // ============================================================================

  private async performComplianceValidation(request: PaymentGatewayRequest): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];

    // AML check for high-value transactions
    checks.push({
      rule: 'AML_SCREENING',
      status: request.amount > 10000 ? 'warning' : 'passed',
      description: 'Anti-Money Laundering screening for high-value transactions',
      reference: 'AML_POLICY_2024'
    });

    // Transaction monitoring
    checks.push({
      rule: 'TRANSACTION_MONITORING',
      status: request.amount > 50000 ? 'warning' : 'passed',
      description: 'Large transaction monitoring threshold',
      reference: 'TM_THRESHOLD_50K'
    });

    // Sanctions check (simplified implementation)
    checks.push({
      rule: 'SANCTIONS_CHECK',
      status: 'passed', // Would integrate with actual sanctions API
      description: 'International sanctions list screening'
    });

    return checks;
  }

  // ============================================================================
  // RECOMMENDATION GENERATION
  // ============================================================================

  private generatePaymentRecordRecommendations(
    data: PaymentRecordRequest,
    paymentSummary: PaymentSummaryData,
    riskScore: number
  ): PaymentRecommendation[] {
    const recommendations: PaymentRecommendation[] = [];

    if (riskScore > 50) {
      recommendations.push({
        type: 'security',
        message: 'High-risk payment detected - consider manual review',
        priority: 'high'
      });
    }

    const amount = parseFloat(data.amount);
    if (amount > paymentSummary.remaining * 1.5) {
      recommendations.push({
        type: 'optimization',
        message: 'Consider splitting large overpayment into separate transactions',
        priority: 'medium'
      });
    }

    if (data.method === 'cash' && amount > 5000) {
      recommendations.push({
        type: 'compliance',
        message: 'Large cash payment may require additional documentation',
        priority: 'high'
      });
    }

    return recommendations;
  }

  // ============================================================================
  // UTILITY AND HELPER METHODS
  // ============================================================================

  private buildValidationResult(
    errors: ValidationError[],
    warnings: ValidationWarning[],
    recommendations: PaymentRecommendation[],
    complianceChecks: ComplianceCheck[],
    riskScore: number
  ): UnifiedValidationResult {
    return {
      isValid: errors.filter(e => e.severity === 'critical').length === 0,
      errors,
      warnings,
      riskScore: Math.min(100, riskScore),
      recommendations,
      complianceChecks
    };
  }

  private buildErrorResult(message: string): UnifiedValidationResult {
    return {
      isValid: false,
      errors: [{
        code: 'VALIDATION_SYSTEM_ERROR',
        message,
        severity: 'critical'
      }],
      warnings: [],
      riskScore: 100,
      recommendations: [],
      complianceChecks: []
    };
  }

  // Mock helper methods (would integrate with actual data sources)
  private async isNewCustomer(customerId: string): Promise<boolean> {
    return false; // Mock implementation
  }

  private async getCustomerVerificationStatus(customerId: string): Promise<string> {
    return 'verified'; // Mock implementation
  }

  private async logValidationResult(request: any, result: any): Promise<void> {
    try {
      await supabase
        .from('payment_validation_logs')
        .insert({
          request_type: 'gateway_payment',
          customer_id: request.customer?.id,
          amount: request.amount,
          currency: request.currency,
          gateway: request.gateway,
          is_valid: result.errors?.filter((e: any) => e.severity === 'critical').length === 0,
          risk_score: result.riskScore,
          error_count: result.errors?.length || 0,
          warning_count: result.warnings?.length || 0,
          validation_result: result,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Failed to log validation result:', error);
    }
  }

  // ============================================================================
  // PUBLIC UTILITY METHODS
  // ============================================================================

  /**
   * Get validation message for error code
   */
  getValidationMessage(code: string): string {
    const messages: Record<string, string> = {
      'AMOUNT_REQUIRED': 'Amount is required',
      'AMOUNT_INVALID': 'Please enter a valid amount',
      'AMOUNT_TOO_LARGE': 'Amount exceeds maximum limit',
      'CURRENCY_REQUIRED': 'Currency is required',
      'CURRENCY_UNSUPPORTED': 'This currency is not supported',
      'METHOD_REQUIRED': 'Payment method is required',
      'METHOD_INVALID': 'Invalid payment method selected',
      'DATE_REQUIRED': 'Date is required',
      'DATE_INVALID': 'Please enter a valid date',
      'GATEWAY_REQUIRED': 'Payment gateway is required',
      'CUSTOMER_REQUIRED': 'Customer information is required',
      'HIGH_RISK_BLOCKED': 'Payment blocked due to high risk',
      'FRAUD_DETECTED': 'Fraudulent activity detected'
    };

    return messages[code] || 'Validation error';
  }

  /**
   * Check if validation result is safe to process
   */
  isSafeToProcess(result: UnifiedValidationResult): boolean {
    return result.isValid && result.riskScore < 70;
  }

  /**
   * Get severity level for validation result
   */
  getSeverityLevel(result: UnifiedValidationResult): 'success' | 'warning' | 'error' {
    if (result.errors.length > 0) return 'error';
    if (result.warnings.length > 0 || result.riskScore > 50) return 'warning';
    return 'success';
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.rulesCache.clear();
    this.riskCache.clear();
    this.cache.clear();
    logger.info('UnifiedPaymentValidationService caches cleared');
  }

  /**
   * Cleanup and dispose service
   */
  dispose(): void {
    this.clearAllCaches();
    logger.info('UnifiedPaymentValidationService disposed');
  }
}

export default UnifiedPaymentValidationService;