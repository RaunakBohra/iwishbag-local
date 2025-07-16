/**
 * Secure and type-safe Stripe payment creation with full customer details
 * Implements security hardening and input validation
 */

import { SecureLogger } from '../../../src/lib/secureLogger.ts';
import { CustomerValidator } from '../../../src/lib/customerValidation.ts';
import { 
  CustomerInfo, 
  CustomerAddress, 
  QuoteData, 
  QuoteShippingAddress,
  StripeCustomerRecord,
  StripePaymentIntentData,
  EnhancedStripePaymentParams,
  StripePaymentResult,
  ValidationResult
} from '../../../src/types/stripeCustomer.ts';

// Temporary interfaces until proper Stripe types are imported
interface StripeInstance {
  customers: {
    list: (params: { email: string; limit: number }) => Promise<{ data: StripeCustomerRecord[] }>;
    create: (params: Record<string, unknown>) => Promise<StripeCustomerRecord>;
    update: (id: string, params: Record<string, unknown>) => Promise<StripeCustomerRecord>;
  };
  paymentIntents: {
    create: (params: StripePaymentIntentData) => Promise<{
      id: string;
      client_secret: string;
      amount: number;
      currency: string;
    }>;
  };
}

interface SupabaseClient {
  from: (table: string) => {
    select: (columns: string) => {
      in: (column: string, values: string[]) => Promise<{
        data: QuoteData[] | null;
        error: unknown;
      }>;
    };
  };
}

export async function createStripePaymentEnhancedSecure(
  params: EnhancedStripePaymentParams
): Promise<StripePaymentResult> {
  const { stripe, amount, currency, quoteIds, userId, customerInfo, quotes, supabaseAdmin } = params;
  
  // Input validation
  const validationResult = validateInputs(params);
  if (!validationResult.isValid) {
    SecureLogger.logCustomerOperation(
      'payment_create_validation_failed',
      { userId, operation: 'create_payment' },
      customerInfo || {},
      { success: false, error: validationResult.errors.join(', ') }
    );
    return {
      success: false,
      error: `Validation failed: ${validationResult.errors.join(', ')}`
    };
  }

  try {
    // Convert amount to smallest currency unit with validation
    const currencyMultiplier = getCurrencyMultiplier(currency);
    const amountInSmallestUnit = Math.round(amount * currencyMultiplier);
    
    if (amountInSmallestUnit <= 0) {
      return {
        success: false,
        error: 'Invalid payment amount'
      };
    }

    // Securely extract and validate customer details
    const customerDetailsResult = await extractCustomerDetails(
      customerInfo,
      quotes,
      quoteIds,
      supabaseAdmin as SupabaseClient
    );

    if (!customerDetailsResult.success) {
      return {
        success: false,
        error: customerDetailsResult.error
      };
    }

    const customerDetails = customerDetailsResult.data!;

    // Validate customer details
    const customerValidation = CustomerValidator.validateCustomerInfo(customerDetails);
    if (!customerValidation.isValid) {
      SecureLogger.logCustomerOperation(
        'customer_validation_failed',
        { userId, operation: 'create_payment' },
        customerDetails,
        { success: false, error: customerValidation.errors.join(', ') }
      );
      return {
        success: false,
        error: `Customer validation failed: ${customerValidation.errors.join(', ')}`
      };
    }

    const sanitizedCustomerDetails = customerValidation.sanitizedData!;

    // Prepare sanitized metadata for Stripe
    const paymentMetadata = {
      quote_ids: quoteIds.join(','),
      gateway: 'stripe',
      user_id: userId || 'guest',
      customer_name: CustomerValidator.validateForStripeMetadata(sanitizedCustomerDetails.name || ''),
      customer_phone: CustomerValidator.validateForStripeMetadata(sanitizedCustomerDetails.phone || ''),
      original_amount: amount.toString(),
      original_currency: currency,
    };

    // Create or retrieve Stripe customer with error handling
    const stripeCustomerResult = await createOrUpdateStripeCustomer(
      stripe as StripeInstance,
      sanitizedCustomerDetails,
      userId,
      quoteIds[0]
    );

    // Create PaymentIntent with enhanced, validated details
    const paymentIntentData: StripePaymentIntentData = {
      amount: amountInSmallestUnit,
      currency: currency.toLowerCase(),
      metadata: paymentMetadata,
      description: `Payment for ${quotes.length} item(s) - Order: ${quoteIds[0]}`,
      receipt_email: sanitizedCustomerDetails.email || undefined,
      automatic_payment_methods: {
        enabled: true,
      },
    };

    // Add customer if available
    if (stripeCustomerResult.success && stripeCustomerResult.customer) {
      paymentIntentData.customer = stripeCustomerResult.customer.id;
    }

    // Add shipping address if complete and valid
    if (sanitizedCustomerDetails.address && 
        CustomerValidator.isCompleteForPayment(sanitizedCustomerDetails)) {
      paymentIntentData.shipping = {
        name: sanitizedCustomerDetails.name || 'Customer',
        phone: sanitizedCustomerDetails.phone || undefined,
        address: sanitizedCustomerDetails.address,
      };
    }

    const paymentIntent = await (stripe as StripeInstance).paymentIntents.create(paymentIntentData);

    // Secure logging without PII
    SecureLogger.logPaymentCreation(
      {
        transactionId: paymentIntent.id,
        userId,
        operation: 'create_payment',
        gateway: 'stripe'
      },
      sanitizedCustomerDetails,
      {
        amount: amountInSmallestUnit,
        currency: currency,
        hasCustomer: !!(stripeCustomerResult.success && stripeCustomerResult.customer),
        hasShipping: !!paymentIntentData.shipping,
      }
    );

    return {
      success: true,
      client_secret: paymentIntent.client_secret,
      transactionId: paymentIntent.id,
      customer_id: stripeCustomerResult.customer?.id,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    SecureLogger.logCustomerOperation(
      'payment_create_error',
      { userId, operation: 'create_payment' },
      customerInfo || {},
      { success: false, error: errorMessage }
    );

    return {
      success: false,
      error: 'Payment creation failed. Please try again.',
    };
  }
}

/**
 * Validates input parameters for payment creation
 */
function validateInputs(params: EnhancedStripePaymentParams): ValidationResult {
  const errors: string[] = [];

  if (!params.stripe) {
    errors.push('Stripe instance is required');
  }

  if (!params.amount || params.amount <= 0) {
    errors.push('Valid amount is required');
  }

  if (!params.currency || typeof params.currency !== 'string' || params.currency.length !== 3) {
    errors.push('Valid currency code is required');
  }

  if (!params.quoteIds || !Array.isArray(params.quoteIds) || params.quoteIds.length === 0) {
    errors.push('Quote IDs are required');
  }

  if (!params.userId || typeof params.userId !== 'string') {
    errors.push('User ID is required');
  }

  if (!params.quotes || !Array.isArray(params.quotes)) {
    errors.push('Quotes data is required');
  }

  if (!params.supabaseAdmin) {
    errors.push('Supabase admin client is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Securely extracts customer details from multiple sources
 */
async function extractCustomerDetails(
  customerInfo: CustomerInfo | undefined,
  quotes: QuoteData[],
  quoteIds: string[],
  supabaseAdmin: SupabaseClient
): Promise<{ success: boolean; data?: CustomerInfo; error?: string }> {
  try {
    // Start with provided customer info
    let customerDetails: CustomerInfo = {
      name: customerInfo?.name || '',
      email: customerInfo?.email || '',
      phone: customerInfo?.phone || '',
      address: customerInfo?.address || undefined,
    };

    // Fetch additional quote details if needed
    if (quotes && quotes.length > 0) {
      const { data: fullQuotes, error } = await supabaseAdmin
        .from('quotes')
        .select('email, customer_name, customer_phone, shipping_address')
        .in('id', quoteIds);

      if (error) {
        return { success: false, error: 'Failed to fetch quote details' };
      }

      if (fullQuotes && fullQuotes.length > 0) {
        const firstQuote = fullQuotes[0];
        
        // Use quote data if customer info not provided (fallback)
        customerDetails.email = customerDetails.email || firstQuote.email || '';
        customerDetails.name = customerDetails.name || firstQuote.customer_name || '';
        customerDetails.phone = customerDetails.phone || firstQuote.customer_phone || '';
        
        // Extract shipping address if available
        if (firstQuote.shipping_address && !customerDetails.address) {
          const shippingAddr = typeof firstQuote.shipping_address === 'string' 
            ? JSON.parse(firstQuote.shipping_address) as QuoteShippingAddress
            : firstQuote.shipping_address as QuoteShippingAddress;

          if (shippingAddr.streetAddress) {
            customerDetails.address = {
              line1: shippingAddr.streetAddress,
              city: shippingAddr.city || '',
              state: shippingAddr.state || '',
              postal_code: shippingAddr.postalCode || '',
              country: shippingAddr.country || shippingAddr.destination_country || 'US',
            };
            
            // Also update name, phone, email from shipping address if not already set
            customerDetails.name = customerDetails.name || shippingAddr.fullName || '';
            customerDetails.phone = customerDetails.phone || shippingAddr.phone || '';
            customerDetails.email = customerDetails.email || shippingAddr.email || '';
          }
        }
      }
    }

    return { success: true, data: customerDetails };
  } catch (error) {
    return { success: false, error: 'Failed to extract customer details' };
  }
}

/**
 * Creates or updates Stripe customer with error handling
 */
async function createOrUpdateStripeCustomer(
  stripe: StripeInstance,
  customerDetails: CustomerInfo,
  userId: string,
  quoteId: string
): Promise<{ success: boolean; customer?: StripeCustomerRecord; error?: string }> {
  if (!customerDetails.email) {
    return { success: false, error: 'Email required for customer creation' };
  }

  try {
    // Search for existing customer
    const existingCustomers = await stripe.customers.list({
      email: customerDetails.email,
      limit: 1,
    });

    let stripeCustomer: StripeCustomerRecord;

    if (existingCustomers.data.length > 0) {
      // Update existing customer
      stripeCustomer = await stripe.customers.update(existingCustomers.data[0].id, {
        name: customerDetails.name || existingCustomers.data[0].name,
        phone: customerDetails.phone || existingCustomers.data[0].phone,
        address: customerDetails.address || existingCustomers.data[0].address,
        metadata: {
          user_id: userId,
          last_quote_id: quoteId,
        },
      });
    } else {
      // Create new customer
      stripeCustomer = await stripe.customers.create({
        email: customerDetails.email,
        name: customerDetails.name,
        phone: customerDetails.phone,
        address: customerDetails.address,
        metadata: {
          user_id: userId,
          first_quote_id: quoteId,
        },
      });
    }

    return { success: true, customer: stripeCustomer };
  } catch (error) {
    // Log error but don't fail payment - payment can work without customer record
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    SecureLogger.logCustomerOperation(
      'stripe_customer_error',
      { userId, operation: 'create_customer' },
      customerDetails,
      { success: false, error: errorMessage }
    );

    return { success: false, error: 'Customer creation failed but payment can continue' };
  }
}

/**
 * Get currency multiplier for converting to smallest unit
 */
function getCurrencyMultiplier(currency: string): number {
  const zeroDecimalCurrencies = [
    'JPY', 'KRW', 'VND', 'CLP', 'PYG', 'UGX', 'RWF', 'GNF', 
    'XAF', 'XOF', 'XPF', 'MGA', 'BIF', 'KMF', 'DJF'
  ];
  
  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return 1;
  }
  
  return 100;
}