// Enhanced Order Management Component Library
// Reusable components for multi-warehouse order system

export { default as OrderStatusBadge } from './OrderStatusBadge';
export { default as OrderProgressTimeline } from './OrderProgressTimeline';
export { default as MultiWarehouseOrderSummary } from './MultiWarehouseOrderSummary';
export { default as SmartRevisionAlert } from './SmartRevisionAlert';
export { default as AutomationStatusIndicator } from './AutomationStatusIndicator';
export { default as CustomerOrderList } from './CustomerOrderList';

// Type exports for consumers
export type { OrderStatus, OverallStatus } from './OrderStatusBadge';

// Re-export common types for convenience
import { Database } from '@/types/database';
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderShipment = Database['public']['Tables']['order_shipments']['Row'];
export type ItemRevision = Database['public']['Tables']['item_revisions']['Row'];
export type AutomationTask = Database['public']['Tables']['seller_order_automation']['Row'];