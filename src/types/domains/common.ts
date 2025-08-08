/**
 * Common Types - Shared interfaces and utilities across all domains
 * Consolidates basic types used throughout the application
 */

// Base entity types
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface EntityWithUser extends BaseEntity {
  user_id: string;
}

// Location and geography
export interface Country {
  code: string;
  name: string;
  currency: string;
  rate_from_usd?: number;
}

export interface Address {
  id?: string;
  recipient_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province_region: string;
  postal_code: string;
  destination_country: string;
  phone?: string;
  is_default?: boolean;
}

// Currency and money
export interface Money {
  amount: number;
  currency: string;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  is_active?: boolean;
  min_payment_amount?: number;
}

// Status enums
export type Status = 
  | 'pending' 
  | 'processing' 
  | 'approved' 
  | 'rejected' 
  | 'completed' 
  | 'cancelled';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// API response wrappers
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form state
export interface FormField<T = any> {
  value: T;
  error?: string;
  touched: boolean;
  required: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// File handling
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  url?: string;
  preview?: string;
}

// Date and time
export interface DateRange {
  start: Date | string;
  end: Date | string;
}

// User preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  currency: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> 
  & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys];

// Event and notification
export interface SystemEvent {
  type: string;
  timestamp: string;
  source: string;
  data?: any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

// Search and filtering
export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  page?: number;
  limit?: number;
}

export interface FilterOption {
  label: string;
  value: string | number;
  count?: number;
}

// Analytics and metrics
export interface Metric {
  name: string;
  value: number;
  unit?: string;
  change?: {
    value: number;
    percentage: number;
    direction: 'up' | 'down';
    period: string;
  };
}

// Loading and async states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T = any> {
  data?: T;
  loading: boolean;
  error?: string;
}

// Service response patterns
export interface ServiceError {
  code: string;
  message: string;
  details?: any;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}