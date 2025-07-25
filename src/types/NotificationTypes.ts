// =============================================
// Notification Types & Constants
// =============================================
// This file defines all notification types and their configurations
// for the iwishBag proactive notification system.
// Created: 2025-07-24
// =============================================

// Core notification types enum
export const NOTIFICATION_TYPES = {
  // Quote-related notifications
  QUOTE_EXPIRATION_WARNING: 'quote_expiration_warning',
  QUOTE_APPROVED: 'quote_approved',
  QUOTE_REJECTED: 'quote_rejected',
  QUOTE_CALCULATED: 'quote_calculated',
  QUOTE_PENDING_REVIEW: 'quote_pending_review',

  // Payment-related notifications
  PAYMENT_DUE_REMINDER: 'payment_due_reminder',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_LINK_GENERATED: 'payment_link_generated',

  // Order & Shipping notifications
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_SHIPPED_UPDATE: 'order_shipped_update',
  ORDER_OUT_FOR_DELIVERY: 'order_out_for_delivery',
  ORDER_DELIVERED: 'order_delivered',
  TRACKING_UPDATE: 'tracking_update',

  // Customs & Duties notifications
  CUSTOMS_CLEARANCE_UPDATE: 'customs_clearance_update',
  CUSTOMS_DUTY_CALCULATED: 'customs_duty_calculated',
  CUSTOMS_DOCUMENTATION_REQUIRED: 'customs_documentation_required',

  // Communication notifications
  NEW_MESSAGE_RECEIVED: 'new_message_received',
  ADMIN_REPLY_RECEIVED: 'admin_reply_received',
  SUPPORT_TICKET_UPDATE: 'support_ticket_update',

  // System notifications
  WELCOME_NEW_USER: 'welcome_new_user',
  PROFILE_INCOMPLETE: 'profile_incomplete',
  SECURITY_ALERT: 'security_alert',
  MAINTENANCE_NOTICE: 'maintenance_notice',
  FEATURE_ANNOUNCEMENT: 'feature_announcement',

  // Account notifications
  PASSWORD_CHANGED: 'password_changed',
  EMAIL_VERIFICATION_REQUIRED: 'email_verification_required',
  ACCOUNT_VERIFICATION_COMPLETE: 'account_verification_complete',
} as const;

// Type derivation for TypeScript
export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

// Notification priority levels
export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type NotificationPriority =
  (typeof NOTIFICATION_PRIORITY)[keyof typeof NOTIFICATION_PRIORITY];

// Notification category groupings
export const NOTIFICATION_CATEGORIES = {
  QUOTES: 'quotes',
  ORDERS: 'orders',
  PAYMENTS: 'payments',
  SUPPORT: 'support',
  SYSTEM: 'system',
  ACCOUNT: 'account',
} as const;

export type NotificationCategory =
  (typeof NOTIFICATION_CATEGORIES)[keyof typeof NOTIFICATION_CATEGORIES];

// Notification configuration interface
export interface NotificationConfig {
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  defaultExpiryHours?: number; // Hours until notification expires
  requiresAction?: boolean; // Whether notification requires user action
  allowDismiss?: boolean; // Whether user can dismiss without action
  icon?: string; // Icon name for display
  color?: string; // Color theme for notification
}

// Notification type configurations
export const NOTIFICATION_CONFIGS: Record<NotificationType, NotificationConfig> = {
  // Quote notifications
  [NOTIFICATION_TYPES.QUOTE_EXPIRATION_WARNING]: {
    type: NOTIFICATION_TYPES.QUOTE_EXPIRATION_WARNING,
    category: NOTIFICATION_CATEGORIES.QUOTES,
    priority: NOTIFICATION_PRIORITY.HIGH,
    defaultExpiryHours: 24,
    requiresAction: true,
    allowDismiss: false,
    icon: 'Clock',
    color: 'orange',
  },
  [NOTIFICATION_TYPES.QUOTE_APPROVED]: {
    type: NOTIFICATION_TYPES.QUOTE_APPROVED,
    category: NOTIFICATION_CATEGORIES.QUOTES,
    priority: NOTIFICATION_PRIORITY.HIGH,
    defaultExpiryHours: 168, // 7 days
    requiresAction: true,
    allowDismiss: false,
    icon: 'CheckCircle',
    color: 'green',
  },
  [NOTIFICATION_TYPES.QUOTE_REJECTED]: {
    type: NOTIFICATION_TYPES.QUOTE_REJECTED,
    category: NOTIFICATION_CATEGORIES.QUOTES,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    defaultExpiryHours: 72,
    requiresAction: false,
    allowDismiss: true,
    icon: 'XCircle',
    color: 'red',
  },
  [NOTIFICATION_TYPES.QUOTE_CALCULATED]: {
    type: NOTIFICATION_TYPES.QUOTE_CALCULATED,
    category: NOTIFICATION_CATEGORIES.QUOTES,
    priority: NOTIFICATION_PRIORITY.HIGH,
    defaultExpiryHours: 72,
    requiresAction: true,
    allowDismiss: false,
    icon: 'Calculator',
    color: 'blue',
  },
  [NOTIFICATION_TYPES.QUOTE_PENDING_REVIEW]: {
    type: NOTIFICATION_TYPES.QUOTE_PENDING_REVIEW,
    category: NOTIFICATION_CATEGORIES.QUOTES,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    defaultExpiryHours: 48,
    requiresAction: false,
    allowDismiss: true,
    icon: 'Clock',
    color: 'yellow',
  },

  // Payment notifications
  [NOTIFICATION_TYPES.PAYMENT_DUE_REMINDER]: {
    type: NOTIFICATION_TYPES.PAYMENT_DUE_REMINDER,
    category: NOTIFICATION_CATEGORIES.PAYMENTS,
    priority: NOTIFICATION_PRIORITY.HIGH,
    defaultExpiryHours: 24,
    requiresAction: true,
    allowDismiss: false,
    icon: 'CreditCard',
    color: 'orange',
  },
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: {
    type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
    category: NOTIFICATION_CATEGORIES.PAYMENTS,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    defaultExpiryHours: 72,
    requiresAction: false,
    allowDismiss: true,
    icon: 'CheckCircle',
    color: 'green',
  },
  [NOTIFICATION_TYPES.PAYMENT_FAILED]: {
    type: NOTIFICATION_TYPES.PAYMENT_FAILED,
    category: NOTIFICATION_CATEGORIES.PAYMENTS,
    priority: NOTIFICATION_PRIORITY.URGENT,
    defaultExpiryHours: 12,
    requiresAction: true,
    allowDismiss: false,
    icon: 'AlertCircle',
    color: 'red',
  },
  [NOTIFICATION_TYPES.PAYMENT_LINK_GENERATED]: {
    type: NOTIFICATION_TYPES.PAYMENT_LINK_GENERATED,
    category: NOTIFICATION_CATEGORIES.PAYMENTS,
    priority: NOTIFICATION_PRIORITY.HIGH,
    defaultExpiryHours: 168, // 7 days
    requiresAction: true,
    allowDismiss: false,
    icon: 'Link',
    color: 'blue',
  },

  // Order notifications
  [NOTIFICATION_TYPES.ORDER_CONFIRMED]: {
    type: NOTIFICATION_TYPES.ORDER_CONFIRMED,
    category: NOTIFICATION_CATEGORIES.ORDERS,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    defaultExpiryHours: 72,
    requiresAction: false,
    allowDismiss: true,
    icon: 'Package',
    color: 'green',
  },
  [NOTIFICATION_TYPES.ORDER_SHIPPED_UPDATE]: {
    type: NOTIFICATION_TYPES.ORDER_SHIPPED_UPDATE,
    category: NOTIFICATION_CATEGORIES.ORDERS,
    priority: NOTIFICATION_PRIORITY.HIGH,
    defaultExpiryHours: 168, // 7 days
    requiresAction: false,
    allowDismiss: true,
    icon: 'Truck',
    color: 'blue',
  },
  [NOTIFICATION_TYPES.ORDER_OUT_FOR_DELIVERY]: {
    type: NOTIFICATION_TYPES.ORDER_OUT_FOR_DELIVERY,
    category: NOTIFICATION_CATEGORIES.ORDERS,
    priority: NOTIFICATION_PRIORITY.HIGH,
    defaultExpiryHours: 24,
    requiresAction: false,
    allowDismiss: true,
    icon: 'MapPin',
    color: 'orange',
  },
  [NOTIFICATION_TYPES.ORDER_DELIVERED]: {
    type: NOTIFICATION_TYPES.ORDER_DELIVERED,
    category: NOTIFICATION_CATEGORIES.ORDERS,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    defaultExpiryHours: 168, // 7 days
    requiresAction: false,
    allowDismiss: true,
    icon: 'CheckCircle',
    color: 'green',
  },
  [NOTIFICATION_TYPES.TRACKING_UPDATE]: {
    type: NOTIFICATION_TYPES.TRACKING_UPDATE,
    category: NOTIFICATION_CATEGORIES.ORDERS,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    defaultExpiryHours: 72,
    requiresAction: false,
    allowDismiss: true,
    icon: 'MapPin',
    color: 'blue',
  },

  // Customs notifications
  [NOTIFICATION_TYPES.CUSTOMS_CLEARANCE_UPDATE]: {
    type: NOTIFICATION_TYPES.CUSTOMS_CLEARANCE_UPDATE,
    category: NOTIFICATION_CATEGORIES.ORDERS,
    priority: NOTIFICATION_PRIORITY.HIGH,
    defaultExpiryHours: 48,
    requiresAction: false,
    allowDismiss: true,
    icon: 'Shield',
    color: 'purple',
  },
  [NOTIFICATION_TYPES.CUSTOMS_DUTY_CALCULATED]: {
    type: NOTIFICATION_TYPES.CUSTOMS_DUTY_CALCULATED,
    category: NOTIFICATION_CATEGORIES.PAYMENTS,
    priority: NOTIFICATION_PRIORITY.HIGH,
    defaultExpiryHours: 72,
    requiresAction: true,
    allowDismiss: false,
    icon: 'Calculator',
    color: 'orange',
  },
  [NOTIFICATION_TYPES.CUSTOMS_DOCUMENTATION_REQUIRED]: {
    type: NOTIFICATION_TYPES.CUSTOMS_DOCUMENTATION_REQUIRED,
    category: NOTIFICATION_CATEGORIES.ORDERS,
    priority: NOTIFICATION_PRIORITY.URGENT,
    defaultExpiryHours: 24,
    requiresAction: true,
    allowDismiss: false,
    icon: 'FileText',
    color: 'red',
  },

  // Communication notifications
  [NOTIFICATION_TYPES.NEW_MESSAGE_RECEIVED]: {
    type: NOTIFICATION_TYPES.NEW_MESSAGE_RECEIVED,
    category: NOTIFICATION_CATEGORIES.SUPPORT,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    defaultExpiryHours: 168, // 7 days
    requiresAction: false,
    allowDismiss: true,
    icon: 'MessageCircle',
    color: 'blue',
  },
  [NOTIFICATION_TYPES.ADMIN_REPLY_RECEIVED]: {
    type: NOTIFICATION_TYPES.ADMIN_REPLY_RECEIVED,
    category: NOTIFICATION_CATEGORIES.SUPPORT,
    priority: NOTIFICATION_PRIORITY.HIGH,
    defaultExpiryHours: 72,
    requiresAction: false,
    allowDismiss: true,
    icon: 'Reply',
    color: 'green',
  },
  [NOTIFICATION_TYPES.SUPPORT_TICKET_UPDATE]: {
    type: NOTIFICATION_TYPES.SUPPORT_TICKET_UPDATE,
    category: NOTIFICATION_CATEGORIES.SUPPORT,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    defaultExpiryHours: 120, // 5 days
    requiresAction: false,
    allowDismiss: true,
    icon: 'HelpCircle',
    color: 'purple',
  },

  // System notifications
  [NOTIFICATION_TYPES.WELCOME_NEW_USER]: {
    type: NOTIFICATION_TYPES.WELCOME_NEW_USER,
    category: NOTIFICATION_CATEGORIES.SYSTEM,
    priority: NOTIFICATION_PRIORITY.LOW,
    defaultExpiryHours: 168, // 7 days
    requiresAction: false,
    allowDismiss: true,
    icon: 'Sparkles',
    color: 'teal',
  },
  [NOTIFICATION_TYPES.PROFILE_INCOMPLETE]: {
    type: NOTIFICATION_TYPES.PROFILE_INCOMPLETE,
    category: NOTIFICATION_CATEGORIES.ACCOUNT,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    requiresAction: true,
    allowDismiss: true,
    icon: 'User',
    color: 'yellow',
  },
  [NOTIFICATION_TYPES.SECURITY_ALERT]: {
    type: NOTIFICATION_TYPES.SECURITY_ALERT,
    category: NOTIFICATION_CATEGORIES.ACCOUNT,
    priority: NOTIFICATION_PRIORITY.URGENT,
    defaultExpiryHours: 168, // 7 days
    requiresAction: false,
    allowDismiss: true,
    icon: 'Shield',
    color: 'red',
  },
  [NOTIFICATION_TYPES.MAINTENANCE_NOTICE]: {
    type: NOTIFICATION_TYPES.MAINTENANCE_NOTICE,
    category: NOTIFICATION_CATEGORIES.SYSTEM,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    defaultExpiryHours: 24,
    requiresAction: false,
    allowDismiss: true,
    icon: 'Settings',
    color: 'gray',
  },
  [NOTIFICATION_TYPES.FEATURE_ANNOUNCEMENT]: {
    type: NOTIFICATION_TYPES.FEATURE_ANNOUNCEMENT,
    category: NOTIFICATION_CATEGORIES.SYSTEM,
    priority: NOTIFICATION_PRIORITY.LOW,
    defaultExpiryHours: 336, // 14 days
    requiresAction: false,
    allowDismiss: true,
    icon: 'Sparkles',
    color: 'purple',
  },

  // Account notifications
  [NOTIFICATION_TYPES.PASSWORD_CHANGED]: {
    type: NOTIFICATION_TYPES.PASSWORD_CHANGED,
    category: NOTIFICATION_CATEGORIES.ACCOUNT,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    defaultExpiryHours: 168, // 7 days
    requiresAction: false,
    allowDismiss: true,
    icon: 'Lock',
    color: 'green',
  },
  [NOTIFICATION_TYPES.EMAIL_VERIFICATION_REQUIRED]: {
    type: NOTIFICATION_TYPES.EMAIL_VERIFICATION_REQUIRED,
    category: NOTIFICATION_CATEGORIES.ACCOUNT,
    priority: NOTIFICATION_PRIORITY.HIGH,
    defaultExpiryHours: 72,
    requiresAction: true,
    allowDismiss: false,
    icon: 'Mail',
    color: 'orange',
  },
  [NOTIFICATION_TYPES.ACCOUNT_VERIFICATION_COMPLETE]: {
    type: NOTIFICATION_TYPES.ACCOUNT_VERIFICATION_COMPLETE,
    category: NOTIFICATION_CATEGORIES.ACCOUNT,
    priority: NOTIFICATION_PRIORITY.MEDIUM,
    defaultExpiryHours: 168, // 7 days
    requiresAction: false,
    allowDismiss: true,
    icon: 'CheckCircle',
    color: 'green',
  },
};

// Helper functions
export const getNotificationConfig = (type: NotificationType): NotificationConfig => {
  return NOTIFICATION_CONFIGS[type];
};

export const getNotificationsByCategory = (category: NotificationCategory): NotificationType[] => {
  return Object.values(NOTIFICATION_TYPES).filter(
    (type) => NOTIFICATION_CONFIGS[type].category === category,
  );
};

export const getNotificationsByPriority = (priority: NotificationPriority): NotificationType[] => {
  return Object.values(NOTIFICATION_TYPES).filter(
    (type) => NOTIFICATION_CONFIGS[type].priority === priority,
  );
};

// Default expiry calculation
export const calculateExpiryDate = (type: NotificationType, customHours?: number): Date => {
  const config = getNotificationConfig(type);
  const hours = customHours || config.defaultExpiryHours || 168; // Default 7 days
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
};

// Export all for convenience
export {
  NOTIFICATION_TYPES as NotificationTypes,
  NOTIFICATION_PRIORITY as NotificationPriority,
  NOTIFICATION_CATEGORIES as NotificationCategories,
  NOTIFICATION_CONFIGS as NotificationConfigs,
};
