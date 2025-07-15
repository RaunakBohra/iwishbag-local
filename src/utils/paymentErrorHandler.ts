import { PaymentGateway } from '@/types/payment';

export interface PaymentError {
  code: string;
  message: string;
  userMessage: string;
  recoveryOptions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  shouldRetry: boolean;
  retryDelay?: number;
}

export interface PaymentErrorContext {
  gateway: PaymentGateway;
  transactionId?: string;
  amount?: number;
  currency?: string;
  userAction?: string;
  timestamp: string;
}

// Common payment error codes and their user-friendly messages
const PAYMENT_ERROR_CODES: Record<string, Omit<PaymentError, 'code'>> = {
  // Network and connectivity errors
  'NETWORK_ERROR': {
    message: 'Network connection failed',
    userMessage: 'We\'re having trouble connecting to our payment provider. Please check your internet connection and try again.',
    recoveryOptions: [
      'Check your internet connection',
      'Try again in a few minutes',
      'Use a different payment method',
      'Contact support if the issue persists'
    ],
    severity: 'medium',
    shouldRetry: true,
    retryDelay: 5000
  },
  
  'TIMEOUT_ERROR': {
    message: 'Payment request timed out',
    userMessage: 'Your payment is taking longer than expected. Please wait a moment and check your payment status.',
    recoveryOptions: [
      'Wait a few minutes and check payment status',
      'Do not make another payment immediately',
      'Contact support if payment doesn\'t appear',
      'Check your bank/payment app for transaction status'
    ],
    severity: 'high',
    shouldRetry: false
  },

  // PayU specific errors
  'PAYU_INVALID_HASH': {
    message: 'PayU hash validation failed',
    userMessage: 'There was a security issue with your payment. Please try again.',
    recoveryOptions: [
      'Try making the payment again',
      'Clear your browser cache',
      'Use a different browser or device',
      'Contact support if the issue continues'
    ],
    severity: 'high',
    shouldRetry: true,
    retryDelay: 10000
  },
  
  'PAYU_INSUFFICIENT_FUNDS': {
    message: 'Insufficient funds in account',
    userMessage: 'Your payment was declined due to insufficient funds. Please check your account balance.',
    recoveryOptions: [
      'Check your account balance',
      'Try a different payment method',
      'Add funds to your account',
      'Contact your bank if you believe this is an error'
    ],
    severity: 'low',
    shouldRetry: false
  },
  
  'PAYU_INVALID_CARD': {
    message: 'Invalid card details',
    userMessage: 'Your card details appear to be invalid. Please check and try again.',
    recoveryOptions: [
      'Check your card number, expiry date, and CVV',
      'Try typing the details again carefully',
      'Use a different card',
      'Contact your bank if the card should be valid'
    ],
    severity: 'low',
    shouldRetry: true
  },
  
  'PAYU_CARD_EXPIRED': {
    message: 'Card has expired',
    userMessage: 'Your card has expired. Please use a different card.',
    recoveryOptions: [
      'Use a different, valid card',
      'Contact your bank for a new card',
      'Try a different payment method'
    ],
    severity: 'low',
    shouldRetry: false
  },
  
  'PAYU_TRANSACTION_FAILED': {
    message: 'PayU transaction failed',
    userMessage: 'Your payment could not be processed. Please try again or use a different payment method.',
    recoveryOptions: [
      'Try the payment again',
      'Use a different payment method',
      'Check with your bank',
      'Contact support if the issue persists'
    ],
    severity: 'medium',
    shouldRetry: true,
    retryDelay: 30000
  },

  // Amount and currency errors
  'AMOUNT_TOO_LOW': {
    message: 'Payment amount below minimum',
    userMessage: 'The payment amount is below the minimum required. Please check your order total.',
    recoveryOptions: [
      'Check your order total',
      'Add more items to meet minimum amount',
      'Contact support for assistance'
    ],
    severity: 'low',
    shouldRetry: false
  },
  
  'AMOUNT_TOO_HIGH': {
    message: 'Payment amount exceeds maximum',
    userMessage: 'The payment amount exceeds the maximum allowed. Please contact support.',
    recoveryOptions: [
      'Contact support for assistance',
      'Try splitting the payment',
      'Use bank transfer for large amounts'
    ],
    severity: 'medium',
    shouldRetry: false
  },
  
  'CURRENCY_NOT_SUPPORTED': {
    message: 'Currency not supported by gateway',
    userMessage: 'This payment method doesn\'t support your currency. Please try a different payment method.',
    recoveryOptions: [
      'Try a different payment method',
      'Contact support for alternative options',
      'Use bank transfer if available'
    ],
    severity: 'medium',
    shouldRetry: false
  },

  // Configuration errors
  'GATEWAY_CONFIG_ERROR': {
    message: 'Payment gateway configuration error',
    userMessage: 'We\'re experiencing technical difficulties with payments. Please try again later.',
    recoveryOptions: [
      'Try again in a few minutes',
      'Use a different payment method',
      'Contact support',
      'Check our status page for updates'
    ],
    severity: 'critical',
    shouldRetry: true,
    retryDelay: 60000
  },
  
  'GATEWAY_UNAVAILABLE': {
    message: 'Payment gateway unavailable',
    userMessage: 'This payment method is temporarily unavailable. Please try a different method.',
    recoveryOptions: [
      'Try a different payment method',
      'Try again later',
      'Contact support for assistance'
    ],
    severity: 'high',
    shouldRetry: true,
    retryDelay: 300000 // 5 minutes
  },

  // Authentication errors
  'AUTHENTICATION_FAILED': {
    message: 'Payment authentication failed',
    userMessage: 'Payment authentication failed. Please verify your identity and try again.',
    recoveryOptions: [
      'Complete 3D Secure verification',
      'Check your phone for OTP',
      'Try a different card',
      'Contact your bank'
    ],
    severity: 'medium',
    shouldRetry: true
  },

  // Generic errors
  'UNKNOWN_ERROR': {
    message: 'Unknown payment error',
    userMessage: 'Something went wrong with your payment. Please try again.',
    recoveryOptions: [
      'Try the payment again',
      'Use a different payment method',
      'Contact support with transaction details'
    ],
    severity: 'medium',
    shouldRetry: true,
    retryDelay: 30000
  }
};

export class PaymentErrorHandler {
  static parseError(error: unknown, context: PaymentErrorContext): PaymentError {
    const errorCode = this.determineErrorCode(error, context);
    const baseError = PAYMENT_ERROR_CODES[errorCode] || PAYMENT_ERROR_CODES['UNKNOWN_ERROR'];
    
    return {
      code: errorCode,
      ...baseError,
      message: this.enhanceErrorMessage(baseError.message, context),
      userMessage: this.enhanceUserMessage(baseError.userMessage, context)
    };
  }

  private static determineErrorCode(error: unknown, context: PaymentErrorContext): string {
    // Type guard to check if error is an Error object
    const isError = error instanceof Error;
    const errorMessage = isError ? error.message : String(error);
    const errorName = isError ? error.name : '';
    
    // Network errors
    if (errorName === 'TypeError' && errorMessage.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    
    if (errorName === 'AbortError' || errorMessage.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }

    // PayU specific errors
    if (context.gateway === 'payu') {
      if (errorMessage.includes('Invalid hash')) {
        return 'PAYU_INVALID_HASH';
      }
      
      if (errorMessage.includes('Insufficient funds')) {
        return 'PAYU_INSUFFICIENT_FUNDS';
      }
      
      if (errorMessage.includes('Invalid card') || errorMessage.includes('card number')) {
        return 'PAYU_INVALID_CARD';
      }
      
      if (errorMessage.includes('expired')) {
        return 'PAYU_CARD_EXPIRED';
      }
      
      if (errorMessage.includes('transaction failed')) {
        return 'PAYU_TRANSACTION_FAILED';
      }
    }

    // Amount errors
    if (errorMessage.includes('minimum amount') || errorMessage.includes('too small')) {
      return 'AMOUNT_TOO_LOW';
    }
    
    if (errorMessage.includes('maximum amount') || errorMessage.includes('too large')) {
      return 'AMOUNT_TOO_HIGH';
    }

    // Currency errors
    if (errorMessage.includes('currency not supported')) {
      return 'CURRENCY_NOT_SUPPORTED';
    }

    // Configuration errors
    if (errorMessage.includes('configuration') || errorMessage.includes('config')) {
      return 'GATEWAY_CONFIG_ERROR';
    }
    
    if (errorMessage.includes('unavailable') || errorMessage.includes('service down')) {
      return 'GATEWAY_UNAVAILABLE';
    }

    // Authentication errors
    if (errorMessage.includes('authentication') || errorMessage.includes('3D Secure')) {
      return 'AUTHENTICATION_FAILED';
    }

    return 'UNKNOWN_ERROR';
  }

  private static enhanceErrorMessage(message: string, context: PaymentErrorContext): string {
    return `${message} (Gateway: ${context.gateway}${context.transactionId ? `, Transaction: ${context.transactionId}` : ''})`;
  }

  private static enhanceUserMessage(userMessage: string, context: PaymentErrorContext): string {
    // Add gateway-specific context to user message
    const gatewayNames = {
      'payu': 'PayU',
      'stripe': 'Stripe',
      'bank_transfer': 'Bank Transfer',
      'esewa': 'eSewa',
      'khalti': 'Khalti',
      'fonepay': 'Fonepay'
    };

    const gatewayName = gatewayNames[context.gateway] || context.gateway;
    
    if (context.amount && context.currency) {
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: context.currency
      }).format(context.amount);
      
      return `${userMessage} (${gatewayName} payment for ${formattedAmount})`;
    }
    
    return `${userMessage} (${gatewayName} payment)`;
  }

  static getRecoveryActions(error: PaymentError, context: PaymentErrorContext): string[] {
    const actions = [...error.recoveryOptions];
    
    // Add context-specific recovery actions
    if (context.gateway === 'payu' && context.transactionId) {
      actions.push(`Transaction ID: ${context.transactionId} (save this for support)`);
    }
    
    if (error.shouldRetry && error.retryDelay) {
      actions.unshift(`Wait ${Math.round(error.retryDelay / 1000)} seconds before retrying`);
    }
    
    return actions;
  }

  static shouldShowRetryButton(error: PaymentError): boolean {
    return error.shouldRetry && error.severity !== 'critical';
  }

  static getRetryDelay(error: PaymentError): number {
    return error.retryDelay || 30000; // Default 30 seconds
  }

  static formatErrorForLogging(error: PaymentError, context: PaymentErrorContext): Record<string, unknown> {
    return {
      code: error.code,
      message: error.message,
      severity: error.severity,
      gateway: context.gateway,
      transactionId: context.transactionId,
      amount: context.amount,
      currency: context.currency,
      userAction: context.userAction,
      timestamp: context.timestamp,
      shouldRetry: error.shouldRetry,
      retryDelay: error.retryDelay
    };
  }
}