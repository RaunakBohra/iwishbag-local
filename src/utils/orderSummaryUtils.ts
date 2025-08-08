/**
 * Order Summary Utilities - Transform data for OrderSummaryBreakdown
 * 
 * These utilities standardize order summary data from different sources
 * (cart, checkout, quotes) into a common format for the reusable component.
 */

import { currencyService } from '@/services/CurrencyService';
import type { CartItem } from '@/types/cart';

// Standard interface for order summary data
export interface OrderSummaryItem {
  id: string;
  name: string;
  quantity?: number;
  price: number;
  currency: string;
  description?: string;
}

export interface OrderSummaryData {
  items: OrderSummaryItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  serviceFees: number;
  insurance: number;
  discount: number;
  total: number;
  currency: string;
  savings?: number;
}

// Transform cart items into order summary data
export const transformCartToOrderSummary = async (
  cartItems: CartItem[],
  displayCurrency: string,
  includeInsurance: boolean = false,
  insuranceRate: number = 0.015 // 1.5%
): Promise<OrderSummaryData> => {
  if (cartItems.length === 0) {
    return {
      items: [],
      subtotal: 0,
      shipping: 0,
      tax: 0,
      serviceFees: 0,
      insurance: 0,
      discount: 0,
      total: 0,
      currency: displayCurrency
    };
  }

  // Transform cart items to summary items
  const items: OrderSummaryItem[] = [];
  let subtotal = 0;

  for (const cartItem of cartItems) {
    const quote = cartItem.quote;
    const quoteTotal = quote.final_total_origincurrency || quote.total_quote_origincurrency || 0;
    const quoteCurrency = quote.customer_currency || quote.origin_country || 'USD';

    // Convert to display currency if needed
    const convertedTotal = quoteCurrency === displayCurrency 
      ? quoteTotal
      : await currencyService.convertAmount(quoteTotal, quoteCurrency, displayCurrency);

    items.push({
      id: quote.id,
      name: `Quote #${quote.display_id || quote.id.slice(0, 8)}`,
      price: convertedTotal,
      currency: displayCurrency,
      description: `${quote.items?.length || 0} items • ${quote.origin_country} → ${quote.destination_country}`
    });

    subtotal += convertedTotal;
  }

  // Estimate other costs (these would come from proper services in production)
  const estimatedShipping = Math.max(subtotal * 0.08, displayCurrency === 'USD' ? 15 : 800); // 8% or minimum
  const estimatedTax = subtotal * 0.08; // 8%
  const serviceFees = subtotal * 0.02; // 2% service fee
  const insurance = includeInsurance ? subtotal * insuranceRate : 0;
  const discount = 0; // Would come from discount service
  
  const total = subtotal + estimatedShipping + estimatedTax + serviceFees + insurance - discount;

  return {
    items,
    subtotal,
    shipping: estimatedShipping,
    tax: estimatedTax,
    serviceFees,
    insurance,
    discount,
    total,
    currency: displayCurrency
  };
};

// Transform checkout service data into order summary data
export const transformCheckoutToOrderSummary = (
  checkoutSummary: {
    itemsTotal: number;
    shippingTotal: number;
    taxesTotal: number;
    serviceFeesTotal: number;
    insuranceTotal?: number;
    finalTotal: number;
    currency: string;
    savings?: number;
  },
  cartItems?: CartItem[]
): OrderSummaryData => {
  // Transform cart items if provided
  const items: OrderSummaryItem[] = cartItems ? cartItems.map(cartItem => ({
    id: cartItem.quote.id,
    name: `Quote #${cartItem.quote.display_id || cartItem.quote.id.slice(0, 8)}`,
    price: cartItem.quote.final_total_origincurrency || cartItem.quote.total_quote_origincurrency || 0,
    currency: checkoutSummary.currency,
    description: `${cartItem.quote.items?.length || 0} items • ${cartItem.quote.origin_country} → ${cartItem.quote.destination_country}`
  })) : [];

  return {
    items,
    subtotal: checkoutSummary.itemsTotal,
    shipping: checkoutSummary.shippingTotal,
    tax: checkoutSummary.taxesTotal,
    serviceFees: checkoutSummary.serviceFeesTotal,
    insurance: checkoutSummary.insuranceTotal || 0,
    discount: 0, // Would come from discounts in checkout summary
    total: checkoutSummary.finalTotal,
    currency: checkoutSummary.currency,
    savings: checkoutSummary.savings
  };
};

// Transform quote data into order summary data
export const transformQuoteToOrderSummary = (
  quote: Record<string, unknown>,
  displayCurrency: string,
  includeInsurance: boolean = false
): OrderSummaryData => {
  const quoteTotal = quote.final_total_origincurrency || quote.total_quote_origincurrency || 0;
  const quoteCurrency = quote.customer_currency || displayCurrency;

  // Parse calculation data if available
  const calculationData = quote.calculation_data;
  const breakdown = calculationData?.calculation_steps || {};

  const subtotal = breakdown.items_cost || quoteTotal * 0.6; // Estimate if not available
  const shipping = breakdown.shipping_fee || quoteTotal * 0.2;
  const tax = breakdown.customs_duty || quoteTotal * 0.15;
  const serviceFees = breakdown.handling_fee || quoteTotal * 0.05;
  const insurance = includeInsurance ? (breakdown.insurance_amount || subtotal * 0.015) : 0;

  const items: OrderSummaryItem[] = [{
    id: quote.id,
    name: `Quote #${quote.display_id || quote.id.slice(0, 8)}`,
    price: quoteTotal,
    currency: quoteCurrency,
    description: `${quote.items?.length || 0} items • ${quote.origin_country} → ${quote.destination_country}`
  }];

  return {
    items,
    subtotal,
    shipping,
    tax,
    serviceFees,
    insurance,
    discount: 0,
    total: quoteTotal + insurance,
    currency: quoteCurrency
  };
};

// Utility to check if insurance is enabled in any cart quote
export const getInsuranceStateFromCart = async (cartItems: CartItem[]): Promise<boolean> => {
  if (cartItems.length === 0) return false;

  // Check if any quote has insurance enabled
  return cartItems.some(item => {
    const quote = item.quote;
    return quote.insurance_required || 
           (quote.calculation_data?.calculation_steps?.insurance_amount || 0) > 0;
  });
};

// Calculate insurance amount for cart
export const calculateInsuranceForCart = (
  cartItems: CartItem[], 
  rate: number = 0.015
): number => {
  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (item.quote.final_total_origincurrency || item.quote.total_quote_origincurrency || 0);
  }, 0);
  
  return subtotal * rate;
};

export default {
  transformCartToOrderSummary,
  transformCheckoutToOrderSummary,
  transformQuoteToOrderSummary,
  getInsuranceStateFromCart,
  calculateInsuranceForCart
};