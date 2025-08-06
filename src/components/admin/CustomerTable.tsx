// ============================================================================
// CUSTOMER TABLE TYPES - Type definitions for customer management components
// Provides Customer and CustomerAnalytics interfaces for table components
// ============================================================================

export interface Customer {
  id: string;
  email?: string | null;
  full_name: string | null;
  country?: string | null;
  cod_enabled: boolean;
  internal_notes: string | null;
  created_at: string;
  tags?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  last_sign_in_at?: string | null;
  quote_count?: number;
  total_spent?: number;
  role?: string;
  delivery_addresses?: Array<{
    id: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    destination_country: string;
    postal_code: string;
    is_default: boolean;
  }>;
}

export interface CustomerAnalytics {
  customerId: string;
  totalSpent: number;
  orderCount: number;
  averageOrderValue: number;
  lastOrderDate?: string;
  lifetimeValue: number;
  riskScore: number;
  loyaltyLevel: 'new' | 'regular' | 'loyal' | 'vip';
}

// Re-export for backward compatibility
export type { Customer as CustomerProfile };