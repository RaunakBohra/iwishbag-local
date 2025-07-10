export type QuoteStatus = 
  | 'pending'           // Initial state when quote is created
  | 'sent'             // Quote has been sent to customer
  | 'approved'         // Customer has approved the quote
  | 'rejected'         // Quote has been rejected
  | 'expired'          // Quote has expired
  | 'paid'             // Payment received
  | 'ordered'          // Order has been placed
  | 'shipped'          // Order has been shipped
  | 'completed'        // Order has been completed
  | 'cancelled';       // Quote or order has been cancelled

export type QuoteApprovalStatus = 
  | 'pending'          // Waiting for customer approval
  | 'approved'         // Customer has approved
  | 'rejected';

export type PaymentMethod = 
  | 'stripe'           // Stripe payment
  | 'cod'              // Cash on delivery
  | 'bank_transfer'    // Bank transfer
  | null;              // No payment method selected

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
  destination_country: string;
  status: QuoteStatus;
  final_total: number;
  final_total_local: number;
  final_currency: string;
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
  quote_items?: QuoteItem[];
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

// Status transition validation
export const isValidStatusTransition = (currentState: QuoteState, newState: Partial<QuoteState>): boolean => {
  // If status is changing
  if (newState.status && newState.status !== currentState.status) {
    // Validate status transitions
    switch (currentState.status) {
      case 'pending':
        return ['sent', 'rejected'].includes(newState.status);
      case 'sent':
        return ['approved', 'rejected', 'expired'].includes(newState.status);
      case 'approved':
        return ['rejected'].includes(newState.status);
      case 'rejected':
        return ['approved'].includes(newState.status);
      case 'expired':
        return ['approved'].includes(newState.status);
      case 'paid':
        return ['ordered', 'cancelled'].includes(newState.status);
      case 'ordered':
        return ['shipped', 'cancelled'].includes(newState.status);
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
    // Can only add to cart if quote is approved
    if (newState.in_cart && currentState.status !== 'approved') return false;
    // Can only remove from cart if quote is in cart
    if (!newState.in_cart && !currentState.in_cart) return false;
    return true;
  }

  return true;
};

// Helper functions for common status checks
export const isQuoteEditable = (state: QuoteState): boolean => {
  return ['pending', 'calculated'].includes(state.status);
};

export const isQuoteApproved = (state: QuoteState): boolean => {
  return state.status === 'approved';
};

export const isQuoteInCart = (state: QuoteState): boolean => {
  return state.in_cart;
};

export const isQuotePaid = (state: QuoteState): boolean => {
  return ['paid', 'ordered', 'shipped', 'completed'].includes(state.status);
};

export const isQuoteCompleted = (state: QuoteState): boolean => {
  return state.status === 'completed';
};

export const isQuoteCancelled = (state: QuoteState): boolean => {
  return state.status === 'cancelled';
};

export const canAddToCart = (state: QuoteState): boolean => {
  return state.status === 'approved' && !state.in_cart;
};

// Status update function
export const updateQuoteState = (
  currentState: QuoteState,
  updates: Partial<QuoteState>
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