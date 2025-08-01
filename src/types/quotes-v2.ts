// ============================================================================
// QUOTES V2 - Enhanced TypeScript Interfaces
// Complete quote system with business logic, communication, and version control
// ============================================================================

import { UnifiedQuote, CustomerData, CalculationData, QuoteItem } from './unified-quote';

// Enhanced Quote V2 with all business logic fields
export interface QuoteV2 extends UnifiedQuote {
  // Phase 1: Core Business Logic
  validity_days: number;          // How long is quote valid (default: 7)
  expires_at: string | null;      // Calculated expiry timestamp
  sent_at: string | null;         // When quote was sent to customer
  viewed_at: string | null;       // When customer viewed the quote
  share_token: string;            // Unique token for sharing quotes

  // Phase 2: Communication Tracking
  email_sent: boolean;            // Has email been sent
  customer_message: string | null; // Message included with quote
  reminder_count: number;         // Number of reminders sent
  last_reminder_at: string | null; // Last reminder timestamp

  // Phase 3: Version Control
  version: number;                // Quote version number
  parent_quote_id: string | null; // Reference to original quote
  revision_reason: string | null; // Why this revision was created
  is_latest_version: boolean;     // Is this the current version

  // Phase 4: Business Rules
  payment_terms: string | null;   // "50% advance, 50% on delivery"
  approval_required_above: number | null; // Manager approval threshold
  max_discount_allowed: number | null;    // Maximum discount percentage
  minimum_order_value: number | null;     // Minimum order value

  // Phase 5: Integration Points
  converted_to_order_id: string | null;   // Link to order when converted
  original_quote_id: string | null;       // If migrated from V1
  external_reference: string | null;      // Third-party system ID
  api_version: string | null;             // Which API created this
}

// Quote sharing response
export interface QuoteShareInfo {
  quote_id: string;
  share_token: string;
  share_url: string;
  expires_at: string;
  is_expired: boolean;
}

// Quote view tracking
export interface QuoteViewEvent {
  quote_id: string;
  viewed_at: string;
  viewer_ip?: string;
  viewer_user_agent?: string;
  is_customer: boolean;
}

// Quote reminder
export interface QuoteReminder {
  quote_id: string;
  reminder_number: number;
  sent_at: string;
  response?: 'viewed' | 'approved' | 'rejected' | null;
}

// Quote revision
export interface QuoteRevision {
  id: string;
  parent_quote_id: string;
  version: number;
  revision_reason: string;
  created_at: string;
  created_by: string;
  changes_summary?: string;
}

// Active quote view
export interface ActiveQuote extends QuoteV2 {
  is_active: boolean;
  time_remaining: string | null; // PostgreSQL interval as string
}

// Quote status transition
export interface QuoteStatusTransition {
  from_status: string;
  to_status: string;
  allowed: boolean;
  requires_permission?: string;
  validation_errors?: string[];
}

// Quote lifecycle events
export interface QuoteLifecycleEvent {
  quote_id: string;
  event_type: 'created' | 'sent' | 'viewed' | 'reminder_sent' | 'expired' | 
              'approved' | 'rejected' | 'revised' | 'converted_to_order';
  timestamp: string;
  metadata?: Record<string, any>;
}

// Quote analytics
export interface QuoteAnalytics {
  total_quotes: number;
  active_quotes: number;
  expired_quotes: number;
  conversion_rate: number;
  average_validity_days: number;
  average_time_to_approval: string;
  reminder_effectiveness: number;
}

// Quote filters for queries
export interface QuoteFilters {
  status?: string[];
  is_expired?: boolean;
  is_latest_version?: boolean;
  has_reminders?: boolean;
  created_after?: string;
  expires_before?: string;
  customer_id?: string;
  parent_quote_id?: string;
}

// Quote creation input
export interface CreateQuoteV2Input {
  // Required fields from UnifiedQuote
  items: QuoteItem[];
  origin_country: string;
  destination_country: string;
  customer_data: CustomerData;
  
  // Optional business logic fields
  validity_days?: number;
  customer_message?: string;
  payment_terms?: string;
  approval_required_above?: number;
  max_discount_allowed?: number;
  minimum_order_value?: number;
  
  // Optional reference fields
  original_quote_id?: string;
  external_reference?: string;
  api_version?: string;
}

// Quote update input
export interface UpdateQuoteV2Input {
  // Status management
  status?: string;
  
  // Communication
  customer_message?: string;
  email_sent?: boolean;
  
  // Business rules
  payment_terms?: string;
  validity_days?: number;
  
  // Items and calculations
  items?: QuoteItem[];
  calculation_data?: CalculationData;
}

// Helper function types
export type GenerateShareToken = () => string;
export type IsQuoteExpired = (quote_id: string) => Promise<boolean>;
export type TrackQuoteView = (quote_id: string, token?: string) => Promise<boolean>;
export type SendQuoteReminder = (quote_id: string) => Promise<boolean>;
export type CreateQuoteRevision = (original_quote_id: string, reason: string) => Promise<string>;

// Export all types
export type {
  UnifiedQuote,
  CustomerData,
  CalculationData,
  QuoteItem,
} from './unified-quote';