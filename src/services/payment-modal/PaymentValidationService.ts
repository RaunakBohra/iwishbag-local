/**
 * Payment Validation Service
 * Handles form validation and business rules for payment operations
 */

import { logger } from '@/utils/logger';
import { PaymentSummaryData } from './PaymentDataService';

// Type definitions for payment validation
export type PaymentMethodType =
  | 'bank_transfer'
  | 'cash'
  | 'upi'
  | 'payu'
  | 'stripe'
  | 'esewa'
  | 'credit_note'
  | 'check'
  | 'wire_transfer'
  | 'other';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface PaymentRecordData {
  amount: string;
  method: PaymentMethodType;
  currency: string;
  transactionId?: string;
  date: string;
  notes?: string;
}

export interface PaymentVerificationData {
  proofId: string;
  amount: string;
  notes?: string;
  rejectionReason?: string;
}

export interface RefundData {
  paymentId: string;
  amount: string;
  reason: string;
  method: string;
}

export class PaymentValidationService {
  private readonly supportedCurrencies = [
    'USD', 'INR', 'NPR', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'JPY'
  ];

  private readonly paymentMethods: PaymentMethodType[] = [
    'bank_transfer', 'cash', 'upi', 'payu', 'stripe', 'esewa', 
    'credit_note', 'check', 'wire_transfer', 'other'
  ];

  constructor() {
    logger.info('PaymentValidationService initialized');
  }

  /**
   * Validate payment recording data
   */
  validatePaymentRecord(
    data: PaymentRecordData, 
    paymentSummary: PaymentSummaryData,
    quoteCurrency: string
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Amount validation
    const amount = parseFloat(data.amount);
    if (!data.amount || data.amount.trim() === '') {
      errors.push({
        field: 'amount',
        message: 'Payment amount is required',
        code: 'AMOUNT_REQUIRED'
      });
    } else if (isNaN(amount) || amount <= 0) {
      errors.push({
        field: 'amount',
        message: 'Payment amount must be a positive number',
        code: 'AMOUNT_INVALID'
      });
    } else if (amount > 1000000) {
      errors.push({
        field: 'amount',
        message: 'Payment amount exceeds maximum limit ($1,000,000)',
        code: 'AMOUNT_TOO_LARGE'
      });
    } else if (amount < 0.01) {
      errors.push({
        field: 'amount',
        message: 'Payment amount must be at least $0.01',
        code: 'AMOUNT_TOO_SMALL'
      });
    }

    // Currency validation
    if (!data.currency) {
      errors.push({
        field: 'currency',
        message: 'Currency is required',
        code: 'CURRENCY_REQUIRED'
      });
    } else if (!this.supportedCurrencies.includes(data.currency)) {
      errors.push({
        field: 'currency',
        message: 'Unsupported currency',
        code: 'CURRENCY_UNSUPPORTED'
      });
    } else if (data.currency !== quoteCurrency) {
      warnings.push({
        field: 'currency',
        message: `Payment currency (${data.currency}) differs from quote currency (${quoteCurrency}). This may complicate refunds.`,
        code: 'CURRENCY_MISMATCH'
      });
    }

    // Payment method validation
    if (!data.method) {
      errors.push({
        field: 'method',
        message: 'Payment method is required',
        code: 'METHOD_REQUIRED'
      });
    } else if (!this.paymentMethods.includes(data.method)) {
      errors.push({
        field: 'method',
        message: 'Invalid payment method',
        code: 'METHOD_INVALID'
      });
    }

    // Date validation
    if (!data.date) {
      errors.push({
        field: 'date',
        message: 'Payment date is required',
        code: 'DATE_REQUIRED'
      });
    } else {
      const paymentDate = new Date(data.date);
      const today = new Date();
      const maxPastDate = new Date();
      maxPastDate.setFullYear(today.getFullYear() - 1); // 1 year ago

      if (isNaN(paymentDate.getTime())) {
        errors.push({
          field: 'date',
          message: 'Invalid payment date',
          code: 'DATE_INVALID'
        });
      } else if (paymentDate > today) {
        errors.push({
          field: 'date',
          message: 'Payment date cannot be in the future',
          code: 'DATE_FUTURE'
        });
      } else if (paymentDate < maxPastDate) {
        warnings.push({
          field: 'date',
          message: 'Payment date is more than 1 year ago',
          code: 'DATE_VERY_OLD'
        });
      }
    }

    // Business logic validations
    if (amount && !isNaN(amount)) {
      // Check for overpayment
      if (amount > paymentSummary.remaining && paymentSummary.remaining > 0) {
        warnings.push({
          field: 'amount',
          message: `This payment (${data.currency} ${amount.toFixed(2)}) exceeds the remaining balance (${quoteCurrency} ${paymentSummary.remaining.toFixed(2)}). The order will be marked as overpaid.`,
          code: 'OVERPAYMENT'
        });
      }

      // Check for duplicate-looking amounts
      if (paymentSummary.totalPayments > 0 && Math.abs(amount - paymentSummary.totalPayments) < 0.01) {
        warnings.push({
          field: 'amount',
          message: 'This amount matches a previous payment total. Please verify this is not a duplicate.',
          code: 'POSSIBLE_DUPLICATE'
        });
      }

      // Check for round numbers that might be estimates
      if (amount >= 100 && amount % 10 === 0 && data.method !== 'cash') {
        warnings.push({
          field: 'amount',
          message: 'Round number detected. Please verify this is the exact payment amount.',
          code: 'ROUND_NUMBER'
        });
      }
    }

    // Transaction ID validation for electronic payments
    const electronicMethods: PaymentMethodType[] = ['upi', 'payu', 'stripe', 'esewa'];
    if (electronicMethods.includes(data.method) && (!data.transactionId || data.transactionId.trim() === '')) {
      warnings.push({
        field: 'transactionId',
        message: 'Transaction ID is recommended for electronic payments',
        code: 'TRANSACTION_ID_RECOMMENDED'
      });
    }

    // Notes validation
    if (data.notes && data.notes.length > 1000) {
      errors.push({
        field: 'notes',
        message: 'Notes cannot exceed 1000 characters',
        code: 'NOTES_TOO_LONG'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate payment verification data
   */
  validatePaymentVerification(
    data: PaymentVerificationData,
    paymentSummary: PaymentSummaryData,
    quoteCurrency: string
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Proof ID validation
    if (!data.proofId || data.proofId.trim() === '') {
      errors.push({
        field: 'proofId',
        message: 'Please select a payment proof to verify',
        code: 'PROOF_ID_REQUIRED'
      });
    }

    // Amount validation
    const amount = parseFloat(data.amount);
    if (!data.amount || data.amount.trim() === '') {
      errors.push({
        field: 'amount',
        message: 'Verified amount is required',
        code: 'AMOUNT_REQUIRED'
      });
    } else if (isNaN(amount) || amount <= 0) {
      errors.push({
        field: 'amount',
        message: 'Verified amount must be a positive number',
        code: 'AMOUNT_INVALID'
      });
    } else if (amount > paymentSummary.finalTotal * 2) {
      warnings.push({
        field: 'amount',
        message: 'Verified amount is significantly larger than the order total. Please double-check.',
        code: 'AMOUNT_UNUSUALLY_HIGH'
      });
    }

    // Calculate payment balance impact
    if (amount && !isNaN(amount)) {
      const currentPaid = paymentSummary.totalPaid;
      const orderTotal = paymentSummary.finalTotal;
      const newTotal = currentPaid + amount;

      if (newTotal > orderTotal) {
        const overpayment = newTotal - orderTotal;
        warnings.push({
          field: 'amount',
          message: `This verification will result in an overpayment of ${quoteCurrency} ${overpayment.toFixed(2)}`,
          code: 'VERIFICATION_OVERPAYMENT'
        });
      }
    }

    // Notes validation
    if (data.notes && data.notes.length > 500) {
      errors.push({
        field: 'notes',
        message: 'Verification notes cannot exceed 500 characters',
        code: 'NOTES_TOO_LONG'
      });
    }

    // Rejection reason validation (if provided)
    if (data.rejectionReason) {
      const validReasons = [
        'invalid_amount', 'unclear_proof', 'wrong_account', 
        'duplicate', 'insufficient_details', 'other'
      ];
      
      if (!validReasons.includes(data.rejectionReason)) {
        errors.push({
          field: 'rejectionReason',
          message: 'Invalid rejection reason',
          code: 'REJECTION_REASON_INVALID'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate refund data
   */
  validateRefund(
    data: RefundData,
    availableRefundAmount: number,
    originalCurrency: string
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Payment ID validation
    if (!data.paymentId || data.paymentId.trim() === '') {
      errors.push({
        field: 'paymentId',
        message: 'Please select a payment to refund',
        code: 'PAYMENT_ID_REQUIRED'
      });
    }

    // Amount validation
    const amount = parseFloat(data.amount);
    if (!data.amount || data.amount.trim() === '') {
      errors.push({
        field: 'amount',
        message: 'Refund amount is required',
        code: 'AMOUNT_REQUIRED'
      });
    } else if (isNaN(amount) || amount <= 0) {
      errors.push({
        field: 'amount',
        message: 'Refund amount must be a positive number',
        code: 'AMOUNT_INVALID'
      });
    } else if (amount > availableRefundAmount) {
      errors.push({
        field: 'amount',
        message: `Refund amount cannot exceed available refund amount (${originalCurrency} ${availableRefundAmount.toFixed(2)})`,
        code: 'AMOUNT_EXCEEDS_AVAILABLE'
      });
    } else if (amount < 0.01) {
      errors.push({
        field: 'amount',
        message: 'Refund amount must be at least $0.01',
        code: 'AMOUNT_TOO_SMALL'
      });
    }

    // Reason validation
    if (!data.reason || data.reason.trim() === '') {
      errors.push({
        field: 'reason',
        message: 'Refund reason is required',
        code: 'REASON_REQUIRED'
      });
    } else if (data.reason.length > 500) {
      errors.push({
        field: 'reason',
        message: 'Refund reason cannot exceed 500 characters',
        code: 'REASON_TOO_LONG'
      });
    }

    // Method validation
    if (!data.method || data.method.trim() === '') {
      errors.push({
        field: 'method',
        message: 'Refund method is required',
        code: 'METHOD_REQUIRED'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate file upload for payment proofs
   */
  validatePaymentProofFile(file: File): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // File size validation (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push({
        field: 'file',
        message: 'File size cannot exceed 10MB',
        code: 'FILE_TOO_LARGE'
      });
    }

    // File type validation
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'image/bmp', 'image/tiff'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      errors.push({
        field: 'file',
        message: 'Invalid file type. Please upload an image or PDF file.',
        code: 'FILE_TYPE_INVALID'
      });
    }

    // File name validation
    if (file.name.length > 255) {
      errors.push({
        field: 'file',
        message: 'File name is too long (max 255 characters)',
        code: 'FILENAME_TOO_LONG'
      });
    }

    // Check for common image extensions
    const filename = file.name.toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
    const isImage = imageExtensions.some(ext => filename.endsWith(ext));
    
    if (!isImage && file.type.startsWith('image/')) {
      warnings.push({
        field: 'file',
        message: 'File extension does not match image type',
        code: 'EXTENSION_MISMATCH'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Business rule validation for payment operations
   */
  validateBusinessRules(
    operation: 'record' | 'verify' | 'refund',
    data: any,
    context: {
      paymentSummary: PaymentSummaryData;
      quoteCurrency: string;
      paymentMethod?: string;
    }
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    switch (operation) {
      case 'record':
        // Check if quote is already overpaid
        if (context.paymentSummary.isOverpaid) {
          warnings.push({
            field: 'general',
            message: 'This quote is already overpaid. Additional payments should be carefully reviewed.',
            code: 'QUOTE_ALREADY_OVERPAID'
          });
        }

        // Check if quote is fully paid
        if (context.paymentSummary.status === 'paid') {
          warnings.push({
            field: 'general',
            message: 'This quote is already fully paid. Please verify if this is an additional payment.',
            code: 'QUOTE_ALREADY_PAID'
          });
        }
        break;

      case 'verify':
        // Check if payment method supports verification
        if (context.paymentMethod !== 'bank_transfer') {
          warnings.push({
            field: 'general',
            message: 'Payment verification is typically used for bank transfers. Please ensure this is correct.',
            code: 'UNUSUAL_VERIFICATION_METHOD'
          });
        }
        break;

      case 'refund':
        // Check if there are payments to refund
        if (context.paymentSummary.totalPayments === 0) {
          errors.push({
            field: 'general',
            message: 'No payments available for refund',
            code: 'NO_PAYMENTS_TO_REFUND'
          });
        }

        // Check for existing refunds
        if (context.paymentSummary.hasRefunds) {
          warnings.push({
            field: 'general',
            message: 'This quote already has refunds. Please review existing refund history.',
            code: 'EXISTING_REFUNDS'
          });
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get validation message for a specific error code
   */
  getValidationMessage(code: string): string {
    const messages: Record<string, string> = {
      'AMOUNT_REQUIRED': 'Amount is required',
      'AMOUNT_INVALID': 'Please enter a valid amount',
      'AMOUNT_TOO_LARGE': 'Amount exceeds maximum limit',
      'AMOUNT_TOO_SMALL': 'Amount is too small',
      'CURRENCY_REQUIRED': 'Currency is required',
      'CURRENCY_UNSUPPORTED': 'This currency is not supported',
      'CURRENCY_MISMATCH': 'Currency mismatch detected',
      'METHOD_REQUIRED': 'Payment method is required',
      'METHOD_INVALID': 'Invalid payment method selected',
      'DATE_REQUIRED': 'Date is required',
      'DATE_INVALID': 'Please enter a valid date',
      'DATE_FUTURE': 'Date cannot be in the future',
      'OVERPAYMENT': 'This will result in overpayment',
      'POSSIBLE_DUPLICATE': 'Possible duplicate payment',
      'ROUND_NUMBER': 'Please verify exact amount',
    };

    return messages[code] || 'Validation error';
  }

  /**
   * Check if operation is safe to proceed
   */
  isSafeToProcess(validationResult: ValidationResult): boolean {
    // Only proceed if there are no errors
    // Warnings can be acknowledged by user
    return validationResult.isValid;
  }

  /**
   * Get severity level for validation result
   */
  getSeverityLevel(validationResult: ValidationResult): 'success' | 'warning' | 'error' {
    if (validationResult.errors.length > 0) {
      return 'error';
    }
    if (validationResult.warnings.length > 0) {
      return 'warning';
    }
    return 'success';
  }
}

export default PaymentValidationService;