/**
 * Airwallex API integration module for payment processing
 * Handles creation of Airwallex payment intents and related operations
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createWebhookHeaders } from '../_shared/cors.ts';

// Note: The Airwallex SDK doesn't work properly in Deno environment
// Using direct API calls instead

/**
 * Customer information for Airwallex payments
 */
interface AirwallexCustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

/**
 * Quote data structure for Airwallex payments
 */
interface AirwallexQuote {
  id: string;
  user_id?: string;
  product_name?: string;
  final_total_usd?: number;
  quantity?: number;
  destination_currency?: string;
  email?: string;
  customer_name?: string;
  customer_phone?: string;
  shipping_address?: Record<string, unknown>;
}

/**
 * Parameters for creating an Airwallex payment intent
 */
interface CreateAirwallexPaymentParams {
  apiKey: string;
  clientId: string;
  testMode: boolean;
  amount: number;
  currency: string;
  quoteIds: string[];
  userId: string;
  customerInfo?: AirwallexCustomerInfo;
  quotes: AirwallexQuote[];
  supabaseAdmin: SupabaseClient;
}

/**
 * Response structure for Airwallex payment creation
 */
interface AirwallexPaymentResponse {
  success: boolean;
  client_secret?: string;
  transactionId?: string;
  error?: string;
  paymentIntentId?: string;
  confirmationUrl?: string;
}

/**
 * Creates an Airwallex payment intent with the provided parameters
 *
 * @param params - The payment creation parameters
 * @returns Promise<AirwallexPaymentResponse> - The payment creation response
 */
export async function createAirwallexPaymentIntent(
  params: CreateAirwallexPaymentParams,
): Promise<AirwallexPaymentResponse> {
  const {
    apiKey,
    clientId,
    testMode,
    amount,
    currency,
    quoteIds,
    userId,
    customerInfo,
    quotes,
    supabaseAdmin,
  } = params;

  try {
    // Log the received parameters for debugging
    console.log('createAirwallexPaymentIntent called with:', {
      amount,
      currency,
      quoteIds,
      userId,
      hasCustomerInfo: !!customerInfo,
      quotesCount: quotes.length,
      customerEmail: customerInfo?.email || 'not provided',
      customerName: customerInfo?.name || 'not provided',
      testMode,
      hasApiKey: !!apiKey,
      hasClientId: !!clientId,
    });

    // Validate input parameters first
    if (!amount || amount <= 0) {
      throw new Error('Invalid payment amount');
    }

    if (!currency || currency.length !== 3) {
      throw new Error('Invalid currency code');
    }

    if (!quoteIds || quoteIds.length === 0) {
      throw new Error('No quote IDs provided');
    }

    // Validate currency is supported by Airwallex
    if (!isCurrencySupportedByAirwallex(currency)) {
      throw new Error(`Currency ${currency} is not supported by Airwallex`);
    }

    // Format amount for Airwallex (convert to smallest currency unit)
    const formattedAmount = formatAmountForAirwallex(amount, currency);

    // Try OAuth2 authentication first
    console.log('🔐 Attempting OAuth2 authentication...');
    const accessToken = await getAirwallexAccessToken(apiKey, clientId, testMode);

    if (!accessToken) {
      console.log('⚠️ OAuth2 authentication failed. Trying direct API key approach...');
      return await createPaymentWithoutAuth(params);
    }

    console.log('✅ Got access token, creating payment intent with OAuth2...');

    // If we have an access token, use it to create the payment intent
    if (accessToken) {
      // Construct the Airwallex payment intent request payload
      const paymentIntentRequest = {
        // Required fields
        amount: formattedAmount,
        currency: currency.toUpperCase(),

        // Customer information
        customer: customerInfo
          ? {
              email: customerInfo.email,
              first_name: customerInfo.name?.split(' ')[0],
              last_name: customerInfo.name?.split(' ').slice(1).join(' '),
              phone_number: customerInfo.phone,
              // Address information if available
              ...(customerInfo.address && {
                address: {
                  street: customerInfo.address.line1,
                  city: customerInfo.address.city,
                  state: customerInfo.address.state,
                  postcode: customerInfo.address.postal_code,
                  country_code: customerInfo.address.country,
                },
              }),
            }
          : undefined,

        // Metadata for tracking
        metadata: {
          quote_ids: quoteIds.join(','),
          user_id: userId,
          quotes_count: quotes.length.toString(),
          total_items: quotes.reduce((sum, q) => sum + (q.quantity || 1), 0).toString(),
        },

        // Description for the payment
        description: `Payment for ${quotes.length} item(s) - Order: ${quoteIds.join(', ')}`,

        // Merchant order information
        merchant_order_id: quoteIds[0], // Use first quote ID as order ID

        // Return URL for 3DS or redirect flows
        return_url: `${Deno.env.get('FRONTEND_URL') || 'https://whyteclub.com'}/payment/complete`,

        // Request ID for idempotency
        request_id: `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      console.log('Creating Airwallex payment intent with request:', {
        amount: formattedAmount,
        currency: currency.toUpperCase(),
        hasCustomer: !!paymentIntentRequest.customer,
        metadataKeys: Object.keys(paymentIntentRequest.metadata || {}),
        fullRequest: paymentIntentRequest,
      });

      // Make the actual API call to Airwallex using the access token
      const airwallexApiUrl = testMode
        ? 'https://api-demo.airwallex.com/api/v1/pa/payment_intents/create'
        : 'https://api.airwallex.com/api/v1/pa/payment_intents/create';

      console.log('🔐 Making Airwallex payment intent API call:', {
        url: airwallexApiUrl,
        hasAccessToken: !!accessToken,
        tokenLength: accessToken.length,
      });

      const response = await fetch(airwallexApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'x-api-version': '2024-06-14', // Latest API version
        },
        body: JSON.stringify(paymentIntentRequest),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Airwallex API error (${response.status}): ${errorData}`);
      }

      const paymentIntent = await response.json();

      console.log('Airwallex payment intent created successfully:', {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      });

      // Extract the transaction ID for our internal tracking
      const transactionId = `airwallex_${paymentIntent.id}`;

      // Create payment transaction record in database
      const { error: insertError } = await supabaseAdmin.from('payment_transactions').insert({
        transaction_id: transactionId,
        quote_ids: quoteIds,
        user_id: userId,
        gateway: 'airwallex',
        amount: amount, // Store original amount (not formatted)
        currency: currency,
        status: 'pending',
        gateway_response: {
          payment_intent_id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          customer: paymentIntent.customer,
          metadata: paymentIntent.metadata,
          created_at: paymentIntent.created_at,
          merchant_order_id: paymentIntent.merchant_order_id,
        },
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error('Failed to insert payment transaction:', insertError);
        // Continue anyway as the payment intent was created successfully
      }

      // For Airwallex HPP, we don't construct a direct URL
      // Instead, the frontend needs to use Airwallex SDK's redirectToCheckout method

      console.log('Airwallex payment intent created, returning data for HPP redirect');

      // Return success response with data needed for Airwallex HPP
      return {
        success: true,
        client_secret: paymentIntent.client_secret,
        transactionId: transactionId,
        paymentIntentId: paymentIntent.id,
        // Include all data needed for redirectToCheckout
        confirmationUrl: null, // We'll handle redirect on frontend
        airwallexData: {
          intent_id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          currency: paymentIntent.currency,
          amount: paymentIntent.amount,
          env: testMode ? 'demo' : 'prod',
        },
      };
    }

    // This should not happen if the flow is correct
    throw new Error('No authentication method succeeded');
  } catch (error) {
    console.error('Airwallex payment intent creation error:', error);

    // Handle different types of errors
    let errorMessage = 'Unknown error occurred';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      // Handle Airwallex API errors which might have a specific structure
      const apiError = error as {
        message?: string;
        code?: string;
        status?: number;
      };
      errorMessage = apiError.message || apiError.code || 'Airwallex API error';

      // Log additional error details for debugging
      console.error('Airwallex API error details:', {
        code: apiError.code,
        status: apiError.status,
        message: apiError.message,
      });
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Helper function to format amount for Airwallex
 * Airwallex typically expects amounts in the smallest currency unit
 */
export function formatAmountForAirwallex(amount: number, currency: string): number {
  // Most currencies use 2 decimal places (100 cents = 1 dollar)
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'UGX'];
  const threeDecimalCurrencies = ['BHD', 'JOD', 'KWD', 'OMR', 'TND'];

  const upperCurrency = currency.toUpperCase();

  if (zeroDecimalCurrencies.includes(upperCurrency)) {
    return Math.round(amount);
  } else if (threeDecimalCurrencies.includes(upperCurrency)) {
    return Math.round(amount * 1000);
  } else {
    return Math.round(amount * 100);
  }
}

/**
 * Validates if a currency is supported by Airwallex
 */
export function isCurrencySupportedByAirwallex(currency: string): boolean {
  // List of currencies supported by Airwallex (this is a subset, full list should be fetched from API)
  const supportedCurrencies = [
    'USD',
    'EUR',
    'GBP',
    'CAD',
    'AUD',
    'JPY',
    'SGD',
    'HKD',
    'CNY',
    'NZD',
    'THB',
    'KRW',
    'PHP',
    'IDR',
    'MYR',
    'VND',
    'INR',
    'CHF',
    'SEK',
    'NOK',
    'DKK',
    'PLN',
    'CZK',
    'HUF',
    'RON',
    'BGN',
    'HRK',
    'AED',
    'SAR',
    'QAR',
    'KWD',
    'BHD',
    'OMR',
    'JOD',
    'ILS',
    'TRY',
    'ZAR',
    'NGN',
    'GHS',
    'KES',
    'EGP',
    'MAD',
    'TND',
  ];

  return supportedCurrencies.includes(currency.toUpperCase());
}

/**
 * Creates payment without authentication, using API key directly
 */
async function createPaymentWithoutAuth(
  params: CreateAirwallexPaymentParams,
): Promise<AirwallexPaymentResponse> {
  const {
    apiKey,
    clientId,
    testMode,
    amount,
    currency,
    quoteIds,
    userId,
    customerInfo,
    quotes,
    supabaseAdmin,
  } = params;

  try {
    console.log('🔐 Creating payment with direct API key authentication');

    // Validate input parameters
    if (!amount || amount <= 0) {
      throw new Error('Invalid payment amount');
    }

    if (!currency || currency.length !== 3) {
      throw new Error('Invalid currency code');
    }

    if (!quoteIds || quoteIds.length === 0) {
      throw new Error('No quote IDs provided');
    }

    // Validate currency is supported by Airwallex
    if (!isCurrencySupportedByAirwallex(currency)) {
      throw new Error(`Currency ${currency} is not supported by Airwallex`);
    }

    // Format amount for Airwallex (convert to smallest currency unit)
    const formattedAmount = formatAmountForAirwallex(amount, currency);

    // Construct the Airwallex payment intent request payload
    const paymentIntentRequest = {
      // Required fields
      amount: formattedAmount,
      currency: currency.toUpperCase(),

      // Customer information
      customer: customerInfo
        ? {
            email: customerInfo.email,
            first_name: customerInfo.name?.split(' ')[0],
            last_name: customerInfo.name?.split(' ').slice(1).join(' '),
            phone_number: customerInfo.phone,
            // Address information if available
            ...(customerInfo.address && {
              address: {
                street: customerInfo.address.line1,
                city: customerInfo.address.city,
                state: customerInfo.address.state,
                postcode: customerInfo.address.postal_code,
                country_code: customerInfo.address.country,
              },
            }),
          }
        : undefined,

      // Metadata for tracking
      metadata: {
        quote_ids: quoteIds.join(','),
        user_id: userId,
        quotes_count: quotes.length.toString(),
        total_items: quotes.reduce((sum, q) => sum + (q.quantity || 1), 0).toString(),
      },

      // Description for the payment
      description: `Payment for ${quotes.length} item(s) - Order: ${quoteIds.join(', ')}`,

      // Merchant order information
      merchant_order_id: quoteIds[0], // Use first quote ID as order ID

      // Return URL for 3DS or redirect flows
      return_url: `${Deno.env.get('FRONTEND_URL') || 'https://whyteclub.com'}/payment/complete`,

      // Request ID for idempotency
      request_id: `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const airwallexApiUrl = testMode
      ? 'https://api-demo.airwallex.com/api/v1/pa/payment_intents/create'
      : 'https://api.airwallex.com/api/v1/pa/payment_intents/create';

    console.log('🔐 Making direct API call with x-api-key and x-client-id headers');

    // Use x-api-key and x-client-id headers for direct authentication
    const response = await fetch(airwallexApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'x-client-id': clientId,
        'x-api-version': '2024-06-14', // Latest API version
      },
      body: JSON.stringify(paymentIntentRequest),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Airwallex API error (${response.status}): ${errorData}`);
    }

    const paymentIntent = await response.json();

    console.log('Airwallex payment intent created successfully:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });

    // Extract the transaction ID for our internal tracking
    const transactionId = `airwallex_${paymentIntent.id}`;

    // Create payment transaction record in database
    const { error: insertError } = await supabaseAdmin.from('payment_transactions').insert({
      transaction_id: transactionId,
      quote_ids: quoteIds,
      user_id: userId,
      gateway: 'airwallex',
      amount: amount, // Store original amount (not formatted)
      currency: currency,
      status: 'pending',
      gateway_response: {
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        customer: paymentIntent.customer,
        metadata: paymentIntent.metadata,
        created_at: paymentIntent.created_at,
        merchant_order_id: paymentIntent.merchant_order_id,
      },
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Failed to insert payment transaction:', insertError);
      // Continue anyway as the payment intent was created successfully
    }

    // For Airwallex HPP, we don't construct a direct URL
    // Instead, the frontend needs to use Airwallex SDK's redirectToCheckout method
    // We'll return the necessary data for the frontend to initiate the redirect

    console.log('Airwallex payment intent created, returning data for HPP redirect');

    // Return success response with data needed for Airwallex HPP
    return {
      success: true,
      client_secret: paymentIntent.client_secret,
      transactionId: transactionId,
      paymentIntentId: paymentIntent.id,
      // Include all data needed for redirectToCheckout
      confirmationUrl: null, // We'll handle redirect on frontend
      airwallexData: {
        intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        currency: paymentIntent.currency,
        amount: paymentIntent.amount,
        env: testMode ? 'demo' : 'prod',
      },
    };
  } catch (error) {
    console.error('Direct API key payment creation error:', error);

    let errorMessage = 'Unknown error occurred';

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Gets an access token from Airwallex using API key and client ID
 */
async function getAirwallexAccessToken(
  apiKey: string,
  clientId: string,
  testMode: boolean,
): Promise<string | null> {
  try {
    console.log('🔐 Getting Airwallex access token...', {
      testMode,
      authUrl: testMode
        ? 'https://api-demo.airwallex.com/api/v1/authentication/login'
        : 'https://api.airwallex.com/api/v1/authentication/login',
      hasApiKey: !!apiKey,
      hasClientId: !!clientId,
      apiKeyLength: apiKey?.length || 0,
      clientIdLength: clientId?.length || 0,
    });

    const authUrl = testMode
      ? 'https://api-demo.airwallex.com/api/v1/authentication/login'
      : 'https://api.airwallex.com/api/v1/authentication/login';

    // According to Airwallex docs, authentication should use POST with headers
    console.log('🔐 Using POST with headers for authentication...');

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'x-api-version': '2024-06-14',
      },
    });

    console.log('🔐 Auth response details:', {
      status: response.status,
      statusText: response.statusText,
      url: authUrl,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.text();
        console.log('🔐 Response body (raw):', errorData);

        // Try to parse as JSON for better formatting
        try {
          const errorJson = JSON.parse(errorData);
          console.error('❌ Airwallex authentication failed (parsed):', errorJson);
        } catch {
          console.error('❌ Airwallex authentication failed (raw):', errorData);
        }
      } catch (readError) {
        console.error('❌ Could not read response body:', readError);
      }
      return null;
    }

    const authData = await response.json();
    console.log('✅ Airwallex authentication successful', {
      hasToken: !!authData.token,
      tokenLength: authData.token?.length || 0,
      expiresAt: authData.expires_at,
    });

    return authData.token;
  } catch (error) {
    console.error('❌ Error getting Airwallex access token:', {
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
}
