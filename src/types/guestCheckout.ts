// Types for guest checkout session management
// This prevents quote contamination by storing guest details temporarily

export interface GuestCheckoutSession {
  id: string;
  session_token: string;
  quote_id: string;

  // Guest contact information
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;

  // Guest shipping address (matches quote shipping address format)
  shipping_address?: {
    streetAddress?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    destination_country?: string;
    fullName?: string;
    phone?: string;
  };

  // Payment and session info
  payment_currency?: string;
  payment_method?: string;
  payment_amount?: number;

  // Session lifecycle
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  expires_at: string;

  // Audit fields
  created_at: string;
  updated_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface CreateGuestSessionRequest {
  quote_id: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  shipping_address?: GuestCheckoutSession['shipping_address'];
  payment_currency?: string;
  payment_method?: string;
  payment_amount?: number;
}

export interface UpdateGuestSessionRequest {
  session_token: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  shipping_address?: GuestCheckoutSession['shipping_address'];
  payment_currency?: string;
  payment_method?: string;
  payment_amount?: number;
  status?: GuestCheckoutSession['status'];
}

export interface GuestSessionResponse {
  success: boolean;
  session?: GuestCheckoutSession;
  error?: string;
}

// Utility types for checkout flow
export interface GuestCheckoutState {
  session_token?: string;
  quote_id: string;
  contact: {
    fullName: string;
    email: string;
    phone?: string;
  };
  address: {
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    destination_country: string;
    fullName: string;
    phone?: string;
  };
  payment: {
    currency: string;
    method: string;
    amount: number;
  };
}

// Service interface for guest session management
export interface GuestSessionService {
  createSession(request: CreateGuestSessionRequest): Promise<GuestSessionResponse>;
  updateSession(request: UpdateGuestSessionRequest): Promise<GuestSessionResponse>;
  getSession(sessionToken: string): Promise<GuestSessionResponse>;
  completeSession(sessionToken: string): Promise<GuestSessionResponse>;
  expireSession(sessionToken: string): Promise<GuestSessionResponse>;
  cleanupExpiredSessions(): Promise<{ deletedCount: number }>;
}
