/**
 * Support Engine Services Barrel Export
 * Consolidated exports for all support engine services
 */

// Core support services
export { default as AutoAssignmentService } from './AutoAssignmentService';
export { default as SupportTicketService } from './SupportTicketService';
export { default as SLAManagementService } from './SLAManagementService';
export { default as SupportAnalyticsService } from './SupportAnalyticsService';
export { default as SupportNotificationService } from './SupportNotificationService';

// Types and interfaces
export type {
  AutoAssignmentRule,
  SupportTicket,
  SLAConfig,
  SupportAnalytics
} from './types';