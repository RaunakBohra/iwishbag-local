// User Support Types - Secure interfaces for user-only support system

// Secure user ticket interface - limited data only
export interface SecureUserTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_at: string;
  updated_at: string;
  // NO internal system data, admin info, or detailed metadata
}

// Secure user ticket reply interface
export interface SecureUserTicketReply {
  id: string;
  message: string;
  created_at: string;
  is_admin_reply: boolean;
  admin_user_name?: string; // Only name, no sensitive admin data
}