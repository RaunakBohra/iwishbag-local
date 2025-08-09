/**
 * Analytics Helper Functions
 * 
 * Provides convenience functions for tracking common business events
 * across the iwishBag platform.
 */

import { analytics } from './analytics';

/**
 * Track quote-related events
 */
export const trackQuoteEvent = (eventType: 'quote_requested' | 'quote_approved' | 'quote_rejected', quote: any) => {
  const currency = quote.destination_country === 'NP' ? 'NPR' : 'INR';
  
  analytics.trackEngagement({
    event_name: eventType,
    quote_id: quote.id,
    quote_value: quote.total_quote_origincurrency,
    user_type: 'admin', // Assuming admin is making status changes
  });

  // For approved quotes, also track as a potential sale
  if (eventType === 'quote_approved') {
    analytics.trackEcommerce({
      event_name: 'view_item',
      currency,
      value: quote.total_quote_origincurrency || 0,
      items: [{
        item_id: quote.id,
        item_name: quote.customer_data?.description || `Quote ${quote.id}`,
        category: 'quote',
        quantity: 1,
        price: quote.total_quote_origincurrency || 0,
      }]
    });
  }
};

/**
 * Track order status changes
 */
export const trackOrderStatusChange = (orderId: string, oldStatus: string, newStatus: string, orderValue?: number) => {
  analytics.trackEngagement({
    event_name: 'order_status_updated',
    quote_id: orderId,
    quote_value: orderValue,
    user_type: 'admin',
  });

  // Track specific milestone events
  if (newStatus === 'shipped') {
    analytics.trackEngagement({
      event_name: 'order_shipped',
      quote_id: orderId,
      quote_value: orderValue,
      user_type: 'admin',
    });
  } else if (newStatus === 'delivered' || newStatus === 'completed') {
    analytics.trackEngagement({
      event_name: 'order_delivered',
      quote_id: orderId,
      quote_value: orderValue,
      user_type: 'admin',
    });
  }
};

/**
 * Track payment events
 */
export const trackPaymentEvent = (eventType: 'payment_initiated' | 'payment_completed' | 'payment_failed', paymentData: {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
}) => {
  const { orderId, amount, currency, paymentMethod } = paymentData;

  if (eventType === 'payment_completed') {
    analytics.trackEcommerce({
      event_name: 'add_payment_info',
      currency,
      value: amount,
      transaction_id: orderId,
      items: [{
        item_id: orderId,
        item_name: `Order ${orderId}`,
        category: 'order',
        quantity: 1,
        price: amount,
      }]
    });
  }

  analytics.trackEngagement({
    event_name: eventType,
    quote_id: orderId,
    quote_value: amount,
    user_type: 'customer',
  });
};

/**
 * Track user registration and key user actions
 */
export const trackUserEvent = (eventType: 'user_registration' | 'profile_completed' | 'first_quote_request', userData?: {
  userId: string;
  country?: string;
  userType?: 'new' | 'returning';
}) => {
  analytics.trackEngagement({
    event_name: eventType,
    user_type: userData?.userType || 'new',
  });
};

/**
 * Track page views with business context
 */
export const trackBusinessPageView = (pageName: string, context?: {
  quoteId?: string;
  orderId?: string;
  category?: string;
}) => {
  analytics.trackPageView(
    `iwishBag - ${pageName}`,
    window.location.href
  );

  // Add business context if provided
  if (context?.quoteId || context?.orderId) {
    analytics.trackEngagement({
      event_name: 'page_view',
      page_title: pageName,
      quote_id: context.quoteId || context.orderId,
      user_type: 'customer',
    });
  }
};

/**
 * Track search and discovery events
 */
export const trackSearchEvent = (searchTerm: string, resultsCount: number, category?: string) => {
  analytics.trackEngagement({
    event_name: 'search_performed',
    page_title: `Search: ${searchTerm}`,
    user_type: 'customer',
  });
};

/**
 * Track performance milestones
 */
export const trackPerformanceMilestone = (milestone: string, value: number, unit: string) => {
  analytics.trackEngagement({
    event_name: 'performance_milestone',
    page_title: milestone,
    quote_value: value,
    user_type: 'system',
  });
};

export default {
  trackQuoteEvent,
  trackOrderStatusChange,
  trackPaymentEvent,
  trackUserEvent,
  trackBusinessPageView,
  trackSearchEvent,
  trackPerformanceMilestone,
};