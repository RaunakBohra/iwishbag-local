// TypeScript types for the support ticket system

export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketCategory =
  | 'general'
  | 'payment'
  | 'shipping'
  | 'customs'
  | 'refund'
  | 'product'
  | 'technical';

// Customer-friendly help types used in forms
export type CustomerHelpType = 'order_issue' | 'account_question' | 'payment_problem' | 'other';

export interface SupportTicket {
  id: string;
  display_id?: string | null;
  user_id: string;
  quote_id?: string | null;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

// Extended types with joined data for UI display
export interface TicketWithDetails extends SupportTicket {
  user_profile?: {
    id: string;
    email: string;
    full_name?: string;
  };
  assigned_to_profile?: {
    id: string;
    full_name?: string;
    email: string;
  };
  quote?: {
    id: string;
    display_id?: string;
    destination_country: string;
    status: string;
    final_total_origincurrency?: number;
    iwish_tracking_id?: string;
    tracking_status?: string;
    estimated_delivery_date?: string;
    items?: any;
    customer_data?: any;
  };
  reply_count?: number;
  latest_reply_at?: string;
}

export interface TicketReplyWithUser extends TicketReply {
  user_profile?: {
    id: string;
    full_name?: string;
    email: string;
  };
}

// Form types for creating/updating tickets
export interface CreateTicketData {
  quote_id?: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
}

// Customer-friendly form data (used in contact forms)
export interface CreateCustomerTicketData {
  quote_id?: string;
  subject: string;
  description: string;
  help_type: CustomerHelpType;
}

export interface UpdateTicketData {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assigned_to?: string | null;
}

export interface CreateReplyData {
  ticket_id: string;
  message: string;
  is_internal?: boolean;
}

// Customer Satisfaction Survey Types
export interface CustomerSatisfactionSurvey {
  id: string;
  ticket_id: string;
  rating: number; // 1-5 stars
  feedback?: string;
  experience_rating: number; // 1-5 for overall experience
  response_time_rating: number; // 1-5 for response time
  resolution_rating: number; // 1-5 for resolution quality
  would_recommend: boolean;
  additional_comments?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSurveyData {
  ticket_id: string;
  rating: number;
  feedback?: string;
  experience_rating: number;
  response_time_rating: number;
  resolution_rating: number;
  would_recommend: boolean;
  additional_comments?: string;
}

// Filter and sort types for admin dashboard
export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  category?: TicketCategory[];
  assigned_to?: string;
  user_id?: string;
  quote_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

// Enhanced filter interface for the new filter panel
export interface EnhancedTicketFilters {
  searchText?: string;
  statuses?: TicketStatus[];
  priorities?: TicketPriority[];
  categories?: TicketCategory[];
  assignedTo?: string[];
  assignmentStatus?: 'all' | 'assigned' | 'unassigned' | 'mine';
  slaStatus?: 'all' | 'on_track' | 'approaching_deadline' | 'overdue';
  hasOrder?: boolean | null;
  countries?: string[];
  dateRange?: {
    from: Date;
    to: Date;
    type: 'created' | 'updated' | 'resolved';
  };
}

export interface TicketSortOptions {
  field: 'created_at' | 'updated_at' | 'priority' | 'status';
  direction: 'asc' | 'desc';
}

// UI display helpers
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  pending: 'Waiting for Response',
  resolved: 'Resolved',
  closed: 'Closed',
};

// Admin-specific labels (more detailed for internal use)
export const ADMIN_TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  pending: 'Awaiting Customer Reply',
  resolved: 'Resolved',
  closed: 'Closed',
};

// Customer-specific labels (user-friendly language)
export const CUSTOMER_TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'Being Worked On',
  pending: 'Waiting for Your Response',
  resolved: 'Resolved',
  closed: 'Closed',
};

// Status descriptions for tooltips and help text
export const TICKET_STATUS_DESCRIPTIONS: Record<
  TicketStatus,
  {
    customer: string;
    admin: string;
  }
> = {
  open: {
    customer: 'Your ticket has been received and will be reviewed by our support team.',
    admin: 'New ticket that needs attention from support team.',
  },
  in_progress: {
    customer: 'Our support team is actively working on your issue.',
    admin: 'Ticket is currently being worked on by a support agent.',
  },
  pending: {
    customer:
      'We need more information from you. Please check your messages and reply to continue.',
    admin: 'Waiting for customer to provide additional information or response.',
  },
  resolved: {
    customer:
      'Your issue has been resolved. The ticket will automatically close in a few days if no further action is needed.',
    admin: 'Issue has been resolved. Will auto-close after 7 days unless customer responds.',
  },
  closed: {
    customer: 'This ticket has been closed. Create a new ticket if you need further assistance.',
    admin: 'Ticket is closed and archived.',
  },
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  general: 'General Inquiry',
  payment: 'Payment Issue',
  shipping: 'Shipping & Delivery',
  customs: 'Customs & Duties',
  refund: 'Refund Request',
  product: 'Product Question',
  technical: 'Technical Support',
};

// Customer-friendly help type labels
export const CUSTOMER_HELP_TYPE_LABELS: Record<CustomerHelpType, string> = {
  order_issue: 'Order or Delivery Issue',
  account_question: 'Account Question',
  payment_problem: 'Payment Problem',
  other: 'Other',
};

// Status color mapping for UI badges - Intuitive color system
export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-800',           // Blue: New/Active tickets needing attention
  in_progress: 'bg-purple-100 text-purple-800', // Purple: Currently being worked on by admin
  pending: 'bg-yellow-100 text-yellow-800',     // Yellow: Waiting for customer response
  resolved: 'bg-green-100 text-green-800',      // Green: Successfully resolved (positive outcome)
  closed: 'bg-gray-100 text-gray-800',          // Gray: Completed/archived tickets
};

// Priority color mapping for UI badges - Urgency-based system
export const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'bg-slate-100 text-slate-700',           // Slate: Low priority, calm neutral
  medium: 'bg-blue-100 text-blue-800',          // Blue: Standard priority, professional
  high: 'bg-orange-100 text-orange-800',        // Orange: High priority, attention needed
  urgent: 'bg-red-100 text-red-800',            // Red: Urgent, immediate action required
};

// Enhanced color system for special states
export const TICKET_ENHANCED_COLORS = {
  // Unread states - more vibrant colors to grab attention
  unread_indicator: 'bg-blue-500 animate-pulse',     // Bright blue pulsing dot
  unread_urgent: 'bg-red-500 animate-pulse',         // Red pulsing for urgent unread
  unread_background: 'bg-blue-50 border-blue-200',   // Subtle background for unread tickets
  
  // Customer interaction states
  awaiting_customer: 'bg-amber-100 text-amber-800',  // Amber for customer action needed
  customer_replied: 'bg-emerald-100 text-emerald-800 border-emerald-300', // Emerald for new customer reply
  
  // Admin action states  
  admin_working: 'bg-indigo-100 text-indigo-800',    // Indigo for admin actively working
  escalated: 'bg-rose-100 text-rose-800',            // Rose for escalated tickets
  
  // Status-specific border colors (for cards and highlights)
  border_colors: {
    open: 'border-blue-300',
    in_progress: 'border-purple-300', 
    pending: 'border-yellow-300',
    resolved: 'border-green-300',
    closed: 'border-gray-300',
  }
};

/**
 * COMPREHENSIVE COLOR GUIDE FOR TICKET SYSTEM
 * ===========================================
 * 
 * STATUS COLORS (Intuitive Logic):
 * - Open (Blue): New tickets needing attention - fresh and actionable
 * - In Progress (Purple): Currently being worked on by admin - distinctive work state  
 * - Pending (Yellow): Waiting for customer response - warning/attention needed
 * - Resolved (Green): Successfully resolved - positive completion
 * - Closed (Gray): Completed/archived - neutral completion
 * 
 * PRIORITY COLORS (Urgency-Based):
 * - Low (Slate): Calm, low urgency
 * - Medium (Blue): Standard, professional
 * - High (Orange): Elevated attention needed
 * - Urgent (Red): Immediate action required
 * 
 * UNREAD INDICATORS:
 * - Blue dot: Standard unread customer reply
 * - Orange dot: High priority unread reply  
 * - Red dot: Urgent priority unread reply
 * - Background: Subtle tinted background for unread tickets
 * 
 * VISUAL HIERARCHY:
 * - Left border: Priority indication (4px colored border)
 * - Background: Unread state indication (tinted background)
 * - Dot indicator: Unread customer replies (animated pulse)
 * - Status badges: Current ticket state (colored text badges)
 */
