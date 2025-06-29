// Address management types for the flexible address system

export interface ShippingAddress {
  fullName: string;
  streetAddress: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface AddressChange {
  id: number;
  quoteId: string;
  oldAddress: ShippingAddress | null;
  newAddress: ShippingAddress;
  changedBy: string | null;
  changedAt: string;
  changeReason?: string;
  changeType: 'create' | 'update' | 'lock' | 'unlock';
}

export interface QuoteWithAddress {
  id: string;
  shippingAddress?: ShippingAddress;
  addressLocked: boolean;
  addressUpdatedAt?: string;
  addressUpdatedBy?: string;
  status: string;
  user_id: string;
  country_code?: string;
}

export interface AddressValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AddressUpdateRequest {
  quoteId: string;
  address: ShippingAddress;
  reason?: string;
}

export interface AddressPermissionCheck {
  canEdit: boolean;
  canChangeCountry: boolean;
  isLocked: boolean;
  reason?: string;
}

export interface AddressFormData {
  fullName: string;
  streetAddress: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

// Validation schemas
export const addressValidationSchema = {
  fullName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  streetAddress: {
    required: true,
    minLength: 5,
    maxLength: 200,
  },
  city: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  state: {
    required: false,
    maxLength: 100,
  },
  postalCode: {
    required: true,
    minLength: 3,
    maxLength: 20,
  },
  country: {
    required: true,
    minLength: 2,
    maxLength: 2,
  },
  phone: {
    required: false,
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
  },
  email: {
    required: false,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
};

// Address change types
export type AddressChangeType = 'create' | 'update' | 'lock' | 'unlock';

// Address lock reasons
export const ADDRESS_LOCK_REASONS = {
  PAYMENT_COMPLETED: 'Payment completed',
  ORDER_PLACED: 'Order placed',
  SHIPPED: 'Order shipped',
  ADMIN_LOCK: 'Locked by admin',
} as const;

// Address unlock reasons
export const ADDRESS_UNLOCK_REASONS = {
  ADMIN_UNLOCK: 'Unlocked by admin',
  PAYMENT_FAILED: 'Payment failed',
  ORDER_CANCELLED: 'Order cancelled',
} as const; 