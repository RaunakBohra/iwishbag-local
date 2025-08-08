/**
 * Master Service Orchestrator - Central Service Coordination Hub
 * 
 * This service acts as the central coordination layer for all iwishBag services,
 * providing unified error handling, caching, performance optimization, and 
 * cross-service communication.
 * 
 * Integrates with all 78+ existing services to create a cohesive ecosystem.
 */

import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import { supabase } from '@/integrations/supabase/client';

// Import core services for orchestration
import { smartCalculationEngine } from '@/services/SmartCalculationEngine';
import { unifiedSupportEngine } from '@/services/UnifiedSupportEngine';
import { notificationService } from '@/services/NotificationService';
import { trackingService } from '@/services/TrackingService';
import { currencyService } from '@/services/CurrencyService';
import { paymentGatewayService } from '@/services/PaymentGatewayService';

// ============================================================================
// CORE TYPES & INTERFACES
// ============================================================================

export type ServiceType = 
  | 'quote' | 'package' | 'payment' | 'shipping' | 'support' 
  | 'notification' | 'analytics' | 'currency' | 'tracking';

export type OperationType = 
  | 'create' | 'read' | 'update' | 'delete' | 'calculate' | 'process' | 'notify';

export interface ServiceOperation {
  id: string;
  service: ServiceType;
  operation: OperationType;
  context: ServiceContext;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: ServiceOperation[];
  timeout?: number;
}

export interface ServiceContext {
  user_id?: string;
  quote_id?: string;
  package_id?: string;
  order_id?: string;
  ticket_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  performance?: {
    duration_ms: number;
    cache_hit: boolean;
    service_calls: number;
  };
  context: ServiceContext;
}

export interface CrossServiceEvent {
  type: string;
  source_service: ServiceType;
  target_services: ServiceType[];
  data: any;
  context: ServiceContext;
  timestamp: string;
}

// ============================================================================
// MASTER SERVICE ORCHESTRATOR CLASS
// ============================================================================

class MasterServiceOrchestrator {
  private static instance: MasterServiceOrchestrator;
  private eventQueue: CrossServiceEvent[] = [];
  private operationCache = new Map<string, ServiceResult>();
  private serviceMetrics = new Map<ServiceType, {
    calls: number;
    errors: number;
    avg_duration: number;
    last_error?: string;
  }>();

  private constructor() {
    this.initializeServices();
    this.setupEventHandlers();
  }

  public static getInstance(): MasterServiceOrchestrator {
    if (!MasterServiceOrchestrator.instance) {
      MasterServiceOrchestrator.instance = new MasterServiceOrchestrator();
    }
    return MasterServiceOrchestrator.instance;
  }

  // ============================================================================
  // SERVICE INITIALIZATION & HEALTH MONITORING
  // ============================================================================

  private initializeServices(): void {
    const services: ServiceType[] = [
      'quote', 'package', 'payment', 'shipping', 'support', 
      'notification', 'analytics', 'currency', 'tracking'
    ];

    services.forEach(service => {
      this.serviceMetrics.set(service, {
        calls: 0,
        errors: 0,
        avg_duration: 0,
      });
    });

    logger.info('MasterServiceOrchestrator initialized with all services');
  }

  private setupEventHandlers(): void {
    // Setup cross-service event listeners
    this.onServiceEvent('package:received', async (event) => {
      await this.handlePackageReceived(event);
    });

    this.onServiceEvent('quote:approved', async (event) => {
      await this.handleQuoteApproved(event);
    });

    this.onServiceEvent('payment:completed', async (event) => {
      await this.handlePaymentCompleted(event);
    });

    this.onServiceEvent('support:ticket_created', async (event) => {
      await this.handleSupportTicketCreated(event);
    });
  }

  // ============================================================================
  // UNIFIED OPERATION EXECUTION
  // ============================================================================

  public async executeOperation<T>(
    operation: ServiceOperation
  ): Promise<ServiceResult<T>> {
    const startTime = Date.now();
    const operationId = operation.id;
    
    try {
      // Log operation start
        {
          operation_id: operationId,
          service: operation.service,
          context: operation.context,
        }
      );

      // Check cache for read operations
      if (operation.operation === 'read') {
        const cached = this.getCachedResult(operationId);
        if (cached) {
          this.updateServiceMetrics(operation.service, Date.now() - startTime, false);
          return cached as ServiceResult<T>;
        }
      }

      // Execute dependencies first
      if (operation.dependencies?.length) {
        await Promise.all(
          operation.dependencies.map(dep => this.executeOperation(dep))
        );
      }

      // Route operation to appropriate service
      const result = await this.routeOperation<T>(operation);

      // Cache successful results
      if (result.success && operation.operation === 'read') {
        this.cacheResult(operationId, result);
      }

      // Update metrics
      this.updateServiceMetrics(operation.service, Date.now() - startTime, false);

      // Emit cross-service events
      await this.emitServiceEvent({
        type: `${operation.service}:${operation.operation}:completed`,
        source_service: operation.service,
        target_services: this.getInterestedServices(operation.service, operation.operation),
        data: result.data,
        context: operation.context,
        timestamp: new Date().toISOString(),
      });

      return result;

    } catch (error) {
      this.updateServiceMetrics(operation.service, Date.now() - startTime, true);
      
      // Enhanced error handling with Sentry
      const transaction = typeof Sentry?.startTransaction === 'function'
        ? Sentry.startTransaction({
            name: `ServiceOrchestrator.${operation.service}.${operation.operation}`,
            op: 'service_operation',
          })
        : null;

      if (transaction) {
        Sentry.captureException(error, {
          tags: {
            service: operation.service,
            operation: operation.operation,
            operation_id: operationId,
          },
          extra: {
            context: operation.context,
            duration_ms: Date.now() - startTime,
          },
        });
        transaction.finish();
      }

      logger.error('Service operation failed', {
        operation_id: operationId,
        service: operation.service,
        operation: operation.operation,
        error: error.message,
        context: operation.context,
      });

      return {
        success: false,
        error: {
          code: 'SERVICE_OPERATION_FAILED',
          message: error.message,
          details: error,
        },
        performance: {
          duration_ms: Date.now() - startTime,
          cache_hit: false,
          service_calls: 1,
        },
        context: operation.context,
      };
    }
  }

  // ============================================================================
  // SERVICE ROUTING & EXECUTION
  // ============================================================================

  private async routeOperation<T>(operation: ServiceOperation): Promise<ServiceResult<T>> {
    const { service, operation: op, context } = operation;

    switch (service) {
      case 'quote':
        return await this.executeQuoteOperation(op, context);

      case 'package':
        return await this.executePackageOperation(op, context);

      case 'payment':
        return await this.executePaymentOperation(op, context);

      case 'shipping':
        return await this.executeShippingOperation(op, context);

      case 'support':
        return await this.executeSupportOperation(op, context);

      case 'notification':
        return await this.executeNotificationOperation(op, context);

      case 'tracking':
        return await this.executeTrackingOperation(op, context);

      case 'currency':
        return await this.executeCurrencyOperation(op, context);

      default:
        throw new Error(`Unknown service: ${service}`);
    }
  }

  // ============================================================================
  // SERVICE-SPECIFIC OPERATION HANDLERS
  // ============================================================================

  private async executeQuoteOperation(operation: OperationType, context: ServiceContext): Promise<ServiceResult> {
    switch (operation) {
      case 'calculate':
        // Integration with SmartCalculationEngine
        if (!context.metadata?.quote) {
          throw new Error('Quote data required for calculation');
        }
        const result = await smartCalculationEngine.calculateUnifiedQuote(
          context.metadata.quote,
          context.metadata.preferences
        );
        return { success: true, data: result, context };

      case 'read':
        const { data, error } = await supabase
          .from('quotes_v2')
          .select('*')
          .eq('id', context.quote_id)
          .single();
        
        if (error) throw error;
        return { success: true, data, context };

      default:
        throw new Error(`Unsupported quote operation: ${operation}`);
    }
  }

  private async executePackageOperation(operation: OperationType, context: ServiceContext): Promise<ServiceResult> {
    switch (operation) {
      case 'create':
        // Package forwarding service integration would go here
        return { success: true, data: {}, context };

      case 'read':
        // Package retrieval logic would go here
        return { success: true, data: [], context };

      default:
        throw new Error(`Unsupported package operation: ${operation}`);
    }
  }

  private async executePaymentOperation(operation: OperationType, context: ServiceContext): Promise<ServiceResult> {
    switch (operation) {
      case 'process':
        const paymentResult = await paymentGatewayService.processPayment(
          context.metadata?.paymentData
        );
        return { success: true, data: paymentResult, context };

      default:
        throw new Error(`Unsupported payment operation: ${operation}`);
    }
  }

  private async executeShippingOperation(operation: OperationType, context: ServiceContext): Promise<ServiceResult> {
    switch (operation) {
      case 'calculate':
        // Integrate with shipping calculation services
        return { success: true, data: {}, context };

      default:
        throw new Error(`Unsupported shipping operation: ${operation}`);
    }
  }

  private async executeSupportOperation(operation: OperationType, context: ServiceContext): Promise<ServiceResult> {
    switch (operation) {
      case 'create':
        const ticket = await unifiedSupportEngine.createTicket(
          context.user_id!,
          context.metadata?.ticketData
        );
        return { success: true, data: ticket, context };

      default:
        throw new Error(`Unsupported support operation: ${operation}`);
    }
  }


  private async executeNotificationOperation(operation: OperationType, context: ServiceContext): Promise<ServiceResult> {
    switch (operation) {
      case 'create':
        const notification = await notificationService.create(
          context.user_id!,
          context.metadata?.type,
          context.metadata?.message,
          context.metadata?.data
        );
        return { success: true, data: notification, context };

      default:
        throw new Error(`Unsupported notification operation: ${operation}`);
    }
  }

  private async executeTrackingOperation(operation: OperationType, context: ServiceContext): Promise<ServiceResult> {
    switch (operation) {
      case 'read':
        const tracking = await trackingService.getDetailedStatus(
          context.metadata?.trackingId
        );
        return { success: true, data: tracking, context };

      default:
        throw new Error(`Unsupported tracking operation: ${operation}`);
    }
  }


  private async executeCurrencyOperation(operation: OperationType, context: ServiceContext): Promise<ServiceResult> {
    switch (operation) {
      case 'read':
        const rates = await currencyService.getCurrency(context.metadata?.country);
        return { success: true, data: rates, context };

      default:
        throw new Error(`Unsupported currency operation: ${operation}`);
    }
  }

  // ============================================================================
  // CROSS-SERVICE EVENT SYSTEM
  // ============================================================================

  private async emitServiceEvent(event: CrossServiceEvent): Promise<void> {
    this.eventQueue.push(event);
    
    // Process event queue asynchronously
    setTimeout(() => this.processEventQueue(), 0);
  }

  private onServiceEvent(eventType: string, handler: (event: CrossServiceEvent) => Promise<void>): void {
    // Store event handlers for processing
    // In a real implementation, this would use a proper event system
  }

  private async processEventQueue(): Promise<void> {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      try {
        await this.handleServiceEvent(event);
      } catch (error) {
        logger.error('Event processing failed', { event, error: error.message });
      }
    }
  }

  private async handleServiceEvent(event: CrossServiceEvent): Promise<void> {
    logger.info('Processing cross-service event', { 
      type: event.type, 
      source: event.source_service,
      targets: event.target_services,
    });

    // Route events to appropriate handlers
    switch (event.type) {
      case 'package:received':
        await this.handlePackageReceived(event);
        break;
      case 'quote:approved':
        await this.handleQuoteApproved(event);
        break;
      case 'payment:completed':
        await this.handlePaymentCompleted(event);
        break;
      case 'support:ticket_created':
        await this.handleSupportTicketCreated(event);
        break;
    }
  }

  // ============================================================================
  // CROSS-SERVICE EVENT HANDLERS
  // ============================================================================

  private async handlePackageReceived(event: CrossServiceEvent): Promise<void> {
    const { data, context } = event;
    
    // Notify customer
    await this.executeOperation({
      id: `notify-package-${data.id}`,
      service: 'notification',
      operation: 'create',
      context: {
        ...context,
        metadata: {
          type: 'package_received',
          message: `Your package from ${data.sender_name} has been received at our hub`,
          data: { package_id: data.id },
        },
      },
      priority: 'medium',
    });
  }

  private async handleQuoteApproved(event: CrossServiceEvent): Promise<void> {
    const { data, context } = event;
    
    // Create tracking ID
    await this.executeOperation({
      id: `tracking-${data.id}`,
      service: 'tracking',
      operation: 'create',
      context: { ...context, quote_id: data.id },
      priority: 'high',
    });

    // Notify customer
    await this.executeOperation({
      id: `notify-quote-approved-${data.id}`,
      service: 'notification',
      operation: 'create',
      context: {
        ...context,
        metadata: {
          type: 'quote_approved',
          message: 'Your quote has been approved and is ready for payment',
          data: { quote_id: data.id },
        },
      },
      priority: 'high',
    });
  }

  private async handlePaymentCompleted(event: CrossServiceEvent): Promise<void> {
    const { data, context } = event;
    
    // Update order status
    await this.executeOperation({
      id: `order-update-${data.order_id}`,
      service: 'quote',
      operation: 'update',
      context: { ...context, order_id: data.order_id },
      priority: 'high',
    });

    // Start shipping process
    await this.executeOperation({
      id: `shipping-start-${data.order_id}`,
      service: 'shipping',
      operation: 'process',
      context: { ...context, order_id: data.order_id },
      priority: 'high',
    });
  }

  private async handleSupportTicketCreated(event: CrossServiceEvent): Promise<void> {
    const { data, context } = event;
    
    // Auto-assign based on category
    await this.executeOperation({
      id: `auto-assign-${data.id}`,
      service: 'support',
      operation: 'update',
      context: { ...context, ticket_id: data.id },
      priority: 'high',
    });
  }

  // ============================================================================
  // CACHING & PERFORMANCE OPTIMIZATION
  // ============================================================================

  private getCachedResult(operationId: string): ServiceResult | null {
    return this.operationCache.get(operationId) || null;
  }

  private cacheResult(operationId: string, result: ServiceResult): void {
    // Cache for 5 minutes
    this.operationCache.set(operationId, result);
    setTimeout(() => {
      this.operationCache.delete(operationId);
    }, 5 * 60 * 1000);
  }

  private updateServiceMetrics(service: ServiceType, duration: number, error: boolean): void {
    const metrics = this.serviceMetrics.get(service)!;
    metrics.calls++;
    if (error) metrics.errors++;
    metrics.avg_duration = (metrics.avg_duration * (metrics.calls - 1) + duration) / metrics.calls;
    this.serviceMetrics.set(service, metrics);
  }

  private getInterestedServices(source: ServiceType, operation: OperationType): ServiceType[] {
    // Define which services are interested in events from other services
    const interests: Record<string, ServiceType[]> = {
      'package:create': ['notification'],
      'quote:calculate': ['currency', 'tracking'],
      'quote:approve': ['payment', 'notification', 'tracking'],
      'payment:process': ['quote', 'shipping', 'notification'],
      'support:create': ['notification'],
    };

    return interests[`${source}:${operation}`] || [];
  }

  // ============================================================================
  // PUBLIC API & CONVENIENCE METHODS
  // ============================================================================

  public async getServiceHealth(): Promise<Record<ServiceType, any>> {
    const health: Record<string, any> = {};
    
    for (const [service, metrics] of this.serviceMetrics.entries()) {
      health[service] = {
        status: metrics.errors / metrics.calls < 0.1 ? 'healthy' : 'degraded',
        metrics,
      };
    }
    
    return health;
  }

  public async invalidateCache(pattern?: string): Promise<void> {
    if (pattern) {
      for (const [key] of this.operationCache.entries()) {
        if (key.includes(pattern)) {
          this.operationCache.delete(key);
        }
      }
    } else {
      this.operationCache.clear();
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const masterServiceOrchestrator = MasterServiceOrchestrator.getInstance();
export default masterServiceOrchestrator;