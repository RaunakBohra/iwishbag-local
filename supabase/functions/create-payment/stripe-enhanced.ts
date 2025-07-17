import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
}

interface Quote {
  id: string;
  email?: string;
  customer_name?: string;
  customer_phone?: string;
  shipping_address?: {
    fullName?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  address: Stripe.AddressParam | null;
}

// Enhanced Stripe payment creation with full customer details
export async function createStripePaymentEnhanced(params: {
  stripe: Stripe;
  amount: number;
  currency: string;
  quoteIds: string[];
  userId: string;
  customerInfo: CustomerInfo;
  quotes: Quote[];
  supabaseAdmin: SupabaseClient;
}) {
  const { stripe, amount, currency, quoteIds, userId, customerInfo, quotes, supabaseAdmin } =
    params;

  // Convert amount to smallest currency unit
  const currencyMultiplier = getCurrencyMultiplier(currency);
  const amountInSmallestUnit = Math.round(amount * currencyMultiplier);

  // Get customer details from quotes if not provided
  const customerDetails: CustomerDetails = {
    name: customerInfo?.name || '',
    email: customerInfo?.email || '',
    phone: customerInfo?.phone || '',
    address: null,
  };

  // Fetch full quote details including shipping address
  if (quotes && quotes.length > 0) {
    const { data: fullQuotes } = await supabaseAdmin
      .from('quotes')
      .select('email, customer_name, customer_phone, shipping_address')
      .in('id', quoteIds);

    if (fullQuotes && fullQuotes.length > 0) {
      const firstQuote = fullQuotes[0];

      // Use quote data if customer info not provided
      customerDetails.email = customerDetails.email || firstQuote.email || '';
      customerDetails.name = customerDetails.name || firstQuote.customer_name || '';
      customerDetails.phone = customerDetails.phone || firstQuote.customer_phone || '';

      // Extract shipping address
      if (firstQuote.shipping_address) {
        const shippingAddr = firstQuote.shipping_address;
        customerDetails.name = customerDetails.name || shippingAddr.fullName || '';
        customerDetails.phone = customerDetails.phone || shippingAddr.phone || '';
        customerDetails.email = customerDetails.email || shippingAddr.email || '';

        // Format address for Stripe
        customerDetails.address = {
          line1: shippingAddr.streetAddress || '',
          city: shippingAddr.city || '',
          state: shippingAddr.state || '',
          postal_code: shippingAddr.postalCode || '',
          country: shippingAddr.country || shippingAddr.destination_country || 'US',
        };
      }
    }
  }

  // Prepare metadata
  const paymentMetadata = {
    quote_ids: quoteIds.join(','),
    gateway: 'stripe',
    user_id: userId || 'guest',
    customer_name: customerDetails.name,
    customer_phone: customerDetails.phone,
    original_amount: amount.toString(),
    original_currency: currency,
  };

  // Create or retrieve Stripe customer
  let stripeCustomer = null;
  if (customerDetails.email) {
    try {
      // Search for existing customer
      const existingCustomers = await stripe.customers.list({
        email: customerDetails.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomer = existingCustomers.data[0];
        // Update customer details if needed
        stripeCustomer = await stripe.customers.update(stripeCustomer.id, {
          name: customerDetails.name || stripeCustomer.name,
          phone: customerDetails.phone || stripeCustomer.phone,
          address: customerDetails.address || stripeCustomer.address,
          metadata: {
            user_id: userId,
            last_quote_id: quoteIds[0],
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
            first_quote_id: quoteIds[0],
          },
        });
      }
    } catch (error) {
      console.error('Error creating/updating Stripe customer:', error);
      // Continue without customer - payment will still work
    }
  }

  // Create PaymentIntent with enhanced details
  const paymentIntentData: Stripe.PaymentIntentCreateParams = {
    amount: amountInSmallestUnit,
    currency: currency.toLowerCase(),
    metadata: paymentMetadata,
    description: `Payment for ${quotes.length} item(s) - Order: ${quoteIds[0]}`,
    receipt_email: customerDetails.email || undefined,
    automatic_payment_methods: {
      enabled: true,
    },
  };

  // Add customer if available
  if (stripeCustomer) {
    paymentIntentData.customer = stripeCustomer.id;
  }

  // Add shipping address if available
  if (customerDetails.address && customerDetails.address.line1) {
    paymentIntentData.shipping = {
      name: customerDetails.name || 'Customer',
      phone: customerDetails.phone || undefined,
      address: customerDetails.address,
    };
  }

  const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

  console.log('Enhanced Stripe PaymentIntent created:', {
    id: paymentIntent.id,
    amount: amountInSmallestUnit,
    currency: currency,
    customer: stripeCustomer?.id || 'none',
    has_shipping: !!paymentIntentData.shipping,
    customer_email: customerDetails.email ? customerDetails.email.substring(0, 3) + '***' : 'none',
  });

  return {
    success: true,
    client_secret: paymentIntent.client_secret,
    transactionId: paymentIntent.id,
    customer_id: stripeCustomer?.id,
  };
}

function getCurrencyMultiplier(currency: string): number {
  // Currencies that don't use decimal places
  const zeroDecimalCurrencies = [
    'JPY',
    'KRW',
    'VND',
    'CLP',
    'PYG',
    'UGX',
    'RWF',
    'GNF',
    'XAF',
    'XOF',
    'XPF',
    'MGA',
    'BIF',
    'KMF',
    'DJF',
  ];

  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return 1;
  }

  // Most currencies use 2 decimal places (multiply by 100)
  return 100;
}
