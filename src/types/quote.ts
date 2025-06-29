export type QuoteStatus = 
  | 'pending'           // Initial state when quote is created
  | 'calculated'        // Quote has been calculated by admin
  | 'sent'             // Quote has been sent to customer
  | 'accepted'         // Customer has accepted the quote
  | 'cancelled'        // Quote has been cancelled
  | 'cod_pending'      // Cash on delivery payment pending
  | 'bank_transfer_pending' // Bank transfer payment pending
  | 'paid'             // Payment received
  | 'ordered'          // Order has been placed
  | 'shipped'          // Order has been shipped
  | 'completed'        // Order has been completed
  | 'rejected';        // Quote has been rejected

export type QuoteApprovalStatus = 
  | 'pending'          // Waiting for customer approval
  | 'approved'         // Customer has approved
  | 'rejected';        // Customer has rejected

export type PaymentMethod = 
  | 'stripe'           // Stripe payment
  | 'cod'              // Cash on delivery
  | 'bank_transfer'    // Bank transfer
  | null;              // No payment method selected

export interface QuoteState {
  status: QuoteStatus;
  approval_status: QuoteApprovalStatus;
  in_cart: boolean;
  payment_method: PaymentMethod;
}

// Status transition validation
export const isValidStatusTransition = (currentState: QuoteState, newState: Partial<QuoteState>): boolean => {
  // If status is changing
  if (newState.status && newState.status !== currentState.status) {
    // Validate status transitions
    switch (currentState.status) {
      case 'pending':
        return ['calculated', 'cancelled'].includes(newState.status);
      case 'calculated':
        return ['sent', 'cancelled'].includes(newState.status);
      case 'sent':
        return ['accepted', 'rejected', 'cancelled'].includes(newState.status);
      case 'accepted':
        return ['cod_pending', 'bank_transfer_pending', 'cancelled'].includes(newState.status);
      case 'cod_pending':
      case 'bank_transfer_pending':
        return ['paid', 'cancelled'].includes(newState.status);
      case 'paid':
        return ['ordered', 'cancelled'].includes(newState.status);
      case 'ordered':
        return ['shipped', 'cancelled'].includes(newState.status);
      case 'shipped':
        return ['completed', 'cancelled'].includes(newState.status);
      default:
        return false;
    }
  }

  // If approval status is changing
  if (newState.approval_status && newState.approval_status !== currentState.approval_status) {
    // Can only change approval status when quote is in 'sent' state
    if (currentState.status !== 'sent') return false;
    return ['approved', 'rejected'].includes(newState.approval_status);
  }

  // If cart status is changing
  if (newState.in_cart !== undefined && newState.in_cart !== currentState.in_cart) {
    // Can only add to cart if quote is approved
    if (newState.in_cart && currentState.approval_status !== 'approved') return false;
    // Can only remove from cart if quote is in cart
    if (!newState.in_cart && !currentState.in_cart) return false;
    return true;
  }

  // If payment method is changing
  if (newState.payment_method !== undefined && newState.payment_method !== currentState.payment_method) {
    // Can only set payment method if quote is accepted
    if (currentState.status !== 'accepted') return false;
    return true;
  }

  return true;
};

// Helper functions for common status checks
export const isQuoteEditable = (state: QuoteState): boolean => {
  return ['pending', 'calculated'].includes(state.status);
};

export const isQuoteApproved = (state: QuoteState): boolean => {
  return state.approval_status === 'approved';
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