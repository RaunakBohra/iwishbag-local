export type QuotePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface QuoteBreakdown {
  item_price: number;
  sales_tax_price: number;
  merchant_shipping_price: number;
  international_shipping: number;
  customs_and_ecs: number;
  domestic_shipping: number;
  handling_charge: number;
  insurance_amount: number;
  payment_gateway_fee: number;
  sub_total: number;
  vat: number;
  discount: number;
  final_total_usd: number;
  final_total_local?: number;
  exchange_rate: number;
}

export type QuoteStatus =
  | 'pending' // Initial state when quote is created
  | 'sent' // Quote has been sent to customer
  | 'approved' // Customer has approved the quote
  | 'rejected' // Quote has been rejected
  | 'expired' // Quote has expired
  | 'paid' // Payment received
  | 'ordered' // Order has been placed
  | 'shipped' // Order has been shipped
  | 'completed' // Order has been completed
  | 'cancelled'; // Quote or order has been cancelled

export type QuoteApprovalStatus =
  | 'pending' // Waiting for customer approval
  | 'approved' // Customer has approved
  | 'rejected';

export type PaymentMethod =
  | 'stripe' // Stripe payment
  | 'cod' // Cash on delivery
  | 'bank_transfer' // Bank transfer
  | null; // No payment method selected

export interface Quote {
  id: string;
  user_id: string;
  email: string;
  product_name: string;
  product_url: string;
  product_image_url?: string;
  product_notes?: string;
  quantity: number;
  weight_kg: number;
  dimensions_cm: {
    length: number;
    width: number;
    height: number;
  };
  origin_country?: string;
  destination_country: string;
  status: QuoteStatus;
  final_total_usd: number;
  final_total_local?: number;
  final_total_local: number;
  destination_currency: string;
  in_cart: boolean;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason_id?: string;
  rejection_details?: string;
  payment_method?: string;
  paid_at?: string;
  ordered_at?: string;
  shipped_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  priority?: QuotePriority;
  display_id?: string;
  share_token?: string;
  shipping_route_id?: string;
  shipping_carrier?: string;
  customs_percentage?: number;
  breakdown?: QuoteBreakdown;
  items?: {
    id: string;
    name: string;
    price_usd: number;
    weight_kg: number;
    quantity: number;
    url?: string;
    image?: string;
    options?: string;
  }[];
  // Currency and shipping fields
  exchange_rate?: number;
  shipping_address?: ShippingAddress | string; // JSONB field - can be object or JSON string
}

export interface QuoteState {
  status: QuoteStatus;
  in_cart: boolean;
  approved_at?: string;
  rejected_at?: string;
  paid_at?: string;
  ordered_at?: string;
  shipped_at?: string;
  completed_at?: string;
  cancelled_at?: string;
}

// Dynamic status transition validation using status management configuration
// For React components: use the hook version (useStatusTransitionValidation)
// For utility functions: use this version with explicit transition rules
export const isValidStatusTransition = (
  currentState: QuoteState,
  newState: Partial<QuoteState>,
  allowedTransitions?: Record<string, string[]>,
): boolean => {
  // If status is changing
  if (newState.status && newState.status !== currentState.status) {
    // Use provided transition rules (from status management) or fallback to hardcoded
    if (allowedTransitions) {
      return allowedTransitions[currentState.status]?.includes(newState.status) ?? false;
    }

    // FALLBACK: Legacy hardcoded transitions (will be deprecated)
    switch (currentState.status) {
      case 'pending':
        return ['sent', 'rejected'].includes(newState.status);
      case 'sent':
        return ['approved', 'rejected', 'expired'].includes(newState.status);
      case 'approved':
        return ['rejected', 'payment_pending', 'paid'].includes(newState.status);
      case 'rejected':
        return ['approved'].includes(newState.status);
      case 'expired':
        return ['approved'].includes(newState.status);
      case 'payment_pending':
        return ['paid', 'cancelled'].includes(newState.status);
      case 'paid':
        return ['ordered', 'processing', 'cancelled'].includes(newState.status);
      case 'processing':
        return ['ordered', 'shipped', 'cancelled'].includes(newState.status);
      case 'ordered':
        return ['shipped', 'processing', 'cancelled'].includes(newState.status);
      case 'shipped':
        return ['completed', 'cancelled'].includes(newState.status);
      case 'completed':
      case 'cancelled':
        return false; // Terminal states
      default:
        return false;
    }
  }

  // If cart status is changing
  if (newState.in_cart !== undefined && newState.in_cart !== currentState.in_cart) {
    // Can only add to cart if quote status allows cart actions (dynamic check)
    if (newState.in_cart) {
      // Fallback to 'approved' if no dynamic config available
      return ['approved'].includes(currentState.status);
    }
    // Can only remove from cart if quote is in cart
    if (!newState.in_cart && !currentState.in_cart) return false;
    return true;
  }

  return true;
};

// DEPRECATED: Legacy helper functions - Use useStatusManagement() hook instead
// These functions are kept for backward compatibility but should not be used in new code

export const isQuoteEditable = (state: QuoteState, editableStatuses?: string[]): boolean => {
  if (!editableStatuses) {
    console.warn(
      'isQuoteEditable: No status configuration provided. Use useStatusManagement() hook instead.',
    );
    return ['pending', 'calculated'].includes(state.status); // legacy fallback
  }
  return editableStatuses.includes(state.status);
};

export const isQuoteApproved = (state: QuoteState, approvedStatuses?: string[]): boolean => {
  if (!approvedStatuses) {
    console.warn(
      'isQuoteApproved: No status configuration provided. Use useStatusManagement() hook instead.',
    );
    return state.status === 'approved'; // legacy fallback
  }
  return approvedStatuses.includes(state.status);
};

export const isQuoteInCart = (state: QuoteState): boolean => {
  return state.in_cart;
};

export const isQuotePaid = (state: QuoteState, paidStatuses?: string[]): boolean => {
  if (!paidStatuses) {
    console.warn(
      'isQuotePaid: No status configuration provided. Use useStatusManagement() hook instead.',
    );
    return ['paid', 'ordered', 'shipped', 'completed'].includes(state.status); // legacy fallback
  }
  return paidStatuses.includes(state.status);
};

export const isQuoteCompleted = (state: QuoteState, completedStatuses?: string[]): boolean => {
  if (!completedStatuses) {
    console.warn(
      'isQuoteCompleted: No status configuration provided. Use useStatusManagement() hook instead.',
    );
    return state.status === 'completed'; // legacy fallback
  }
  return completedStatuses.includes(state.status);
};

export const isQuoteCancelled = (state: QuoteState, cancelledStatuses?: string[]): boolean => {
  if (!cancelledStatuses) {
    console.warn(
      'isQuoteCancelled: No status configuration provided. Use useStatusManagement() hook instead.',
    );
    return state.status === 'cancelled'; // legacy fallback
  }
  return cancelledStatuses.includes(state.status);
};

export const canAddToCart = (state: QuoteState, cartEligibleStatuses?: string[]): boolean => {
  if (!cartEligibleStatuses) {
    console.warn(
      'canAddToCart: No status configuration provided. Use useStatusManagement() hook instead.',
    );
    return state.status === 'approved' && !state.in_cart; // legacy fallback
  }
  return cartEligibleStatuses.includes(state.status) && !state.in_cart;
};

// RECOMMENDED: Type-safe dynamic status checking
export interface StatusCheckConfig {
  editableStatuses?: string[];
  approvedStatuses?: string[];
  paidStatuses?: string[];
  completedStatuses?: string[];
  cancelledStatuses?: string[];
  cartEligibleStatuses?: string[];
}

// Dynamic status checker that accepts configuration
export const createStatusChecker = (config: StatusCheckConfig) => ({
  isEditable: (state: QuoteState) => isQuoteEditable(state, config.editableStatuses),
  isApproved: (state: QuoteState) => isQuoteApproved(state, config.approvedStatuses),
  isPaid: (state: QuoteState) => isQuotePaid(state, config.paidStatuses),
  isCompleted: (state: QuoteState) => isQuoteCompleted(state, config.completedStatuses),
  isCancelled: (state: QuoteState) => isQuoteCancelled(state, config.cancelledStatuses),
  canAddToCart: (state: QuoteState) => canAddToCart(state, config.cartEligibleStatuses),
});

// Status update function
export const updateQuoteState = (
  currentState: QuoteState,
  updates: Partial<QuoteState>,
): QuoteState | null => {
  const newState = { ...currentState, ...updates };

  if (!isValidStatusTransition(currentState, updates)) {
    return null;
  }

  return newState;
};

export interface ShippingAddress {
  country: string;
  destination_country?: string;
  state?: string;
  city?: string;
  postal_code?: string;
  address_line1?: string;
  address_line2?: string;
  recipient_name?: string;
  phone?: string;
}

export type QuoteItem = {
  id: string;
  quote_id: string;
  product_name: string;
  product_url: string;
  image_url: string;
  item_price: number;
  item_weight: number;
  quantity: number;
  options: string;
  category: 'electronics' | 'clothing' | 'home' | 'other';
  created_at: string;
  updated_at: string;
};
