/**
 * Secure logging utility for handling sensitive customer data
 * Ensures no PII is exposed in logs while maintaining debugging capability
 */

interface LogContext {
  transactionId?: string;
  quoteId?: string;
  userId?: string;
  operation?: string;
  gateway?: string;
}

interface SensitiveData {
  email?: string;
  name?: string;
  phone?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

interface SanitizedData {
  has_email?: boolean;
  email_domain?: string;
  has_name?: boolean;
  name_length?: number;
  has_phone?: boolean;
  phone_length?: number;
  has_address?: boolean;
  address_country?: string;
  address_has_line1?: boolean;
  address_has_city?: boolean;
  address_has_postal?: boolean;
}

export class SecureLogger {
  /**
   * Sanitizes sensitive data for logging
   * Removes PII while preserving debugging information
   */
  static sanitizeForLogging(data: SensitiveData): SanitizedData {
    const sanitized: SanitizedData = {};

    if (data.email) {
      sanitized.has_email = true;
      sanitized.email_domain = data.email.split('@')[1] || 'unknown';
    }

    if (data.name) {
      sanitized.has_name = true;
      sanitized.name_length = data.name.length;
    }

    if (data.phone) {
      sanitized.has_phone = true;
      sanitized.phone_length = data.phone.length;
    }

    if (data.address) {
      sanitized.has_address = true;
      sanitized.address_country = data.address.country || 'unknown';
      sanitized.address_has_line1 = !!data.address.line1;
      sanitized.address_has_city = !!data.address.city;
      sanitized.address_has_postal = !!data.address.postal_code;
    }

    return sanitized;
  }

  /**
   * Logs customer operation with sanitized data
   */
  static logCustomerOperation(
    operation: string,
    context: LogContext,
    customerData: SensitiveData,
    result?: { success: boolean; error?: string },
  ): void {
    const sanitized = this.sanitizeForLogging(customerData);

    console.log(`[${operation.toUpperCase()}] Customer operation`, {
      operation,
      context,
      customer_data: sanitized,
      result: result ? { success: result.success, has_error: !!result.error } : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs payment creation with sanitized customer details
   */
  static logPaymentCreation(
    context: LogContext,
    customerData: SensitiveData,
    paymentDetails: {
      amount: number;
      currency: string;
      hasCustomer: boolean;
      hasShipping: boolean;
    },
  ): void {
    const sanitized = this.sanitizeForLogging(customerData);

    console.log('[PAYMENT_CREATE] Enhanced Stripe PaymentIntent created', {
      context,
      customer_data: sanitized,
      payment_details: paymentDetails,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs webhook processing with sanitized data
   */
  static logWebhookProcessing(
    eventType: string,
    context: LogContext,
    extractedData: SensitiveData,
  ): void {
    const sanitized = this.sanitizeForLogging(extractedData);

    console.log(`[WEBHOOK] ${eventType} processing`, {
      event_type: eventType,
      context,
      extracted_data: sanitized,
      timestamp: new Date().toISOString(),
    });
  }
}
