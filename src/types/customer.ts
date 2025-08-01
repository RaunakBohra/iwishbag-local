// Customer types shared across components
export type Customer = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null; // From auth.users
  country: string | null; // Country code from profile
  cod_enabled: boolean;
  internal_notes: string | null;
  tags: string | null; // Comma-separated tags for categorization
  created_at: string;
  delivery_addresses: {
    id: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    country: string;
    postal_code: string;
    is_default: boolean;
  }[];
};

export type CustomerAnalytics = {
  customerId: string;
  totalSpent: number;
  orderCount: number;
  quoteCount: number;
  avgOrderValue: number;
  lastActivity: Date;
};
