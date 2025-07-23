// Customer types shared across components
export type Customer = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  cod_enabled: boolean;
  internal_notes: string | null;
  created_at: string;
  user_addresses: {
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