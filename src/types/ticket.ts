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
    final_total_usd?: number;
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

// Filter and sort types for admin dashboard
export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  category?: TicketCategory[];
  assigned_to?: string;
  user_id?: string;
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
export const TICKET_STATUS_DESCRIPTIONS: Record<TicketStatus, {
  customer: string;
  admin: string;
}> = {
  open: {
    customer: 'Your ticket has been received and will be reviewed by our support team.',
    admin: 'New ticket that needs attention from support team.'
  },
  in_progress: {
    customer: 'Our support team is actively working on your issue.',
    admin: 'Ticket is currently being worked on by a support agent.'
  },
  pending: {
    customer: 'We need more information from you. Please check your messages and reply to continue.',
    admin: 'Waiting for customer to provide additional information or response.'
  },
  resolved: {
    customer: 'Your issue has been resolved. The ticket will automatically close in a few days if no further action is needed.',
    admin: 'Issue has been resolved. Will auto-close after 7 days unless customer responds.'
  },
  closed: {
    customer: 'This ticket has been closed. Create a new ticket if you need further assistance.',
    admin: 'Ticket is closed and archived.'
  }
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

// Status color mapping for UI badges
export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

// Priority color mapping for UI badges
export const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};
