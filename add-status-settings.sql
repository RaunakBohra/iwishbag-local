-- Add status settings to existing database
-- Run this script to enable Status Management editing functionality

-- Insert quote statuses configuration
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES (
  'quote_statuses', 
  '[
    {
      "id": "pending",
      "name": "pending",
      "label": "Pending",
      "description": "Quote request is awaiting review",
      "color": "secondary",
      "icon": "Clock",
      "isActive": true,
      "order": 1,
      "allowedTransitions": ["sent", "rejected"],
      "isTerminal": false,
      "category": "quote"
    },
    {
      "id": "sent",
      "name": "sent",
      "label": "Sent",
      "description": "Quote has been sent to customer",
      "color": "outline",
      "icon": "FileText",
      "isActive": true,
      "order": 2,
      "allowedTransitions": ["approved", "rejected", "expired"],
      "autoExpireHours": 168,
      "isTerminal": false,
      "category": "quote"
    },
    {
      "id": "approved",
      "name": "approved",
      "label": "Approved",
      "description": "Customer has approved the quote",
      "color": "default",
      "icon": "CheckCircle",
      "isActive": true,
      "order": 3,
      "allowedTransitions": ["rejected"],
      "isTerminal": false,
      "category": "quote"
    },
    {
      "id": "rejected",
      "name": "rejected",
      "label": "Rejected",
      "description": "Quote has been rejected",
      "color": "destructive",
      "icon": "XCircle",
      "isActive": true,
      "order": 4,
      "allowedTransitions": ["approved"],
      "isTerminal": true,
      "category": "quote"
    },
    {
      "id": "expired",
      "name": "expired",
      "label": "Expired",
      "description": "Quote has expired",
      "color": "destructive",
      "icon": "AlertTriangle",
      "isActive": true,
      "order": 5,
      "allowedTransitions": ["approved"],
      "isTerminal": true,
      "category": "quote"
    },
    {
      "id": "calculated",
      "name": "calculated",
      "label": "Calculated",
      "description": "Quote has been calculated and is ready for review",
      "color": "secondary",
      "icon": "Calculator",
      "isActive": true,
      "order": 6,
      "allowedTransitions": ["sent", "approved", "rejected"],
      "isTerminal": false,
      "category": "quote"
    }
  ]',
  'Quote status configuration'
)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Insert order statuses configuration
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES (
  'order_statuses', 
  '[
    {
      "id": "paid",
      "name": "paid",
      "label": "Paid",
      "description": "Payment has been received",
      "color": "default",
      "icon": "DollarSign",
      "isActive": true,
      "order": 1,
      "allowedTransitions": ["ordered", "cancelled"],
      "isTerminal": false,
      "category": "order"
    },
    {
      "id": "ordered",
      "name": "ordered",
      "label": "Ordered",
      "description": "Order has been placed with merchant",
      "color": "default",
      "icon": "ShoppingCart",
      "isActive": true,
      "order": 2,
      "allowedTransitions": ["shipped", "cancelled"],
      "isTerminal": false,
      "category": "order"
    },
    {
      "id": "shipped",
      "name": "shipped",
      "label": "Shipped",
      "description": "Order has been shipped",
      "color": "secondary",
      "icon": "Truck",
      "isActive": true,
      "order": 3,
      "allowedTransitions": ["completed", "cancelled"],
      "isTerminal": false,
      "category": "order"
    },
    {
      "id": "completed",
      "name": "completed",
      "label": "Completed",
      "description": "Order has been delivered",
      "color": "outline",
      "icon": "CheckCircle",
      "isActive": true,
      "order": 4,
      "allowedTransitions": [],
      "isTerminal": true,
      "category": "order"
    },
    {
      "id": "cancelled",
      "name": "cancelled",
      "label": "Cancelled",
      "description": "Quote or order has been cancelled",
      "color": "destructive",
      "icon": "XCircle",
      "isActive": true,
      "order": 5,
      "allowedTransitions": [],
      "isTerminal": true,
      "category": "order"
    }
  ]',
  'Order status configuration'
)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = NOW(); 